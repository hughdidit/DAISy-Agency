import { getAuthSourceStatus } from "../auth.js";
import { discoverBinary } from "../binary.js";
import type { AuditLogger } from "../audit.js";
import { toStructuredError } from "../errors.js";
import { executeCommand } from "../executor.js";
import { evaluatePolicy } from "../policy.js";
import type {
  ConfigPosture,
  GwsToolkitConfig,
  InvocationContext,
  StructuredEnvelope,
  StructuredSuccess,
} from "../types.js";

type ConfigResolution =
  | { ok: true; config: GwsToolkitConfig; posture: ConfigPosture }
  | { ok: false; posture: ConfigPosture; message: string; fallbackConfig: GwsToolkitConfig };

export async function executeStatus(params: {
  ctx: InvocationContext;
  audit: AuditLogger;
  configResolution: ConfigResolution;
}): Promise<StructuredEnvelope> {
  const startedAt = Date.now();

  if (!params.configResolution.ok) {
    const latencyMs = Date.now() - startedAt;
    const denial: StructuredEnvelope = {
      ok: false,
      error: {
        code: "CONFIG_ERROR",
        message: params.configResolution.message,
        details: {
          posture: params.configResolution.posture,
        },
      },
      meta: {
        tool: "gws_status",
        action: "status",
        service: "status",
        latencyMs,
      },
    };

    params.audit.emit({
      ctx: params.ctx,
      toolName: "gws_status",
      action: "status",
      targetService: "status",
      decision: "deny",
      denyReason: denial.error.message,
      latencyMs,
      resultCode: "CONFIG_ERROR",
    });

    return denial;
  }

  const activeConfig = params.configResolution.config;

  try {
    const policy = evaluatePolicy({
      tool: "gws_status",
      service: "status",
      action: "status",
      payload: {},
      config: activeConfig,
    });

    if (!policy.allowed) {
      const latencyMs = Date.now() - startedAt;
      params.audit.emit({
        ctx: params.ctx,
        toolName: "gws_status",
        action: "status",
        targetService: "status",
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
        }),
    });

    const authStatus = getAuthSourceStatus(activeConfig);
    const latencyMs = Date.now() - startedAt;

    const result: StructuredSuccess<Record<string, unknown>> = {
      ok: true,
      data: {
        binary: {
          found: true,
          binaryPath: discovery.binaryPath,
          version: discovery.versionText,
        },
        auth: authStatus,
        config: {
          posture: params.configResolution.posture,
          enabledServices: activeConfig.enabledServices,
          safeMode: activeConfig.safeMode,
          allowedCredentialModes: activeConfig.allowedCredentialModes,
        },
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
      decision: "deny",
      denyReason: mapped.error.message,
      latencyMs,
      resultCode: mapped.error.code,
    });
    return mapped;
  }
}