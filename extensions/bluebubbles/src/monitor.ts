import type { IncomingMessage, ServerResponse } from "node:http";
<<<<<<< HEAD

import type { MoltbotConfig } from "clawdbot/plugin-sdk";
=======
import type { OpenClawConfig } from "openclaw/plugin-sdk";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { timingSafeEqual } from "node:crypto";
>>>>>>> ed11e93cf (chore(format))
import {
<<<<<<< HEAD
<<<<<<< HEAD
  createReplyPrefixOptions,
  logAckFailure,
  logInboundDrop,
  logTypingFailure,
  resolveAckReaction,
  resolveControlCommandGate,
} from "clawdbot/plugin-sdk";
import { markBlueBubblesChatRead, sendBlueBubblesTyping } from "./chat.js";
import { resolveChatGuidForTarget, sendMessageBlueBubbles } from "./send.js";
import { downloadBlueBubblesAttachment } from "./attachments.js";
import {
  formatBlueBubblesChatTarget,
  isAllowedBlueBubblesSender,
  normalizeBlueBubblesHandle,
} from "./targets.js";
import { sendBlueBubblesMedia } from "./media-send.js";
import type { BlueBubblesAccountConfig, BlueBubblesAttachment } from "./types.js";
import type { ResolvedBlueBubblesAccount } from "./accounts.js";
import { getBlueBubblesRuntime } from "./runtime.js";
import { normalizeBlueBubblesReactionInput, sendBlueBubblesReaction } from "./reactions.js";
import { fetchBlueBubblesServerInfo } from "./probe.js";

export type BlueBubblesRuntimeEnv = {
  log?: (message: string) => void;
  error?: (message: string) => void;
};

export type BlueBubblesMonitorOptions = {
  account: ResolvedBlueBubblesAccount;
  config: MoltbotConfig;
  runtime: BlueBubblesRuntimeEnv;
  abortSignal: AbortSignal;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
  webhookPath?: string;
};

const DEFAULT_WEBHOOK_PATH = "/bluebubbles-webhook";
const DEFAULT_TEXT_LIMIT = 4000;
const invalidAckReactions = new Set<string>();

const REPLY_CACHE_MAX = 2000;
const REPLY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type BlueBubblesReplyCacheEntry = {
  accountId: string;
  messageId: string;
  shortId: string;
  chatGuid?: string;
  chatIdentifier?: string;
  chatId?: number;
  senderLabel?: string;
  body?: string;
  timestamp: number;
};

// Best-effort cache for resolving reply context when BlueBubbles webhooks omit sender/body.
const blueBubblesReplyCacheByMessageId = new Map<string, BlueBubblesReplyCacheEntry>();

// Bidirectional maps for short ID ↔ message GUID resolution (token savings optimization)
const blueBubblesShortIdToUuid = new Map<string, string>();
const blueBubblesUuidToShortId = new Map<string, string>();
let blueBubblesShortIdCounter = 0;

function trimOrUndefined(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function generateShortId(): string {
  blueBubblesShortIdCounter += 1;
  return String(blueBubblesShortIdCounter);
}

function rememberBlueBubblesReplyCache(
  entry: Omit<BlueBubblesReplyCacheEntry, "shortId">,
): BlueBubblesReplyCacheEntry {
  const messageId = entry.messageId.trim();
  if (!messageId) {
    return { ...entry, shortId: "" };
  }

  // Check if we already have a short ID for this GUID
  let shortId = blueBubblesUuidToShortId.get(messageId);
  if (!shortId) {
    shortId = generateShortId();
    blueBubblesShortIdToUuid.set(shortId, messageId);
    blueBubblesUuidToShortId.set(messageId, shortId);
  }

  const fullEntry: BlueBubblesReplyCacheEntry = { ...entry, messageId, shortId };

  // Refresh insertion order.
  blueBubblesReplyCacheByMessageId.delete(messageId);
  blueBubblesReplyCacheByMessageId.set(messageId, fullEntry);

  // Opportunistic prune.
  const cutoff = Date.now() - REPLY_CACHE_TTL_MS;
  for (const [key, value] of blueBubblesReplyCacheByMessageId) {
    if (value.timestamp < cutoff) {
      blueBubblesReplyCacheByMessageId.delete(key);
      // Clean up short ID mappings for expired entries
      if (value.shortId) {
        blueBubblesShortIdToUuid.delete(value.shortId);
        blueBubblesUuidToShortId.delete(key);
      }
      continue;
    }
    break;
  }
  while (blueBubblesReplyCacheByMessageId.size > REPLY_CACHE_MAX) {
    const oldest = blueBubblesReplyCacheByMessageId.keys().next().value as string | undefined;
    if (!oldest) {
      break;
    }
    const oldEntry = blueBubblesReplyCacheByMessageId.get(oldest);
    blueBubblesReplyCacheByMessageId.delete(oldest);
    // Clean up short ID mappings for evicted entries
    if (oldEntry?.shortId) {
      blueBubblesShortIdToUuid.delete(oldEntry.shortId);
      blueBubblesUuidToShortId.delete(oldest);
    }
  }

  return fullEntry;
}

/**
 * Resolves a short message ID (e.g., "1", "2") to a full BlueBubbles GUID.
 * Returns the input unchanged if it's already a GUID or not found in the mapping.
 */
export function resolveBlueBubblesMessageId(
  shortOrUuid: string,
  opts?: { requireKnownShortId?: boolean },
): string {
  const trimmed = shortOrUuid.trim();
  if (!trimmed) {
    return trimmed;
  }

  // If it looks like a short ID (numeric), try to resolve it
  if (/^\d+$/.test(trimmed)) {
    const uuid = blueBubblesShortIdToUuid.get(trimmed);
    if (uuid) {
      return uuid;
    }
    if (opts?.requireKnownShortId) {
      throw new Error(
        `BlueBubbles short message id "${trimmed}" is no longer available. Use MessageSidFull.`,
      );
    }
  }

  // Return as-is (either already a UUID or not found)
  return trimmed;
}

/**
 * Resets the short ID state. Only use in tests.
 * @internal
 */
export function _resetBlueBubblesShortIdState(): void {
  blueBubblesShortIdToUuid.clear();
  blueBubblesUuidToShortId.clear();
  blueBubblesReplyCacheByMessageId.clear();
  blueBubblesShortIdCounter = 0;
}

/**
 * Gets the short ID for a message GUID, if one exists.
 */
function getShortIdForUuid(uuid: string): string | undefined {
  return blueBubblesUuidToShortId.get(uuid.trim());
}

function resolveReplyContextFromCache(params: {
  accountId: string;
  replyToId: string;
  chatGuid?: string;
  chatIdentifier?: string;
  chatId?: number;
}): BlueBubblesReplyCacheEntry | null {
  const replyToId = params.replyToId.trim();
  if (!replyToId) {
    return null;
  }

  const cached = blueBubblesReplyCacheByMessageId.get(replyToId);
  if (!cached) {
    return null;
  }
  if (cached.accountId !== params.accountId) {
    return null;
  }

  const cutoff = Date.now() - REPLY_CACHE_TTL_MS;
  if (cached.timestamp < cutoff) {
    blueBubblesReplyCacheByMessageId.delete(replyToId);
    return null;
  }

  const chatGuid = trimOrUndefined(params.chatGuid);
  const chatIdentifier = trimOrUndefined(params.chatIdentifier);
  const cachedChatGuid = trimOrUndefined(cached.chatGuid);
  const cachedChatIdentifier = trimOrUndefined(cached.chatIdentifier);
  const chatId = typeof params.chatId === "number" ? params.chatId : undefined;
  const cachedChatId = typeof cached.chatId === "number" ? cached.chatId : undefined;

  // Avoid cross-chat collisions if we have identifiers.
  if (chatGuid && cachedChatGuid && chatGuid !== cachedChatGuid) {
    return null;
  }
  if (
    !chatGuid &&
    chatIdentifier &&
    cachedChatIdentifier &&
    chatIdentifier !== cachedChatIdentifier
  ) {
    return null;
  }
  if (!chatGuid && !chatIdentifier && chatId && cachedChatId && chatId !== cachedChatId) {
    return null;
  }

  return cached;
}

type BlueBubblesCoreRuntime = ReturnType<typeof getBlueBubblesRuntime>;

function logVerbose(
  core: BlueBubblesCoreRuntime,
  runtime: BlueBubblesRuntimeEnv,
  message: string,
): void {
  if (core.logging.shouldLogVerbose()) {
    runtime.log?.(`[bluebubbles] ${message}`);
  }
}

function logGroupAllowlistHint(params: {
  runtime: BlueBubblesRuntimeEnv;
  reason: string;
  entry: string | null;
  chatName?: string;
  accountId?: string;
}): void {
  const log = params.runtime.log ?? console.log;
  const nameHint = params.chatName ? ` (group name: ${params.chatName})` : "";
  const accountHint = params.accountId
    ? ` (or channels.bluebubbles.accounts.${params.accountId}.groupAllowFrom)`
    : "";
  if (params.entry) {
    log(
      `[bluebubbles] group message blocked (${params.reason}). Allow this group by adding ` +
        `"${params.entry}" to channels.bluebubbles.groupAllowFrom${nameHint}.`,
    );
    log(
      `[bluebubbles] add to config: channels.bluebubbles.groupAllowFrom=["${params.entry}"]${accountHint}.`,
    );
    return;
  }
  log(
    `[bluebubbles] group message blocked (${params.reason}). Allow groups by setting ` +
      `channels.bluebubbles.groupPolicy="open" or adding a group id to ` +
      `channels.bluebubbles.groupAllowFrom${accountHint}${nameHint}.`,
  );
}

type WebhookTarget = {
  account: ResolvedBlueBubblesAccount;
  config: MoltbotConfig;
  runtime: BlueBubblesRuntimeEnv;
  core: BlueBubblesCoreRuntime;
  path: string;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
};
=======
=======
  registerWebhookTarget,
  rejectNonPostWebhookRequest,
  resolveWebhookTargets,
} from "openclaw/plugin-sdk";
import {
>>>>>>> 544ffbcf7 (refactor(extensions): dedupe connector helper usage)
  normalizeWebhookMessage,
  normalizeWebhookReaction,
  type NormalizedWebhookMessage,
} from "./monitor-normalize.js";
import { logVerbose, processMessage, processReaction } from "./monitor-processing.js";
import {
  _resetBlueBubblesShortIdState,
  resolveBlueBubblesMessageId,
} from "./monitor-reply-cache.js";
import {
  DEFAULT_WEBHOOK_PATH,
  normalizeWebhookPath,
  resolveWebhookPathFromConfig,
  type BlueBubblesCoreRuntime,
  type BlueBubblesMonitorOptions,
  type WebhookTarget,
} from "./monitor-shared.js";
import { fetchBlueBubblesServerInfo } from "./probe.js";
import { getBlueBubblesRuntime } from "./runtime.js";
>>>>>>> a1df0939d (refactor(bluebubbles): split monitor parsing and processing modules)

/**
 * Entry type for debouncing inbound messages.
 * Captures the normalized message and its target for later combined processing.
 */
type BlueBubblesDebounceEntry = {
  message: NormalizedWebhookMessage;
  target: WebhookTarget;
};

/**
 * Default debounce window for inbound message coalescing (ms).
 * This helps combine URL text + link preview balloon messages that BlueBubbles
 * sends as separate webhook events when no explicit inbound debounce config exists.
 */
const DEFAULT_INBOUND_DEBOUNCE_MS = 500;

/**
 * Combines multiple debounced messages into a single message for processing.
 * Used when multiple webhook events arrive within the debounce window.
 */
function combineDebounceEntries(entries: BlueBubblesDebounceEntry[]): NormalizedWebhookMessage {
  if (entries.length === 0) {
    throw new Error("Cannot combine empty entries");
  }
  if (entries.length === 1) {
    return entries[0].message;
  }

  // Use the first message as the base (typically the text message)
  const first = entries[0].message;

  // Combine text from all entries, filtering out duplicates and empty strings
  const seenTexts = new Set<string>();
  const textParts: string[] = [];

  for (const entry of entries) {
    const text = entry.message.text.trim();
    if (!text) {
      continue;
    }
    // Skip duplicate text (URL might be in both text message and balloon)
    const normalizedText = text.toLowerCase();
    if (seenTexts.has(normalizedText)) {
      continue;
    }
    seenTexts.add(normalizedText);
    textParts.push(text);
  }

  // Merge attachments from all entries
  const allAttachments = entries.flatMap((e) => e.message.attachments ?? []);

  // Use the latest timestamp
  const timestamps = entries
    .map((e) => e.message.timestamp)
    .filter((t): t is number => typeof t === "number");
  const latestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : first.timestamp;

  // Collect all message IDs for reference
  const messageIds = entries
    .map((e) => e.message.messageId)
    .filter((id): id is string => Boolean(id));

  // Prefer reply context from any entry that has it
  const entryWithReply = entries.find((e) => e.message.replyToId);

  return {
    ...first,
    text: textParts.join(" "),
    attachments: allAttachments.length > 0 ? allAttachments : first.attachments,
    timestamp: latestTimestamp,
    // Use first message's ID as primary (for reply reference), but we've coalesced others
    messageId: messageIds[0] ?? first.messageId,
    // Preserve reply context if present
    replyToId: entryWithReply?.message.replyToId ?? first.replyToId,
    replyToBody: entryWithReply?.message.replyToBody ?? first.replyToBody,
    replyToSender: entryWithReply?.message.replyToSender ?? first.replyToSender,
    // Clear balloonBundleId since we've combined (the combined message is no longer just a balloon)
    balloonBundleId: undefined,
  };
}

const webhookTargets = new Map<string, WebhookTarget[]>();

type BlueBubblesDebouncer = {
  enqueue: (item: BlueBubblesDebounceEntry) => Promise<void>;
  flushKey: (key: string) => Promise<void>;
};

/**
 * Maps webhook targets to their inbound debouncers.
 * Each target gets its own debouncer keyed by a unique identifier.
 */
const targetDebouncers = new Map<WebhookTarget, BlueBubblesDebouncer>();

function resolveBlueBubblesDebounceMs(
  config: MoltbotConfig,
  core: BlueBubblesCoreRuntime,
): number {
  const inbound = config.messages?.inbound;
  const hasExplicitDebounce =
    typeof inbound?.debounceMs === "number" || typeof inbound?.byChannel?.bluebubbles === "number";
  if (!hasExplicitDebounce) {
    return DEFAULT_INBOUND_DEBOUNCE_MS;
  }
  return core.channel.debounce.resolveInboundDebounceMs({ cfg: config, channel: "bluebubbles" });
}

/**
 * Creates or retrieves a debouncer for a webhook target.
 */
function getOrCreateDebouncer(target: WebhookTarget) {
  const existing = targetDebouncers.get(target);
  if (existing) {
    return existing;
  }

  const { account, config, runtime, core } = target;

  const debouncer = core.channel.debounce.createInboundDebouncer<BlueBubblesDebounceEntry>({
    debounceMs: resolveBlueBubblesDebounceMs(config, core),
    buildKey: (entry) => {
      const msg = entry.message;
      // Prefer stable, shared identifiers to coalesce rapid-fire webhook events for the
      // same message (e.g., text-only then text+attachment).
      //
      // For balloons (URL previews, stickers, etc), BlueBubbles often uses a different
      // messageId than the originating text. When present, key by associatedMessageGuid
      // to keep text + balloon coalescing working.
      const balloonBundleId = msg.balloonBundleId?.trim();
      const associatedMessageGuid = msg.associatedMessageGuid?.trim();
      if (balloonBundleId && associatedMessageGuid) {
        return `bluebubbles:${account.accountId}:balloon:${associatedMessageGuid}`;
      }

      const messageId = msg.messageId?.trim();
      if (messageId) {
        return `bluebubbles:${account.accountId}:msg:${messageId}`;
      }

      const chatKey =
        msg.chatGuid?.trim() ??
        msg.chatIdentifier?.trim() ??
        (msg.chatId ? String(msg.chatId) : "dm");
      return `bluebubbles:${account.accountId}:${chatKey}:${msg.senderId}`;
    },
    shouldDebounce: (entry) => {
      const msg = entry.message;
      // Skip debouncing for from-me messages (they're just cached, not processed)
      if (msg.fromMe) {
        return false;
      }
      // Skip debouncing for control commands - process immediately
      if (core.channel.text.hasControlCommand(msg.text, config)) {
        return false;
      }
      // Debounce all other messages to coalesce rapid-fire webhook events
      // (e.g., text+image arriving as separate webhooks for the same messageId)
      return true;
    },
    onFlush: async (entries) => {
      if (entries.length === 0) {
        return;
      }

      // Use target from first entry (all entries have same target due to key structure)
      const flushTarget = entries[0].target;

      if (entries.length === 1) {
        // Single message - process normally
        await processMessage(entries[0].message, flushTarget);
        return;
      }

      // Multiple messages - combine and process
      const combined = combineDebounceEntries(entries);

      if (core.logging.shouldLogVerbose()) {
        const count = entries.length;
        const preview = combined.text.slice(0, 50);
        runtime.log?.(
          `[bluebubbles] coalesced ${count} messages: "${preview}${combined.text.length > 50 ? "..." : ""}"`,
        );
      }

      await processMessage(combined, flushTarget);
    },
    onError: (err) => {
      runtime.error?.(`[${account.accountId}] [bluebubbles] debounce flush failed: ${String(err)}`);
    },
  });

  targetDebouncers.set(target, debouncer);
  return debouncer;
}

/**
 * Removes a debouncer for a target (called during unregistration).
 */
function removeDebouncer(target: WebhookTarget): void {
  targetDebouncers.delete(target);
}

export function registerBlueBubblesWebhookTarget(target: WebhookTarget): () => void {
  const registered = registerWebhookTarget(webhookTargets, target);
  return () => {
    registered.unregister();
    // Clean up debouncer when target is unregistered
    removeDebouncer(registered.target);
  };
}

<<<<<<< HEAD
async function readJsonBody(req: IncomingMessage, maxBytes: number) {
  const chunks: Buffer[] = [];
  let total = 0;
  return await new Promise<{ ok: boolean; value?: unknown; error?: string }>((resolve) => {
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        resolve({ ok: false, error: "payload too large" });
        req.destroy();
        return;
      }
=======
async function readJsonBody(req: IncomingMessage, maxBytes: number, timeoutMs = 30_000) {
  const chunks: Buffer[] = [];
  let total = 0;
  return await new Promise<{ ok: boolean; value?: unknown; error?: string }>((resolve) => {
    let done = false;
    const finish = (result: { ok: boolean; value?: unknown; error?: string }) => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ ok: false, error: "request body timeout" });
      req.destroy();
    }, timeoutMs);

    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        finish({ ok: false, error: "payload too large" });
        req.destroy();
        return;
      }
>>>>>>> a1df0939d (refactor(bluebubbles): split monitor parsing and processing modules)
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw.trim()) {
<<<<<<< HEAD
          resolve({ ok: false, error: "empty payload" });
          return;
        }
        try {
          resolve({ ok: true, value: JSON.parse(raw) as unknown });
=======
          finish({ ok: false, error: "empty payload" });
          return;
        }
        try {
          finish({ ok: true, value: JSON.parse(raw) as unknown });
>>>>>>> a1df0939d (refactor(bluebubbles): split monitor parsing and processing modules)
          return;
        } catch {
          const params = new URLSearchParams(raw);
          const payload = params.get("payload") ?? params.get("data") ?? params.get("message");
          if (payload) {
<<<<<<< HEAD
            resolve({ ok: true, value: JSON.parse(payload) as unknown });
=======
            finish({ ok: true, value: JSON.parse(payload) as unknown });
>>>>>>> a1df0939d (refactor(bluebubbles): split monitor parsing and processing modules)
            return;
          }
          throw new Error("invalid json");
        }
      } catch (err) {
<<<<<<< HEAD
        resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    });
    req.on("error", (err) => {
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
=======
        finish({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    });
    req.on("error", (err) => {
      finish({ ok: false, error: err instanceof Error ? err.message : String(err) });
    });
    req.on("close", () => {
      finish({ ok: false, error: "connection closed" });
>>>>>>> a1df0939d (refactor(bluebubbles): split monitor parsing and processing modules)
    });
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function maskSecret(value: string): string {
  if (value.length <= 6) {
    return "***";
  }
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

<<<<<<< HEAD
function resolveBlueBubblesAckReaction(params: {
  cfg: MoltbotConfig;
  agentId: string;
  core: BlueBubblesCoreRuntime;
  runtime: BlueBubblesRuntimeEnv;
}): string | null {
  const raw = resolveAckReaction(params.cfg, params.agentId).trim();
  if (!raw) {
    return null;
  }
  try {
    normalizeBlueBubblesReactionInput(raw);
    return raw;
  } catch {
    const key = raw.toLowerCase();
    if (!invalidAckReactions.has(key)) {
      invalidAckReactions.add(key);
      logVerbose(
        params.core,
        params.runtime,
        `ack reaction skipped (unsupported for BlueBubbles): ${raw}`,
      );
    }
    return null;
  }
}

function extractMessagePayload(payload: Record<string, unknown>): Record<string, unknown> | null {
  const dataRaw = payload.data ?? payload.payload ?? payload.event;
  const data =
    asRecord(dataRaw) ??
    (typeof dataRaw === "string" ? (asRecord(JSON.parse(dataRaw)) ?? null) : null);
  const messageRaw = payload.message ?? data?.message ?? data;
  const message =
    asRecord(messageRaw) ??
    (typeof messageRaw === "string" ? (asRecord(JSON.parse(messageRaw)) ?? null) : null);
  if (!message) {
    return null;
  }
  return message;
}

function normalizeWebhookMessage(
  payload: Record<string, unknown>,
): NormalizedWebhookMessage | null {
  const message = extractMessagePayload(payload);
  if (!message) {
    return null;
  }

  const text =
    readString(message, "text") ??
    readString(message, "body") ??
    readString(message, "subject") ??
    "";

  const handleValue = message.handle ?? message.sender;
  const handle =
    asRecord(handleValue) ?? (typeof handleValue === "string" ? { address: handleValue } : null);
  const senderId =
    readString(handle, "address") ??
    readString(handle, "handle") ??
    readString(handle, "id") ??
    readString(message, "senderId") ??
    readString(message, "sender") ??
    readString(message, "from") ??
    "";

  const senderName =
    readString(handle, "displayName") ??
    readString(handle, "name") ??
    readString(message, "senderName") ??
    undefined;

  const chat = asRecord(message.chat) ?? asRecord(message.conversation) ?? null;
  const chatFromList = readFirstChatRecord(message);
  const chatGuid =
    readString(message, "chatGuid") ??
    readString(message, "chat_guid") ??
    readString(chat, "chatGuid") ??
    readString(chat, "chat_guid") ??
    readString(chat, "guid") ??
    readString(chatFromList, "chatGuid") ??
    readString(chatFromList, "chat_guid") ??
    readString(chatFromList, "guid");
  const chatIdentifier =
    readString(message, "chatIdentifier") ??
    readString(message, "chat_identifier") ??
    readString(chat, "chatIdentifier") ??
    readString(chat, "chat_identifier") ??
    readString(chat, "identifier") ??
    readString(chatFromList, "chatIdentifier") ??
    readString(chatFromList, "chat_identifier") ??
    readString(chatFromList, "identifier") ??
    extractChatIdentifierFromChatGuid(chatGuid);
  const chatId =
    readNumberLike(message, "chatId") ??
    readNumberLike(message, "chat_id") ??
    readNumberLike(chat, "chatId") ??
    readNumberLike(chat, "chat_id") ??
    readNumberLike(chat, "id") ??
    readNumberLike(chatFromList, "chatId") ??
    readNumberLike(chatFromList, "chat_id") ??
    readNumberLike(chatFromList, "id");
  const chatName =
    readString(message, "chatName") ??
    readString(chat, "displayName") ??
    readString(chat, "name") ??
    readString(chatFromList, "displayName") ??
    readString(chatFromList, "name") ??
    undefined;

  const chatParticipants = chat ? chat["participants"] : undefined;
  const messageParticipants = message["participants"];
  const chatsParticipants = chatFromList ? chatFromList["participants"] : undefined;
  const participants = Array.isArray(chatParticipants)
    ? chatParticipants
    : Array.isArray(messageParticipants)
      ? messageParticipants
      : Array.isArray(chatsParticipants)
        ? chatsParticipants
        : [];
  const normalizedParticipants = normalizeParticipantList(participants);
  const participantsCount = participants.length;
  const groupFromChatGuid = resolveGroupFlagFromChatGuid(chatGuid);
  const explicitIsGroup =
    readBoolean(message, "isGroup") ??
    readBoolean(message, "is_group") ??
    readBoolean(chat, "isGroup") ??
    readBoolean(message, "group");
  const isGroup =
    typeof groupFromChatGuid === "boolean"
      ? groupFromChatGuid
      : (explicitIsGroup ?? participantsCount > 2);

  const fromMe = readBoolean(message, "isFromMe") ?? readBoolean(message, "is_from_me");
  const messageId =
    readString(message, "guid") ??
    readString(message, "id") ??
    readString(message, "messageId") ??
    undefined;
  const balloonBundleId = readString(message, "balloonBundleId");
  const associatedMessageGuid =
    readString(message, "associatedMessageGuid") ??
    readString(message, "associated_message_guid") ??
    readString(message, "associatedMessageId") ??
    undefined;
  const associatedMessageType =
    readNumberLike(message, "associatedMessageType") ??
    readNumberLike(message, "associated_message_type");
  const associatedMessageEmoji =
    readString(message, "associatedMessageEmoji") ??
    readString(message, "associated_message_emoji") ??
    readString(message, "reactionEmoji") ??
    readString(message, "reaction_emoji") ??
    undefined;
  const isTapback =
    readBoolean(message, "isTapback") ??
    readBoolean(message, "is_tapback") ??
    readBoolean(message, "tapback") ??
    undefined;

  const timestampRaw =
    readNumber(message, "date") ??
    readNumber(message, "dateCreated") ??
    readNumber(message, "timestamp");
  const timestamp =
    typeof timestampRaw === "number"
      ? timestampRaw > 1_000_000_000_000
        ? timestampRaw
        : timestampRaw * 1000
      : undefined;

  const normalizedSender = normalizeBlueBubblesHandle(senderId);
  if (!normalizedSender) {
    return null;
  }
  const replyMetadata = extractReplyMetadata(message);

  return {
    text,
    senderId: normalizedSender,
    senderName,
    messageId,
    timestamp,
    isGroup,
    chatId,
    chatGuid,
    chatIdentifier,
    chatName,
    fromMe,
    attachments: extractAttachments(message),
    balloonBundleId,
    associatedMessageGuid,
    associatedMessageType,
    associatedMessageEmoji,
    isTapback,
    participants: normalizedParticipants,
    replyToId: replyMetadata.replyToId,
    replyToBody: replyMetadata.replyToBody,
    replyToSender: replyMetadata.replyToSender,
  };
}

function normalizeWebhookReaction(
  payload: Record<string, unknown>,
): NormalizedWebhookReaction | null {
  const message = extractMessagePayload(payload);
  if (!message) {
    return null;
  }

  const associatedGuid =
    readString(message, "associatedMessageGuid") ??
    readString(message, "associated_message_guid") ??
    readString(message, "associatedMessageId");
  const associatedType =
    readNumberLike(message, "associatedMessageType") ??
    readNumberLike(message, "associated_message_type");
  if (!associatedGuid || associatedType === undefined) {
    return null;
  }

  const mapping = REACTION_TYPE_MAP.get(associatedType);
  const associatedEmoji =
    readString(message, "associatedMessageEmoji") ??
    readString(message, "associated_message_emoji") ??
    readString(message, "reactionEmoji") ??
    readString(message, "reaction_emoji");
  const emoji = (associatedEmoji?.trim() || mapping?.emoji) ?? `reaction:${associatedType}`;
  const action = mapping?.action ?? resolveTapbackActionHint(associatedType) ?? "added";

  const handleValue = message.handle ?? message.sender;
  const handle =
    asRecord(handleValue) ?? (typeof handleValue === "string" ? { address: handleValue } : null);
  const senderId =
    readString(handle, "address") ??
    readString(handle, "handle") ??
    readString(handle, "id") ??
    readString(message, "senderId") ??
    readString(message, "sender") ??
    readString(message, "from") ??
    "";
  const senderName =
    readString(handle, "displayName") ??
    readString(handle, "name") ??
    readString(message, "senderName") ??
    undefined;

  const chat = asRecord(message.chat) ?? asRecord(message.conversation) ?? null;
  const chatFromList = readFirstChatRecord(message);
  const chatGuid =
    readString(message, "chatGuid") ??
    readString(message, "chat_guid") ??
    readString(chat, "chatGuid") ??
    readString(chat, "chat_guid") ??
    readString(chat, "guid") ??
    readString(chatFromList, "chatGuid") ??
    readString(chatFromList, "chat_guid") ??
    readString(chatFromList, "guid");
  const chatIdentifier =
    readString(message, "chatIdentifier") ??
    readString(message, "chat_identifier") ??
    readString(chat, "chatIdentifier") ??
    readString(chat, "chat_identifier") ??
    readString(chat, "identifier") ??
    readString(chatFromList, "chatIdentifier") ??
    readString(chatFromList, "chat_identifier") ??
    readString(chatFromList, "identifier") ??
    extractChatIdentifierFromChatGuid(chatGuid);
  const chatId =
    readNumberLike(message, "chatId") ??
    readNumberLike(message, "chat_id") ??
    readNumberLike(chat, "chatId") ??
    readNumberLike(chat, "chat_id") ??
    readNumberLike(chat, "id") ??
    readNumberLike(chatFromList, "chatId") ??
    readNumberLike(chatFromList, "chat_id") ??
    readNumberLike(chatFromList, "id");
  const chatName =
    readString(message, "chatName") ??
    readString(chat, "displayName") ??
    readString(chat, "name") ??
    readString(chatFromList, "displayName") ??
    readString(chatFromList, "name") ??
    undefined;

  const chatParticipants = chat ? chat["participants"] : undefined;
  const messageParticipants = message["participants"];
  const chatsParticipants = chatFromList ? chatFromList["participants"] : undefined;
  const participants = Array.isArray(chatParticipants)
    ? chatParticipants
    : Array.isArray(messageParticipants)
      ? messageParticipants
      : Array.isArray(chatsParticipants)
        ? chatsParticipants
        : [];
  const participantsCount = participants.length;
  const groupFromChatGuid = resolveGroupFlagFromChatGuid(chatGuid);
  const explicitIsGroup =
    readBoolean(message, "isGroup") ??
    readBoolean(message, "is_group") ??
    readBoolean(chat, "isGroup") ??
    readBoolean(message, "group");
  const isGroup =
    typeof groupFromChatGuid === "boolean"
      ? groupFromChatGuid
      : (explicitIsGroup ?? participantsCount > 2);

  const fromMe = readBoolean(message, "isFromMe") ?? readBoolean(message, "is_from_me");
  const timestampRaw =
    readNumberLike(message, "date") ??
    readNumberLike(message, "dateCreated") ??
    readNumberLike(message, "timestamp");
  const timestamp =
    typeof timestampRaw === "number"
      ? timestampRaw > 1_000_000_000_000
        ? timestampRaw
        : timestampRaw * 1000
      : undefined;

  const normalizedSender = normalizeBlueBubblesHandle(senderId);
  if (!normalizedSender) {
    return null;
  }

  return {
    action,
    emoji,
    senderId: normalizedSender,
    senderName,
    messageId: associatedGuid,
    timestamp,
    isGroup,
    chatId,
    chatGuid,
    chatIdentifier,
    chatName,
    fromMe,
  };
}

=======
>>>>>>> a1df0939d (refactor(bluebubbles): split monitor parsing and processing modules)
export async function handleBlueBubblesWebhookRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const resolved = resolveWebhookTargets(req, webhookTargets);
  if (!resolved) {
    return false;
  }
  const { path, targets } = resolved;
  const url = new URL(req.url ?? "/", "http://localhost");

  if (rejectNonPostWebhookRequest(req, res)) {
    return true;
  }

  const body = await readJsonBody(req, 1024 * 1024);
  if (!body.ok) {
    if (body.error === "payload too large") {
      res.statusCode = 413;
    } else if (body.error === "request body timeout") {
      res.statusCode = 408;
    } else {
      res.statusCode = 400;
    }
    res.end(body.error ?? "invalid payload");
    console.warn(`[bluebubbles] webhook rejected: ${body.error ?? "invalid payload"}`);
    return true;
  }

  const payload = asRecord(body.value) ?? {};
  const firstTarget = targets[0];
  if (firstTarget) {
    logVerbose(
      firstTarget.core,
      firstTarget.runtime,
      `webhook received path=${path} keys=${Object.keys(payload).join(",") || "none"}`,
    );
  }
  const eventTypeRaw = payload.type;
  const eventType = typeof eventTypeRaw === "string" ? eventTypeRaw.trim() : "";
  const allowedEventTypes = new Set([
    "new-message",
    "updated-message",
    "message-reaction",
    "reaction",
  ]);
  if (eventType && !allowedEventTypes.has(eventType)) {
    res.statusCode = 200;
    res.end("ok");
    if (firstTarget) {
      logVerbose(firstTarget.core, firstTarget.runtime, `webhook ignored type=${eventType}`);
    }
    return true;
  }
  const reaction = normalizeWebhookReaction(payload);
  if (
    (eventType === "updated-message" ||
      eventType === "message-reaction" ||
      eventType === "reaction") &&
    !reaction
  ) {
    res.statusCode = 200;
    res.end("ok");
    if (firstTarget) {
      logVerbose(
        firstTarget.core,
        firstTarget.runtime,
        `webhook ignored ${eventType || "event"} without reaction`,
      );
    }
    return true;
  }
  const message = reaction ? null : normalizeWebhookMessage(payload);
  if (!message && !reaction) {
    res.statusCode = 400;
    res.end("invalid payload");
    console.warn("[bluebubbles] webhook rejected: unable to parse message payload");
    return true;
  }

  const matching = targets.filter((target) => {
    const token = target.account.config.password?.trim();
    if (!token) {
      return true;
    }
    const guidParam = url.searchParams.get("guid") ?? url.searchParams.get("password");
    const headerToken =
      req.headers["x-guid"] ??
      req.headers["x-password"] ??
      req.headers["x-bluebubbles-guid"] ??
      req.headers["authorization"];
    const guid = (Array.isArray(headerToken) ? headerToken[0] : headerToken) ?? guidParam ?? "";
    if (guid && guid.trim() === token) {
      return true;
    }
    const remote = req.socket?.remoteAddress ?? "";
    if (remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1") {
      return true;
    }
    return false;
  });

  if (matching.length === 0) {
    res.statusCode = 401;
    res.end("unauthorized");
    console.warn(
      `[bluebubbles] webhook rejected: unauthorized guid=${maskSecret(url.searchParams.get("guid") ?? url.searchParams.get("password") ?? "")}`,
    );
    return true;
  }

  for (const target of matching) {
    target.statusSink?.({ lastInboundAt: Date.now() });
    if (reaction) {
      processReaction(reaction, target).catch((err) => {
        target.runtime.error?.(
          `[${target.account.accountId}] BlueBubbles reaction failed: ${String(err)}`,
        );
      });
    } else if (message) {
      // Route messages through debouncer to coalesce rapid-fire events
      // (e.g., text message + URL balloon arriving as separate webhooks)
      const debouncer = getOrCreateDebouncer(target);
      debouncer.enqueue({ message, target }).catch((err) => {
        target.runtime.error?.(
          `[${target.account.accountId}] BlueBubbles webhook failed: ${String(err)}`,
        );
      });
    }
  }

  res.statusCode = 200;
  res.end("ok");
  if (reaction) {
    if (firstTarget) {
      logVerbose(
        firstTarget.core,
        firstTarget.runtime,
        `webhook accepted reaction sender=${reaction.senderId} msg=${reaction.messageId} action=${reaction.action}`,
      );
    }
  } else if (message) {
    if (firstTarget) {
      logVerbose(
        firstTarget.core,
        firstTarget.runtime,
        `webhook accepted sender=${message.senderId} group=${message.isGroup} chatGuid=${message.chatGuid ?? ""} chatId=${message.chatId ?? ""}`,
      );
    }
  }
  return true;
}

<<<<<<< HEAD
async function processMessage(
  message: NormalizedWebhookMessage,
  target: WebhookTarget,
): Promise<void> {
  const { account, config, runtime, core, statusSink } = target;

  const groupFlag = resolveGroupFlagFromChatGuid(message.chatGuid);
  const isGroup = typeof groupFlag === "boolean" ? groupFlag : message.isGroup;

  const text = message.text.trim();
  const attachments = message.attachments ?? [];
  const placeholder = buildMessagePlaceholder(message);
  // Check if text is a tapback pattern (e.g., 'Loved "hello"') and transform to emoji format
  // For tapbacks, we'll append [[reply_to:N]] at the end; for regular messages, prepend it
  const tapbackContext = resolveTapbackContext(message);
  const tapbackParsed = parseTapbackText({
    text,
    emojiHint: tapbackContext?.emojiHint,
    actionHint: tapbackContext?.actionHint,
    requireQuoted: !tapbackContext,
  });
  const isTapbackMessage = Boolean(tapbackParsed);
  const rawBody = tapbackParsed
    ? tapbackParsed.action === "removed"
      ? `removed ${tapbackParsed.emoji} reaction`
      : `reacted with ${tapbackParsed.emoji}`
    : text || placeholder;

  const cacheMessageId = message.messageId?.trim();
  let messageShortId: string | undefined;
  const cacheInboundMessage = () => {
    if (!cacheMessageId) {
      return;
    }
    const cacheEntry = rememberBlueBubblesReplyCache({
      accountId: account.accountId,
      messageId: cacheMessageId,
      chatGuid: message.chatGuid,
      chatIdentifier: message.chatIdentifier,
      chatId: message.chatId,
      senderLabel: message.fromMe ? "me" : message.senderId,
      body: rawBody,
      timestamp: message.timestamp ?? Date.now(),
    });
    messageShortId = cacheEntry.shortId;
  };

  if (message.fromMe) {
    // Cache from-me messages so reply context can resolve sender/body.
    cacheInboundMessage();
    return;
  }

  if (!rawBody) {
    logVerbose(core, runtime, `drop: empty text sender=${message.senderId}`);
    return;
  }
  logVerbose(
    core,
    runtime,
    `msg sender=${message.senderId} group=${isGroup} textLen=${text.length} attachments=${attachments.length} chatGuid=${message.chatGuid ?? ""} chatId=${message.chatId ?? ""}`,
  );

  const dmPolicy = account.config.dmPolicy ?? "pairing";
  const groupPolicy = account.config.groupPolicy ?? "allowlist";
  const configAllowFrom = (account.config.allowFrom ?? []).map((entry) => String(entry));
  const configGroupAllowFrom = (account.config.groupAllowFrom ?? []).map((entry) => String(entry));
  const storeAllowFrom = await core.channel.pairing
    .readAllowFromStore("bluebubbles")
    .catch(() => []);
  const effectiveAllowFrom = [...configAllowFrom, ...storeAllowFrom]
    .map((entry) => String(entry).trim())
    .filter(Boolean);
  const effectiveGroupAllowFrom = [
    ...(configGroupAllowFrom.length > 0 ? configGroupAllowFrom : configAllowFrom),
    ...storeAllowFrom,
  ]
    .map((entry) => String(entry).trim())
    .filter(Boolean);
  const groupAllowEntry = formatGroupAllowlistEntry({
    chatGuid: message.chatGuid,
    chatId: message.chatId ?? undefined,
    chatIdentifier: message.chatIdentifier ?? undefined,
  });
  const groupName = message.chatName?.trim() || undefined;

  if (isGroup) {
    if (groupPolicy === "disabled") {
      logVerbose(core, runtime, "Blocked BlueBubbles group message (groupPolicy=disabled)");
      logGroupAllowlistHint({
        runtime,
        reason: "groupPolicy=disabled",
        entry: groupAllowEntry,
        chatName: groupName,
        accountId: account.accountId,
      });
      return;
    }
    if (groupPolicy === "allowlist") {
      if (effectiveGroupAllowFrom.length === 0) {
        logVerbose(core, runtime, "Blocked BlueBubbles group message (no allowlist)");
        logGroupAllowlistHint({
          runtime,
          reason: "groupPolicy=allowlist (empty allowlist)",
          entry: groupAllowEntry,
          chatName: groupName,
          accountId: account.accountId,
        });
        return;
      }
      const allowed = isAllowedBlueBubblesSender({
        allowFrom: effectiveGroupAllowFrom,
        sender: message.senderId,
        chatId: message.chatId ?? undefined,
        chatGuid: message.chatGuid ?? undefined,
        chatIdentifier: message.chatIdentifier ?? undefined,
      });
      if (!allowed) {
        logVerbose(
          core,
          runtime,
          `Blocked BlueBubbles sender ${message.senderId} (not in groupAllowFrom)`,
        );
        logVerbose(
          core,
          runtime,
          `drop: group sender not allowed sender=${message.senderId} allowFrom=${effectiveGroupAllowFrom.join(",")}`,
        );
        logGroupAllowlistHint({
          runtime,
          reason: "groupPolicy=allowlist (not allowlisted)",
          entry: groupAllowEntry,
          chatName: groupName,
          accountId: account.accountId,
        });
        return;
      }
    }
  } else {
    if (dmPolicy === "disabled") {
      logVerbose(core, runtime, `Blocked BlueBubbles DM from ${message.senderId}`);
      logVerbose(core, runtime, `drop: dmPolicy disabled sender=${message.senderId}`);
      return;
    }
    if (dmPolicy !== "open") {
      const allowed = isAllowedBlueBubblesSender({
        allowFrom: effectiveAllowFrom,
        sender: message.senderId,
        chatId: message.chatId ?? undefined,
        chatGuid: message.chatGuid ?? undefined,
        chatIdentifier: message.chatIdentifier ?? undefined,
      });
      if (!allowed) {
        if (dmPolicy === "pairing") {
          const { code, created } = await core.channel.pairing.upsertPairingRequest({
            channel: "bluebubbles",
            id: message.senderId,
            meta: { name: message.senderName },
          });
          runtime.log?.(
            `[bluebubbles] pairing request sender=${message.senderId} created=${created}`,
          );
          if (created) {
            logVerbose(core, runtime, `bluebubbles pairing request sender=${message.senderId}`);
            try {
              await sendMessageBlueBubbles(
                message.senderId,
                core.channel.pairing.buildPairingReply({
                  channel: "bluebubbles",
                  idLine: `Your BlueBubbles sender id: ${message.senderId}`,
                  code,
                }),
                { cfg: config, accountId: account.accountId },
              );
              statusSink?.({ lastOutboundAt: Date.now() });
            } catch (err) {
              logVerbose(
                core,
                runtime,
                `bluebubbles pairing reply failed for ${message.senderId}: ${String(err)}`,
              );
              runtime.error?.(
                `[bluebubbles] pairing reply failed sender=${message.senderId}: ${String(err)}`,
              );
            }
          }
        } else {
          logVerbose(
            core,
            runtime,
            `Blocked unauthorized BlueBubbles sender ${message.senderId} (dmPolicy=${dmPolicy})`,
          );
          logVerbose(
            core,
            runtime,
            `drop: dm sender not allowed sender=${message.senderId} allowFrom=${effectiveAllowFrom.join(",")}`,
          );
        }
        return;
      }
    }
  }

  const chatId = message.chatId ?? undefined;
  const chatGuid = message.chatGuid ?? undefined;
  const chatIdentifier = message.chatIdentifier ?? undefined;
  const peerId = isGroup
    ? (chatGuid ?? chatIdentifier ?? (chatId ? String(chatId) : "group"))
    : message.senderId;

  const route = core.channel.routing.resolveAgentRoute({
    cfg: config,
    channel: "bluebubbles",
    accountId: account.accountId,
    peer: {
      kind: isGroup ? "group" : "direct",
      id: peerId,
    },
  });

  // Mention gating for group chats (parity with iMessage/WhatsApp)
  const messageText = text;
  const mentionRegexes = core.channel.mentions.buildMentionRegexes(config, route.agentId);
  const wasMentioned = isGroup
    ? core.channel.mentions.matchesMentionPatterns(messageText, mentionRegexes)
    : true;
  const canDetectMention = mentionRegexes.length > 0;
  const requireMention = core.channel.groups.resolveRequireMention({
    cfg: config,
    channel: "bluebubbles",
    groupId: peerId,
    accountId: account.accountId,
  });

  // Command gating (parity with iMessage/WhatsApp)
  const useAccessGroups = config.commands?.useAccessGroups !== false;
  const hasControlCmd = core.channel.text.hasControlCommand(messageText, config);
  const ownerAllowedForCommands =
    effectiveAllowFrom.length > 0
      ? isAllowedBlueBubblesSender({
          allowFrom: effectiveAllowFrom,
          sender: message.senderId,
          chatId: message.chatId ?? undefined,
          chatGuid: message.chatGuid ?? undefined,
          chatIdentifier: message.chatIdentifier ?? undefined,
        })
      : false;
  const groupAllowedForCommands =
    effectiveGroupAllowFrom.length > 0
      ? isAllowedBlueBubblesSender({
          allowFrom: effectiveGroupAllowFrom,
          sender: message.senderId,
          chatId: message.chatId ?? undefined,
          chatGuid: message.chatGuid ?? undefined,
          chatIdentifier: message.chatIdentifier ?? undefined,
        })
      : false;
  const dmAuthorized = dmPolicy === "open" || ownerAllowedForCommands;
  const commandGate = resolveControlCommandGate({
    useAccessGroups,
    authorizers: [
      { configured: effectiveAllowFrom.length > 0, allowed: ownerAllowedForCommands },
      { configured: effectiveGroupAllowFrom.length > 0, allowed: groupAllowedForCommands },
    ],
    allowTextCommands: true,
    hasControlCommand: hasControlCmd,
  });
  const commandAuthorized = isGroup ? commandGate.commandAuthorized : dmAuthorized;

  // Block control commands from unauthorized senders in groups
  if (isGroup && commandGate.shouldBlock) {
    logInboundDrop({
      log: (msg) => logVerbose(core, runtime, msg),
      channel: "bluebubbles",
      reason: "control command (unauthorized)",
      target: message.senderId,
    });
    return;
  }

  // Allow control commands to bypass mention gating when authorized (parity with iMessage)
  const shouldBypassMention =
    isGroup && requireMention && !wasMentioned && commandAuthorized && hasControlCmd;
  const effectiveWasMentioned = wasMentioned || shouldBypassMention;

  // Skip group messages that require mention but weren't mentioned
  if (isGroup && requireMention && canDetectMention && !wasMentioned && !shouldBypassMention) {
    logVerbose(core, runtime, `bluebubbles: skipping group message (no mention)`);
    return;
  }

  // Cache allowed inbound messages so later replies can resolve sender/body without
  // surfacing dropped content (allowlist/mention/command gating).
  cacheInboundMessage();

  const baseUrl = account.config.serverUrl?.trim();
  const password = account.config.password?.trim();
  const maxBytes =
    account.config.mediaMaxMb && account.config.mediaMaxMb > 0
      ? account.config.mediaMaxMb * 1024 * 1024
      : 8 * 1024 * 1024;

  let mediaUrls: string[] = [];
  let mediaPaths: string[] = [];
  let mediaTypes: string[] = [];
  if (attachments.length > 0) {
    if (!baseUrl || !password) {
      logVerbose(core, runtime, "attachment download skipped (missing serverUrl/password)");
    } else {
      for (const attachment of attachments) {
        if (!attachment.guid) {
          continue;
        }
        if (attachment.totalBytes && attachment.totalBytes > maxBytes) {
          logVerbose(
            core,
            runtime,
            `attachment too large guid=${attachment.guid} bytes=${attachment.totalBytes}`,
          );
          continue;
        }
        try {
          const downloaded = await downloadBlueBubblesAttachment(attachment, {
            cfg: config,
            accountId: account.accountId,
            maxBytes,
          });
          const saved = await core.channel.media.saveMediaBuffer(
            Buffer.from(downloaded.buffer),
            downloaded.contentType,
            "inbound",
            maxBytes,
          );
          mediaPaths.push(saved.path);
          mediaUrls.push(saved.path);
          if (saved.contentType) {
            mediaTypes.push(saved.contentType);
          }
        } catch (err) {
          logVerbose(
            core,
            runtime,
            `attachment download failed guid=${attachment.guid} err=${String(err)}`,
          );
        }
      }
    }
  }
  let replyToId = message.replyToId;
  let replyToBody = message.replyToBody;
  let replyToSender = message.replyToSender;
  let replyToShortId: string | undefined;

  if (isTapbackMessage && tapbackContext?.replyToId) {
    replyToId = tapbackContext.replyToId;
  }

  if (replyToId) {
    const cached = resolveReplyContextFromCache({
      accountId: account.accountId,
      replyToId,
      chatGuid: message.chatGuid,
      chatIdentifier: message.chatIdentifier,
      chatId: message.chatId,
    });
    if (cached) {
      if (!replyToBody && cached.body) {
        replyToBody = cached.body;
      }
      if (!replyToSender && cached.senderLabel) {
        replyToSender = cached.senderLabel;
      }
      replyToShortId = cached.shortId;
      if (core.logging.shouldLogVerbose()) {
        const preview = (cached.body ?? "").replace(/\s+/g, " ").slice(0, 120);
        logVerbose(
          core,
          runtime,
          `reply-context cache hit replyToId=${replyToId} sender=${replyToSender ?? ""} body="${preview}"`,
        );
      }
    }
  }

  // If no cached short ID, try to get one from the UUID directly
  if (replyToId && !replyToShortId) {
    replyToShortId = getShortIdForUuid(replyToId);
  }

  // Use inline [[reply_to:N]] tag format
  // For tapbacks/reactions: append at end (e.g., "reacted with ❤️ [[reply_to:4]]")
  // For regular replies: prepend at start (e.g., "[[reply_to:4]] Awesome")
  const replyTag = formatReplyTag({ replyToId, replyToShortId });
  const baseBody = replyTag
    ? isTapbackMessage
      ? `${rawBody} ${replyTag}`
      : `${replyTag} ${rawBody}`
    : rawBody;
  const fromLabel = isGroup ? undefined : message.senderName || `user:${message.senderId}`;
  const groupSubject = isGroup ? message.chatName?.trim() || undefined : undefined;
  const groupMembers = isGroup
    ? formatGroupMembers({
        participants: message.participants,
        fallback: message.senderId ? { id: message.senderId, name: message.senderName } : undefined,
      })
    : undefined;
  const storePath = core.channel.session.resolveStorePath(config.session?.store, {
    agentId: route.agentId,
  });
  const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(config);
  const previousTimestamp = core.channel.session.readSessionUpdatedAt({
    storePath,
    sessionKey: route.sessionKey,
  });
  const body = core.channel.reply.formatAgentEnvelope({
    channel: "BlueBubbles",
    from: fromLabel,
    timestamp: message.timestamp,
    previousTimestamp,
    envelope: envelopeOptions,
    body: baseBody,
  });
  let chatGuidForActions = chatGuid;
  if (!chatGuidForActions && baseUrl && password) {
    const target =
      isGroup && (chatId || chatIdentifier)
        ? chatId
          ? ({ kind: "chat_id", chatId } as const)
          : ({ kind: "chat_identifier", chatIdentifier: chatIdentifier ?? "" } as const)
        : ({ kind: "handle", address: message.senderId } as const);
    if (target.kind !== "chat_identifier" || target.chatIdentifier) {
      chatGuidForActions =
        (await resolveChatGuidForTarget({
          baseUrl,
          password,
          target,
        })) ?? undefined;
    }
  }

  const ackReactionScope = config.messages?.ackReactionScope ?? "group-mentions";
  const removeAckAfterReply = config.messages?.removeAckAfterReply ?? false;
  const ackReactionValue = resolveBlueBubblesAckReaction({
    cfg: config,
    agentId: route.agentId,
    core,
    runtime,
  });
  const shouldAckReaction = () =>
    Boolean(
      ackReactionValue &&
      core.channel.reactions.shouldAckReaction({
        scope: ackReactionScope,
        isDirect: !isGroup,
        isGroup,
        isMentionableGroup: isGroup,
        requireMention: Boolean(requireMention),
        canDetectMention,
        effectiveWasMentioned,
        shouldBypassMention,
      }),
    );
  const ackMessageId = message.messageId?.trim() || "";
  const ackReactionPromise =
    shouldAckReaction() && ackMessageId && chatGuidForActions && ackReactionValue
      ? sendBlueBubblesReaction({
          chatGuid: chatGuidForActions,
          messageGuid: ackMessageId,
          emoji: ackReactionValue,
          opts: { cfg: config, accountId: account.accountId },
        }).then(
          () => true,
          (err) => {
            logVerbose(
              core,
              runtime,
              `ack reaction failed chatGuid=${chatGuidForActions} msg=${ackMessageId}: ${String(err)}`,
            );
            return false;
          },
        )
      : null;

  // Respect sendReadReceipts config (parity with WhatsApp)
  const sendReadReceipts = account.config.sendReadReceipts !== false;
  if (chatGuidForActions && baseUrl && password && sendReadReceipts) {
    try {
      await markBlueBubblesChatRead(chatGuidForActions, {
        cfg: config,
        accountId: account.accountId,
      });
      logVerbose(core, runtime, `marked read chatGuid=${chatGuidForActions}`);
    } catch (err) {
      runtime.error?.(`[bluebubbles] mark read failed: ${String(err)}`);
    }
  } else if (!sendReadReceipts) {
    logVerbose(core, runtime, "mark read skipped (sendReadReceipts=false)");
  } else {
    logVerbose(core, runtime, "mark read skipped (missing chatGuid or credentials)");
  }

  const outboundTarget = isGroup
    ? formatBlueBubblesChatTarget({
        chatId,
        chatGuid: chatGuidForActions ?? chatGuid,
        chatIdentifier,
      }) || peerId
    : chatGuidForActions
      ? formatBlueBubblesChatTarget({ chatGuid: chatGuidForActions })
      : message.senderId;

  const maybeEnqueueOutboundMessageId = (messageId?: string, snippet?: string) => {
    const trimmed = messageId?.trim();
    if (!trimmed || trimmed === "ok" || trimmed === "unknown") {
      return;
    }
    // Cache outbound message to get short ID
    const cacheEntry = rememberBlueBubblesReplyCache({
      accountId: account.accountId,
      messageId: trimmed,
      chatGuid: chatGuidForActions ?? chatGuid,
      chatIdentifier,
      chatId,
      senderLabel: "me",
      body: snippet ?? "",
      timestamp: Date.now(),
    });
    const displayId = cacheEntry.shortId || trimmed;
    const preview = snippet ? ` "${snippet.slice(0, 12)}${snippet.length > 12 ? "…" : ""}"` : "";
    core.system.enqueueSystemEvent(`Assistant sent${preview} [message_id:${displayId}]`, {
      sessionKey: route.sessionKey,
      contextKey: `bluebubbles:outbound:${outboundTarget}:${trimmed}`,
    });
  };

  const ctxPayload = {
    Body: body,
    BodyForAgent: body,
    RawBody: rawBody,
    CommandBody: rawBody,
    BodyForCommands: rawBody,
    MediaUrl: mediaUrls[0],
    MediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    MediaPath: mediaPaths[0],
    MediaPaths: mediaPaths.length > 0 ? mediaPaths : undefined,
    MediaType: mediaTypes[0],
    MediaTypes: mediaTypes.length > 0 ? mediaTypes : undefined,
    From: isGroup ? `group:${peerId}` : `bluebubbles:${message.senderId}`,
    To: `bluebubbles:${outboundTarget}`,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: isGroup ? "group" : "direct",
    ConversationLabel: fromLabel,
    // Use short ID for token savings (agent can use this to reference the message)
    ReplyToId: replyToShortId || replyToId,
    ReplyToIdFull: replyToId,
    ReplyToBody: replyToBody,
    ReplyToSender: replyToSender,
    GroupSubject: groupSubject,
    GroupMembers: groupMembers,
    SenderName: message.senderName || undefined,
    SenderId: message.senderId,
    Provider: "bluebubbles",
    Surface: "bluebubbles",
    // Use short ID for token savings (agent can use this to reference the message)
    MessageSid: messageShortId || message.messageId,
    MessageSidFull: message.messageId,
    Timestamp: message.timestamp,
    OriginatingChannel: "bluebubbles",
    OriginatingTo: `bluebubbles:${outboundTarget}`,
    WasMentioned: effectiveWasMentioned,
    CommandAuthorized: commandAuthorized,
  };

  let sentMessage = false;
<<<<<<< HEAD
=======
  let streamingActive = false;
  let typingRestartTimer: NodeJS.Timeout | undefined;
  const typingRestartDelayMs = 150;
  const clearTypingRestartTimer = () => {
    if (typingRestartTimer) {
      clearTimeout(typingRestartTimer);
      typingRestartTimer = undefined;
    }
  };
  const restartTypingSoon = () => {
    if (!streamingActive || !chatGuidForActions || !baseUrl || !password) {
      return;
    }
    clearTypingRestartTimer();
    typingRestartTimer = setTimeout(() => {
      typingRestartTimer = undefined;
      if (!streamingActive) {
        return;
      }
      sendBlueBubblesTyping(chatGuidForActions, true, {
        cfg: config,
        accountId: account.accountId,
      }).catch((err) => {
        runtime.error?.(`[bluebubbles] typing restart failed: ${String(err)}`);
      });
    }, typingRestartDelayMs);
  };
>>>>>>> 8d2f98fb0 (Fix subagent announce failover race (always emit lifecycle end + treat timeout=0 as no-timeout) (#6621))
  try {
    const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
      cfg: config,
      agentId: route.agentId,
      channel: "bluebubbles",
      accountId: account.accountId,
    });
    await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
      ctx: ctxPayload,
      cfg: config,
      dispatcherOptions: {
<<<<<<< HEAD
        deliver: async (payload) => {
=======
        ...prefixOptions,
        deliver: async (payload, info) => {
>>>>>>> 5d82c8231 (feat: per-channel responsePrefix override (#9001))
          const rawReplyToId =
            typeof payload.replyToId === "string" ? payload.replyToId.trim() : "";
          // Resolve short ID (e.g., "5") to full UUID
          const replyToMessageGuid = rawReplyToId
            ? resolveBlueBubblesMessageId(rawReplyToId, { requireKnownShortId: true })
            : "";
          const mediaList = payload.mediaUrls?.length
            ? payload.mediaUrls
            : payload.mediaUrl
              ? [payload.mediaUrl]
              : [];
          if (mediaList.length > 0) {
            const tableMode = core.channel.text.resolveMarkdownTableMode({
              cfg: config,
              channel: "bluebubbles",
              accountId: account.accountId,
            });
            const text = core.channel.text.convertMarkdownTables(payload.text ?? "", tableMode);
            let first = true;
            for (const mediaUrl of mediaList) {
              const caption = first ? text : undefined;
              first = false;
              const result = await sendBlueBubblesMedia({
                cfg: config,
                to: outboundTarget,
                mediaUrl,
                caption: caption ?? undefined,
                replyToId: replyToMessageGuid || null,
                accountId: account.accountId,
              });
              const cachedBody = (caption ?? "").trim() || "<media:attachment>";
              maybeEnqueueOutboundMessageId(result.messageId, cachedBody);
              sentMessage = true;
              statusSink?.({ lastOutboundAt: Date.now() });
            }
            return;
          }

          const textLimit =
            account.config.textChunkLimit && account.config.textChunkLimit > 0
              ? account.config.textChunkLimit
              : DEFAULT_TEXT_LIMIT;
          const chunkMode = account.config.chunkMode ?? "length";
          const tableMode = core.channel.text.resolveMarkdownTableMode({
            cfg: config,
            channel: "bluebubbles",
            accountId: account.accountId,
          });
          const text = core.channel.text.convertMarkdownTables(payload.text ?? "", tableMode);
          const chunks =
            chunkMode === "newline"
              ? core.channel.text.chunkTextWithMode(text, textLimit, chunkMode)
              : core.channel.text.chunkMarkdownText(text, textLimit);
          if (!chunks.length && text) {
            chunks.push(text);
          }
          if (!chunks.length) {
            return;
          }
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const result = await sendMessageBlueBubbles(outboundTarget, chunk, {
              cfg: config,
              accountId: account.accountId,
              replyToMessageGuid: replyToMessageGuid || undefined,
            });
            maybeEnqueueOutboundMessageId(result.messageId, chunk);
            sentMessage = true;
            statusSink?.({ lastOutboundAt: Date.now() });
            // In newline mode, restart typing after each chunk if more chunks remain
            // Small delay allows the Apple API to finish clearing the typing state from message send
            if (chunkMode === "newline" && i < chunks.length - 1 && chatGuidForActions) {
              await new Promise((r) => setTimeout(r, 150));
              sendBlueBubblesTyping(chatGuidForActions, true, {
                cfg: config,
                accountId: account.accountId,
              }).catch(() => {
                // Ignore typing errors
              });
            }
          }
        },
        onReplyStart: async () => {
          if (!chatGuidForActions) {
            return;
          }
          if (!baseUrl || !password) {
            return;
          }
          logVerbose(core, runtime, `typing start chatGuid=${chatGuidForActions}`);
          try {
            await sendBlueBubblesTyping(chatGuidForActions, true, {
              cfg: config,
              accountId: account.accountId,
            });
          } catch (err) {
            runtime.error?.(`[bluebubbles] typing start failed: ${String(err)}`);
          }
        },
        onIdle: async () => {
          if (!chatGuidForActions) {
            return;
          }
          if (!baseUrl || !password) {
            return;
          }
          try {
            await sendBlueBubblesTyping(chatGuidForActions, false, {
              cfg: config,
              accountId: account.accountId,
            });
          } catch (err) {
            logVerbose(core, runtime, `typing stop failed: ${String(err)}`);
          }
        },
        onError: (err, info) => {
          runtime.error?.(`BlueBubbles ${info.kind} reply failed: ${String(err)}`);
        },
      },
      replyOptions: {
        onModelSelected,
        disableBlockStreaming:
          typeof account.config.blockStreaming === "boolean"
            ? !account.config.blockStreaming
            : undefined,
      },
    });
  } finally {
    if (sentMessage && chatGuidForActions && ackMessageId) {
      core.channel.reactions.removeAckReactionAfterReply({
        removeAfterReply: removeAckAfterReply,
        ackReactionPromise,
        ackReactionValue: ackReactionValue ?? null,
        remove: () =>
          sendBlueBubblesReaction({
            chatGuid: chatGuidForActions,
            messageGuid: ackMessageId,
            emoji: ackReactionValue ?? "",
            remove: true,
            opts: { cfg: config, accountId: account.accountId },
          }),
        onError: (err) => {
          logAckFailure({
            log: (msg) => logVerbose(core, runtime, msg),
            channel: "bluebubbles",
            target: `${chatGuidForActions}/${ackMessageId}`,
            error: err,
          });
        },
      });
    }
<<<<<<< HEAD
    if (chatGuidForActions && baseUrl && password && !sentMessage) {
      // Stop typing indicator when no message was sent (e.g., NO_REPLY)
=======
    if (shouldStopTyping && chatGuidForActions) {
      // Stop typing after streaming completes to avoid a stuck indicator.
>>>>>>> 40b11db80 (TypeScript: add extensions to tsconfig and fix type errors (#12781))
      sendBlueBubblesTyping(chatGuidForActions, false, {
        cfg: config,
        accountId: account.accountId,
      }).catch((err) => {
        logTypingFailure({
          log: (msg) => logVerbose(core, runtime, msg),
          channel: "bluebubbles",
          action: "stop",
          target: chatGuidForActions,
          error: err,
        });
      });
    }
  }
}

async function processReaction(
  reaction: NormalizedWebhookReaction,
  target: WebhookTarget,
): Promise<void> {
  const { account, config, runtime, core } = target;
  if (reaction.fromMe) {
    return;
  }

  const dmPolicy = account.config.dmPolicy ?? "pairing";
  const groupPolicy = account.config.groupPolicy ?? "allowlist";
  const configAllowFrom = (account.config.allowFrom ?? []).map((entry) => String(entry));
  const configGroupAllowFrom = (account.config.groupAllowFrom ?? []).map((entry) => String(entry));
  const storeAllowFrom = await core.channel.pairing
    .readAllowFromStore("bluebubbles")
    .catch(() => []);
  const effectiveAllowFrom = [...configAllowFrom, ...storeAllowFrom]
    .map((entry) => String(entry).trim())
    .filter(Boolean);
  const effectiveGroupAllowFrom = [
    ...(configGroupAllowFrom.length > 0 ? configGroupAllowFrom : configAllowFrom),
    ...storeAllowFrom,
  ]
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  if (reaction.isGroup) {
    if (groupPolicy === "disabled") {
      return;
    }
    if (groupPolicy === "allowlist") {
      if (effectiveGroupAllowFrom.length === 0) {
        return;
      }
      const allowed = isAllowedBlueBubblesSender({
        allowFrom: effectiveGroupAllowFrom,
        sender: reaction.senderId,
        chatId: reaction.chatId ?? undefined,
        chatGuid: reaction.chatGuid ?? undefined,
        chatIdentifier: reaction.chatIdentifier ?? undefined,
      });
      if (!allowed) {
        return;
      }
    }
  } else {
    if (dmPolicy === "disabled") {
      return;
    }
    if (dmPolicy !== "open") {
      const allowed = isAllowedBlueBubblesSender({
        allowFrom: effectiveAllowFrom,
        sender: reaction.senderId,
        chatId: reaction.chatId ?? undefined,
        chatGuid: reaction.chatGuid ?? undefined,
        chatIdentifier: reaction.chatIdentifier ?? undefined,
      });
      if (!allowed) {
        return;
      }
    }
  }

  const chatId = reaction.chatId ?? undefined;
  const chatGuid = reaction.chatGuid ?? undefined;
  const chatIdentifier = reaction.chatIdentifier ?? undefined;
  const peerId = reaction.isGroup
    ? (chatGuid ?? chatIdentifier ?? (chatId ? String(chatId) : "group"))
    : reaction.senderId;

  const route = core.channel.routing.resolveAgentRoute({
    cfg: config,
    channel: "bluebubbles",
    accountId: account.accountId,
    peer: {
      kind: reaction.isGroup ? "group" : "direct",
      id: peerId,
    },
  });

  const senderLabel = reaction.senderName || reaction.senderId;
  const chatLabel = reaction.isGroup ? ` in group:${peerId}` : "";
  // Use short ID for token savings
  const messageDisplayId = getShortIdForUuid(reaction.messageId) || reaction.messageId;
  // Format: "Tyler reacted with ❤️ [[reply_to:5]]" or "Tyler removed ❤️ reaction [[reply_to:5]]"
  const text =
    reaction.action === "removed"
      ? `${senderLabel} removed ${reaction.emoji} reaction [[reply_to:${messageDisplayId}]]${chatLabel}`
      : `${senderLabel} reacted with ${reaction.emoji} [[reply_to:${messageDisplayId}]]${chatLabel}`;
  core.system.enqueueSystemEvent(text, {
    sessionKey: route.sessionKey,
    contextKey: `bluebubbles:reaction:${reaction.action}:${peerId}:${reaction.messageId}:${reaction.senderId}:${reaction.emoji}`,
  });
  logVerbose(core, runtime, `reaction event enqueued: ${text}`);
}

=======
>>>>>>> a1df0939d (refactor(bluebubbles): split monitor parsing and processing modules)
export async function monitorBlueBubblesProvider(
  options: BlueBubblesMonitorOptions,
): Promise<void> {
  const { account, config, runtime, abortSignal, statusSink } = options;
  const core = getBlueBubblesRuntime();
  const path = options.webhookPath?.trim() || DEFAULT_WEBHOOK_PATH;

  // Fetch and cache server info (for macOS version detection in action gating)
  const serverInfo = await fetchBlueBubblesServerInfo({
    baseUrl: account.baseUrl,
    password: account.config.password,
    accountId: account.accountId,
    timeoutMs: 5000,
  }).catch(() => null);
  if (serverInfo?.os_version) {
    runtime.log?.(`[${account.accountId}] BlueBubbles server macOS ${serverInfo.os_version}`);
  }

  const unregister = registerBlueBubblesWebhookTarget({
    account,
    config,
    runtime,
    core,
    path,
    statusSink,
  });

  return await new Promise((resolve) => {
    const stop = () => {
      unregister();
      resolve();
    };

    if (abortSignal?.aborted) {
      stop();
      return;
    }

    abortSignal?.addEventListener("abort", stop, { once: true });
    runtime.log?.(
      `[${account.accountId}] BlueBubbles webhook listening on ${normalizeWebhookPath(path)}`,
    );
  });
}

export { _resetBlueBubblesShortIdState, resolveBlueBubblesMessageId, resolveWebhookPathFromConfig };
