import type { OpenClawPluginApi, OpenClawPluginService } from "openclaw/plugin-sdk";
import { resolveCronGuardPluginConfig } from "./config.js";
import { CronGuardPluginConfigSchema } from "./config-schema.js";
import { registerCronGuardCommands } from "./commands.js";
import { cronGuardGatewayHandlers } from "./gateway.js";
import { initializeCronGuardRuntime, stopCronGuardRuntime } from "./service.js";
import { createCronGuardTools } from "./tools.js";
import { CRON_GUARD_EVENTS } from "./types.js";

const cronGuardService: OpenClawPluginService = {
  id: "cron-guard-runtime",
  required: true,
  start: async () => undefined,
  stop: async () => {
    await stopCronGuardRuntime();
  },
};

export default {
  id: "cron-guard",
  name: "Cron Guard Plugin",
  description: "Least-privilege cron read wrappers with human approval for writes.",
  configSchema: {
    jsonSchema: CronGuardPluginConfigSchema,
  },
  register(api: OpenClawPluginApi) {
    const pluginConfig = resolveCronGuardPluginConfig(api.pluginConfig);

    api.registerTool((ctx) =>
      createCronGuardTools({
        config: pluginConfig,
        ctx: {
          agentId: ctx.agentId,
          sessionKey: ctx.sessionKey,
          messageChannel: ctx.messageChannel,
          requesterSenderId: ctx.requesterSenderId,
        },
      }),
    );

    for (const [method, handler] of Object.entries(cronGuardGatewayHandlers)) {
      api.registerGatewayMethod(method, handler);
    }
    for (const event of CRON_GUARD_EVENTS) {
      api.registerGatewayEvent(event);
    }

    registerCronGuardCommands(api, pluginConfig);
    api.registerService({
      ...cronGuardService,
      start: async (ctx) => {
        await initializeCronGuardRuntime({
          config: pluginConfig,
          stateDir: ctx.stateDir,
          logger: ctx.logger,
          broadcast: ctx.broadcast,
        });
      },
    });
  },
};
