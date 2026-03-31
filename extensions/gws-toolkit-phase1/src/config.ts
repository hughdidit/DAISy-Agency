import path from "node:path";
import {
  ALL_SERVICES,
  DEFAULT_ALLOWED_CREDENTIAL_MODES,
  DEFAULT_ENABLED_SERVICES,
  READ_TOOLS_BY_SERVICE,
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
  "defaultCredentialRoute",
  "defaultScopesProfile",
  "customScopes",
  "requireHumanApprovalFor",
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

function normalizeCredentialModes(input: unknown): CredentialMode[] {
  const allowed = new Set<CredentialMode>(["oauth", "credentials_file", "token"]);
  return normalizeStringArray(input).filter((value): value is CredentialMode =>
    allowed.has(value as CredentialMode),
  );
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
  if (mode !== "oauth" && mode !== "credentials_file" && mode !== "token") {
    return { error: `credential route ${routeName} has invalid mode` };
  }

  const allowedServices = normalizeServices(obj.allowedServices);
  const allowedTools = normalizeStringArray(obj.allowedTools).filter((value) =>
    value.startsWith("gws_"),
  );
  const allowedActions = normalizeStringArray(obj.allowedActions);

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
    tokenEnvVar:
      typeof obj.tokenEnvVar === "string" && obj.tokenEnvVar.trim()
        ? obj.tokenEnvVar.trim()
        : undefined,
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

  const mode: CredentialMode = config.credentialsFile
    ? "credentials_file"
    : config.allowedCredentialModes.includes("token")
      ? "token"
      : "oauth";

  return {
    routeName: "legacy-default",
    route: {
      mode,
      label: "Legacy compatibility route",
      allowedServices: services.length > 0 ? services : DEFAULT_ENABLED_SERVICES,
      allowedTools,
      credentialsFile: config.credentialsFile,
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
    if (config.defaultScopesProfile === "service-set" && config.enabledWriteServices.includes(service)) {
      scopes.add(WRITE_SCOPES[service]);
      continue;
    }
    scopes.add(
      service === "drive"
        ? "https://www.googleapis.com/auth/drive.readonly"
        : service === "gmail"
          ? "https://www.googleapis.com/auth/gmail.readonly"
          : service === "calendar"
            ? "https://www.googleapis.com/auth/calendar.readonly"
            : service === "docs"
              ? "https://www.googleapis.com/auth/documents.readonly"
              : "https://www.googleapis.com/auth/spreadsheets.readonly",
    );
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
  const sourcePath = process.env.OPENCLAW_CONFIG_FILE;
  const postureBase: ConfigPosture = {
    sourceEnvVar: "OPENCLAW_CONFIG_FILE",
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
        "gws-toolkit-phase1 plugin config missing or invalid. Ensure plugins.entries.gws-toolkit-phase1.config is set in OPENCLAW_CONFIG_FILE.",
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
  const allowedCredentialModes = normalizeCredentialModes(raw.allowedCredentialModes);
  const defaultScopesProfile =
    raw.defaultScopesProfile === "custom"
      ? "custom"
      : raw.defaultScopesProfile === "service-set"
        ? "service-set"
        : "minimal";
  const customScopes = normalizeStringArray(raw.customScopes);

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
    tokenEnvVar:
      typeof raw.tokenEnvVar === "string" && raw.tokenEnvVar.trim()
        ? raw.tokenEnvVar.trim()
        : "GOOGLE_WORKSPACE_CLI_TOKEN",
    timeoutMs: sanitizeNumber(raw.timeoutMs, 15000, 1000, 120000),
    maxStdoutBytes: sanitizeNumber(raw.maxStdoutBytes, 1048576, 1024, 4194304),
    maxStderrBytes: sanitizeNumber(raw.maxStderrBytes, 262144, 1024, 1048576),
    safeMode: raw.safeMode !== false,
    allowedCredentialModes:
      allowedCredentialModes.length > 0 ? allowedCredentialModes : [...DEFAULT_ALLOWED_CREDENTIAL_MODES],
    allowWriteOperations: raw.allowWriteOperations === true,
    allowUnboundAgents: raw.allowUnboundAgents === true,
    defaultCredentialRoute:
      typeof raw.defaultCredentialRoute === "string" && raw.defaultCredentialRoute.trim()
        ? raw.defaultCredentialRoute.trim()
        : raw.defaultCredentialRoute === null
          ? null
          : null,
    agentCredentialBindings: {},
    defaultScopesProfile,
    customScopes: defaultScopesProfile === "custom" ? customScopes : undefined,
    requireHumanApprovalFor: normalizeStringArray(raw.requireHumanApprovalFor),
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
          error: buildConfigError(`agentCredentialBindings.${subject} must reference a route name.`),
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
        error: buildConfigError(`credential route ${routeName} uses denied auth mode ${route.mode}`),
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
        error: buildConfigError(`agentCredentialBindings.${subject} references unknown route ${routeName}`),
        posture: {
          ...postureBase,
          pluginConfigProvided: true,
          message: "binding references unknown route",
        },
      };
    }
  }

  if (!configBase.safeMode) {
    warnings.push("safeMode=false is unsupported for this hardened toolkit and requests will fail closed.");
  }

  if (synthesizedLegacyRoute && raw.allowUnboundAgents === false) {
    warnings.push(
      "Legacy compatibility route was synthesized, but allowUnboundAgents=false means unbound agents will still be denied until explicit bindings are configured.",
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
      Object.values(WRITE_SCOPES).some((candidate) => candidate.toLowerCase() === scope.toLowerCase()),
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
