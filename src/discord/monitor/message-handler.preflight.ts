import { ChannelType, MessageType, type User } from "@buape/carbon";

import { hasControlCommand } from "../../auto-reply/command-detection.js";
import { shouldHandleTextCommands } from "../../auto-reply/commands-registry.js";
import {
  recordPendingHistoryEntryIfEnabled,
  type HistoryEntry,
} from "../../auto-reply/reply/history.js";
import {
  buildMentionRegexes,
  matchesMentionWithExplicit,
} from "../../auto-reply/reply/mentions.js";
<<<<<<< HEAD
=======
import { formatAllowlistMatchMeta } from "../../channels/allowlist-match.js";
import { resolveControlCommandGate } from "../../channels/command-gating.js";
import { logInboundDrop } from "../../channels/logging.js";
import { resolveMentionGatingWithBypass } from "../../channels/mention-gating.js";
import { loadConfig } from "../../config/config.js";
import { isDangerousNameMatchingEnabled } from "../../config/dangerous-name-matching.js";
>>>>>>> 161d9841d (refactor(security): unify dangerous name matching handling)
import { logVerbose, shouldLogVerbose } from "../../globals.js";
import { recordChannelActivity } from "../../infra/channel-activity.js";
import {
  getSessionBindingService,
  type SessionBindingRecord,
} from "../../infra/outbound/session-binding-service.js";
import { enqueueSystemEvent } from "../../infra/system-events.js";
import { getChildLogger } from "../../logging.js";
import { buildPairingReply } from "../../pairing/pairing-messages.js";
import { upsertChannelPairingRequest } from "../../pairing/pairing-store.js";
import { resolveAgentRoute } from "../../routing/resolve-route.js";
<<<<<<< HEAD
import { resolveMentionGatingWithBypass } from "../../channels/mention-gating.js";
import { formatAllowlistMatchMeta } from "../../channels/allowlist-match.js";
=======
import { DEFAULT_ACCOUNT_ID, resolveAgentIdFromSessionKey } from "../../routing/session-key.js";
import { readStoreAllowFromForDmPolicy } from "../../security/dm-policy-shared.js";
import { fetchPluralKitMessageInfo } from "../pluralkit.js";
>>>>>>> bce643a0b (refactor(security): enforce account-scoped pairing APIs)
import { sendMessageDiscord } from "../send.js";
import { resolveControlCommandGate } from "../../channels/command-gating.js";
import { logInboundDrop } from "../../channels/logging.js";
import {
  allowListMatches,
  isDiscordGroupAllowedByPolicy,
  normalizeDiscordAllowList,
  normalizeDiscordSlug,
  resolveDiscordAllowListMatch,
  resolveDiscordChannelConfigWithFallback,
  resolveDiscordGuildEntry,
  resolveDiscordShouldRequireMention,
  resolveDiscordUserAllowed,
  resolveGroupDmAllow,
} from "./allow-list.js";
import {
  formatDiscordUserTag,
  resolveDiscordSystemLocation,
  resolveTimestampMs,
} from "./format.js";
import type {
  DiscordMessagePreflightContext,
  DiscordMessagePreflightParams,
} from "./message-handler.preflight.types.js";
import { resolveDiscordChannelInfo, resolveDiscordMessageText } from "./message-utils.js";
import { resolveDiscordSystemEvent } from "./system-events.js";
<<<<<<< HEAD
=======
import { isRecentlyUnboundThreadWebhookMessage } from "./thread-bindings.js";
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
import { resolveDiscordThreadChannel, resolveDiscordThreadParentInfo } from "./threading.js";

export type {
  DiscordMessagePreflightContext,
  DiscordMessagePreflightParams,
} from "./message-handler.preflight.types.js";

<<<<<<< HEAD
=======
export function resolvePreflightMentionRequirement(params: {
  shouldRequireMention: boolean;
  isBoundThreadSession: boolean;
}): boolean {
  if (!params.shouldRequireMention) {
    return false;
  }
  return !params.isBoundThreadSession;
}

export function shouldIgnoreBoundThreadWebhookMessage(params: {
  accountId?: string;
  threadId?: string;
  webhookId?: string | null;
  threadBinding?: SessionBindingRecord;
}): boolean {
  const webhookId = params.webhookId?.trim() || "";
  if (!webhookId) {
    return false;
  }
  const boundWebhookId =
    typeof params.threadBinding?.metadata?.webhookId === "string"
      ? params.threadBinding.metadata.webhookId.trim()
      : "";
  if (!boundWebhookId) {
    const threadId = params.threadId?.trim() || "";
    if (!threadId) {
      return false;
    }
    return isRecentlyUnboundThreadWebhookMessage({
      accountId: params.accountId,
      threadId,
      webhookId,
    });
  }
  return webhookId === boundWebhookId;
}

>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
export async function preflightDiscordMessage(
  params: DiscordMessagePreflightParams,
): Promise<DiscordMessagePreflightContext | null> {
  const logger = getChildLogger({ module: "discord-auto-reply" });
  const message = params.data.message;
  const author = params.data.author;
  if (!author) return null;

  const allowBots = params.discordConfig?.allowBots ?? false;
  if (author.bot) {
    // Always ignore own messages to prevent self-reply loops
    if (params.botUserId && author.id === params.botUserId) return null;
    if (!allowBots) {
      logVerbose("discord: drop bot message (allowBots=false)");
      return null;
    }
  }

  const isGuildMessage = Boolean(params.data.guild_id);
  const channelInfo = await resolveDiscordChannelInfo(params.client, message.channelId);
  const isDirectMessage = channelInfo?.type === ChannelType.DM;
  const isGroupDm = channelInfo?.type === ChannelType.GroupDM;

  if (isGroupDm && !params.groupDmEnabled) {
    logVerbose("discord: drop group dm (group dms disabled)");
    return null;
  }
  if (isDirectMessage && !params.dmEnabled) {
    logVerbose("discord: drop dm (dms disabled)");
    return null;
  }

<<<<<<< HEAD
  const dmPolicy = params.discordConfig?.dm?.policy ?? "pairing";
=======
  const dmPolicy = params.discordConfig?.dmPolicy ?? params.discordConfig?.dm?.policy ?? "pairing";
  const resolvedAccountId = params.accountId ?? DEFAULT_ACCOUNT_ID;
>>>>>>> bce643a0b (refactor(security): enforce account-scoped pairing APIs)
  let commandAuthorized = true;
  if (isDirectMessage) {
    if (dmPolicy === "disabled") {
      logVerbose("discord: drop dm (dmPolicy: disabled)");
      return null;
    }
    if (dmPolicy !== "open") {
<<<<<<< HEAD
      const storeAllowFrom = await readChannelAllowFromStore("discord").catch(() => []);
=======
      const storeAllowFrom = await readStoreAllowFromForDmPolicy({
        provider: "discord",
        accountId: resolvedAccountId,
        dmPolicy,
      });
>>>>>>> bce643a0b (refactor(security): enforce account-scoped pairing APIs)
      const effectiveAllowFrom = [...(params.allowFrom ?? []), ...storeAllowFrom];
      const allowList = normalizeDiscordAllowList(effectiveAllowFrom, ["discord:", "user:"]);
      const allowMatch = allowList
        ? resolveDiscordAllowListMatch({
            allowList,
            candidate: {
              id: author.id,
              name: author.username,
              tag: formatDiscordUserTag(author),
            },
            allowNameMatching: isDangerousNameMatchingEnabled(params.discordConfig),
          })
        : { allowed: false };
      const allowMatchMeta = formatAllowlistMatchMeta(allowMatch);
      const permitted = allowMatch.allowed;
      if (!permitted) {
        commandAuthorized = false;
        if (dmPolicy === "pairing") {
          const { code, created } = await upsertChannelPairingRequest({
            channel: "discord",
            id: author.id,
            accountId: resolvedAccountId,
            meta: {
              tag: formatDiscordUserTag(author),
              name: author.username ?? undefined,
            },
          });
          if (created) {
            logVerbose(
              `discord pairing request sender=${author.id} tag=${formatDiscordUserTag(author)} (${allowMatchMeta})`,
            );
            try {
              await sendMessageDiscord(
                `user:${author.id}`,
                buildPairingReply({
                  channel: "discord",
                  idLine: `Your Discord user id: ${author.id}`,
                  code,
                }),
                {
                  token: params.token,
                  rest: params.client.rest,
                  accountId: params.accountId,
                },
              );
            } catch (err) {
              logVerbose(`discord pairing reply failed for ${author.id}: ${String(err)}`);
            }
          }
        } else {
          logVerbose(
            `Blocked unauthorized discord sender ${author.id} (dmPolicy=${dmPolicy}, ${allowMatchMeta})`,
          );
        }
        return null;
      }
      commandAuthorized = true;
    }
  }

  const botId = params.botUserId;
  const baseText = resolveDiscordMessageText(message, {
    includeForwarded: false,
  });
  const messageText = resolveDiscordMessageText(message, {
    includeForwarded: true,
  });
  recordChannelActivity({
    channel: "discord",
    accountId: params.accountId,
    direction: "inbound",
  });
  const route = resolveAgentRoute({
    cfg: params.cfg,
    channel: "discord",
    accountId: params.accountId,
    guildId: params.data.guild_id ?? undefined,
    peer: {
      kind: isDirectMessage ? "dm" : isGroupDm ? "group" : "channel",
      id: isDirectMessage ? author.id : message.channelId,
    },
  });
<<<<<<< HEAD
  const mentionRegexes = buildMentionRegexes(params.cfg, route.agentId);
=======
  let threadBinding: SessionBindingRecord | undefined;
  if (earlyThreadChannel) {
    threadBinding =
      getSessionBindingService().resolveByConversation({
        channel: "discord",
        accountId: params.accountId,
        conversationId: messageChannelId,
      }) ?? undefined;
  }
  if (
    shouldIgnoreBoundThreadWebhookMessage({
      accountId: params.accountId,
      threadId: messageChannelId,
      webhookId,
      threadBinding,
    })
  ) {
    logVerbose(`discord: drop bound-thread webhook echo message ${message.id}`);
    return null;
  }
  const boundSessionKey = threadBinding?.targetSessionKey?.trim();
  const boundAgentId = boundSessionKey ? resolveAgentIdFromSessionKey(boundSessionKey) : undefined;
  const effectiveRoute = boundSessionKey
    ? {
        ...route,
        sessionKey: boundSessionKey,
        agentId: boundAgentId ?? route.agentId,
      }
    : route;
  const mentionRegexes = buildMentionRegexes(params.cfg, effectiveRoute.agentId);
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
  const explicitlyMentioned = Boolean(
    botId && message.mentionedUsers?.some((user: User) => user.id === botId),
  );
  const hasAnyMention = Boolean(
    !isDirectMessage &&
    (message.mentionedEveryone ||
      (message.mentionedUsers?.length ?? 0) > 0 ||
      (message.mentionedRoles?.length ?? 0) > 0),
  );
  const wasMentioned =
    !isDirectMessage &&
    matchesMentionWithExplicit({
      text: baseText,
      mentionRegexes,
      explicit: {
        hasAnyMention,
        isExplicitlyMentioned: explicitlyMentioned,
        canResolveExplicit: Boolean(botId),
      },
    });
  const implicitMention = Boolean(
    !isDirectMessage &&
    botId &&
    message.referencedMessage?.author?.id &&
    message.referencedMessage.author.id === botId,
  );
  if (shouldLogVerbose()) {
    logVerbose(
      `discord: inbound id=${message.id} guild=${message.guild?.id ?? "dm"} channel=${message.channelId} mention=${wasMentioned ? "yes" : "no"} type=${isDirectMessage ? "dm" : isGroupDm ? "group-dm" : "guild"} content=${messageText ? "yes" : "no"}`,
    );
  }

  if (
    isGuildMessage &&
    (message.type === MessageType.ChatInputCommand ||
      message.type === MessageType.ContextMenuCommand)
  ) {
    logVerbose("discord: drop channel command message");
    return null;
  }

  const guildInfo = isGuildMessage
    ? resolveDiscordGuildEntry({
        guild: params.data.guild ?? undefined,
        guildEntries: params.guildEntries,
      })
    : null;
  if (
    isGuildMessage &&
    params.guildEntries &&
    Object.keys(params.guildEntries).length > 0 &&
    !guildInfo
  ) {
    logVerbose(
      `Blocked discord guild ${params.data.guild_id ?? "unknown"} (not in discord.guilds)`,
    );
    return null;
  }

  const channelName =
    channelInfo?.name ??
    ((isGuildMessage || isGroupDm) && message.channel && "name" in message.channel
      ? message.channel.name
      : undefined);
  const threadChannel = resolveDiscordThreadChannel({
    isGuildMessage,
    message,
    channelInfo,
  });
  let threadParentId: string | undefined;
  let threadParentName: string | undefined;
  let threadParentType: ChannelType | undefined;
  if (threadChannel) {
    const parentInfo = await resolveDiscordThreadParentInfo({
      client: params.client,
      threadChannel,
      channelInfo,
    });
    threadParentId = parentInfo.id;
    threadParentName = parentInfo.name;
    threadParentType = parentInfo.type;
  }
  const threadName = threadChannel?.name;
  const configChannelName = threadParentName ?? channelName;
  const configChannelSlug = configChannelName ? normalizeDiscordSlug(configChannelName) : "";
  const displayChannelName = threadName ?? channelName;
  const displayChannelSlug = displayChannelName ? normalizeDiscordSlug(displayChannelName) : "";
  const guildSlug =
    guildInfo?.slug ||
    (params.data.guild?.name ? normalizeDiscordSlug(params.data.guild.name) : "");

  const threadChannelSlug = channelName ? normalizeDiscordSlug(channelName) : "";
  const threadParentSlug = threadParentName ? normalizeDiscordSlug(threadParentName) : "";

  const baseSessionKey = route.sessionKey;
  const channelConfig = isGuildMessage
    ? resolveDiscordChannelConfigWithFallback({
        guildInfo,
        channelId: message.channelId,
        channelName,
        channelSlug: threadChannelSlug,
        parentId: threadParentId ?? undefined,
        parentName: threadParentName ?? undefined,
        parentSlug: threadParentSlug,
        scope: threadChannel ? "thread" : "channel",
      })
    : null;
  const channelMatchMeta = formatAllowlistMatchMeta(channelConfig);
  if (isGuildMessage && channelConfig?.enabled === false) {
    logVerbose(
      `Blocked discord channel ${message.channelId} (channel disabled, ${channelMatchMeta})`,
    );
    return null;
  }

  const groupDmAllowed =
    isGroupDm &&
    resolveGroupDmAllow({
      channels: params.groupDmChannels,
      channelId: message.channelId,
      channelName: displayChannelName,
      channelSlug: displayChannelSlug,
    });
  if (isGroupDm && !groupDmAllowed) return null;

  const channelAllowlistConfigured =
    Boolean(guildInfo?.channels) && Object.keys(guildInfo?.channels ?? {}).length > 0;
  const channelAllowed = channelConfig?.allowed !== false;
  if (
    isGuildMessage &&
    !isDiscordGroupAllowedByPolicy({
      groupPolicy: params.groupPolicy,
      guildAllowlisted: Boolean(guildInfo),
      channelAllowlistConfigured,
      channelAllowed,
    })
  ) {
    if (params.groupPolicy === "disabled") {
      logVerbose(`discord: drop guild message (groupPolicy: disabled, ${channelMatchMeta})`);
    } else if (!channelAllowlistConfigured) {
      logVerbose(
        `discord: drop guild message (groupPolicy: allowlist, no channel allowlist, ${channelMatchMeta})`,
      );
    } else {
      logVerbose(
        `Blocked discord channel ${message.channelId} not in guild channel allowlist (groupPolicy: allowlist, ${channelMatchMeta})`,
      );
    }
    return null;
  }

  if (isGuildMessage && channelConfig?.allowed === false) {
    logVerbose(
      `Blocked discord channel ${message.channelId} not in guild channel allowlist (${channelMatchMeta})`,
    );
    return null;
  }
  if (isGuildMessage) {
    logVerbose(`discord: allow channel ${message.channelId} (${channelMatchMeta})`);
  }

  const textForHistory = resolveDiscordMessageText(message, {
    includeForwarded: true,
  });
  const historyEntry =
    isGuildMessage && params.historyLimit > 0 && textForHistory
      ? ({
          sender: params.data.member?.nickname ?? author.globalName ?? author.username ?? author.id,
          body: textForHistory,
          timestamp: resolveTimestampMs(message.timestamp),
          messageId: message.id,
        } satisfies HistoryEntry)
      : undefined;

  const threadOwnerId = threadChannel ? (threadChannel.ownerId ?? channelInfo?.ownerId) : undefined;
  const shouldRequireMention = resolveDiscordShouldRequireMention({
    isGuildMessage,
    isThread: Boolean(threadChannel),
    botId,
    threadOwnerId,
    channelConfig,
    guildInfo,
  });
  const allowTextCommands = shouldHandleTextCommands({
    cfg: params.cfg,
    surface: "discord",
  });
  const hasControlCommandInMessage = hasControlCommand(baseText, params.cfg);
<<<<<<< HEAD
=======
  const { hasAccessRestrictions, memberAllowed } = resolveDiscordMemberAccessState({
    channelConfig,
    guildInfo,
    memberRoleIds,
    sender,
    allowNameMatching: isDangerousNameMatchingEnabled(params.discordConfig),
  });
>>>>>>> cfa44ea6b (fix(security): make allowFrom id-only by default with dangerous name opt-in (#24907))

  if (!isDirectMessage) {
    const ownerAllowList = normalizeDiscordAllowList(params.allowFrom, ["discord:", "user:"]);
    const ownerOk = ownerAllowList
<<<<<<< HEAD
      ? allowListMatches(ownerAllowList, {
          id: author.id,
          name: author.username,
          tag: formatDiscordUserTag(author),
        })
=======
      ? allowListMatches(
          ownerAllowList,
          {
            id: sender.id,
            name: sender.name,
            tag: sender.tag,
          },
          { allowNameMatching: isDangerousNameMatchingEnabled(params.discordConfig) },
        )
>>>>>>> cfa44ea6b (fix(security): make allowFrom id-only by default with dangerous name opt-in (#24907))
      : false;
    const channelUsers = channelConfig?.users ?? guildInfo?.users;
    const usersOk =
      Array.isArray(channelUsers) && channelUsers.length > 0
        ? resolveDiscordUserAllowed({
            allowList: channelUsers,
            userId: author.id,
            userName: author.username,
            userTag: formatDiscordUserTag(author),
          })
        : false;
    const useAccessGroups = params.cfg.commands?.useAccessGroups !== false;
    const commandGate = resolveControlCommandGate({
      useAccessGroups,
      authorizers: [
        { configured: ownerAllowList != null, allowed: ownerOk },
        { configured: Array.isArray(channelUsers) && channelUsers.length > 0, allowed: usersOk },
      ],
      modeWhenAccessGroupsOff: "configured",
      allowTextCommands,
      hasControlCommand: hasControlCommandInMessage,
    });
    commandAuthorized = commandGate.commandAuthorized;

    if (commandGate.shouldBlock) {
      logInboundDrop({
        log: logVerbose,
        channel: "discord",
        reason: "control command (unauthorized)",
        target: author.id,
      });
      return null;
    }
  }

  const canDetectMention = Boolean(botId) || mentionRegexes.length > 0;
  const mentionGate = resolveMentionGatingWithBypass({
    isGroup: isGuildMessage,
    requireMention: Boolean(shouldRequireMention),
    canDetectMention,
    wasMentioned,
    implicitMention,
    hasAnyMention,
    allowTextCommands,
    hasControlCommand: hasControlCommandInMessage,
    commandAuthorized,
  });
  const effectiveWasMentioned = mentionGate.effectiveWasMentioned;
  if (isGuildMessage && shouldRequireMention) {
    if (botId && mentionGate.shouldSkip) {
      logVerbose(`discord: drop guild message (mention required, botId=${botId})`);
      logger.info(
        {
          channelId: message.channelId,
          reason: "no-mention",
        },
        "discord: skipping guild message",
      );
      recordPendingHistoryEntryIfEnabled({
        historyMap: params.guildHistories,
        historyKey: message.channelId,
        limit: params.historyLimit,
        entry: historyEntry ?? null,
      });
      return null;
    }
  }

  if (isGuildMessage) {
    const channelUsers = channelConfig?.users ?? guildInfo?.users;
    if (Array.isArray(channelUsers) && channelUsers.length > 0) {
      const userOk = resolveDiscordUserAllowed({
        allowList: channelUsers,
        userId: author.id,
        userName: author.username,
        userTag: formatDiscordUserTag(author),
      });
      if (!userOk) {
        logVerbose(`Blocked discord guild sender ${author.id} (not in channel users allowlist)`);
        return null;
      }
    }
  }

  const systemLocation = resolveDiscordSystemLocation({
    isDirectMessage,
    isGroupDm,
    guild: params.data.guild ?? undefined,
    channelName: channelName ?? message.channelId,
  });
  const systemText = resolveDiscordSystemEvent(message, systemLocation);
  if (systemText) {
    enqueueSystemEvent(systemText, {
      sessionKey: route.sessionKey,
      contextKey: `discord:system:${message.channelId}:${message.id}`,
    });
    return null;
  }

  if (!messageText) {
    logVerbose(`discord: drop message ${message.id} (empty content)`);
    return null;
  }

  return {
    cfg: params.cfg,
    discordConfig: params.discordConfig,
    accountId: params.accountId,
    token: params.token,
    runtime: params.runtime,
    botUserId: params.botUserId,
    guildHistories: params.guildHistories,
    historyLimit: params.historyLimit,
    mediaMaxBytes: params.mediaMaxBytes,
    textLimit: params.textLimit,
    replyToMode: params.replyToMode,
    ackReactionScope: params.ackReactionScope,
    groupPolicy: params.groupPolicy,
    data: params.data,
    client: params.client,
    message,
    author,
    channelInfo,
    channelName,
    isGuildMessage,
    isDirectMessage,
    isGroupDm,
    commandAuthorized,
    baseText,
    messageText,
    wasMentioned,
    route,
    guildInfo,
    guildSlug,
    threadChannel,
    threadParentId,
    threadParentName,
    threadParentType,
    threadName,
    configChannelName,
    configChannelSlug,
    displayChannelName,
    displayChannelSlug,
    baseSessionKey,
    channelConfig,
    channelAllowlistConfigured,
    channelAllowed,
    shouldRequireMention,
    hasAnyMention,
    allowTextCommands,
    shouldBypassMention: mentionGate.shouldBypassMention,
    effectiveWasMentioned,
    canDetectMention,
    historyEntry,
  };
}
