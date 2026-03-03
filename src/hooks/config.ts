import fs from "node:fs";
import path from "node:path";
import type { OpenClawConfig, HookConfig } from "../config/config.js";
import { resolveHookKey } from "./frontmatter.js";
import type { HookEligibilityContext, HookEntry } from "./types.js";

const DEFAULT_CONFIG_VALUES: Record<string, boolean> = {
  "browser.enabled": true,
  "browser.evaluateEnabled": true,
  "workspace.dir": true,
};

function isTruthy(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

export function resolveConfigPath(config: OpenClawConfig | undefined, pathStr: string) {
  const parts = pathStr.split(".").filter(Boolean);
  let current: unknown = config;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function isConfigPathTruthy(config: OpenClawConfig | undefined, pathStr: string): boolean {
  const value = resolveConfigPath(config, pathStr);
  if (value === undefined && pathStr in DEFAULT_CONFIG_VALUES) {
    return DEFAULT_CONFIG_VALUES[pathStr];
  }
  return isTruthy(value);
}

export function resolveHookConfig(
  config: OpenClawConfig | undefined,
  hookKey: string,
): HookConfig | undefined {
  const hooks = config?.hooks?.internal?.entries;
  if (!hooks || typeof hooks !== "object") {
    return undefined;
  }
  const entry = (hooks as Record<string, HookConfig | undefined>)[hookKey];
  if (!entry || typeof entry !== "object") {
    return undefined;
  }
  return entry;
}

<<<<<<< HEAD
export function resolveRuntimePlatform(): string {
  return process.platform;
}

export function hasBinary(bin: string): boolean {
  const pathEnv = process.env.PATH ?? "";
  const parts = pathEnv.split(path.delimiter).filter(Boolean);
  const extensions =
    process.platform === "win32"
      ? [
          "",
          ...(process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
            .split(";")
            .filter(Boolean),
        ]
      : [""];
  for (const part of parts) {
    for (const ext of extensions) {
      const candidate = path.join(part, bin + ext);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return true;
      } catch {
        // keep scanning
      }
    }
  }
  return false;
}

=======
function evaluateHookRuntimeEligibility(params: {
  entry: HookEntry;
  config?: OpenClawConfig;
  hookConfig?: HookConfig;
  eligibility?: HookEligibilityContext;
}): boolean {
  const { entry, config, hookConfig, eligibility } = params;
  const remote = eligibility?.remote;
  const base = {
    os: entry.metadata?.os,
    remotePlatforms: remote?.platforms,
    always: entry.metadata?.always,
    requires: entry.metadata?.requires,
    hasRemoteBin: remote?.hasBin,
    hasAnyRemoteBin: remote?.hasAnyBin,
  };
  return evaluateRuntimeEligibility({
    ...base,
    hasBin: hasBinary,
    hasEnv: (envName) => Boolean(process.env[envName] || hookConfig?.env?.[envName]),
    isConfigPathTruthy: (configPath) => isConfigPathTruthy(config, configPath),
  });
}

>>>>>>> 328679131 (refactor(agents): dedupe config and truncation guards)
export function shouldIncludeHook(params: {
  entry: HookEntry;
  config?: OpenClawConfig;
  eligibility?: HookEligibilityContext;
}): boolean {
  const { entry, config, eligibility } = params;
  const hookKey = resolveHookKey(entry.hook.name, entry);
  const hookConfig = resolveHookConfig(config, hookKey);
  const pluginManaged = entry.hook.source === "openclaw-plugin";
  const osList = entry.metadata?.os ?? [];
  const remotePlatforms = eligibility?.remote?.platforms ?? [];

  // Check if explicitly disabled
  if (!pluginManaged && hookConfig?.enabled === false) {
    return false;
  }

  return evaluateHookRuntimeEligibility({
    entry,
    config,
    hookConfig,
    eligibility,
  });
}
