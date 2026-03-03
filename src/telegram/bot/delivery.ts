import { type Bot, GrammyError, InputFile } from "grammy";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import {
  markdownToTelegramChunks,
  markdownToTelegramHtml,
  renderTelegramHtmlText,
} from "../format.js";
import { withTelegramApiErrorLogging } from "../api-logging.js";
import { chunkMarkdownTextWithMode, type ChunkMode } from "../../auto-reply/chunk.js";
import { splitTelegramCaption } from "../caption.js";
import type { ReplyPayload } from "../../auto-reply/types.js";
import type { ReplyToMode } from "../../config/config.js";
import type { MarkdownTableMode } from "../../config/types.base.js";
<<<<<<< HEAD
import { danger, logVerbose } from "../../globals.js";
=======
=======
import { chunkMarkdownTextWithMode, type ChunkMode } from "../../auto-reply/chunk.js";
import type { ReplyPayload } from "../../auto-reply/types.js";
import type { ReplyToMode } from "../../config/config.js";
import type { MarkdownTableMode } from "../../config/types.base.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { ReplyPayload } from "../../auto-reply/types.js";
import type { ReplyToMode } from "../../config/config.js";
import type { MarkdownTableMode } from "../../config/types.base.js";
=======
import type { ReplyPayload } from "../../auto-reply/types.js";
import type { ReplyToMode } from "../../config/config.js";
import type { MarkdownTableMode } from "../../config/types.base.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { RuntimeEnv } from "../../runtime.js";
import type { TelegramInlineButtons } from "../button-types.js";
import type { StickerMetadata, TelegramContext } from "./types.js";
import { chunkMarkdownTextWithMode, type ChunkMode } from "../../auto-reply/chunk.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { chunkMarkdownTextWithMode, type ChunkMode } from "../../auto-reply/chunk.js";
import type { ReplyPayload } from "../../auto-reply/types.js";
import type { ReplyToMode } from "../../config/config.js";
import type { MarkdownTableMode } from "../../config/types.base.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { danger, logVerbose, warn } from "../../globals.js";
>>>>>>> 01b37f1d3 (fix(telegram): handle large file getFile errors gracefully)
import { formatErrorMessage } from "../../infra/errors.js";
import { retryAsync } from "../../infra/retry.js";
import { mediaKindFromMime } from "../../media/constants.js";
import { fetchRemoteMedia } from "../../media/fetch.js";
import { isGifMedia } from "../../media/mime.js";
import { saveMediaBuffer } from "../../media/store.js";
import type { RuntimeEnv } from "../../runtime.js";
import { loadWebMedia } from "../../web/media.js";
import { withTelegramApiErrorLogging } from "../api-logging.js";
import type { TelegramInlineButtons } from "../button-types.js";
import { splitTelegramCaption } from "../caption.js";
import {
  markdownToTelegramChunks,
  markdownToTelegramHtml,
  renderTelegramHtmlText,
  wrapFileReferencesInHtml,
} from "../format.js";
import { buildInlineKeyboard } from "../send.js";
import { resolveTelegramVoiceSend } from "../voice.js";
import { buildTelegramThreadParams, resolveTelegramReplyId } from "./helpers.js";
import type { StickerMetadata, TelegramContext } from "./types.js";
import { cacheSticker, getCachedSticker } from "../sticker-cache.js";
=======
=======
import {
  createDeliveryProgress,
  markDelivered,
  markReplyApplied,
  resolveReplyToForSend,
  sendChunkedTelegramReplyText,
  type DeliveryProgress,
} from "./reply-threading.js";
>>>>>>> c0bf42f2a (refactor: centralize delivery/path/media/version lifecycle)
import type { StickerMetadata, TelegramContext } from "./types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { StickerMetadata, TelegramContext } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { StickerMetadata, TelegramContext } from "./types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

const PARSE_ERR_RE = /can't parse entities|parse entities|find end of the entity/i;
const EMPTY_TEXT_ERR_RE = /message text is empty/i;
const VOICE_FORBIDDEN_RE = /VOICE_MESSAGES_FORBIDDEN/;
const CAPTION_TOO_LONG_RE = /caption is too long/i;
const FILE_TOO_BIG_RE = /file is too big/i;
<<<<<<< HEAD
const TELEGRAM_MEDIA_SSRF_POLICY = {
  // Telegram file downloads should trust api.telegram.org even when DNS/proxy
  // resolution maps to private/internal ranges in restricted networks.
  allowedHostnames: ["api.telegram.org"],
  allowRfc2544BenchmarkRange: true,
} as const;
>>>>>>> dd14daab1 (fix(telegram): allowlist api.telegram.org in media SSRF policy)
=======
>>>>>>> 6e31bca19 (fix(telegram): fail loud on empty text fallback)

type ChunkTextFn = (markdown: string) => ReturnType<typeof markdownToTelegramChunks>;

function buildChunkTextResolver(params: {
  textLimit: number;
  chunkMode: ChunkMode;
  tableMode?: MarkdownTableMode;
}): ChunkTextFn {
  return (markdown: string) => {
    const markdownChunks =
      params.chunkMode === "newline"
        ? chunkMarkdownTextWithMode(markdown, params.textLimit, params.chunkMode)
        : [markdown];
    const chunks: ReturnType<typeof markdownToTelegramChunks> = [];
    for (const chunk of markdownChunks) {
      const nested = markdownToTelegramChunks(chunk, params.textLimit, {
        tableMode: params.tableMode,
      });
      if (!nested.length && chunk) {
        chunks.push({
          html: wrapFileReferencesInHtml(
            markdownToTelegramHtml(chunk, { tableMode: params.tableMode, wrapFileRefs: false }),
          ),
          text: chunk,
        });
        continue;
      }
      chunks.push(...nested);
    }
    return chunks;
  };
}

async function deliverTextReply(params: {
  bot: Bot;
  chatId: string;
  runtime: RuntimeEnv;
  thread?: TelegramThreadSpec | null;
  chunkText: ChunkTextFn;
  replyText: string;
  replyMarkup?: ReturnType<typeof buildInlineKeyboard>;
  replyQuoteText?: string;
  linkPreview?: boolean;
  replyToId?: number;
  replyToMode: ReplyToMode;
  progress: DeliveryProgress;
}): Promise<void> {
  const chunks = params.chunkText(params.replyText);
  await sendChunkedTelegramReplyText({
    chunks,
    progress: params.progress,
    replyToId: params.replyToId,
    replyToMode: params.replyToMode,
    replyMarkup: params.replyMarkup,
    replyQuoteText: params.replyQuoteText,
    quoteOnlyOnFirstChunk: true,
    sendChunk: async ({ chunk, replyToMessageId, replyMarkup, replyQuoteText }) => {
      await sendTelegramText(params.bot, params.chatId, chunk.html, params.runtime, {
        replyToMessageId,
        replyQuoteText,
        thread: params.thread,
        textMode: "html",
        plainText: chunk.text,
        linkPreview: params.linkPreview,
        replyMarkup,
      });
    },
  });
}

async function sendPendingFollowUpText(params: {
  bot: Bot;
  chatId: string;
  runtime: RuntimeEnv;
  thread?: TelegramThreadSpec | null;
  chunkText: ChunkTextFn;
  text: string;
  replyMarkup?: ReturnType<typeof buildInlineKeyboard>;
  linkPreview?: boolean;
  replyToId?: number;
  replyToMode: ReplyToMode;
  progress: DeliveryProgress;
}): Promise<void> {
  const chunks = params.chunkText(params.text);
  await sendChunkedTelegramReplyText({
    chunks,
    progress: params.progress,
    replyToId: params.replyToId,
    replyToMode: params.replyToMode,
    replyMarkup: params.replyMarkup,
    sendChunk: async ({ chunk, replyToMessageId, replyMarkup }) => {
      await sendTelegramText(params.bot, params.chatId, chunk.html, params.runtime, {
        replyToMessageId,
        thread: params.thread,
        textMode: "html",
        plainText: chunk.text,
        linkPreview: params.linkPreview,
        replyMarkup,
      });
    },
  });
}

async function deliverMediaReply(params: {
  reply: ReplyPayload;
  mediaList: string[];
  bot: Bot;
  chatId: string;
  runtime: RuntimeEnv;
  thread?: TelegramThreadSpec | null;
  tableMode?: MarkdownTableMode;
  mediaLocalRoots?: readonly string[];
  chunkText: ChunkTextFn;
  onVoiceRecording?: () => Promise<void> | void;
  linkPreview?: boolean;
  replyQuoteText?: string;
  replyMarkup?: ReturnType<typeof buildInlineKeyboard>;
  replyToId?: number;
  replyToMode: ReplyToMode;
  progress: DeliveryProgress;
}): Promise<void> {
  let first = true;
  let pendingFollowUpText: string | undefined;
  for (const mediaUrl of params.mediaList) {
    const isFirstMedia = first;
    const media = await loadWebMedia(mediaUrl, {
      localRoots: params.mediaLocalRoots,
    });
    const kind = mediaKindFromMime(media.contentType ?? undefined);
    const isGif = isGifMedia({
      contentType: media.contentType,
      fileName: media.fileName,
    });
    const fileName = media.fileName ?? (isGif ? "animation.gif" : "file");
    const file = new InputFile(media.buffer, fileName);
    const { caption, followUpText } = splitTelegramCaption(
      isFirstMedia ? (params.reply.text ?? undefined) : undefined,
    );
    const htmlCaption = caption
      ? renderTelegramHtmlText(caption, { tableMode: params.tableMode })
      : undefined;
    if (followUpText) {
      pendingFollowUpText = followUpText;
    }
    first = false;
    const replyToMessageId = resolveReplyToForSend({
      replyToId: params.replyToId,
      replyToMode: params.replyToMode,
      progress: params.progress,
    });
    const shouldAttachButtonsToMedia = isFirstMedia && params.replyMarkup && !followUpText;
    const mediaParams: Record<string, unknown> = {
      caption: htmlCaption,
      ...(htmlCaption ? { parse_mode: "HTML" } : {}),
      ...(shouldAttachButtonsToMedia ? { reply_markup: params.replyMarkup } : {}),
      ...buildTelegramSendParams({
        replyToMessageId,
        thread: params.thread,
      }),
    };
    if (isGif) {
      await sendTelegramWithThreadFallback({
        operation: "sendAnimation",
        runtime: params.runtime,
        thread: params.thread,
        requestParams: mediaParams,
        send: (effectiveParams) =>
          params.bot.api.sendAnimation(params.chatId, file, { ...effectiveParams }),
      });
      markDelivered(params.progress);
    } else if (kind === "image") {
      await sendTelegramWithThreadFallback({
        operation: "sendPhoto",
        runtime: params.runtime,
        thread: params.thread,
        requestParams: mediaParams,
        send: (effectiveParams) =>
          params.bot.api.sendPhoto(params.chatId, file, { ...effectiveParams }),
      });
      markDelivered(params.progress);
    } else if (kind === "video") {
      await sendTelegramWithThreadFallback({
        operation: "sendVideo",
        runtime: params.runtime,
        thread: params.thread,
        requestParams: mediaParams,
        send: (effectiveParams) =>
          params.bot.api.sendVideo(params.chatId, file, { ...effectiveParams }),
      });
      markDelivered(params.progress);
    } else if (kind === "audio") {
      const { useVoice } = resolveTelegramVoiceSend({
        wantsVoice: params.reply.audioAsVoice === true,
        contentType: media.contentType,
        fileName,
        logFallback: logVerbose,
      });
      if (useVoice) {
        await params.onVoiceRecording?.();
        try {
          await sendTelegramWithThreadFallback({
            operation: "sendVoice",
            runtime: params.runtime,
            thread: params.thread,
            requestParams: mediaParams,
            shouldLog: (err) => !isVoiceMessagesForbidden(err),
            send: (effectiveParams) =>
              params.bot.api.sendVoice(params.chatId, file, { ...effectiveParams }),
          });
          markDelivered(params.progress);
        } catch (voiceErr) {
          if (isVoiceMessagesForbidden(voiceErr)) {
            const fallbackText = params.reply.text;
            if (!fallbackText || !fallbackText.trim()) {
              throw voiceErr;
            }
            logVerbose(
              "telegram sendVoice forbidden (recipient has voice messages blocked in privacy settings); falling back to text",
            );
            const voiceFallbackReplyTo = resolveReplyToForSend({
              replyToId: params.replyToId,
              replyToMode: params.replyToMode,
              progress: params.progress,
            });
            await sendTelegramVoiceFallbackText({
              bot: params.bot,
              chatId: params.chatId,
              runtime: params.runtime,
              text: fallbackText,
              chunkText: params.chunkText,
              replyToId: voiceFallbackReplyTo,
              thread: params.thread,
              linkPreview: params.linkPreview,
              replyMarkup: params.replyMarkup,
              replyQuoteText: params.replyQuoteText,
            });
            markReplyApplied(params.progress, voiceFallbackReplyTo);
            markDelivered(params.progress);
            continue;
          }
          if (isCaptionTooLong(voiceErr)) {
            logVerbose(
              "telegram sendVoice caption too long; resending voice without caption + text separately",
            );
            const noCaptionParams = { ...mediaParams };
            delete noCaptionParams.caption;
            delete noCaptionParams.parse_mode;
            await sendTelegramWithThreadFallback({
              operation: "sendVoice",
              runtime: params.runtime,
              thread: params.thread,
              requestParams: noCaptionParams,
              send: (effectiveParams) =>
                params.bot.api.sendVoice(params.chatId, file, { ...effectiveParams }),
            });
            markDelivered(params.progress);
            const fallbackText = params.reply.text;
            if (fallbackText?.trim()) {
              await sendTelegramVoiceFallbackText({
                bot: params.bot,
                chatId: params.chatId,
                runtime: params.runtime,
                text: fallbackText,
                chunkText: params.chunkText,
                replyToId: undefined,
                thread: params.thread,
                linkPreview: params.linkPreview,
                replyMarkup: params.replyMarkup,
              });
            }
            markReplyApplied(params.progress, replyToMessageId);
            continue;
          }
          throw voiceErr;
        }
      } else {
        await sendTelegramWithThreadFallback({
          operation: "sendAudio",
          runtime: params.runtime,
          thread: params.thread,
          requestParams: mediaParams,
          send: (effectiveParams) =>
            params.bot.api.sendAudio(params.chatId, file, { ...effectiveParams }),
        });
        markDelivered(params.progress);
      }
    } else {
      await sendTelegramWithThreadFallback({
        operation: "sendDocument",
        runtime: params.runtime,
        thread: params.thread,
        requestParams: mediaParams,
        send: (effectiveParams) =>
          params.bot.api.sendDocument(params.chatId, file, { ...effectiveParams }),
      });
      markDelivered(params.progress);
    }
    markReplyApplied(params.progress, replyToMessageId);
    if (pendingFollowUpText && isFirstMedia) {
      await sendPendingFollowUpText({
        bot: params.bot,
        chatId: params.chatId,
        runtime: params.runtime,
        thread: params.thread,
        chunkText: params.chunkText,
        text: pendingFollowUpText,
        replyMarkup: params.replyMarkup,
        linkPreview: params.linkPreview,
        replyToId: params.replyToId,
        replyToMode: params.replyToMode,
        progress: params.progress,
      });
      pendingFollowUpText = undefined;
    }
  }
}

export async function deliverReplies(params: {
  replies: ReplyPayload[];
  chatId: string;
  token: string;
  runtime: RuntimeEnv;
  bot: Bot;
  replyToMode: ReplyToMode;
  textLimit: number;
  messageThreadId?: number;
  tableMode?: MarkdownTableMode;
  chunkMode?: ChunkMode;
  /** Callback invoked before sending a voice message to switch typing indicator. */
  onVoiceRecording?: () => Promise<void> | void;
  /** Controls whether link previews are shown. Default: true (previews enabled). */
  linkPreview?: boolean;
  /** Optional quote text for Telegram reply_parameters. */
  replyQuoteText?: string;
  /** If true, send a fallback message when all replies are empty. Default: false */
  notifyEmptyResponse?: boolean;
}): Promise<{ delivered: boolean }> {
<<<<<<< HEAD
  const {
    replies,
    chatId,
    runtime,
    bot,
    replyToMode,
    textLimit,
    messageThreadId,
    linkPreview,
    replyQuoteText,
  } = params;
  const chunkMode = params.chunkMode ?? "length";
  let hasReplied = false;
  let skippedEmpty = 0;
  const chunkText = (markdown: string) => {
    const markdownChunks =
      chunkMode === "newline"
        ? chunkMarkdownTextWithMode(markdown, textLimit, chunkMode)
        : [markdown];
    const chunks: ReturnType<typeof markdownToTelegramChunks> = [];
    for (const chunk of markdownChunks) {
      const nested = markdownToTelegramChunks(chunk, textLimit, { tableMode: params.tableMode });
      if (!nested.length && chunk) {
        chunks.push({
          html: wrapFileReferencesInHtml(
            markdownToTelegramHtml(chunk, { tableMode: params.tableMode, wrapFileRefs: false }),
          ),
          text: chunk,
        });
        continue;
      }
      chunks.push(...nested);
    }
    return chunks;
  };
  for (const reply of replies) {
  const chunkText = buildChunkTextResolver({
    textLimit: params.textLimit,
    chunkMode: params.chunkMode ?? "length",
    tableMode: params.tableMode,
  });
  for (const reply of params.replies) {
>>>>>>> 493ebb915 (refactor: simplify telegram delivery and outbound session resolver flow)
    const hasMedia = Boolean(reply?.mediaUrl) || (reply?.mediaUrls?.length ?? 0) > 0;
    if (!reply?.text && !hasMedia) {
      if (reply?.audioAsVoice) {
        logVerbose("telegram reply has audioAsVoice without media/text; skipping");
        continue;
      }
      runtime.error?.(danger("reply missing text/media"));
      skippedEmpty++;
      continue;
    }
    const replyToId =
      params.replyToMode === "off" ? undefined : resolveTelegramReplyId(reply.replyToId);
    const mediaList = reply.mediaUrls?.length
      ? reply.mediaUrls
      : reply.mediaUrl
        ? [reply.mediaUrl]
        : [];
    const telegramData = reply.channelData?.telegram as
      | { buttons?: TelegramInlineButtons }
      | undefined;
    const replyMarkup = buildInlineKeyboard(telegramData?.buttons);
    if (mediaList.length === 0) {
      const chunks = chunkText(reply.text || "");
      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        if (!chunk) {
          continue;
        }
        // Only attach buttons to the first chunk.
        const shouldAttachButtons = i === 0 && replyMarkup;
        const replyToForChunk = resolveReplyTo();
        await sendTelegramText(bot, chatId, chunk.html, runtime, {
          replyToMessageId: replyToForChunk,
          replyQuoteText,
          messageThreadId,
          textMode: "html",
          plainText: chunk.text,
          linkPreview,
          replyMarkup: shouldAttachButtons ? replyMarkup : undefined,
        });
<<<<<<< HEAD
<<<<<<< HEAD
        if (replyToId && !hasReplied) {
          hasReplied = true;
        }
      }
=======
        if (replyToForChunk && !hasReplied) {
          hasReplied = true;
        }
        markDelivered();
      }
>>>>>>> 2a381e6d7 (fix(telegram): replyToMode 'first' now only applies reply-to to first chunk)
      continue;
    }
    // media with optional caption on first item
    let first = true;
    // Track if we need to send a follow-up text message after media
    // (when caption exceeds Telegram's 1024-char limit)
    let pendingFollowUpText: string | undefined;
    for (const mediaUrl of mediaList) {
      const isFirstMedia = first;
      const media = await loadWebMedia(mediaUrl);
      const kind = mediaKindFromMime(media.contentType ?? undefined);
      const isGif = isGifMedia({
        contentType: media.contentType,
        fileName: media.fileName,
      });
      const fileName = media.fileName ?? (isGif ? "animation.gif" : "file");
      const file = new InputFile(media.buffer, fileName);
      // Caption only on first item; if text exceeds limit, defer to follow-up message.
      const { caption, followUpText } = splitTelegramCaption(
        isFirstMedia ? (reply.text ?? undefined) : undefined,
      );
      const htmlCaption = caption
        ? renderTelegramHtmlText(caption, { tableMode: params.tableMode })
        : undefined;
      if (followUpText) {
        pendingFollowUpText = followUpText;
      }
      first = false;
      const replyToMessageId = resolveReplyTo();
      const shouldAttachButtonsToMedia = isFirstMedia && replyMarkup && !followUpText;
      const mediaParams: Record<string, unknown> = {
        caption: htmlCaption,
        ...(htmlCaption ? { parse_mode: "HTML" } : {}),
        ...(shouldAttachButtonsToMedia ? { reply_markup: replyMarkup } : {}),
        ...buildTelegramSendParams({
          replyToMessageId,
          messageThreadId,
          replyQuoteText,
        }),
      };
      if (isGif) {
        await sendTelegramWithThreadFallback({
          operation: "sendAnimation",
          runtime,
          thread,
          requestParams: mediaParams,
          send: (effectiveParams) => bot.api.sendAnimation(chatId, file, { ...effectiveParams }),
        });
      } else if (kind === "image") {
        await sendTelegramWithThreadFallback({
          operation: "sendPhoto",
          runtime,
          thread,
          requestParams: mediaParams,
          send: (effectiveParams) => bot.api.sendPhoto(chatId, file, { ...effectiveParams }),
        });
      } else if (kind === "video") {
        await sendTelegramWithThreadFallback({
          operation: "sendVideo",
          runtime,
          thread,
          requestParams: mediaParams,
          send: (effectiveParams) => bot.api.sendVideo(chatId, file, { ...effectiveParams }),
        });
      } else if (kind === "audio") {
        const { useVoice } = resolveTelegramVoiceSend({
          wantsVoice: reply.audioAsVoice === true, // default false (backward compatible)
          contentType: media.contentType,
          fileName,
          logFallback: logVerbose,
        });
        if (useVoice) {
          // Voice message - displays as round playable bubble (opt-in via [[audio_as_voice]])
          // Switch typing indicator to record_voice before sending.
          await params.onVoiceRecording?.();
          try {
            await sendTelegramWithThreadFallback({
              operation: "sendVoice",
              runtime,
              thread,
              requestParams: mediaParams,
              shouldLog: (err) => !isVoiceMessagesForbidden(err),
              send: (effectiveParams) => bot.api.sendVoice(chatId, file, { ...effectiveParams }),
            });
          } catch (voiceErr) {
            // Fall back to text if voice messages are forbidden in this chat.
            if (isVoiceMessagesForbidden(voiceErr)) {
              const fallbackText = reply.text;
              if (!fallbackText || !fallbackText.trim()) {
                throw voiceErr;
              }
              logVerbose(
                "telegram sendVoice forbidden (recipient has voice messages blocked in privacy settings); falling back to text",
              );
              await sendTelegramVoiceFallbackText({
                bot,
                chatId,
                runtime,
                text: fallbackText,
                chunkText,
<<<<<<< HEAD
                replyToId,
                replyToMode,
                hasReplied,
                messageThreadId,
                thread,
>>>>>>> 087dca8fa (fix(subagent): harden read-tool overflow guards and sticky reply threading (#19508))
                linkPreview,
                replyMarkup,
                replyQuoteText,
              });
<<<<<<< HEAD
                hasReplied = true;
              }
              markDelivered();
>>>>>>> 087dca8fa (fix(subagent): harden read-tool overflow guards and sticky reply threading (#19508))
              // Skip this media item; continue with next.
              continue;
            }
            throw voiceErr;
          }
        } else {
          // Audio file - displays with metadata (title, duration) - DEFAULT
          await sendTelegramWithThreadFallback({
            operation: "sendAudio",
            runtime,
            thread,
            requestParams: mediaParams,
            send: (effectiveParams) => bot.api.sendAudio(chatId, file, { ...effectiveParams }),
          });
        }
      } else {
        await sendTelegramWithThreadFallback({
          operation: "sendDocument",
          runtime,
          thread,
          requestParams: mediaParams,
          send: (effectiveParams) => bot.api.sendDocument(chatId, file, { ...effectiveParams }),
        });
      }
      if (replyToId && !hasReplied) {
        hasReplied = true;
      }
      // Send deferred follow-up text right after the first media item.
      // Chunk it in case it's extremely long (same logic as text-only replies).
      if (pendingFollowUpText && isFirstMedia) {
        const chunks = chunkText(pendingFollowUpText);
        for (let i = 0; i < chunks.length; i += 1) {
          const chunk = chunks[i];
          const replyToForFollowUp = resolveReplyTo();
          await sendTelegramText(bot, chatId, chunk.html, runtime, {
<<<<<<< HEAD
            replyToMessageId: replyToMessageIdFollowup,
            messageThreadId,
            thread,
>>>>>>> 087dca8fa (fix(subagent): harden read-tool overflow guards and sticky reply threading (#19508))
            textMode: "html",
            plainText: chunk.text,
            linkPreview,
            replyMarkup: i === 0 ? replyMarkup : undefined,
          });
<<<<<<< HEAD
          if (replyToId && !hasReplied) {
            hasReplied = true;
          }
          markDelivered();
>>>>>>> 087dca8fa (fix(subagent): harden read-tool overflow guards and sticky reply threading (#19508))
        }
        pendingFollowUpText = undefined;
      }
    }
  }

  // If all replies were empty and notifyEmptyResponse is enabled, send a fallback message
  // Check both: (1) replies with no content (skippedEmpty), (2) no replies at all (empty array)
  if (!hasReplied && (skippedEmpty > 0 || replies.length === 0) && params.notifyEmptyResponse) {
    const fallbackText = "No response generated. Please try again.";
    await sendTelegramText(bot, chatId, fallbackText, runtime, {
      messageThreadId,
    });
    hasReplied = true;
  }

  return { delivered: hasReplied };
=======
      await deliverTextReply({
        bot: params.bot,
        chatId: params.chatId,
        runtime: params.runtime,
        thread: params.thread,
        chunkText,
        replyText: reply.text || "",
        replyMarkup,
        replyQuoteText: params.replyQuoteText,
        linkPreview: params.linkPreview,
        replyToId,
        replyToMode: params.replyToMode,
        progress,
      });
      continue;
    }
    await deliverMediaReply({
      reply,
      mediaList,
      bot: params.bot,
      chatId: params.chatId,
      runtime: params.runtime,
      thread: params.thread,
      tableMode: params.tableMode,
      mediaLocalRoots: params.mediaLocalRoots,
      chunkText,
      onVoiceRecording: params.onVoiceRecording,
      linkPreview: params.linkPreview,
      replyQuoteText: params.replyQuoteText,
      replyMarkup,
      replyToId,
      replyToMode: params.replyToMode,
      progress,
    });
  }

  return { delivered: progress.hasDelivered };
>>>>>>> 493ebb915 (refactor: simplify telegram delivery and outbound session resolver flow)
}

export async function resolveMedia(
  ctx: TelegramContext,
  maxBytes: number,
  token: string,
  proxyFetch?: typeof fetch,
): Promise<{
  path: string;
  contentType?: string;
  placeholder: string;
  stickerMetadata?: StickerMetadata;
} | null> {
  const msg = ctx.message;
  const downloadAndSaveTelegramFile = async (filePath: string, fetchImpl: typeof fetch) => {
    const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
    const fetched = await fetchRemoteMedia({
      url,
      fetchImpl,
      filePathHint: filePath,
    });
    const originalName = fetched.fileName ?? filePath;
    return saveMediaBuffer(fetched.buffer, fetched.contentType, "inbound", maxBytes, originalName);
  };

  // Handle stickers separately - only static stickers (WEBP) are supported
  if (msg.sticker) {
    const sticker = msg.sticker;
    // Skip animated (TGS) and video (WEBM) stickers - only static WEBP supported
    if (sticker.is_animated || sticker.is_video) {
      logVerbose("telegram: skipping animated/video sticker (only static stickers supported)");
      return null;
    }
    if (!sticker.file_id) {
      return null;
    }

    try {
      const file = await ctx.getFile();
      if (!file.file_path) {
        logVerbose("telegram: getFile returned no file_path for sticker");
        return null;
      }
      const fetchImpl = proxyFetch ?? globalThis.fetch;
      if (!fetchImpl) {
        logVerbose("telegram: fetch not available for sticker download");
        return null;
      }
      const saved = await downloadAndSaveTelegramFile(file.file_path, fetchImpl);

      // Check sticker cache for existing description
      const cached = sticker.file_unique_id ? getCachedSticker(sticker.file_unique_id) : null;
      if (cached) {
        logVerbose(`telegram: sticker cache hit for ${sticker.file_unique_id}`);
        const fileId = sticker.file_id ?? cached.fileId;
        const emoji = sticker.emoji ?? cached.emoji;
        const setName = sticker.set_name ?? cached.setName;
        if (fileId !== cached.fileId || emoji !== cached.emoji || setName !== cached.setName) {
          // Refresh cached sticker metadata on hits so sends/searches use latest file_id.
          cacheSticker({
            ...cached,
            fileId,
            emoji,
            setName,
          });
        }
        return {
          path: saved.path,
          contentType: saved.contentType,
          placeholder: "<media:sticker>",
          stickerMetadata: {
            emoji,
            setName,
            fileId,
            fileUniqueId: sticker.file_unique_id,
            cachedDescription: cached.description,
          },
        };
      }

      // Cache miss - return metadata for vision processing
      return {
        path: saved.path,
        contentType: saved.contentType,
        placeholder: "<media:sticker>",
        stickerMetadata: {
          emoji: sticker.emoji ?? undefined,
          setName: sticker.set_name ?? undefined,
          fileId: sticker.file_id,
          fileUniqueId: sticker.file_unique_id,
        },
      };
    } catch (err) {
      logVerbose(`telegram: failed to process sticker: ${String(err)}`);
      return null;
    }
  }

  const m =
    msg.photo?.[msg.photo.length - 1] ??
    msg.video ??
    msg.video_note ??
    msg.document ??
    msg.audio ??
    msg.voice;
  if (!m?.file_id) {
    return null;
  }

  let file: { file_path?: string };
  try {
    file = await retryAsync(() => ctx.getFile(), {
      attempts: 3,
      minDelayMs: 1000,
      maxDelayMs: 4000,
      jitter: 0.2,
      label: "telegram:getFile",
      shouldRetry: isRetryableGetFileError,
      onRetry: ({ attempt, maxAttempts }) =>
        logVerbose(`telegram: getFile retry ${attempt}/${maxAttempts}`),
    });
  } catch (err) {
    // Handle "file is too big" separately - Telegram Bot API has a 20MB download limit
    if (isFileTooBigError(err)) {
      logVerbose(
        warn(
          "telegram: getFile failed - file exceeds Telegram Bot API 20MB limit; skipping attachment",
        ),
      );
      return null;
    }
    // All retries exhausted — return null so the message still reaches the agent
    // with a type-based placeholder (e.g. <media:audio>) instead of being dropped.
    logVerbose(`telegram: getFile failed after retries: ${String(err)}`);
    return null;
  }
  if (!file.file_path) {
    throw new Error("Telegram getFile returned no file_path");
  }
  const fetchImpl = proxyFetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("fetch is not available; set channels.telegram.proxy in config");
  }
  const saved = await downloadAndSaveTelegramFile(file.file_path, fetchImpl);
  const placeholder = resolveTelegramMediaPlaceholder(msg) ?? "<media:document>";
  return { path: saved.path, contentType: saved.contentType, placeholder };
}

function isVoiceMessagesForbidden(err: unknown): boolean {
  if (err instanceof GrammyError) {
    return VOICE_FORBIDDEN_RE.test(err.description);
  }
  return VOICE_FORBIDDEN_RE.test(formatErrorMessage(err));
}

function isCaptionTooLong(err: unknown): boolean {
  if (err instanceof GrammyError) {
    return CAPTION_TOO_LONG_RE.test(err.description);
  }
  return CAPTION_TOO_LONG_RE.test(formatErrorMessage(err));
}

/**
 * Returns true if the error is Telegram's "file is too big" error.
 * This happens when trying to download files >20MB via the Bot API.
 * Unlike network errors, this is a permanent error and should not be retried.
 */
function isFileTooBigError(err: unknown): boolean {
  if (err instanceof GrammyError) {
    return FILE_TOO_BIG_RE.test(err.description);
  }
  return FILE_TOO_BIG_RE.test(formatErrorMessage(err));
}

/**
 * Returns true if the error is a transient network error that should be retried.
 * Returns false for permanent errors like "file is too big" (400 Bad Request).
 */
function isRetryableGetFileError(err: unknown): boolean {
  // Don't retry "file is too big" - it's a permanent 400 error
  if (isFileTooBigError(err)) {
    return false;
  }
  // Retry all other errors (network issues, timeouts, etc.)
  return true;
}

async function sendTelegramVoiceFallbackText(opts: {
  bot: Bot;
  chatId: string;
  runtime: RuntimeEnv;
  text: string;
  chunkText: (markdown: string) => ReturnType<typeof markdownToTelegramChunks>;
  replyToId?: number;
  replyToMode: ReplyToMode;
  hasReplied: boolean;
  messageThreadId?: number;
  linkPreview?: boolean;
  replyMarkup?: ReturnType<typeof buildInlineKeyboard>;
  replyQuoteText?: string;
}): Promise<void> {
  const chunks = opts.chunkText(opts.text);
  let appliedReplyTo = false;
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    // Only apply reply reference, quote text, and buttons to the first chunk.
    const replyToForChunk = !appliedReplyTo ? opts.replyToId : undefined;
    await sendTelegramText(opts.bot, opts.chatId, chunk.html, opts.runtime, {
      replyToMessageId: replyToForChunk,
<<<<<<< HEAD
      replyQuoteText: opts.replyQuoteText,
      messageThreadId: opts.messageThreadId,
      textMode: "html",
      plainText: chunk.text,
      linkPreview: opts.linkPreview,
      replyMarkup: !appliedReplyTo ? opts.replyMarkup : undefined,
    });
    if (replyToForChunk) {
      appliedReplyTo = true;
    }
  }
=======
  const progress = createDeliveryProgress();
  await sendChunkedTelegramReplyText({
    chunks,
    progress,
    replyToId: opts.replyToId,
    replyToMode: "first",
    replyMarkup: opts.replyMarkup,
    replyQuoteText: opts.replyQuoteText,
    quoteOnlyOnFirstChunk: true,
    sendChunk: async ({ chunk, replyToMessageId, replyMarkup, replyQuoteText }) => {
      await sendTelegramText(opts.bot, opts.chatId, chunk.html, opts.runtime, {
        replyToMessageId,
        replyQuoteText,
        thread: opts.thread,
        textMode: "html",
        plainText: chunk.text,
        linkPreview: opts.linkPreview,
        replyMarkup,
      });
    },
  });
>>>>>>> c0bf42f2a (refactor: centralize delivery/path/media/version lifecycle)
}

function isTelegramThreadNotFoundError(err: unknown): boolean {
  if (err instanceof GrammyError) {
    return THREAD_NOT_FOUND_RE.test(err.description);
  }
  return THREAD_NOT_FOUND_RE.test(formatErrorMessage(err));
}

function hasMessageThreadIdParam(params: Record<string, unknown> | undefined): boolean {
  if (!params) {
    return false;
  }
  return typeof params.message_thread_id === "number";
}

function removeMessageThreadIdParam(
  params: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!params) {
    return {};
  }
  const { message_thread_id: _ignored, ...rest } = params;
  return rest;
}

async function sendTelegramWithThreadFallback<T>(params: {
  operation: string;
  runtime: RuntimeEnv;
  thread?: TelegramThreadSpec | null;
  requestParams: Record<string, unknown>;
  send: (effectiveParams: Record<string, unknown>) => Promise<T>;
  shouldLog?: (err: unknown) => boolean;
}): Promise<T> {
  const allowThreadlessRetry = params.thread?.scope === "dm";
  const hasThreadId = hasMessageThreadIdParam(params.requestParams);
  const shouldSuppressFirstErrorLog = (err: unknown) =>
    allowThreadlessRetry && hasThreadId && isTelegramThreadNotFoundError(err);
  const mergedShouldLog = params.shouldLog
    ? (err: unknown) => params.shouldLog!(err) && !shouldSuppressFirstErrorLog(err)
    : (err: unknown) => !shouldSuppressFirstErrorLog(err);

  try {
    return await withTelegramApiErrorLogging({
      operation: params.operation,
      runtime: params.runtime,
      shouldLog: mergedShouldLog,
      fn: () => params.send(params.requestParams),
    });
  } catch (err) {
    if (!allowThreadlessRetry || !hasThreadId || !isTelegramThreadNotFoundError(err)) {
      throw err;
    }
    const retryParams = removeMessageThreadIdParam(params.requestParams);
    params.runtime.log?.(
      `telegram ${params.operation}: message thread not found; retrying without message_thread_id`,
    );
    return await withTelegramApiErrorLogging({
      operation: `${params.operation} (threadless retry)`,
      runtime: params.runtime,
      fn: () => params.send(retryParams),
    });
  }
}

function buildTelegramSendParams(opts?: {
  replyToMessageId?: number;
  messageThreadId?: number;
  replyQuoteText?: string;
}): Record<string, unknown> {
  const threadParams = buildTelegramThreadParams(opts?.messageThreadId);
  const params: Record<string, unknown> = {};
  if (opts?.replyToMessageId) {
    params.reply_to_message_id = opts.replyToMessageId;
  }
  if (threadParams) {
    params.message_thread_id = threadParams.message_thread_id;
  }
  return params;
}

async function sendTelegramText(
  bot: Bot,
  chatId: string,
  text: string,
  runtime: RuntimeEnv,
  opts?: {
    replyToMessageId?: number;
    replyQuoteText?: string;
    messageThreadId?: number;
    textMode?: "markdown" | "html";
    plainText?: string;
    linkPreview?: boolean;
    replyMarkup?: ReturnType<typeof buildInlineKeyboard>;
  },
): Promise<number> {
  const baseParams = buildTelegramSendParams({
    replyToMessageId: opts?.replyToMessageId,
    replyQuoteText: opts?.replyQuoteText,
    messageThreadId: opts?.messageThreadId,
  });
  // Add link_preview_options when link preview is disabled.
  const linkPreviewEnabled = opts?.linkPreview ?? true;
  const linkPreviewOptions = linkPreviewEnabled ? undefined : { is_disabled: true };
  const textMode = opts?.textMode ?? "markdown";
  const htmlText = textMode === "html" ? text : markdownToTelegramHtml(text);
  const fallbackText = opts?.plainText ?? text;
  const hasFallbackText = fallbackText.trim().length > 0;
  const sendPlainFallback = async () => {
    const res = await sendTelegramWithThreadFallback({
      operation: "sendMessage",
      runtime,
      thread: opts?.thread,
      requestParams: baseParams,
      send: (effectiveParams) =>
        bot.api.sendMessage(chatId, fallbackText, {
          ...(linkPreviewOptions ? { link_preview_options: linkPreviewOptions } : {}),
          ...(opts?.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
          ...effectiveParams,
        }),
    });
    runtime.log?.(`telegram sendMessage ok chat=${chatId} message=${res.message_id} (plain)`);
    return res.message_id;
  };

  // Markdown can render to empty HTML for syntax-only chunks; recover with plain text.
  if (!htmlText.trim()) {
    if (!hasFallbackText) {
      throw new Error("telegram sendMessage failed: empty formatted text and empty plain fallback");
    }
    return await sendPlainFallback();
  }
  try {
    const res = await sendTelegramWithThreadFallback({
      operation: "sendMessage",
      runtime,
      thread: opts?.thread,
      requestParams: baseParams,
      shouldLog: (err) => {
        const errText = formatErrorMessage(err);
        return !PARSE_ERR_RE.test(errText) && !EMPTY_TEXT_ERR_RE.test(errText);
      },
      send: (effectiveParams) =>
        bot.api.sendMessage(chatId, htmlText, {
          parse_mode: "HTML",
          ...(linkPreviewOptions ? { link_preview_options: linkPreviewOptions } : {}),
          ...(opts?.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
          ...effectiveParams,
        }),
    });
    runtime.log?.(`telegram sendMessage ok chat=${chatId} message=${res.message_id}`);
    return res.message_id;
  } catch (err) {
    const errText = formatErrorMessage(err);
    if (PARSE_ERR_RE.test(errText) || EMPTY_TEXT_ERR_RE.test(errText)) {
      if (!hasFallbackText) {
        throw err;
      }
      runtime.log?.(`telegram formatted send failed; retrying without formatting: ${errText}`);
      return await sendPlainFallback();
    }
    throw err;
  }
}
=======
export { deliverReplies } from "./delivery.replies.js";
export { resolveMedia } from "./delivery.resolve-media.js";
>>>>>>> e1f3ded03 (refactor: split telegram delivery and unify media/frontmatter/i18n pipelines)
