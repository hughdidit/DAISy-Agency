// @ts-nocheck
import { EmbeddedBlockChunker } from "../agents/pi-embedded-block-chunker.js";
import {
  findModelInCatalog,
  loadModelCatalog,
  modelSupportsVision,
} from "../agents/model-catalog.js";
import { resolveDefaultModelForAgent } from "../agents/model-selection.js";
import { resolveChunkMode } from "../auto-reply/chunk.js";
import { clearHistoryEntriesIfEnabled } from "../auto-reply/reply/history.js";
import { dispatchReplyWithBufferedBlockDispatcher } from "../auto-reply/reply/provider-dispatcher.js";
import { removeAckReactionAfterReply } from "../channels/ack-reactions.js";
import { logAckFailure, logTypingFailure } from "../channels/logging.js";
import { createReplyPrefixOptions } from "../channels/reply-prefix.js";
import { createTypingCallbacks } from "../channels/typing.js";
<<<<<<< HEAD
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 147eba11f (chore: Manually fix TypeScript errors uncovered by sorting imports.)
import { danger, logVerbose } from "../globals.js";
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
=======
>>>>>>> f44b58fd5 (style(telegram): format dispatch files)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import type { OpenClawConfig, ReplyToMode, TelegramAccountConfig } from "../config/types.js";
import { danger, logVerbose } from "../globals.js";
import { getAgentScopedMediaLocalRoots } from "../media/local-roots.js";
import type { RuntimeEnv } from "../runtime.js";
import type { TelegramMessageContext } from "./bot-message-context.js";
import type { TelegramBotOptions } from "./bot.js";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { danger, logVerbose } from "../globals.js";
import { getAgentScopedMediaLocalRoots } from "../media/local-roots.js";
>>>>>>> 7ffc8f9f7 (fix(telegram): add initial message debounce for better push notifications (#18147))
=======
>>>>>>> f44b58fd5 (style(telegram): format dispatch files)
=======
import { danger, logVerbose } from "../globals.js";
import { getAgentScopedMediaLocalRoots } from "../media/local-roots.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { deliverReplies } from "./bot/delivery.js";
import type { TelegramStreamMode } from "./bot/types.js";
import type { TelegramInlineButtons } from "./button-types.js";
import { createTelegramDraftStream } from "./draft-stream.js";
import { renderTelegramHtmlText } from "./format.js";
import {
  type ArchivedPreview,
  createLaneDeliveryStateTracker,
  createLaneTextDeliverer,
  type DraftLaneState,
  type LaneName,
} from "./lane-delivery.js";
import {
  createTelegramReasoningStepState,
  splitTelegramReasoningText,
} from "./reasoning-lane-coordinator.js";
import { editMessageTelegram } from "./send.js";
import { cacheSticker, describeStickerImage } from "./sticker-cache.js";
import { resolveAgentDir } from "../agents/agent-scope.js";

/** Minimum chars before sending first streaming message (improves push notification UX) */
const DRAFT_MIN_INITIAL_CHARS = 30;

async function resolveStickerVisionSupport(cfg: OpenClawConfig, agentId: string) {
  try {
    const catalog = await loadModelCatalog({ config: cfg });
    const defaultModel = resolveDefaultModelForAgent({ cfg, agentId });
    const entry = findModelInCatalog(catalog, defaultModel.provider, defaultModel.model);
    if (!entry) {
      return false;
    }
    return modelSupportsVision(entry);
  } catch {
    return false;
  }
}

export function pruneStickerMediaFromContext(
  ctxPayload: {
    MediaPath?: string;
    MediaUrl?: string;
    MediaType?: string;
    MediaPaths?: string[];
    MediaUrls?: string[];
    MediaTypes?: string[];
  },
  opts?: { stickerMediaIncluded?: boolean },
) {
  if (opts?.stickerMediaIncluded === false) {
    return;
  }
  const nextMediaPaths = Array.isArray(ctxPayload.MediaPaths)
    ? ctxPayload.MediaPaths.slice(1)
    : undefined;
  const nextMediaUrls = Array.isArray(ctxPayload.MediaUrls)
    ? ctxPayload.MediaUrls.slice(1)
    : undefined;
  const nextMediaTypes = Array.isArray(ctxPayload.MediaTypes)
    ? ctxPayload.MediaTypes.slice(1)
    : undefined;
  ctxPayload.MediaPaths = nextMediaPaths && nextMediaPaths.length > 0 ? nextMediaPaths : undefined;
  ctxPayload.MediaUrls = nextMediaUrls && nextMediaUrls.length > 0 ? nextMediaUrls : undefined;
  ctxPayload.MediaTypes = nextMediaTypes && nextMediaTypes.length > 0 ? nextMediaTypes : undefined;
  ctxPayload.MediaPath = ctxPayload.MediaPaths?.[0];
  ctxPayload.MediaUrl = ctxPayload.MediaUrls?.[0] ?? ctxPayload.MediaPath;
  ctxPayload.MediaType = ctxPayload.MediaTypes?.[0];
}

type DispatchTelegramMessageParams = {
  context: TelegramMessageContext;
  bot: Bot;
  cfg: OpenClawConfig;
  runtime: RuntimeEnv;
  replyToMode: ReplyToMode;
  streamMode: TelegramStreamMode;
  textLimit: number;
  telegramCfg: TelegramAccountConfig;
  opts: Pick<TelegramBotOptions, "token">;
};

export const dispatchTelegramMessage = async ({
  context,
  bot,
  cfg,
  runtime,
  replyToMode,
  streamMode,
  textLimit,
  telegramCfg,
  opts,
}: DispatchTelegramMessageParams) => {
  const {
    ctxPayload,
    msg,
    chatId,
    isGroup,
    resolvedThreadId,
    historyKey,
    historyLimit,
    groupHistories,
    route,
    skillFilter,
    sendTyping,
    sendRecordVoice,
    ackReactionPromise,
    reactionApi,
    removeAckAfterReply,
    statusReactionController,
  } = context;

  const isPrivateChat = msg.chat.type === "private";
  const draftMaxChars = Math.min(textLimit, 4096);
  const canStreamDraft =
    streamMode !== "off" &&
    isPrivateChat &&
    typeof resolvedThreadId === "number" &&
    (await resolveBotTopicsEnabled(primaryCtx));
=======
  const draftReplyToMessageId =
    replyToMode !== "off" && typeof msg.message_id === "number" ? msg.message_id : undefined;
>>>>>>> 244ed9db3 (fix(telegram): draft stream preview not threaded when replyToMode is on (#17880) (#17928))
  const draftStream = canStreamDraft
    ? createTelegramDraftStream({
        api: bot.api,
        chatId,
        maxChars: draftMaxChars,
        messageThreadId: resolvedThreadId,
=======
        minInitialChars: DRAFT_MIN_INITIAL_CHARS,
>>>>>>> 7ffc8f9f7 (fix(telegram): add initial message debounce for better push notifications (#18147))
        log: logVerbose,
        warn: logVerbose,
      })
    : undefined;
  const draftChunking =
    draftStream && streamMode === "block"
      ? resolveTelegramDraftStreamingChunking(cfg, route.accountId)
      : undefined;
  const shouldSplitPreviewMessages = streamMode === "block";
  const draftChunker = draftChunking ? new EmbeddedBlockChunker(draftChunking) : undefined;
  let lastPartialText = "";
  let draftText = "";
  let hasStreamedMessage = false;
  const updateDraftFromPartial = (text?: string) => {
    if (!draftStream || !text) {
=======
  const resolvedReasoningLevel = resolveTelegramReasoningLevel({
    cfg,
    sessionKey: ctxPayload.SessionKey,
    agentId: route.agentId,
  });
  const forceBlockStreamingForReasoning = resolvedReasoningLevel === "on";
  const streamReasoningDraft = resolvedReasoningLevel === "stream";
  const previewStreamingEnabled = streamMode !== "off";
  const canStreamAnswerDraft =
    previewStreamingEnabled && !accountBlockStreamingEnabled && !forceBlockStreamingForReasoning;
  const canStreamReasoningDraft = canStreamAnswerDraft || streamReasoningDraft;
  const draftReplyToMessageId =
    replyToMode !== "off" && typeof msg.message_id === "number" ? msg.message_id : undefined;
  const draftMinInitialChars = DRAFT_MIN_INITIAL_CHARS;
  const mediaLocalRoots = getAgentScopedMediaLocalRoots(cfg, route.agentId);
  type LaneName = "answer" | "reasoning";
  type DraftLaneState = {
    stream: ReturnType<typeof createTelegramDraftStream> | undefined;
    lastPartialText: string;
    hasStreamedMessage: boolean;
  };
  const createDraftLane = (enabled: boolean): DraftLaneState => {
    const stream = enabled
      ? createTelegramDraftStream({
          api: bot.api,
          chatId,
          maxChars: draftMaxChars,
          thread: threadSpec,
          replyToMessageId: draftReplyToMessageId,
          minInitialChars: draftMinInitialChars,
          renderText: renderDraftPreview,
          log: logVerbose,
          warn: logVerbose,
        })
      : undefined;
    return {
      stream,
      lastPartialText: "",
      hasStreamedMessage: false,
    };
  };
  const lanes: Record<LaneName, DraftLaneState> = {
    answer: createDraftLane(canStreamAnswerDraft),
    reasoning: createDraftLane(canStreamReasoningDraft),
  };
  const answerLane = lanes.answer;
  const reasoningLane = lanes.reasoning;
  let splitReasoningOnNextStream = false;
  const reasoningStepState = createTelegramReasoningStepState();
  type ArchivedPreview = { messageId: number; textSnapshot: string };
  const archivedAnswerPreviews: ArchivedPreview[] = [];
  type SplitLaneSegment = { lane: LaneName; text: string };
  type SplitLaneSegmentsResult = {
    segments: SplitLaneSegment[];
    suppressedReasoningOnly: boolean;
  };
  const splitTextIntoLaneSegments = (text?: string): SplitLaneSegmentsResult => {
    const split = splitTelegramReasoningText(text);
    const segments: SplitLaneSegment[] = [];
    const suppressReasoning = resolvedReasoningLevel === "off";
    if (split.reasoningText && !suppressReasoning) {
      segments.push({ lane: "reasoning", text: split.reasoningText });
    }
    if (split.answerText) {
      segments.push({ lane: "answer", text: split.answerText });
    }
    return {
      segments,
      suppressedReasoningOnly:
        Boolean(split.reasoningText) && suppressReasoning && !split.answerText,
    };
  };
  const resetDraftLaneState = (lane: DraftLaneState) => {
    lane.lastPartialText = "";
    lane.hasStreamedMessage = false;
  };
  const updateDraftFromPartial = (lane: DraftLaneState, text: string | undefined) => {
    const laneStream = lane.stream;
    if (!laneStream || !text) {
>>>>>>> 677384c51 (refactor: simplify Telegram preview streaming to single boolean (#22012))
      return;
    }
    if (text === lastPartialText) {
      return;
    }
    // Mark that we've received streaming content (for forceNewMessage decision).
    hasStreamedMessage = true;
    if (streamMode === "partial") {
      // Some providers briefly emit a shorter prefix snapshot (for example
      // "Sure." -> "Sure" -> "Sure."). Keep the longer preview to avoid
      // visible punctuation flicker.
      if (
        lastPartialText &&
        lastPartialText.startsWith(text) &&
        text.length < lastPartialText.length
      ) {
        return;
      }
      lastPartialText = text;
      draftStream.update(text);
      return;
    }
    let delta = text;
    if (text.startsWith(lastPartialText)) {
      delta = text.slice(lastPartialText.length);
    } else {
      // Streaming buffer reset (or non-monotonic stream). Start fresh.
      draftChunker?.reset();
      draftText = "";
    }
    lastPartialText = text;
    if (!delta) {
      return;
    }
    if (!draftChunker) {
      draftText = text;
      draftStream.update(draftText);
      return;
    }
    draftChunker.append(delta);
    draftChunker.drain({
      force: false,
      emit: (chunk) => {
        draftText += chunk;
        draftStream.update(draftText);
      },
    });
  };
  const flushDraft = async () => {
    if (!draftStream) {
      return;
    }
    if (draftChunker?.hasBuffered()) {
      draftChunker.drain({
        force: true,
        emit: (chunk) => {
          draftText += chunk;
        },
      });
      draftChunker.reset();
      if (draftText) {
        draftStream.update(draftText);
      }
    }
    await draftStream.flush();
  };

  const disableBlockStreaming =
    streamMode === "off"
      ? true // off mode must always disable block streaming
      : typeof telegramCfg.blockStreaming === "boolean"
        ? !telegramCfg.blockStreaming
        : draftStream
          ? true
          : undefined;

  const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
    cfg,
    agentId: route.agentId,
    channel: "telegram",
    accountId: route.accountId,
  });
  const tableMode = resolveMarkdownTableMode({
    cfg,
    channel: "telegram",
    accountId: route.accountId,
  });
  const chunkMode = resolveChunkMode(cfg, "telegram", route.accountId);

  // Handle uncached stickers: get a dedicated vision description before dispatch
  // This ensures we cache a raw description rather than a conversational response
  const sticker = ctxPayload.Sticker;
  if (sticker?.fileId && sticker.fileUniqueId && ctxPayload.MediaPath) {
    const agentDir = resolveAgentDir(cfg, route.agentId);
    const stickerSupportsVision = await resolveStickerVisionSupport(cfg, route.agentId);
    let description = sticker.cachedDescription ?? null;
    if (!description) {
      description = await describeStickerImage({
        imagePath: ctxPayload.MediaPath,
        cfg,
        agentDir,
        agentId: route.agentId,
      });
    }
    if (description) {
      // Format the description with sticker context
      const stickerContext = [sticker.emoji, sticker.setName ? `from "${sticker.setName}"` : null]
        .filter(Boolean)
        .join(" ");
      const formattedDesc = `[Sticker${stickerContext ? ` ${stickerContext}` : ""}] ${description}`;

      sticker.cachedDescription = description;
      if (!stickerSupportsVision) {
        // Update context to use description instead of image
        ctxPayload.Body = formattedDesc;
        ctxPayload.BodyForAgent = formattedDesc;
        // Drop only the sticker attachment; keep replied media context if present.
        pruneStickerMediaFromContext(ctxPayload, {
          stickerMediaIncluded: ctxPayload.StickerMediaIncluded,
        });
      }

      // Cache the description for future encounters
      if (sticker.fileId) {
        cacheSticker({
          fileId: sticker.fileId,
          fileUniqueId: sticker.fileUniqueId,
          emoji: sticker.emoji,
          setName: sticker.setName,
          description,
          cachedAt: new Date().toISOString(),
          receivedFrom: ctxPayload.From,
        });
        logVerbose(`telegram: cached sticker description for ${sticker.fileUniqueId}`);
      } else {
        logVerbose(`telegram: skipped sticker cache (missing fileId)`);
      }
    }
  }

  const { queuedFinal } = await dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg,
    dispatcherOptions: {
      ...prefixOptions,
      deliver: async (payload, info) => {
        if (info.kind === "final") {
          await flushDraft();
          draftStream?.stop();
        }

        const replyQuoteText =
          ctxPayload.ReplyToIsQuote && ctxPayload.ReplyToBody
            ? ctxPayload.ReplyToBody.trim() || undefined
            : undefined;
        await deliverReplies({
          replies: [payload],
          chatId: String(chatId),
          token: opts.token,
          runtime,
          bot,
          replyToMode,
          textLimit,
          messageThreadId: resolvedThreadId,
          tableMode,
          chunkMode,
          onVoiceRecording: sendRecordVoice,
          linkPreview: telegramCfg.linkPreview,
          replyQuoteText,
          notifyEmptyResponse: info.kind === "final",
        });
<<<<<<< HEAD
      },
      onError: (err, info) => {
        runtime.error?.(danger(`telegram ${info.kind} reply failed: ${String(err)}`));
      },
      onReplyStart: createTypingCallbacks({
        start: sendTyping,
        onStartError: (err) => {
          logTypingFailure({
            log: logVerbose,
            channel: "telegram",
            target: String(chatId),
            error: err,
=======
  const replyQuoteText =
    ctxPayload.ReplyToIsQuote && ctxPayload.ReplyToBody
      ? ctxPayload.ReplyToBody.trim() || undefined
      : undefined;
  const deliveryState = {
    delivered: false,
    skippedNonSilent: 0,
    failedDeliveries: 0,
  };
  let finalizedViaPreviewMessage = false;

  /**
   * Clean up the draft preview message.  The preview must be removed in every
   * case EXCEPT when it was successfully finalized as the actual response via
   * an in-place edit (`finalizedViaPreviewMessage === true`).
   */
  const clearDraftPreviewIfNeeded = async () => {
    if (finalizedViaPreviewMessage) {
      return;
    }
    try {
      await draftStream?.clear();
    } catch (err) {
      logVerbose(`telegram: draft preview cleanup failed: ${String(err)}`);
    }
  };

  const clearGroupHistory = () => {
    if (isGroup && historyKey) {
      clearHistoryEntriesIfEnabled({ historyMap: groupHistories, historyKey, limit: historyLimit });
    }
  };
  const deliveryBaseOptions = {
    chatId: String(chatId),
    token: opts.token,
    runtime,
    bot,
    mediaLocalRoots,
    replyToMode,
    textLimit,
    thread: threadSpec,
    tableMode,
    chunkMode,
    linkPreview: telegramCfg.linkPreview,
    replyQuoteText,
  };
<<<<<<< HEAD
  const applyTextToPayload = (payload: ReplyPayload, text: string): ReplyPayload => {
    if (payload.text === text) {
      return payload;
    }
    return { ...payload, text };
  };
  const sendPayload = async (payload: ReplyPayload) => {
    const result = await deliverReplies({
      ...deliveryBaseOptions,
      replies: [payload],
      onVoiceRecording: sendRecordVoice,
    });
    if (result.delivered) {
      deliveryState.markDelivered();
    }
    return result.delivered;
  };
  type LaneDeliveryResult = "preview-finalized" | "preview-updated" | "sent" | "skipped";
  const deliverLaneText = async (params: {
    laneName: LaneName;
    text: string;
    payload: ReplyPayload;
    infoKind: string;
    previewButtons?: TelegramInlineButtons;
    allowPreviewUpdateForNonFinal?: boolean;
  }): Promise<LaneDeliveryResult> => {
    const {
      laneName,
      text,
      payload,
      infoKind,
      previewButtons,
      allowPreviewUpdateForNonFinal = false,
    } = params;
    const lane = lanes[laneName];
    const hasMedia = Boolean(payload.mediaUrl) || (payload.mediaUrls?.length ?? 0) > 0;
    const canEditViaPreview =
      !hasMedia && text.length > 0 && text.length <= draftMaxChars && !payload.isError;

    if (infoKind === "final") {
      if (laneName === "answer" && archivedAnswerPreviews.length > 0) {
        const archivedPreview = archivedAnswerPreviews.shift();
        if (archivedPreview) {
          if (canEditViaPreview) {
            const finalized = await tryUpdatePreviewForLane({
              lane,
              laneName,
              text,
              previewButtons,
              stopBeforeEdit: false,
              skipRegressive: "existingOnly",
              context: "final",
              previewMessageId: archivedPreview.messageId,
              previewTextSnapshot: archivedPreview.textSnapshot,
            });
            if (finalized) {
              return "preview-finalized";
            }
          }
          try {
            await bot.api.deleteMessage(chatId, archivedPreview.messageId);
          } catch (err) {
            logVerbose(
              `telegram: archived answer preview cleanup failed (${archivedPreview.messageId}): ${String(err)}`,
            );
          }
          const delivered = await sendPayload(applyTextToPayload(payload, text));
          return delivered ? "sent" : "skipped";
        }
      }
      if (canEditViaPreview && !finalizedPreviewByLane[laneName]) {
        await flushDraftLane(lane);
        const finalized = await tryUpdatePreviewForLane({
          lane,
          laneName,
          text,
          previewButtons,
          stopBeforeEdit: true,
          skipRegressive: "existingOnly",
          context: "final",
        });
        if (finalized) {
          finalizedPreviewByLane[laneName] = true;
          return "preview-finalized";
        }
      } else if (!hasMedia && !payload.isError && text.length > draftMaxChars) {
        logVerbose(
          `telegram: preview final too long for edit (${text.length} > ${draftMaxChars}); falling back to standard send`,
        );
      }
      await lane.stream?.stop();
    },
    editPreview: async ({ messageId, text, previewButtons }) => {
      await editMessageTelegram(chatId, messageId, text, {
        api: bot.api,
        cfg,
        accountId: route.accountId,
        linkPreview: telegramCfg.linkPreview,
        buttons: previewButtons,
      });
      if (updated) {
        return "preview-updated";
      }
    }

    const delivered = await sendPayload(applyTextToPayload(payload, text));
    return delivered ? "sent" : "skipped";
  };
>>>>>>> 677384c51 (refactor: simplify Telegram preview streaming to single boolean (#22012))

  let queuedFinal = false;
  let dispatchError: unknown;
  try {
    ({ queuedFinal } = await dispatchReplyWithBufferedBlockDispatcher({
      ctx: ctxPayload,
      cfg,
      dispatcherOptions: {
        ...prefixOptions,
        typingCallbacks,
        deliver: async (payload, info) => {
          if (info.kind === "final") {
            await flushDraft();
            const hasMedia = Boolean(payload.mediaUrl) || (payload.mediaUrls?.length ?? 0) > 0;
            const previewMessageId = draftStream?.messageId();
            const finalText = payload.text;
            const currentPreviewText = streamMode === "block" ? draftText : lastPartialText;
            const previewButtons = (
              payload.channelData?.telegram as { buttons?: TelegramInlineButtons } | undefined
            )?.buttons;
            let draftStoppedForPreviewEdit = false;
            // Skip preview edit for error payloads to avoid overwriting previous content
            const canFinalizeViaPreviewEdit =
              !finalizedViaPreviewMessage &&
              !hasMedia &&
              typeof finalText === "string" &&
              finalText.length > 0 &&
              typeof previewMessageId === "number" &&
              finalText.length <= draftMaxChars &&
              !payload.isError;
            if (canFinalizeViaPreviewEdit) {
              await draftStream?.stop();
              draftStoppedForPreviewEdit = true;
              if (
                currentPreviewText &&
                currentPreviewText.startsWith(finalText) &&
                finalText.length < currentPreviewText.length
              ) {
                // Ignore regressive final edits (e.g., "Okay." -> "Ok"), which
                // can appear transiently in some provider streams.
                return;
              }
              try {
                await editMessageTelegram(chatId, previewMessageId, finalText, {
                  api: bot.api,
                  cfg,
                  accountId: route.accountId,
                  linkPreview: telegramCfg.linkPreview,
                  buttons: previewButtons,
                });
                finalizedViaPreviewMessage = true;
                deliveryState.delivered = true;
                logVerbose(
                  `telegram: finalized response via preview edit (messageId=${previewMessageId})`,
                );
                return;
              } catch (err) {
                logVerbose(
                  `telegram: preview final edit failed; falling back to standard send (${String(err)})`,
                );
              }
            }
            if (
              !hasMedia &&
              !payload.isError &&
              typeof finalText === "string" &&
              finalText.length > draftMaxChars
            ) {
              logVerbose(
                `telegram: preview final too long for edit (${finalText.length} > ${draftMaxChars}); falling back to standard send`,
              );
            }
            if (!draftStoppedForPreviewEdit) {
              await draftStream?.stop();
            }
            // Check if stop() sent a message (debounce released on isFinal)
            // If so, edit that message instead of sending a new one
            const messageIdAfterStop = draftStream?.messageId();
            if (
              !finalizedViaPreviewMessage &&
              typeof messageIdAfterStop === "number" &&
              typeof finalText === "string" &&
              finalText.length > 0 &&
              finalText.length <= draftMaxChars &&
              !hasMedia &&
              !payload.isError
            ) {
              try {
                await editMessageTelegram(chatId, messageIdAfterStop, finalText, {
                  api: bot.api,
                  cfg,
                  accountId: route.accountId,
                  linkPreview: telegramCfg.linkPreview,
                  buttons: previewButtons,
                });
                finalizedViaPreviewMessage = true;
                deliveryState.delivered = true;
                logVerbose(
                  `telegram: finalized response via post-stop preview edit (messageId=${messageIdAfterStop})`,
                );
                return;
              } catch (err) {
                logVerbose(
                  `telegram: post-stop preview edit failed; falling back to standard send (${String(err)})`,
                );
              }
            }
          }
          const result = await deliverReplies({
            ...deliveryBaseOptions,
            replies: [payload],
<<<<<<< HEAD
            chatId: String(chatId),
            token: opts.token,
            runtime,
            bot,
            replyToMode,
            textLimit,
            thread: threadSpec,
            tableMode,
            chunkMode,
            onVoiceRecording: sendRecordVoice,
            linkPreview: telegramCfg.linkPreview,
            replyQuoteText,
>>>>>>> a69e82765 (fix(telegram): stream replies in-place without duplicate final sends)
          });
          if (result.delivered) {
            deliveryState.delivered = true;
            logVerbose(
              `telegram: ${info.kind} reply delivered to chat ${chatId}${payload.isError ? " (error payload)" : ""}`,
            );
          } else {
            logVerbose(
              `telegram: ${info.kind} reply delivery returned not-delivered for chat ${chatId}`,
            );
=======
          if (segments.length > 0) {
            return;
          }
          if (split.suppressedReasoningOnly) {
            if (hasMedia) {
              const payloadWithoutSuppressedReasoning =
                typeof payload.text === "string" ? { ...payload, text: "" } : payload;
              await sendPayload(payloadWithoutSuppressedReasoning);
            }
            if (info.kind === "final") {
              await flushBufferedFinalAnswer();
            }
            return;
          }

          if (info.kind === "final") {
            await answerLane.stream?.stop();
            await reasoningLane.stream?.stop();
            reasoningStepState.resetForNextStep();
          }
          const canSendAsIs =
            hasMedia || (typeof payload.text === "string" && payload.text.length > 0);
          if (!canSendAsIs) {
            if (info.kind === "final") {
              await flushBufferedFinalAnswer();
            }
            return;
          }
          await sendPayload(payload);
          if (info.kind === "final") {
            await flushBufferedFinalAnswer();
>>>>>>> 5a475259b (fix(telegram): suppress reasoning-only leaks when reasoning is off)
          }
        },
      }).onReplyStart,
    },
    replyOptions: {
      skillFilter,
      onPartialReply: draftStream ? (payload) => updateDraftFromPartial(payload.text) : undefined,
<<<<<<< HEAD
      onReasoningStream: draftStream
        ? (payload) => {
            if (payload.text) {
              draftStream.update(payload.text);
            }
          }
        : undefined,
      disableBlockStreaming,
      onModelSelected: (ctx) => {
        prefixContext.onModelSelected(ctx);
      },
    },
  });
  draftStream?.stop();
  if (!queuedFinal) {
=======
        onSkip: (_payload, info) => {
          if (info.reason !== "silent") {
            deliveryState.markNonSilentSkip();
          }
        },
        onError: (err, info) => {
          deliveryState.failedDeliveries += 1;
          runtime.error?.(danger(`telegram ${info.kind} reply failed: ${String(err)}`));
        },
        onReplyStart: createTypingCallbacks({
          start: sendTyping,
          onStartError: (err) => {
            logTypingFailure({
              log: logVerbose,
              channel: "telegram",
              target: String(chatId),
              error: err,
            });
          },
        }).onReplyStart,
      },
      replyOptions: {
        skillFilter,
        disableBlockStreaming,
        onPartialReply: draftStream ? (payload) => updateDraftFromPartial(payload.text) : undefined,
        onAssistantMessageStart: draftStream
          ? () => {
              // Only split preview bubbles in block mode. In partial mode, keep
              // editing one preview message to avoid flooding the chat.
              logVerbose(
                `telegram: onAssistantMessageStart called, hasStreamedMessage=${hasStreamedMessage}`,
              );
              if (shouldSplitPreviewMessages && hasStreamedMessage) {
                logVerbose(`telegram: calling forceNewMessage()`);
                draftStream.forceNewMessage();
              }
              lastPartialText = "";
              draftText = "";
              draftChunker?.reset();
            }
          : undefined,
        onReasoningEnd: draftStream
          ? () => {
<<<<<<< HEAD
              // Same policy as assistant-message boundaries: split only in block mode.
              if (shouldSplitPreviewMessages && hasStreamedMessage) {
                draftStream.forceNewMessage();
              }
              lastPartialText = "";
              draftText = "";
              draftChunker?.reset();
              reasoningStepState.resetForNextStep();
              if (answerLane.hasStreamedMessage) {
                const previewMessageId = answerLane.stream?.messageId();
                // Only archive previews that still need a matching final text update.
                // Once a preview has already been finalized, archiving it here causes
                // cleanup to delete a user-visible final message on later media-only turns.
                if (typeof previewMessageId === "number" && !finalizedPreviewByLane.answer) {
                  archivedAnswerPreviews.push({
                    messageId: previewMessageId,
                    textSnapshot: answerLane.lastPartialText,
                  });
                }
                answerLane.stream?.forceNewMessage();
              }
              resetDraftLaneState(answerLane);
              // New assistant message boundary: this lane now tracks a fresh preview lifecycle.
              finalizedPreviewByLane.answer = false;
            }
          : undefined,
        onReasoningEnd: reasoningLane.stream
          ? () => {
              // Split when/if a later reasoning block begins.
              splitReasoningOnNextStream = reasoningLane.hasStreamedMessage;
>>>>>>> 677384c51 (refactor: simplify Telegram preview streaming to single boolean (#22012))
            }
          : undefined,
        onToolStart: statusReactionController
          ? async (payload) => {
              await statusReactionController.setTool(payload.name);
            }
          : undefined,
        onModelSelected,
      },
    }));
  } catch (err) {
    dispatchError = err;
  } finally {
    await draftStream?.stop();
  }
  let sentFallback = false;
<<<<<<< HEAD
  if (!deliveryState.delivered && deliveryState.skippedNonSilent > 0) {
    const result = await deliverReplies({
      replies: [{ text: EMPTY_RESPONSE_FALLBACK }],
      chatId: String(chatId),
      token: opts.token,
      runtime,
      bot,
      replyToMode,
      textLimit,
      thread: threadSpec,
      tableMode,
      chunkMode,
      linkPreview: telegramCfg.linkPreview,
      replyQuoteText,
    });
    sentFallback = result.delivered;
=======
  try {
    if (
      !dispatchError &&
      !deliveryState.delivered &&
      (deliveryState.skippedNonSilent > 0 || deliveryState.failedDeliveries > 0)
    ) {
      const result = await deliverReplies({
        replies: [{ text: EMPTY_RESPONSE_FALLBACK }],
        ...deliveryBaseOptions,
      });
      sentFallback = result.delivered;
    }
  } finally {
    await clearDraftPreviewIfNeeded();
  }
  if (dispatchError) {
    throw dispatchError;
>>>>>>> beb2b74b5 (fix(telegram): prevent silent message loss across all streamMode settings (#19041))
  }

  const hasFinalResponse = queuedFinal || sentFallback;

  if (statusReactionController && !hasFinalResponse) {
    void statusReactionController.setError().catch((err) => {
      logVerbose(`telegram: status reaction error finalize failed: ${String(err)}`);
    });
  }

  if (!hasFinalResponse) {
>>>>>>> a69e82765 (fix(telegram): stream replies in-place without duplicate final sends)
    if (isGroup && historyKey) {
      clearHistoryEntriesIfEnabled({ historyMap: groupHistories, historyKey, limit: historyLimit });
    }
    return;
  }

  if (statusReactionController) {
    void statusReactionController.setDone().catch((err) => {
      logVerbose(`telegram: status reaction finalize failed: ${String(err)}`);
    });
  } else {
    removeAckReactionAfterReply({
      removeAfterReply: removeAckAfterReply,
      ackReactionPromise,
      ackReactionValue: ackReactionPromise ? "ack" : null,
      remove: () => reactionApi?.(chatId, msg.message_id ?? 0, []) ?? Promise.resolve(),
      onError: (err) => {
        if (!msg.message_id) {
          return;
        }
        logAckFailure({
          log: logVerbose,
          channel: "telegram",
          target: `${chatId}/${msg.message_id}`,
          error: err,
        });
      },
    });
  }
  clearGroupHistory();
};
