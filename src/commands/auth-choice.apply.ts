import type { MoltbotConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import type { AuthChoice, OnboardOptions } from "./onboard-types.js";
import { applyAuthChoiceAnthropic } from "./auth-choice.apply.anthropic.js";
import { applyAuthChoiceApiProviders } from "./auth-choice.apply.api-providers.js";
import { applyAuthChoiceBytePlus } from "./auth-choice.apply.byteplus.js";
import { applyAuthChoiceCopilotProxy } from "./auth-choice.apply.copilot-proxy.js";
import { applyAuthChoiceGitHubCopilot } from "./auth-choice.apply.github-copilot.js";
import { applyAuthChoiceGoogleAntigravity } from "./auth-choice.apply.google-antigravity.js";
import { applyAuthChoiceGoogleGeminiCli } from "./auth-choice.apply.google-gemini-cli.js";
import { applyAuthChoiceMiniMax } from "./auth-choice.apply.minimax.js";
import { applyAuthChoiceOAuth } from "./auth-choice.apply.oauth.js";
import { applyAuthChoiceOpenAI } from "./auth-choice.apply.openai.js";
import { applyAuthChoiceQwenPortal } from "./auth-choice.apply.qwen-portal.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { AuthChoice } from "./onboard-types.js";
=======
=======
import { applyAuthChoiceVllm } from "./auth-choice.apply.vllm.js";
>>>>>>> e73d881c5 (Onboarding: add vLLM provider support)
import { applyAuthChoiceXAI } from "./auth-choice.apply.xai.js";
<<<<<<< HEAD
>>>>>>> db31c0ccc (feat: add xAI Grok provider support)
=======
import type { AuthChoice } from "./onboard-types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { applyAuthChoiceVllm } from "./auth-choice.apply.vllm.js";
import { applyAuthChoiceVolcengine } from "./auth-choice.apply.volcengine.js";
import { applyAuthChoiceXAI } from "./auth-choice.apply.xai.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> ed11e93cf (chore(format))
=======
import type { AuthChoice } from "./onboard-types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { AuthChoice } from "./onboard-types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
=======
>>>>>>> 559736a5a (feat(volcengine): integrate Volcengine & Byteplus Provider)

export type ApplyAuthChoiceParams = {
  authChoice: AuthChoice;
  config: MoltbotConfig;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
  agentDir?: string;
  setDefaultModel: boolean;
  agentId?: string;
  opts?: Partial<OnboardOptions>;
};

export type ApplyAuthChoiceResult = {
  config: MoltbotConfig;
  agentModelOverride?: string;
};

export async function applyAuthChoice(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult> {
  const handlers: Array<(p: ApplyAuthChoiceParams) => Promise<ApplyAuthChoiceResult | null>> = [
    applyAuthChoiceAnthropic,
    applyAuthChoiceVllm,
    applyAuthChoiceOpenAI,
    applyAuthChoiceOAuth,
    applyAuthChoiceApiProviders,
    applyAuthChoiceMiniMax,
    applyAuthChoiceGitHubCopilot,
    applyAuthChoiceGoogleAntigravity,
    applyAuthChoiceGoogleGeminiCli,
    applyAuthChoiceCopilotProxy,
    applyAuthChoiceQwenPortal,
    applyAuthChoiceXAI,
    applyAuthChoiceVolcengine,
    applyAuthChoiceBytePlus,
  ];

  for (const handler of handlers) {
    const result = await handler(params);
    if (result) {
      return result;
    }
  }

  return { config: params.config };
}
