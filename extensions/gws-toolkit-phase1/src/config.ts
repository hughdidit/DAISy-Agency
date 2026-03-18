import path from "node:path";
import {
  ALLOWED_WRITE_SCOPE_MARKERS,
  MINIMAL_SCOPE_PROFILE,
  type ConfigPosture,
  type GwsToolkitConfig,
  type StructuredError,
} from "./types.js";

const ALLOWED_CONFIG_KEYS = new Set([
  "enabledServices",
  "binaryPath",
  "approvedCredentialDirs",
  "credentialsFile",
  "tokenEnvVar",
  "timeoutMs",
  "maxStdoutBytes",
  "maxStderrBytes",
  "safeMode",
  "allowedCredentialModes",
  "defaultScopesProfile",
  "customScopes",
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
  const out = input
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(out));
}

function sanitizeNumber(input: unknown, fallback: number, min: number, max: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(input)));
}

function containsWriteScope(scopes: string[]): string | undefined {
  const lowered = scopes.map((scope) => scope.trim().toLowerCase());
  return ALLOWED_WRITE_SCOPE_MARKERS.find((marker) =>
    lowered.some((scope) => scope === marker.toLowerCase()),
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

  const enabledServices = normalizeStringArray(raw.enabledServices).filter((value) =>
    ["drive", "gmail", "calendar"].includes(value),
  ) as GwsToolkitConfig["enabledServices"];

  const allowedCredentialModes = normalizeStringArray(raw.allowedCredentialModes).filter((value) =>
    ["oauth", "credentials_file", "token"].includes(value),
  ) as GwsToolkitConfig["allowedCredentialModes"];

  const defaultScopesProfile = raw.defaultScopesProfile === "custom" ? "custom" : "minimal";
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

  const activeScopes = defaultScopesProfile === "custom" ? customScopes : [...MINIMAL_SCOPE_PROFILE];
  const writeScope = containsWriteScope(activeScopes);
  if (writeScope) {
    return {
      ok: false,
      error: buildConfigError(`Write-capable scope is not allowed in Phase 1: ${writeScope}`),
      posture: {
        ...postureBase,
        pluginConfigProvided: true,
        message: "write-capable scope denied",
      },
    };
  }

  const config: GwsToolkitConfig = {
    enabledServices: enabledServices.length > 0 ? enabledServices : ["drive", "gmail", "calendar"],
    binaryPath: typeof raw.binaryPath === "string" && raw.binaryPath.trim() ? raw.binaryPath.trim() : undefined,
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
      allowedCredentialModes.length > 0
        ? allowedCredentialModes
        : ["oauth", "credentials_file", "token"],
    defaultScopesProfile,
    customScopes: defaultScopesProfile === "custom" ? customScopes : undefined,
  };

  return {
    ok: true,
    value: {
      pluginConfigProvided: true,
      config,
      posture: {
        ...postureBase,
        pluginConfigProvided: true,
        valid: true,
        message: "plugin config loaded",
      },
    },
  };
}