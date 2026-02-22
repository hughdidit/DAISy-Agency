import crypto from "node:crypto";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { resolveBlueBubblesAccount } from "./accounts.js";
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
=======
import type { OpenClawConfig } from "openclaw/plugin-sdk";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { OpenClawConfig } from "openclaw/plugin-sdk";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { OpenClawConfig } from "openclaw/plugin-sdk";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { resolveBlueBubblesServerAccount } from "./account-resolve.js";
>>>>>>> 544ffbcf7 (refactor(extensions): dedupe connector helper usage)
import { postMultipartFormData } from "./multipart.js";
<<<<<<< HEAD
>>>>>>> 719280d73 (refactor(bluebubbles): share multipart helpers)
import { getCachedBlueBubblesPrivateApiStatus } from "./probe.js";
<<<<<<< HEAD
=======
import { resolveRequestUrl } from "./request-url.js";
import { getBlueBubblesRuntime } from "./runtime.js";
>>>>>>> 61dc7ac67 (refactor(msteams,bluebubbles): dedupe inbound media download helpers)
=======
import {
  getCachedBlueBubblesPrivateApiStatus,
  isBlueBubblesPrivateApiStatusEnabled,
} from "./probe.js";
import { resolveRequestUrl } from "./request-url.js";
import { getBlueBubblesRuntime, warnBlueBubbles } from "./runtime.js";
>>>>>>> 296b3f49e (refactor(bluebubbles): centralize private-api status handling)
import { extractBlueBubblesMessageId, resolveBlueBubblesSendTarget } from "./send-helpers.js";
>>>>>>> 811e0c579 (refactor(bluebubbles): share send helpers)
import { resolveChatGuidForTarget } from "./send.js";
import {
  blueBubblesFetchWithTimeout,
  buildBlueBubblesApiUrl,
  type BlueBubblesAttachment,
  type BlueBubblesSendTarget,
} from "./types.js";

export type BlueBubblesAttachmentOpts = {
  serverUrl?: string;
  password?: string;
  accountId?: string;
  timeoutMs?: number;
  cfg?: OpenClawConfig;
};

const DEFAULT_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
const AUDIO_MIME_MP3 = new Set(["audio/mpeg", "audio/mp3"]);
const AUDIO_MIME_CAF = new Set(["audio/x-caf", "audio/caf"]);

function sanitizeFilename(input: string | undefined, fallback: string): string {
  const trimmed = input?.trim() ?? "";
  const base = trimmed ? path.basename(trimmed) : "";
  const name = base || fallback;
  // Strip characters that could enable multipart header injection (CWE-93)
  return name.replace(/[\r\n"\\]/g, "_");
}

function ensureExtension(filename: string, extension: string, fallbackBase: string): string {
  const currentExt = path.extname(filename);
  if (currentExt.toLowerCase() === extension) {
    return filename;
  }
  const base = currentExt ? filename.slice(0, -currentExt.length) : filename;
  return `${base || fallbackBase}${extension}`;
}

function resolveVoiceInfo(filename: string, contentType?: string) {
  const normalizedType = contentType?.trim().toLowerCase();
  const extension = path.extname(filename).toLowerCase();
  const isMp3 =
    extension === ".mp3" || (normalizedType ? AUDIO_MIME_MP3.has(normalizedType) : false);
  const isCaf =
    extension === ".caf" || (normalizedType ? AUDIO_MIME_CAF.has(normalizedType) : false);
  const isAudio = isMp3 || isCaf || Boolean(normalizedType?.startsWith("audio/"));
  return { isAudio, isMp3, isCaf };
}

function resolveAccount(params: BlueBubblesAttachmentOpts) {
<<<<<<< HEAD
  const account = resolveBlueBubblesAccount({
    cfg: params.cfg ?? {},
    accountId: params.accountId,
  });
  const baseUrl = params.serverUrl?.trim() || account.config.serverUrl?.trim();
  const password = params.password?.trim() || account.config.password?.trim();
  if (!baseUrl) {
    throw new Error("BlueBubbles serverUrl is required");
  }
  if (!password) {
    throw new Error("BlueBubbles password is required");
  }
  return { baseUrl, password };
=======
  return resolveBlueBubblesServerAccount(params);
<<<<<<< HEAD
>>>>>>> 544ffbcf7 (refactor(extensions): dedupe connector helper usage)
=======
}

type MediaFetchErrorCode = "max_bytes" | "http_error" | "fetch_failed";

function readMediaFetchErrorCode(error: unknown): MediaFetchErrorCode | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return code === "max_bytes" || code === "http_error" || code === "fetch_failed"
    ? code
    : undefined;
>>>>>>> 61dc7ac67 (refactor(msteams,bluebubbles): dedupe inbound media download helpers)
}

export async function downloadBlueBubblesAttachment(
  attachment: BlueBubblesAttachment,
  opts: BlueBubblesAttachmentOpts & { maxBytes?: number } = {},
): Promise<{ buffer: Uint8Array; contentType?: string }> {
  const guid = attachment.guid?.trim();
  if (!guid) {
    throw new Error("BlueBubbles attachment guid is required");
  }
  const { baseUrl, password } = resolveAccount(opts);
  const url = buildBlueBubblesApiUrl({
    baseUrl,
    path: `/api/v1/attachment/${encodeURIComponent(guid)}/download`,
    password,
  });
<<<<<<< HEAD
  const res = await blueBubblesFetchWithTimeout(url, { method: "GET" }, opts.timeoutMs);
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `BlueBubbles attachment download failed (${res.status}): ${errorText || "unknown"}`,
    );
=======
  const maxBytes = typeof opts.maxBytes === "number" ? opts.maxBytes : DEFAULT_ATTACHMENT_MAX_BYTES;
  try {
    const fetched = await getBlueBubblesRuntime().channel.media.fetchRemoteMedia({
      url,
      filePathHint: attachment.transferName ?? attachment.guid ?? "attachment",
      maxBytes,
      fetchImpl: async (input, init) =>
        await blueBubblesFetchWithTimeout(
          resolveRequestUrl(input),
          { ...init, method: init?.method ?? "GET" },
          opts.timeoutMs,
        ),
    });
    return {
      buffer: new Uint8Array(fetched.buffer),
      contentType: fetched.contentType ?? attachment.mimeType ?? undefined,
    };
  } catch (error) {
    if (readMediaFetchErrorCode(error) === "max_bytes") {
      throw new Error(`BlueBubbles attachment too large (limit ${maxBytes} bytes)`);
    }
    const text = error instanceof Error ? error.message : String(error);
    throw new Error(`BlueBubbles attachment download failed: ${text}`);
>>>>>>> 61dc7ac67 (refactor(msteams,bluebubbles): dedupe inbound media download helpers)
  }
  const contentType = res.headers.get("content-type") ?? undefined;
  const buf = new Uint8Array(await res.arrayBuffer());
  const maxBytes = typeof opts.maxBytes === "number" ? opts.maxBytes : DEFAULT_ATTACHMENT_MAX_BYTES;
  if (buf.byteLength > maxBytes) {
    throw new Error(`BlueBubbles attachment too large (${buf.byteLength} bytes)`);
  }
  return { buffer: buf, contentType: contentType ?? attachment.mimeType ?? undefined };
}

export type SendBlueBubblesAttachmentResult = {
  messageId: string;
};

/**
 * Send an attachment via BlueBubbles API.
 * Supports sending media files (images, videos, audio, documents) to a chat.
 * When asVoice is true, expects MP3/CAF audio and marks it as an iMessage voice memo.
 */
export async function sendBlueBubblesAttachment(params: {
  to: string;
  buffer: Uint8Array;
  filename: string;
  contentType?: string;
  caption?: string;
  replyToMessageGuid?: string;
  replyToPartIndex?: number;
  asVoice?: boolean;
  opts?: BlueBubblesAttachmentOpts;
}): Promise<SendBlueBubblesAttachmentResult> {
  const { to, caption, replyToMessageGuid, replyToPartIndex, asVoice, opts = {} } = params;
  let { buffer, filename, contentType } = params;
  const wantsVoice = asVoice === true;
  const fallbackName = wantsVoice ? "Audio Message" : "attachment";
  filename = sanitizeFilename(filename, fallbackName);
  contentType = contentType?.trim() || undefined;
<<<<<<< HEAD
  const { baseUrl, password } = resolveAccount(opts);
=======
  const { baseUrl, password, accountId } = resolveAccount(opts);
  const privateApiStatus = getCachedBlueBubblesPrivateApiStatus(accountId);
  const privateApiEnabled = isBlueBubblesPrivateApiStatusEnabled(privateApiStatus);
>>>>>>> 296b3f49e (refactor(bluebubbles): centralize private-api status handling)

  // Validate voice memo format when requested (BlueBubbles converts MP3 -> CAF when isAudioMessage).
  const isAudioMessage = wantsVoice;
  if (isAudioMessage) {
    const voiceInfo = resolveVoiceInfo(filename, contentType);
    if (!voiceInfo.isAudio) {
      throw new Error("BlueBubbles voice messages require audio media (mp3 or caf).");
    }
    if (voiceInfo.isMp3) {
      filename = ensureExtension(filename, ".mp3", fallbackName);
      contentType = contentType ?? "audio/mpeg";
    } else if (voiceInfo.isCaf) {
      filename = ensureExtension(filename, ".caf", fallbackName);
      contentType = contentType ?? "audio/x-caf";
    } else {
      throw new Error(
        "BlueBubbles voice messages require mp3 or caf audio (convert before sending).",
      );
    }
  }

  const target = resolveBlueBubblesSendTarget(to);
  const chatGuid = await resolveChatGuidForTarget({
    baseUrl,
    password,
    timeoutMs: opts.timeoutMs,
    target,
  });
  if (!chatGuid) {
    throw new Error(
      "BlueBubbles attachment send failed: chatGuid not found for target. Use a chat_guid target or ensure the chat exists.",
    );
  }

  const url = buildBlueBubblesApiUrl({
    baseUrl,
    path: "/api/v1/message/attachment",
    password,
  });

  // Build FormData with the attachment
  const boundary = `----BlueBubblesFormBoundary${crypto.randomUUID().replace(/-/g, "")}`;
  const parts: Uint8Array[] = [];
  const encoder = new TextEncoder();

  // Helper to add a form field
  const addField = (name: string, value: string) => {
    parts.push(encoder.encode(`--${boundary}\r\n`));
    parts.push(encoder.encode(`Content-Disposition: form-data; name="${name}"\r\n\r\n`));
    parts.push(encoder.encode(`${value}\r\n`));
  };

  // Helper to add a file field
  const addFile = (name: string, fileBuffer: Uint8Array, fileName: string, mimeType?: string) => {
    parts.push(encoder.encode(`--${boundary}\r\n`));
    parts.push(
      encoder.encode(`Content-Disposition: form-data; name="${name}"; filename="${fileName}"\r\n`),
    );
    parts.push(encoder.encode(`Content-Type: ${mimeType ?? "application/octet-stream"}\r\n\r\n`));
    parts.push(fileBuffer);
    parts.push(encoder.encode("\r\n"));
  };

  // Add required fields
  addFile("attachment", buffer, filename, contentType);
  addField("chatGuid", chatGuid);
  addField("name", filename);
  addField("tempGuid", `temp-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);
<<<<<<< HEAD
<<<<<<< HEAD
  addField("method", "private-api");
=======
  if (privateApiStatus === true) {
=======
  if (privateApiEnabled) {
>>>>>>> 296b3f49e (refactor(bluebubbles): centralize private-api status handling)
    addField("method", "private-api");
  }
>>>>>>> 888b6bc94 (fix(bluebubbles): treat null privateApiStatus as disabled, not enabled)

  // Add isAudioMessage flag for voice memos
  if (isAudioMessage) {
    addField("isAudioMessage", "true");
  }

  const trimmedReplyTo = replyToMessageGuid?.trim();
<<<<<<< HEAD
<<<<<<< HEAD
  if (trimmedReplyTo) {
=======
  if (trimmedReplyTo && privateApiStatus === true) {
>>>>>>> 888b6bc94 (fix(bluebubbles): treat null privateApiStatus as disabled, not enabled)
=======
  if (trimmedReplyTo && privateApiEnabled) {
>>>>>>> 296b3f49e (refactor(bluebubbles): centralize private-api status handling)
    addField("selectedMessageGuid", trimmedReplyTo);
    addField("partIndex", typeof replyToPartIndex === "number" ? String(replyToPartIndex) : "0");
  } else if (trimmedReplyTo && privateApiStatus === null) {
    warnBlueBubbles(
      "Private API status unknown; sending attachment without reply threading metadata. Run a status probe to restore private-api reply features.",
    );
  }

  // Add optional caption
  if (caption) {
    addField("message", caption);
    addField("text", caption);
    addField("caption", caption);
  }

  // Close the multipart body
  parts.push(encoder.encode(`--${boundary}--\r\n`));

  const res = await postMultipartFormData({
    url,
    boundary,
    parts,
    timeoutMs: opts.timeoutMs ?? 60_000, // longer timeout for file uploads
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `BlueBubbles attachment send failed (${res.status}): ${errorText || "unknown"}`,
    );
  }

  const responseBody = await res.text();
  if (!responseBody) {
    return { messageId: "ok" };
  }
  try {
    const parsed = JSON.parse(responseBody) as unknown;
    return { messageId: extractBlueBubblesMessageId(parsed) };
  } catch {
    return { messageId: "ok" };
  }
}
