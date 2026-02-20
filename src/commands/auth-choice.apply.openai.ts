<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { loginOpenAICodex } from "@mariozechner/pi-ai";
=======
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
>>>>>>> 86e4fe0a7 (Auth: land codex oauth onboarding flow (#15406))
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { resolveEnvApiKey } from "../agents/model-auth.js";
import { upsertSharedEnvVar } from "../infra/env-file.js";
import { isRemoteEnvironment } from "./oauth-env.js";
import {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "./auth-choice.api-key.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { createAuthChoiceAgentModelNoter } from "./auth-choice.apply-helpers.js";
>>>>>>> 0048af4e2 (refactor(commands): dedupe auth-choice model notes)
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { createVpsAwareOAuthHandlers } from "./oauth-flow.js";
=======
=======
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
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
import { applyDefaultModelChoice } from "./auth-choice.default-model.js";
import { isRemoteEnvironment } from "./oauth-env.js";
>>>>>>> 86e4fe0a7 (Auth: land codex oauth onboarding flow (#15406))
import { applyAuthProfileConfig, writeOAuthCredentials } from "./onboard-auth.js";
import { openUrl } from "./onboard-helpers.js";
import {
  applyOpenAICodexModelDefault,
  OPENAI_CODEX_DEFAULT_MODEL,
} from "./openai-codex-model-default.js";
<<<<<<< HEAD
=======
import { loginOpenAICodexOAuth } from "./openai-codex-oauth.js";
import {
  applyOpenAIConfig,
  applyOpenAIProviderConfig,
  OPENAI_DEFAULT_MODEL,
} from "./openai-model-default.js";
>>>>>>> 86e4fe0a7 (Auth: land codex oauth onboarding flow (#15406))

export async function applyAuthChoiceOpenAI(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  const noteAgentModel = createAuthChoiceAgentModelNoter(params);
  let authChoice = params.authChoice;
  if (authChoice === "apiKey" && params.opts?.tokenProvider === "openai") {
    authChoice = "openai-api-key";
  }

  if (authChoice === "openai-api-key") {
<<<<<<< HEAD
=======
    let nextConfig = params.config;
    let agentModelOverride: string | undefined;

    const applyOpenAiDefaultModelChoice = async (): Promise<ApplyAuthChoiceResult> => {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: OPENAI_DEFAULT_MODEL,
        applyDefaultConfig: applyOpenAIConfig,
        applyProviderConfig: applyOpenAIProviderConfig,
        noteDefault: OPENAI_DEFAULT_MODEL,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
      return { config: nextConfig, agentModelOverride };
    };

>>>>>>> aa2d74a84 (refactor(commands): dedupe OpenAI default model apply)
    const envKey = resolveEnvApiKey("openai");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing OPENAI_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        const result = upsertSharedEnvVar({
          key: "OPENAI_API_KEY",
          value: envKey.apiKey,
        });
        if (!process.env.OPENAI_API_KEY) {
          process.env.OPENAI_API_KEY = envKey.apiKey;
        }
        await params.prompter.note(
          `Copied OPENAI_API_KEY to ${result.path} for launchd compatibility.`,
          "OpenAI API key",
        );
<<<<<<< HEAD
        return { config: params.config };
=======
        return await applyOpenAiDefaultModelChoice();
>>>>>>> aa2d74a84 (refactor(commands): dedupe OpenAI default model apply)
      }
    }

    let key: string | undefined;
    if (params.opts?.token && params.opts?.tokenProvider === "openai") {
      key = params.opts.token;
    } else {
      key = await params.prompter.text({
        message: "Enter OpenAI API key",
        validate: validateApiKeyInput,
      });
    }

    const trimmed = normalizeApiKeyInput(String(key));
    const result = upsertSharedEnvVar({
      key: "OPENAI_API_KEY",
      value: trimmed,
    });
    process.env.OPENAI_API_KEY = trimmed;
    await params.prompter.note(
      `Saved OPENAI_API_KEY to ${result.path} for launchd compatibility.`,
      "OpenAI API key",
    );
<<<<<<< HEAD
    return { config: params.config };
=======
    return await applyOpenAiDefaultModelChoice();
>>>>>>> aa2d74a84 (refactor(commands): dedupe OpenAI default model apply)
  }

  if (params.authChoice === "openai-codex") {
    let nextConfig = params.config;
    let agentModelOverride: string | undefined;

    let creds;
    try {
      creds = await loginOpenAICodexOAuth({
        prompter: params.prompter,
        runtime: params.runtime,
        isRemote: isRemoteEnvironment(),
        openUrl: async (url) => {
          await openUrl(url);
        },
        localBrowserMessage: "Complete sign-in in browser…",
      });
    } catch {
      // The helper already surfaces the error to the user.
      // Keep onboarding flow alive and return unchanged config.
      return { config: nextConfig, agentModelOverride };
    }
    if (creds) {
      const profileId = await writeOAuthCredentials("openai-codex", creds, params.agentDir, {
        syncSiblingAgents: true,
      });
      nextConfig = applyAuthProfileConfig(nextConfig, {
        profileId,
        provider: "openai-codex",
        mode: "oauth",
      });
      if (params.setDefaultModel) {
        const applied = applyOpenAICodexModelDefault(nextConfig);
        nextConfig = applied.next;
        if (applied.changed) {
          await params.prompter.note(
            `Default model set to ${OPENAI_CODEX_DEFAULT_MODEL}`,
            "Model configured",
          );
        }
      } else {
        agentModelOverride = OPENAI_CODEX_DEFAULT_MODEL;
        await noteAgentModel(OPENAI_CODEX_DEFAULT_MODEL);
      }
<<<<<<< HEAD
    } catch (err) {
      spin.stop("OpenAI OAuth failed");
      params.runtime.error(String(err));
      await params.prompter.note(
        "Trouble with OAuth? See https://docs.molt.bot/start/faq",
        "OAuth help",
      );
=======
>>>>>>> 86e4fe0a7 (Auth: land codex oauth onboarding flow (#15406))
    }
    return { config: nextConfig, agentModelOverride };
  }

  return null;
}
