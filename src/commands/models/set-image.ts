import { logConfigUpdated } from "../../config/logging.js";
<<<<<<< HEAD
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
=======
import type { RuntimeEnv } from "../../runtime.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { applyDefaultModelPrimaryUpdate, updateConfig } from "./shared.js";
>>>>>>> cb46ea037 (refactor(models): dedupe set default model updates)

export async function modelsSetImageCommand(modelRaw: string, runtime: RuntimeEnv) {
  const updated = await updateConfig((cfg) => {
    return applyDefaultModelPrimaryUpdate({ cfg, modelRaw, field: "imageModel" });
  });

  logConfigUpdated(runtime);
  runtime.log(`Image model: ${updated.agents?.defaults?.imageModel?.primary ?? modelRaw}`);
}
