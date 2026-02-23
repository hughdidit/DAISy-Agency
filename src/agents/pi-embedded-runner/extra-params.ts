import type { StreamFn } from "@mariozechner/pi-agent-core";
import type { Api, Model, SimpleStreamOptions } from "@mariozechner/pi-ai";
import { streamSimple } from "@mariozechner/pi-ai";

import type { MoltbotConfig } from "../../config/config.js";
import { log } from "./logger.js";

/**
 * Resolve provider-specific extra params from model config.
 * Used to pass through stream params like temperature/maxTokens.
 *
 * @internal Exported for testing only
 */
export function resolveExtraParams(params: {
  cfg: MoltbotConfig | undefined;
  provider: string;
  modelId: string;
}): Record<string, unknown> | undefined {
  const modelKey = `${params.provider}/${params.modelId}`;
  const modelConfig = params.cfg?.agents?.defaults?.models?.[modelKey];
  return modelConfig?.params ? { ...modelConfig.params } : undefined;
}

type CacheControlTtl = "5m" | "1h";

function resolveCacheControlTtl(
  extraParams: Record<string, unknown> | undefined,
  provider: string,
  modelId: string,
): CacheControlTtl | undefined {
  const raw = extraParams?.cacheControlTtl;
  if (raw !== "5m" && raw !== "1h") return undefined;
  if (provider === "anthropic") return raw;
  if (provider === "openrouter" && modelId.startsWith("anthropic/")) return raw;
  return undefined;
}

function createStreamFnWithExtraParams(
  baseStreamFn: StreamFn | undefined,
  extraParams: Record<string, unknown> | undefined,
  provider: string,
  modelId: string,
): StreamFn | undefined {
  if (!extraParams || Object.keys(extraParams).length === 0) {
    return undefined;
  }

  const streamParams: Partial<SimpleStreamOptions> & { cacheControlTtl?: CacheControlTtl } = {};
  if (typeof extraParams.temperature === "number") {
    streamParams.temperature = extraParams.temperature;
  }
  if (typeof extraParams.maxTokens === "number") {
    streamParams.maxTokens = extraParams.maxTokens;
  }
  const cacheControlTtl = resolveCacheControlTtl(extraParams, provider, modelId);
  if (cacheControlTtl) {
    streamParams.cacheControlTtl = cacheControlTtl;
  }

  if (Object.keys(streamParams).length === 0) {
    return undefined;
  }

  log.debug(`creating streamFn wrapper with params: ${JSON.stringify(streamParams)}`);

  const underlying = baseStreamFn ?? streamSimple;
  const wrappedStreamFn: StreamFn = (model, context, options) =>
    underlying(model as Model<Api>, context, {
      ...streamParams,
      ...options,
    });

  return wrappedStreamFn;
}

/**
<<<<<<< HEAD
=======
 * Create a streamFn wrapper that adds OpenRouter app attribution headers.
 * These headers allow OpenClaw to appear on OpenRouter's leaderboard.
 */
function createOpenRouterHeadersWrapper(baseStreamFn: StreamFn | undefined): StreamFn {
  const underlying = baseStreamFn ?? streamSimple;
  return (model, context, options) =>
    underlying(model, context, {
      ...options,
      headers: {
        ...OPENROUTER_APP_HEADERS,
        ...options?.headers,
      },
<<<<<<< HEAD
=======
      onPayload: (payload) => {
        if (thinkingLevel && payload && typeof payload === "object") {
          const payloadObj = payload as Record<string, unknown>;

          // pi-ai may inject a top-level reasoning_effort (OpenAI flat format).
          // OpenRouter expects the nested reasoning.effort format instead, and
          // rejects payloads containing both fields. Remove the flat field so
          // only the nested one is sent.
          delete payloadObj.reasoning_effort;

          // When thinking is "off", do not inject reasoning at all.
          // Some models (e.g. deepseek/deepseek-r1) require reasoning and reject
          // { effort: "none" } with "Reasoning is mandatory for this endpoint and
          // cannot be disabled." Omitting the field lets each model use its own
          // default reasoning behavior.
          if (thinkingLevel !== "off") {
            const existingReasoning = payloadObj.reasoning;

            // OpenRouter treats reasoning.effort and reasoning.max_tokens as
            // alternative controls. If max_tokens is already present, do not
            // inject effort and do not overwrite caller-supplied reasoning.
            if (
              existingReasoning &&
              typeof existingReasoning === "object" &&
              !Array.isArray(existingReasoning)
            ) {
              const reasoningObj = existingReasoning as Record<string, unknown>;
              if (!("max_tokens" in reasoningObj) && !("effort" in reasoningObj)) {
                reasoningObj.effort = mapThinkingLevelToOpenRouterReasoningEffort(thinkingLevel);
              }
            } else if (!existingReasoning) {
              payloadObj.reasoning = {
                effort: mapThinkingLevelToOpenRouterReasoningEffort(thinkingLevel),
              };
            }
          }
        }
        onPayload?.(payload);
      },
>>>>>>> 3e974dc93 (fix: don't inject reasoning: { effort: "none" } for OpenRouter when thinking is off)
    });
}

/**
>>>>>>> 083ec9325 (fix: cover OpenRouter attribution headers)
 * Apply extra params (like temperature) to an agent's streamFn.
 *
 * @internal Exported for testing
 */
export function applyExtraParamsToAgent(
  agent: { streamFn?: StreamFn },
  cfg: MoltbotConfig | undefined,
  provider: string,
  modelId: string,
  extraParamsOverride?: Record<string, unknown>,
): void {
  const extraParams = resolveExtraParams({
    cfg,
    provider,
    modelId,
  });
  const override =
    extraParamsOverride && Object.keys(extraParamsOverride).length > 0
      ? Object.fromEntries(
          Object.entries(extraParamsOverride).filter(([, value]) => value !== undefined),
        )
      : undefined;
  const merged = Object.assign({}, extraParams, override);
  const wrappedStreamFn = createStreamFnWithExtraParams(agent.streamFn, merged, provider, modelId);

  if (wrappedStreamFn) {
    log.debug(`applying extraParams to agent streamFn for ${provider}/${modelId}`);
    agent.streamFn = wrappedStreamFn;
  }
}
