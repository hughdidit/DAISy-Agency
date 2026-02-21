<<<<<<< HEAD
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Api, Model } from "@mariozechner/pi-ai";
import type { SessionManager } from "@mariozechner/pi-coding-agent";

import type { MoltbotConfig } from "../../config/config.js";
=======
import type { Api, Model } from "@mariozechner/pi-ai";
import type { ExtensionFactory, SessionManager } from "@mariozechner/pi-coding-agent";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> 1410d15c5 (fix: compaction safeguard extension not loading in production builds (openclaw#22349) thanks @Glucksberg)
import { resolveContextWindowInfo } from "../context-window-guard.js";
import { DEFAULT_CONTEXT_TOKENS } from "../defaults.js";
import { setCompactionSafeguardRuntime } from "../pi-extensions/compaction-safeguard-runtime.js";
import compactionSafeguardExtension from "../pi-extensions/compaction-safeguard.js";
import contextPruningExtension from "../pi-extensions/context-pruning.js";
import { setContextPruningRuntime } from "../pi-extensions/context-pruning/runtime.js";
import { computeEffectiveSettings } from "../pi-extensions/context-pruning/settings.js";
import { makeToolPrunablePredicate } from "../pi-extensions/context-pruning/tools.js";
import { ensurePiCompactionReserveTokens } from "../pi-settings.js";
import { isCacheTtlEligibleProvider, readLastCacheTtlTimestamp } from "./cache-ttl.js";

function resolveContextWindowTokens(params: {
  cfg: MoltbotConfig | undefined;
  provider: string;
  modelId: string;
  model: Model<Api> | undefined;
}): number {
  return resolveContextWindowInfo({
    cfg: params.cfg,
    provider: params.provider,
    modelId: params.modelId,
    modelContextWindow: params.model?.contextWindow,
    defaultTokens: DEFAULT_CONTEXT_TOKENS,
  }).tokens;
}

<<<<<<< HEAD
function buildContextPruningExtension(params: {
  cfg: MoltbotConfig | undefined;
=======
function buildContextPruningFactory(params: {
  cfg: OpenClawConfig | undefined;
>>>>>>> 1410d15c5 (fix: compaction safeguard extension not loading in production builds (openclaw#22349) thanks @Glucksberg)
  sessionManager: SessionManager;
  provider: string;
  modelId: string;
  model: Model<Api> | undefined;
}): ExtensionFactory | undefined {
  const raw = params.cfg?.agents?.defaults?.contextPruning;
<<<<<<< HEAD
  if (raw?.mode !== "cache-ttl") return {};
  if (!isCacheTtlEligibleProvider(params.provider, params.modelId)) return {};

  const settings = computeEffectiveSettings(raw);
  if (!settings) return {};
=======
  if (raw?.mode !== "cache-ttl") {
    return undefined;
  }
  if (!isCacheTtlEligibleProvider(params.provider, params.modelId)) {
    return undefined;
  }

  const settings = computeEffectiveSettings(raw);
  if (!settings) {
    return undefined;
  }
>>>>>>> 1410d15c5 (fix: compaction safeguard extension not loading in production builds (openclaw#22349) thanks @Glucksberg)

  setContextPruningRuntime(params.sessionManager, {
    settings,
    contextWindowTokens: resolveContextWindowTokens(params),
    isToolPrunable: makeToolPrunablePredicate(settings.tools),
    lastCacheTouchAt: readLastCacheTtlTimestamp(params.sessionManager),
  });

  return contextPruningExtension;
}

function resolveCompactionMode(cfg?: MoltbotConfig): "default" | "safeguard" {
  return cfg?.agents?.defaults?.compaction?.mode === "safeguard" ? "safeguard" : "default";
}

<<<<<<< HEAD
export function buildEmbeddedExtensionPaths(params: {
  cfg: MoltbotConfig | undefined;
=======
export function buildEmbeddedExtensionFactories(params: {
  cfg: OpenClawConfig | undefined;
>>>>>>> 1410d15c5 (fix: compaction safeguard extension not loading in production builds (openclaw#22349) thanks @Glucksberg)
  sessionManager: SessionManager;
  provider: string;
  modelId: string;
  model: Model<Api> | undefined;
}): ExtensionFactory[] {
  const factories: ExtensionFactory[] = [];
  if (resolveCompactionMode(params.cfg) === "safeguard") {
    const compactionCfg = params.cfg?.agents?.defaults?.compaction;
    const contextWindowInfo = resolveContextWindowInfo({
      cfg: params.cfg,
      provider: params.provider,
      modelId: params.modelId,
      modelContextWindow: params.model?.contextWindow,
      defaultTokens: DEFAULT_CONTEXT_TOKENS,
    });
    setCompactionSafeguardRuntime(params.sessionManager, {
      maxHistoryShare: compactionCfg?.maxHistoryShare,
      contextWindowTokens: contextWindowInfo.tokens,
    });
    factories.push(compactionSafeguardExtension);
  }
  const pruningFactory = buildContextPruningFactory(params);
  if (pruningFactory) {
    factories.push(pruningFactory);
  }
  return factories;
}

export { ensurePiCompactionReserveTokens };
