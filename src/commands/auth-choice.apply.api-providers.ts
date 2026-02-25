import { ensureAuthProfileStore, resolveAuthProfileOrder } from "../agents/auth-profiles.js";
import type { SecretInput } from "../config/types.secrets.js";
import { normalizeApiKeyInput, validateApiKeyInput } from "./auth-choice.api-key.js";
import {
  normalizeSecretInputModeInput,
  createAuthChoiceAgentModelNoter,
  createAuthChoiceDefaultModelApplier,
  createAuthChoiceModelStateBridge,
  ensureApiKeyFromOptionEnvOrPrompt,
  normalizeTokenProviderInput,
} from "./auth-choice.apply-helpers.js";
import { applyAuthChoiceHuggingface } from "./auth-choice.apply.huggingface.js";
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { applyAuthChoiceOpenRouter } from "./auth-choice.apply.openrouter.js";
import {
  applyGoogleGeminiModelDefault,
  GOOGLE_GEMINI_DEFAULT_MODEL,
} from "./google-gemini-model-default.js";
import type { ApiKeyStorageOptions } from "./onboard-auth.credentials.js";
import {
  applyAuthProfileConfig,
  applyCloudflareAiGatewayConfig,
  applyCloudflareAiGatewayProviderConfig,
  applyKilocodeConfig,
  applyKilocodeProviderConfig,
  applyQianfanConfig,
  applyQianfanProviderConfig,
  applyKimiCodeConfig,
  applyKimiCodeProviderConfig,
  applyLitellmConfig,
  applyLitellmProviderConfig,
  applyMistralConfig,
  applyMistralProviderConfig,
  applyMoonshotConfig,
  applyMoonshotConfigCn,
  applyMoonshotProviderConfig,
  applyMoonshotProviderConfigCn,
  applyOpencodeZenConfig,
  applyOpencodeZenProviderConfig,
  applySyntheticConfig,
  applySyntheticProviderConfig,
  applyTogetherConfig,
  applyTogetherProviderConfig,
  applyVeniceConfig,
  applyVeniceProviderConfig,
  applyVercelAiGatewayConfig,
  applyVercelAiGatewayProviderConfig,
  applyXiaomiConfig,
  applyXiaomiProviderConfig,
  applyZaiConfig,
  applyZaiProviderConfig,
  CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF,
  KILOCODE_DEFAULT_MODEL_REF,
  LITELLM_DEFAULT_MODEL_REF,
  QIANFAN_DEFAULT_MODEL_REF,
  KIMI_CODING_MODEL_REF,
  MOONSHOT_DEFAULT_MODEL_REF,
  MISTRAL_DEFAULT_MODEL_REF,
  SYNTHETIC_DEFAULT_MODEL_REF,
  TOGETHER_DEFAULT_MODEL_REF,
  VENICE_DEFAULT_MODEL_REF,
  VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF,
  XIAOMI_DEFAULT_MODEL_REF,
  setCloudflareAiGatewayConfig,
  setQianfanApiKey,
  setGeminiApiKey,
  setKilocodeApiKey,
  setLitellmApiKey,
  setKimiCodingApiKey,
  setMistralApiKey,
  setMoonshotApiKey,
  setOpencodeZenApiKey,
  setSyntheticApiKey,
  setTogetherApiKey,
  setVeniceApiKey,
  setVercelAiGatewayApiKey,
  setXiaomiApiKey,
  setZaiApiKey,
  ZAI_DEFAULT_MODEL_REF,
} from "./onboard-auth.js";
import type { AuthChoice, SecretInputMode } from "./onboard-types.js";
import { OPENCODE_ZEN_DEFAULT_MODEL } from "./opencode-zen-model-default.js";
import { detectZaiEndpoint } from "./zai-endpoint-detect.js";

const API_KEY_TOKEN_PROVIDER_AUTH_CHOICE: Record<string, AuthChoice> = {
  openrouter: "openrouter-api-key",
  litellm: "litellm-api-key",
  "vercel-ai-gateway": "ai-gateway-api-key",
  "cloudflare-ai-gateway": "cloudflare-ai-gateway-api-key",
  moonshot: "moonshot-api-key",
  "kimi-code": "kimi-code-api-key",
  "kimi-coding": "kimi-code-api-key",
  google: "gemini-api-key",
  zai: "zai-api-key",
  xiaomi: "xiaomi-api-key",
  synthetic: "synthetic-api-key",
  venice: "venice-api-key",
  together: "together-api-key",
  huggingface: "huggingface-api-key",
  mistral: "mistral-api-key",
  opencode: "opencode-zen",
  kilocode: "kilocode-api-key",
  qianfan: "qianfan-api-key",
};

const ZAI_AUTH_CHOICE_ENDPOINT: Partial<
  Record<AuthChoice, "global" | "cn" | "coding-global" | "coding-cn">
> = {
  "zai-coding-global": "coding-global",
  "zai-coding-cn": "coding-cn",
  "zai-global": "global",
  "zai-cn": "cn",
};

type ApiKeyProviderConfigApplier = (
  config: ApplyAuthChoiceParams["config"],
) => ApplyAuthChoiceParams["config"];

type SimpleApiKeyProviderFlow = {
  provider: Parameters<typeof ensureApiKeyFromOptionEnvOrPrompt>[0]["provider"];
  profileId: string;
  expectedProviders: string[];
  envLabel: string;
  promptMessage: string;
  setCredential: (
    apiKey: SecretInput,
    agentDir?: string,
    options?: ApiKeyStorageOptions,
  ) => void | Promise<void>;
  defaultModel: string;
  applyDefaultConfig: ApiKeyProviderConfigApplier;
  applyProviderConfig: ApiKeyProviderConfigApplier;
  tokenProvider?: string;
  normalize?: (value: string) => string;
  validate?: (value: string) => string | undefined;
  noteDefault?: string;
  noteMessage?: string;
  noteTitle?: string;
};

const SIMPLE_API_KEY_PROVIDER_FLOWS: Partial<Record<AuthChoice, SimpleApiKeyProviderFlow>> = {
  "ai-gateway-api-key": {
    provider: "vercel-ai-gateway",
    profileId: "vercel-ai-gateway:default",
    expectedProviders: ["vercel-ai-gateway"],
    envLabel: "AI_GATEWAY_API_KEY",
    promptMessage: "Enter Vercel AI Gateway API key",
    setCredential: setVercelAiGatewayApiKey,
    defaultModel: VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF,
    applyDefaultConfig: applyVercelAiGatewayConfig,
    applyProviderConfig: applyVercelAiGatewayProviderConfig,
    noteDefault: VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF,
  },
  "moonshot-api-key": {
    provider: "moonshot",
    profileId: "moonshot:default",
    expectedProviders: ["moonshot"],
    envLabel: "MOONSHOT_API_KEY",
    promptMessage: "Enter Moonshot API key",
    setCredential: setMoonshotApiKey,
    defaultModel: MOONSHOT_DEFAULT_MODEL_REF,
    applyDefaultConfig: applyMoonshotConfig,
    applyProviderConfig: applyMoonshotProviderConfig,
  },
  "moonshot-api-key-cn": {
    provider: "moonshot",
    profileId: "moonshot:default",
    expectedProviders: ["moonshot"],
    envLabel: "MOONSHOT_API_KEY",
    promptMessage: "Enter Moonshot API key (.cn)",
    setCredential: setMoonshotApiKey,
    defaultModel: MOONSHOT_DEFAULT_MODEL_REF,
    applyDefaultConfig: applyMoonshotConfigCn,
    applyProviderConfig: applyMoonshotProviderConfigCn,
  },
  "kimi-code-api-key": {
    provider: "kimi-coding",
    profileId: "kimi-coding:default",
    expectedProviders: ["kimi-code", "kimi-coding"],
    envLabel: "KIMI_API_KEY",
    promptMessage: "Enter Kimi Coding API key",
    setCredential: setKimiCodingApiKey,
    defaultModel: KIMI_CODING_MODEL_REF,
    applyDefaultConfig: applyKimiCodeConfig,
    applyProviderConfig: applyKimiCodeProviderConfig,
    noteDefault: KIMI_CODING_MODEL_REF,
    noteMessage: [
      "Kimi Coding uses a dedicated endpoint and API key.",
      "Get your API key at: https://www.kimi.com/code/en",
    ].join("\n"),
    noteTitle: "Kimi Coding",
  },
  "xiaomi-api-key": {
    provider: "xiaomi",
    profileId: "xiaomi:default",
    expectedProviders: ["xiaomi"],
    envLabel: "XIAOMI_API_KEY",
    promptMessage: "Enter Xiaomi API key",
    setCredential: setXiaomiApiKey,
    defaultModel: XIAOMI_DEFAULT_MODEL_REF,
    applyDefaultConfig: applyXiaomiConfig,
    applyProviderConfig: applyXiaomiProviderConfig,
    noteDefault: XIAOMI_DEFAULT_MODEL_REF,
  },
  "mistral-api-key": {
    provider: "mistral",
    profileId: "mistral:default",
    expectedProviders: ["mistral"],
    envLabel: "MISTRAL_API_KEY",
    promptMessage: "Enter Mistral API key",
    setCredential: setMistralApiKey,
    defaultModel: MISTRAL_DEFAULT_MODEL_REF,
    applyDefaultConfig: applyMistralConfig,
    applyProviderConfig: applyMistralProviderConfig,
    noteDefault: MISTRAL_DEFAULT_MODEL_REF,
  },
  "venice-api-key": {
    provider: "venice",
    profileId: "venice:default",
    expectedProviders: ["venice"],
    envLabel: "VENICE_API_KEY",
    promptMessage: "Enter Venice AI API key",
    setCredential: setVeniceApiKey,
    defaultModel: VENICE_DEFAULT_MODEL_REF,
    applyDefaultConfig: applyVeniceConfig,
    applyProviderConfig: applyVeniceProviderConfig,
    noteDefault: VENICE_DEFAULT_MODEL_REF,
    noteMessage: [
      "Venice AI provides privacy-focused inference with uncensored models.",
      "Get your API key at: https://venice.ai/settings/api",
      "Supports 'private' (fully private) and 'anonymized' (proxy) modes.",
    ].join("\n"),
    noteTitle: "Venice AI",
  },
  "opencode-zen": {
    provider: "opencode",
    profileId: "opencode:default",
    expectedProviders: ["opencode"],
    envLabel: "OPENCODE_API_KEY",
    promptMessage: "Enter OpenCode Zen API key",
    setCredential: setOpencodeZenApiKey,
    defaultModel: OPENCODE_ZEN_DEFAULT_MODEL,
    applyDefaultConfig: applyOpencodeZenConfig,
    applyProviderConfig: applyOpencodeZenProviderConfig,
    noteDefault: OPENCODE_ZEN_DEFAULT_MODEL,
    noteMessage: [
      "OpenCode Zen provides access to Claude, GPT, Gemini, and more models.",
      "Get your API key at: https://opencode.ai/auth",
      "OpenCode Zen bills per request. Check your OpenCode dashboard for details.",
    ].join("\n"),
    noteTitle: "OpenCode Zen",
  },
  "together-api-key": {
    provider: "together",
    profileId: "together:default",
    expectedProviders: ["together"],
    envLabel: "TOGETHER_API_KEY",
    promptMessage: "Enter Together AI API key",
    setCredential: setTogetherApiKey,
    defaultModel: TOGETHER_DEFAULT_MODEL_REF,
    applyDefaultConfig: applyTogetherConfig,
    applyProviderConfig: applyTogetherProviderConfig,
    noteDefault: TOGETHER_DEFAULT_MODEL_REF,
    noteMessage: [
      "Together AI provides access to leading open-source models including Llama, DeepSeek, Qwen, and more.",
      "Get your API key at: https://api.together.xyz/settings/api-keys",
    ].join("\n"),
    noteTitle: "Together AI",
  },
  "qianfan-api-key": {
    provider: "qianfan",
    profileId: "qianfan:default",
    expectedProviders: ["qianfan"],
    envLabel: "QIANFAN_API_KEY",
    promptMessage: "Enter QIANFAN API key",
    setCredential: setQianfanApiKey,
    defaultModel: QIANFAN_DEFAULT_MODEL_REF,
    applyDefaultConfig: applyQianfanConfig,
    applyProviderConfig: applyQianfanProviderConfig,
    noteDefault: QIANFAN_DEFAULT_MODEL_REF,
    noteMessage: [
      "Get your API key at: https://console.bce.baidu.com/qianfan/ais/console/apiKey",
      "API key format: bce-v3/ALTAK-...",
    ].join("\n"),
    noteTitle: "QIANFAN",
  },
  "kilocode-api-key": {
    provider: "kilocode",
    profileId: "kilocode:default",
    expectedProviders: ["kilocode"],
    envLabel: "KILOCODE_API_KEY",
    promptMessage: "Enter Kilo Gateway API key",
    setCredential: setKilocodeApiKey,
    defaultModel: KILOCODE_DEFAULT_MODEL_REF,
    applyDefaultConfig: applyKilocodeConfig,
    applyProviderConfig: applyKilocodeProviderConfig,
    noteDefault: KILOCODE_DEFAULT_MODEL_REF,
  },
  "synthetic-api-key": {
    provider: "synthetic",
    profileId: "synthetic:default",
    expectedProviders: ["synthetic"],
    envLabel: "SYNTHETIC_API_KEY",
    promptMessage: "Enter Synthetic API key",
    setCredential: setSyntheticApiKey,
    defaultModel: SYNTHETIC_DEFAULT_MODEL_REF,
    applyDefaultConfig: applySyntheticConfig,
    applyProviderConfig: applySyntheticProviderConfig,
    normalize: (value) => String(value ?? "").trim(),
    validate: (value) => (String(value ?? "").trim() ? undefined : "Required"),
  },
};

export async function applyAuthChoiceApiProviders(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  let nextConfig = params.config;
  let agentModelOverride: string | undefined;
  const noteAgentModel = createAuthChoiceAgentModelNoter(params);
  const applyProviderDefaultModel = createAuthChoiceDefaultModelApplier(
    params,
    createAuthChoiceModelStateBridge({
      getConfig: () => nextConfig,
      setConfig: (config) => (nextConfig = config),
      getAgentModelOverride: () => agentModelOverride,
      setAgentModelOverride: (model) => (agentModelOverride = model),
    }),
  );

  let authChoice = params.authChoice;
  const normalizedTokenProvider = normalizeTokenProviderInput(params.opts?.tokenProvider);
  const requestedSecretInputMode = normalizeSecretInputModeInput(params.opts?.secretInputMode);
  if (authChoice === "apiKey" && params.opts?.tokenProvider) {
    if (normalizedTokenProvider !== "anthropic" && normalizedTokenProvider !== "openai") {
      authChoice = API_KEY_TOKEN_PROVIDER_AUTH_CHOICE[normalizedTokenProvider ?? ""] ?? authChoice;
    }
  }

  async function applyApiKeyProviderWithDefaultModel({
    provider,
    profileId,
    expectedProviders,
    envLabel,
    promptMessage,
    setCredential,
    defaultModel,
    applyDefaultConfig,
    applyProviderConfig,
    noteMessage,
    noteTitle,
    tokenProvider = normalizedTokenProvider,
    normalize = normalizeApiKeyInput,
    validate = validateApiKeyInput,
    noteDefault = defaultModel,
  }: {
    provider: Parameters<typeof ensureApiKeyFromOptionEnvOrPrompt>[0]["provider"];
    profileId: string;
    expectedProviders: string[];
    envLabel: string;
    promptMessage: string;
    setCredential: (apiKey: SecretInput, mode?: SecretInputMode) => void | Promise<void>;
    defaultModel: string;
    applyDefaultConfig: (
      config: ApplyAuthChoiceParams["config"],
    ) => ApplyAuthChoiceParams["config"];
    applyProviderConfig: (
      config: ApplyAuthChoiceParams["config"],
    ) => ApplyAuthChoiceParams["config"];
    noteMessage?: string;
    noteTitle?: string;
    tokenProvider?: string;
    normalize?: (value: string) => string;
    validate?: (value: string) => string | undefined;
    noteDefault?: string;
  }): Promise<ApplyAuthChoiceResult> {
    await ensureApiKeyFromOptionEnvOrPrompt({
      token: params.opts?.token,
      provider,
      tokenProvider,
      secretInputMode: requestedSecretInputMode,
      config: nextConfig,
      expectedProviders,
      envLabel,
      promptMessage,
      setCredential: async (apiKey, mode) => {
        await setCredential(apiKey, mode);
      },
      noteMessage,
      noteTitle,
      normalize,
      validate,
      prompter: params.prompter,
    });

    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId,
      provider,
      mode: "api_key",
    });
    await applyProviderDefaultModel({
      defaultModel,
      applyDefaultConfig,
      applyProviderConfig,
      noteDefault,
    });

    return { config: nextConfig, agentModelOverride };
  }

  if (authChoice === "openrouter-api-key") {
<<<<<<< HEAD
    const store = ensureAuthProfileStore(params.agentDir, {
      allowKeychainPrompt: false,
    });
    const profileOrder = resolveAuthProfileOrder({
      cfg: nextConfig,
      store,
      provider: "openrouter",
    });
    const existingProfileId = profileOrder.find((profileId) => Boolean(store.profiles[profileId]));
    const existingCred = existingProfileId ? store.profiles[existingProfileId] : undefined;
    let profileId = "openrouter:default";
    let mode: "api_key" | "oauth" | "token" = "api_key";
    let hasCredential = false;

    if (existingProfileId && existingCred?.type) {
      profileId = existingProfileId;
      mode =
        existingCred.type === "oauth"
          ? "oauth"
          : existingCred.type === "token"
            ? "token"
            : "api_key";
      hasCredential = true;
    }

    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "openrouter") {
      await setOpenrouterApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    if (!hasCredential) {
      const envKey = resolveEnvApiKey("openrouter");
      if (envKey) {
        const useExisting = await params.prompter.confirm({
          message: `Use existing OPENROUTER_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
          initialValue: true,
        });
        if (useExisting) {
          await setOpenrouterApiKey(envKey.apiKey, params.agentDir);
          hasCredential = true;
        }
      }
    }

    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter OpenRouter API key",
        validate: validateApiKeyInput,
      });
      await setOpenrouterApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
      hasCredential = true;
    }

    if (hasCredential) {
      nextConfig = applyAuthProfileConfig(nextConfig, {
        profileId,
        provider: "openrouter",
        mode,
      });
    }
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: OPENROUTER_DEFAULT_MODEL_REF,
        applyDefaultConfig: applyOpenrouterConfig,
        applyProviderConfig: applyOpenrouterProviderConfig,
        noteDefault: OPENROUTER_DEFAULT_MODEL_REF,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
=======
    return applyAuthChoiceOpenRouter(params);
>>>>>>> 08b7932df (feat(agents) : Hugging Face Inference provider first-class support and Together API fix and Direct Injection Refactor Auths [AI-assisted] (#13472))
  }

  if (authChoice === "litellm-api-key") {
    const store = ensureAuthProfileStore(params.agentDir, { allowKeychainPrompt: false });
    const profileOrder = resolveAuthProfileOrder({ cfg: nextConfig, store, provider: "litellm" });
    const existingProfileId = profileOrder.find((profileId) => Boolean(store.profiles[profileId]));
    const existingCred = existingProfileId ? store.profiles[existingProfileId] : undefined;
    let profileId = "litellm:default";
    let hasCredential = Boolean(existingProfileId && existingCred?.type === "api_key");
    if (hasCredential && existingProfileId) {
      profileId = existingProfileId;
    }

    if (!hasCredential) {
<<<<<<< HEAD
      await params.prompter.note(
        "LiteLLM provides a unified API to 100+ LLM providers.\nGet your API key from your LiteLLM proxy or https://litellm.ai\nDefault proxy runs on http://localhost:4000",
        "LiteLLM",
      );
      const envKey = resolveEnvApiKey("litellm");
      if (envKey) {
        const useExisting = await params.prompter.confirm({
          message: `Use existing LITELLM_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
          initialValue: true,
        });
        if (useExisting) {
          await setLitellmApiKey(envKey.apiKey, params.agentDir);
          hasCredential = true;
        }
      }
      if (!hasCredential) {
        const key = await params.prompter.text({
          message: "Enter LiteLLM API key",
          validate: validateApiKeyInput,
        });
        await setLitellmApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
        hasCredential = true;
      }
=======
      await ensureApiKeyFromOptionEnvOrPrompt({
        token: params.opts?.token,
        tokenProvider: normalizedTokenProvider,
        secretInputMode: requestedSecretInputMode,
        config: nextConfig,
        expectedProviders: ["litellm"],
        provider: "litellm",
        envLabel: "LITELLM_API_KEY",
        promptMessage: "Enter LiteLLM API key",
        normalize: normalizeApiKeyInput,
        validate: validateApiKeyInput,
        prompter: params.prompter,
        setCredential: async (apiKey, mode) =>
          setLitellmApiKey(apiKey, params.agentDir, { secretInputMode: mode }),
        noteMessage:
          "LiteLLM provides a unified API to 100+ LLM providers.\nGet your API key from your LiteLLM proxy or https://litellm.ai\nDefault proxy runs on http://localhost:4000",
        noteTitle: "LiteLLM",
      });
      hasCredential = true;
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)
    }

    if (hasCredential) {
      nextConfig = applyAuthProfileConfig(nextConfig, {
        profileId,
        provider: "litellm",
        mode: "api_key",
      });
    }
    await applyProviderDefaultModel({
      defaultModel: LITELLM_DEFAULT_MODEL_REF,
      applyDefaultConfig: applyLitellmConfig,
      applyProviderConfig: applyLitellmProviderConfig,
      noteDefault: LITELLM_DEFAULT_MODEL_REF,
    });
    return { config: nextConfig, agentModelOverride };
  }

<<<<<<< HEAD
  if (authChoice === "ai-gateway-api-key") {
    let hasCredential = false;

    if (
      !hasCredential &&
      params.opts?.token &&
      params.opts?.tokenProvider === "vercel-ai-gateway"
    ) {
      await setVercelAiGatewayApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    const envKey = resolveEnvApiKey("vercel-ai-gateway");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing AI_GATEWAY_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setVercelAiGatewayApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Vercel AI Gateway API key",
        validate: validateApiKeyInput,
      });
      await setVercelAiGatewayApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "vercel-ai-gateway:default",
      provider: "vercel-ai-gateway",
      mode: "api_key",
=======
  const simpleApiKeyProviderFlow = SIMPLE_API_KEY_PROVIDER_FLOWS[authChoice];
  if (simpleApiKeyProviderFlow) {
    return await applyApiKeyProviderWithDefaultModel({
      provider: simpleApiKeyProviderFlow.provider,
      profileId: simpleApiKeyProviderFlow.profileId,
      expectedProviders: simpleApiKeyProviderFlow.expectedProviders,
      envLabel: simpleApiKeyProviderFlow.envLabel,
      promptMessage: simpleApiKeyProviderFlow.promptMessage,
      setCredential: async (apiKey, mode) =>
        simpleApiKeyProviderFlow.setCredential(apiKey, params.agentDir, {
          secretInputMode: mode ?? requestedSecretInputMode,
        }),
      defaultModel: simpleApiKeyProviderFlow.defaultModel,
      applyDefaultConfig: simpleApiKeyProviderFlow.applyDefaultConfig,
      applyProviderConfig: simpleApiKeyProviderFlow.applyProviderConfig,
      noteDefault: simpleApiKeyProviderFlow.noteDefault,
      noteMessage: simpleApiKeyProviderFlow.noteMessage,
      noteTitle: simpleApiKeyProviderFlow.noteTitle,
      tokenProvider: simpleApiKeyProviderFlow.tokenProvider,
      normalize: simpleApiKeyProviderFlow.normalize,
      validate: simpleApiKeyProviderFlow.validate,
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)
    });
  }

  if (authChoice === "cloudflare-ai-gateway-api-key") {
    let accountId = params.opts?.cloudflareAiGatewayAccountId?.trim() ?? "";
    let gatewayId = params.opts?.cloudflareAiGatewayGatewayId?.trim() ?? "";

    const ensureAccountGateway = async () => {
      if (!accountId) {
        const value = await params.prompter.text({
          message: "Enter Cloudflare Account ID",
          validate: (val) => (String(val).trim() ? undefined : "Account ID is required"),
        });
        accountId = String(value).trim();
      }
      if (!gatewayId) {
        const value = await params.prompter.text({
          message: "Enter Cloudflare AI Gateway ID",
          validate: (val) => (String(val).trim() ? undefined : "Gateway ID is required"),
        });
        gatewayId = String(value).trim();
      }
    };

    await ensureAccountGateway();

    await ensureApiKeyFromOptionEnvOrPrompt({
      token: params.opts?.cloudflareAiGatewayApiKey,
      tokenProvider: "cloudflare-ai-gateway",
      secretInputMode: requestedSecretInputMode,
      config: nextConfig,
      expectedProviders: ["cloudflare-ai-gateway"],
      provider: "cloudflare-ai-gateway",
      envLabel: "CLOUDFLARE_AI_GATEWAY_API_KEY",
      promptMessage: "Enter Cloudflare AI Gateway API key",
      normalize: normalizeApiKeyInput,
      validate: validateApiKeyInput,
      prompter: params.prompter,
      setCredential: async (apiKey, mode) =>
        setCloudflareAiGatewayConfig(accountId, gatewayId, apiKey, params.agentDir, {
          secretInputMode: mode,
        }),
    });

<<<<<<< HEAD
    if (!resolvedApiKey && optsApiKey) {
      await ensureAccountGateway();
      await setCloudflareAiGatewayConfig(accountId, gatewayId, optsApiKey, params.agentDir, {
        secretInputMode: requestedSecretInputMode,
      });
      resolvedApiKey = optsApiKey;
    }

    if (!resolvedApiKey) {
      await ensureAccountGateway();
      const key = await params.prompter.text({
        message: "Enter Cloudflare AI Gateway API key",
        validate: validateApiKeyInput,
      });
<<<<<<< HEAD
      await setCloudflareAiGatewayConfig(
        accountId,
        gatewayId,
        normalizeApiKeyInput(String(key)),
        params.agentDir,
      );
      hasCredential = true;
    }

    if (hasCredential) {
      nextConfig = applyAuthProfileConfig(nextConfig, {
        profileId: "cloudflare-ai-gateway:default",
        provider: "cloudflare-ai-gateway",
        mode: "api_key",
      });
    }
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF,
        applyDefaultConfig: (cfg) =>
          applyCloudflareAiGatewayConfig(cfg, {
            accountId: accountId || params.opts?.cloudflareAiGatewayAccountId,
            gatewayId: gatewayId || params.opts?.cloudflareAiGatewayGatewayId,
          }),
        applyProviderConfig: (cfg) =>
          applyCloudflareAiGatewayProviderConfig(cfg, {
            accountId: accountId || params.opts?.cloudflareAiGatewayAccountId,
            gatewayId: gatewayId || params.opts?.cloudflareAiGatewayGatewayId,
          }),
        noteDefault: CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (authChoice === "moonshot-api-key") {
<<<<<<< HEAD
    let hasCredential = false;

    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "moonshot") {
      await setMoonshotApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    const envKey = resolveEnvApiKey("moonshot");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing MOONSHOT_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setMoonshotApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Moonshot API key",
        validate: validateApiKeyInput,
      });
      await setMoonshotApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
=======
    await ensureMoonshotApiKeyCredential("Enter Moonshot API key");
>>>>>>> adee04824 (refactor(commands): dedupe moonshot api key prompt)
=======
      resolvedApiKey = normalizeApiKeyInput(String(key ?? ""));
      await setCloudflareAiGatewayConfig(accountId, gatewayId, resolvedApiKey, params.agentDir, {
        secretInputMode: requestedSecretInputMode,
      });
    }
<<<<<<< HEAD

    await setCloudflareAiGatewayConfig(accountId, gatewayId, resolvedApiKey, params.agentDir);
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)
=======
>>>>>>> 04aa856fc (Onboard: require explicit mode for env secret refs)
=======
>>>>>>> 5e3a86fd2 (feat(secrets): expand onboarding secret-ref flows and custom-provider parity)
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "cloudflare-ai-gateway:default",
      provider: "cloudflare-ai-gateway",
      mode: "api_key",
    });
<<<<<<< HEAD
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: MOONSHOT_DEFAULT_MODEL_REF,
        applyDefaultConfig: applyMoonshotConfig,
        applyProviderConfig: applyMoonshotProviderConfig,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (authChoice === "moonshot-api-key-cn") {
<<<<<<< HEAD
    let hasCredential = false;

    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "moonshot") {
      await setMoonshotApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    const envKey = resolveEnvApiKey("moonshot");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing MOONSHOT_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setMoonshotApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Moonshot API key (.cn)",
        validate: validateApiKeyInput,
      });
      await setMoonshotApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
=======
    await ensureMoonshotApiKeyCredential("Enter Moonshot API key (.cn)");
>>>>>>> adee04824 (refactor(commands): dedupe moonshot api key prompt)
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "moonshot:default",
      provider: "moonshot",
      mode: "api_key",
    });
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: MOONSHOT_DEFAULT_MODEL_REF,
        applyDefaultConfig: applyMoonshotConfigCn,
        applyProviderConfig: applyMoonshotProviderConfigCn,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (authChoice === "kimi-code-api-key") {
    let hasCredential = false;
    const tokenProvider = params.opts?.tokenProvider?.trim().toLowerCase();
    if (
      !hasCredential &&
      params.opts?.token &&
      (tokenProvider === "kimi-code" || tokenProvider === "kimi-coding")
    ) {
      await setKimiCodingApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    if (!hasCredential) {
      await params.prompter.note(
        [
          "Kimi Coding uses a dedicated endpoint and API key.",
          "Get your API key at: https://www.kimi.com/code/en",
        ].join("\n"),
        "Kimi Coding",
      );
    }
    const envKey = resolveEnvApiKey("kimi-coding");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing KIMI_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setKimiCodingApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Kimi Coding API key",
        validate: validateApiKeyInput,
      });
      await setKimiCodingApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "kimi-coding:default",
      provider: "kimi-coding",
      mode: "api_key",
    });
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: KIMI_CODING_MODEL_REF,
        applyDefaultConfig: applyKimiCodeConfig,
        applyProviderConfig: applyKimiCodeProviderConfig,
        noteDefault: KIMI_CODING_MODEL_REF,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
=======
    await applyProviderDefaultModel({
      defaultModel: CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF,
      applyDefaultConfig: (cfg) =>
        applyCloudflareAiGatewayConfig(cfg, {
          accountId: accountId || params.opts?.cloudflareAiGatewayAccountId,
          gatewayId: gatewayId || params.opts?.cloudflareAiGatewayGatewayId,
        }),
      applyProviderConfig: (cfg) =>
        applyCloudflareAiGatewayProviderConfig(cfg, {
          accountId: accountId || params.opts?.cloudflareAiGatewayAccountId,
          gatewayId: gatewayId || params.opts?.cloudflareAiGatewayGatewayId,
        }),
      noteDefault: CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF,
    });
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)
    return { config: nextConfig, agentModelOverride };
  }

  if (authChoice === "gemini-api-key") {
<<<<<<< HEAD
    let hasCredential = false;

    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "google") {
      await setGeminiApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    const envKey = resolveEnvApiKey("google");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing GEMINI_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setGeminiApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Gemini API key",
        validate: validateApiKeyInput,
      });
      await setGeminiApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
=======
    await ensureApiKeyFromOptionEnvOrPrompt({
      token: params.opts?.token,
      provider: "google",
      tokenProvider: normalizedTokenProvider,
      secretInputMode: requestedSecretInputMode,
      config: nextConfig,
      expectedProviders: ["google"],
      envLabel: "GEMINI_API_KEY",
      promptMessage: "Enter Gemini API key",
      normalize: normalizeApiKeyInput,
      validate: validateApiKeyInput,
      prompter: params.prompter,
      setCredential: async (apiKey, mode) =>
        setGeminiApiKey(apiKey, params.agentDir, { secretInputMode: mode }),
    });
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "google:default",
      provider: "google",
      mode: "api_key",
    });
    if (params.setDefaultModel) {
      const applied = applyGoogleGeminiModelDefault(nextConfig);
      nextConfig = applied.next;
      if (applied.changed) {
        await params.prompter.note(
          `Default model set to ${GOOGLE_GEMINI_DEFAULT_MODEL}`,
          "Model configured",
        );
      }
    } else {
      agentModelOverride = GOOGLE_GEMINI_DEFAULT_MODEL;
      await noteAgentModel(GOOGLE_GEMINI_DEFAULT_MODEL);
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (
    authChoice === "zai-api-key" ||
    authChoice === "zai-coding-global" ||
    authChoice === "zai-coding-cn" ||
    authChoice === "zai-global" ||
    authChoice === "zai-cn"
  ) {
    let endpoint = ZAI_AUTH_CHOICE_ENDPOINT[authChoice];

<<<<<<< HEAD
    // Input API key
    let hasCredential = false;
    let apiKey = "";

    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "zai") {
      apiKey = normalizeApiKeyInput(params.opts.token);
      await setZaiApiKey(apiKey, params.agentDir);
      hasCredential = true;
    }

    const envKey = resolveEnvApiKey("zai");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing ZAI_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        apiKey = envKey.apiKey;
        await setZaiApiKey(apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Z.AI API key",
        validate: validateApiKeyInput,
      });
      apiKey = normalizeApiKeyInput(String(key));
      await setZaiApiKey(apiKey, params.agentDir);
    }
=======
    const apiKey = await ensureApiKeyFromOptionEnvOrPrompt({
      token: params.opts?.token,
      provider: "zai",
      tokenProvider: normalizedTokenProvider,
      secretInputMode: requestedSecretInputMode,
      config: nextConfig,
      expectedProviders: ["zai"],
      envLabel: "ZAI_API_KEY",
      promptMessage: "Enter Z.AI API key",
      normalize: normalizeApiKeyInput,
      validate: validateApiKeyInput,
      prompter: params.prompter,
      setCredential: async (apiKey, mode) =>
        setZaiApiKey(apiKey, params.agentDir, { secretInputMode: mode }),
    });
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)

    // zai-api-key: auto-detect endpoint + choose a working default model.
    let modelIdOverride: string | undefined;
    if (!endpoint) {
      const detected = await detectZaiEndpoint({ apiKey });
      if (detected) {
        endpoint = detected.endpoint;
        modelIdOverride = detected.modelId;
        await params.prompter.note(detected.note, "Z.AI endpoint");
      } else {
        endpoint = await params.prompter.select({
          message: "Select Z.AI endpoint",
          options: [
            {
              value: "coding-global",
              label: "Coding-Plan-Global",
              hint: "GLM Coding Plan Global (api.z.ai)",
            },
            {
              value: "coding-cn",
              label: "Coding-Plan-CN",
              hint: "GLM Coding Plan CN (open.bigmodel.cn)",
            },
            {
              value: "global",
              label: "Global",
              hint: "Z.AI Global (api.z.ai)",
            },
            {
              value: "cn",
              label: "CN",
              hint: "Z.AI CN (open.bigmodel.cn)",
            },
          ],
          initialValue: "global",
        });
      }
    }

    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "zai:default",
      provider: "zai",
      mode: "api_key",
    });

    const defaultModel = modelIdOverride ? `zai/${modelIdOverride}` : ZAI_DEFAULT_MODEL_REF;
    await applyProviderDefaultModel({
      defaultModel,
      applyDefaultConfig: (config) =>
        applyZaiConfig(config, {
          endpoint,
          ...(modelIdOverride ? { modelId: modelIdOverride } : {}),
        }),
      applyProviderConfig: (config) =>
        applyZaiProviderConfig(config, {
          endpoint,
          ...(modelIdOverride ? { modelId: modelIdOverride } : {}),
        }),
      noteDefault: defaultModel,
    });

    return { config: nextConfig, agentModelOverride };
  }

<<<<<<< HEAD
  if (authChoice === "xiaomi-api-key") {
    let hasCredential = false;

    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "xiaomi") {
      await setXiaomiApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    const envKey = resolveEnvApiKey("xiaomi");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing XIAOMI_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setXiaomiApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Xiaomi API key",
        validate: validateApiKeyInput,
      });
      await setXiaomiApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "xiaomi:default",
      provider: "xiaomi",
      mode: "api_key",
    });
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: XIAOMI_DEFAULT_MODEL_REF,
        applyDefaultConfig: applyXiaomiConfig,
        applyProviderConfig: applyXiaomiProviderConfig,
        noteDefault: XIAOMI_DEFAULT_MODEL_REF,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (authChoice === "synthetic-api-key") {
    if (params.opts?.token && params.opts?.tokenProvider === "synthetic") {
      await setSyntheticApiKey(String(params.opts.token).trim(), params.agentDir);
    } else {
      const key = await params.prompter.text({
        message: "Enter Synthetic API key",
        validate: (value) => (value?.trim() ? undefined : "Required"),
      });
      await setSyntheticApiKey(String(key).trim(), params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "synthetic:default",
      provider: "synthetic",
      mode: "api_key",
    });
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: SYNTHETIC_DEFAULT_MODEL_REF,
        applyDefaultConfig: applySyntheticConfig,
        applyProviderConfig: applySyntheticProviderConfig,
        noteDefault: SYNTHETIC_DEFAULT_MODEL_REF,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (authChoice === "venice-api-key") {
    let hasCredential = false;

    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "venice") {
      await setVeniceApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    if (!hasCredential) {
      await params.prompter.note(
        [
          "Venice AI provides privacy-focused inference with uncensored models.",
          "Get your API key at: https://venice.ai/settings/api",
          "Supports 'private' (fully private) and 'anonymized' (proxy) modes.",
        ].join("\n"),
        "Venice AI",
      );
    }

    const envKey = resolveEnvApiKey("venice");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing VENICE_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setVeniceApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Venice AI API key",
        validate: validateApiKeyInput,
      });
      await setVeniceApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "venice:default",
      provider: "venice",
      mode: "api_key",
    });
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: VENICE_DEFAULT_MODEL_REF,
        applyDefaultConfig: applyVeniceConfig,
        applyProviderConfig: applyVeniceProviderConfig,
        noteDefault: VENICE_DEFAULT_MODEL_REF,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (authChoice === "opencode-zen") {
    let hasCredential = false;
    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "opencode") {
      await setOpencodeZenApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    if (!hasCredential) {
      await params.prompter.note(
        [
          "OpenCode Zen provides access to Claude, GPT, Gemini, and more models.",
          "Get your API key at: https://opencode.ai/auth",
          "OpenCode Zen bills per request. Check your OpenCode dashboard for details.",
        ].join("\n"),
        "OpenCode Zen",
      );
    }
    const envKey = resolveEnvApiKey("opencode");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing OPENCODE_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setOpencodeZenApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter OpenCode Zen API key",
        validate: validateApiKeyInput,
      });
      await setOpencodeZenApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "opencode:default",
      provider: "opencode",
      mode: "api_key",
    });
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: OPENCODE_ZEN_DEFAULT_MODEL,
        applyDefaultConfig: applyOpencodeZenConfig,
        applyProviderConfig: applyOpencodeZenProviderConfig,
        noteDefault: OPENCODE_ZEN_DEFAULT_MODEL,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (authChoice === "together-api-key") {
    let hasCredential = false;

    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "together") {
      await setTogetherApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    if (!hasCredential) {
      await params.prompter.note(
        [
          "Together AI provides access to leading open-source models including Llama, DeepSeek, Qwen, and more.",
          "Get your API key at: https://api.together.xyz/settings/api-keys",
        ].join("\n"),
        "Together AI",
      );
    }

    const envKey = resolveEnvApiKey("together");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing TOGETHER_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setTogetherApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Together AI API key",
        validate: validateApiKeyInput,
      });
      await setTogetherApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "together:default",
      provider: "together",
      mode: "api_key",
    });
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: TOGETHER_DEFAULT_MODEL_REF,
        applyDefaultConfig: applyTogetherConfig,
        applyProviderConfig: applyTogetherProviderConfig,
        noteDefault: TOGETHER_DEFAULT_MODEL_REF,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

=======
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)
  if (authChoice === "huggingface-api-key") {
    return applyAuthChoiceHuggingface({ ...params, authChoice });
  }

<<<<<<< HEAD
  if (authChoice === "qianfan-api-key") {
    let hasCredential = false;
    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "qianfan") {
      setQianfanApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    if (!hasCredential) {
      await params.prompter.note(
        [
          "Get your API key at: https://console.bce.baidu.com/qianfan/ais/console/apiKey",
          "API key format: bce-v3/ALTAK-...",
        ].join("\n"),
        "QIANFAN",
      );
    }
    const envKey = resolveEnvApiKey("qianfan");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing QIANFAN_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        setQianfanApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter QIANFAN API key",
        validate: validateApiKeyInput,
      });
      setQianfanApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "qianfan:default",
      provider: "qianfan",
      mode: "api_key",
    });
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: QIANFAN_DEFAULT_MODEL_REF,
        applyDefaultConfig: applyQianfanConfig,
        applyProviderConfig: applyQianfanProviderConfig,
        noteDefault: QIANFAN_DEFAULT_MODEL_REF,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

=======
>>>>>>> fc60f4923 (refactor(auth-choice): unify api-key resolution flows)
  return null;
}
