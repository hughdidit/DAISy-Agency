<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { ensureAuthProfileStore } from "../agents/auth-profiles.js";
<<<<<<< HEAD
import type { MoltbotConfig, GatewayAuthConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
=======
=======
>>>>>>> ed11e93cf (chore(format))
=======
import { ensureAuthProfileStore } from "../agents/auth-profiles.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> ae2c8f2cf (feat(models): support anthropic sonnet 4.6)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { ensureAuthProfileStore } from "../agents/auth-profiles.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import type { OpenClawConfig, GatewayAuthConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { promptAuthChoiceGrouped } from "./auth-choice-prompt.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { applyAuthChoice, resolvePreferredProviderForAuthChoice } from "./auth-choice.js";
import { promptAuthChoiceGrouped } from "./auth-choice-prompt.js";
import {
  applyModelAllowlist,
  applyModelFallbacksFromSelection,
  applyPrimaryModel,
  promptDefaultModel,
  promptModelAllowlist,
} from "./model-picker.js";
import { promptCustomApiConfig } from "./onboard-custom.js";

type GatewayAuthChoice = "token" | "password" | "trusted-proxy";

/** Reject undefined, empty, and common JS string-coercion artifacts for token auth. */
function sanitizeTokenValue(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") {
    return undefined;
  }
  return trimmed;
}

const ANTHROPIC_OAUTH_MODEL_KEYS = [
<<<<<<< HEAD
<<<<<<< HEAD
=======
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-6",
>>>>>>> ae2c8f2cf (feat(models): support anthropic sonnet 4.6)
=======
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-opus-4-6",
>>>>>>> f25bbbc37 (feat: switch anthropic onboarding defaults to sonnet)
  "anthropic/claude-opus-4-5",
  "anthropic/claude-sonnet-4-5",
  "anthropic/claude-haiku-4-5",
];

export function buildGatewayAuthConfig(params: {
  existing?: GatewayAuthConfig;
  mode: GatewayAuthChoice;
  token?: string;
  password?: string;
  trustedProxy?: {
    userHeader: string;
    requiredHeaders?: string[];
    allowUsers?: string[];
  };
}): GatewayAuthConfig | undefined {
  const allowTailscale = params.existing?.allowTailscale;
  const base: GatewayAuthConfig = {};
  if (typeof allowTailscale === "boolean") {
    base.allowTailscale = allowTailscale;
  }

  if (params.mode === "token") {
<<<<<<< HEAD
    return { ...base, mode: "token", token: params.token };
=======
    // Keep token mode always valid: treat empty/undefined/"undefined"/"null" as missing and generate a token.
    const token = sanitizeTokenValue(params.token) ?? randomToken();
    return { ...base, mode: "token", token };
>>>>>>> 59733a02c (fix(configure): reject literal "undefined" and "null" gateway auth tokens (#13767))
  }
  if (params.mode === "password") {
    const password = params.password?.trim();
    return { ...base, mode: "password", ...(password && { password }) };
  }
  if (params.mode === "trusted-proxy") {
    if (!params.trustedProxy) {
      throw new Error("trustedProxy config is required when mode is trusted-proxy");
    }
    return { ...base, mode: "trusted-proxy", trustedProxy: params.trustedProxy };
  }
  return base;
}

export async function promptAuthConfig(
  cfg: MoltbotConfig,
  runtime: RuntimeEnv,
  prompter: WizardPrompter,
): Promise<MoltbotConfig> {
  const authChoice = await promptAuthChoiceGrouped({
    prompter,
    store: ensureAuthProfileStore(undefined, {
      allowKeychainPrompt: false,
    }),
    includeSkip: true,
  });

  let next = cfg;
  if (authChoice === "custom-api-key") {
    const customResult = await promptCustomApiConfig({ prompter, runtime, config: next });
    next = customResult.config;
  } else if (authChoice !== "skip") {
    const applied = await applyAuthChoice({
      authChoice,
      config: next,
      prompter,
      runtime,
      setDefaultModel: true,
    });
    next = applied.config;
  } else {
    const modelSelection = await promptDefaultModel({
      config: next,
      prompter,
      allowKeep: true,
      ignoreAllowlist: true,
      preferredProvider: resolvePreferredProviderForAuthChoice(authChoice),
    });
    if (modelSelection.config) {
      next = modelSelection.config;
    }
    if (modelSelection.model) {
      next = applyPrimaryModel(next, modelSelection.model);
    }
  }

  const anthropicOAuth =
    authChoice === "setup-token" || authChoice === "token" || authChoice === "oauth";

<<<<<<< HEAD
  const allowlistSelection = await promptModelAllowlist({
    config: next,
    prompter,
    allowedKeys: anthropicOAuth ? ANTHROPIC_OAUTH_MODEL_KEYS : undefined,
    initialSelections: anthropicOAuth ? ["anthropic/claude-opus-4-5"] : undefined,
    message: anthropicOAuth ? "Anthropic OAuth models" : undefined,
  });
  if (allowlistSelection.models) {
    next = applyModelAllowlist(next, allowlistSelection.models);
    next = applyModelFallbacksFromSelection(next, allowlistSelection.models);
=======
  if (authChoice !== "custom-api-key") {
    const allowlistSelection = await promptModelAllowlist({
      config: next,
      prompter,
      allowedKeys: anthropicOAuth ? ANTHROPIC_OAUTH_MODEL_KEYS : undefined,
      initialSelections: anthropicOAuth ? ["anthropic/claude-sonnet-4-6"] : undefined,
      message: anthropicOAuth ? "Anthropic OAuth models" : undefined,
    });
    if (allowlistSelection.models) {
      next = applyModelAllowlist(next, allowlistSelection.models);
      next = applyModelFallbacksFromSelection(next, allowlistSelection.models);
    }
>>>>>>> c0befdee0 (feat(onboard): add custom/local API configuration flow (#11106))
  }

  return next;
}
