<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { OpenClawConfig } from "../config/config.js";
import type { ModelApi } from "../config/types.models.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import {
  buildCloudflareAiGatewayModelDefinition,
  resolveCloudflareAiGatewayBaseUrl,
} from "../agents/cloudflare-ai-gateway.js";
>>>>>>> 5b0851ebd (feat: add cloudflare ai gateway provider)
import { buildXiaomiProvider, XIAOMI_DEFAULT_MODEL_ID } from "../agents/models-config.providers.js";
  buildHuggingfaceModelDefinition,
  HUGGINGFACE_BASE_URL,
  HUGGINGFACE_MODEL_CATALOG,
} from "../agents/huggingface-models.js";
>>>>>>> 08b7932df (feat(agents) : Hugging Face Inference provider first-class support and Together API fix and Direct Injection Refactor Auths [AI-assisted] (#13472))
import {
<<<<<<< HEAD
<<<<<<< HEAD
  buildKimiCodingProvider,
>>>>>>> c62a6e704 (fix(models): add kimi-coding implicit provider template (openclaw#22526) thanks @lailoo)
  buildQianfanProvider,
  buildXiaomiProvider,
  QIANFAN_DEFAULT_MODEL_ID,
  XIAOMI_DEFAULT_MODEL_ID,
} from "../agents/models-config.providers.js";
>>>>>>> 30ac80b96 (Add baidu qianfan model provider)
=======
  buildCloudflareAiGatewayModelDefinition,
  resolveCloudflareAiGatewayBaseUrl,
} from "../agents/cloudflare-ai-gateway.js";
import {
  buildXiaomiProvider,
  buildQianfanProvider,
  XIAOMI_DEFAULT_MODEL_ID,
} from "../agents/models-config.providers.js";
>>>>>>> c8e67ad5d (Fix import error)
import {
  buildSyntheticModelDefinition,
  SYNTHETIC_BASE_URL,
  SYNTHETIC_DEFAULT_MODEL_REF,
  SYNTHETIC_MODEL_CATALOG,
} from "../agents/synthetic-models.js";
import {
  buildTogetherModelDefinition,
  TOGETHER_BASE_URL,
  TOGETHER_MODEL_CATALOG,
} from "../agents/together-models.js";
import {
  buildVeniceModelDefinition,
  VENICE_BASE_URL,
  VENICE_DEFAULT_MODEL_REF,
  VENICE_MODEL_CATALOG,
} from "../agents/venice-models.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { OpenClawConfig } from "../config/config.js";
import type { ModelApi } from "../config/types.models.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { OpenClawConfig } from "../config/config.js";
import type { ModelApi } from "../config/types.models.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
=======
import { KILOCODE_BASE_URL } from "../providers/kilocode-shared.js";
>>>>>>> e6484cb65 (refactor: harden kilocode auth ordering and dedupe provider wiring)
import {
  HUGGINGFACE_DEFAULT_MODEL_REF,
  KILOCODE_DEFAULT_MODEL_REF,
  MISTRAL_DEFAULT_MODEL_REF,
  OPENROUTER_DEFAULT_MODEL_REF,
  TOGETHER_DEFAULT_MODEL_REF,
  XIAOMI_DEFAULT_MODEL_REF,
  ZAI_DEFAULT_MODEL_REF,
  XAI_DEFAULT_MODEL_REF,
} from "./onboard-auth.credentials.js";
export {
  applyCloudflareAiGatewayConfig,
  applyCloudflareAiGatewayProviderConfig,
  applyVercelAiGatewayConfig,
  applyVercelAiGatewayProviderConfig,
} from "./onboard-auth.config-gateways.js";
export {
  applyLitellmConfig,
  applyLitellmProviderConfig,
  LITELLM_BASE_URL,
  LITELLM_DEFAULT_MODEL_ID,
} from "./onboard-auth.config-litellm.js";
import {
  applyAgentDefaultModelPrimary,
  applyOnboardAuthAgentModelsAndProviders,
  applyProviderConfigWithDefaultModel,
  applyProviderConfigWithDefaultModels,
  applyProviderConfigWithModelCatalog,
} from "./onboard-auth.config-shared.js";
import {
  buildMistralModelDefinition,
  buildZaiModelDefinition,
  buildMoonshotModelDefinition,
<<<<<<< HEAD
  QIANFAN_BASE_URL,
  QIANFAN_DEFAULT_MODEL_REF,
  QIANFAN_DEFAULT_MODEL_ID,
=======
  KIMI_CODING_MODEL_ID,
>>>>>>> c62a6e704 (fix(models): add kimi-coding implicit provider template (openclaw#22526) thanks @lailoo)
  KIMI_CODING_MODEL_REF,
  MOONSHOT_BASE_URL,
  MOONSHOT_CN_BASE_URL,
  MOONSHOT_DEFAULT_MODEL_ID,
  MOONSHOT_DEFAULT_MODEL_REF,
  ZAI_DEFAULT_MODEL_ID,
  resolveZaiBaseUrl,
  XAI_BASE_URL,
  XAI_DEFAULT_MODEL_ID,
} from "./onboard-auth.models.js";

export function applyZaiConfig(cfg: MoltbotConfig): MoltbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[modelRef] = {
    ...models[modelRef],
    alias: models[modelRef]?.alias ?? "GLM",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.zai;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];

  const defaultModels = [
    buildZaiModelDefinition({ id: "glm-5" }),
    buildZaiModelDefinition({ id: "glm-4.7" }),
    buildZaiModelDefinition({ id: "glm-4.7-flash" }),
    buildZaiModelDefinition({ id: "glm-4.7-flashx" }),
  ];

  const mergedModels = [...existingModels];
  const seen = new Set(existingModels.map((m) => m.id));
  for (const model of defaultModels) {
    if (!seen.has(model.id)) {
      mergedModels.push(model);
      seen.add(model.id);
    }
  }

  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<
    string,
    unknown
  > as { apiKey?: string };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();

  const baseUrl = params?.endpoint
    ? resolveZaiBaseUrl(params.endpoint)
    : (typeof existingProvider?.baseUrl === "string" ? existingProvider.baseUrl : "") ||
      resolveZaiBaseUrl();

  providers.zai = {
    ...existingProviderRest,
    baseUrl,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : defaultModels,
  };

  return applyOnboardAuthAgentModelsAndProviders(cfg, { agentModels: models, providers });
}

export function applyZaiConfig(
  cfg: OpenClawConfig,
  params?: { endpoint?: string; modelId?: string },
): OpenClawConfig {
  const modelId = params?.modelId?.trim() || ZAI_DEFAULT_MODEL_ID;
  const modelRef = modelId === ZAI_DEFAULT_MODEL_ID ? ZAI_DEFAULT_MODEL_REF : `zai/${modelId}`;
  const next = applyZaiProviderConfig(cfg, params);
  return applyAgentDefaultModelPrimary(next, modelRef);
}

export function applyOpenrouterProviderConfig(cfg: MoltbotConfig): MoltbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[OPENROUTER_DEFAULT_MODEL_REF] = {
    ...models[OPENROUTER_DEFAULT_MODEL_REF],
    alias: models[OPENROUTER_DEFAULT_MODEL_REF]?.alias ?? "OpenRouter",
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
  };
}

export function applyVercelAiGatewayProviderConfig(cfg: MoltbotConfig): MoltbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF] = {
    ...models[VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF],
    alias: models[VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF]?.alias ?? "Vercel AI Gateway",
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
  };
}

<<<<<<< HEAD
export function applyVercelAiGatewayConfig(cfg: MoltbotConfig): MoltbotConfig {
  const next = applyVercelAiGatewayProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyOpenrouterConfig(cfg: MoltbotConfig): MoltbotConfig {
export function applyOpenrouterConfig(cfg: OpenClawConfig): OpenClawConfig {
>>>>>>> 5b0851ebd (feat: add cloudflare ai gateway provider)
  const next = applyOpenrouterProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, OPENROUTER_DEFAULT_MODEL_REF);
}

<<<<<<< HEAD
<<<<<<< HEAD
export function applyMoonshotProviderConfig(cfg: MoltbotConfig): MoltbotConfig {
=======
>>>>>>> 08b7932df (feat(agents) : Hugging Face Inference provider first-class support and Together API fix and Direct Injection Refactor Auths [AI-assisted] (#13472))
export function applyMoonshotProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  return applyMoonshotProviderConfigWithBaseUrl(cfg, MOONSHOT_BASE_URL);
}

function applyMoonshotProviderConfigWithBaseUrl(
  cfg: OpenClawConfig,
  baseUrl: string,
): OpenClawConfig {
>>>>>>> 1c6b25ddb (feat: add support for Moonshot API key for China endpoint)
  const models = { ...cfg.agents?.defaults?.models };
  models[MOONSHOT_DEFAULT_MODEL_REF] = {
    ...models[MOONSHOT_DEFAULT_MODEL_REF],
    alias: models[MOONSHOT_DEFAULT_MODEL_REF]?.alias ?? "Kimi",
  };

  const defaultModel = buildMoonshotModelDefinition();

  return applyProviderConfigWithDefaultModel(cfg, {
    agentModels: models,
    providerId: "moonshot",
    api: "openai-completions",
    baseUrl,
    defaultModel,
    defaultModelId: MOONSHOT_DEFAULT_MODEL_ID,
  });
}

export function applyMoonshotConfig(cfg: MoltbotConfig): MoltbotConfig {
  const next = applyMoonshotProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, MOONSHOT_DEFAULT_MODEL_REF);
}

export function applyKimiCodeProviderConfig(cfg: MoltbotConfig): MoltbotConfig {
}

export function applyKimiCodeProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
>>>>>>> 1c6b25ddb (feat: add support for Moonshot API key for China endpoint)
  const models = { ...cfg.agents?.defaults?.models };
  models[KIMI_CODING_MODEL_REF] = {
    ...models[KIMI_CODING_MODEL_REF],
    alias: models[KIMI_CODING_MODEL_REF]?.alias ?? "Kimi for Coding",
  };

  const defaultModel = buildKimiCodingProvider().models[0];

  return applyProviderConfigWithDefaultModel(cfg, {
    agentModels: models,
    providerId: "kimi-coding",
    api: "anthropic-messages",
    baseUrl: "https://api.kimi.com/coding/",
    defaultModel,
    defaultModelId: KIMI_CODING_MODEL_ID,
  });
}

export function applyKimiCodeConfig(cfg: MoltbotConfig): MoltbotConfig {
  const next = applyKimiCodeProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, KIMI_CODING_MODEL_REF);
}

export function applySyntheticProviderConfig(cfg: MoltbotConfig): MoltbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[SYNTHETIC_DEFAULT_MODEL_REF] = {
    ...models[SYNTHETIC_DEFAULT_MODEL_REF],
    alias: models[SYNTHETIC_DEFAULT_MODEL_REF]?.alias ?? "MiniMax M2.1",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.synthetic;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const syntheticModels = SYNTHETIC_MODEL_CATALOG.map(buildSyntheticModelDefinition);
  const mergedModels = [
    ...existingModels,
    ...syntheticModels.filter(
      (model) => !existingModels.some((existing) => existing.id === model.id),
    ),
  ];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<
    string,
    unknown
  > as { apiKey?: string };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.synthetic = {
    ...existingProviderRest,
    baseUrl: SYNTHETIC_BASE_URL,
    api: "anthropic-messages",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : syntheticModels,
  };

  return applyOnboardAuthAgentModelsAndProviders(cfg, { agentModels: models, providers });
}

export function applySyntheticConfig(cfg: MoltbotConfig): MoltbotConfig {
  const next = applySyntheticProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, SYNTHETIC_DEFAULT_MODEL_REF);
}

export function applyXiaomiProviderConfig(cfg: MoltbotConfig): MoltbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[XIAOMI_DEFAULT_MODEL_REF] = {
    ...models[XIAOMI_DEFAULT_MODEL_REF],
    alias: models[XIAOMI_DEFAULT_MODEL_REF]?.alias ?? "Xiaomi",
  };
  const defaultProvider = buildXiaomiProvider();
  const resolvedApi = defaultProvider.api ?? "openai-completions";
  return applyProviderConfigWithDefaultModels(cfg, {
    agentModels: models,
    providerId: "xiaomi",
    api: resolvedApi,
    baseUrl: defaultProvider.baseUrl,
    defaultModels: defaultProvider.models ?? [],
    defaultModelId: XIAOMI_DEFAULT_MODEL_ID,
  });
}

export function applyXiaomiConfig(cfg: MoltbotConfig): MoltbotConfig {
  const next = applyXiaomiProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, XIAOMI_DEFAULT_MODEL_REF);
}

/**
 * Apply Venice provider configuration without changing the default model.
 * Registers Venice models and sets up the provider, but preserves existing model selection.
 */
export function applyVeniceProviderConfig(cfg: MoltbotConfig): MoltbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[VENICE_DEFAULT_MODEL_REF] = {
    ...models[VENICE_DEFAULT_MODEL_REF],
    alias: models[VENICE_DEFAULT_MODEL_REF]?.alias ?? "Llama 3.3 70B",
  };

  const veniceModels = VENICE_MODEL_CATALOG.map(buildVeniceModelDefinition);
  return applyProviderConfigWithModelCatalog(cfg, {
    agentModels: models,
    providerId: "venice",
    api: "openai-completions",
    baseUrl: VENICE_BASE_URL,
    catalogModels: veniceModels,
  });
}

/**
 * Apply Venice provider configuration AND set Venice as the default model.
 * Use this when Venice is the primary provider choice during onboarding.
 */
export function applyVeniceConfig(cfg: MoltbotConfig): MoltbotConfig {
  const next = applyVeniceProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, VENICE_DEFAULT_MODEL_REF);
}

/**
 * Apply Together provider configuration without changing the default model.
 * Registers Together models and sets up the provider, but preserves existing model selection.
 */
export function applyTogetherProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[TOGETHER_DEFAULT_MODEL_REF] = {
    ...models[TOGETHER_DEFAULT_MODEL_REF],
    alias: models[TOGETHER_DEFAULT_MODEL_REF]?.alias ?? "Together AI",
  };

  const togetherModels = TOGETHER_MODEL_CATALOG.map(buildTogetherModelDefinition);
  return applyProviderConfigWithModelCatalog(cfg, {
    agentModels: models,
    providerId: "together",
    api: "openai-completions",
    baseUrl: TOGETHER_BASE_URL,
    catalogModels: togetherModels,
  });
}

/**
 * Apply Together provider configuration AND set Together as the default model.
 * Use this when Together is the primary provider choice during onboarding.
 */
export function applyTogetherConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = applyTogetherProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, TOGETHER_DEFAULT_MODEL_REF);
}

/**
 * Apply Hugging Face (Inference Providers) provider configuration without changing the default model.
 */
export function applyHuggingfaceProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[HUGGINGFACE_DEFAULT_MODEL_REF] = {
    ...models[HUGGINGFACE_DEFAULT_MODEL_REF],
    alias: models[HUGGINGFACE_DEFAULT_MODEL_REF]?.alias ?? "Hugging Face",
  };

  const hfModels = HUGGINGFACE_MODEL_CATALOG.map(buildHuggingfaceModelDefinition);
  return applyProviderConfigWithModelCatalog(cfg, {
    agentModels: models,
    providerId: "huggingface",
    api: "openai-completions",
    baseUrl: HUGGINGFACE_BASE_URL,
    catalogModels: hfModels,
  });
}

/**
 * Apply Hugging Face provider configuration AND set Hugging Face as the default model.
 */
export function applyHuggingfaceConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = applyHuggingfaceProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, HUGGINGFACE_DEFAULT_MODEL_REF);
}

export function applyXaiProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[XAI_DEFAULT_MODEL_REF] = {
    ...models[XAI_DEFAULT_MODEL_REF],
    alias: models[XAI_DEFAULT_MODEL_REF]?.alias ?? "Grok",
  };

  const defaultModel = buildXaiModelDefinition();

  return applyProviderConfigWithDefaultModel(cfg, {
    agentModels: models,
    providerId: "xai",
    api: "openai-completions",
    baseUrl: XAI_BASE_URL,
    defaultModel,
    defaultModelId: XAI_DEFAULT_MODEL_ID,
  });
}

export function applyXaiConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = applyXaiProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, XAI_DEFAULT_MODEL_REF);
}

export function applyMistralProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[MISTRAL_DEFAULT_MODEL_REF] = {
    ...models[MISTRAL_DEFAULT_MODEL_REF],
    alias: models[MISTRAL_DEFAULT_MODEL_REF]?.alias ?? "Mistral",
  };

  const defaultModel = buildMistralModelDefinition();

  return applyProviderConfigWithDefaultModel(cfg, {
    agentModels: models,
    providerId: "mistral",
    api: "openai-completions",
    baseUrl: MISTRAL_BASE_URL,
    defaultModel,
    defaultModelId: MISTRAL_DEFAULT_MODEL_ID,
  });
}

export function applyMistralConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = applyMistralProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, MISTRAL_DEFAULT_MODEL_REF);
}

export { KILOCODE_BASE_URL };

/**
 * Apply Kilo Gateway provider configuration without changing the default model.
 * Registers Kilo Gateway and sets up the provider, but preserves existing model selection.
 */
export function applyKilocodeProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[KILOCODE_DEFAULT_MODEL_REF] = {
    ...models[KILOCODE_DEFAULT_MODEL_REF],
    alias: models[KILOCODE_DEFAULT_MODEL_REF]?.alias ?? "Kilo Gateway",
  };

  const kilocodeModels = buildKilocodeProvider().models ?? [];

  return applyProviderConfigWithModelCatalog(cfg, {
    agentModels: models,
    providerId: "kilocode",
    api: "openai-completions",
    baseUrl: KILOCODE_BASE_URL,
    catalogModels: kilocodeModels,
  });
}

/**
 * Apply Kilo Gateway provider configuration AND set Kilo Gateway as the default model.
 * Use this when Kilo Gateway is the primary provider choice during onboarding.
 */
export function applyKilocodeConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = applyKilocodeProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, KILOCODE_DEFAULT_MODEL_REF);
}

export function applyAuthProfileConfig(
  cfg: MoltbotConfig,
  params: {
    profileId: string;
    provider: string;
    mode: "api_key" | "oauth" | "token";
    email?: string;
    preferProfileFirst?: boolean;
  },
): MoltbotConfig {
  const profiles = {
    ...cfg.auth?.profiles,
    [params.profileId]: {
      provider: params.provider,
      mode: params.mode,
      ...(params.email ? { email: params.email } : {}),
    },
  };

  const configuredProviderProfiles = Object.entries(cfg.auth?.profiles ?? {})
    .filter(([, profile]) => profile.provider.toLowerCase() === normalizedProvider)
    .map(([profileId, profile]) => ({ profileId, mode: profile.mode }));

  // Maintain `auth.order` when it already exists. Additionally, if we detect
  // mixed auth modes for the same provider (e.g. legacy oauth + newly selected
  // api_key), create an explicit order to keep the newly selected profile first.
  const existingProviderOrder = cfg.auth?.order?.[params.provider];
  const preferProfileFirst = params.preferProfileFirst ?? true;
  const reorderedProviderOrder =
    existingProviderOrder && preferProfileFirst
      ? [
          params.profileId,
          ...existingProviderOrder.filter((profileId) => profileId !== params.profileId),
        ]
      : existingProviderOrder;
  const hasMixedConfiguredModes = configuredProviderProfiles.some(
    ({ profileId, mode }) => profileId !== params.profileId && mode !== params.mode,
  );
  const derivedProviderOrder =
    existingProviderOrder === undefined && preferProfileFirst && hasMixedConfiguredModes
      ? [
          params.profileId,
          ...configuredProviderProfiles
            .map(({ profileId }) => profileId)
            .filter((profileId) => profileId !== params.profileId),
        ]
      : undefined;
  const order =
    existingProviderOrder !== undefined
      ? {
          ...cfg.auth?.order,
          [params.provider]: reorderedProviderOrder?.includes(params.profileId)
            ? reorderedProviderOrder
            : [...(reorderedProviderOrder ?? []), params.profileId],
        }
      : derivedProviderOrder
        ? {
            ...cfg.auth?.order,
            [params.provider]: derivedProviderOrder,
          }
        : cfg.auth?.order;
  return {
    ...cfg,
    auth: {
      ...cfg.auth,
      profiles,
      ...(order ? { order } : {}),
    },
  };
}

export function applyQianfanProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[QIANFAN_DEFAULT_MODEL_REF] = {
    ...models[QIANFAN_DEFAULT_MODEL_REF],
    alias: models[QIANFAN_DEFAULT_MODEL_REF]?.alias ?? "QIANFAN",
  };
  const defaultProvider = buildQianfanProvider();
  const existingProvider = cfg.models?.providers?.qianfan as
    | {
        baseUrl?: unknown;
        api?: unknown;
      }
    | undefined;
  const existingBaseUrl =
    typeof existingProvider?.baseUrl === "string" ? existingProvider.baseUrl.trim() : "";
  const resolvedBaseUrl = existingBaseUrl || QIANFAN_BASE_URL;
  const resolvedApi =
    typeof existingProvider?.api === "string"
      ? (existingProvider.api as ModelApi)
      : "openai-completions";

  return applyProviderConfigWithDefaultModels(cfg, {
    agentModels: models,
    providerId: "qianfan",
    api: resolvedApi,
    baseUrl: resolvedBaseUrl,
    defaultModels: defaultProvider.models ?? [],
    defaultModelId: QIANFAN_DEFAULT_MODEL_ID,
  });
}

export function applyQianfanConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = applyQianfanProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, QIANFAN_DEFAULT_MODEL_REF);
}
