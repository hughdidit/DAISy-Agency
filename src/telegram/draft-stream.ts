import type { Bot } from "grammy";
<<<<<<< HEAD
=======
import { createDraftStreamLoop } from "../channels/draft-stream-loop.js";
import { buildTelegramThreadParams, type TelegramThreadSpec } from "./bot/helpers.js";
>>>>>>> 345115917 (refactor(channels): share draft stream loop across slack and telegram)

const TELEGRAM_STREAM_MAX_CHARS = 4096;
const DEFAULT_THROTTLE_MS = 1000;

export type TelegramDraftStream = {
  update: (text: string) => void;
  flush: () => Promise<void>;
  messageId: () => number | undefined;
  clear: () => Promise<void>;
  stop: () => Promise<void>;
  /** Reset internal state so the next update creates a new message instead of editing. */
  forceNewMessage: () => void;
};

export function createTelegramDraftStream(params: {
  api: Bot["api"];
  chatId: number;
  maxChars?: number;
<<<<<<< HEAD
  messageThreadId?: number;
=======
  thread?: TelegramThreadSpec | null;
  replyToMessageId?: number;
>>>>>>> 244ed9db3 (fix(telegram): draft stream preview not threaded when replyToMode is on (#17880) (#17928))
  throttleMs?: number;
  /** Minimum chars before sending first message (debounce for push notifications) */
  minInitialChars?: number;
  log?: (message: string) => void;
  warn?: (message: string) => void;
}): TelegramDraftStream {
  const maxChars = Math.min(
    params.maxChars ?? TELEGRAM_STREAM_MAX_CHARS,
    TELEGRAM_STREAM_MAX_CHARS,
  );
  const throttleMs = Math.max(250, params.throttleMs ?? DEFAULT_THROTTLE_MS);
  const minInitialChars = params.minInitialChars;
  const chatId = params.chatId;
<<<<<<< HEAD
  const threadParams =
    typeof params.messageThreadId === "number"
      ? { message_thread_id: Math.trunc(params.messageThreadId) }
      : undefined;
=======
  const threadParams = buildTelegramThreadParams(params.thread);
  const replyParams =
    params.replyToMessageId != null
      ? { ...threadParams, reply_to_message_id: params.replyToMessageId }
      : threadParams;
>>>>>>> 244ed9db3 (fix(telegram): draft stream preview not threaded when replyToMode is on (#17880) (#17928))

  let streamMessageId: number | undefined;
  let lastSentText = "";
  let stopped = false;
  let isFinal = false;

  const sendOrEditStreamMessage = async (text: string): Promise<boolean> => {
    // Allow final flush even if stopped (e.g., after clear()).
    if (stopped && !isFinal) {
      return false;
    }
    const trimmed = text.trimEnd();
    if (!trimmed) {
      return false;
    }
    if (trimmed.length > maxChars) {
      // Telegram text messages/edits cap at 4096 chars.
      // Stop streaming once we exceed the cap to avoid repeated API failures.
      stopped = true;
      params.warn?.(
        `telegram stream preview stopped (text length ${trimmed.length} > ${maxChars})`,
      );
      return false;
    }
    if (trimmed === lastSentText) {
      return true;
    }

    // Debounce first preview send for better push notification quality.
    if (typeof streamMessageId !== "number" && minInitialChars != null && !isFinal) {
      if (trimmed.length < minInitialChars) {
        return false;
      }
    }

    lastSentText = trimmed;
    try {
      if (typeof streamMessageId === "number") {
        await params.api.editMessageText(chatId, streamMessageId, trimmed);
        return true;
      }
      const sent = await params.api.sendMessage(chatId, trimmed, replyParams);
      const sentMessageId = sent?.message_id;
      if (typeof sentMessageId !== "number" || !Number.isFinite(sentMessageId)) {
        stopped = true;
        params.warn?.("telegram stream preview stopped (missing message id from sendMessage)");
        return false;
      }
      streamMessageId = Math.trunc(sentMessageId);
      return true;
    } catch (err) {
      stopped = true;
      params.warn?.(
        `telegram stream preview failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  };
<<<<<<< HEAD
<<<<<<< HEAD

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
<<<<<<< HEAD
    if (inFlight) {
      schedule();
      return;
    }
    const text = pendingText;
    pendingText = "";
    if (!text.trim()) {
      if (pendingText) {
        schedule();
=======
    while (!stopped) {
      if (inFlightPromise) {
        await inFlightPromise;
        continue;
      }
      const text = pendingText;
      const trimmed = text.trim();
      if (!trimmed) {
        pendingText = "";
        return;
      }
      pendingText = "";
      const current = sendOrEditStreamMessage(text).finally(() => {
        if (inFlightPromise === current) {
          inFlightPromise = undefined;
        }
      });
      inFlightPromise = current;
      await current;
      if (!pendingText) {
        return;
>>>>>>> a69e82765 (fix(telegram): stream replies in-place without duplicate final sends)
      }
    }
  };

  const clear = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
<<<<<<< HEAD
    inFlight = true;
    try {
      await sendDraft(text);
    } finally {
      inFlight = false;
=======
    pendingText = "";
    stopped = true;
    if (inFlightPromise) {
      await inFlightPromise;
>>>>>>> a69e82765 (fix(telegram): stream replies in-place without duplicate final sends)
    }
=======
=======

>>>>>>> 7ffc8f9f7 (fix(telegram): add initial message debounce for better push notifications (#18147))
  const loop = createDraftStreamLoop({
    throttleMs,
    isStopped: () => stopped,
    sendOrEditStreamMessage,
  });

  const update = (text: string) => {
    if (stopped || isFinal) {
      return;
    }
    loop.update(text);
  };

  const stop = async (): Promise<void> => {
    isFinal = true;
    await loop.flush();
  };

  const clear = async () => {
    stopped = true;
    loop.stop();
    await loop.waitForInFlight();
>>>>>>> 345115917 (refactor(channels): share draft stream loop across slack and telegram)
    const messageId = streamMessageId;
    streamMessageId = undefined;
    if (typeof messageId !== "number") {
      return;
    }
    try {
      await params.api.deleteMessage(chatId, messageId);
      params.log?.(`telegram stream preview deleted (chat=${chatId}, message=${messageId})`);
    } catch (err) {
      params.warn?.(
        `telegram stream preview cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const forceNewMessage = () => {
    streamMessageId = undefined;
    lastSentText = "";
    loop.resetPending();
    loop.resetThrottleWindow();
  };

  params.log?.(`telegram stream preview ready (maxChars=${maxChars}, throttleMs=${throttleMs})`);

  return {
    update,
    flush: loop.flush,
    messageId: () => streamMessageId,
    clear,
    stop,
    forceNewMessage,
  };
}
