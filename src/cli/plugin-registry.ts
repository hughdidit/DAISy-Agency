import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging.js";
<<<<<<< HEAD
import { loadMoltbotPlugins } from "../plugins/loader.js";
import type { PluginLogger } from "../plugins/types.js";
=======
import { loadOpenClawPlugins } from "../plugins/loader.js";
import { getActivePluginRegistry } from "../plugins/runtime.js";
<<<<<<< HEAD
>>>>>>> 9f507112b (perf(test): speed up vitest by skipping plugins + LLM slug)
=======
import type { PluginLogger } from "../plugins/types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)

const log = createSubsystemLogger("plugins");
let pluginRegistryLoaded = false;

export function ensurePluginRegistryLoaded(): void {
  if (pluginRegistryLoaded) {
    return;
  }
  const active = getActivePluginRegistry();
  // Tests (and callers) can pre-seed a registry (e.g. `test/setup.ts`); avoid
  // doing an expensive load when we already have plugins/channels/tools.
  if (
    active &&
    (active.plugins.length > 0 || active.channels.length > 0 || active.tools.length > 0)
  ) {
    pluginRegistryLoaded = true;
    return;
  }
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
