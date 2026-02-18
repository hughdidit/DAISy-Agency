import fs from "node:fs";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { MoltbotConfig } from "./types.js";
=======
import type { OpenClawConfig } from "./types.js";
import { expandHomePrefix, resolveRequiredHomeDir } from "../infra/home-dir.js";
>>>>>>> db137dd65 (fix(paths): respect OPENCLAW_HOME for all internal path resolution (#12091))
=======
import { expandHomePrefix, resolveRequiredHomeDir } from "../infra/home-dir.js";
import type { OpenClawConfig } from "./types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { OpenClawConfig } from "./types.js";
import { expandHomePrefix, resolveRequiredHomeDir } from "../infra/home-dir.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { expandHomePrefix, resolveRequiredHomeDir } from "../infra/home-dir.js";
import type { OpenClawConfig } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { OpenClawConfig } from "./types.js";
import { expandHomePrefix, resolveRequiredHomeDir } from "../infra/home-dir.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)

/**
 * Nix mode detection: When CLAWDBOT_NIX_MODE=1, the gateway is running under Nix.
 * In this mode:
 * - No auto-install flows should be attempted
 * - Missing dependencies should produce actionable Nix-specific error messages
 * - Config is managed externally (read-only from Nix perspective)
 */
export function resolveIsNixMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CLAWDBOT_NIX_MODE === "1";
}

export const isNixMode = resolveIsNixMode();

<<<<<<< HEAD
const LEGACY_STATE_DIRNAME = ".clawdbot";
const NEW_STATE_DIRNAME = ".moltbot";
const CONFIG_FILENAME = "moltbot.json";
const LEGACY_CONFIG_FILENAME = "clawdbot.json";
=======
const LEGACY_STATE_DIRNAMES = [".clawdbot", ".moldbot"] as const;
const NEW_STATE_DIRNAME = ".openclaw";
const CONFIG_FILENAME = "openclaw.json";
const LEGACY_CONFIG_FILENAMES = ["clawdbot.json", "moldbot.json"] as const;
>>>>>>> 3b56a6252 (chore!: remove moltbot legacy state/config support)

<<<<<<< HEAD
function legacyStateDir(homedir: () => string = os.homedir): string {
  return path.join(homedir(), LEGACY_STATE_DIRNAME);
=======
function resolveDefaultHomeDir(): string {
  return resolveRequiredHomeDir(process.env, os.homedir);
}

/** Build a homedir thunk that respects OPENCLAW_HOME for the given env. */
function envHomedir(env: NodeJS.ProcessEnv): () => string {
  return () => resolveRequiredHomeDir(env, os.homedir);
}

function legacyStateDirs(homedir: () => string = resolveDefaultHomeDir): string[] {
  return LEGACY_STATE_DIRNAMES.map((dir) => path.join(homedir(), dir));
>>>>>>> db137dd65 (fix(paths): respect OPENCLAW_HOME for all internal path resolution (#12091))
}

function newStateDir(homedir: () => string = resolveDefaultHomeDir): string {
  return path.join(homedir(), NEW_STATE_DIRNAME);
}

<<<<<<< HEAD
export function resolveLegacyStateDir(homedir: () => string = os.homedir): string {
  return legacyStateDir(homedir);
=======
export function resolveLegacyStateDir(homedir: () => string = resolveDefaultHomeDir): string {
  return legacyStateDirs(homedir)[0] ?? newStateDir(homedir);
}

export function resolveLegacyStateDirs(homedir: () => string = resolveDefaultHomeDir): string[] {
  return legacyStateDirs(homedir);
>>>>>>> db137dd65 (fix(paths): respect OPENCLAW_HOME for all internal path resolution (#12091))
}

export function resolveNewStateDir(homedir: () => string = resolveDefaultHomeDir): string {
  return newStateDir(homedir);
}

/**
 * State directory for mutable data (sessions, logs, caches).
 * Can be overridden via MOLTBOT_STATE_DIR (preferred) or CLAWDBOT_STATE_DIR (legacy).
 * Default: ~/.clawdbot (legacy default for compatibility)
 * If ~/.moltbot exists and ~/.clawdbot does not, prefer ~/.moltbot.
 */
export function resolveStateDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = envHomedir(env),
): string {
<<<<<<< HEAD
<<<<<<< HEAD
  const override = env.MOLTBOT_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
  if (override) return resolveUserPath(override);
  const legacyDir = legacyStateDir(homedir);
=======
=======
  const effectiveHomedir = () => resolveRequiredHomeDir(env, homedir);
>>>>>>> db137dd65 (fix(paths): respect OPENCLAW_HOME for all internal path resolution (#12091))
  const override = env.OPENCLAW_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
  if (override) {
    return resolveUserPath(override, env, effectiveHomedir);
  }
<<<<<<< HEAD
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
  const newDir = newStateDir(homedir);
  const hasLegacy = fs.existsSync(legacyDir);
=======
  const newDir = newStateDir(effectiveHomedir);
  const legacyDirs = legacyStateDirs(effectiveHomedir);
>>>>>>> db137dd65 (fix(paths): respect OPENCLAW_HOME for all internal path resolution (#12091))
  const hasNew = fs.existsSync(newDir);
<<<<<<< HEAD
  if (!hasLegacy && hasNew) return newDir;
  return legacyDir;
=======
  if (hasNew) {
    return newDir;
  }
  const existingLegacy = legacyDirs.find((dir) => {
    try {
      return fs.existsSync(dir);
    } catch {
      return false;
    }
  });
  if (existingLegacy) {
    return existingLegacy;
  }
  return newDir;
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
}

function resolveUserPath(
  input: string,
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = envHomedir(env),
): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("~")) {
    const expanded = expandHomePrefix(trimmed, {
      home: resolveRequiredHomeDir(env, homedir),
      env,
      homedir,
    });
    return path.resolve(expanded);
  }
  return path.resolve(trimmed);
}

export const STATE_DIR = resolveStateDir();

/**
 * Config file path (JSON5).
 * Can be overridden via MOLTBOT_CONFIG_PATH (preferred) or CLAWDBOT_CONFIG_PATH (legacy).
 * Default: ~/.clawdbot/moltbot.json (or $*_STATE_DIR/moltbot.json)
 */
export function resolveCanonicalConfigPath(
  env: NodeJS.ProcessEnv = process.env,
  stateDir: string = resolveStateDir(env, envHomedir(env)),
): string {
<<<<<<< HEAD
  const override = env.MOLTBOT_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim();
  if (override) return resolveUserPath(override);
=======
  const override = env.OPENCLAW_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim();
  if (override) {
    return resolveUserPath(override, env, envHomedir(env));
  }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
  return path.join(stateDir, CONFIG_FILENAME);
}

/**
 * Resolve the active config path by preferring existing config candidates
 * (new/legacy filenames) before falling back to the canonical path.
 */
export function resolveConfigPathCandidate(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = envHomedir(env),
): string {
  const candidates = resolveDefaultConfigCandidates(env, homedir);
  const existing = candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });
  if (existing) {
    return existing;
  }
  return resolveCanonicalConfigPath(env, resolveStateDir(env, homedir));
}

/**
 * Active config path (prefers existing legacy/new config files).
 */
export function resolveConfigPath(
  env: NodeJS.ProcessEnv = process.env,
  stateDir: string = resolveStateDir(env, envHomedir(env)),
  homedir: () => string = envHomedir(env),
): string {
<<<<<<< HEAD
  const override = env.MOLTBOT_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim();
  if (override) return resolveUserPath(override);
  const stateOverride = env.MOLTBOT_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
=======
  const override = env.OPENCLAW_CONFIG_PATH?.trim();
  if (override) {
    return resolveUserPath(override, env, homedir);
  }
  const stateOverride = env.OPENCLAW_STATE_DIR?.trim();
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
  const candidates = [
    path.join(stateDir, CONFIG_FILENAME),
    path.join(stateDir, LEGACY_CONFIG_FILENAME),
  ];
  const existing = candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });
  if (existing) {
    return existing;
  }
  if (stateOverride) {
    return path.join(stateDir, CONFIG_FILENAME);
  }
  const defaultStateDir = resolveStateDir(env, homedir);
  if (path.resolve(stateDir) === path.resolve(defaultStateDir)) {
    return resolveConfigPathCandidate(env, homedir);
  }
  return path.join(stateDir, CONFIG_FILENAME);
}

export const CONFIG_PATH = resolveConfigPathCandidate();

/**
<<<<<<< HEAD
 * Resolve default config path candidates across new + legacy locations.
 * Order: explicit config path → state-dir-derived paths → new default → legacy default.
=======
 * Resolve default config path candidates across default locations.
 * Order: explicit config path → state-dir-derived paths → new default.
>>>>>>> 7b172d61c (Revert "fix: respect OPENCLAW_HOME for isolated gateway instances")
 */
export function resolveDefaultConfigCandidates(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = envHomedir(env),
): string[] {
<<<<<<< HEAD
<<<<<<< HEAD
  const explicit = env.MOLTBOT_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim();
  if (explicit) return [resolveUserPath(explicit)];
=======
=======
  const effectiveHomedir = () => resolveRequiredHomeDir(env, homedir);
>>>>>>> db137dd65 (fix(paths): respect OPENCLAW_HOME for all internal path resolution (#12091))
  const explicit = env.OPENCLAW_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim();
  if (explicit) {
    return [resolveUserPath(explicit, env, effectiveHomedir)];
  }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)

  const candidates: string[] = [];
<<<<<<< HEAD
  const moltbotStateDir = env.MOLTBOT_STATE_DIR?.trim();
  if (moltbotStateDir) {
    candidates.push(path.join(resolveUserPath(moltbotStateDir), CONFIG_FILENAME));
    candidates.push(path.join(resolveUserPath(moltbotStateDir), LEGACY_CONFIG_FILENAME));
  }
  const legacyStateDirOverride = env.CLAWDBOT_STATE_DIR?.trim();
  if (legacyStateDirOverride) {
    candidates.push(path.join(resolveUserPath(legacyStateDirOverride), CONFIG_FILENAME));
    candidates.push(path.join(resolveUserPath(legacyStateDirOverride), LEGACY_CONFIG_FILENAME));
  }

  candidates.push(path.join(newStateDir(homedir), CONFIG_FILENAME));
  candidates.push(path.join(newStateDir(homedir), LEGACY_CONFIG_FILENAME));
  candidates.push(path.join(legacyStateDir(homedir), CONFIG_FILENAME));
  candidates.push(path.join(legacyStateDir(homedir), LEGACY_CONFIG_FILENAME));
=======
  const openclawStateDir = env.OPENCLAW_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
  if (openclawStateDir) {
    const resolved = resolveUserPath(openclawStateDir, env, effectiveHomedir);
    candidates.push(path.join(resolved, CONFIG_FILENAME));
    candidates.push(...LEGACY_CONFIG_FILENAMES.map((name) => path.join(resolved, name)));
  }

  const defaultDirs = [newStateDir(effectiveHomedir), ...legacyStateDirs(effectiveHomedir)];
  for (const dir of defaultDirs) {
    candidates.push(path.join(dir, CONFIG_FILENAME));
    candidates.push(...LEGACY_CONFIG_FILENAMES.map((name) => path.join(dir, name)));
  }
>>>>>>> db137dd65 (fix(paths): respect OPENCLAW_HOME for all internal path resolution (#12091))
  return candidates;
}

export const DEFAULT_GATEWAY_PORT = 18789;

/**
 * Gateway lock directory (ephemeral).
 * Default: os.tmpdir()/moltbot-<uid> (uid suffix when available).
 */
export function resolveGatewayLockDir(tmpdir: () => string = os.tmpdir): string {
  const base = tmpdir();
  const uid = typeof process.getuid === "function" ? process.getuid() : undefined;
  const suffix = uid != null ? `moltbot-${uid}` : "moltbot";
  return path.join(base, suffix);
}

const OAUTH_FILENAME = "oauth.json";

/**
 * OAuth credentials storage directory.
 *
 * Precedence:
 * - `CLAWDBOT_OAUTH_DIR` (explicit override)
 * - `$*_STATE_DIR/credentials` (canonical server/default)
 * - `~/.clawdbot/credentials` (legacy default)
 */
export function resolveOAuthDir(
  env: NodeJS.ProcessEnv = process.env,
  stateDir: string = resolveStateDir(env, envHomedir(env)),
): string {
<<<<<<< HEAD
  const override = env.CLAWDBOT_OAUTH_DIR?.trim();
  if (override) return resolveUserPath(override);
=======
  const override = env.OPENCLAW_OAUTH_DIR?.trim();
  if (override) {
    return resolveUserPath(override, env, envHomedir(env));
  }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
  return path.join(stateDir, "credentials");
}

export function resolveOAuthPath(
  env: NodeJS.ProcessEnv = process.env,
  stateDir: string = resolveStateDir(env, envHomedir(env)),
): string {
  return path.join(resolveOAuthDir(env, stateDir), OAUTH_FILENAME);
}

export function resolveGatewayPort(
  cfg?: MoltbotConfig,
  env: NodeJS.ProcessEnv = process.env,
): number {
<<<<<<< HEAD
  const envRaw = env.CLAWDBOT_GATEWAY_PORT?.trim();
=======
  const envRaw = env.OPENCLAW_GATEWAY_PORT?.trim() || env.CLAWDBOT_GATEWAY_PORT?.trim();
>>>>>>> 7b172d61c (Revert "fix: respect OPENCLAW_HOME for isolated gateway instances")
  if (envRaw) {
    const parsed = Number.parseInt(envRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const configPort = cfg?.gateway?.port;
  if (typeof configPort === "number" && Number.isFinite(configPort)) {
    if (configPort > 0) {
      return configPort;
    }
  }
  return DEFAULT_GATEWAY_PORT;
}
