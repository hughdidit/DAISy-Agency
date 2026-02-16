<<<<<<< HEAD
import { logConfigUpdated } from "../../config/logging.js";
<<<<<<< HEAD
<<<<<<< HEAD
import type { RuntimeEnv } from "../../runtime.js";
import { resolveModelTarget, updateConfig } from "./shared.js";
=======
import {
  mergePrimaryFallbackConfig,
  type PrimaryFallbackConfig,
  resolveModelTarget,
  updateConfig,
} from "./shared.js";
>>>>>>> cbf6ee3a6 (refactor(models): share primary/fallback merge)
=======
import { applyDefaultModelPrimaryUpdate, updateConfig } from "./shared.js";
>>>>>>> cb46ea037 (refactor(models): dedupe set default model updates)
=======
import { loadModelCatalog } from "../../agents/model-catalog.js";
import { modelKey } from "../../agents/model-selection.js";
import { readConfigFileSnapshot } from "../../config/config.js";
import { logConfigUpdated } from "../../config/logging.js";
import type { RuntimeEnv } from "../../runtime.js";
import { applyDefaultModelPrimaryUpdate, resolveModelTarget, updateConfig } from "./shared.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)

export async function modelsSetCommand(modelRaw: string, runtime: RuntimeEnv) {
  const updated = await updateConfig((cfg) => {
    return applyDefaultModelPrimaryUpdate({ cfg, modelRaw, field: "model" });
  });

  logConfigUpdated(runtime);
  runtime.log(`Default model: ${updated.agents?.defaults?.model?.primary ?? modelRaw}`);
}
