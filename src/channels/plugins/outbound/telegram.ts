import type { OutboundSendDeps } from "../../../infra/outbound/deliver.js";
import type { TelegramInlineButtons } from "../../../telegram/button-types.js";
import { markdownToTelegramHtmlChunks } from "../../../telegram/format.js";
import {
  parseTelegramReplyToMessageId,
  parseTelegramThreadId,
} from "../../../telegram/outbound-params.js";
import { sendMessageTelegram } from "../../../telegram/send.js";
import type { ChannelOutboundAdapter } from "../types.js";

function resolveTelegramSendContext(params: {
  deps?: OutboundSendDeps;
  accountId?: string | null;
  replyToId?: string | null;
  threadId?: string | number | null;
}): {
  send: typeof sendMessageTelegram;
  baseOpts: {
    verbose: false;
    textMode: "html";
    messageThreadId?: number;
    replyToMessageId?: number;
    accountId?: string;
  };
} {
  const send = params.deps?.sendTelegram ?? sendMessageTelegram;
  return {
    send,
    baseOpts: {
      verbose: false,
      textMode: "html",
      messageThreadId: parseTelegramThreadId(params.threadId),
      replyToMessageId: parseTelegramReplyToMessageId(params.replyToId),
      accountId: params.accountId ?? undefined,
    },
  };
}

export const telegramOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: markdownToTelegramHtmlChunks,
  chunkerMode: "markdown",
  textChunkLimit: 4000,
  sendText: async ({ to, text, accountId, deps, replyToId, threadId }) => {
    const { send, baseOpts } = resolveTelegramSendContext({
      deps,
      accountId,
      replyToId,
      threadId,
    });
    const result = await send(to, text, {
      ...baseOpts,
    });
    return { channel: "telegram", ...result };
  },
<<<<<<< HEAD
  sendMedia: async ({ to, text, mediaUrl, accountId, deps, replyToId, threadId }) => {
    const send = deps?.sendTelegram ?? sendMessageTelegram;
    const replyToMessageId = parseTelegramReplyToMessageId(replyToId);
    const messageThreadId = parseTelegramThreadId(threadId);
=======
  sendMedia: async ({
    to,
    text,
    mediaUrl,
    mediaLocalRoots,
    accountId,
    deps,
    replyToId,
    threadId,
  }) => {
    const { send, baseOpts } = resolveTelegramSendContext({
      deps,
      accountId,
      replyToId,
      threadId,
    });
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
    const result = await send(to, text, {
      ...baseOpts,
      mediaUrl,
<<<<<<< HEAD
      textMode: "html",
      messageThreadId,
      replyToMessageId,
      accountId: accountId ?? undefined,
    });
    return { channel: "telegram", ...result };
  },
  sendPayload: async ({ to, payload, accountId, deps, replyToId, threadId }) => {
    const send = deps?.sendTelegram ?? sendMessageTelegram;
    const replyToMessageId = parseTelegramReplyToMessageId(replyToId);
    const messageThreadId = parseTelegramThreadId(threadId);
=======
      mediaLocalRoots,
    });
    return { channel: "telegram", ...result };
  },
  sendPayload: async ({ to, payload, mediaLocalRoots, accountId, deps, replyToId, threadId }) => {
    const { send, baseOpts: contextOpts } = resolveTelegramSendContext({
      deps,
      accountId,
      replyToId,
      threadId,
    });
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
    const telegramData = payload.channelData?.telegram as
      | { buttons?: TelegramInlineButtons; quoteText?: string }
      | undefined;
    const quoteText =
      typeof telegramData?.quoteText === "string" ? telegramData.quoteText : undefined;
    const text = payload.text ?? "";
    const mediaUrls = payload.mediaUrls?.length
      ? payload.mediaUrls
      : payload.mediaUrl
        ? [payload.mediaUrl]
        : [];
    const payloadOpts = {
      ...contextOpts,
      quoteText,
<<<<<<< HEAD
      accountId: accountId ?? undefined,
=======
      mediaLocalRoots,
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
    };

    if (mediaUrls.length === 0) {
      const result = await send(to, text, {
        ...payloadOpts,
        buttons: telegramData?.buttons,
      });
      return { channel: "telegram", ...result };
    }

    // Telegram allows reply_markup on media; attach buttons only to first send.
    let finalResult: Awaited<ReturnType<typeof send>> | undefined;
    for (let i = 0; i < mediaUrls.length; i += 1) {
      const mediaUrl = mediaUrls[i];
      const isFirst = i === 0;
      finalResult = await send(to, isFirst ? text : "", {
        ...payloadOpts,
        mediaUrl,
        ...(isFirst ? { buttons: telegramData?.buttons } : {}),
      });
    }
    return { channel: "telegram", ...(finalResult ?? { messageId: "unknown", chatId: to }) };
  },
};
