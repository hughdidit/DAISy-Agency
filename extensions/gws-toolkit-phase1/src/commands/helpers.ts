import { resolveAuth } from "../auth.js";
import { discoverBinary } from "../binary.js";
import { toStructuredError } from "../errors.js";
import { executeCommand } from "../executor.js";
import { normalizeExecution } from "../normalize.js";
import { evaluatePolicy } from "../policy.js";
import type { AuditLogger } from "../audit.js";
import type {
  AuthResolution,
  DiscoveryResult,
  GwsToolkitConfig,
  InvocationContext,
  ServiceFamily,
  StructuredEnvelope,
  StructuredSuccess,
  ToolName,
} from "../types.js";

export type RuntimeDeps = {
  config: GwsToolkitConfig;
  audit: AuditLogger;
};

export async function runReadOnlyCommand(params: {
  deps: RuntimeDeps;
  ctx: InvocationContext;
  tool: ToolName;
  service: ServiceFamily;
  action: string;
  payload: unknown;
  buildArgv: (auth: AuthResolution) => string[];
}): Promise<StructuredEnvelope> {
  const startedAt = Date.now();

  try {
    const binary: DiscoveryResult = await discoverBinary({
      configuredPath: params.deps.config.binaryPath,
      runVersion: async (binaryPath) =>
        executeCommand({
          config: params.deps.config,
          binaryPath,
          argv: ["--version"],
        }),
    });

    const auth = resolveAuth(params.deps.config);
    const policy = evaluatePolicy({
      tool: params.tool,
      service: params.service,
      action: params.action,
      payload: params.payload,
      config: params.deps.config,
      auth,
    });

    if (!policy.allowed) {
      const latencyMs = Date.now() - startedAt;
      params.deps.audit.emit({
        ctx: params.ctx,
        toolName: params.tool,
        action: params.action,
        targetService: params.service,
        decision: "deny",
        denyReason: policy.reason,
        credentialMode: auth.mode,
        latencyMs,
        resultCode: "DENY_POLICY",
      });
      return {
        ok: false,
        error: {
          code: "DENY_POLICY",
          message: policy.reason ?? "Policy denied request",
        },
        meta: {
          tool: params.tool,
          action: params.action,
          service: params.service,
          latencyMs,
        },
      };
    }

    const argv = params.buildArgv(auth);
    const execution = await executeCommand({
      config: params.deps.config,
      binaryPath: binary.binaryPath,
      argv,
      env: auth.env,
    });
    const normalized = normalizeExecution(execution);

    const latencyMs = Date.now() - startedAt;
    params.deps.audit.emit({
      ctx: params.ctx,
      toolName: params.tool,
      action: params.action,
      targetService: params.service,
      decision: "allow",
      credentialMode: auth.mode,
      latencyMs,
      exitCode: normalized.exitCode,
      resultCode: "OK",
    });

    const response: StructuredSuccess<Record<string, unknown>> = {
      ok: true,
      data: {
        service: params.service,
        action: params.action,
        payload: normalized.payload as Record<string, unknown>,
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
