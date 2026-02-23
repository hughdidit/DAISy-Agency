<<<<<<< HEAD
export function normalizeTelegramMessagingTarget(raw: string): string | undefined {
=======
import { normalizeTelegramLookupTarget, parseTelegramTarget } from "../../../telegram/targets.js";

const TELEGRAM_PREFIX_RE = /^(telegram|tg):/i;

function normalizeTelegramTargetBody(raw: string): string | undefined {
>>>>>>> d5105ca45 (fix(telegram): unify topic target normalization path)
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
<<<<<<< HEAD
  let normalized = trimmed;
  if (normalized.startsWith("telegram:")) {
    normalized = normalized.slice("telegram:".length).trim();
  } else if (normalized.startsWith("tg:")) {
    normalized = normalized.slice("tg:".length).trim();
  }
  if (!normalized) {
    return undefined;
  }
  const tmeMatch =
    /^https?:\/\/t\.me\/([A-Za-z0-9_]+)$/i.exec(normalized) ??
    /^t\.me\/([A-Za-z0-9_]+)$/i.exec(normalized);
  if (tmeMatch?.[1]) {
    normalized = `@${tmeMatch[1]}`;
  }
=======

<<<<<<< HEAD
  const normalized = normalizeTelegramLookupTarget(trimmed);
>>>>>>> fddc60d17 (fix(telegram): preserve legacy prefixed messaging targets)
  if (!normalized) {
    // Keep legacy prefixed targets (including :topic: suffixes) valid.
    if (/^(telegram|tg):/i.test(trimmed)) {
      const stripped = trimmed.replace(/^(telegram|tg):/i, "").trim();
      if (stripped) {
        return `telegram:${stripped}`.toLowerCase();
      }
    }
=======
  const prefixStripped = trimmed.replace(TELEGRAM_PREFIX_RE, "").trim();
  if (!prefixStripped) {
>>>>>>> d5105ca45 (fix(telegram): unify topic target normalization path)
    return undefined;
  }

  const parsed = parseTelegramTarget(trimmed);
  const normalizedChatId = normalizeTelegramLookupTarget(parsed.chatId);
  if (!normalizedChatId) {
    return undefined;
  }

  const keepLegacyGroupPrefix = /^group:/i.test(prefixStripped);
  const hasTopicSuffix = /:topic:\d+$/i.test(prefixStripped);
  const chatSegment = keepLegacyGroupPrefix ? `group:${normalizedChatId}` : normalizedChatId;
  if (parsed.messageThreadId == null) {
    return chatSegment;
  }
  const threadSuffix = hasTopicSuffix
    ? `:topic:${parsed.messageThreadId}`
    : `:${parsed.messageThreadId}`;
  return `${chatSegment}${threadSuffix}`;
}

export function normalizeTelegramMessagingTarget(raw: string): string | undefined {
  const normalizedBody = normalizeTelegramTargetBody(raw);
  if (!normalizedBody) {
    return undefined;
  }
  return `telegram:${normalizedBody}`.toLowerCase();
}

export function looksLikeTelegramTargetId(raw: string): boolean {
<<<<<<< HEAD
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
<<<<<<< HEAD
  if (/^(telegram|tg):/i.test(trimmed)) {
    return true;
  }
  if (trimmed.startsWith("@")) {
    return true;
  }
  return /^-?\d{6,}$/.test(trimmed);
=======
  if (normalizeTelegramLookupTarget(trimmed)) {
    return true;
  }
  return /^(telegram|tg):/i.test(trimmed);
>>>>>>> fddc60d17 (fix(telegram): preserve legacy prefixed messaging targets)
=======
  return normalizeTelegramTargetBody(raw) !== undefined;
>>>>>>> d5105ca45 (fix(telegram): unify topic target normalization path)
}
