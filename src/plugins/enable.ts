<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
=======
import { normalizeChatChannelId } from "../channels/registry.js";
import type { OpenClawConfig } from "../config/config.js";
import { ensurePluginAllowlisted } from "../config/plugins-allowlist.js";
import { setPluginEnabledInConfig } from "./toggle-config.js";
>>>>>>> 87603b5c4 (fix: sync built-in channel enablement across config paths)

export type PluginEnableResult = {
  config: MoltbotConfig;
  enabled: boolean;
  reason?: string;
};

function ensureAllowlisted(cfg: MoltbotConfig, pluginId: string): MoltbotConfig {
  const allow = cfg.plugins?.allow;
  if (!Array.isArray(allow) || allow.includes(pluginId)) return cfg;
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow: [...allow, pluginId],
    },
  };
}

export function enablePluginInConfig(cfg: MoltbotConfig, pluginId: string): PluginEnableResult {
  if (cfg.plugins?.enabled === false) {
    return { config: cfg, enabled: false, reason: "plugins disabled" };
  }
  if (cfg.plugins?.deny?.includes(pluginId)) {
    return { config: cfg, enabled: false, reason: "blocked by denylist" };
  }
<<<<<<< HEAD

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
  next = ensureAllowlisted(next, pluginId);
=======
  let next = setPluginEnabledInConfig(cfg, resolvedId, true);
  next = ensurePluginAllowlisted(next, resolvedId);
>>>>>>> 87603b5c4 (fix: sync built-in channel enablement across config paths)
  return { config: next, enabled: true };
}
