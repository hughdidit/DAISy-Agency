import { ensureAuthProfileStore, listProfilesForProvider } from "../agents/auth-profiles.js";
import { getCustomProviderApiKey, resolveEnvApiKey } from "../agents/model-auth.js";
import { loadModelCatalog } from "../agents/model-catalog.js";
import { resolveConfiguredModelRef } from "../agents/model-selection.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { OpenClawConfig } from "../config/config.js";
import type { WizardPrompter } from "../wizard/prompts.js";
=======
>>>>>>> ed11e93cf (chore(format))
=======
=======
import { resolveDefaultModelForAgent } from "../agents/model-selection.js";
>>>>>>> a4c373935 (fix(agents): fall back to agents.defaults.model when agent has no model config (#24210))
import type { OpenClawConfig } from "../config/config.js";
import type { WizardPrompter } from "../wizard/prompts.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { OpenClawConfig } from "../config/config.js";
import type { WizardPrompter } from "../wizard/prompts.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { OPENAI_CODEX_DEFAULT_MODEL } from "./openai-codex-model-default.js";

export async function warnIfModelConfigLooksOff(
  config: OpenClawConfig,
  prompter: WizardPrompter,
  options?: { agentId?: string; agentDir?: string },
) {
  const ref = resolveDefaultModelForAgent({
    cfg: config,
    agentId: options?.agentId,
  });
  const warnings: string[] = [];
  const catalog = await loadModelCatalog({
    config,
    useCache: false,
  });
  if (catalog.length > 0) {
    const known = catalog.some(
      (entry) => entry.provider === ref.provider && entry.id === ref.model,
    );
    if (!known) {
      warnings.push(
        `Model not found: ${ref.provider}/${ref.model}. Update agents.defaults.model or run /models list.`,
      );
    }
  }

  const store = ensureAuthProfileStore(options?.agentDir);
  const hasProfile = listProfilesForProvider(store, ref.provider).length > 0;
  const envKey = resolveEnvApiKey(ref.provider);
  const customKey = getCustomProviderApiKey(config, ref.provider);
  if (!hasProfile && !envKey && !customKey) {
    warnings.push(
      `No auth configured for provider "${ref.provider}". The agent may fail until credentials are added.`,
    );
  }

  if (ref.provider === "openai") {
    const hasCodex = listProfilesForProvider(store, "openai-codex").length > 0;
    if (hasCodex) {
      warnings.push(
        `Detected OpenAI Codex OAuth. Consider setting agents.defaults.model to ${OPENAI_CODEX_DEFAULT_MODEL}.`,
      );
    }
  }

  if (warnings.length > 0) {
    await prompter.note(warnings.join("\n"), "Model check");
  }
}
