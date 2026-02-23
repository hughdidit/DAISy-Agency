export function normalizeTelegramMessagingTarget(raw: string): string | undefined {
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
    return undefined;
  }
  return `telegram:${normalized}`.toLowerCase();
}

export function looksLikeTelegramTargetId(raw: string): boolean {
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
}
