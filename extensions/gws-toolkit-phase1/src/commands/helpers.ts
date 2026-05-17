import type { AuditLogger } from "../audit.js";
import { resolveAuth } from "../auth.js";
import { discoverBinary } from "../binary.js";
import type { GwsCommandSpec } from "../command-builder.js";
import { executeDirectGoogleApi, type DirectGoogleResult } from "../direct-google.js";
import { toStructuredError } from "../errors.js";
import { executeCommand } from "../executor.js";
import { normalizeExecution } from "../normalize.js";
import { evaluatePolicy } from "../policy.js";
import type { ValidationIssue } from "../schema.js";
import type {
  AuthResolution,
  DiscoveryResult,
  GwsToolkitConfig,
  InvocationContext,
  PolicyDecision,
  ServiceFamily,
  StructuredEnvelope,
  StructuredSuccess,
  ToolName,
} from "../types.js";

export type RuntimeDeps = {
  config: GwsToolkitConfig;
  audit: AuditLogger;
  resolveRuntimeEnv?: () => Promise<Record<string, string> | undefined>;
  directGoogleExecutor?: typeof executeDirectGoogleApi;
};

export function buildValidationDeniedEnvelope(params: {
  deps: RuntimeDeps;
  ctx: InvocationContext;
  tool: ToolName;
  service: ServiceFamily;
  readOnly: boolean;
  action: string;
  message: string;
  issues: ValidationIssue[];
}): StructuredEnvelope {
  const latencyMs = 0;
  params.deps.audit.emit({
    ctx: params.ctx,
    toolName: params.tool,
    action: params.action,
    targetService: params.service,
    readOnly: params.readOnly,
    decision: "deny",
    denyReason: params.message,
    latencyMs,
    resultCode: "VALIDATION_ERROR",
  });

  return {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: params.message,
      details: {
        issues: params.issues,
      },
    },
    meta: {
      tool: params.tool,
      action: params.action,
      service: params.service,
      latencyMs,
    },
  };
}

export async function runToolkitCommand(params: {
  deps: RuntimeDeps;
  ctx: InvocationContext;
  tool: ToolName;
  service: ServiceFamily;
  action: string;
  payload: Record<string, unknown>;
  readOnly: boolean;
  confirm?: boolean;
  buildCommand: (auth: AuthResolution) => GwsCommandSpec;
  postPolicy?: (params: {
    auth: AuthResolution;
    payload: Record<string, unknown>;
  }) => PolicyDecision | undefined;
}): Promise<StructuredEnvelope> {
  const startedAt = Date.now();

  try {
    const auth = resolveAuth(params.deps.config, params.ctx);
    const policy = evaluatePolicy({
      tool: params.tool,
      service: params.service,
      action: params.action,
      payload: params.payload,
      config: params.deps.config,
      auth,
      isWrite: !params.readOnly,
      confirm: params.confirm,
    });

    if (!policy.allowed) {
      const latencyMs = Date.now() - startedAt;
      params.deps.audit.emit({
        ctx: {
          ...params.ctx,
          bindingSubject: auth.bindingSubject,
          routeName: auth.route.name,
        },
        toolName: params.tool,
        action: params.action,
        targetService: params.service,
        readOnly: params.readOnly,
        decision: "deny",
        denyReason: policy.reason,
        credentialMode: auth.mode,
        routeName: auth.route.name,
        bindingSubject: auth.bindingSubject,
        latencyMs,
        resultCode: "DENY_POLICY",
      });
      return {
        ok: false,
        error: {
          code: "DENY_POLICY",
          message: policy.reason ?? "Policy denied request",
          details: {
            routeName: auth.route.name,
            bindingSubject: auth.bindingSubject,
          },
        },
        meta: {
          tool: params.tool,
          action: params.action,
          service: params.service,
          latencyMs,
        },
      };
    }

    if (auth.transport === "google_api") {
      const directExecutor = params.deps.directGoogleExecutor ?? executeDirectGoogleApi;
      const direct: DirectGoogleResult = await directExecutor({
        config: params.deps.config,
        auth,
        ctx: params.ctx,
        service: params.service,
        action: params.action,
        payload: params.payload,
        write: !params.readOnly,
      });
      const latencyMs = Date.now() - startedAt;
      const postPolicy = params.postPolicy?.({
        auth,
        payload: direct.payload,
      });
      if (postPolicy && !postPolicy.allowed) {
        params.deps.audit.emit({
          ctx: {
            ...params.ctx,
            bindingSubject: auth.bindingSubject,
            routeName: auth.route.name,
          },
          toolName: params.tool,
          action: params.action,
          targetService: params.service,
          readOnly: params.readOnly,
          decision: "deny",
          denyReason: postPolicy.reason,
          credentialMode: auth.mode,
          routeName: auth.route.name,
          bindingSubject: auth.bindingSubject,
          latencyMs,
          resultCode: "DENY_POLICY",
        });
        return {
          ok: false,
          error: {
            code: "DENY_POLICY",
            message: postPolicy.reason ?? "Policy denied response",
            details: {
              routeName: auth.route.name,
              bindingSubject: auth.bindingSubject,
            },
          },
          meta: {
            tool: params.tool,
            action: params.action,
            service: params.service,
            latencyMs,
          },
        };
      }
      params.deps.audit.emit({
        ctx: {
          ...params.ctx,
          bindingSubject: auth.bindingSubject,
          routeName: auth.route.name,
        },
        toolName: params.tool,
        action: params.action,
        targetService: params.service,
        readOnly: params.readOnly,
        decision: "allow",
        credentialMode: auth.mode,
        routeName: auth.route.name,
        bindingSubject: auth.bindingSubject,
        latencyMs,
        exitCode: 0,
        resultCode: "OK",
      });
      return {
        ok: true,
        data: {
          service: params.service,
          action: params.action,
          route: {
            name: auth.route.name,
            bindingSubject: auth.bindingSubject,
            mode: auth.mode,
            transport: auth.transport,
            delegatedSubject: auth.impersonatedUser,
          },
          payload: direct.payload,
          output: direct.output,
        },
        meta: {
          tool: params.tool,
          action: params.action,
          service: params.service,
          resultCode: "OK",
          latencyMs,
        },
      };
    }

    const runtimeEnv = params.deps.resolveRuntimeEnv
      ? await params.deps.resolveRuntimeEnv()
      : undefined;

    const binary: DiscoveryResult = await discoverBinary({
      configuredPath: params.deps.config.binaryPath,
      runVersion: async (binaryPath) =>
        executeCommand({
          config: params.deps.config,
          binaryPath,
          argv: ["--version"],
          env: runtimeEnv,
        }),
    });

    const command = params.buildCommand(auth);
    const execution = await executeCommand({
      config: params.deps.config,
      binaryPath: binary.binaryPath,
      argv: command.argv,
      cwd: command.cwd,
      env: {
        ...(runtimeEnv ?? {}),
        ...auth.env,
      },
    });
    const normalized = normalizeExecution(execution);
    const latencyMs = Date.now() - startedAt;
    const normalizedPayload = normalized.payload as Record<string, unknown>;
    const postPolicy = params.postPolicy?.({
      auth,
      payload: normalizedPayload,
    });
    if (postPolicy && !postPolicy.allowed) {
      params.deps.audit.emit({
        ctx: {
          ...params.ctx,
          bindingSubject: auth.bindingSubject,
          routeName: auth.route.name,
        },
        toolName: params.tool,
        action: params.action,
        targetService: params.service,
        readOnly: params.readOnly,
        decision: "deny",
        denyReason: postPolicy.reason,
        credentialMode: auth.mode,
        routeName: auth.route.name,
        bindingSubject: auth.bindingSubject,
        latencyMs,
        exitCode: normalized.exitCode,
        resultCode: "DENY_POLICY",
      });
      return {
        ok: false,
        error: {
          code: "DENY_POLICY",
          message: postPolicy.reason ?? "Policy denied response",
          details: {
            routeName: auth.route.name,
            bindingSubject: auth.bindingSubject,
          },
        },
        meta: {
          tool: params.tool,
          action: params.action,
          service: params.service,
          latencyMs,
        },
      };
    }

    params.deps.audit.emit({
      ctx: {
        ...params.ctx,
        bindingSubject: auth.bindingSubject,
        routeName: auth.route.name,
      },
      toolName: params.tool,
      action: params.action,
      targetService: params.service,
      readOnly: params.readOnly,
      decision: "allow",
      credentialMode: auth.mode,
      routeName: auth.route.name,
      bindingSubject: auth.bindingSubject,
      latencyMs,
      exitCode: normalized.exitCode,
      resultCode: "OK",
    });

    const response: StructuredSuccess<Record<string, unknown>> = {
      ok: true,
      data: {
        service: params.service,
        action: params.action,
        route: {
          name: auth.route.name,
          bindingSubject: auth.bindingSubject,
          mode: auth.mode,
          transport: auth.transport,
        },
        payload: normalizedPayload,
        output: {
          stdoutTruncated: normalized.stdoutTruncated,
          stderrTruncated: normalized.stderrTruncated,
        },
      },
      meta: {
        tool: params.tool,
        action: params.action,
        service: params.service,
        resultCode: "OK",
        latencyMs,
      },
    };

    return response;
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const mapped = toStructuredError({
      error,
      tool: params.tool,
      action: params.action,
      service: params.service,
      latencyMs,
    });
    params.deps.audit.emit({
      ctx: params.ctx,
      toolName: params.tool,
      action: params.action,
      targetService: params.service,
      readOnly: params.readOnly,
      decision: "deny",
      denyReason: mapped.error.message,
      latencyMs,
      resultCode: mapped.error.code,
    });
    return mapped;
  }
}

export function createRuntimeDeps(config: GwsToolkitConfig, audit: AuditLogger): RuntimeDeps {
  return { config, audit };
}
