import { resolveHumanDelayConfig } from "../../../agents/identity.js";
import { dispatchInboundMessage } from "../../../auto-reply/dispatch.js";
import { clearHistoryEntriesIfEnabled } from "../../../auto-reply/reply/history.js";
<<<<<<< HEAD
=======
import { createReplyDispatcherWithTyping } from "../../../auto-reply/reply/reply-dispatcher.js";
import type { ReplyPayload } from "../../../auto-reply/types.js";
>>>>>>> 6dcc052bb (fix: stabilize model catalog and pi discovery auth storage compatibility)
import { removeAckReactionAfterReply } from "../../../channels/ack-reactions.js";
import { logAckFailure, logTypingFailure } from "../../../channels/logging.js";
import { createReplyPrefixContext } from "../../../channels/reply-prefix.js";
import { createTypingCallbacks } from "../../../channels/typing.js";
import { createReplyDispatcherWithTyping } from "../../../auto-reply/reply/reply-dispatcher.js";
import { resolveStorePath, updateLastRoute } from "../../../config/sessions.js";
import { danger, logVerbose, shouldLogVerbose } from "../../../globals.js";
import { removeSlackReaction } from "../../actions.js";
<<<<<<< HEAD
import { resolveSlackThreadTargets } from "../../threading.js";
=======
import { createSlackDraftStream } from "../../draft-stream.js";
import {
  applyAppendOnlyStreamUpdate,
  buildStatusFinalPreviewText,
  resolveSlackStreamMode,
} from "../../stream-mode.js";
import type { SlackStreamSession } from "../../streaming.js";
import { appendSlackStream, startSlackStream, stopSlackStream } from "../../streaming.js";
import { resolveSlackThreadTargets } from "../../threading.js";
import { createSlackReplyDeliveryPlan, deliverReplies, resolveSlackThreadTs } from "../replies.js";
import type { PreparedSlackMessage } from "./types.js";
>>>>>>> 6dcc052bb (fix: stabilize model catalog and pi discovery auth storage compatibility)

import { createSlackReplyDeliveryPlan, deliverReplies } from "../replies.js";

import type { PreparedSlackMessage } from "./types.js";

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
      if (!didSetStatus) return;
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

<<<<<<< HEAD
  const prefixContext = createReplyPrefixContext({ cfg, agentId: route.agentId });
=======
  const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
    cfg,
    agentId: route.agentId,
    channel: "slack",
    accountId: route.accountId,
  });

  // -----------------------------------------------------------------------
  // Slack native text streaming state
  // -----------------------------------------------------------------------
  const streamingEnabled = account.config.streaming === true;

  // Peek at the thread target without consuming it (for streaming check only).
  const streamThreadHint = incomingThreadTs ?? statusThreadTs;

  const useStreaming = shouldUseStreaming({
    streamingEnabled,
    threadTs: streamThreadHint,
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
<<<<<<< HEAD

    try {
      if (!streamSession) {
        // Determine the thread_ts for the stream (required by Slack API)
        const streamThreadTs = effectiveThreadTs ?? incomingThreadTs ?? statusThreadTs;

=======
    let plannedThreadTs: string | undefined;
    try {
      if (!streamSession) {
        const streamThreadTs = replyPlan.nextThreadTs();
        plannedThreadTs = streamThreadTs;
>>>>>>> 6dcc052bb (fix: stabilize model catalog and pi discovery auth storage compatibility)
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
<<<<<<< HEAD

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
=======
      await deliverNormally(payload, streamSession?.threadTs ?? plannedThreadTs);
>>>>>>> 6dcc052bb (fix: stabilize model catalog and pi discovery auth storage compatibility)
    }
  };
>>>>>>> 878a13d21 (fix: don't consume replyPlan reference eagerly for streaming check)

  const { dispatcher, replyOptions, markDispatchIdle } = createReplyDispatcherWithTyping({
    responsePrefix: prefixContext.responsePrefix,
    responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
    humanDelay: resolveHumanDelayConfig(cfg, route.agentId),
    deliver: async (payload) => {
      const replyThreadTs = replyPlan.nextThreadTs();
      await deliverReplies({
        replies: [payload],
        target: prepared.replyTarget,
        token: ctx.botToken,
        accountId: account.accountId,
        runtime,
        textLimit: ctx.textLimit,
        replyThreadTs,
      });
      replyPlan.markSent();
    },
    onError: (err, info) => {
      runtime.error?.(danger(`slack ${info.kind} reply failed: ${String(err)}`));
      typingCallbacks.onIdle?.();
    },
    onReplyStart: typingCallbacks.onReplyStart,
    onIdle: typingCallbacks.onIdle,
    onCleanup: typingCallbacks.onCleanup,
  });

  const { queuedFinal, counts } = await dispatchInboundMessage({
    ctx: prepared.ctxPayload,
    cfg,
    dispatcher,
    replyOptions: {
      ...replyOptions,
      skillFilter: prepared.channelConfig?.skills,
      hasRepliedRef,
      disableBlockStreaming:
        typeof account.config.blockStreaming === "boolean"
          ? !account.config.blockStreaming
          : undefined,
      onModelSelected: (ctx) => {
        prefixContext.onModelSelected(ctx);
      },
    },
  });
  markDispatchIdle();

  const anyReplyDelivered = queuedFinal || (counts.block ?? 0) > 0 || (counts.final ?? 0) > 0;

  if (!anyReplyDelivered) {
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
