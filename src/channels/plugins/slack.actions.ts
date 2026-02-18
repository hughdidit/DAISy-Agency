<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { createActionGate, readNumberParam, readStringParam } from "../../agents/tools/common.js";
import { handleSlackAction, type SlackActionContext } from "../../agents/tools/slack-actions.js";
import { listEnabledSlackAccounts } from "../../slack/accounts.js";
import { resolveSlackChannelId } from "../../slack/targets.js";
import type {
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMessageActionName,
  ChannelToolSend,
} from "./types.js";
=======
import type { ChannelMessageActionAdapter, ChannelMessageActionContext } from "./types.js";
import { readNumberParam, readStringParam } from "../../agents/tools/common.js";
=======
import type { ChannelMessageActionAdapter } from "./types.js";
>>>>>>> 93ca0ed54 (refactor(channels): dedupe transport and gateway test scaffolds)
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { ChannelMessageActionAdapter } from "./types.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { ChannelMessageActionAdapter } from "./types.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { handleSlackAction, type SlackActionContext } from "../../agents/tools/slack-actions.js";
import { handleSlackMessageAction } from "../../plugin-sdk/slack-message-actions.js";
import { extractSlackToolSend, listSlackMessageActions } from "../../slack/message-actions.js";
import { resolveSlackChannelId } from "../../slack/targets.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> f835eb32f (refactor(slack): share message action helpers)
=======
import type { ChannelMessageActionAdapter } from "./types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { ChannelMessageActionAdapter } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)

export function createSlackActions(providerId: string): ChannelMessageActionAdapter {
  return {
    listActions: ({ cfg }) => listSlackMessageActions(cfg),
    extractToolSend: ({ args }) => extractSlackToolSend(args),
    handleAction: async (ctx) => {
      return await handleSlackMessageAction({
        providerId,
        ctx,
        normalizeChannelId: resolveSlackChannelId,
        includeReadThreadId: true,
        invoke: async (action, cfg, toolContext) =>
          await handleSlackAction(action, cfg, toolContext as SlackActionContext | undefined),
      });
    },
  };
}
