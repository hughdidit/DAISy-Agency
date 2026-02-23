<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { RuntimeEnv } from "../../runtime.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { logConfigUpdated } from "../../config/logging.js";
import { resolveAgentModelPrimaryValue } from "../../config/model-input.js";
import type { RuntimeEnv } from "../../runtime.js";
import { applyDefaultModelPrimaryUpdate, updateConfig } from "./shared.js";
=======
=======
import type { RuntimeEnv } from "../../runtime.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { loadModelCatalog } from "../../agents/model-catalog.js";
import { modelKey } from "../../agents/model-selection.js";
import { readConfigFileSnapshot } from "../../config/config.js";
import { logConfigUpdated } from "../../config/logging.js";
import type { RuntimeEnv } from "../../runtime.js";
import { applyDefaultModelPrimaryUpdate, resolveModelTarget, updateConfig } from "./shared.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { logConfigUpdated } from "../../config/logging.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { RuntimeEnv } from "../../runtime.js";
import { logConfigUpdated } from "../../config/logging.js";
import { applyDefaultModelPrimaryUpdate, updateConfig } from "./shared.js";
>>>>>>> f44e3b2a3 (revert: fix models set catalog validation (#19194))

export async function modelsSetCommand(modelRaw: string, runtime: RuntimeEnv) {
  const updated = await updateConfig((cfg) => {
    return applyDefaultModelPrimaryUpdate({ cfg, modelRaw, field: "model" });
  });

  logConfigUpdated(runtime);
  runtime.log(
    `Default model: ${resolveAgentModelPrimaryValue(updated.agents?.defaults?.model) ?? modelRaw}`,
  );
}
