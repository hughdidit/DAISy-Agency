import type { APIStringSelectComponent } from "discord-api-types/v10";
import {
  Button,
  type ButtonInteraction,
  type ComponentData,
  StringSelectMenu,
  type StringSelectMenuInteraction,
} from "@buape/carbon";
import { ButtonStyle, ChannelType } from "discord-api-types/v10";
import type { OpenClawConfig } from "../../config/config.js";
import { logVerbose } from "../../globals.js";
import { enqueueSystemEvent } from "../../infra/system-events.js";
import { logDebug, logError } from "../../logger.js";
import { buildPairingReply } from "../../pairing/pairing-messages.js";
import {
  readChannelAllowFromStore,
  upsertChannelPairingRequest,
} from "../../pairing/pairing-store.js";
import { resolveAgentRoute } from "../../routing/resolve-route.js";
import {
  type DiscordGuildEntryResolved,
  normalizeDiscordAllowList,
  normalizeDiscordSlug,
  resolveDiscordAllowListMatch,
  resolveDiscordChannelConfigWithFallback,
  resolveDiscordGuildEntry,
  resolveDiscordMemberAllowed,
} from "./allow-list.js";
import { formatDiscordUserTag } from "./format.js";

const AGENT_BUTTON_KEY = "agent";
const AGENT_SELECT_KEY = "agentsel";

type DiscordUser = Parameters<typeof formatDiscordUserTag>[0];

type AgentComponentInteraction = ButtonInteraction | StringSelectMenuInteraction;

export type AgentComponentContext = {
  cfg: OpenClawConfig;
  accountId: string;
  guildEntries?: Record<string, DiscordGuildEntryResolved>;
  /** DM allowlist (from dm.allowFrom config) */
  allowFrom?: Array<string | number>;
  /** DM policy (default: "pairing") */
  dmPolicy?: "open" | "pairing" | "allowlist" | "disabled";
};

/**
 * Build agent button custom ID: agent:componentId=<id>
 * The channelId is NOT embedded in customId - we use interaction.rawData.channel_id instead
 * to prevent channel spoofing attacks.
 *
 * Carbon's customIdParser parses "key:arg1=value1;arg2=value2" into { arg1: value1, arg2: value2 }
 */
export function buildAgentButtonCustomId(componentId: string): string {
  return `${AGENT_BUTTON_KEY}:componentId=${encodeURIComponent(componentId)}`;
}

/**
 * Build agent select menu custom ID: agentsel:componentId=<id>
 */
export function buildAgentSelectCustomId(componentId: string): string {
  return `${AGENT_SELECT_KEY}:componentId=${encodeURIComponent(componentId)}`;
}

/**
 * Parse agent component data from Carbon's parsed ComponentData
 * Supports both legacy { componentId } and Components v2 { cid } payloads.
 */
function readParsedComponentId(data: ComponentData): unknown {
  if (!data || typeof data !== "object") {
    return undefined;
  }
  return "cid" in data
    ? (data as Record<string, unknown>).cid
    : (data as Record<string, unknown>).componentId;
}

function parseAgentComponentData(data: ComponentData): {
  componentId: string;
} | null {
<<<<<<< HEAD
  if (!data || typeof data !== "object") {
    return null;
  }
=======
  const raw = readParsedComponentId(data);

  const decodeSafe = (value: string): string => {
    // `cid` values may be raw (not URI-encoded). Guard against malformed % sequences.
    // Only attempt decoding when it looks like it contains percent-encoding.
    if (!value.includes("%")) {
      return value;
    }
    // If it has a % but not a valid %XX sequence, skip decode.
    if (!/%[0-9A-Fa-f]{2}/.test(value)) {
      return value;
    }
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

>>>>>>> c869ca4bb (fix: harden discord agent cid parsing (#29013) (thanks @Jacky1n7))
  const componentId =
    typeof data.componentId === "string"
      ? decodeURIComponent(data.componentId)
      : typeof data.componentId === "number"
        ? String(data.componentId)
        : null;
  if (!componentId) {
    return null;
  }
  return { componentId };
}

function formatUsername(user: { username: string; discriminator?: string | null }): string {
  if (user.discriminator && user.discriminator !== "0") {
    return `${user.username}#${user.discriminator}`;
  }
  return user.username;
}

/**
 * Check if a channel type is a thread type
 */
function isThreadChannelType(channelType: number | undefined): boolean {
  return (
    channelType === ChannelType.PublicThread ||
    channelType === ChannelType.PrivateThread ||
    channelType === ChannelType.AnnouncementThread
  );
}

async function ensureDmComponentAuthorized(params: {
  ctx: AgentComponentContext;
  interaction: AgentComponentInteraction;
  user: DiscordUser;
  componentLabel: string;
}): Promise<boolean> {
  const { ctx, interaction, user, componentLabel } = params;
  const dmPolicy = ctx.dmPolicy ?? "pairing";
  if (dmPolicy === "disabled") {
    logVerbose(`agent ${componentLabel}: blocked (DM policy disabled)`);
    try {
      await interaction.reply({
        content: "DM interactions are disabled.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return false;
  }
  if (dmPolicy === "open") {
    return true;
  }

  const storeAllowFrom =
    dmPolicy === "allowlist" ? [] : await readChannelAllowFromStore("discord").catch(() => []);
  const effectiveAllowFrom = [...(ctx.allowFrom ?? []), ...storeAllowFrom];
  const allowList = normalizeDiscordAllowList(effectiveAllowFrom, ["discord:", "user:", "pk:"]);
  const allowMatch = allowList
    ? resolveDiscordAllowListMatch({
        allowList,
        candidate: {
          id: user.id,
          name: user.username,
          tag: formatDiscordUserTag(user),
        },
      })
    : { allowed: false };
  if (allowMatch.allowed) {
    return true;
  }

  if (dmPolicy === "pairing") {
    const { code, created } = await upsertChannelPairingRequest({
      channel: "discord",
      id: user.id,
      meta: {
        tag: formatDiscordUserTag(user),
        name: user.username,
      },
    });
    try {
      await interaction.reply({
        content: created
          ? buildPairingReply({
              channel: "discord",
              idLine: `Your Discord user id: ${user.id}`,
              code,
            })
          : "Pairing already requested. Ask the bot owner to approve your code.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return false;
  }

  logVerbose(`agent ${componentLabel}: blocked DM user ${user.id} (not in allowFrom)`);
  try {
    await interaction.reply({
      content: `You are not authorized to use this ${componentLabel}.`,
      ephemeral: true,
    });
  } catch {
    // Interaction may have expired
  }
  return false;
}

<<<<<<< HEAD
=======
async function resolveInteractionContextWithDmAuth(params: {
  ctx: AgentComponentContext;
  interaction: AgentComponentInteraction;
  label: string;
  componentLabel: string;
  defer?: boolean;
}): Promise<ComponentInteractionContext | null> {
  const interactionCtx = await resolveComponentInteractionContext({
    interaction: params.interaction,
    label: params.label,
    defer: params.defer,
  });
  if (!interactionCtx) {
    return null;
  }
  if (interactionCtx.isDirectMessage) {
    const authorized = await ensureDmComponentAuthorized({
      ctx: params.ctx,
      interaction: params.interaction,
      user: interactionCtx.user,
      componentLabel: params.componentLabel,
      replyOpts: interactionCtx.replyOpts,
    });
    if (!authorized) {
      return null;
    }
  }
  return interactionCtx;
}

function normalizeComponentId(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function parseDiscordComponentData(
  data: ComponentData,
  customId?: string,
): { componentId: string; modalId?: string } | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const rawComponentId = readParsedComponentId(data);
  const rawModalId =
    "mid" in data ? (data as { mid?: unknown }).mid : (data as { modalId?: unknown }).modalId;
  let componentId = normalizeComponentId(rawComponentId);
  let modalId = normalizeComponentId(rawModalId);
  if (!componentId && customId) {
    const parsed = parseDiscordComponentCustomId(customId);
    if (parsed) {
      componentId = parsed.componentId;
      modalId = parsed.modalId;
    }
  }
  if (!componentId) {
    return null;
  }
  return { componentId, modalId };
}

function parseDiscordModalId(data: ComponentData, customId?: string): string | null {
  if (data && typeof data === "object") {
    const rawModalId =
      "mid" in data ? (data as { mid?: unknown }).mid : (data as { modalId?: unknown }).modalId;
    const modalId = normalizeComponentId(rawModalId);
    if (modalId) {
      return modalId;
    }
  }
  if (customId) {
    return parseDiscordModalCustomId(customId);
  }
  return null;
}

function resolveInteractionCustomId(interaction: AgentComponentInteraction): string | undefined {
  if (!interaction?.rawData || typeof interaction.rawData !== "object") {
    return undefined;
  }
  if (!("data" in interaction.rawData)) {
    return undefined;
  }
  const data = (interaction.rawData as { data?: { custom_id?: unknown } }).data;
  const customId = data?.custom_id;
  if (typeof customId !== "string") {
    return undefined;
  }
  const trimmed = customId.trim();
  return trimmed ? trimmed : undefined;
}

function mapOptionLabels(
  options: Array<{ value: string; label: string }> | undefined,
  values: string[],
) {
  if (!options || options.length === 0) {
    return values;
  }
  const map = new Map(options.map((option) => [option.value, option.label]));
  return values.map((value) => map.get(value) ?? value);
}

function mapSelectValues(entry: DiscordComponentEntry, values: string[]): string[] {
  if (entry.selectType === "string") {
    return mapOptionLabels(entry.options, values);
  }
  if (entry.selectType === "user") {
    return values.map((value) => `user:${value}`);
  }
  if (entry.selectType === "role") {
    return values.map((value) => `role:${value}`);
  }
  if (entry.selectType === "mentionable") {
    return values.map((value) => `mentionable:${value}`);
  }
  if (entry.selectType === "channel") {
    return values.map((value) => `channel:${value}`);
  }
  return values;
}

function resolveModalFieldValues(
  field: DiscordModalEntry["fields"][number],
  interaction: ModalInteraction,
): string[] {
  const fields = interaction.fields;
  const optionLabels = field.options?.map((option) => ({
    value: option.value,
    label: option.label,
  }));
  const required = field.required === true;
  try {
    switch (field.type) {
      case "text": {
        const value = required ? fields.getText(field.id, true) : fields.getText(field.id);
        return value ? [value] : [];
      }
      case "select":
      case "checkbox":
      case "radio": {
        const values = required
          ? fields.getStringSelect(field.id, true)
          : (fields.getStringSelect(field.id) ?? []);
        return mapOptionLabels(optionLabels, values);
      }
      case "role-select": {
        try {
          const roles = required
            ? fields.getRoleSelect(field.id, true)
            : (fields.getRoleSelect(field.id) ?? []);
          return roles.map((role) => role.name ?? role.id);
        } catch {
          const values = required
            ? fields.getStringSelect(field.id, true)
            : (fields.getStringSelect(field.id) ?? []);
          return values;
        }
      }
      case "user-select": {
        const users = required
          ? fields.getUserSelect(field.id, true)
          : (fields.getUserSelect(field.id) ?? []);
        return users.map((user) => formatDiscordUserTag(user));
      }
      default:
        return [];
    }
  } catch (err) {
    logError(`agent modal: failed to read field ${field.id}: ${String(err)}`);
    return [];
  }
}

function formatModalSubmissionText(
  entry: DiscordModalEntry,
  interaction: ModalInteraction,
): string {
  const lines: string[] = [`Form "${entry.title}" submitted.`];
  for (const field of entry.fields) {
    const values = resolveModalFieldValues(field, interaction);
    if (values.length === 0) {
      continue;
    }
    lines.push(`- ${field.label}: ${values.join(", ")}`);
  }
  if (lines.length === 1) {
    lines.push("- (no values)");
  }
  return lines.join("\n");
}

function resolveComponentCommandAuthorized(params: {
  ctx: AgentComponentContext;
  interactionCtx: ComponentInteractionContext;
  channelConfig: ReturnType<typeof resolveDiscordChannelConfigWithFallback>;
  guildInfo: ReturnType<typeof resolveDiscordGuildEntry>;
  allowNameMatching: boolean;
}): boolean {
  const { ctx, interactionCtx, channelConfig, guildInfo } = params;
  if (interactionCtx.isDirectMessage) {
    return true;
  }

  const ownerAllowList = normalizeDiscordAllowList(ctx.allowFrom, ["discord:", "user:", "pk:"]);
  const ownerOk = ownerAllowList
    ? resolveDiscordAllowListMatch({
        allowList: ownerAllowList,
        candidate: {
          id: interactionCtx.user.id,
          name: interactionCtx.user.username,
          tag: formatDiscordUserTag(interactionCtx.user),
        },
        allowNameMatching: params.allowNameMatching,
      }).allowed
    : false;

  const { hasAccessRestrictions, memberAllowed } = resolveDiscordMemberAccessState({
    channelConfig,
    guildInfo,
    memberRoleIds: interactionCtx.memberRoleIds,
    sender: {
      id: interactionCtx.user.id,
      name: interactionCtx.user.username,
      tag: formatDiscordUserTag(interactionCtx.user),
    },
    allowNameMatching: params.allowNameMatching,
  });
  const useAccessGroups = ctx.cfg.commands?.useAccessGroups !== false;
  const authorizers = useAccessGroups
    ? [
        { configured: ownerAllowList != null, allowed: ownerOk },
        { configured: hasAccessRestrictions, allowed: memberAllowed },
      ]
    : [{ configured: hasAccessRestrictions, allowed: memberAllowed }];

  return resolveCommandAuthorizedFromAuthorizers({
    useAccessGroups,
    authorizers,
    modeWhenAccessGroupsOff: "configured",
  });
}

async function dispatchDiscordComponentEvent(params: {
  ctx: AgentComponentContext;
  interaction: AgentComponentInteraction;
  interactionCtx: ComponentInteractionContext;
  channelCtx: DiscordChannelContext;
  guildInfo: ReturnType<typeof resolveDiscordGuildEntry>;
  eventText: string;
  replyToId?: string;
  routeOverrides?: { sessionKey?: string; agentId?: string; accountId?: string };
}): Promise<void> {
  const { ctx, interaction, interactionCtx, channelCtx, guildInfo, eventText } = params;
  const runtime = ctx.runtime ?? createNonExitingRuntime();
  const route = resolveAgentRoute({
    cfg: ctx.cfg,
    channel: "discord",
    accountId: ctx.accountId,
    guildId: interactionCtx.rawGuildId,
    memberRoleIds: interactionCtx.memberRoleIds,
    peer: {
      kind: interactionCtx.isDirectMessage ? "direct" : "channel",
      id: interactionCtx.isDirectMessage ? interactionCtx.userId : interactionCtx.channelId,
    },
    parentPeer: channelCtx.parentId ? { kind: "channel", id: channelCtx.parentId } : undefined,
  });
  const sessionKey = params.routeOverrides?.sessionKey ?? route.sessionKey;
  const agentId = params.routeOverrides?.agentId ?? route.agentId;
  const accountId = params.routeOverrides?.accountId ?? route.accountId;

  const fromLabel = interactionCtx.isDirectMessage
    ? buildDirectLabel(interactionCtx.user)
    : buildGuildLabel({
        guild: interaction.guild ?? undefined,
        channelName: channelCtx.channelName ?? interactionCtx.channelId,
        channelId: interactionCtx.channelId,
      });
  const senderName = interactionCtx.user.globalName ?? interactionCtx.user.username;
  const senderUsername = interactionCtx.user.username;
  const senderTag = formatDiscordUserTag(interactionCtx.user);
  const groupChannel =
    !interactionCtx.isDirectMessage && channelCtx.channelSlug
      ? `#${channelCtx.channelSlug}`
      : undefined;
  const groupSubject = interactionCtx.isDirectMessage ? undefined : groupChannel;
  const channelConfig = resolveDiscordChannelConfigWithFallback({
    guildInfo,
    channelId: interactionCtx.channelId,
    channelName: channelCtx.channelName,
    channelSlug: channelCtx.channelSlug,
    parentId: channelCtx.parentId,
    parentName: channelCtx.parentName,
    parentSlug: channelCtx.parentSlug,
    scope: channelCtx.isThread ? "thread" : "channel",
  });
  const allowNameMatching = isDangerousNameMatchingEnabled(ctx.discordConfig);
  const groupSystemPrompt = channelConfig?.systemPrompt?.trim() || undefined;
  const ownerAllowFrom = resolveDiscordOwnerAllowFrom({
    channelConfig,
    guildInfo,
    sender: { id: interactionCtx.user.id, name: interactionCtx.user.username, tag: senderTag },
    allowNameMatching,
  });
  const commandAuthorized = resolveComponentCommandAuthorized({
    ctx,
    interactionCtx,
    channelConfig,
    guildInfo,
    allowNameMatching,
  });
  const storePath = resolveStorePath(ctx.cfg.session?.store, { agentId });
  const envelopeOptions = resolveEnvelopeFormatOptions(ctx.cfg);
  const previousTimestamp = readSessionUpdatedAt({
    storePath,
    sessionKey,
  });
  const timestamp = Date.now();
  const combinedBody = formatInboundEnvelope({
    channel: "Discord",
    from: fromLabel,
    timestamp,
    body: eventText,
    chatType: interactionCtx.isDirectMessage ? "direct" : "channel",
    senderLabel: senderName,
    previousTimestamp,
    envelope: envelopeOptions,
  });

  const ctxPayload = finalizeInboundContext({
    Body: combinedBody,
    BodyForAgent: eventText,
    RawBody: eventText,
    CommandBody: eventText,
    From: interactionCtx.isDirectMessage
      ? `discord:${interactionCtx.userId}`
      : `discord:channel:${interactionCtx.channelId}`,
    To: `channel:${interactionCtx.channelId}`,
    SessionKey: sessionKey,
    AccountId: accountId,
    ChatType: interactionCtx.isDirectMessage ? "direct" : "channel",
    ConversationLabel: fromLabel,
    SenderName: senderName,
    SenderId: interactionCtx.userId,
    SenderUsername: senderUsername,
    SenderTag: senderTag,
    GroupSubject: groupSubject,
    GroupChannel: groupChannel,
    GroupSystemPrompt: interactionCtx.isDirectMessage ? undefined : groupSystemPrompt,
    GroupSpace: guildInfo?.id ?? guildInfo?.slug ?? interactionCtx.rawGuildId ?? undefined,
    OwnerAllowFrom: ownerAllowFrom,
    Provider: "discord" as const,
    Surface: "discord" as const,
    WasMentioned: true,
    CommandAuthorized: commandAuthorized,
    CommandSource: "text" as const,
    MessageSid: interaction.rawData.id,
    Timestamp: timestamp,
    OriginatingChannel: "discord" as const,
    OriginatingTo: `channel:${interactionCtx.channelId}`,
  });

  await recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? sessionKey,
    ctx: ctxPayload,
    updateLastRoute: interactionCtx.isDirectMessage
      ? {
          sessionKey: route.mainSessionKey,
          channel: "discord",
          to: `user:${interactionCtx.userId}`,
          accountId,
        }
      : undefined,
    onRecordError: (err) => {
      logVerbose(`discord: failed updating component session meta: ${String(err)}`);
    },
  });

  const deliverTarget = `channel:${interactionCtx.channelId}`;
  const typingChannelId = interactionCtx.channelId;
  const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
    cfg: ctx.cfg,
    agentId,
    channel: "discord",
    accountId,
  });
  const tableMode = resolveMarkdownTableMode({
    cfg: ctx.cfg,
    channel: "discord",
    accountId,
  });
  const textLimit = resolveTextChunkLimit(ctx.cfg, "discord", accountId, {
    fallbackLimit: 2000,
  });
  const token = ctx.token ?? "";
  const replyToMode =
    ctx.discordConfig?.replyToMode ?? ctx.cfg.channels?.discord?.replyToMode ?? "off";
  const replyReference = createReplyReferencePlanner({
    replyToMode,
    startId: params.replyToId,
  });

  await dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg: ctx.cfg,
    replyOptions: { onModelSelected },
    dispatcherOptions: {
      ...prefixOptions,
      humanDelay: resolveHumanDelayConfig(ctx.cfg, agentId),
      deliver: async (payload) => {
        const replyToId = replyReference.use();
        await deliverDiscordReply({
          replies: [payload],
          target: deliverTarget,
          token,
          accountId,
          rest: interaction.client.rest,
          runtime,
          replyToId,
          replyToMode,
          textLimit,
          maxLinesPerMessage: ctx.discordConfig?.maxLinesPerMessage,
          tableMode,
          chunkMode: resolveChunkMode(ctx.cfg, "discord", accountId),
        });
        replyReference.markSent();
      },
      onReplyStart: async () => {
        try {
          await sendTyping({ client: interaction.client, channelId: typingChannelId });
        } catch (err) {
          logVerbose(`discord: typing failed for component reply: ${String(err)}`);
        }
      },
      onError: (err) => {
        logError(`discord component dispatch failed: ${String(err)}`);
      },
    },
  });
}

async function handleDiscordComponentEvent(params: {
  ctx: AgentComponentContext;
  interaction: AgentComponentMessageInteraction;
  data: ComponentData;
  componentLabel: string;
  values?: string[];
  label: string;
}): Promise<void> {
  const parsed = parseDiscordComponentData(
    params.data,
    resolveInteractionCustomId(params.interaction),
  );
  if (!parsed) {
    logError(`${params.label}: failed to parse component data`);
    try {
      await params.interaction.reply({
        content: "This component is no longer valid.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const entry = resolveDiscordComponentEntry({ id: parsed.componentId, consume: false });
  if (!entry) {
    try {
      await params.interaction.reply({
        content: "This component has expired.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const interactionCtx = await resolveInteractionContextWithDmAuth({
    ctx: params.ctx,
    interaction: params.interaction,
    label: params.label,
    componentLabel: params.componentLabel,
  });
  if (!interactionCtx) {
    return;
  }
  const { channelId, user, replyOpts, rawGuildId, memberRoleIds } = interactionCtx;
  const guildInfo = resolveDiscordGuildEntry({
    guild: params.interaction.guild ?? undefined,
    guildEntries: params.ctx.guildEntries,
  });
  const channelCtx = resolveDiscordChannelContext(params.interaction);
  const unauthorizedReply = `You are not authorized to use this ${params.componentLabel}.`;
  const memberAllowed = await ensureGuildComponentMemberAllowed({
    interaction: params.interaction,
    guildInfo,
    channelId,
    rawGuildId,
    channelCtx,
    memberRoleIds,
    user,
    replyOpts,
    componentLabel: params.componentLabel,
    unauthorizedReply,
    allowNameMatching: isDangerousNameMatchingEnabled(params.ctx.discordConfig),
  });
  if (!memberAllowed) {
    return;
  }

  const componentAllowed = await ensureComponentUserAllowed({
    entry,
    interaction: params.interaction,
    user,
    replyOpts,
    componentLabel: params.componentLabel,
    unauthorizedReply,
    allowNameMatching: isDangerousNameMatchingEnabled(params.ctx.discordConfig),
  });
  if (!componentAllowed) {
    return;
  }

  const consumed = resolveDiscordComponentEntry({
    id: parsed.componentId,
    consume: !entry.reusable,
  });
  if (!consumed) {
    try {
      await params.interaction.reply({
        content: "This component has expired.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  if (consumed.kind === "modal-trigger") {
    try {
      await params.interaction.reply({
        content: "This form is no longer available.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const values = params.values ? mapSelectValues(consumed, params.values) : undefined;
  const eventText = formatDiscordComponentEventText({
    kind: consumed.kind === "select" ? "select" : "button",
    label: consumed.label,
    values,
  });

  try {
    await params.interaction.reply({ content: "✓", ...replyOpts });
  } catch (err) {
    logError(`${params.label}: failed to acknowledge interaction: ${String(err)}`);
  }

  await dispatchDiscordComponentEvent({
    ctx: params.ctx,
    interaction: params.interaction,
    interactionCtx,
    channelCtx,
    guildInfo,
    eventText,
    replyToId: consumed.messageId ?? params.interaction.message?.id,
    routeOverrides: {
      sessionKey: consumed.sessionKey,
      agentId: consumed.agentId,
      accountId: consumed.accountId,
    },
  });
}

async function handleDiscordModalTrigger(params: {
  ctx: AgentComponentContext;
  interaction: ButtonInteraction;
  data: ComponentData;
  label: string;
}): Promise<void> {
  const parsed = parseDiscordComponentData(
    params.data,
    resolveInteractionCustomId(params.interaction),
  );
  if (!parsed) {
    logError(`${params.label}: failed to parse modal trigger data`);
    try {
      await params.interaction.reply({
        content: "This button is no longer valid.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }
  const entry = resolveDiscordComponentEntry({ id: parsed.componentId, consume: false });
  if (!entry || entry.kind !== "modal-trigger") {
    try {
      await params.interaction.reply({
        content: "This button has expired.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const modalId = entry.modalId ?? parsed.modalId;
  if (!modalId) {
    try {
      await params.interaction.reply({
        content: "This form is no longer available.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const interactionCtx = await resolveInteractionContextWithDmAuth({
    ctx: params.ctx,
    interaction: params.interaction,
    label: params.label,
    componentLabel: "form",
    defer: false,
  });
  if (!interactionCtx) {
    return;
  }
  const { channelId, user, replyOpts, rawGuildId, memberRoleIds } = interactionCtx;
  const guildInfo = resolveDiscordGuildEntry({
    guild: params.interaction.guild ?? undefined,
    guildEntries: params.ctx.guildEntries,
  });
  const channelCtx = resolveDiscordChannelContext(params.interaction);
  const unauthorizedReply = "You are not authorized to use this form.";
  const memberAllowed = await ensureGuildComponentMemberAllowed({
    interaction: params.interaction,
    guildInfo,
    channelId,
    rawGuildId,
    channelCtx,
    memberRoleIds,
    user,
    replyOpts,
    componentLabel: "form",
    unauthorizedReply,
    allowNameMatching: isDangerousNameMatchingEnabled(params.ctx.discordConfig),
  });
  if (!memberAllowed) {
    return;
  }

  const componentAllowed = await ensureComponentUserAllowed({
    entry,
    interaction: params.interaction,
    user,
    replyOpts,
    componentLabel: "form",
    unauthorizedReply,
    allowNameMatching: isDangerousNameMatchingEnabled(params.ctx.discordConfig),
  });
  if (!componentAllowed) {
    return;
  }

  const consumed = resolveDiscordComponentEntry({
    id: parsed.componentId,
    consume: !entry.reusable,
  });
  if (!consumed) {
    try {
      await params.interaction.reply({
        content: "This form has expired.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const resolvedModalId = consumed.modalId ?? modalId;
  const modalEntry = resolveDiscordModalEntry({ id: resolvedModalId, consume: false });
  if (!modalEntry) {
    try {
      await params.interaction.reply({
        content: "This form has expired.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  try {
    await params.interaction.showModal(createDiscordFormModal(modalEntry));
  } catch (err) {
    logError(`${params.label}: failed to show modal: ${String(err)}`);
  }
}

>>>>>>> c869ca4bb (fix: harden discord agent cid parsing (#29013) (thanks @Jacky1n7))
export class AgentComponentButton extends Button {
  label = AGENT_BUTTON_KEY;
  customId = `${AGENT_BUTTON_KEY}:seed=1`;
  style = ButtonStyle.Primary;
  private ctx: AgentComponentContext;

  constructor(ctx: AgentComponentContext) {
    super();
    this.ctx = ctx;
  }

  async run(interaction: ButtonInteraction, data: ComponentData): Promise<void> {
    // Parse componentId from Carbon's parsed ComponentData
    const parsed = parseAgentComponentData(data);
    if (!parsed) {
      logError("agent button: failed to parse component data");
      try {
        await interaction.reply({
          content: "This button is no longer valid.",
          ephemeral: true,
        });
      } catch {
        // Interaction may have expired
      }
      return;
    }

    const { componentId } = parsed;

    // P1 FIX: Use interaction's actual channel_id instead of trusting customId
    // This prevents channel ID spoofing attacks where an attacker crafts a button
    // with a different channelId to inject events into other sessions
    const channelId = interaction.rawData.channel_id;
    if (!channelId) {
      logError("agent button: missing channel_id in interaction");
      return;
    }

    const user = interaction.user;
    if (!user) {
      logError("agent button: missing user in interaction");
      return;
    }

    const username = formatUsername(user);
    const userId = user.id;

    // P1 FIX: Use rawData.guild_id as source of truth - interaction.guild can be null
    // when guild is not cached even though guild_id is present in rawData
    const rawGuildId = interaction.rawData.guild_id;
    const isDirectMessage = !rawGuildId;
    const memberRoleIds = Array.isArray(interaction.rawData.member?.roles)
      ? interaction.rawData.member.roles.map((roleId: string) => String(roleId))
      : [];

    if (isDirectMessage) {
      const authorized = await ensureDmComponentAuthorized({
        ctx: this.ctx,
        interaction,
        user,
        componentLabel: "button",
      });
      if (!authorized) {
        return;
      }
    }

    // P2 FIX: Check user allowlist before processing component interaction
    // This prevents unauthorized users from injecting system events
    const guild = interaction.guild;
    const guildInfo = resolveDiscordGuildEntry({
      guild: guild ?? undefined,
      guildEntries: this.ctx.guildEntries,
    });

    // Resolve channel info for thread detection and allowlist inheritance
    const channel = interaction.channel;
    const channelName = channel && "name" in channel ? (channel.name as string) : undefined;
    const channelSlug = channelName ? normalizeDiscordSlug(channelName) : "";
    const channelType = channel && "type" in channel ? (channel.type as number) : undefined;
    const isThread = isThreadChannelType(channelType);

    // Resolve thread parent for allowlist inheritance
    // Note: We can get parentId from channel but cannot fetch parent name without a client.
    // The parentId alone enables ID-based parent config matching. Name-based matching
    // requires the channel cache to have parent info available.
    let parentId: string | undefined;
    let parentName: string | undefined;
    let parentSlug = "";
    if (isThread && channel && "parentId" in channel) {
      parentId = (channel.parentId as string) ?? undefined;
      // Try to get parent name from channel's parent if available
      if ("parent" in channel) {
        const parent = (channel as { parent?: { name?: string } }).parent;
        if (parent?.name) {
          parentName = parent.name;
          parentSlug = normalizeDiscordSlug(parentName);
        }
      }
    }

    // Only check guild allowlists if this is a guild interaction
    if (rawGuildId) {
      const channelConfig = resolveDiscordChannelConfigWithFallback({
        guildInfo,
        channelId,
        channelName,
        channelSlug,
        parentId,
        parentName,
        parentSlug,
        scope: isThread ? "thread" : "channel",
      });

      const channelUsers = channelConfig?.users ?? guildInfo?.users;
      const channelRoles = channelConfig?.roles ?? guildInfo?.roles;
      const memberAllowed = resolveDiscordMemberAllowed({
        userAllowList: channelUsers,
        roleAllowList: channelRoles,
        memberRoleIds,
        userId,
        userName: user.username,
        userTag: user.discriminator ? `${user.username}#${user.discriminator}` : undefined,
      });
      if (!memberAllowed) {
        logVerbose(`agent button: blocked user ${userId} (not in users/roles allowlist)`);
        try {
          await interaction.reply({
            content: "You are not authorized to use this button.",
            ephemeral: true,
          });
        } catch {
          // Interaction may have expired
        }
        return;
      }
    }

    // Resolve route with full context (guildId, proper peer kind, parentPeer)
    const route = resolveAgentRoute({
      cfg: this.ctx.cfg,
      channel: "discord",
      accountId: this.ctx.accountId,
      guildId: rawGuildId,
      memberRoleIds,
      peer: {
        kind: isDirectMessage ? "dm" : "channel",
        id: isDirectMessage ? userId : channelId,
      },
      parentPeer: parentId ? { kind: "channel", id: parentId } : undefined,
    });

    const eventText = `[Discord component: ${componentId} clicked by ${username} (${userId})]`;

    logDebug(`agent button: enqueuing event for channel ${channelId}: ${eventText}`);

    enqueueSystemEvent(eventText, {
      sessionKey: route.sessionKey,
      contextKey: `discord:agent-button:${channelId}:${componentId}:${userId}`,
    });

    // Acknowledge the interaction
    try {
      await interaction.reply({
        content: "✓",
        ephemeral: true,
      });
    } catch (err) {
      logError(`agent button: failed to acknowledge interaction: ${String(err)}`);
    }
  }
}

export class AgentSelectMenu extends StringSelectMenu {
  customId = `${AGENT_SELECT_KEY}:seed=1`;
  options: APIStringSelectComponent["options"] = [];
  private ctx: AgentComponentContext;

  constructor(ctx: AgentComponentContext) {
    super();
    this.ctx = ctx;
  }

  async run(interaction: StringSelectMenuInteraction, data: ComponentData): Promise<void> {
    // Parse componentId from Carbon's parsed ComponentData
    const parsed = parseAgentComponentData(data);
    if (!parsed) {
      logError("agent select: failed to parse component data");
      try {
        await interaction.reply({
          content: "This select menu is no longer valid.",
          ephemeral: true,
        });
      } catch {
        // Interaction may have expired
      }
      return;
    }

    const { componentId } = parsed;

    // Use interaction's actual channel_id (trusted source from Discord)
    // This prevents channel spoofing attacks
    const channelId = interaction.rawData.channel_id;
    if (!channelId) {
      logError("agent select: missing channel_id in interaction");
      return;
    }

    const user = interaction.user;
    if (!user) {
      logError("agent select: missing user in interaction");
      return;
    }

    const username = formatUsername(user);
    const userId = user.id;

    // P1 FIX: Use rawData.guild_id as source of truth - interaction.guild can be null
    // when guild is not cached even though guild_id is present in rawData
    const rawGuildId = interaction.rawData.guild_id;
    const isDirectMessage = !rawGuildId;
    const memberRoleIds = Array.isArray(interaction.rawData.member?.roles)
      ? interaction.rawData.member.roles.map((roleId: string) => String(roleId))
      : [];

    if (isDirectMessage) {
      const authorized = await ensureDmComponentAuthorized({
        ctx: this.ctx,
        interaction,
        user,
        componentLabel: "select menu",
      });
      if (!authorized) {
        return;
      }
    }

    // Check user allowlist before processing component interaction
    const guild = interaction.guild;
    const guildInfo = resolveDiscordGuildEntry({
      guild: guild ?? undefined,
      guildEntries: this.ctx.guildEntries,
    });

    // Resolve channel info for thread detection and allowlist inheritance
    const channel = interaction.channel;
    const channelName = channel && "name" in channel ? (channel.name as string) : undefined;
    const channelSlug = channelName ? normalizeDiscordSlug(channelName) : "";
    const channelType = channel && "type" in channel ? (channel.type as number) : undefined;
    const isThread = isThreadChannelType(channelType);

    // Resolve thread parent for allowlist inheritance
    let parentId: string | undefined;
    let parentName: string | undefined;
    let parentSlug = "";
    if (isThread && channel && "parentId" in channel) {
      parentId = (channel.parentId as string) ?? undefined;
      // Try to get parent name from channel's parent if available
      if ("parent" in channel) {
        const parent = (channel as { parent?: { name?: string } }).parent;
        if (parent?.name) {
          parentName = parent.name;
          parentSlug = normalizeDiscordSlug(parentName);
        }
      }
    }

    // Only check guild allowlists if this is a guild interaction
    if (rawGuildId) {
      const channelConfig = resolveDiscordChannelConfigWithFallback({
        guildInfo,
        channelId,
        channelName,
        channelSlug,
        parentId,
        parentName,
        parentSlug,
        scope: isThread ? "thread" : "channel",
      });

      const channelUsers = channelConfig?.users ?? guildInfo?.users;
      const channelRoles = channelConfig?.roles ?? guildInfo?.roles;
      const memberAllowed = resolveDiscordMemberAllowed({
        userAllowList: channelUsers,
        roleAllowList: channelRoles,
        memberRoleIds,
        userId,
        userName: user.username,
        userTag: user.discriminator ? `${user.username}#${user.discriminator}` : undefined,
      });
      if (!memberAllowed) {
        logVerbose(`agent select: blocked user ${userId} (not in users/roles allowlist)`);
        try {
          await interaction.reply({
            content: "You are not authorized to use this select menu.",
            ephemeral: true,
          });
        } catch {
          // Interaction may have expired
        }
        return;
      }
    }

    // Extract selected values
    const values = interaction.values ?? [];
    const valuesText = values.length > 0 ? ` (selected: ${values.join(", ")})` : "";

    // Resolve route with full context (guildId, proper peer kind, parentPeer)
    const route = resolveAgentRoute({
      cfg: this.ctx.cfg,
      channel: "discord",
      accountId: this.ctx.accountId,
      guildId: rawGuildId,
      memberRoleIds,
      peer: {
        kind: isDirectMessage ? "dm" : "channel",
        id: isDirectMessage ? userId : channelId,
      },
      parentPeer: parentId ? { kind: "channel", id: parentId } : undefined,
    });

    const eventText = `[Discord select menu: ${componentId} interacted by ${username} (${userId})${valuesText}]`;

    logDebug(`agent select: enqueuing event for channel ${channelId}: ${eventText}`);

    enqueueSystemEvent(eventText, {
      sessionKey: route.sessionKey,
      contextKey: `discord:agent-select:${channelId}:${componentId}:${userId}`,
    });

    // Acknowledge the interaction
    try {
      await interaction.reply({
        content: "✓",
        ephemeral: true,
      });
    } catch (err) {
      logError(`agent select: failed to acknowledge interaction: ${String(err)}`);
    }
  }
}

export function createAgentComponentButton(ctx: AgentComponentContext): Button {
  return new AgentComponentButton(ctx);
}

export function createAgentSelectMenu(ctx: AgentComponentContext): StringSelectMenu {
  return new AgentSelectMenu(ctx);
}
