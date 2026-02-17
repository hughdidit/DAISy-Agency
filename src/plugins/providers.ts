import type { ProviderPlugin } from "./types.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
<<<<<<< HEAD
import { loadMoltbotPlugins, type PluginLoadOptions } from "./loader.js";
=======
import { loadOpenClawPlugins, type PluginLoadOptions } from "./loader.js";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import type { ProviderPlugin } from "./types.js";
=======
>>>>>>> ed11e93cf (chore(format))

const log = createSubsystemLogger("plugins");

export function resolvePluginProviders(params: {
  config?: PluginLoadOptions["config"];
  workspaceDir?: string;
}): ProviderPlugin[] {
  const registry = loadMoltbotPlugins({
    config: params.config,
    workspaceDir: params.workspaceDir,
    logger: {
      info: (msg) => log.info(msg),
      warn: (msg) => log.warn(msg),
      error: (msg) => log.error(msg),
      debug: (msg) => log.debug(msg),
    },
  });

  return registry.providers.map((entry) => entry.provider);
}
