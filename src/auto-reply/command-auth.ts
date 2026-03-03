import type { ChannelDock } from "../channels/dock.js";
<<<<<<< HEAD
<<<<<<< HEAD
import type { ChannelId } from "../channels/plugins/types.js";
<<<<<<< HEAD
import { normalizeAnyChannelId } from "../channels/registry.js";
<<<<<<< HEAD
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
import type { MsgContext } from "./templating.js";
=======
=======
>>>>>>> ed11e93cf (chore(format))
import type { OpenClawConfig } from "../config/config.js";
import type { MsgContext } from "./templating.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { getChannelDock, listChannelDocks } from "../channels/dock.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { ChannelId } from "../channels/plugins/types.js";
import type { OpenClawConfig } from "../config/config.js";
import { INTERNAL_MESSAGE_CHANNEL, normalizeMessageChannel } from "../utils/message-channel.js";
<<<<<<< HEAD
>>>>>>> ed11e93cf (chore(format))
=======
import type { MsgContext } from "./templating.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { getChannelDock, listChannelDocks } from "../channels/dock.js";
import type { ChannelId } from "../channels/plugins/types.js";
import { normalizeAnyChannelId } from "../channels/registry.js";
import type { OpenClawConfig } from "../config/config.js";
import { INTERNAL_MESSAGE_CHANNEL, normalizeMessageChannel } from "../utils/message-channel.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)

export type CommandAuthorization = {
  providerId?: ChannelId;
  ownerList: string[];
  senderId?: string;
  isAuthorizedSender: boolean;
  from?: string;
  to?: string;
};

function resolveProviderFromContext(ctx: MsgContext, cfg: MoltbotConfig): ChannelId | undefined {
  const direct =
    normalizeAnyChannelId(explicitMessageChannel ?? undefined) ??
    normalizeAnyChannelId(ctx.Provider) ??
    normalizeAnyChannelId(ctx.Surface) ??
    normalizeAnyChannelId(ctx.OriginatingChannel);
  if (direct) {
    return direct;
  }
  const candidates = [ctx.From, ctx.To]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(":").map((part) => part.trim()));
  for (const candidate of candidates) {
    const normalizedCandidateChannel = normalizeMessageChannel(candidate);
    if (normalizedCandidateChannel === INTERNAL_MESSAGE_CHANNEL) {
      return undefined;
    }
    const normalized =
      normalizeAnyChannelId(normalizedCandidateChannel ?? undefined) ??
      normalizeAnyChannelId(candidate);
    if (normalized) {
      return normalized;
    }
  }
  const configured = listChannelDocks()
    .map((dock) => {
      if (!dock.config?.resolveAllowFrom) {
        return null;
      }
      const allowFrom = dock.config.resolveAllowFrom({
        cfg,
        accountId: ctx.AccountId,
      });
      if (!Array.isArray(allowFrom) || allowFrom.length === 0) {
        return null;
      }
      return dock.id;
    })
    .filter((value): value is ChannelId => Boolean(value));
  if (configured.length === 1) {
    return configured[0];
  }
  return undefined;
}

function formatAllowFromList(params: {
  dock?: ChannelDock;
  cfg: MoltbotConfig;
  accountId?: string | null;
  allowFrom: Array<string | number>;
}): string[] {
  const { dock, cfg, accountId, allowFrom } = params;
  if (!allowFrom || allowFrom.length === 0) {
    return [];
  }
  if (dock?.config?.formatAllowFrom) {
    return dock.config.formatAllowFrom({ cfg, accountId, allowFrom });
  }
  return allowFrom.map((entry) => String(entry).trim()).filter(Boolean);
}

function normalizeAllowFromEntry(params: {
  dock?: ChannelDock;
  cfg: MoltbotConfig;
  accountId?: string | null;
  value: string;
}): string[] {
  const normalized = formatAllowFromList({
    dock: params.dock,
    cfg: params.cfg,
    accountId: params.accountId,
    allowFrom: [params.value],
  });
  return normalized.filter((entry) => entry.trim().length > 0);
}

function resolveOwnerAllowFromList(params: {
  dock?: ChannelDock;
  cfg: OpenClawConfig;
  accountId?: string | null;
  providerId?: ChannelId;
  allowFrom?: Array<string | number>;
}): string[] {
  const raw = params.allowFrom ?? params.cfg.commands?.ownerAllowFrom;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const filtered: string[] = [];
  for (const entry of raw) {
    const trimmed = String(entry ?? "").trim();
    if (!trimmed) {
      continue;
    }
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex > 0) {
      const prefix = trimmed.slice(0, separatorIndex);
      const channel = normalizeAnyChannelId(prefix);
      if (channel) {
        if (params.providerId && channel !== params.providerId) {
          continue;
        }
        const remainder = trimmed.slice(separatorIndex + 1).trim();
        if (remainder) {
          filtered.push(remainder);
        }
        continue;
      }
    }
    filtered.push(trimmed);
  }
  return formatAllowFromList({
    dock: params.dock,
    cfg: params.cfg,
    accountId: params.accountId,
    allowFrom: filtered,
  });
}

/**
 * Resolves the commands.allowFrom list for a given provider.
 * Returns the provider-specific list if defined, otherwise the "*" global list.
 * Returns null if commands.allowFrom is not configured at all (fall back to channel allowFrom).
 */
function resolveCommandsAllowFromList(params: {
  dock?: ChannelDock;
  cfg: OpenClawConfig;
  accountId?: string | null;
  providerId?: ChannelId;
}): string[] | null {
  const { dock, cfg, accountId, providerId } = params;
  const commandsAllowFrom = cfg.commands?.allowFrom;
  if (!commandsAllowFrom || typeof commandsAllowFrom !== "object") {
    return null; // Not configured, fall back to channel allowFrom
  }

  // Check provider-specific list first, then fall back to global "*"
  const providerKey = providerId ?? "";
  const providerList = commandsAllowFrom[providerKey];
  const globalList = commandsAllowFrom["*"];

  const rawList = Array.isArray(providerList) ? providerList : globalList;
  if (!Array.isArray(rawList)) {
    return null; // No applicable list found
  }

  return formatAllowFromList({
    dock,
    cfg,
    accountId,
    allowFrom: rawList,
  });
}

<<<<<<< HEAD
=======
function isConversationLikeIdentity(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized.includes("@g.us")) {
    return true;
  }
  if (normalized.startsWith("chat_id:")) {
    return true;
  }
  return /(^|:)(channel|group|thread|topic|room|space|spaces):/.test(normalized);
}

function shouldUseFromAsSenderFallback(params: {
  from?: string | null;
  chatType?: string | null;
}): boolean {
  const from = (params.from ?? "").trim();
  if (!from) {
    return false;
  }
  const chatType = (params.chatType ?? "").trim().toLowerCase();
  if (chatType && chatType !== "direct") {
    return false;
  }
  return !isConversationLikeIdentity(from);
}

>>>>>>> 08e2aa44e (fix(commands): restrict commands.allowFrom to sender principals)
function resolveSenderCandidates(params: {
  dock?: ChannelDock;
  providerId?: ChannelId;
  cfg: MoltbotConfig;
  accountId?: string | null;
  senderId?: string | null;
  senderE164?: string | null;
  from?: string | null;
  chatType?: string | null;
}): string[] {
  const { dock, cfg, accountId } = params;
  const candidates: string[] = [];
  const pushCandidate = (value?: string | null) => {
    const trimmed = (value ?? "").trim();
    if (!trimmed) {
      return;
    }
    candidates.push(trimmed);
  };
  if (params.providerId === "whatsapp") {
    pushCandidate(params.senderE164);
    pushCandidate(params.senderId);
  } else {
    pushCandidate(params.senderId);
    pushCandidate(params.senderE164);
  }
  if (
    candidates.length === 0 &&
    shouldUseFromAsSenderFallback({ from: params.from, chatType: params.chatType })
  ) {
    pushCandidate(params.from);
  }

  const normalized: string[] = [];
  for (const sender of candidates) {
    const entries = normalizeAllowFromEntry({ dock, cfg, accountId, value: sender });
    for (const entry of entries) {
      if (!normalized.includes(entry)) {
        normalized.push(entry);
      }
    }
  }
  return normalized;
}

export function resolveCommandAuthorization(params: {
  ctx: MsgContext;
  cfg: MoltbotConfig;
  commandAuthorized: boolean;
}): CommandAuthorization {
  const { ctx, cfg, commandAuthorized } = params;
  const providerId = resolveProviderFromContext(ctx, cfg);
  const dock = providerId ? getChannelDock(providerId) : undefined;
  const from = (ctx.From ?? "").trim();
  const to = (ctx.To ?? "").trim();

  // Check if commands.allowFrom is configured (separate command authorization)
  const commandsAllowFromList = resolveCommandsAllowFromList({
    dock,
    cfg,
    accountId: ctx.AccountId,
    providerId,
  });

  const allowFromRaw = dock?.config?.resolveAllowFrom
    ? dock.config.resolveAllowFrom({ cfg, accountId: ctx.AccountId })
    : [];
  const allowFromList = formatAllowFromList({
    dock,
    cfg,
    accountId: ctx.AccountId,
    allowFrom: Array.isArray(allowFromRaw) ? allowFromRaw : [],
  });
  const allowAll =
    allowFromList.length === 0 || allowFromList.some((entry) => entry.trim() === "*");

  const ownerCandidates = allowAll ? [] : allowFromList.filter((entry) => entry !== "*");
  if (!allowAll && ownerCandidates.length === 0 && to) {
    const normalizedTo = normalizeAllowFromEntry({
      dock,
      cfg,
      accountId: ctx.AccountId,
      value: to,
    });
    if (normalizedTo.length > 0) {
      ownerCandidates.push(...normalizedTo);
    }
  }
  const ownerList = Array.from(new Set(ownerCandidates));

  const senderCandidates = resolveSenderCandidates({
    dock,
    providerId,
    cfg,
    accountId: ctx.AccountId,
    senderId: ctx.SenderId,
    senderE164: ctx.SenderE164,
    from,
    chatType: ctx.ChatType,
  });
  const matchedSender = ownerList.length
    ? senderCandidates.find((candidate) => ownerList.includes(candidate))
    : undefined;
  const senderId = matchedSender ?? senderCandidates[0];

  const enforceOwner = Boolean(dock?.commands?.enforceOwnerForCommands);
  const isOwner = !enforceOwner || allowAll || ownerList.length === 0 || Boolean(matchedSender);
  const isAuthorizedSender = commandAuthorized && isOwner;

  return {
    providerId,
    ownerList,
    senderId: senderId || undefined,
    isAuthorizedSender,
    from: from || undefined,
    to: to || undefined,
  };
}
