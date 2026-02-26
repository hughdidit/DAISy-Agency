import {
  ChannelType,
  type Client,
  MessageCreateListener,
  MessageReactionAddListener,
  MessageReactionRemoveListener,
  PresenceUpdateListener,
} from "@buape/carbon";

import { danger } from "../../globals.js";
import { formatDurationSeconds } from "../../infra/format-duration.js";
import { enqueueSystemEvent } from "../../infra/system-events.js";
import { setPresence } from "./presence-cache.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { resolveAgentRoute } from "../../routing/resolve-route.js";
import {
  normalizeDiscordSlug,
  resolveDiscordChannelConfigWithFallback,
  resolveDiscordGuildEntry,
  shouldEmitDiscordReactionNotification,
} from "./allow-list.js";
import { formatDiscordReactionEmoji, formatDiscordUserTag } from "./format.js";
import { resolveDiscordChannelInfo } from "./message-utils.js";

type LoadedConfig = ReturnType<typeof import("../../config/config.js").loadConfig>;
type RuntimeEnv = import("../../runtime.js").RuntimeEnv;
type Logger = ReturnType<typeof import("../../logging/subsystem.js").createSubsystemLogger>;

export type DiscordMessageEvent = Parameters<MessageCreateListener["handle"]>[0];

export type DiscordMessageHandler = (data: DiscordMessageEvent, client: Client) => Promise<void>;

type DiscordReactionEvent = Parameters<MessageReactionAddListener["handle"]>[0];

<<<<<<< HEAD
=======
type DiscordReactionListenerParams = {
  cfg: LoadedConfig;
  accountId: string;
  runtime: RuntimeEnv;
  botUserId?: string;
  allowNameMatching: boolean;
  guildEntries?: Record<string, import("./allow-list.js").DiscordGuildEntryResolved>;
  logger: Logger;
};

>>>>>>> cfa44ea6b (fix(security): make allowFrom id-only by default with dangerous name opt-in (#24907))
const DISCORD_SLOW_LISTENER_THRESHOLD_MS = 30_000;
const discordEventQueueLog = createSubsystemLogger("discord/event-queue");

function logSlowDiscordListener(params: {
  logger: Logger | undefined;
  listener: string;
  event: string;
  durationMs: number;
}) {
  if (params.durationMs < DISCORD_SLOW_LISTENER_THRESHOLD_MS) return;
  const duration = formatDurationSeconds(params.durationMs, {
    decimals: 1,
    unit: "seconds",
  });
  const message = `Slow listener detected: ${params.listener} took ${duration} for event ${params.event}`;
  const logger = params.logger ?? discordEventQueueLog;
  logger.warn("Slow listener detected", {
    listener: params.listener,
    event: params.event,
    durationMs: params.durationMs,
    duration,
    consoleMessage: message,
  });
}

export function registerDiscordListener(listeners: Array<object>, listener: object) {
  if (listeners.some((existing) => existing.constructor === listener.constructor)) {
    return false;
  }
  listeners.push(listener);
  return true;
}

export class DiscordMessageListener extends MessageCreateListener {
  constructor(
    private handler: DiscordMessageHandler,
    private logger?: Logger,
  ) {
    super();
  }

  async handle(data: DiscordMessageEvent, client: Client) {
    const startedAt = Date.now();
    const task = Promise.resolve(this.handler(data, client));
    void task
      .catch((err) => {
        const logger = this.logger ?? discordEventQueueLog;
        logger.error(danger(`discord handler failed: ${String(err)}`));
      })
      .finally(() => {
        logSlowDiscordListener({
          logger: this.logger,
          listener: this.constructor.name,
          event: this.type,
          durationMs: Date.now() - startedAt,
        });
      });
  }
}

export class DiscordReactionListener extends MessageReactionAddListener {
  constructor(
    private params: {
      cfg: LoadedConfig;
      accountId: string;
      runtime: RuntimeEnv;
      botUserId?: string;
      guildEntries?: Record<string, import("./allow-list.js").DiscordGuildEntryResolved>;
      logger: Logger;
    },
  ) {
    super();
  }

  async handle(data: DiscordReactionEvent, client: Client) {
    const startedAt = Date.now();
    try {
      await handleDiscordReactionEvent({
        data,
        client,
        action: "added",
        cfg: this.params.cfg,
        accountId: this.params.accountId,
        botUserId: this.params.botUserId,
        guildEntries: this.params.guildEntries,
        logger: this.params.logger,
      });
    } finally {
      logSlowDiscordListener({
        logger: this.params.logger,
        listener: this.constructor.name,
        event: this.type,
        durationMs: Date.now() - startedAt,
      });
    }
  }
}

export class DiscordReactionRemoveListener extends MessageReactionRemoveListener {
  constructor(
    private params: {
      cfg: LoadedConfig;
      accountId: string;
      runtime: RuntimeEnv;
      botUserId?: string;
      guildEntries?: Record<string, import("./allow-list.js").DiscordGuildEntryResolved>;
      logger: Logger;
    },
  ) {
    super();
  }

  async handle(data: DiscordReactionEvent, client: Client) {
    const startedAt = Date.now();
    try {
      await handleDiscordReactionEvent({
        data,
        client,
        action: "removed",
        cfg: this.params.cfg,
        accountId: this.params.accountId,
        botUserId: this.params.botUserId,
        guildEntries: this.params.guildEntries,
        logger: this.params.logger,
      });
    } finally {
      logSlowDiscordListener({
        logger: this.params.logger,
        listener: this.constructor.name,
        event: this.type,
        durationMs: Date.now() - startedAt,
      });
    }
  }
}

<<<<<<< HEAD
=======
async function runDiscordReactionHandler(params: {
  data: DiscordReactionEvent;
  client: Client;
  action: "added" | "removed";
  handlerParams: DiscordReactionListenerParams;
  listener: string;
  event: string;
}): Promise<void> {
  await runDiscordListenerWithSlowLog({
    logger: params.handlerParams.logger,
    listener: params.listener,
    event: params.event,
    run: () =>
      handleDiscordReactionEvent({
        data: params.data,
        client: params.client,
        action: params.action,
        cfg: params.handlerParams.cfg,
        accountId: params.handlerParams.accountId,
        botUserId: params.handlerParams.botUserId,
        allowNameMatching: params.handlerParams.allowNameMatching,
        guildEntries: params.handlerParams.guildEntries,
        logger: params.handlerParams.logger,
      }),
  });
}

<<<<<<< HEAD
>>>>>>> cfa44ea6b (fix(security): make allowFrom id-only by default with dangerous name opt-in (#24907))
=======
type DiscordReactionIngressAuthorizationParams = {
  accountId: string;
  user: User;
  isDirectMessage: boolean;
  isGroupDm: boolean;
  isGuildMessage: boolean;
  channelId: string;
  channelName?: string;
  channelSlug: string;
  dmEnabled: boolean;
  groupDmEnabled: boolean;
  groupDmChannels: string[];
  dmPolicy: "open" | "pairing" | "allowlist" | "disabled";
  allowFrom: string[];
  groupPolicy: "open" | "allowlist" | "disabled";
  allowNameMatching: boolean;
  guildInfo: import("./allow-list.js").DiscordGuildEntryResolved | null;
  channelConfig?: { allowed?: boolean } | null;
};

async function authorizeDiscordReactionIngress(
  params: DiscordReactionIngressAuthorizationParams,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  if (params.isDirectMessage && !params.dmEnabled) {
    return { allowed: false, reason: "dm-disabled" };
  }
  if (params.isGroupDm && !params.groupDmEnabled) {
    return { allowed: false, reason: "group-dm-disabled" };
  }
  if (params.isDirectMessage) {
    const storeAllowFrom = await readStoreAllowFromForDmPolicy({
      provider: "discord",
      accountId: params.accountId,
      dmPolicy: params.dmPolicy,
    });
    const access = resolveDmGroupAccessWithLists({
      isGroup: false,
      dmPolicy: params.dmPolicy,
      groupPolicy: params.groupPolicy,
      allowFrom: params.allowFrom,
      groupAllowFrom: [],
      storeAllowFrom,
      isSenderAllowed: (allowEntries) => {
        const allowList = normalizeDiscordAllowList(allowEntries, ["discord:", "user:", "pk:"]);
        const allowMatch = allowList
          ? resolveDiscordAllowListMatch({
              allowList,
              candidate: {
                id: params.user.id,
                name: params.user.username,
                tag: formatDiscordUserTag(params.user),
              },
              allowNameMatching: params.allowNameMatching,
            })
          : { allowed: false };
        return allowMatch.allowed;
      },
    });
    if (access.decision !== "allow") {
      return { allowed: false, reason: access.reason };
    }
  }
  if (
    params.isGroupDm &&
    !resolveGroupDmAllow({
      channels: params.groupDmChannels,
      channelId: params.channelId,
      channelName: params.channelName,
      channelSlug: params.channelSlug,
    })
  ) {
    return { allowed: false, reason: "group-dm-not-allowlisted" };
  }
  if (!params.isGuildMessage) {
    return { allowed: true };
  }
  const channelAllowlistConfigured =
    Boolean(params.guildInfo?.channels) && Object.keys(params.guildInfo?.channels ?? {}).length > 0;
  const channelAllowed = params.channelConfig?.allowed !== false;
  if (
    !isDiscordGroupAllowedByPolicy({
      groupPolicy: params.groupPolicy,
      guildAllowlisted: Boolean(params.guildInfo),
      channelAllowlistConfigured,
      channelAllowed,
    })
  ) {
    return { allowed: false, reason: "guild-policy" };
  }
  if (params.channelConfig?.allowed === false) {
    return { allowed: false, reason: "guild-channel-denied" };
  }
  return { allowed: true };
}

>>>>>>> bce643a0b (refactor(security): enforce account-scoped pairing APIs)
async function handleDiscordReactionEvent(params: {
  data: DiscordReactionEvent;
  client: Client;
  action: "added" | "removed";
  cfg: LoadedConfig;
  accountId: string;
  botUserId?: string;
  allowNameMatching: boolean;
  guildEntries?: Record<string, import("./allow-list.js").DiscordGuildEntryResolved>;
  logger: Logger;
}) {
  try {
    const { data, client, action, botUserId, guildEntries } = params;
    if (!("user" in data)) return;
    const user = data.user;
    if (!user || user.bot) return;
    if (!data.guild_id) return;

    const guildInfo = resolveDiscordGuildEntry({
      guild: data.guild ?? undefined,
      guildEntries,
    });
    if (guildEntries && Object.keys(guildEntries).length > 0 && !guildInfo) {
      return;
    }

    const channel = await client.fetchChannel(data.channel_id);
    if (!channel) return;
    const channelName = "name" in channel ? (channel.name ?? undefined) : undefined;
    const channelSlug = channelName ? normalizeDiscordSlug(channelName) : "";
    const channelType = "type" in channel ? channel.type : undefined;
    const isThreadChannel =
      channelType === ChannelType.PublicThread ||
      channelType === ChannelType.PrivateThread ||
      channelType === ChannelType.AnnouncementThread;
<<<<<<< HEAD
=======
    const ingressAccess = await authorizeDiscordReactionIngress({
      accountId: params.accountId,
      user,
      isDirectMessage,
      isGroupDm,
      isGuildMessage,
      channelId: data.channel_id,
      channelName,
      channelSlug,
      dmEnabled: params.dmEnabled,
      groupDmEnabled: params.groupDmEnabled,
      groupDmChannels: params.groupDmChannels,
      dmPolicy: params.dmPolicy,
      allowFrom: params.allowFrom,
      groupPolicy: params.groupPolicy,
      allowNameMatching: params.allowNameMatching,
      guildInfo,
    });
    if (!ingressAccess.allowed) {
      logVerbose(`discord reaction blocked sender=${user.id} (reason=${ingressAccess.reason})`);
      return;
    }
>>>>>>> bce643a0b (refactor(security): enforce account-scoped pairing APIs)
    let parentId = "parentId" in channel ? (channel.parentId ?? undefined) : undefined;
    let parentName: string | undefined;
    let parentSlug = "";
<<<<<<< HEAD
=======
    const memberRoleIds = Array.isArray(data.rawMember?.roles)
      ? data.rawMember.roles.map((roleId: string) => String(roleId))
      : [];
    let reactionBase: { baseText: string; contextKey: string } | null = null;
    const resolveReactionBase = () => {
      if (reactionBase) {
        return reactionBase;
      }
      const emojiLabel = formatDiscordReactionEmoji(data.emoji);
      const actorLabel = formatDiscordUserTag(user);
      const guildSlug =
        guildInfo?.slug ||
        (data.guild?.name
          ? normalizeDiscordSlug(data.guild.name)
          : (data.guild_id ?? (isGroupDm ? "group-dm" : "dm")));
      const channelLabel = channelSlug
        ? `#${channelSlug}`
        : channelName
          ? `#${normalizeDiscordSlug(channelName)}`
          : `#${data.channel_id}`;
      const baseText = `Discord reaction ${action}: ${emojiLabel} by ${actorLabel} on ${guildSlug} ${channelLabel} msg ${data.message_id}`;
      const contextKey = `discord:reaction:${action}:${data.message_id}:${user.id}:${emojiLabel}`;
      reactionBase = { baseText, contextKey };
      return reactionBase;
    };
    const emitReaction = (text: string, parentPeerId?: string) => {
      const { contextKey } = resolveReactionBase();
      const route = resolveAgentRoute({
        cfg: params.cfg,
        channel: "discord",
        accountId: params.accountId,
        guildId: data.guild_id ?? undefined,
        memberRoleIds,
        peer: {
          kind: isDirectMessage ? "direct" : isGroupDm ? "group" : "channel",
          id: isDirectMessage ? user.id : data.channel_id,
        },
        parentPeer: parentPeerId ? { kind: "channel", id: parentPeerId } : undefined,
      });
      enqueueSystemEvent(text, {
        sessionKey: route.sessionKey,
        contextKey,
      });
    };
    const shouldNotifyReaction = (options: {
      mode: "off" | "own" | "all" | "allowlist";
      messageAuthorId?: string;
    }) =>
      shouldEmitDiscordReactionNotification({
        mode: options.mode,
        botId: botUserId,
        messageAuthorId: options.messageAuthorId,
        userId: user.id,
        userName: user.username,
        userTag: formatDiscordUserTag(user),
        allowlist: guildInfo?.users,
        allowNameMatching: params.allowNameMatching,
      });
    const emitReactionWithAuthor = (message: { author?: User } | null) => {
      const { baseText } = resolveReactionBase();
      const authorLabel = message?.author ? formatDiscordUserTag(message.author) : undefined;
      const text = authorLabel ? `${baseText} from ${authorLabel}` : baseText;
      emitReaction(text, parentId);
    };
    const loadThreadParentInfo = async () => {
      if (!parentId) {
        return;
      }
      const parentInfo = await resolveDiscordChannelInfo(client, parentId);
      parentName = parentInfo?.name;
      parentSlug = parentName ? normalizeDiscordSlug(parentName) : "";
    };
    const resolveThreadChannelConfig = () =>
      resolveDiscordChannelConfigWithFallback({
        guildInfo,
        channelId: data.channel_id,
        channelName,
        channelSlug,
        parentId,
        parentName,
        parentSlug,
        scope: "thread",
      });

    // Parallelize async operations for thread channels
>>>>>>> cfa44ea6b (fix(security): make allowFrom id-only by default with dangerous name opt-in (#24907))
    if (isThreadChannel) {
      if (!parentId) {
        const channelInfo = await resolveDiscordChannelInfo(client, data.channel_id);
        parentId = channelInfo?.parentId;
<<<<<<< HEAD
      }
      if (parentId) {
        const parentInfo = await resolveDiscordChannelInfo(client, parentId);
        parentName = parentInfo?.name;
        parentSlug = parentName ? normalizeDiscordSlug(parentName) : "";
=======
        await loadThreadParentInfo();

        const channelConfig = resolveThreadChannelConfig();
        const threadAccess = await authorizeDiscordReactionIngress({
          accountId: params.accountId,
          user,
          isDirectMessage,
          isGroupDm,
          isGuildMessage,
          channelId: data.channel_id,
          channelName,
          channelSlug,
          dmEnabled: params.dmEnabled,
          groupDmEnabled: params.groupDmEnabled,
          groupDmChannels: params.groupDmChannels,
          dmPolicy: params.dmPolicy,
          allowFrom: params.allowFrom,
          groupPolicy: params.groupPolicy,
          allowNameMatching: params.allowNameMatching,
          guildInfo,
          channelConfig,
        });
        if (!threadAccess.allowed) {
          return;
        }

        // For allowlist mode, check if user is in allowlist first
        if (reactionMode === "allowlist") {
          if (!shouldNotifyReaction({ mode: reactionMode })) {
            return;
          }
        }

        const { baseText } = resolveReactionBase();
        emitReaction(baseText, parentId);
        return;
      }

      // For "own" mode, we need to fetch the message to check the author
      const messagePromise = data.message.fetch().catch(() => null);

      const [channelInfo, message] = await Promise.all([channelInfoPromise, messagePromise]);
      parentId = channelInfo?.parentId;
      await loadThreadParentInfo();

      const channelConfig = resolveThreadChannelConfig();
      const threadAccess = await authorizeDiscordReactionIngress({
        accountId: params.accountId,
        user,
        isDirectMessage,
        isGroupDm,
        isGuildMessage,
        channelId: data.channel_id,
        channelName,
        channelSlug,
        dmEnabled: params.dmEnabled,
        groupDmEnabled: params.groupDmEnabled,
        groupDmChannels: params.groupDmChannels,
        dmPolicy: params.dmPolicy,
        allowFrom: params.allowFrom,
        groupPolicy: params.groupPolicy,
        allowNameMatching: params.allowNameMatching,
        guildInfo,
        channelConfig,
      });
      if (!threadAccess.allowed) {
        return;
>>>>>>> bce643a0b (refactor(security): enforce account-scoped pairing APIs)
      }
    }
    const channelConfig = resolveDiscordChannelConfigWithFallback({
      guildInfo,
      channelId: data.channel_id,
      channelName,
      channelSlug,
      parentId,
      parentName,
      parentSlug,
      scope: isThreadChannel ? "thread" : "channel",
    });
<<<<<<< HEAD
    if (channelConfig?.allowed === false) return;

    if (botUserId && user.id === botUserId) return;
=======
    if (isGuildMessage) {
      const channelAccess = await authorizeDiscordReactionIngress({
        accountId: params.accountId,
        user,
        isDirectMessage,
        isGroupDm,
        isGuildMessage,
        channelId: data.channel_id,
        channelName,
        channelSlug,
        dmEnabled: params.dmEnabled,
        groupDmEnabled: params.groupDmEnabled,
        groupDmChannels: params.groupDmChannels,
        dmPolicy: params.dmPolicy,
        allowFrom: params.allowFrom,
        groupPolicy: params.groupPolicy,
        allowNameMatching: params.allowNameMatching,
        guildInfo,
        channelConfig,
      });
      if (!channelAccess.allowed) {
        return;
      }
    }
>>>>>>> bce643a0b (refactor(security): enforce account-scoped pairing APIs)

    const reactionMode = guildInfo?.reactionNotifications ?? "own";
    const message = await data.message.fetch().catch(() => null);
    const messageAuthorId = message?.author?.id ?? undefined;
    const shouldNotify = shouldEmitDiscordReactionNotification({
      mode: reactionMode,
      botId: botUserId,
      messageAuthorId,
      userId: user.id,
      userName: user.username,
      userTag: formatDiscordUserTag(user),
      allowlist: guildInfo?.users,
    });
    if (!shouldNotify) return;

    const emojiLabel = formatDiscordReactionEmoji(data.emoji);
    const actorLabel = formatDiscordUserTag(user);
    const guildSlug =
      guildInfo?.slug || (data.guild?.name ? normalizeDiscordSlug(data.guild.name) : data.guild_id);
    const channelLabel = channelSlug
      ? `#${channelSlug}`
      : channelName
        ? `#${normalizeDiscordSlug(channelName)}`
        : `#${data.channel_id}`;
    const authorLabel = message?.author ? formatDiscordUserTag(message.author) : undefined;
    const baseText = `Discord reaction ${action}: ${emojiLabel} by ${actorLabel} on ${guildSlug} ${channelLabel} msg ${data.message_id}`;
    const text = authorLabel ? `${baseText} from ${authorLabel}` : baseText;
    const route = resolveAgentRoute({
      cfg: params.cfg,
      channel: "discord",
      accountId: params.accountId,
      guildId: data.guild_id ?? undefined,
      peer: { kind: "channel", id: data.channel_id },
    });
    enqueueSystemEvent(text, {
      sessionKey: route.sessionKey,
      contextKey: `discord:reaction:${action}:${data.message_id}:${user.id}:${emojiLabel}`,
    });
  } catch (err) {
    params.logger.error(danger(`discord reaction handler failed: ${String(err)}`));
  }
}

type PresenceUpdateEvent = Parameters<PresenceUpdateListener["handle"]>[0];

export class DiscordPresenceListener extends PresenceUpdateListener {
  private logger?: Logger;
  private accountId?: string;

  constructor(params: { logger?: Logger; accountId?: string }) {
    super();
    this.logger = params.logger;
    this.accountId = params.accountId;
  }

  async handle(data: PresenceUpdateEvent) {
    try {
      const userId =
        "user" in data && data.user && typeof data.user === "object" && "id" in data.user
          ? String(data.user.id)
          : undefined;
      if (!userId) return;
      setPresence(
        this.accountId,
        userId,
        data as import("discord-api-types/v10").GatewayPresenceUpdate,
      );
    } catch (err) {
      const logger = this.logger ?? discordEventQueueLog;
      logger.error(danger(`discord presence handler failed: ${String(err)}`));
    }
  }
}
