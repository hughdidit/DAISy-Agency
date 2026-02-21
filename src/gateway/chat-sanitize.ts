const ENVELOPE_PREFIX = /^\[([^\]]+)\]\s*/;
const ENVELOPE_CHANNELS = [
  "WebChat",
  "WhatsApp",
  "Telegram",
  "Signal",
  "Slack",
  "Discord",
  "Google Chat",
  "iMessage",
  "Teams",
  "Matrix",
  "Zalo",
  "Zalo Personal",
  "BlueBubbles",
];

const MESSAGE_ID_LINE = /^\s*\[message_id:\s*[^\]]+\]\s*$/i;

function looksLikeEnvelopeHeader(header: string): boolean {
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z\b/.test(header)) return true;
  if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}\b/.test(header)) return true;
  return ENVELOPE_CHANNELS.some((label) => header.startsWith(`${label} `));
}

export function stripEnvelope(text: string): string {
  const match = text.match(ENVELOPE_PREFIX);
  if (!match) return text;
  const header = match[1] ?? "";
  if (!looksLikeEnvelopeHeader(header)) return text;
  return text.slice(match[0].length);
}

function stripMessageIdHints(text: string): string {
  if (!text.includes("[message_id:")) return text;
  const lines = text.split(/\r?\n/);
  const filtered = lines.filter((line) => !MESSAGE_ID_LINE.test(line));
  return filtered.length === lines.length ? text : filtered.join("\n");
}

function stripEnvelopeFromContentWithRole(
  content: unknown[],
  stripUserEnvelope: boolean,
): { content: unknown[]; changed: boolean } {
  let changed = false;
  const next = content.map((item) => {
    if (!item || typeof item !== "object") return item;
    const entry = item as Record<string, unknown>;
<<<<<<< HEAD
    if (entry.type !== "text" || typeof entry.text !== "string") return item;
    const stripped = stripMessageIdHints(stripEnvelope(entry.text));
    if (stripped === entry.text) return item;
=======
    if (entry.type !== "text" || typeof entry.text !== "string") {
      return item;
    }
    const inboundStripped = stripInboundMetadata(entry.text);
    const stripped = stripUserEnvelope
      ? stripMessageIdHints(stripEnvelope(inboundStripped))
      : inboundStripped;
    if (stripped === entry.text) {
      return item;
    }
>>>>>>> 9fc6c8b71 (fix: hide synthetic untrusted metadata in chat history)
    changed = true;
    return {
      ...entry,
      text: stripped,
    };
  });
  return { content: next, changed };
}

export function stripEnvelopeFromMessage(message: unknown): unknown {
  if (!message || typeof message !== "object") return message;
  const entry = message as Record<string, unknown>;
  const role = typeof entry.role === "string" ? entry.role.toLowerCase() : "";
<<<<<<< HEAD
  if (role !== "user") return message;
=======
  const stripUserEnvelope = role === "user";
>>>>>>> 9fc6c8b71 (fix: hide synthetic untrusted metadata in chat history)

  let changed = false;
  const next: Record<string, unknown> = { ...entry };

  if (typeof entry.content === "string") {
<<<<<<< HEAD
    const stripped = stripMessageIdHints(stripEnvelope(entry.content));
=======
    const inboundStripped = stripInboundMetadata(entry.content);
    const stripped = stripUserEnvelope
      ? stripMessageIdHints(stripEnvelope(inboundStripped))
      : inboundStripped;
>>>>>>> 9fc6c8b71 (fix: hide synthetic untrusted metadata in chat history)
    if (stripped !== entry.content) {
      next.content = stripped;
      changed = true;
    }
  } else if (Array.isArray(entry.content)) {
    const updated = stripEnvelopeFromContentWithRole(entry.content, stripUserEnvelope);
    if (updated.changed) {
      next.content = updated.content;
      changed = true;
    }
  } else if (typeof entry.text === "string") {
<<<<<<< HEAD
    const stripped = stripMessageIdHints(stripEnvelope(entry.text));
=======
    const inboundStripped = stripInboundMetadata(entry.text);
    const stripped = stripUserEnvelope
      ? stripMessageIdHints(stripEnvelope(inboundStripped))
      : inboundStripped;
>>>>>>> 9fc6c8b71 (fix: hide synthetic untrusted metadata in chat history)
    if (stripped !== entry.text) {
      next.text = stripped;
      changed = true;
    }
  }

  return changed ? next : message;
}

export function stripEnvelopeFromMessages(messages: unknown[]): unknown[] {
  if (messages.length === 0) return messages;
  let changed = false;
  const next = messages.map((message) => {
    const stripped = stripEnvelopeFromMessage(message);
    if (stripped !== message) changed = true;
    return stripped;
  });
  return changed ? next : messages;
}
