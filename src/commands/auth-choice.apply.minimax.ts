import { normalizeApiKeyInput, validateApiKeyInput } from "./auth-choice.api-key.js";
import {
<<<<<<< HEAD
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "./auth-choice.api-key.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { createAuthChoiceAgentModelNoter } from "./auth-choice.apply-helpers.js";
>>>>>>> 0048af4e2 (refactor(commands): dedupe auth-choice model notes)
=======
  createAuthChoiceDefaultModelApplier,
  createAuthChoiceModelStateBridge,
  ensureApiKeyFromOptionEnvOrPrompt,
  normalizeSecretInputModeInput,
} from "./auth-choice.apply-helpers.js";
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
<<<<<<< HEAD
=======
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { applyAuthChoicePluginProvider } from "./auth-choice.apply.plugin-provider.js";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { applyDefaultModelChoice } from "./auth-choice.default-model.js";
=======
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)
import {
  applyAuthProfileConfig,
  applyMinimaxApiConfig,
  applyMinimaxApiConfigCn,
  applyMinimaxApiProviderConfig,
  applyMinimaxApiProviderConfigCn,
  applyMinimaxConfig,
  applyMinimaxProviderConfig,
  setMinimaxApiKey,
} from "./onboard-auth.js";

export async function applyAuthChoiceMiniMax(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  let nextConfig = params.config;
  let agentModelOverride: string | undefined;
  const applyProviderDefaultModel = createAuthChoiceDefaultModelApplier(
    params,
    createAuthChoiceModelStateBridge({
      getConfig: () => nextConfig,
      setConfig: (config) => (nextConfig = config),
      getAgentModelOverride: () => agentModelOverride,
      setAgentModelOverride: (model) => (agentModelOverride = model),
    }),
  );
  const requestedSecretInputMode = normalizeSecretInputModeInput(params.opts?.secretInputMode);
  const ensureMinimaxApiKey = async (opts: {
    profileId: string;
    promptMessage: string;
  }): Promise<void> => {
    await ensureApiKeyFromOptionEnvOrPrompt({
      token: params.opts?.token,
      tokenProvider: params.opts?.tokenProvider,
      secretInputMode: requestedSecretInputMode,
      expectedProviders: ["minimax", "minimax-cn"],
      provider: "minimax",
      envLabel: "MINIMAX_API_KEY",
      promptMessage: opts.promptMessage,
      normalize: normalizeApiKeyInput,
      validate: validateApiKeyInput,
      prompter: params.prompter,
      setCredential: async (apiKey, mode) =>
        setMinimaxApiKey(apiKey, params.agentDir, opts.profileId, { secretInputMode: mode }),
    });
  };
  const applyMinimaxApiVariant = async (opts: {
    profileId: string;
    provider: "minimax" | "minimax-cn";
    promptMessage: string;
    modelRefPrefix: "minimax" | "minimax-cn";
    modelId: string;
    applyDefaultConfig: (
      config: ApplyAuthChoiceParams["config"],
      modelId: string,
    ) => ApplyAuthChoiceParams["config"];
    applyProviderConfig: (
      config: ApplyAuthChoiceParams["config"],
      modelId: string,
    ) => ApplyAuthChoiceParams["config"];
  }): Promise<ApplyAuthChoiceResult> => {
    await ensureMinimaxApiKey({
      profileId: opts.profileId,
      promptMessage: opts.promptMessage,
    });
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: opts.profileId,
      provider: opts.provider,
      mode: "api_key",
    });
    const modelRef = `${opts.modelRefPrefix}/${opts.modelId}`;
    await applyProviderDefaultModel({
      defaultModel: modelRef,
      applyDefaultConfig: (config) => opts.applyDefaultConfig(config, opts.modelId),
      applyProviderConfig: (config) => opts.applyProviderConfig(config, opts.modelId),
    });
    return { config: nextConfig, agentModelOverride };
  };
<<<<<<< HEAD
<<<<<<< HEAD
  const noteAgentModel = async (model: string) => {
    if (!params.agentId) {
      return;
    }
    await params.prompter.note(
      `Default model set to ${model} for agent "${params.agentId}".`,
      "Model configured",
    );
  };
=======
  const noteAgentModel = createAuthChoiceAgentModelNoter(params);
=======
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)
  if (params.authChoice === "minimax-portal") {
    // Let user choose between Global/CN endpoints
    const endpoint = await params.prompter.select({
      message: "Select MiniMax endpoint",
      options: [
        { value: "oauth", label: "Global", hint: "OAuth for international users" },
        { value: "oauth-cn", label: "CN", hint: "OAuth for users in China" },
      ],
    });

    return await applyAuthChoicePluginProvider(params, {
      authChoice: "minimax-portal",
      pluginId: "minimax-portal-auth",
      providerId: "minimax-portal",
      methodId: endpoint,
      label: "MiniMax",
    });
  }
>>>>>>> 0048af4e2 (refactor(commands): dedupe auth-choice model notes)

  if (
    params.authChoice === "minimax-cloud" ||
    params.authChoice === "minimax-api" ||
    params.authChoice === "minimax-api-lightning"
  ) {
    return await applyMinimaxApiVariant({
      profileId: "minimax:default",
      provider: "minimax",
      promptMessage: "Enter MiniMax API key",
      modelRefPrefix: "minimax",
      modelId:
        params.authChoice === "minimax-api-lightning" ? "MiniMax-M2.5-Lightning" : "MiniMax-M2.5",
      applyDefaultConfig: applyMinimaxApiConfig,
      applyProviderConfig: applyMinimaxApiProviderConfig,
    });
  }

  if (params.authChoice === "minimax-api-key-cn") {
    return await applyMinimaxApiVariant({
      profileId: "minimax-cn:default",
      provider: "minimax-cn",
      promptMessage: "Enter MiniMax China API key",
      modelRefPrefix: "minimax-cn",
      modelId: "MiniMax-M2.5",
      applyDefaultConfig: applyMinimaxApiConfigCn,
      applyProviderConfig: applyMinimaxApiProviderConfigCn,
    });
  }

  if (params.authChoice === "minimax") {
    await applyProviderDefaultModel({
      defaultModel: "lmstudio/minimax-m2.1-gs32",
      applyDefaultConfig: applyMinimaxConfig,
      applyProviderConfig: applyMinimaxProviderConfig,
    });
    return { config: nextConfig, agentModelOverride };
  }

  return null;
}
