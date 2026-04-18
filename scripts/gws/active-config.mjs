import fs from "node:fs";
import JSON5 from "json5";

function normalizeCandidate(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getActiveConfig(value) {
  if (value?.resolved && typeof value.resolved === "object") {
    return value.resolved;
  }
  if (value?.config && typeof value.config === "object") {
    return value.config;
  }
  return value;
}

export function resolveActiveConfigPath() {
  const candidates = unique([
    normalizeCandidate(process.env.OPENCLAW_CONFIG_PATH),
    "/home/node/.openclaw/openclaw.json",
  ]);

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
