<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { ReplyPayload } from "../../../auto-reply/types.js";
import type { SlackStreamSession } from "../../streaming.js";
import type { PreparedSlackMessage } from "./types.js";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { PreparedSlackMessage } from "./types.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { ReplyPayload } from "../../../auto-reply/types.js";
import type { SlackStreamSession } from "../../streaming.js";
import type { PreparedSlackMessage } from "./types.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { resolveHumanDelayConfig } from "../../../agents/identity.js";
import { dispatchInboundMessage } from "../../../auto-reply/dispatch.js";
import { clearHistoryEntriesIfEnabled } from "../../../auto-reply/reply/history.js";
import { createReplyDispatcherWithTyping } from "../../../auto-reply/reply/reply-dispatcher.js";
import type { ReplyPayload } from "../../../auto-reply/types.js";
import { removeAckReactionAfterReply } from "../../../channels/ack-reactions.js";
import { logAckFailure, logTypingFailure } from "../../../channels/logging.js";
import { createReplyPrefixOptions } from "../../../channels/reply-prefix.js";
import { createTypingCallbacks } from "../../../channels/typing.js";
import { resolveStorePath, updateLastRoute } from "../../../config/sessions.js";
import { danger, logVerbose, shouldLogVerbose } from "../../../globals.js";
import { removeSlackReaction } from "../../actions.js";
<<<<<<< HEAD
import { appendSlackStream, startSlackStream, stopSlackStream } from "../../streaming.js";
=======
import { createSlackDraftStream } from "../../draft-stream.js";
<<<<<<< HEAD
>>>>>>> bec974aba (feat(slack): stream partial replies via draft message updates)
=======
import {
  applyAppendOnlyStreamUpdate,
  buildStatusFinalPreviewText,
  resolveSlackStreamingConfig,
} from "../../stream-mode.js";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 89ce1460e (feat(slack): add configurable stream modes)
import { resolveSlackThreadTargets } from "../../threading.js";
import { createSlackReplyDeliveryPlan, deliverReplies } from "../replies.js";
import type { PreparedSlackMessage } from "./types.js";
=======
import { appendSlackStream, startSlackStream, stopSlackStream } from "../../streaming.js";
import { resolveSlackThreadTargets } from "../../threading.js";
import { createSlackReplyDeliveryPlan, deliverReplies, resolveSlackThreadTs } from "../replies.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { SlackStreamSession } from "../../streaming.js";
import { appendSlackStream, startSlackStream, stopSlackStream } from "../../streaming.js";
import { resolveSlackThreadTargets } from "../../threading.js";
import { createSlackReplyDeliveryPlan, deliverReplies, resolveSlackThreadTs } from "../replies.js";
import type { PreparedSlackMessage } from "./types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

/**
 * Check whether a reply payload contains media (images, files, etc.)
 * that cannot be delivered through the streaming API.
 */
function hasMedia(payload: ReplyPayload): boolean {
  return Boolean(payload.mediaUrl) || (payload.mediaUrls?.length ?? 0) > 0;
}

<<<<<<< HEAD
/**
 * Determine if Slack native text streaming should be used for this message.
 *
 * Streaming requires:
 * 1. The `streaming` config option enabled on the account
 * 2. A thread timestamp (streaming only works within threads)
 */
=======
export function isSlackStreamingEnabled(params: {
  mode: "off" | "partial" | "block" | "progress";
  nativeStreaming: boolean;
}): boolean {
  if (params.mode !== "partial") {
    return false;
  }
  return params.nativeStreaming;
}

export function resolveSlackStreamingThreadHint(params: {
  replyToMode: "off" | "first" | "all";
  incomingThreadTs: string | undefined;
  messageTs: string | undefined;
}): string | undefined {
  return resolveSlackThreadTs({
    replyToMode: params.replyToMode,
    incomingThreadTs: params.incomingThreadTs,
    messageTs: params.messageTs,
    hasReplied: false,
  });
}

>>>>>>> 2c14b0cf4 (refactor(config): unify streaming config across channels)
function shouldUseStreaming(params: {
  streamingEnabled: boolean;
  threadTs: string | undefined;
}): boolean {
  if (!params.streamingEnabled) {
    return false;
  }
  if (!params.threadTs) {
    logVerbose("slack-stream: streaming disabled — no thread_ts available");
    return false;
  }
  return true;
}

export async function dispatchPreparedSlackMessage(prepared: PreparedSlackMessage) {
  const { ctx, account, message, route } = prepared;
  const cfg = ctx.cfg;
  const runtime = ctx.runtime;

  if (prepared.isDirectMessage) {
    const sessionCfg = cfg.session;
    const storePath = resolveStorePath(sessionCfg?.store, {
      agentId: route.agentId,
    });
    await updateLastRoute({
      storePath,
      sessionKey: route.mainSessionKey,
      deliveryContext: {
        channel: "slack",
        to: `user:${message.user}`,
        accountId: route.accountId,
        threadId: prepared.ctxPayload.MessageThreadId,
      },
      ctx: prepared.ctxPayload,
    });
  }

  const { statusThreadTs } = resolveSlackThreadTargets({
    message,
    replyToMode: ctx.replyToMode,
  });

  const messageTs = message.ts ?? message.event_ts;
  const incomingThreadTs = message.thread_ts;
  let didSetStatus = false;

  // Shared mutable ref for "replyToMode=first". Both tool + auto-reply flows
  // mark this to ensure only the first reply is threaded.
  const hasRepliedRef = { value: false };
  const replyPlan = createSlackReplyDeliveryPlan({
    replyToMode: ctx.replyToMode,
    incomingThreadTs,
    messageTs,
    hasRepliedRef,
  });

  const typingTarget = statusThreadTs ? `${message.channel}/${statusThreadTs}` : message.channel;
  const typingCallbacks = createTypingCallbacks({
    start: async () => {
      didSetStatus = true;
      await ctx.setSlackThreadStatus({
        channelId: message.channel,
        threadTs: statusThreadTs,
        status: "is typing...",
      });
    },
    stop: async () => {
      if (!didSetStatus) {
        return;
      }
      didSetStatus = false;
      await ctx.setSlackThreadStatus({
        channelId: message.channel,
        threadTs: statusThreadTs,
        status: "",
      });
    },
    onStartError: (err) => {
      logTypingFailure({
        log: (message) => runtime.error?.(danger(message)),
        channel: "slack",
        action: "start",
        target: typingTarget,
        error: err,
      });
    },
    onStopError: (err) => {
      logTypingFailure({
        log: (message) => runtime.error?.(danger(message)),
        channel: "slack",
        action: "stop",
        target: typingTarget,
        error: err,
      });
    },
  });

  const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
    cfg,
    agentId: route.agentId,
    channel: "slack",
    accountId: route.accountId,
  });

<<<<<<< HEAD
<<<<<<< HEAD
  // -----------------------------------------------------------------------
  // Slack native text streaming state
  // -----------------------------------------------------------------------
  const streamingEnabled = account.config.streaming === true;
  const replyThreadTs = replyPlan.nextThreadTs();

=======
  const slackStreaming = resolveSlackStreamingConfig({
    streaming: account.config.streaming,
    streamMode: account.config.streamMode,
    nativeStreaming: account.config.nativeStreaming,
  });
  const previewStreamingEnabled = slackStreaming.mode !== "off";
  const streamingEnabled = isSlackStreamingEnabled({
    mode: slackStreaming.mode,
    nativeStreaming: slackStreaming.nativeStreaming,
  });
  const streamThreadHint = resolveSlackStreamingThreadHint({
    replyToMode: ctx.replyToMode,
    incomingThreadTs,
    messageTs,
  });
>>>>>>> 2c14b0cf4 (refactor(config): unify streaming config across channels)
  const useStreaming = shouldUseStreaming({
    streamingEnabled,
    threadTs: replyThreadTs ?? incomingThreadTs ?? statusThreadTs,
  });

  let streamSession: SlackStreamSession | null = null;
  let streamFailed = false;

  /**
   * Deliver a payload via Slack native text streaming when possible.
   * Falls back to normal delivery for media payloads, errors, or if the
   * streaming API call itself fails.
   */
  const deliverWithStreaming = async (payload: ReplyPayload): Promise<void> => {
    const effectiveThreadTs = replyPlan.nextThreadTs();

    // Fall back to normal delivery for media, errors, or if streaming already failed
    if (streamFailed || hasMedia(payload) || !payload.text?.trim()) {
<<<<<<< HEAD
=======
=======
      await deliverNormally(payload, streamSession?.threadTs);
      return;
    }

    const text = payload.text.trim();
    let plannedThreadTs: string | undefined;
    try {
      if (!streamSession) {
        const streamThreadTs = replyPlan.nextThreadTs();
        plannedThreadTs = streamThreadTs;
        if (!streamThreadTs) {
          logVerbose(
            "slack-stream: no reply thread target for stream start, falling back to normal delivery",
          );
          streamFailed = true;
          await deliverNormally(payload);
          return;
        }

        streamSession = await startSlackStream({
          client: ctx.app.client,
          channel: message.channel,
          threadTs: streamThreadTs,
          text,
          teamId: ctx.teamId,
          userId: message.user,
        });
        replyPlan.markSent();
        return;
      }

      await appendSlackStream({
        session: streamSession,
        text: "\n" + text,
      });
    } catch (err) {
      runtime.error?.(
        danger(`slack-stream: streaming API call failed: ${String(err)}, falling back`),
      );
      streamFailed = true;
      await deliverNormally(payload, streamSession?.threadTs ?? plannedThreadTs);
    }
  };

>>>>>>> bbcb3ac6e (fix(slack): pass recipient_team_id to streaming API calls (#20988))
  const { dispatcher, replyOptions, markDispatchIdle } = createReplyDispatcherWithTyping({
    ...prefixOptions,
    humanDelay: resolveHumanDelayConfig(cfg, route.agentId),
    deliver: async (payload) => {
      const mediaCount = payload.mediaUrls?.length ?? (payload.mediaUrl ? 1 : 0);
      const draftMessageId = draftStream?.messageId();
      const draftChannelId = draftStream?.channelId();
      const finalText = payload.text;
      const canFinalizeViaPreviewEdit =
        previewStreamingEnabled &&
        streamMode !== "status_final" &&
        mediaCount === 0 &&
        !payload.isError &&
        typeof finalText === "string" &&
        finalText.trim().length > 0 &&
        typeof draftMessageId === "string" &&
        typeof draftChannelId === "string";

      if (canFinalizeViaPreviewEdit) {
        draftStream?.stop();
        try {
          await ctx.app.client.chat.update({
            token: ctx.botToken,
            channel: draftChannelId,
            ts: draftMessageId,
            text: finalText.trim(),
          });
          return;
        } catch (err) {
          logVerbose(
            `slack: preview final edit failed; falling back to standard send (${String(err)})`,
          );
        }
      } else if (previewStreamingEnabled && streamMode === "status_final" && hasStreamedMessage) {
        try {
          const statusChannelId = draftStream?.channelId();
          const statusMessageId = draftStream?.messageId();
          if (statusChannelId && statusMessageId) {
            await ctx.app.client.chat.update({
              token: ctx.botToken,
              channel: statusChannelId,
              ts: statusMessageId,
              text: "Status: complete. Final answer posted below.",
            });
          }
        } catch (err) {
          logVerbose(`slack: status_final completion update failed (${String(err)})`);
        }
      } else if (mediaCount > 0) {
        await draftStream?.clear();
        hasStreamedMessage = false;
      }

<<<<<<< HEAD
      const replyThreadTs = replyPlan.nextThreadTs();
>>>>>>> bec974aba (feat(slack): stream partial replies via draft message updates)
      await deliverReplies({
        replies: [payload],
        target: prepared.replyTarget,
        token: ctx.botToken,
        accountId: account.accountId,
        runtime,
        textLimit: ctx.textLimit,
        replyThreadTs: effectiveThreadTs,
      });
      replyPlan.markSent();
      return;
    }

    const text = payload.text.trim();

    try {
      if (!streamSession) {
        // Determine the thread_ts for the stream (required by Slack API)
        const streamThreadTs = effectiveThreadTs ?? incomingThreadTs ?? statusThreadTs;

        if (!streamThreadTs) {
          // No thread context — can't stream, fall back
          logVerbose(
            "slack-stream: no thread_ts for stream start, falling back to normal delivery",
          );
          streamFailed = true;
          await deliverReplies({
            replies: [payload],
            target: prepared.replyTarget,
            token: ctx.botToken,
            accountId: account.accountId,
            runtime,
            textLimit: ctx.textLimit,
            replyThreadTs: effectiveThreadTs,
          });
          replyPlan.markSent();
          return;
        }

        // Start a new stream
        streamSession = await startSlackStream({
          client: ctx.app.client,
          channel: message.channel,
          threadTs: streamThreadTs,
          text,
        });
        replyPlan.markSent();
      } else {
        // Append to existing stream
        await appendSlackStream({
          session: streamSession,
          text: "\n" + text,
        });
      }
    } catch (err) {
      runtime.error?.(
        danger(`slack-stream: streaming API call failed: ${String(err)}, falling back`),
      );
      streamFailed = true;

      // Fall back to normal delivery for this payload
      await deliverReplies({
        replies: [payload],
        target: prepared.replyTarget,
        token: ctx.botToken,
        accountId: account.accountId,
        runtime,
        textLimit: ctx.textLimit,
        replyThreadTs: effectiveThreadTs,
      });
      replyPlan.markSent();
    }
  };

  const { dispatcher, replyOptions, markDispatchIdle } = createReplyDispatcherWithTyping({
    ...prefixOptions,
    humanDelay: resolveHumanDelayConfig(cfg, route.agentId),
    deliver: async (payload) => {
      if (useStreaming) {
        await deliverWithStreaming(payload);
      } else {
        const effectiveThreadTs = replyPlan.nextThreadTs();
        await deliverReplies({
          replies: [payload],
          target: prepared.replyTarget,
          token: ctx.botToken,
          accountId: account.accountId,
          runtime,
          textLimit: ctx.textLimit,
          replyThreadTs: effectiveThreadTs,
        });
        replyPlan.markSent();
      }
=======
      await deliverNormally(payload);
>>>>>>> d116bcfb1 (refactor(runtime): consolidate followup, gateway, and provider dedupe paths)
    },
    onError: (err, info) => {
      runtime.error?.(danger(`slack ${info.kind} reply failed: ${String(err)}`));
      typingCallbacks.onIdle?.();
    },
    onReplyStart: typingCallbacks.onReplyStart,
    onIdle: typingCallbacks.onIdle,
  });

  const draftStream = createSlackDraftStream({
    target: prepared.replyTarget,
    token: ctx.botToken,
    accountId: account.accountId,
    maxChars: Math.min(ctx.textLimit, 4000),
    resolveThreadTs: () => replyPlan.nextThreadTs(),
    onMessageSent: () => replyPlan.markSent(),
    log: logVerbose,
    warn: logVerbose,
  });
  let hasStreamedMessage = false;
  const streamMode = slackStreaming.draftMode;
  let appendRenderedText = "";
  let appendSourceText = "";
  let statusUpdateCount = 0;
  const updateDraftFromPartial = (text?: string) => {
    const trimmed = text?.trimEnd();
    if (!trimmed) {
      return;
    }

    if (streamMode === "append") {
      const next = applyAppendOnlyStreamUpdate({
        incoming: trimmed,
        rendered: appendRenderedText,
        source: appendSourceText,
      });
      appendRenderedText = next.rendered;
      appendSourceText = next.source;
      if (!next.changed) {
        return;
      }
      draftStream.update(next.rendered);
      hasStreamedMessage = true;
      return;
    }

    if (streamMode === "status_final") {
      statusUpdateCount += 1;
      if (statusUpdateCount > 1 && statusUpdateCount % 4 !== 0) {
        return;
      }
      draftStream.update(buildStatusFinalPreviewText(statusUpdateCount));
      hasStreamedMessage = true;
      return;
    }

    draftStream.update(trimmed);
    hasStreamedMessage = true;
  };
  const onDraftBoundary =
    useStreaming || !previewStreamingEnabled
      ? undefined
      : async () => {
          if (hasStreamedMessage) {
            draftStream.forceNewMessage();
            hasStreamedMessage = false;
            appendRenderedText = "";
            appendSourceText = "";
            statusUpdateCount = 0;
          }
        };

  const { queuedFinal, counts } = await dispatchInboundMessage({
    ctx: prepared.ctxPayload,
    cfg,
    dispatcher,
    replyOptions: {
      ...replyOptions,
      skillFilter: prepared.channelConfig?.skills,
      hasRepliedRef,
<<<<<<< HEAD
      disableBlockStreaming:
        // When native streaming is active, keep block streaming enabled so we
        // get incremental block callbacks that we route through the stream.
        useStreaming
          ? false
          : typeof account.config.blockStreaming === "boolean"
            ? !account.config.blockStreaming
            : undefined,
=======
      disableBlockStreaming: useStreaming
        ? true
        : typeof account.config.blockStreaming === "boolean"
          ? !account.config.blockStreaming
          : undefined,
>>>>>>> bbcb3ac6e (fix(slack): pass recipient_team_id to streaming API calls (#20988))
      onModelSelected,
<<<<<<< HEAD
      onPartialReply: async (payload) => {
        updateDraftFromPartial(payload.text);
      },
      onAssistantMessageStart: async () => {
        if (hasStreamedMessage) {
          draftStream.forceNewMessage();
          hasStreamedMessage = false;
          appendRenderedText = "";
          appendSourceText = "";
          statusUpdateCount = 0;
        }
      },
      onReasoningEnd: async () => {
        if (hasStreamedMessage) {
          draftStream.forceNewMessage();
          hasStreamedMessage = false;
          appendRenderedText = "";
          appendSourceText = "";
          statusUpdateCount = 0;
        }
      },
=======
      onPartialReply: useStreaming
        ? undefined
        : !previewStreamingEnabled
          ? undefined
          : async (payload) => {
              updateDraftFromPartial(payload.text);
            },
<<<<<<< HEAD
      onAssistantMessageStart: useStreaming
        ? undefined
        : !previewStreamingEnabled
          ? undefined
          : async () => {
              if (hasStreamedMessage) {
                draftStream.forceNewMessage();
                hasStreamedMessage = false;
                appendRenderedText = "";
                appendSourceText = "";
                statusUpdateCount = 0;
              }
            },
      onReasoningEnd: useStreaming
        ? undefined
        : !previewStreamingEnabled
          ? undefined
          : async () => {
              if (hasStreamedMessage) {
                draftStream.forceNewMessage();
                hasStreamedMessage = false;
                appendRenderedText = "";
                appendSourceText = "";
                statusUpdateCount = 0;
              }
            },
>>>>>>> 2c14b0cf4 (refactor(config): unify streaming config across channels)
=======
      onAssistantMessageStart: onDraftBoundary,
      onReasoningEnd: onDraftBoundary,
>>>>>>> d116bcfb1 (refactor(runtime): consolidate followup, gateway, and provider dedupe paths)
    },
  });
  await draftStream.flush();
  draftStream.stop();
  markDispatchIdle();

  // -----------------------------------------------------------------------
  // Finalize the stream if one was started
  // -----------------------------------------------------------------------
  if (streamSession && !streamSession.stopped) {
    try {
      await stopSlackStream({ session: streamSession });
    } catch (err) {
      runtime.error?.(danger(`slack-stream: failed to stop stream: ${String(err)}`));
    }
  }

  const anyReplyDelivered = queuedFinal || (counts.block ?? 0) > 0 || (counts.final ?? 0) > 0;

  if (!anyReplyDelivered) {
    await draftStream.clear();
    if (prepared.isRoomish) {
      clearHistoryEntriesIfEnabled({
        historyMap: ctx.channelHistories,
        historyKey: prepared.historyKey,
        limit: ctx.historyLimit,
      });
    }
    return;
  }

  if (shouldLogVerbose()) {
    const finalCount = counts.final;
    logVerbose(
      `slack: delivered ${finalCount} reply${finalCount === 1 ? "" : "ies"} to ${prepared.replyTarget}`,
    );
  }

  removeAckReactionAfterReply({
    removeAfterReply: ctx.removeAckAfterReply,
    ackReactionPromise: prepared.ackReactionPromise,
    ackReactionValue: prepared.ackReactionValue,
    remove: () =>
      removeSlackReaction(
        message.channel,
        prepared.ackReactionMessageTs ?? "",
        prepared.ackReactionValue,
        {
          token: ctx.botToken,
          client: ctx.app.client,
        },
      ),
    onError: (err) => {
      logAckFailure({
        log: logVerbose,
        channel: "slack",
        target: `${message.channel}/${message.ts}`,
        error: err,
      });
    },
  });

  if (prepared.isRoomish) {
    clearHistoryEntriesIfEnabled({
      historyMap: ctx.channelHistories,
      historyKey: prepared.historyKey,
      limit: ctx.historyLimit,
    });
  }
}
