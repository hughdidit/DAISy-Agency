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
  /** Minimum chars before sending first message (debounce for push notifications) */
  minInitialChars?: number;
  /** Optional preview renderer (e.g. markdown -> HTML + parse mode). */
  renderText?: (text: string) => TelegramDraftPreview;
<<<<<<< HEAD
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
  let lastSentAt = 0;
  let pendingText = "";
  let inFlight = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let isFinal = false;
  let generation = 0;

  const sendDraft = async (text: string) => {
    if (stopped) return;
    const trimmed = text.trimEnd();
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
=======
  const { loop, update, stop, clear } = createFinalizableDraftLifecycle({
    throttleMs,
    state: streamState,
    sendOrEditStreamMessage,
    readMessageId: () => streamMessageId,
    clearMessageId: () => {
      streamMessageId = undefined;
    },
    isValidMessageId: (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
    deleteMessage: async (messageId) => {
      await params.api.deleteMessage(chatId, messageId);
    },
    onDeleteSuccess: (messageId) => {
      params.log?.(`telegram stream preview deleted (chat=${chatId}, message=${messageId})`);
    },
    warn: params.warn,
    warnPrefix: "telegram stream preview cleanup failed",
  });
>>>>>>> 0c1a52307 (fix: align draft/outbound typings and tests)

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

  params.log?.(
    `telegram draft stream ready (draftId=${draftId}, maxChars=${maxChars}, throttleMs=${throttleMs})`,
  );

  return { update, flush, stop };
}
