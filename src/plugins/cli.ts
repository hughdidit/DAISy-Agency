import type { Command } from "commander";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { MoltbotConfig } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { loadMoltbotPlugins } from "./loader.js";
=======
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { OpenClawConfig } from "../config/config.js";
import type { PluginLogger } from "./types.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { OpenClawConfig } from "../config/config.js";
import type { PluginLogger } from "./types.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { OpenClawConfig } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { loadOpenClawPlugins } from "./loader.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import type { PluginLogger } from "./types.js";
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { PluginLogger } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { PluginLogger } from "./types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

const log = createSubsystemLogger("plugins");

export function registerPluginCliCommands(program: Command, cfg?: MoltbotConfig) {
  const config = cfg ?? loadConfig();
  const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
  const logger: PluginLogger = {
    info: (msg: string) => log.info(msg),
    warn: (msg: string) => log.warn(msg),
    error: (msg: string) => log.error(msg),
    debug: (msg: string) => log.debug(msg),
  };
  const registry = loadMoltbotPlugins({
    config,
    workspaceDir,
    logger,
  });

  const existingCommands = new Set(program.commands.map((cmd) => cmd.name()));

  for (const entry of registry.cliRegistrars) {
    if (entry.commands.length > 0) {
      const overlaps = entry.commands.filter((command) => existingCommands.has(command));
      if (overlaps.length > 0) {
        log.debug(
          `plugin CLI register skipped (${entry.pluginId}): command already registered (${overlaps.join(
            ", ",
          )})`,
        );
        continue;
      }
    }
    try {
      const result = entry.register({
        program,
        config,
        workspaceDir,
        logger,
      });
      if (result && typeof result.then === "function") {
        void result.catch((err) => {
          log.warn(`plugin CLI register failed (${entry.pluginId}): ${String(err)}`);
        });
      }
      for (const command of entry.commands) {
        existingCommands.add(command);
      }
    } catch (err) {
      log.warn(`plugin CLI register failed (${entry.pluginId}): ${String(err)}`);
    }
  }
}
