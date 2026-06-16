import type { AuditLogger } from "../audit.js";
import {
  classifyCredentialSourceType,
  getActiveRouteAuthStatus,
  getAuthSourceStatus,
  getRouteImpersonationStatus,
  isServiceAccountPolicyEnforced,
  resolveAuth,
} from "../auth.js";
import { discoverBinary } from "../binary.js";
import { summarizeCredentialRoutes } from "../credential-routing.js";
import { executeDirectAuthHealth } from "../direct-google.js";
import { PluginError, toStructuredError } from "../errors.js";
import { executeCommand } from "../executor.js";
import { normalizeExecution } from "../normalize.js";
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
    if (
      config.defaultScopesProfile === "service-set" &&
      config.enabledWriteServices.includes(service)
    ) {
      for (const scope of WRITE_SCOPES[service]) {
        scopes.add(scope);
      }
    } else {
      for (const scope of READONLY_SCOPES[service]) {
        scopes.add(scope);
      }
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

function parseAuthHealthResult(params: {
  mode: "token" | "credentials_file";
  credentialsFile?: string;
  payload: unknown;
}): {
  tokenValid: boolean;
  tokenError: string | null;
  credentialSourceType: string;
  plainCredentialsExists: boolean | null;
} {
  const payload = (params.payload ?? {}) as Record<string, unknown>;
  const tokenError =
    typeof payload.token_error === "string" && payload.token_error.trim()
      ? payload.token_error.trim()
      : null;
  const plainCredentialsExists =
    typeof payload.plain_credentials_exists === "boolean" ? payload.plain_credentials_exists : null;

  const credentialSourceType =
    params.mode === "token"
      ? "pre_obtained_token"
      : params.credentialsFile
        ? classifyCredentialSourceType(params.credentialsFile)
        : "credentials_file_unknown";
  const tokenValidFieldPresent = Object.hasOwn(payload, "token_valid");
  const tokenValid =
    payload.token_valid === true ||
    (!tokenValidFieldPresent &&
      credentialSourceType === "service_account_json" &&
      plainCredentialsExists === true &&
      tokenError === null);

  return {
    tokenValid,
    tokenError,
    credentialSourceType,
    plainCredentialsExists,
  };
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
  action?: string;
  skipBinaryDiscovery?: boolean;
  resolveRuntimeEnv?: () => Promise<Record<string, string> | undefined>;
}): Promise<StructuredEnvelope> {
  const startedAt = Date.now();
  const action = params.action ?? "status";
  const validated = validateStatusParams(params.rawParams ?? {});

  if (!validated.ok) {
    const latencyMs = Date.now() - startedAt;
    params.audit.emit({
      ctx: params.ctx,
      toolName: "gws_status",
      action,
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
        action,
        service: "status",
        latencyMs,
      },
    };
  }

  if (!params.configResolution.ok) {
    return buildConfigResolutionDeniedEnvelope({
      tool: "gws_status",
      service: "status",
      action,
      configResolution: params.configResolution,
      ctx: params.ctx,
      audit: params.audit,
    });
  }

  const activeConfig = params.configResolution.config;
  const statusParams = validated.value as {
    includeVersion?: boolean;
    includeAuthStatus?: boolean;
  };

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
        action,
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
          action,
          service: "status",
          latencyMs,
        },
      };
    }

    const authStatus = getAuthSourceStatus(activeConfig);
    const activeRoute = getActiveRouteAuthStatus(activeConfig, params.ctx);
    const usesDirectTransport = activeRoute.details.transport === "google_api";
    const discovery =
      params.skipBinaryDiscovery || usesDirectTransport
        ? null
        : await discoverBinary({
            configuredPath: activeConfig.binaryPath,
            runVersion: async (binaryPath) =>
              executeCommand({
                config: activeConfig,
                binaryPath,
                argv: ["--version"],
                env: runtimeEnv,
              }),
          });

    const latencyMs = Date.now() - startedAt;
    const includeVersion = statusParams.includeVersion !== false;
    const includeAuthStatus = statusParams.includeAuthStatus !== false;

    const result: StructuredSuccess<Record<string, unknown>> = {
      ok: true,
      data: {
        binary: {
          ...(discovery
            ? {
                found: true,
                binaryPath: discovery.binaryPath,
                ...(includeVersion ? { version: discovery.versionText } : {}),
              }
            : { found: false, skipped: true }),
          ...(usesDirectTransport ? { reason: "google_api_transport" } : {}),
        },
        ...(includeAuthStatus ? { auth: authStatus } : {}),
        ...(includeAuthStatus ? { currentRoute: activeRoute } : {}),
        config: {
          posture: params.configResolution.posture,
          enabledServices: activeConfig.enabledServices,
          enabledWriteServices: activeConfig.enabledWriteServices,
          safeMode: activeConfig.safeMode,
          allowWriteOperations: activeConfig.allowWriteOperations,
          allowUnboundAgents: activeConfig.allowUnboundAgents,
          allowedCredentialModes: activeConfig.allowedCredentialModes,
          workspaceIdentityDomains: activeConfig.workspaceIdentityDomains,
          defaultCredentialRoute: activeConfig.defaultCredentialRoute,
          warnings: activeConfig.warnings,
        },
        routes: summarizeCredentialRoutes(activeConfig),
        scopes: buildScopesSummary(activeConfig),
        writeReadiness: buildWriteReadiness(activeConfig),
      },
      meta: {
        tool: "gws_status",
        action,
        service: "status",
        resultCode: "OK",
        latencyMs,
      },
    };

    params.audit.emit({
      ctx: params.ctx,
      toolName: "gws_status",
      action,
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
      action,
      service: "status",
      latencyMs,
    });
    params.audit.emit({
      ctx: params.ctx,
      toolName: "gws_status",
      action,
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

export async function executeAuthPosture(params: {
  ctx: InvocationContext;
  audit: AuditLogger;
  configResolution: ConfigResolution;
  resolveRuntimeEnv?: () => Promise<Record<string, string> | undefined>;
}): Promise<StructuredEnvelope> {
  const status = await executeStatus({
    ...params,
    action: "auth-posture",
    skipBinaryDiscovery: true,
    rawParams: {
      includeVersion: false,
      includeAuthStatus: true,
    },
  });
  if (!status.ok) {
    return status;
  }
  const data = status.data as Record<string, unknown>;
  const latencyMs = status.meta.latencyMs;
  return {
    ok: true,
    data: {
      auth: data.auth,
      currentRoute: data.currentRoute,
      routes: data.routes,
      config: data.config,
    },
    meta: {
      tool: "gws_status",
      action: "auth-posture",
      service: "status",
      resultCode: "OK",
      latencyMs,
    },
  };
}

export async function executeAuthHealth(params: {
  ctx: InvocationContext;
  audit: AuditLogger;
  configResolution: ConfigResolution;
  resolveRuntimeEnv?: () => Promise<Record<string, string> | undefined>;
  deprecatedAliasUsed?: boolean;
  directAuthHealthExecutor?: typeof executeDirectAuthHealth;
}): Promise<StructuredEnvelope> {
  const startedAt = Date.now();
  if (!params.configResolution.ok) {
    return buildConfigResolutionDeniedEnvelope({
      tool: "gws_status",
      service: "status",
      action: "auth-health",
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
      payload: {},
      config: activeConfig,
    });
    if (!policy.allowed) {
      const latencyMs = Date.now() - startedAt;
      params.audit.emit({
        ctx: params.ctx,
        toolName: "gws_status",
        action: "auth-health",
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
          message: policy.reason ?? "auth health denied by policy",
        },
        meta: {
          tool: "gws_status",
          action: "auth-health",
          service: "status",
          latencyMs,
        },
      };
    }

    const auth = resolveAuth(activeConfig, params.ctx);
    if (auth.transport === "google_api") {
      const directAuthHealthExecutor = params.directAuthHealthExecutor ?? executeDirectAuthHealth;
      const directHealth = await directAuthHealthExecutor({
        config: activeConfig,
        auth,
      });
      const credentialSourceType = classifyCredentialSourceType(
        auth.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE,
      );
      const serviceAccountPolicyEnforced = isServiceAccountPolicyEnforced();
      const latencyMs = Date.now() - startedAt;
      params.audit.emit({
        ctx: {
          ...params.ctx,
          bindingSubject: auth.bindingSubject,
          routeName: auth.route.name,
        },
        toolName: "gws_status",
        action: "auth-health",
        targetService: "status",
        readOnly: true,
        decision: "allow",
        credentialMode: auth.mode,
        routeName: auth.route.name,
        bindingSubject: auth.bindingSubject,
        latencyMs,
        resultCode: "OK",
      });
      return {
        ok: true,
        data: {
          route: {
            name: auth.route.name,
            bindingSubject: auth.bindingSubject,
            mode: auth.mode,
            transport: auth.transport,
          },
          impersonation: {
            configured: true,
            source: "agent_google_workspace",
            impersonatedUser: auth.impersonatedUser,
          },
          authHealth: {
            credentialSourceType,
            tokenValid: directHealth.tokenValid === true,
            tokenError: directHealth.tokenError ?? null,
            plainCredentialsExists: true,
            serviceAccountPolicyEnforced,
            serviceAccountPolicyCompliant: credentialSourceType === "service_account_json",
            delegatedAuthValidated: directHealth.tokenValid === true,
            delegatedSubject: auth.impersonatedUser,
            transport: auth.transport,
            smokeService: directHealth.service,
            raw: directHealth.payload ?? directHealth,
          },
          ...(params.deprecatedAliasUsed
            ? {
                deprecation: {
                  command: "auth-status",
                  message:
                    "auth-status is deprecated and currently aliases auth-health. Migrate to openclaw gws auth-health.",
                },
              }
            : {}),
        },
        meta: {
          tool: "gws_status",
          action: "auth-health",
          service: "status",
          resultCode: "OK",
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
    const execution = await executeCommand({
      config: activeConfig,
      binaryPath: discovery.binaryPath,
      argv: ["auth", "status"],
      env: {
        ...(runtimeEnv ?? {}),
        ...auth.env,
      },
    });
    const normalized = normalizeExecution(execution);
    const health = parseAuthHealthResult({
      mode: auth.mode,
      credentialsFile: auth.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE,
      payload: normalized.payload,
    });
    const impersonation = getRouteImpersonationStatus(auth.route);
    const serviceAccountPolicyEnforced = isServiceAccountPolicyEnforced();
    const serviceAccountPolicyCompliant =
      auth.mode !== "credentials_file" ||
      !impersonation.configured ||
      !serviceAccountPolicyEnforced ||
      health.credentialSourceType === "service_account_json";

    if (!health.tokenValid || health.tokenError) {
      throw new PluginError(
        "AUTH_ERROR",
        "Route auth health is unhealthy. Reauthenticate the route credential source and retry.",
        {
          routeName: auth.route.name,
          bindingSubject: auth.bindingSubject,
          tokenValid: health.tokenValid,
          tokenError: health.tokenError,
          credentialSourceType: health.credentialSourceType,
          failureCategory: "TOKEN_HEALTH",
          serviceAccountPolicyEnforced,
          impersonatedUser: impersonation.value,
          impersonationSource: impersonation.source,
        },
      );
    }

    const latencyMs = Date.now() - startedAt;
    params.audit.emit({
      ctx: {
        ...params.ctx,
        bindingSubject: auth.bindingSubject,
        routeName: auth.route.name,
      },
      toolName: "gws_status",
      action: "auth-health",
      targetService: "status",
      readOnly: true,
      decision: "allow",
      credentialMode: auth.mode,
      routeName: auth.route.name,
      bindingSubject: auth.bindingSubject,
      latencyMs,
      resultCode: "OK",
    });
    return {
      ok: true,
      data: {
        route: {
          name: auth.route.name,
          bindingSubject: auth.bindingSubject,
          mode: auth.mode,
        },
        impersonation: {
          configured: impersonation.configured,
          source: impersonation.source,
          envVar: impersonation.envVar,
          impersonatedUser: impersonation.value,
        },
        authHealth: {
          credentialSourceType: health.credentialSourceType,
          tokenValid: health.tokenValid,
          tokenError: health.tokenError,
          plainCredentialsExists: health.plainCredentialsExists,
          serviceAccountPolicyEnforced,
          serviceAccountPolicyCompliant,
          raw: normalized.payload,
        },
        ...(params.deprecatedAliasUsed
          ? {
              deprecation: {
                command: "auth-status",
                message:
                  "auth-status is deprecated and currently aliases auth-health. Migrate to openclaw gws auth-health.",
              },
            }
          : {}),
      },
      meta: {
        tool: "gws_status",
        action: "auth-health",
        service: "status",
        resultCode: "OK",
        latencyMs,
      },
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const mapped = toStructuredError({
      error,
      tool: "gws_status",
      action: "auth-health",
      service: "status",
      latencyMs,
    });
    params.audit.emit({
      ctx: params.ctx,
      toolName: "gws_status",
      action: "auth-health",
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
