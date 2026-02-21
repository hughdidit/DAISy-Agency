import { isDangerousHostEnvVarName } from "../infra/host-env-security.js";
import type { OpenClawConfig } from "./types.js";

export function collectConfigEnvVars(cfg?: OpenClawConfig): Record<string, string> {
  const envConfig = cfg?.env;
  if (!envConfig) return {};

  const entries: Record<string, string> = {};

  if (envConfig.vars) {
    for (const [key, value] of Object.entries(envConfig.vars)) {
<<<<<<< HEAD
      if (!value) continue;
=======
      if (!value) {
        continue;
      }
      if (isDangerousHostEnvVarName(key)) {
        continue;
      }
>>>>>>> 2cdbadee1 (fix(security): block startup-file env injection across host execution paths)
      entries[key] = value;
    }
  }

  for (const [key, value] of Object.entries(envConfig)) {
<<<<<<< HEAD
    if (key === "shellEnv" || key === "vars") continue;
    if (typeof value !== "string" || !value.trim()) continue;
=======
    if (key === "shellEnv" || key === "vars") {
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
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
