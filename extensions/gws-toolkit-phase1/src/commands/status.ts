import { getAuthSourceStatus } from "../auth.js";
import { discoverBinary } from "../binary.js";
import { summarizeCredentialRoutes } from "../credential-routing.js";
import { toStructuredError } from "../errors.js";
import { executeCommand } from "../executor.js";
import { evaluatePolicy } from "../policy.js";
import { validateStatusParams } from "../schema.js";
import {
  READ_TOOLS_BY_SERVICE,
  READONLY_SCOPES,
  WRITE_SCOPES,
  WRITE_TOOLS_BY_SERVICE,
  type ConfigPosture,
  type GwsToolkitConfig,
  type InvocationContext,
  type ServiceFamily,
  type StructuredEnvelope,
  type StructuredSuccess,
  type ToolName,
} from "../types.js";
import type { AuditLogger } from "../audit.js";

type ConfigResolution =
  | { ok: true; config: GwsToolkitConfig; posture: ConfigPosture }
  | { ok: false; posture: ConfigPosture; message: string; fallbackConfig: GwsToolkitConfig };

function buildScopesSummary(config: GwsToolkitConfig) {
  if (config.defaultScopesProfile === "custom") {
    return {
      profile: "custom",
      scopes: config.customScopes ?? [],
    };
  }
  const scopes = new Set<string>();
  for (const service of config.enabledServices) {
    if (config.defaultScopesProfile === "service-set" && config.enabledWriteServices.includes(service)) {
      scopes.add(WRITE_SCOPES[service]);
    } else {
      scopes.add(READONLY_SCOPES[service]);
    }
  }
  return {
    profile: config.defaultScopesProfile,
    scopes: [...scopes],
  };
}

function buildWriteReadiness(config: GwsToolkitConfig) {
  return config.enabledServices.map((service) => ({
    service,
    readTool: READ_TOOLS_BY_SERVICE[service],
    writeTool: WRITE_TOOLS_BY_SERVICE[service],
    writesGloballyEnabled: config.allowWriteOperations,
    writesEnabledForService: config.enabledWriteServices.includes(service),
  }));
}

export function buildConfigResolutionDeniedEnvelope(params: {
  tool: ToolName;
  service: "status" | ServiceFamily;
  action: string;
  configResolution: ConfigResolution;
  ctx: InvocationContext;
  audit: AuditLogger;
}): StructuredEnvelope {
  const latencyMs = 0;
  const message = params.configResolution.ok
    ? "unexpected config resolution state"
    : params.configResolution.message;
  const posture = params.configResolution.posture;

  params.audit.emit({
    ctx: params.ctx,
    toolName: params.tool,
    action: params.action,
    targetService: params.service,
    readOnly: !params.tool.endsWith("_write"),
    decision: "deny",
    denyReason: message,
    latencyMs,
    resultCode: "CONFIG_ERROR",
  });

  return {
    ok: false,
    error: {
      code: "CONFIG_ERROR",
      message,
      details: {
        posture,
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

export async function executeStatus(params: {
  ctx: InvocationContext;
  audit: AuditLogger;
  configResolution: ConfigResolution;
  rawParams?: unknown;
  resolveRuntimeEnv?: () => Promise<Record<string, string> | undefined>;
}): Promise<StructuredEnvelope> {
  const startedAt = Date.now();
  const validated = validateStatusParams(params.rawParams ?? {});

  if (!validated.ok) {
    const latencyMs = Date.now() - startedAt;
    params.audit.emit({
      ctx: params.ctx,
      toolName: "gws_status",
      action: "status",
      targetService: "status",
      readOnly: true,
      decision: "deny",
      denyReason: "Invalid gws_status params",
      latencyMs,
      resultCode: "VALIDATION_ERROR",
    });
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid gws_status params",
        details: {
          issues: validated.errors,
        },
      },
      meta: {
        tool: "gws_status",
        action: "status",
        service: "status",
        latencyMs,
      },
    };
  }

  if (!params.configResolution.ok) {
    return buildConfigResolutionDeniedEnvelope({
      tool: "gws_status",
      service: "status",
      action: "status",
      configResolution: params.configResolution,
      ctx: params.ctx,
      audit: params.audit,
    });
  }

  const activeConfig = params.configResolution.config;

  try {
    const runtimeEnv = params.resolveRuntimeEnv ? await params.resolveRuntimeEnv() : undefined;
    const policy = evaluatePolicy({
      tool: "gws_status",
      service: "status",
      action: "status",
      payload: validated.value,
      config: activeConfig,
    });

    if (!policy.allowed) {
      const latencyMs = Date.now() - startedAt;
      params.audit.emit({
        ctx: params.ctx,
        toolName: "gws_status",
        action: "status",
        targetService: "status",
        readOnly: true,
        decision: "deny",
        denyReason: policy.reason,
        latencyMs,
        resultCode: "DENY_POLICY",
      });
      return {
        ok: false,
        error: {
          code: "DENY_POLICY",
          message: policy.reason ?? "status denied by policy",
        },
        meta: {
          tool: "gws_status",
          action: "status",
          service: "status",
          latencyMs,
        },
      };
    }

    const discovery = await discoverBinary({
      configuredPath: activeConfig.binaryPath,
      runVersion: async (binaryPath) =>
        executeCommand({
          config: activeConfig,
          binaryPath,
          argv: ["--version"],
          env: runtimeEnv,
        }),
    });

    const authStatus = getAuthSourceStatus(activeConfig);
    const latencyMs = Date.now() - startedAt;
    const includeVersion = validated.value.includeVersion !== false;
    const includeAuthStatus = validated.value.includeAuthStatus !== false;

    const result: StructuredSuccess<Record<string, unknown>> = {
      ok: true,
      data: {
        binary: {
          found: true,
          binaryPath: discovery.binaryPath,
          ...(includeVersion ? { version: discovery.versionText } : {}),
        },
        ...(includeAuthStatus ? { auth: authStatus } : {}),
        config: {
          posture: params.configResolution.posture,
          enabledServices: activeConfig.enabledServices,
          enabledWriteServices: activeConfig.enabledWriteServices,
          safeMode: activeConfig.safeMode,
          allowWriteOperations: activeConfig.allowWriteOperations,
          allowUnboundAgents: activeConfig.allowUnboundAgents,
          allowedCredentialModes: activeConfig.allowedCredentialModes,
          defaultCredentialRoute: activeConfig.defaultCredentialRoute,
          warnings: activeConfig.warnings,
        },
        routes: summarizeCredentialRoutes(activeConfig),
        scopes: buildScopesSummary(activeConfig),
        writeReadiness: buildWriteReadiness(activeConfig),
      },
      meta: {
        tool: "gws_status",
        action: "status",
        service: "status",
        resultCode: "OK",
        latencyMs,
      },
    };

    params.audit.emit({
      ctx: params.ctx,
      toolName: "gws_status",
      action: "status",
      targetService: "status",
      readOnly: true,
      decision: "allow",
      latencyMs,
      resultCode: "OK",
    });

    return result;
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const mapped = toStructuredError({
      error,
      tool: "gws_status",
      action: "status",
      service: "status",
      latencyMs,
    });
    params.audit.emit({
      ctx: params.ctx,
      toolName: "gws_status",
      action: "status",
      targetService: "status",
      readOnly: true,
      decision: "deny",
      denyReason: mapped.error.message,
      latencyMs,
      resultCode: mapped.error.code,
    });
    return mapped;
  }
}
