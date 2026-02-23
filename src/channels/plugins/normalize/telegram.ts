import { normalizeTelegramLookupTarget } from "../../../telegram/targets.js";

export function normalizeTelegramMessagingTarget(raw: string): string | undefined {
<<<<<<< HEAD
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  let normalized = trimmed;
  if (normalized.startsWith("telegram:")) {
    normalized = normalized.slice("telegram:".length).trim();
  } else if (normalized.startsWith("tg:")) {
    normalized = normalized.slice("tg:".length).trim();
  }
  if (!normalized) return undefined;
  const tmeMatch =
    /^https?:\/\/t\.me\/([A-Za-z0-9_]+)$/i.exec(normalized) ??
    /^t\.me\/([A-Za-z0-9_]+)$/i.exec(normalized);
  if (tmeMatch?.[1]) normalized = `@${tmeMatch[1]}`;
  if (!normalized) return undefined;
=======
  const normalized = normalizeTelegramLookupTarget(raw);
  if (!normalized) {
    return undefined;
  }
>>>>>>> dcc52850c (fix: persist resolved telegram delivery targets at runtime)
  return `telegram:${normalized}`.toLowerCase();
}

export function looksLikeTelegramTargetId(raw: string): boolean {
<<<<<<< HEAD
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (/^(telegram|tg):/i.test(trimmed)) return true;
  if (trimmed.startsWith("@")) return true;
  return /^-?\d{6,}$/.test(trimmed);
=======
  return Boolean(normalizeTelegramLookupTarget(raw));
>>>>>>> dcc52850c (fix: persist resolved telegram delivery targets at runtime)
}
