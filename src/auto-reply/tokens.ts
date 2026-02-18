export const HEARTBEAT_TOKEN = "HEARTBEAT_OK";
export const SILENT_REPLY_TOKEN = "NO_REPLY";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isSilentReplyText(
  text: string | undefined,
  token: string = SILENT_REPLY_TOKEN,
): boolean {
  if (!text) return false;
  const escaped = escapeRegExp(token);
<<<<<<< HEAD
  const prefix = new RegExp(`^\\s*${escaped}(?=$|\\W)`);
  if (prefix.test(text)) return true;
  const suffix = new RegExp(`\\b${escaped}\\b\\W*$`);
  return suffix.test(text);
=======
  // Only match when the entire response (trimmed) is the silent token,
  // optionally surrounded by whitespace/punctuation. This prevents
  // substantive replies ending with NO_REPLY from being suppressed (#19537).
  return new RegExp(`^\\s*${escaped}\\s*$`).test(text);
>>>>>>> 2f2110a32 (fix: tighten isSilentReplyText to match whole-text only)
}
