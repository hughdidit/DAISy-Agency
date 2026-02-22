<<<<<<< HEAD
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
=======
=======
import { normalizeChatChannelId } from "../channels/registry.js";
>>>>>>> 8839162b9 (fix(config): persist built-in channel enable state in channels)
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
<<<<<<< HEAD
>>>>>>> 519517915 (refactor: centralize plugin allowlist mutation)
=======
  const builtInChannelId = normalizeChatChannelId(pluginId);
  const resolvedId = builtInChannelId ?? pluginId;
>>>>>>> 8839162b9 (fix(config): persist built-in channel enable state in channels)
  if (cfg.plugins?.enabled === false) {
    return { config: cfg, enabled: false, reason: "plugins disabled" };
  }
  if (cfg.plugins?.deny?.includes(pluginId) || cfg.plugins?.deny?.includes(resolvedId)) {
    return { config: cfg, enabled: false, reason: "blocked by denylist" };
  }
  if (builtInChannelId) {
    const channels = cfg.channels as Record<string, unknown> | undefined;
    const existing = channels?.[builtInChannelId];
    const existingRecord =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};
    return {
      config: {
        ...cfg,
        channels: {
          ...cfg.channels,
          [builtInChannelId]: {
            ...existingRecord,
            enabled: true,
          },
        },
      },
      enabled: true,
    };
  }

  const entries = {
    ...cfg.plugins?.entries,
    [resolvedId]: {
      ...(cfg.plugins?.entries?.[resolvedId] as Record<string, unknown> | undefined),
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
  next = ensurePluginAllowlisted(next, resolvedId);
  return { config: next, enabled: true };
}
