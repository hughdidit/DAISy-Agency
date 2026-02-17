<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
import type { OpenClawConfig } from "./types.js";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { isPlainObject } from "../utils.js";
>>>>>>> 8d75a496b (refactor: centralize isPlainObject, isRecord, isErrno, isLoopbackHost utilities (#12926))
import { parseConfigPath, setConfigValueAtPath, unsetConfigValueAtPath } from "./config-paths.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "./types.js";
=======
import type { OpenClawConfig } from "./types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { OpenClawConfig } from "./types.js";
import { isPlainObject } from "../utils.js";
import { parseConfigPath, setConfigValueAtPath, unsetConfigValueAtPath } from "./config-paths.js";
>>>>>>> ed11e93cf (chore(format))

type OverrideTree = Record<string, unknown>;

let overrides: OverrideTree = {};

function mergeOverrides(base: unknown, override: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override;
  }
  const next: OverrideTree = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }
    next[key] = mergeOverrides((base as OverrideTree)[key], value);
  }
  return next;
}

export function getConfigOverrides(): OverrideTree {
  return overrides;
}

export function resetConfigOverrides(): void {
  overrides = {};
}

export function setConfigOverride(
  pathRaw: string,
  value: unknown,
): {
  ok: boolean;
  error?: string;
} {
  const parsed = parseConfigPath(pathRaw);
  if (!parsed.ok || !parsed.path) {
    return { ok: false, error: parsed.error ?? "Invalid path." };
  }
  setConfigValueAtPath(overrides, parsed.path, value);
  return { ok: true };
}

export function unsetConfigOverride(pathRaw: string): {
  ok: boolean;
  removed: boolean;
  error?: string;
} {
  const parsed = parseConfigPath(pathRaw);
  if (!parsed.ok || !parsed.path) {
    return {
      ok: false,
      removed: false,
      error: parsed.error ?? "Invalid path.",
    };
  }
  const removed = unsetConfigValueAtPath(overrides, parsed.path);
  return { ok: true, removed };
}

<<<<<<< HEAD
export function applyConfigOverrides(cfg: MoltbotConfig): MoltbotConfig {
  if (!overrides || Object.keys(overrides).length === 0) return cfg;
  return mergeOverrides(cfg, overrides) as MoltbotConfig;
=======
export function applyConfigOverrides(cfg: OpenClawConfig): OpenClawConfig {
  if (!overrides || Object.keys(overrides).length === 0) {
    return cfg;
  }
  return mergeOverrides(cfg, overrides) as OpenClawConfig;
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
}
