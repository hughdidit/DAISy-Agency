import type { Bot } from "grammy";

const TELEGRAM_STREAM_MAX_CHARS = 4096;
const DEFAULT_THROTTLE_MS = 1000;

export type TelegramDraftStream = {
  update: (text: string) => void;
  flush: () => Promise<void>;
  messageId: () => number | undefined;
  clear: () => Promise<void>;
  stop: () => void;
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
  log?: (message: string) => void;
  warn?: (message: string) => void;
}): TelegramDraftStream {
  const maxChars = Math.min(
    params.maxChars ?? TELEGRAM_STREAM_MAX_CHARS,
    TELEGRAM_STREAM_MAX_CHARS,
  );
  const throttleMs = Math.max(250, params.throttleMs ?? DEFAULT_THROTTLE_MS);
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
  let lastSentAt = 0;
  let pendingText = "";
  let inFlightPromise: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const sendOrEditStreamMessage = async (text: string) => {
    if (stopped) {
      return;
    }
    const trimmed = text.trimEnd();
    if (!trimmed) {
      return;
    }
    if (trimmed.length > maxChars) {
      // Telegram text messages/edits cap at 4096 chars.
      // Stop streaming once we exceed the cap to avoid repeated API failures.
      stopped = true;
      params.warn?.(
        `telegram stream preview stopped (text length ${trimmed.length} > ${maxChars})`,
      );
      return;
    }
    if (trimmed === lastSentText) {
      return;
    }
    lastSentText = trimmed;
    lastSentAt = Date.now();
    try {
      if (typeof streamMessageId === "number") {
        await params.api.editMessageText(chatId, streamMessageId, trimmed);
        return;
      }
      const sent = await params.api.sendMessage(chatId, trimmed, replyParams);
      const sentMessageId = sent?.message_id;
      if (typeof sentMessageId !== "number" || !Number.isFinite(sentMessageId)) {
        stopped = true;
        params.warn?.("telegram stream preview stopped (missing message id from sendMessage)");
        return;
      }
      streamMessageId = Math.trunc(sentMessageId);
    } catch (err) {
      stopped = true;
      params.warn?.(
        `telegram stream preview failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

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
    const messageId = streamMessageId;
    streamMessageId = undefined;
    if (typeof messageId !== "number") {
      return;
    }
    try {
      await params.api.deleteMessage(chatId, messageId);
    } catch (err) {
      params.warn?.(
        `telegram stream preview cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const schedule = () => {
    if (timer) {
      return;
    }
    const delay = Math.max(0, throttleMs - (Date.now() - lastSentAt));
    timer = setTimeout(() => {
      void flush();
    }, delay);
  };

  const update = (text: string) => {
    if (stopped) {
      return;
    }
    pendingText = text;
    if (inFlightPromise) {
      schedule();
      return;
    }
    if (!timer && Date.now() - lastSentAt >= throttleMs) {
      void flush();
      return;
    }
    schedule();
  };

  const stop = () => {
    stopped = true;
    pendingText = "";
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const forceNewMessage = () => {
    streamMessageId = undefined;
    lastSentText = "";
    pendingText = "";
  };

  params.log?.(`telegram stream preview ready (maxChars=${maxChars}, throttleMs=${throttleMs})`);

  return {
    update,
    flush,
    messageId: () => streamMessageId,
    clear,
    stop,
    forceNewMessage,
  };
}
