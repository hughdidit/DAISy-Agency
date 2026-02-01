import type { PluginLogger } from "../plugins/types.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging.js";
<<<<<<< HEAD
import { loadMoltbotPlugins } from "../plugins/loader.js";
import type { PluginLogger } from "../plugins/types.js";
=======
import { loadOpenClawPlugins } from "../plugins/loader.js";
>>>>>>> f06dd8df0 (chore: Enable "experimentalSortImports" in Oxfmt and reformat all imorts.)

const log = createSubsystemLogger("plugins");
let pluginRegistryLoaded = false;

export function ensurePluginRegistryLoaded(): void {
  if (pluginRegistryLoaded) return;
  const config = loadConfig();
  const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
  const logger: PluginLogger = {
    info: (msg) => log.info(msg),
    warn: (msg) => log.warn(msg),
    error: (msg) => log.error(msg),
    debug: (msg) => log.debug(msg),
  };
  loadMoltbotPlugins({
    config,
    workspaceDir,
    logger,
  });
  pluginRegistryLoaded = true;
}
