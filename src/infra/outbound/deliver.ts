<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> f07bb8e8f (fix(hooks): backport internal message hook bridge with safe delivery semantics)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { ReplyPayload } from "../../auto-reply/types.js";
import type {
  ChannelOutboundAdapter,
  ChannelOutboundContext,
} from "../../channels/plugins/types.js";
import type { OpenClawConfig } from "../../config/config.js";
import type { sendMessageDiscord } from "../../discord/send.js";
import type { sendMessageIMessage } from "../../imessage/send.js";
import type { sendMessageSlack } from "../../slack/send.js";
import type { sendMessageTelegram } from "../../telegram/send.js";
import type { sendMessageWhatsApp } from "../../web/outbound.js";
import type { OutboundIdentity } from "./identity.js";
import type { NormalizedOutboundPayload } from "./payloads.js";
import type { OutboundChannel } from "./targets.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 50645b905 (refactor(outbound): centralize outbound identity)
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> f07bb8e8f (fix(hooks): backport internal message hook bridge with safe delivery semantics)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import {
  chunkByParagraph,
  chunkMarkdownTextWithMode,
  resolveChunkMode,
  resolveTextChunkLimit,
} from "../../auto-reply/chunk.js";
import { resolveChannelMediaMaxBytes } from "../../channels/plugins/media-limits.js";
import { loadChannelOutboundAdapter } from "../../channels/plugins/outbound/load.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { ChannelOutboundAdapter } from "../../channels/plugins/types.js";
import type { MoltbotConfig } from "../../config/config.js";
=======
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import type {
  ChannelOutboundAdapter,
  ChannelOutboundContext,
} from "../../channels/plugins/types.js";
import type { OpenClawConfig } from "../../config/config.js";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> f07bb8e8f (fix(hooks): backport internal message hook bridge with safe delivery semantics)
import { resolveMarkdownTableMode } from "../../config/markdown-tables.js";
import type { sendMessageDiscord } from "../../discord/send.js";
import type { sendMessageIMessage } from "../../imessage/send.js";
import { markdownToSignalTextChunks, type SignalTextStyleRange } from "../../signal/format.js";
import { sendMessageSignal } from "../../signal/send.js";
import type { sendMessageSlack } from "../../slack/send.js";
import type { sendMessageTelegram } from "../../telegram/send.js";
import type { sendMessageWhatsApp } from "../../web/outbound.js";
import {
  appendAssistantMessageToSessionTranscript,
  resolveMirroredTranscriptText,
} from "../../config/sessions.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { NormalizedOutboundPayload } from "./payloads.js";
=======
=======
import type { sendMessageDiscord } from "../../discord/send.js";
import type { sendMessageIMessage } from "../../imessage/send.js";
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { sendMessageDiscord } from "../../discord/send.js";
import type { sendMessageIMessage } from "../../imessage/send.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { createInternalHookEvent, triggerInternalHook } from "../../hooks/internal-hooks.js";
>>>>>>> f07bb8e8f (fix(hooks): backport internal message hook bridge with safe delivery semantics)
import { getAgentScopedMediaLocalRoots } from "../../media/local-roots.js";
import { getGlobalHookRunner } from "../../plugins/hook-runner-global.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { markdownToSignalTextChunks, type SignalTextStyleRange } from "../../signal/format.js";
import { sendMessageSignal } from "../../signal/send.js";
=======
import { resolveMarkdownTableMode } from "../../config/markdown-tables.js";
import {
  appendAssistantMessageToSessionTranscript,
  resolveMirroredTranscriptText,
} from "../../config/sessions.js";
import { createInternalHookEvent, triggerInternalHook } from "../../hooks/internal-hooks.js";
import { getAgentScopedMediaLocalRoots } from "../../media/local-roots.js";
import { getGlobalHookRunner } from "../../plugins/hook-runner-global.js";
import { markdownToSignalTextChunks, type SignalTextStyleRange } from "../../signal/format.js";
import { sendMessageSignal } from "../../signal/send.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { throwIfAborted } from "./abort.js";
<<<<<<< HEAD
>>>>>>> 79c246666 (refactor: consolidate throwIfAborted + fix isCompactionFailureError (#12463))
=======
import { ackDelivery, enqueueDelivery, failDelivery } from "./delivery-queue.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { OutboundIdentity } from "./identity.js";
import type { NormalizedOutboundPayload } from "./payloads.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { OutboundIdentity } from "./identity.js";
import type { NormalizedOutboundPayload } from "./payloads.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> f07bb8e8f (fix(hooks): backport internal message hook bridge with safe delivery semantics)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { normalizeReplyPayloadsForDelivery } from "./payloads.js";

export type { NormalizedOutboundPayload } from "./payloads.js";
export { normalizeOutboundPayloads } from "./payloads.js";

type SendMatrixMessage = (
  to: string,
  text: string,
  opts?: { mediaUrl?: string; replyToId?: string; threadId?: string; timeoutMs?: number },
) => Promise<{ messageId: string; roomId: string }>;

export type OutboundSendDeps = {
  sendWhatsApp?: typeof sendMessageWhatsApp;
  sendTelegram?: typeof sendMessageTelegram;
  sendDiscord?: typeof sendMessageDiscord;
  sendSlack?: typeof sendMessageSlack;
  sendSignal?: typeof sendMessageSignal;
  sendIMessage?: typeof sendMessageIMessage;
  sendMatrix?: SendMatrixMessage;
  sendMSTeams?: (
    to: string,
    text: string,
    opts?: { mediaUrl?: string },
  ) => Promise<{ messageId: string; conversationId: string }>;
};

export type OutboundDeliveryResult = {
  channel: Exclude<OutboundChannel, "none">;
  messageId: string;
  chatId?: string;
  channelId?: string;
  roomId?: string;
  conversationId?: string;
  timestamp?: number;
  toJid?: string;
  pollId?: string;
  // Channel docking: stash channel-specific fields here to avoid core type churn.
  meta?: Record<string, unknown>;
};

type Chunker = (text: string, limit: number) => string[];

type ChannelHandler = {
  chunker: Chunker | null;
  chunkerMode?: "text" | "markdown";
  textChunkLimit?: number;
  sendPayload?: (
    payload: ReplyPayload,
    overrides?: {
      replyToId?: string | null;
      threadId?: string | number | null;
    },
  ) => Promise<OutboundDeliveryResult>;
  sendText: (
    text: string,
    overrides?: {
      replyToId?: string | null;
      threadId?: string | number | null;
    },
  ) => Promise<OutboundDeliveryResult>;
  sendMedia: (
    caption: string,
    mediaUrl: string,
    overrides?: {
      replyToId?: string | null;
      threadId?: string | number | null;
    },
  ) => Promise<OutboundDeliveryResult>;
};

<<<<<<< HEAD
// Channel docking: outbound delivery delegates to plugin.outbound adapters.
async function createChannelHandler(params: {
  cfg: MoltbotConfig;
=======
type ChannelHandlerParams = {
  cfg: OpenClawConfig;
>>>>>>> d5ee766af (refactor(outbound): dedupe channel handler params)
  channel: Exclude<OutboundChannel, "none">;
  to: string;
  accountId?: string;
  replyToId?: string | null;
  threadId?: string | number | null;
  identity?: OutboundIdentity;
  deps?: OutboundSendDeps;
  gifPlayback?: boolean;
  silent?: boolean;
<<<<<<< HEAD
}): Promise<ChannelHandler> {
  const outbound = await loadChannelOutboundAdapter(params.channel);
  if (!outbound?.sendText || !outbound?.sendMedia) {
    throw new Error(`Outbound not configured for channel: ${params.channel}`);
  }
  const handler = createPluginHandler({
    outbound,
    cfg: params.cfg,
    channel: params.channel,
    to: params.to,
    accountId: params.accountId,
    replyToId: params.replyToId,
    threadId: params.threadId,
    identity: params.identity,
    deps: params.deps,
    gifPlayback: params.gifPlayback,
    silent: params.silent,
  });
=======
  mediaLocalRoots?: readonly string[];
};

// Channel docking: outbound delivery delegates to plugin.outbound adapters.
async function createChannelHandler(params: ChannelHandlerParams): Promise<ChannelHandler> {
  const outbound = await loadChannelOutboundAdapter(params.channel);
  const handler = createPluginHandler({ ...params, outbound });
>>>>>>> d5ee766af (refactor(outbound): dedupe channel handler params)
  if (!handler) {
    throw new Error(`Outbound not configured for channel: ${params.channel}`);
  }
  return handler;
}

<<<<<<< HEAD
function createPluginHandler(params: {
  outbound?: ChannelOutboundAdapter;
  cfg: MoltbotConfig;
  channel: Exclude<OutboundChannel, "none">;
  to: string;
  accountId?: string;
  replyToId?: string | null;
  threadId?: string | number | null;
  identity?: OutboundIdentity;
  deps?: OutboundSendDeps;
  gifPlayback?: boolean;
  silent?: boolean;
}): ChannelHandler | null {
=======
function createPluginHandler(
  params: ChannelHandlerParams & { outbound?: ChannelOutboundAdapter },
): ChannelHandler | null {
>>>>>>> d5ee766af (refactor(outbound): dedupe channel handler params)
  const outbound = params.outbound;
  if (!outbound?.sendText || !outbound?.sendMedia) {
    return null;
  }
  const baseCtx = createChannelOutboundContextBase(params);
  const sendText = outbound.sendText;
  const sendMedia = outbound.sendMedia;
  const chunker = outbound.chunker ?? null;
  const chunkerMode = outbound.chunkerMode;
  const resolveCtx = (overrides?: {
    replyToId?: string | null;
    threadId?: string | number | null;
  }): Omit<ChannelOutboundContext, "text" | "mediaUrl"> => ({
    ...baseCtx,
    replyToId: overrides?.replyToId ?? baseCtx.replyToId,
    threadId: overrides?.threadId ?? baseCtx.threadId,
  });
  return {
    chunker,
    chunkerMode,
    textChunkLimit: outbound.textChunkLimit,
    sendPayload: outbound.sendPayload
      ? async (payload, overrides) =>
          outbound.sendPayload!({
            ...resolveCtx(overrides),
            text: payload.text ?? "",
            mediaUrl: payload.mediaUrl,
<<<<<<< HEAD
            accountId: params.accountId,
            replyToId: params.replyToId,
            threadId: params.threadId,
            identity: params.identity,
            gifPlayback: params.gifPlayback,
            deps: params.deps,
            silent: params.silent,
=======
>>>>>>> a881bd41e (refactor(outbound): dedupe plugin outbound context)
            payload,
          })
      : undefined,
    sendText: async (text, overrides) =>
      sendText({
        ...resolveCtx(overrides),
        text,
<<<<<<< HEAD
        accountId: params.accountId,
        replyToId: params.replyToId,
        threadId: params.threadId,
        identity: params.identity,
        gifPlayback: params.gifPlayback,
        deps: params.deps,
        silent: params.silent,
=======
>>>>>>> a881bd41e (refactor(outbound): dedupe plugin outbound context)
      }),
    sendMedia: async (caption, mediaUrl, overrides) =>
      sendMedia({
        ...resolveCtx(overrides),
        text: caption,
        mediaUrl,
<<<<<<< HEAD
        accountId: params.accountId,
        replyToId: params.replyToId,
        threadId: params.threadId,
        identity: params.identity,
        gifPlayback: params.gifPlayback,
        deps: params.deps,
        silent: params.silent,
=======
>>>>>>> a881bd41e (refactor(outbound): dedupe plugin outbound context)
      }),
  };
}

<<<<<<< HEAD
<<<<<<< HEAD
export async function deliverOutboundPayloads(params: {
<<<<<<< HEAD
  cfg: MoltbotConfig;
=======
=======
=======
function createChannelOutboundContextBase(
  params: ChannelHandlerParams,
): Omit<ChannelOutboundContext, "text" | "mediaUrl"> {
  return {
    cfg: params.cfg,
    to: params.to,
    accountId: params.accountId,
    replyToId: params.replyToId,
    threadId: params.threadId,
    identity: params.identity,
    gifPlayback: params.gifPlayback,
    deps: params.deps,
    silent: params.silent,
    mediaLocalRoots: params.mediaLocalRoots,
  };
}

>>>>>>> a881bd41e (refactor(outbound): dedupe plugin outbound context)
const isAbortError = (err: unknown): boolean => err instanceof Error && err.name === "AbortError";

type DeliverOutboundPayloadsCoreParams = {
>>>>>>> 21df9ebd9 (refactor(outbound): share deliver payload params)
  cfg: OpenClawConfig;
  channel: Exclude<OutboundChannel, "none">;
  to: string;
  accountId?: string;
  payloads: ReplyPayload[];
  replyToId?: string | null;
  threadId?: string | number | null;
  identity?: OutboundIdentity;
  deps?: OutboundSendDeps;
  gifPlayback?: boolean;
  abortSignal?: AbortSignal;
  bestEffort?: boolean;
  onError?: (err: unknown, payload: NormalizedOutboundPayload) => void;
  onPayload?: (payload: NormalizedOutboundPayload) => void;
  mirror?: {
    sessionKey: string;
    agentId?: string;
    text?: string;
    mediaUrls?: string[];
  };
  silent?: boolean;
};

type DeliverOutboundPayloadsParams = DeliverOutboundPayloadsCoreParams & {
  /** @internal Skip write-ahead queue (used by crash-recovery to avoid re-enqueueing). */
  skipQueue?: boolean;
};

export async function deliverOutboundPayloads(
  params: DeliverOutboundPayloadsParams,
): Promise<OutboundDeliveryResult[]> {
  const { channel, to, payloads } = params;

  // Write-ahead delivery queue: persist before sending, remove after success.
  const queueId = params.skipQueue
    ? null
    : await enqueueDelivery({
        channel,
        to,
        accountId: params.accountId,
        payloads,
        threadId: params.threadId,
        replyToId: params.replyToId,
        bestEffort: params.bestEffort,
        gifPlayback: params.gifPlayback,
        silent: params.silent,
        mirror: params.mirror,
      }).catch(() => null); // Best-effort — don't block delivery if queue write fails.

  // Wrap onError to detect partial failures under bestEffort mode.
  // When bestEffort is true, per-payload errors are caught and passed to onError
  // without throwing — so the outer try/catch never fires. We track whether any
  // payload failed so we can call failDelivery instead of ackDelivery.
  let hadPartialFailure = false;
  const wrappedParams = params.onError
    ? {
        ...params,
        onError: (err: unknown, payload: NormalizedOutboundPayload) => {
          hadPartialFailure = true;
          params.onError!(err, payload);
        },
      }
    : params;

  try {
    const results = await deliverOutboundPayloadsCore(wrappedParams);
    if (queueId) {
      if (hadPartialFailure) {
        await failDelivery(queueId, "partial delivery failure (bestEffort)").catch(() => {});
      } else {
        await ackDelivery(queueId).catch(() => {}); // Best-effort cleanup.
      }
    }
    return results;
  } catch (err) {
    if (queueId) {
      if (isAbortError(err)) {
        await ackDelivery(queueId).catch(() => {});
      } else {
        await failDelivery(queueId, err instanceof Error ? err.message : String(err)).catch(
          () => {},
        );
      }
    }
    throw err;
  }
}

/** Core delivery logic (extracted for queue wrapper). */
<<<<<<< HEAD
async function deliverOutboundPayloadsCore(params: {
  cfg: OpenClawConfig;
>>>>>>> 09e1cbc35 (fix(cron): pass agent identity through delivery path (#16218) (#16242))
  channel: Exclude<OutboundChannel, "none">;
  to: string;
  accountId?: string;
  payloads: ReplyPayload[];
  replyToId?: string | null;
  threadId?: string | number | null;
  identity?: OutboundIdentity;
  deps?: OutboundSendDeps;
  gifPlayback?: boolean;
  abortSignal?: AbortSignal;
  bestEffort?: boolean;
  onError?: (err: unknown, payload: NormalizedOutboundPayload) => void;
  onPayload?: (payload: NormalizedOutboundPayload) => void;
  mirror?: {
    sessionKey: string;
    agentId?: string;
    text?: string;
    mediaUrls?: string[];
  };
  silent?: boolean;
}): Promise<OutboundDeliveryResult[]> {
=======
async function deliverOutboundPayloadsCore(
  params: DeliverOutboundPayloadsCoreParams,
): Promise<OutboundDeliveryResult[]> {
>>>>>>> 21df9ebd9 (refactor(outbound): share deliver payload params)
  const { cfg, channel, to, payloads } = params;
  const accountId = params.accountId;
  const deps = params.deps;
  const abortSignal = params.abortSignal;
  const sendSignal = params.deps?.sendSignal ?? sendMessageSignal;
  const results: OutboundDeliveryResult[] = [];
  const handler = await createChannelHandler({
    cfg,
    channel,
    to,
    deps,
    accountId,
    replyToId: params.replyToId,
    threadId: params.threadId,
    identity: params.identity,
    gifPlayback: params.gifPlayback,
    silent: params.silent,
  });
  const textLimit = handler.chunker
    ? resolveTextChunkLimit(cfg, channel, accountId, {
        fallbackLimit: handler.textChunkLimit,
      })
    : undefined;
  const chunkMode = handler.chunker ? resolveChunkMode(cfg, channel, accountId) : "length";
  const isSignalChannel = channel === "signal";
  const signalTableMode = isSignalChannel
    ? resolveMarkdownTableMode({ cfg, channel: "signal", accountId })
    : "code";
  const signalMaxBytes = isSignalChannel
    ? resolveChannelMediaMaxBytes({
        cfg,
        resolveChannelLimitMb: ({ cfg, accountId }) =>
          cfg.channels?.signal?.accounts?.[accountId]?.mediaMaxMb ??
          cfg.channels?.signal?.mediaMaxMb,
        accountId,
      })
    : undefined;

  const sendTextChunks = async (
    text: string,
    overrides?: { replyToId?: string | null; threadId?: string | number | null },
  ) => {
    throwIfAborted(abortSignal);
    if (!handler.chunker || textLimit === undefined) {
      results.push(await handler.sendText(text, overrides));
      return;
    }
    if (chunkMode === "newline") {
      const mode = handler.chunkerMode ?? "text";
      const blockChunks =
        mode === "markdown"
          ? chunkMarkdownTextWithMode(text, textLimit, "newline")
          : chunkByParagraph(text, textLimit);

      if (!blockChunks.length && text) {
        blockChunks.push(text);
      }
      for (const blockChunk of blockChunks) {
        const chunks = handler.chunker(blockChunk, textLimit);
        if (!chunks.length && blockChunk) {
          chunks.push(blockChunk);
        }
        for (const chunk of chunks) {
          throwIfAborted(abortSignal);
          results.push(await handler.sendText(chunk, overrides));
        }
      }
      return;
    }
    const chunks = handler.chunker(text, textLimit);
    for (const chunk of chunks) {
      throwIfAborted(abortSignal);
      results.push(await handler.sendText(chunk, overrides));
    }
  };

  const sendSignalText = async (text: string, styles: SignalTextStyleRange[]) => {
    throwIfAborted(abortSignal);
    return {
      channel: "signal" as const,
      ...(await sendSignal(to, text, {
        maxBytes: signalMaxBytes,
        accountId: accountId ?? undefined,
        textMode: "plain",
        textStyles: styles,
      })),
    };
  };

  const sendSignalTextChunks = async (text: string) => {
    throwIfAborted(abortSignal);
    let signalChunks =
      textLimit === undefined
        ? markdownToSignalTextChunks(text, Number.POSITIVE_INFINITY, {
            tableMode: signalTableMode,
          })
        : markdownToSignalTextChunks(text, textLimit, { tableMode: signalTableMode });
    if (signalChunks.length === 0 && text) {
      signalChunks = [{ text, styles: [] }];
    }
    for (const chunk of signalChunks) {
      throwIfAborted(abortSignal);
      results.push(await sendSignalText(chunk.text, chunk.styles));
    }
  };

  const sendSignalMedia = async (caption: string, mediaUrl: string) => {
    throwIfAborted(abortSignal);
    const formatted = markdownToSignalTextChunks(caption, Number.POSITIVE_INFINITY, {
      tableMode: signalTableMode,
    })[0] ?? {
      text: caption,
      styles: [],
    };
    return {
      channel: "signal" as const,
      ...(await sendSignal(to, formatted.text, {
        mediaUrl,
        maxBytes: signalMaxBytes,
        accountId: accountId ?? undefined,
        textMode: "plain",
        textStyles: formatted.styles,
      })),
    };
  };
<<<<<<< HEAD
  const normalizedPayloads = normalizeReplyPayloadsForDelivery(payloads);
=======
  const normalizeWhatsAppPayload = (payload: ReplyPayload): ReplyPayload | null => {
    const hasMedia = Boolean(payload.mediaUrl) || (payload.mediaUrls?.length ?? 0) > 0;
    const rawText = typeof payload.text === "string" ? payload.text : "";
    const normalizedText = rawText.replace(/^(?:[ \t]*\r?\n)+/, "");
    if (!normalizedText.trim()) {
      if (!hasMedia) {
        return null;
      }
      return {
        ...payload,
        text: "",
      };
    }
    return {
      ...payload,
      text: normalizedText,
    };
  };
  const normalizedPayloads = normalizeReplyPayloadsForDelivery(payloads).flatMap((payload) => {
    if (channel !== "whatsapp") {
      return [payload];
    }
    const normalized = normalizeWhatsAppPayload(payload);
    return normalized ? [normalized] : [];
  });
  const hookRunner = getGlobalHookRunner();
  const sessionKeyForInternalHooks = params.mirror?.sessionKey;
>>>>>>> f07bb8e8f (fix(hooks): backport internal message hook bridge with safe delivery semantics)
  for (const payload of normalizedPayloads) {
    const payloadSummary: NormalizedOutboundPayload = {
      text: payload.text ?? "",
      mediaUrls: payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : []),
      channelData: payload.channelData,
    };
<<<<<<< HEAD
=======
    const emitMessageSent = (params: {
      success: boolean;
      content: string;
      error?: string;
      messageId?: string;
    }) => {
      if (hookRunner?.hasHooks("message_sent")) {
        void hookRunner
          .runMessageSent(
            {
              to,
              content: params.content,
              success: params.success,
              ...(params.error ? { error: params.error } : {}),
            },
            {
              channelId: channel,
              accountId: accountId ?? undefined,
              conversationId: to,
            },
          )
          .catch(() => {});
      }
      if (!sessionKeyForInternalHooks) {
        return;
      }
      void triggerInternalHook(
        createInternalHookEvent("message", "sent", sessionKeyForInternalHooks, {
          to,
          content: params.content,
          success: params.success,
          ...(params.error ? { error: params.error } : {}),
          channelId: channel,
          accountId: accountId ?? undefined,
          conversationId: to,
          messageId: params.messageId,
        }),
      ).catch(() => {});
    };
>>>>>>> f07bb8e8f (fix(hooks): backport internal message hook bridge with safe delivery semantics)
    try {
      throwIfAborted(abortSignal);
      params.onPayload?.(payloadSummary);
<<<<<<< HEAD
      if (handler.sendPayload && payload.channelData) {
        results.push(await handler.sendPayload(payload));
=======
      const sendOverrides = {
        replyToId: effectivePayload.replyToId ?? params.replyToId ?? undefined,
        threadId: params.threadId ?? undefined,
      };
      if (handler.sendPayload && effectivePayload.channelData) {
<<<<<<< HEAD
        results.push(await handler.sendPayload(effectivePayload, sendOverrides));
        emitMessageSent(true);
>>>>>>> 087dca8fa (fix(subagent): harden read-tool overflow guards and sticky reply threading (#19508))
=======
        const delivery = await handler.sendPayload(effectivePayload, sendOverrides);
        results.push(delivery);
        emitMessageSent({
          success: true,
          content: payloadSummary.text,
          messageId: delivery.messageId,
        });
>>>>>>> f07bb8e8f (fix(hooks): backport internal message hook bridge with safe delivery semantics)
        continue;
      }
      if (payloadSummary.mediaUrls.length === 0) {
        const beforeCount = results.length;
        if (isSignalChannel) {
          await sendSignalTextChunks(payloadSummary.text);
        } else {
          await sendTextChunks(payloadSummary.text, sendOverrides);
        }
<<<<<<< HEAD
=======
        const messageId = results.at(-1)?.messageId;
        emitMessageSent({
          success: results.length > beforeCount,
          content: payloadSummary.text,
          messageId,
        });
>>>>>>> f07bb8e8f (fix(hooks): backport internal message hook bridge with safe delivery semantics)
        continue;
      }

      let first = true;
      let lastMessageId: string | undefined;
      for (const url of payloadSummary.mediaUrls) {
        throwIfAborted(abortSignal);
        const caption = first ? payloadSummary.text : "";
        first = false;
        if (isSignalChannel) {
          const delivery = await sendSignalMedia(caption, url);
          results.push(delivery);
          lastMessageId = delivery.messageId;
        } else {
          const delivery = await handler.sendMedia(caption, url, sendOverrides);
          results.push(delivery);
          lastMessageId = delivery.messageId;
        }
      }
<<<<<<< HEAD
    } catch (err) {
=======
      emitMessageSent({
        success: true,
        content: payloadSummary.text,
        messageId: lastMessageId,
      });
    } catch (err) {
      emitMessageSent({
        success: false,
        content: payloadSummary.text,
        error: err instanceof Error ? err.message : String(err),
      });
>>>>>>> f07bb8e8f (fix(hooks): backport internal message hook bridge with safe delivery semantics)
      if (!params.bestEffort) {
        throw err;
      }
      params.onError?.(err, payloadSummary);
    }
  }
  if (params.mirror && results.length > 0) {
    const mirrorText = resolveMirroredTranscriptText({
      text: params.mirror.text,
      mediaUrls: params.mirror.mediaUrls,
    });
    if (mirrorText) {
      await appendAssistantMessageToSessionTranscript({
        agentId: params.mirror.agentId,
        sessionKey: params.mirror.sessionKey,
        text: mirrorText,
      });
    }
  }

  return results;
}
