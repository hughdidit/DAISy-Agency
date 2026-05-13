import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { resolveLearningElfConfig } from "./config.js";
import { registerElfCli } from "./src/cli.js";

const learningElfPlugin = {
  id: "learning-elf",
  name: "DAISy Evolutionary Learning Fabric",
  description: "Governed fixture-mode evolutionary learning for DAISy candidate proposals",
  version: "2026.1.0-beta.1",
  register(api: OpenClawPluginApi) {
    const config = resolveLearningElfConfig(api.pluginConfig);
    api.registerCli(
      ({ program, logger }) => {
        registerElfCli({ program, config, logger });
      },
      { commands: ["elf"] },
    );
  },
};

export default learningElfPlugin;
