export {
  SYNTHETIC_DEFAULT_MODEL_ID,
  SYNTHETIC_DEFAULT_MODEL_REF,
} from "../agents/synthetic-models.js";
export { VENICE_DEFAULT_MODEL_ID, VENICE_DEFAULT_MODEL_REF } from "../agents/venice-models.js";
export {
  applyAuthProfileConfig,
<<<<<<< HEAD
<<<<<<< HEAD
=======
  applyCloudflareAiGatewayConfig,
  applyCloudflareAiGatewayProviderConfig,
  applyHuggingfaceConfig,
  applyHuggingfaceProviderConfig,
<<<<<<< HEAD
>>>>>>> 08b7932df (feat(agents) : Hugging Face Inference provider first-class support and Together API fix and Direct Injection Refactor Auths [AI-assisted] (#13472))
=======
  applyKilocodeConfig,
  applyKilocodeProviderConfig,
>>>>>>> 13f32e2f7 (feat: Add Kilo Gateway provider (#20212))
  applyQianfanConfig,
  applyQianfanProviderConfig,
=======
  applyCloudflareAiGatewayConfig,
  applyCloudflareAiGatewayProviderConfig,
>>>>>>> 5b0851ebd (feat: add cloudflare ai gateway provider)
  applyKimiCodeConfig,
  applyKimiCodeProviderConfig,
  applyLitellmConfig,
  applyLitellmProviderConfig,
  applyMistralConfig,
  applyMistralProviderConfig,
  applyMoonshotConfig,
  applyMoonshotConfigCn,
  applyMoonshotProviderConfig,
  applyOpenrouterConfig,
  applyOpenrouterProviderConfig,
  applySyntheticConfig,
  applySyntheticProviderConfig,
  applyTogetherConfig,
  applyTogetherProviderConfig,
  applyVeniceConfig,
  applyVeniceProviderConfig,
  applyVercelAiGatewayConfig,
  applyVercelAiGatewayProviderConfig,
  applyXaiConfig,
  applyXaiProviderConfig,
  applyXiaomiConfig,
  applyXiaomiProviderConfig,
  applyZaiConfig,
  applyZaiProviderConfig,
  KILOCODE_BASE_URL,
} from "./onboard-auth.config-core.js";
export {
  applyMinimaxApiConfig,
  applyMinimaxApiConfigCn,
  applyMinimaxApiProviderConfig,
  applyMinimaxApiProviderConfigCn,
  applyMinimaxConfig,
  applyMinimaxHostedConfig,
  applyMinimaxHostedProviderConfig,
  applyMinimaxProviderConfig,
} from "./onboard-auth.config-minimax.js";

export {
  applyOpencodeZenConfig,
  applyOpencodeZenProviderConfig,
} from "./onboard-auth.config-opencode.js";
export {
  CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF,
  KILOCODE_DEFAULT_MODEL_REF,
  LITELLM_DEFAULT_MODEL_REF,
  OPENROUTER_DEFAULT_MODEL_REF,
  setAnthropicApiKey,
<<<<<<< HEAD
  setQianfanApiKey,
=======
  setCloudflareAiGatewayConfig,
>>>>>>> 5b0851ebd (feat: add cloudflare ai gateway provider)
  setGeminiApiKey,
  setKilocodeApiKey,
  setLitellmApiKey,
  setKimiCodingApiKey,
  setMinimaxApiKey,
  setMistralApiKey,
  setMoonshotApiKey,
  setOpencodeZenApiKey,
  setOpenrouterApiKey,
  setSyntheticApiKey,
  setTogetherApiKey,
  setHuggingfaceApiKey,
  setVeniceApiKey,
  setVercelAiGatewayApiKey,
  setXiaomiApiKey,
  setZaiApiKey,
  setXaiApiKey,
  writeOAuthCredentials,
  HUGGINGFACE_DEFAULT_MODEL_REF,
  VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF,
  XIAOMI_DEFAULT_MODEL_REF,
  ZAI_DEFAULT_MODEL_REF,
  TOGETHER_DEFAULT_MODEL_REF,
  MISTRAL_DEFAULT_MODEL_REF,
  XAI_DEFAULT_MODEL_REF,
} from "./onboard-auth.credentials.js";
export {
<<<<<<< HEAD
  buildQianfanModelDefinition,
=======
  buildKilocodeModelDefinition,
>>>>>>> 13f32e2f7 (feat: Add Kilo Gateway provider (#20212))
  buildMinimaxApiModelDefinition,
  buildMinimaxModelDefinition,
  buildMistralModelDefinition,
  buildMoonshotModelDefinition,
  buildZaiModelDefinition,
  DEFAULT_MINIMAX_BASE_URL,
<<<<<<< HEAD
<<<<<<< HEAD
=======
  KILOCODE_DEFAULT_MODEL_ID,
>>>>>>> 13f32e2f7 (feat: Add Kilo Gateway provider (#20212))
  MOONSHOT_CN_BASE_URL,
=======
  QIANFAN_BASE_URL,
  QIANFAN_DEFAULT_MODEL_ID,
  QIANFAN_DEFAULT_MODEL_REF,
>>>>>>> 30ac80b96 (Add baidu qianfan model provider)
  KIMI_CODING_MODEL_ID,
  KIMI_CODING_MODEL_REF,
  MINIMAX_API_BASE_URL,
  MINIMAX_CN_API_BASE_URL,
  MINIMAX_HOSTED_MODEL_ID,
  MINIMAX_HOSTED_MODEL_REF,
  MOONSHOT_BASE_URL,
  MOONSHOT_DEFAULT_MODEL_ID,
  MOONSHOT_DEFAULT_MODEL_REF,
  MISTRAL_BASE_URL,
  MISTRAL_DEFAULT_MODEL_ID,
  resolveZaiBaseUrl,
  ZAI_CODING_CN_BASE_URL,
  ZAI_DEFAULT_MODEL_ID,
  ZAI_CODING_GLOBAL_BASE_URL,
  ZAI_CN_BASE_URL,
  ZAI_GLOBAL_BASE_URL,
} from "./onboard-auth.models.js";
