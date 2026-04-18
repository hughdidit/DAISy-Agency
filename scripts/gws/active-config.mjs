import fs from "node:fs";
import JSON5 from "json5";

function normalizeCandidate(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getActiveConfig(value) {
  return value;
}

export function resolveActiveConfigPath() {
  const envCandidate = normalizeCandidate(process.env.OPENCLAW_CONFIG_PATH);
  if (envCandidate) {
    if (fs.existsSync(envCandidate)) {
      return envCandidate;
    }
    throw new Error(`OPENCLAW_CONFIG_PATH points to a missing file: ${envCandidate}`);
  }

  const candidates = unique(["/home/node/.openclaw/openclaw.json"]);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`No active OpenClaw config file found. Tried: ${candidates.join(", ")}`);
}

export function loadActiveConfig() {
  const configPath = resolveActiveConfigPath();
  const rawConfig = JSON5.parse(fs.readFileSync(configPath, "utf8"));
  return {
    configPath,
    rawConfig,
    activeConfig: getActiveConfig(rawConfig),
  };
}

export function loadActiveGwsPluginConfig() {
  const { configPath, activeConfig } = loadActiveConfig();
  return {
    configPath,
    activeConfig,
    config: activeConfig?.plugins?.entries?.["gws-toolkit-phase1"]?.config ?? null,
  };
}
