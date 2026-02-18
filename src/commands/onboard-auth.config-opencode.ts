<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { OPENCODE_ZEN_DEFAULT_MODEL_REF } from "../agents/opencode-zen-models.js";
<<<<<<< HEAD
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
=======
=======
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { OpenClawConfig } from "../config/config.js";
import { OPENCODE_ZEN_DEFAULT_MODEL_REF } from "../agents/opencode-zen-models.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { OPENCODE_ZEN_DEFAULT_MODEL_REF } from "../agents/opencode-zen-models.js";
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { OpenClawConfig } from "../config/config.js";
import { OPENCODE_ZEN_DEFAULT_MODEL_REF } from "../agents/opencode-zen-models.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { applyAgentDefaultModelPrimary } from "./onboard-auth.config-shared.js";
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

export function applyOpencodeZenProviderConfig(cfg: MoltbotConfig): MoltbotConfig {
  // Use the built-in opencode provider from pi-ai; only seed the allowlist alias.
  const models = { ...cfg.agents?.defaults?.models };
  models[OPENCODE_ZEN_DEFAULT_MODEL_REF] = {
    ...models[OPENCODE_ZEN_DEFAULT_MODEL_REF],
    alias: models[OPENCODE_ZEN_DEFAULT_MODEL_REF]?.alias ?? "Opus",
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

export function applyOpencodeZenConfig(cfg: MoltbotConfig): MoltbotConfig {
  const next = applyOpencodeZenProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, OPENCODE_ZEN_DEFAULT_MODEL_REF);
}
