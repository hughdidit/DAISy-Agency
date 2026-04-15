import { createHash } from "node:crypto";

export const payloadChunkerLimits = {
  maxImageOrPdfPartsPerChunk: 6,
  maxTextCharsPerPart: 28_000,
  maxDecodedTextLikeDocumentChars: 8_000,
} as const;

export const defaultSupportedMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/ld+json",
  "application/x-ndjson",
  "application/x-yaml",
  "text/yaml",
  "text/x-yaml",
  "application/xml",
  "text/xml",
  "text/html",
  "application/rtf",
  "text/rtf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.apple.pages",
  "application/vnd.apple.numbers",
  "application/vnd.apple.keynote",
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
  "text/x-python",
  "text/x-typescript",
  "application/x-sh",
  "text/x-shellscript",
  "application/toml",
  "text/x-toml",
] as const;

const geminiInlineEmbeddableMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "application/pdf",
]);

const textLikeDocumentMimeTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/ld+json",
  "application/x-ndjson",
  "application/x-yaml",
  "text/yaml",
  "text/x-yaml",
  "application/xml",
  "text/xml",
  "text/html",
  "application/rtf",
  "text/rtf",
  "text/x-python",
  "text/x-typescript",
  "application/x-sh",
  "text/x-shellscript",
  "application/toml",
  "text/x-toml",
]);

const allowedMimeTypes = new Set<string>(defaultSupportedMimeTypes);

export type SupportedMimeType = (typeof defaultSupportedMimeTypes)[number];

export type MultimodalTextPart = {
  text: string;
};

export type MultimodalInlineDataPart = {
  inlineData: {
    mimeType: SupportedMimeType;
    data: string;
  };
};

export type MultimodalPart = MultimodalTextPart | MultimodalInlineDataPart;

export type AttachmentManifest = {
  modality: "text" | "image" | "audio" | "video" | "document";
  mimeType: string;
  filename?: string;
  contentHash: string;
  byteLength: number;
  durationMs?: number;
  pageCount?: number;
  transcriptStatus?: "available" | "missing" | "deferred";
  ocrStatus?: "available" | "missing" | "deferred";
  storageMode: "inline" | "external_ref";
  externalRef?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTextPart(part: MultimodalPart): part is MultimodalTextPart {
  return typeof (part as { text?: unknown }).text === "string";
}

function isInlineDataPart(part: MultimodalPart): part is MultimodalInlineDataPart {
  return isObject((part as { inlineData?: unknown }).inlineData);
}

function isImageOrPdfMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

function splitTextByLimit(text: string): string[] {
  if (text.length <= payloadChunkerLimits.maxTextCharsPerPart) {
    return [text];
  }

  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += payloadChunkerLimits.maxTextCharsPerPart) {
    chunks.push(text.slice(i, i + payloadChunkerLimits.maxTextCharsPerPart));
  }

  return chunks;
}

function normalizePart(rawPart: unknown, index: number): MultimodalPart {
  if (!isObject(rawPart)) {
    throw new Error(`Multimodal part at index ${index} must be an object`);
  }

  const hasText = typeof rawPart.text === "string";
  const hasInlineData = rawPart.inlineData !== undefined;

  if (hasText && hasInlineData) {
    throw new Error(`Multimodal part at index ${index} cannot include both text and inlineData`);
  }

  if (!hasText && !hasInlineData) {
    throw new Error(`Multimodal part at index ${index} must include text or inlineData`);
  }

  if (hasText) {
    const text = String(rawPart.text);
    if (text.length === 0) {
      throw new Error(`Multimodal text part at index ${index} cannot be empty`);
    }

    return { text };
  }

  if (!isObject(rawPart.inlineData)) {
    throw new Error(`Multimodal inlineData at index ${index} must be an object`);
  }

  const mimeType = String(rawPart.inlineData.mimeType ?? "").toLowerCase();
  const data = rawPart.inlineData.data;

  if (!allowedMimeTypes.has(mimeType)) {
    throw new Error(
      `Unsupported mimeType at index ${index}: ${mimeType}. Allowed types: ${Array.from(allowedMimeTypes).join(", ")}`,
    );
  }

  if (typeof data !== "string" || data.length === 0) {
    throw new Error(`Multimodal inlineData at index ${index} requires non-empty base64 data`);
  }

  return {
    inlineData: {
      mimeType: mimeType as SupportedMimeType,
      data,
    },
  };
}

function safeDecodeBase64(data: string): Buffer | null {
  try {
    return Buffer.from(data, "base64");
  } catch {
    return null;
  }
}

function decodeTextLikeDocument(data: string): string {
  const decoded = safeDecodeBase64(data);
  if (!decoded) {
    return "";
  }

  return decoded.toString("utf8").slice(0, payloadChunkerLimits.maxDecodedTextLikeDocumentChars);
}

function inferModality(mimeType: string): AttachmentManifest["modality"] {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "document";
}

export function isDocumentMimeType(mimeType: string): boolean {
  return inferModality(mimeType) === "document";
}

export function buildInlineAttachmentManifest(part: MultimodalInlineDataPart): AttachmentManifest {
  const mimeType = part.inlineData.mimeType;
  const decoded = safeDecodeBase64(part.inlineData.data);
  const bytes = decoded ? decoded.length : Buffer.byteLength(part.inlineData.data, "utf8");
  const hashInput = decoded ?? Buffer.from(part.inlineData.data, "utf8");

  return {
    modality: inferModality(mimeType),
    mimeType,
    contentHash: createHash("sha256").update(hashInput).digest("hex"),
    byteLength: bytes,
    storageMode: "inline",
    transcriptStatus:
      mimeType.startsWith("audio/") || mimeType.startsWith("video/") ? "deferred" : undefined,
    ocrStatus:
      mimeType.startsWith("image/") || mimeType === "application/pdf" ? "deferred" : undefined,
  };
}

export function buildAttachmentManifests(parts: MultimodalPart[]): AttachmentManifest[] {
  const manifests: AttachmentManifest[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const normalized = normalizePart(parts[i], i);
    if (isInlineDataPart(normalized)) {
      manifests.push(buildInlineAttachmentManifest(normalized));
    }
  }
  return manifests;
}

export function preparePartsForEmbedding(parts: MultimodalPart[]): MultimodalPart[] {
  const prepared: MultimodalPart[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    const normalized = normalizePart(parts[i], i);
    if (isTextPart(normalized)) {
      prepared.push(normalized);
      continue;
    }

    const mimeType = normalized.inlineData.mimeType;
    if (geminiInlineEmbeddableMimeTypes.has(mimeType)) {
      prepared.push(normalized);
      continue;
    }

    if (textLikeDocumentMimeTypes.has(mimeType)) {
      const decoded = decodeTextLikeDocument(normalized.inlineData.data).trim();
      if (decoded.length > 0) {
        prepared.push({ text: `[attachment:${mimeType}]\n${decoded}` });
      } else {
        prepared.push({ text: `[attachment:${mimeType}]` });
      }
      continue;
    }

    prepared.push({ text: `[attachment:${mimeType}] extracted_text=deferred` });
  }

  return prepared;
}

export class PayloadChunker {
  static chunk(parts: MultimodalPart[]): MultimodalPart[][] {
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error("At least one multimodal part is required");
    }

    const expandedParts: MultimodalPart[] = [];

    for (let i = 0; i < parts.length; i += 1) {
      const normalized = normalizePart(parts[i], i);

      if (isTextPart(normalized)) {
        for (const piece of splitTextByLimit(normalized.text)) {
          expandedParts.push({ text: piece });
        }
      } else {
        expandedParts.push(normalized);
      }
    }

    const chunks: MultimodalPart[][] = [];
    let current: MultimodalPart[] = [];
    let imageOrPdfCount = 0;

    for (const part of expandedParts) {
      const nextImageOrPdfCount =
        isInlineDataPart(part) && isImageOrPdfMimeType(part.inlineData.mimeType)
          ? imageOrPdfCount + 1
          : imageOrPdfCount;

      if (
        current.length > 0 &&
        nextImageOrPdfCount > payloadChunkerLimits.maxImageOrPdfPartsPerChunk
      ) {
        chunks.push(current);
        current = [];
        imageOrPdfCount = 0;
      }

      current.push(part);

      if (isInlineDataPart(part) && isImageOrPdfMimeType(part.inlineData.mimeType)) {
        imageOrPdfCount += 1;
      }
    }

    if (current.length > 0) {
      chunks.push(current);
    }

    return chunks;
  }
}

export function multimodalPartsToFallbackText(parts: MultimodalPart[], maxChars = 2_000): string {
  if (!Array.isArray(parts) || parts.length === 0) {
    return "";
  }

  const segments: string[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    const normalized = normalizePart(parts[i], i);

    if (isTextPart(normalized)) {
      segments.push(normalized.text.trim());
    } else {
      segments.push(`[attachment:${normalized.inlineData.mimeType}]`);
    }
  }

  const fallback = segments.filter((segment) => segment.length > 0).join("\n");
  if (fallback.length <= maxChars) {
    return fallback;
  }

  return fallback.slice(0, maxChars);
}
