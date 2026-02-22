import type { Bot } from "grammy";
import { buildTelegramThreadParams, type TelegramThreadSpec } from "./bot/helpers.js";

const TELEGRAM_DRAFT_MAX_CHARS = 4096;
const DEFAULT_THROTTLE_MS = 300;

export type TelegramDraftStream = {
  update: (text: string) => void;
  flush: () => Promise<void>;
  stop: () => void;
};

type TelegramDraftPreview = {
  text: string;
  parseMode?: "HTML";
};

type SupersededTelegramPreview = {
  messageId: number;
  textSnapshot: string;
  parseMode?: "HTML";
};

export function createTelegramDraftStream(params: {
  api: Bot["api"];
  chatId: number;
  draftId: number;
  maxChars?: number;
  thread?: TelegramThreadSpec | null;
  throttleMs?: number;
<<<<<<< HEAD
=======
  /** Minimum chars before sending first message (debounce for push notifications) */
  minInitialChars?: number;
  /** Optional preview renderer (e.g. markdown -> HTML + parse mode). */
  renderText?: (text: string) => TelegramDraftPreview;
<<<<<<< HEAD
>>>>>>> ab256b8ec (fix: split telegram reasoning and answer draft streams (#20774))
=======
  /** Called when a late send resolves after forceNewMessage() switched generations. */
  onSupersededPreview?: (preview: SupersededTelegramPreview) => void;
>>>>>>> 63b4c500d (fix: prevent Telegram preview stream cross-edit race (#23202))
  log?: (message: string) => void;
  warn?: (message: string) => void;
}): TelegramDraftStream {
  const maxChars = Math.min(params.maxChars ?? TELEGRAM_DRAFT_MAX_CHARS, TELEGRAM_DRAFT_MAX_CHARS);
  const throttleMs = Math.max(50, params.throttleMs ?? DEFAULT_THROTTLE_MS);
  const rawDraftId = Number.isFinite(params.draftId) ? Math.trunc(params.draftId) : 1;
  const draftId = rawDraftId === 0 ? 1 : Math.abs(rawDraftId);
  const chatId = params.chatId;
  const threadParams = buildTelegramThreadParams(params.thread);

  let lastSentText = "";
<<<<<<< HEAD
  let lastSentAt = 0;
  let pendingText = "";
  let inFlight = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
=======
  let lastSentParseMode: "HTML" | undefined;
>>>>>>> ab256b8ec (fix: split telegram reasoning and answer draft streams (#20774))
  let stopped = false;
<<<<<<< HEAD
=======
  let isFinal = false;
  let generation = 0;
>>>>>>> 63b4c500d (fix: prevent Telegram preview stream cross-edit race (#23202))

  const sendDraft = async (text: string) => {
    if (stopped) return;
    const trimmed = text.trimEnd();
<<<<<<< HEAD
    if (!trimmed) return;
    if (trimmed.length > maxChars) {
      // Drafts are capped at 4096 chars. Stop streaming once we exceed the cap
      // so we don't keep sending failing updates or a truncated preview.
      stopped = true;
      params.warn?.(`telegram draft stream stopped (draft length ${trimmed.length} > ${maxChars})`);
      return;
    }
    if (trimmed === lastSentText) return;
    lastSentText = trimmed;
    lastSentAt = Date.now();
    try {
      await params.api.sendMessageDraft(chatId, draftId, trimmed, threadParams);
=======
    if (!trimmed) {
      return false;
    }
    const rendered = params.renderText?.(trimmed) ?? { text: trimmed };
    const renderedText = rendered.text.trimEnd();
    const renderedParseMode = rendered.parseMode;
    if (!renderedText) {
      return false;
    }
    if (renderedText.length > maxChars) {
      // Telegram text messages/edits cap at 4096 chars.
      // Stop streaming once we exceed the cap to avoid repeated API failures.
      stopped = true;
      params.warn?.(
        `telegram stream preview stopped (text length ${renderedText.length} > ${maxChars})`,
      );
      return false;
    }
    if (renderedText === lastSentText && renderedParseMode === lastSentParseMode) {
      return true;
    }
    const sendGeneration = generation;

    // Debounce first preview send for better push notification quality.
    if (typeof streamMessageId !== "number" && minInitialChars != null && !isFinal) {
      if (renderedText.length < minInitialChars) {
        return false;
      }
    }

    lastSentText = renderedText;
    lastSentParseMode = renderedParseMode;
    try {
      if (typeof streamMessageId === "number") {
        if (renderedParseMode) {
          await params.api.editMessageText(chatId, streamMessageId, renderedText, {
            parse_mode: renderedParseMode,
          });
        } else {
          await params.api.editMessageText(chatId, streamMessageId, renderedText);
        }
        return true;
      }
      const sendParams = renderedParseMode
        ? {
            ...replyParams,
            parse_mode: renderedParseMode,
          }
        : replyParams;
      const sent = await params.api.sendMessage(chatId, renderedText, sendParams);
      const sentMessageId = sent?.message_id;
      if (typeof sentMessageId !== "number" || !Number.isFinite(sentMessageId)) {
        stopped = true;
        params.warn?.("telegram stream preview stopped (missing message id from sendMessage)");
        return false;
      }
      const normalizedMessageId = Math.trunc(sentMessageId);
      if (sendGeneration !== generation) {
        params.onSupersededPreview?.({
          messageId: normalizedMessageId,
          textSnapshot: renderedText,
          parseMode: renderedParseMode,
        });
        return true;
      }
      streamMessageId = normalizedMessageId;
      return true;
>>>>>>> ab256b8ec (fix: split telegram reasoning and answer draft streams (#20774))
    } catch (err) {
      stopped = true;
      params.warn?.(
        `telegram draft stream failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (inFlight) {
      schedule();
      return;
    }
    const text = pendingText;
<<<<<<< HEAD
    pendingText = "";
    if (!text.trim()) {
      if (pendingText) schedule();
=======
    const trimmed = text.trim();
    if (!trimmed) {
      if (pendingText === text) {
        pendingText = "";
      }
      if (pendingText) {
        schedule();
      }
>>>>>>> a64d8d2d6 (fix: harden telegram streaming state)
      return;
    }
    pendingText = "";
    inFlight = true;
    try {
      await sendDraft(text);
    } finally {
      inFlight = false;
    }
    if (pendingText) schedule();
  };

  const schedule = () => {
    if (timer) return;
    const delay = Math.max(0, throttleMs - (Date.now() - lastSentAt));
    timer = setTimeout(() => {
      void flush();
    }, delay);
  };

  const update = (text: string) => {
    if (stopped) return;
    pendingText = text;
    if (inFlight) {
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

<<<<<<< HEAD
  params.log?.(
    `telegram draft stream ready (draftId=${draftId}, maxChars=${maxChars}, throttleMs=${throttleMs})`,
  );
=======
  const forceNewMessage = () => {
    generation += 1;
    streamMessageId = undefined;
    lastSentText = "";
    lastSentParseMode = undefined;
    loop.resetPending();
  };
>>>>>>> ab256b8ec (fix: split telegram reasoning and answer draft streams (#20774))

  return { update, flush, stop };
}
