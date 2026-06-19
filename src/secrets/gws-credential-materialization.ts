import fs from "node:fs";
import path from "node:path";
import type { OpenClawConfig } from "../config/config.js";
import {
  collectSecretInputAssignment,
  type PreparedSecretAssignmentEffect,
  pushWarning,
  type ResolverContext,
  type SecretDefaults,
} from "./runtime-shared.js";
import { isRecord } from "./shared.js";

const GWS_PLUGIN_ID = "gws-toolkit-phase1";

type GwsMaterializationTarget = {
  credentialsFile: string;
  approvedCredentialDirs: string[];
  path: string;
  refValue: unknown;
};

function normalizePath(input: string): string {
  return path.resolve(input);
}

function normalizeComparablePath(input: string): string {
  const resolved = normalizePath(input);
  const stripped = resolved.replace(/[\\/]+$/, "");
  return process.platform === "win32" ? stripped.toLowerCase() : stripped;
}

function isPathInside(parent: string, child: string): boolean {
  const normalizedParent = normalizeComparablePath(parent);
  const normalizedChild = normalizeComparablePath(child);
  if (normalizedChild === normalizedParent) {
    return true;
  }
  const separator = process.platform === "win32" ? "\\" : "/";
  return normalizedChild.startsWith(`${normalizedParent}${separator}`);
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

function isGwsPluginEffectivelyActive(config: OpenClawConfig): boolean {
  const plugins = isRecord(config.plugins) ? config.plugins : undefined;
  if (!plugins || plugins.enabled === false) {
    return false;
  }
  const deny = normalizeStringArray(plugins.deny);
  if (deny.includes(GWS_PLUGIN_ID)) {
    return false;
  }
  const allow = normalizeStringArray(plugins.allow);
  if (allow.length > 0 && !allow.includes(GWS_PLUGIN_ID)) {
    return false;
  }
  const entries = isRecord(plugins.entries) ? plugins.entries : undefined;
  const entry = entries && isRecord(entries[GWS_PLUGIN_ID]) ? entries[GWS_PLUGIN_ID] : undefined;
  return Boolean(entry && entry.enabled !== false);
}

function resolveGwsPluginConfig(config: OpenClawConfig): Record<string, unknown> | null {
  const plugins = isRecord(config.plugins) ? config.plugins : undefined;
  const entries = plugins && isRecord(plugins.entries) ? plugins.entries : undefined;
  const entry = entries && isRecord(entries[GWS_PLUGIN_ID]) ? entries[GWS_PLUGIN_ID] : undefined;
  const pluginConfig = entry && isRecord(entry.config) ? entry.config : undefined;
  return pluginConfig ?? null;
}

function ensureCredentialTargetPath(params: {
  credentialsFile: string;
  approvedCredentialDirs: string[];
  configPath: string;
}): string {
  const targetPath = normalizePath(params.credentialsFile);
  try {
    if (fs.lstatSync(targetPath).isSymbolicLink()) {
      throw new Error(`${params.configPath}: credentialsFile must not be a symlink.`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  const parentDir = path.dirname(targetPath);
  if (!fs.existsSync(parentDir) || !fs.statSync(parentDir).isDirectory()) {
    throw new Error(`${params.configPath}: credentialsFile parent directory does not exist.`);
  }
  const parentRealPath = fs.realpathSync(parentDir);
  const approvedDirs = params.approvedCredentialDirs.map((entry) => normalizePath(entry));
  if (approvedDirs.length === 0) {
    throw new Error(`${params.configPath}: approvedCredentialDirs must include at least one path.`);
  }
  const approvedRealDirs = approvedDirs.map((dirPath) => {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      throw new Error(`${params.configPath}: approvedCredentialDirs entry does not exist.`);
    }
    return fs.realpathSync(dirPath);
  });
  if (!approvedRealDirs.some((dirPath) => isPathInside(dirPath, parentRealPath))) {
    throw new Error(`${params.configPath}: credentialsFile is outside approvedCredentialDirs.`);
  }
  return targetPath;
}

function assertCredentialJson(value: string, configPath: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`${configPath}: credentialsJsonRef resolved to invalid JSON.`, {
      cause: error,
    });
  }
  if (!isRecord(parsed)) {
    throw new Error(`${configPath}: credentialsJsonRef must resolve to a JSON object.`);
  }
}

function removeFileBestEffort(pathname: string | undefined): void {
  if (!pathname) {
    return;
  }
  try {
    if (fs.existsSync(pathname)) {
      fs.rmSync(pathname, { force: true });
    }
  } catch {
    // Best-effort cleanup only; subsequent writes use unique temp names.
  }
}

function prepareCredentialJsonMaterialization(params: {
  value: string;
  target: GwsMaterializationTarget;
}): PreparedSecretAssignmentEffect {
  assertCredentialJson(params.value, params.target.path);
  const targetPath = ensureCredentialTargetPath({
    credentialsFile: params.target.credentialsFile,
    approvedCredentialDirs: params.target.approvedCredentialDirs,
    configPath: params.target.path,
  });
  const parentDir = path.dirname(targetPath);
  const tempPath = path.join(
    parentDir,
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`,
  );
  const backupPath = path.join(
    parentDir,
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.bak`,
  );
  let committed = false;
  let hadOriginal = false;
  fs.writeFileSync(tempPath, params.value, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(tempPath, 0o600);
  if (process.platform !== "win32" && typeof process.getuid === "function") {
    if (process.getuid() === 0) {
      fs.chownSync(tempPath, 1000, 1000);
    }
  }
  return {
    commit: () => {
      ensureCredentialTargetPath({
        credentialsFile: params.target.credentialsFile,
        approvedCredentialDirs: params.target.approvedCredentialDirs,
        configPath: params.target.path,
      });
      hadOriginal = fs.existsSync(targetPath);
      if (hadOriginal) {
        fs.renameSync(targetPath, backupPath);
      }
      try {
        fs.renameSync(tempPath, targetPath);
        fs.chmodSync(targetPath, 0o600);
        committed = true;
      } catch (error) {
        if (hadOriginal && fs.existsSync(backupPath) && !fs.existsSync(targetPath)) {
          fs.renameSync(backupPath, targetPath);
        }
        throw error;
      }
    },
    rollback: () => {
      if (committed) {
        removeFileBestEffort(targetPath);
        if (hadOriginal && fs.existsSync(backupPath)) {
          fs.renameSync(backupPath, targetPath);
        }
        committed = false;
      }
      removeFileBestEffort(tempPath);
      removeFileBestEffort(backupPath);
    },
    finalize: () => {
      removeFileBestEffort(backupPath);
      removeFileBestEffort(tempPath);
    },
  };
}

function collectTarget(params: {
  target: GwsMaterializationTarget;
  defaults: SecretDefaults | undefined;
  context: ResolverContext;
  active: boolean;
  inactiveReason?: string;
}): void {
  collectSecretInputAssignment({
    value: params.target.refValue,
    path: params.target.path,
    expected: "string",
    defaults: params.defaults,
    context: params.context,
    active: params.active,
    inactiveReason: params.inactiveReason,
    prepare: (value) =>
      prepareCredentialJsonMaterialization({
        value: String(value),
        target: params.target,
      }),
  });
  if (
    params.active &&
    (typeof params.context.env.GWS_CREDENTIALS === "string" ||
      params.context.env.GWS_CREDENTIALS_FALLBACK_ACTIVE === "1")
  ) {
    pushWarning(params.context, {
      code: "SECRETS_REF_OVERRIDES_PLAINTEXT",
      path: params.target.path,
      message: `${params.target.path}: credentialsJsonRef is configured; ignoring deploy-provided GWS_CREDENTIALS fallback.`,
    });
  }
}

export function collectGwsCredentialMaterializationAssignments(params: {
  config: OpenClawConfig;
  defaults: SecretDefaults | undefined;
  context: ResolverContext;
}): void {
  const pluginConfig = resolveGwsPluginConfig(params.config);
  if (!pluginConfig) {
    return;
  }
  const pluginActive = isGwsPluginEffectivelyActive(params.config);
  const approvedCredentialDirs = normalizeStringArray(pluginConfig.approvedCredentialDirs);
  const topLevelCredentialsFile =
    typeof pluginConfig.credentialsFile === "string" && pluginConfig.credentialsFile.trim()
      ? pluginConfig.credentialsFile.trim()
      : undefined;
  if (pluginConfig.credentialsJsonRef !== undefined) {
    collectTarget({
      target: {
        credentialsFile: topLevelCredentialsFile ?? "",
        approvedCredentialDirs,
        path: `plugins.entries.${GWS_PLUGIN_ID}.config.credentialsJsonRef`,
        refValue: pluginConfig.credentialsJsonRef,
      },
      defaults: params.defaults,
      context: params.context,
      active: pluginActive && Boolean(topLevelCredentialsFile),
      inactiveReason: pluginActive
        ? "credentialsJsonRef requires credentialsFile."
        : "gws-toolkit-phase1 is disabled.",
    });
  }

  const routes = isRecord(pluginConfig.credentialRoutes)
    ? pluginConfig.credentialRoutes
    : undefined;
  if (!routes) {
    return;
  }
  for (const [routeName, routeValue] of Object.entries(routes)) {
    if (!isRecord(routeValue) || routeValue.credentialsJsonRef === undefined) {
      continue;
    }
    const credentialsFile =
      typeof routeValue.credentialsFile === "string" && routeValue.credentialsFile.trim()
        ? routeValue.credentialsFile.trim()
        : undefined;
    const active =
      pluginActive && routeValue.mode === "credentials_file" && Boolean(credentialsFile);
    collectTarget({
      target: {
        credentialsFile: credentialsFile ?? "",
        approvedCredentialDirs,
        path: `plugins.entries.${GWS_PLUGIN_ID}.config.credentialRoutes.${routeName}.credentialsJsonRef`,
        refValue: routeValue.credentialsJsonRef,
      },
      defaults: params.defaults,
      context: params.context,
      active,
      inactiveReason: pluginActive
        ? "credentialsJsonRef is active only on credentials_file routes with credentialsFile."
        : "gws-toolkit-phase1 is disabled.",
    });
  }
}
