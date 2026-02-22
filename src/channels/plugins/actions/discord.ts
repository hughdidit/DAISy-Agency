<<<<<<< HEAD
<<<<<<< HEAD
import type { ChannelMessageActionAdapter, ChannelMessageActionName } from "../types.js";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { createActionGate } from "../../../agents/tools/common.js";
=======
>>>>>>> 2b3ecee7c (fix(actions): layer per-account gate fallback)
import type { DiscordActionConfig } from "../../../config/types.discord.js";
import { createDiscordActionGate, listEnabledDiscordAccounts } from "../../../discord/accounts.js";
import type { ChannelMessageActionAdapter, ChannelMessageActionName } from "../types.js";
import { handleDiscordMessageAction } from "./discord/handle-action.js";
import { createUnionActionGate, listTokenSourcedAccounts } from "./shared.js";

export const discordMessageActions: ChannelMessageActionAdapter = {
  listActions: ({ cfg }) => {
    const accounts = listTokenSourcedAccounts(listEnabledDiscordAccounts(cfg));
    if (accounts.length === 0) {
      return [];
    }
<<<<<<< HEAD
    const gate = createActionGate(cfg.channels?.discord?.actions);
=======
    // Union of all accounts' action gates (any account enabling an action makes it available)
    const gate = createUnionActionGate(accounts, (account) =>
      createDiscordActionGate({
        cfg,
        accountId: account.accountId,
      }),
    );
<<<<<<< HEAD
    const gate = (key: keyof DiscordActionConfig, defaultValue = true) =>
      gates.some((g) => g(key, defaultValue));
>>>>>>> 2b3ecee7c (fix(actions): layer per-account gate fallback)
=======
    const isEnabled = (key: keyof DiscordActionConfig, defaultValue = true) =>
      gate(key, defaultValue);
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
    const actions = new Set<ChannelMessageActionName>(["send"]);
    if (isEnabled("polls")) {
      actions.add("poll");
    }
    if (isEnabled("reactions")) {
      actions.add("react");
      actions.add("reactions");
    }
    if (isEnabled("messages")) {
      actions.add("read");
      actions.add("edit");
      actions.add("delete");
    }
    if (isEnabled("pins")) {
      actions.add("pin");
      actions.add("unpin");
      actions.add("list-pins");
    }
    if (isEnabled("permissions")) {
      actions.add("permissions");
    }
    if (isEnabled("threads")) {
      actions.add("thread-create");
      actions.add("thread-list");
      actions.add("thread-reply");
    }
    if (isEnabled("search")) {
      actions.add("search");
    }
    if (isEnabled("stickers")) {
      actions.add("sticker");
    }
    if (isEnabled("memberInfo")) {
      actions.add("member-info");
    }
    if (isEnabled("roleInfo")) {
      actions.add("role-info");
    }
    if (isEnabled("reactions")) {
      actions.add("emoji-list");
    }
    if (isEnabled("emojiUploads")) {
      actions.add("emoji-upload");
    }
    if (isEnabled("stickerUploads")) {
      actions.add("sticker-upload");
    }
    if (isEnabled("roles", false)) {
      actions.add("role-add");
      actions.add("role-remove");
    }
    if (isEnabled("channelInfo")) {
      actions.add("channel-info");
      actions.add("channel-list");
    }
    if (isEnabled("channels")) {
      actions.add("channel-create");
      actions.add("channel-edit");
      actions.add("channel-delete");
      actions.add("channel-move");
      actions.add("category-create");
      actions.add("category-edit");
      actions.add("category-delete");
    }
    if (isEnabled("voiceStatus")) {
      actions.add("voice-status");
    }
    if (isEnabled("events")) {
      actions.add("event-list");
      actions.add("event-create");
    }
    if (isEnabled("moderation", false)) {
      actions.add("timeout");
      actions.add("kick");
      actions.add("ban");
    }
    if (isEnabled("presence", false)) {
      actions.add("set-presence");
    }
    return Array.from(actions);
  },
  extractToolSend: ({ args }) => {
    const action = typeof args.action === "string" ? args.action.trim() : "";
    if (action === "sendMessage") {
      const to = typeof args.to === "string" ? args.to : undefined;
      return to ? { to } : null;
    }
    if (action === "threadReply") {
      const channelId = typeof args.channelId === "string" ? args.channelId.trim() : "";
      return channelId ? { to: `channel:${channelId}` } : null;
    }
    return null;
  },
  handleAction: async ({
    action,
    params,
    cfg,
    accountId,
    requesterSenderId,
    toolContext,
    mediaLocalRoots,
  }) => {
    return await handleDiscordMessageAction({
      action,
      params,
      cfg,
      accountId,
      requesterSenderId,
      toolContext,
      mediaLocalRoots,
    });
  },
};
