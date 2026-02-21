import { isDangerousHostEnvVarName, normalizeEnvVarKey } from "../infra/host-env-security.js";
import type { OpenClawConfig } from "./types.js";

function collectConfigEnvVarsByTarget(cfg?: OpenClawConfig): Record<string, string> {
  const envConfig = cfg?.env;
  if (!envConfig) return {};

  const entries: Record<string, string> = {};

  if (envConfig.vars) {
<<<<<<< HEAD
    for (const [key, value] of Object.entries(envConfig.vars)) {
<<<<<<< HEAD
      if (!value) continue;
=======
=======
    for (const [rawKey, value] of Object.entries(envConfig.vars)) {
>>>>>>> f202e7307 (refactor(security): centralize host env policy and harden env ingestion)
      if (!value) {
        continue;
      }
      const key = normalizeEnvVarKey(rawKey, { portable: true });
      if (!key) {
        continue;
      }
      if (isDangerousHostEnvVarName(key)) {
        continue;
      }
>>>>>>> 2cdbadee1 (fix(security): block startup-file env injection across host execution paths)
      entries[key] = value;
    }
  }

<<<<<<< HEAD
  for (const [key, value] of Object.entries(envConfig)) {
<<<<<<< HEAD
    if (key === "shellEnv" || key === "vars") continue;
    if (typeof value !== "string" || !value.trim()) continue;
=======
    if (key === "shellEnv" || key === "vars") {
=======
  for (const [rawKey, value] of Object.entries(envConfig)) {
    if (rawKey === "shellEnv" || rawKey === "vars") {
>>>>>>> f202e7307 (refactor(security): centralize host env policy and harden env ingestion)
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      continue;
    }
    const key = normalizeEnvVarKey(rawKey, { portable: true });
    if (!key) {
      continue;
    }
    if (isDangerousHostEnvVarName(key)) {
      continue;
    }
>>>>>>> 2cdbadee1 (fix(security): block startup-file env injection across host execution paths)
    entries[key] = value;
  }

  return entries;
}
<<<<<<< HEAD
=======

export function collectConfigRuntimeEnvVars(cfg?: OpenClawConfig): Record<string, string> {
  return collectConfigEnvVarsByTarget(cfg);
}

export function collectConfigServiceEnvVars(cfg?: OpenClawConfig): Record<string, string> {
  return collectConfigEnvVarsByTarget(cfg);
}

/** @deprecated Use `collectConfigRuntimeEnvVars` or `collectConfigServiceEnvVars`. */
export function collectConfigEnvVars(cfg?: OpenClawConfig): Record<string, string> {
  return collectConfigRuntimeEnvVars(cfg);
}

export function applyConfigEnvVars(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const entries = collectConfigRuntimeEnvVars(cfg);
  for (const [key, value] of Object.entries(entries)) {
    if (env[key]?.trim()) {
      continue;
    }
    env[key] = value;
  }
}
>>>>>>> f202e7307 (refactor(security): centralize host env policy and harden env ingestion)
