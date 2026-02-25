<<<<<<< HEAD
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { resolveEnvApiKey } from "../agents/model-auth.js";
import {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "./auth-choice.api-key.js";
<<<<<<< HEAD
=======
=======
import { normalizeApiKeyInput, validateApiKeyInput } from "./auth-choice.api-key.js";
>>>>>>> 5e3a86fd2 (feat(secrets): expand onboarding secret-ref flows and custom-provider parity)
import {
  ensureApiKeyFromOptionEnvOrPrompt,
  normalizeSecretInputModeInput,
} from "./auth-choice.apply-helpers.js";
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
>>>>>>> cb119874d (Onboard: require explicit mode for env secret refs)
import { applyPrimaryModel } from "./model-picker.js";
import { applyAuthProfileConfig, setByteplusApiKey } from "./onboard-auth.js";

/** Default model for BytePlus auth onboarding. */
export const BYTEPLUS_DEFAULT_MODEL = "byteplus-plan/ark-code-latest";

export async function applyAuthChoiceBytePlus(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  if (params.authChoice !== "byteplus-api-key") {
    return null;
  }

  const requestedSecretInputMode = normalizeSecretInputModeInput(params.opts?.secretInputMode);
  await ensureApiKeyFromOptionEnvOrPrompt({
    token: params.opts?.byteplusApiKey,
    tokenProvider: "byteplus",
    secretInputMode: requestedSecretInputMode,
    config: params.config,
    expectedProviders: ["byteplus"],
    provider: "byteplus",
    envLabel: "BYTEPLUS_API_KEY",
    promptMessage: "Enter BytePlus API key",
    normalize: normalizeApiKeyInput,
    validate: validateApiKeyInput,
    prompter: params.prompter,
    setCredential: async (apiKey, mode) =>
      setByteplusApiKey(apiKey, params.agentDir, { secretInputMode: mode }),
  });
  const configWithAuth = applyAuthProfileConfig(params.config, {
    profileId: "byteplus:default",
    provider: "byteplus",
    mode: "api_key",
  });
  const configWithModel = applyPrimaryModel(configWithAuth, BYTEPLUS_DEFAULT_MODEL);
  return {
    config: configWithModel,
    agentModelOverride: BYTEPLUS_DEFAULT_MODEL,
  };
}
