import type { OpenClawPluginApi, OpenClawPluginService } from "openclaw/plugin-sdk";
import { registerCronGuardCommands } from "./commands.js";
import { CronGuardPluginConfigSchema } from "./config-schema.js";
import { resolveCronGuardPluginConfig } from "./config.js";
import {
  createCronGuardApprovalButton,
  createCronGuardApprovalModal,
  DiscordCronGuardApprovalHandler,
} from "./discord-approvals.js";
import { cronGuardGatewayHandlers } from "./gateway.js";
import { initializeCronGuardRuntime, stopCronGuardRuntime } from "./service.js";
import { createCronGuardTools } from "./tools.js";
import { CRON_GUARD_EVENTS } from "./types.js";

function resolveCronGuardDiscordMonitorSkipReason(params: {
  entryEnabled: boolean;
  configEnabled: boolean;
  discordEnabled: boolean;
  approverCount: number;
}): string | null {
  if (!params.entryEnabled) {
    return "plugins.entries.cron-guard.enabled=false";
  }
  if (!params.configEnabled) {
    return "plugins.entries.cron-guard.config.enabled=false";
  }
  if (!params.discordEnabled) {
    return "plugins.entries.cron-guard.config.discord.enabled=false";
  }
  if (params.approverCount === 0) {
    return "plugins.entries.cron-guard.config.approvers is empty";
  }
  return null;
}

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
    api.registerDiscordMonitor(({ token, accountId, config: cfg, runtime }) => {
      const entry = cfg.plugins?.entries?.["cron-guard"];
      const currentConfig = resolveCronGuardPluginConfig(entry?.config);
      const skipReason = resolveCronGuardDiscordMonitorSkipReason({
        entryEnabled: entry?.enabled !== false,
        configEnabled: currentConfig.enabled,
        discordEnabled: currentConfig.discord.enabled,
        approverCount: currentConfig.approvers.length,
      });
      if (skipReason) {
        runtime.log(
          `[cron-guard] discord monitor skipped for account ${accountId}: ${skipReason}`,
        );
        return null;
      }
      const handler = new DiscordCronGuardApprovalHandler({
        token,
        accountId,
        config: currentConfig,
        cfg,
      });
      runtime.log(
        `[cron-guard] discord monitor active for account ${accountId}: components=1 modals=1 lifecycleHandlers=1 target=${currentConfig.discord.target} approvers=${currentConfig.approvers.length} runtimeId=${handler.getRuntimeId()}`,
      );
      return {
        components: [createCronGuardApprovalButton({ handler })],
        modals: [createCronGuardApprovalModal({ handler })],
        lifecycleHandlers: [handler],
      };
    });

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
