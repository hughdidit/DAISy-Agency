<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
=======
import type { OpenClawConfig } from "../config/config.js";
import { ensurePluginAllowlisted } from "../config/plugins-allowlist.js";
>>>>>>> 519517915 (refactor: centralize plugin allowlist mutation)

export type PluginEnableResult = {
  config: MoltbotConfig;
  enabled: boolean;
  reason?: string;
};

<<<<<<< HEAD
function ensureAllowlisted(cfg: MoltbotConfig, pluginId: string): MoltbotConfig {
  const allow = cfg.plugins?.allow;
  if (!Array.isArray(allow) || allow.includes(pluginId)) {
    return cfg;
  }
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow: [...allow, pluginId],
    },
  };
}

export function enablePluginInConfig(cfg: MoltbotConfig, pluginId: string): PluginEnableResult {
=======
export function enablePluginInConfig(cfg: OpenClawConfig, pluginId: string): PluginEnableResult {
>>>>>>> 519517915 (refactor: centralize plugin allowlist mutation)
  if (cfg.plugins?.enabled === false) {
    return { config: cfg, enabled: false, reason: "plugins disabled" };
  }
  if (cfg.plugins?.deny?.includes(pluginId)) {
    return { config: cfg, enabled: false, reason: "blocked by denylist" };
  }

  const entries = {
    ...cfg.plugins?.entries,
    [pluginId]: {
      ...(cfg.plugins?.entries?.[pluginId] as Record<string, unknown> | undefined),
      enabled: true,
    },
  };
  let next: MoltbotConfig = {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      entries,
    },
  };
  next = ensurePluginAllowlisted(next, pluginId);
  return { config: next, enabled: true };
}
