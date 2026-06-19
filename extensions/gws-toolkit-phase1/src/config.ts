import path from "node:path";
import { coerceSecretRef } from "../../../src/config/types.secrets.js";
import { resolveGmailContactPolicy } from "./gmail-policy.js";
import {
  ALL_SERVICES,
  DEFAULT_ALLOWED_CREDENTIAL_MODES,
  DEFAULT_ENABLED_SERVICES,
  READ_TOOLS_BY_SERVICE,
  READONLY_SCOPES,
  WRITE_SCOPES,
  WRITE_TOOLS_BY_SERVICE,
  type ConfigPosture,
  type CredentialMode,
  type CredentialRouteConfig,
  type GwsToolkitConfig,
  type ServiceFamily,
  type StructuredError,
} from "./types.js";

const ALLOWED_CONFIG_KEYS = new Set([
  "enabledServices",
  "enabledWriteServices",
  "binaryPath",
  "approvedCredentialDirs",
  "credentialsFile",
  "credentialsJsonRef",
  "tokenEnvVar",
  "timeoutMs",
  "maxStdoutBytes",
  "maxStderrBytes",
  "safeMode",
  "allowedCredentialModes",
  "allowWriteOperations",
  "allowUnboundAgents",
  "credentialRoutes",
  "agentCredentialBindings",
  "workspaceIdentityDomains",
  "defaultCredentialRoute",
  "defaultScopesProfile",
  "customScopes",
  "requireHumanApprovalFor",
  "gmailPolicy",
]);

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return Array.from(
    new Set(
      input
        .filter((entry) => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function sanitizeNumber(input: unknown, fallback: number, min: number, max: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(input)));
}

function normalizeServices(input: unknown): ServiceFamily[] {
  const allowed = new Set<ServiceFamily>(ALL_SERVICES);
  return normalizeStringArray(input).filter((value): value is ServiceFamily =>
    allowed.has(value as ServiceFamily),
  );
}

function normalizeCredentialModes(input: unknown): {
  modes: CredentialMode[];
  rejected: string[];
} {
  const allowed = new Set<CredentialMode>(["credentials_file", "token"]);
  const normalized = normalizeStringArray(input);
  return {
    modes: normalized.filter((value): value is CredentialMode =>
      allowed.has(value as CredentialMode),
    ),
    rejected: normalized.filter((value) => !allowed.has(value as CredentialMode)),
  };
}

function isValidEnvVarName(value: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/.test(value);
}

function hasConfiguredToken(envVar: string): boolean {
  const value = process.env[envVar];
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeCredentialsJsonRef(
  value: unknown,
  pathLabel: string,
): NonNullable<CredentialRouteConfig["credentialsJsonRef"]> | { error: string } | undefined {
  if (value === undefined) {
    return undefined;
  }
  const ref = coerceSecretRef(value);
  if (!ref) {
    return {
      error: `${pathLabel} must be a valid SecretRef with non-empty source, provider, and id.`,
    };
  }
  return ref;
}

function buildConfigError(message: string): StructuredError {
  return {
    ok: false,
    error: {
      code: "CONFIG_ERROR",
      message,
    },
    meta: {
      tool: "gws_status",
      action: "status",
      service: "status",
      latencyMs: 0,
    },
  };
}

function normalizeRouteConfig(
  routeName: string,
  raw: unknown,
): CredentialRouteConfig | { error: string } {
  const obj = asObject(raw);
  if (!obj) {
    return { error: `credential route ${routeName} must be an object` };
  }
  const mode = obj.mode;
  if (mode === "oauth") {
    return {
      error: `credential route ${routeName} uses unsupported mode oauth. Migrate to credentials_file (Headless OAuth2 exported credentials or service-account JSON) or token.`,
    };
  }
  if (mode !== "credentials_file" && mode !== "token") {
    return { error: `credential route ${routeName} has invalid mode` };
  }

  const allowedServices = normalizeServices(obj.allowedServices);
  const allowedTools = normalizeStringArray(obj.allowedTools).filter((value) =>
    value.startsWith("gws_"),
  );
  const allowedActions = normalizeStringArray(obj.allowedActions);
  const impersonatedUser =
    typeof obj.impersonatedUser === "string" && obj.impersonatedUser.trim()
      ? obj.impersonatedUser.trim()
      : undefined;
  const impersonatedUserEnvVar =
    typeof obj.impersonatedUserEnvVar === "string" && obj.impersonatedUserEnvVar.trim()
      ? obj.impersonatedUserEnvVar.trim()
      : undefined;

  if (impersonatedUser && impersonatedUserEnvVar) {
    return {
      error: `credential route ${routeName} must set only one impersonation source (impersonatedUser or impersonatedUserEnvVar).`,
    };
  }
  if (mode !== "credentials_file" && (impersonatedUser || impersonatedUserEnvVar)) {
    return {
      error: `credential route ${routeName} can only configure impersonation for credentials_file mode.`,
    };
  }
  if (impersonatedUserEnvVar && !isValidEnvVarName(impersonatedUserEnvVar)) {
    return {
      error: `credential route ${routeName} has invalid impersonatedUserEnvVar "${impersonatedUserEnvVar}". Use an uppercase environment variable name like ORG_DELEGATE_USER.`,
    };
  }
  const credentialsJsonRef = normalizeCredentialsJsonRef(
    obj.credentialsJsonRef,
    `credential route ${routeName} credentialsJsonRef`,
  );
  if (credentialsJsonRef && "error" in credentialsJsonRef) {
    return credentialsJsonRef;
  }

  return {
    mode,
    label: typeof obj.label === "string" && obj.label.trim() ? obj.label.trim() : undefined,
    allowedServices,
    allowedTools: allowedTools as CredentialRouteConfig["allowedTools"],
    allowedActions: allowedActions.length > 0 ? allowedActions : undefined,
    credentialsFile:
      typeof obj.credentialsFile === "string" && obj.credentialsFile.trim()
        ? obj.credentialsFile.trim()
        : undefined,
    credentialsJsonRef,
    tokenEnvVar:
      typeof obj.tokenEnvVar === "string" && obj.tokenEnvVar.trim()
        ? obj.tokenEnvVar.trim()
        : undefined,
    impersonatedUser,
    impersonatedUserEnvVar,
  };
}

function synthesizeLegacyRoute(config: Omit<GwsToolkitConfig, "credentialRoutes" | "warnings">) {
  const services = Array.from(
    new Set<ServiceFamily>([...config.enabledServices, ...config.enabledWriteServices]),
  );
  const allowedTools = services.flatMap((service) => {
    const readTool = READ_TOOLS_BY_SERVICE[service];
    const writeTool = WRITE_TOOLS_BY_SERVICE[service];
    return config.allowWriteOperations && config.enabledWriteServices.includes(service)
      ? [readTool, writeTool]
      : [readTool];
  });

  const mode: CredentialMode =
    config.allowedCredentialModes.includes("token") && hasConfiguredToken(config.tokenEnvVar)
      ? "token"
      : config.credentialsFile
        ? "credentials_file"
        : config.allowedCredentialModes.includes("token")
          ? "token"
          : "credentials_file";

  return {
    routeName: "legacy-default",
    route: {
      mode,
      label: "Legacy compatibility route",
      allowedServices: services.length > 0 ? services : DEFAULT_ENABLED_SERVICES,
      allowedTools,
      credentialsFile: config.credentialsFile,
      credentialsJsonRef: config.credentialsJsonRef,
      tokenEnvVar: config.tokenEnvVar,
    } satisfies CredentialRouteConfig,
  };
}

function resolveScopesProfile(config: {
  enabledServices: ServiceFamily[];
  enabledWriteServices: ServiceFamily[];
  defaultScopesProfile: "minimal" | "service-set" | "custom";
  customScopes?: string[];
}) {
  if (config.defaultScopesProfile === "custom") {
    return config.customScopes ?? [];
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
      continue;
    }
    for (const scope of READONLY_SCOPES[service]) {
      scopes.add(scope);
    }
  }
  return [...scopes];
}

export type ResolvedConfig = {
  pluginConfigProvided: boolean;
  config: GwsToolkitConfig;
  posture: ConfigPosture;
};

export function resolveConfig(
  rawPluginConfig: unknown,
):
  | { ok: true; value: ResolvedConfig }
  | { ok: false; error: StructuredError; posture: ConfigPosture } {
  const explicitConfigFile = process.env.OPENCLAW_CONFIG_FILE?.trim();
  const explicitConfigPath = process.env.OPENCLAW_CONFIG_PATH?.trim();
  const sourcePath = explicitConfigFile || explicitConfigPath;
  const sourceEnvVar = explicitConfigFile
    ? "OPENCLAW_CONFIG_FILE"
    : explicitConfigPath
      ? "OPENCLAW_CONFIG_PATH"
      : "OPENCLAW_CONFIG_FILE";
  const postureBase: ConfigPosture = {
    sourceEnvVar,
    sourcePathPresent: typeof sourcePath === "string" && sourcePath.trim().length > 0,
    sourcePathBasename:
      typeof sourcePath === "string" && sourcePath.trim().length > 0
        ? path.basename(sourcePath.trim())
        : undefined,
    pluginConfigProvided: rawPluginConfig !== undefined,
    valid: false,
    message: "plugin config missing",
  };

  const raw = asObject(rawPluginConfig);
  if (!raw) {
    return {
      ok: false,
      error: buildConfigError(
        "gws-toolkit-phase1 plugin config missing or invalid. Ensure plugins.entries.gws-toolkit-phase1.config is set in OPENCLAW_CONFIG_FILE or OPENCLAW_CONFIG_PATH.",
      ),
      posture: postureBase,
    };
  }

  const unknownKeys = Object.keys(raw).filter((key) => !ALLOWED_CONFIG_KEYS.has(key));
  if (unknownKeys.length > 0) {
    return {
      ok: false,
      error: buildConfigError(`Unknown plugin config keys: ${unknownKeys.join(", ")}`),
      posture: {
        ...postureBase,
        pluginConfigProvided: true,
        message: "plugin config contains unknown keys",
      },
    };
  }

  const enabledServices = normalizeServices(raw.enabledServices);
  const enabledWriteServices = normalizeServices(raw.enabledWriteServices);
  const normalizedCredentialModes = normalizeCredentialModes(raw.allowedCredentialModes);
  if (raw.allowedCredentialModes !== undefined && normalizedCredentialModes.rejected.length > 0) {
    const rejectedModes = normalizedCredentialModes.rejected.join(", ");
    const includesOauth = normalizedCredentialModes.rejected.includes("oauth");
    return {
      ok: false,
      error: buildConfigError(
        includesOauth
          ? `allowedCredentialModes includes unsupported mode oauth${
              normalizedCredentialModes.rejected.length > 1 ? ` (rejected: ${rejectedModes})` : ""
            }. Migrate to credentials_file (Headless OAuth2 exported credentials or service-account JSON) or token for short-lived access.`
          : `allowedCredentialModes contains invalid mode(s): ${rejectedModes}. Supported modes are credentials_file and token.`,
      ),
      posture: {
        ...postureBase,
        pluginConfigProvided: true,
        message: includesOauth ? "oauth mode removed" : "credential modes invalid",
      },
    };
  }
  const defaultScopesProfile =
    raw.defaultScopesProfile === "custom"
      ? "custom"
      : raw.defaultScopesProfile === "service-set"
        ? "service-set"
        : "minimal";
  const customScopes = normalizeStringArray(raw.customScopes);
  const gmailPolicy = resolveGmailContactPolicy({
    rawPolicy: raw.gmailPolicy,
    sourcePath,
  });
  if (!gmailPolicy.ok) {
    return {
      ok: false,
      error: buildConfigError(gmailPolicy.error),
      posture: {
        ...postureBase,
        pluginConfigProvided: true,
        message: "gmail policy invalid",
      },
    };
  }

  if (defaultScopesProfile === "custom" && customScopes.length === 0) {
    return {
      ok: false,
      error: buildConfigError("custom scope profile requires non-empty customScopes."),
      posture: {
        ...postureBase,
        pluginConfigProvided: true,
        message: "custom scope profile missing scopes",
      },
    };
  }
  const topLevelCredentialsJsonRef = normalizeCredentialsJsonRef(
    raw.credentialsJsonRef,
    "credentialsJsonRef",
  );
  if (topLevelCredentialsJsonRef && "error" in topLevelCredentialsJsonRef) {
    return {
      ok: false,
      error: buildConfigError(topLevelCredentialsJsonRef.error),
      posture: {
        ...postureBase,
        pluginConfigProvided: true,
        message: "credentialsJsonRef invalid",
      },
    };
  }

  const configBase: Omit<GwsToolkitConfig, "credentialRoutes" | "warnings"> = {
    enabledServices: enabledServices.length > 0 ? enabledServices : [...DEFAULT_ENABLED_SERVICES],
    enabledWriteServices,
    binaryPath:
      typeof raw.binaryPath === "string" && raw.binaryPath.trim()
        ? raw.binaryPath.trim()
        : undefined,
    approvedCredentialDirs: normalizeStringArray(raw.approvedCredentialDirs),
    credentialsFile:
      typeof raw.credentialsFile === "string" && raw.credentialsFile.trim()
        ? raw.credentialsFile.trim()
        : undefined,
    credentialsJsonRef: topLevelCredentialsJsonRef,
    tokenEnvVar:
      typeof raw.tokenEnvVar === "string" && raw.tokenEnvVar.trim()
        ? raw.tokenEnvVar.trim()
        : "GOOGLE_WORKSPACE_CLI_TOKEN",
    timeoutMs: sanitizeNumber(raw.timeoutMs, 15000, 1000, 120000),
    maxStdoutBytes: sanitizeNumber(raw.maxStdoutBytes, 1048576, 1024, 4194304),
    maxStderrBytes: sanitizeNumber(raw.maxStderrBytes, 262144, 1024, 1048576),
    safeMode: raw.safeMode !== false,
    allowedCredentialModes:
      normalizedCredentialModes.modes.length > 0
        ? normalizedCredentialModes.modes
        : [...DEFAULT_ALLOWED_CREDENTIAL_MODES],
    allowWriteOperations: raw.allowWriteOperations === true,
    allowUnboundAgents: raw.allowUnboundAgents === true,
    defaultCredentialRoute:
      typeof raw.defaultCredentialRoute === "string" && raw.defaultCredentialRoute.trim()
        ? raw.defaultCredentialRoute.trim()
        : raw.defaultCredentialRoute === null
          ? null
          : null,
    agentCredentialBindings: {},
    workspaceIdentityDomains: normalizeStringArray(raw.workspaceIdentityDomains).map((domain) =>
      domain.toLowerCase(),
    ),
    defaultScopesProfile,
    customScopes: defaultScopesProfile === "custom" ? customScopes : undefined,
    requireHumanApprovalFor: normalizeStringArray(raw.requireHumanApprovalFor),
    gmailPolicy: gmailPolicy.value,
  };

  const warnings: string[] = [];
  const routeMapRaw = asObject(raw.credentialRoutes);
  const credentialRoutes: Record<string, CredentialRouteConfig> = {};
  let synthesizedLegacyRoute = false;

  if (routeMapRaw) {
    for (const [routeName, routeValue] of Object.entries(routeMapRaw)) {
      const normalizedName = routeName.trim();
      if (!normalizedName) {
        return {
          ok: false,
          error: buildConfigError("credentialRoutes contains an empty route name."),
          posture: {
            ...postureBase,
            pluginConfigProvided: true,
            message: "credential route name invalid",
          },
        };
      }
      const normalizedRoute = normalizeRouteConfig(normalizedName, routeValue);
      if ("error" in normalizedRoute) {
        return {
          ok: false,
          error: buildConfigError(normalizedRoute.error),
          posture: {
            ...postureBase,
            pluginConfigProvided: true,
            message: "credential route invalid",
          },
        };
      }
      credentialRoutes[normalizedName] = normalizedRoute;
    }
  }

  const bindingsRaw = asObject(raw.agentCredentialBindings);
  if (bindingsRaw) {
    for (const [subject, routeName] of Object.entries(bindingsRaw)) {
      if (typeof routeName !== "string" || !routeName.trim()) {
        return {
          ok: false,
          error: buildConfigError(
            `agentCredentialBindings.${subject} must reference a route name.`,
          ),
          posture: {
            ...postureBase,
            pluginConfigProvided: true,
            message: "binding invalid",
          },
        };
      }
      configBase.agentCredentialBindings[subject.trim()] = routeName.trim();
    }
  }

  if (Object.keys(credentialRoutes).length === 0) {
    const legacy = synthesizeLegacyRoute(configBase);
    credentialRoutes[legacy.routeName] = legacy.route;
    synthesizedLegacyRoute = true;
    if (configBase.defaultCredentialRoute === null) {
      configBase.defaultCredentialRoute = legacy.routeName;
    }
    if (raw.allowUnboundAgents === undefined) {
      configBase.allowUnboundAgents = true;
    }
    warnings.push(
      "Using legacy single-credential compatibility mode. A synthesized default route preserves existing deployments, but named credentialRoutes and agentCredentialBindings are recommended for explicit per-agent routing.",
    );
  }

  for (const [routeName, route] of Object.entries(credentialRoutes)) {
    if (!configBase.allowedCredentialModes.includes(route.mode)) {
      return {
        ok: false,
        error: buildConfigError(
          `credential route ${routeName} uses denied auth mode ${route.mode}`,
        ),
        posture: {
          ...postureBase,
          pluginConfigProvided: true,
          message: "route mode denied",
        },
      };
    }
  }

  if (
    configBase.defaultCredentialRoute !== null &&
    !Object.hasOwn(credentialRoutes, configBase.defaultCredentialRoute)
  ) {
    return {
      ok: false,
      error: buildConfigError(
        `defaultCredentialRoute references unknown route: ${configBase.defaultCredentialRoute}`,
      ),
      posture: {
        ...postureBase,
        pluginConfigProvided: true,
        message: "default route invalid",
      },
    };
  }

  for (const [subject, routeName] of Object.entries(configBase.agentCredentialBindings)) {
    if (!Object.hasOwn(credentialRoutes, routeName)) {
      return {
        ok: false,
        error: buildConfigError(
          `agentCredentialBindings.${subject} references unknown route ${routeName}`,
        ),
        posture: {
          ...postureBase,
          pluginConfigProvided: true,
          message: "binding references unknown route",
        },
      };
    }
  }

  for (const [subject, routeName] of Object.entries(configBase.agentCredentialBindings)) {
    const route = credentialRoutes[routeName];
    if (route?.mode !== "token") {
      continue;
    }
    warnings.push(
      `agentCredentialBindings.${subject} points to token route ${routeName}. Treat token mode as break-glass only; prefer credentials_file routes for routine delegated operations.`,
    );
  }

  if (!configBase.safeMode) {
    warnings.push(
      "safeMode=false is unsupported for this hardened toolkit and requests will fail closed.",
    );
  }

  if (synthesizedLegacyRoute && raw.allowUnboundAgents === false) {
    warnings.push(
      "Legacy compatibility route was synthesized, but allowUnboundAgents=false means unbound agents will still be denied until explicit bindings are configured.",
    );
  }
  if (synthesizedLegacyRoute && configBase.allowUnboundAgents) {
    warnings.push(
      "Legacy compatibility mode keeps unbound fallback active. For delegate-grade posture, configure explicit agentCredentialBindings and set allowUnboundAgents=false.",
    );
  }

  const scopes = resolveScopesProfile({
    enabledServices: configBase.enabledServices,
    enabledWriteServices: configBase.enabledWriteServices,
    defaultScopesProfile,
    customScopes,
  });
  if (defaultScopesProfile === "custom" && !configBase.allowWriteOperations) {
    const containsWriteScope = scopes.some((scope) =>
      Object.values(WRITE_SCOPES).some((candidates) =>
        candidates.some((candidate) => candidate.toLowerCase() === scope.toLowerCase()),
      ),
    );
    if (containsWriteScope) {
      warnings.push(
        "customScopes includes write-capable scopes while allowWriteOperations=false; write requests still remain denied by policy.",
      );
    }
  }

  return {
    ok: true,
    value: {
      pluginConfigProvided: true,
      config: {
        ...configBase,
        credentialRoutes,
        warnings,
      },
      posture: {
        ...postureBase,
        pluginConfigProvided: true,
        valid: true,
        message: "plugin config loaded",
      },
    },
  };
}
