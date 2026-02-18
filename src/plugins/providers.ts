import { createSubsystemLogger } from "../logging/subsystem.js";
<<<<<<< HEAD
import { loadMoltbotPlugins, type PluginLoadOptions } from "./loader.js";
=======
import { loadOpenClawPlugins, type PluginLoadOptions } from "./loader.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { createPluginLoaderLogger } from "./logger.js";
>>>>>>> aa8f87a3b (refactor(plugins): reuse plugin loader logger adapter)
import type { ProviderPlugin } from "./types.js";
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { ProviderPlugin } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { ProviderPlugin } from "./types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

const log = createSubsystemLogger("plugins");

export function resolvePluginProviders(params: {
  config?: PluginLoadOptions["config"];
  workspaceDir?: string;
}): ProviderPlugin[] {
  const registry = loadMoltbotPlugins({
    config: params.config,
    workspaceDir: params.workspaceDir,
    logger: createPluginLoaderLogger(log),
  });

  return registry.providers.map((entry) => entry.provider);
}
