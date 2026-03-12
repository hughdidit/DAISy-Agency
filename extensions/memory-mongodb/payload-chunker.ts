export const SUPPORTED_INLINE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "application/pdf",
] as const;

export type SupportedInlineMimeType = (typeof SUPPORTED_INLINE_MIME_TYPES)[number];

export type MultimodalPart =
  | {
      text: string;
    }
  | {
      inlineData: {
        mimeType: SupportedInlineMimeType;
        data: string;
      };
    };

const SUPPORTED_MIME_LOOKUP = new Set<string>(SUPPORTED_INLINE_MIME_TYPES);
const MAX_TEXT_CHARS_PER_PART = 28_000;
const MAX_IMAGE_OR_PDF_PARTS_PER_CHUNK = 6;

type InlineDataPart = Extract<MultimodalPart, { inlineData: unknown }>;

function isInlineDataPart(part: MultimodalPart): part is InlineDataPart {
  return "inlineData" in part;
}

function isImageOrPdfMimeType(mimeType: string): boolean {
  const lowerMime = mimeType.toLowerCase();
  return lowerMime.startsWith("image/") || lowerMime === "application/pdf";
}

function normalizeTextPart(part: unknown, index: number): string {
  if (!part || typeof part !== "object" || Array.isArray(part)) {
    throw new Error(`Multimodal part at index ${index} must be an object`);
  }

  const record = part as Record<string, unknown>;
  if (typeof record.text !== "string") {
    throw new Error(`Text part at index ${index} must include a string "text" value`);
  }

  if (record.text.length === 0) {
    throw new Error(`Text part at index ${index} cannot be empty`);
  }

  return record.text;
}

function normalizeInlineDataPart(part: unknown, index: number): InlineDataPart {
  if (!part || typeof part !== "object" || Array.isArray(part)) {
    throw new Error(`Multimodal part at index ${index} must be an object`);
  }

  const record = part as Record<string, unknown>;
  const inlineData = record.inlineData;
  if (!inlineData || typeof inlineData !== "object" || Array.isArray(inlineData)) {
    throw new Error(`Inline data part at index ${index} must include an "inlineData" object`);
  }

  const inlineRecord = inlineData as Record<string, unknown>;
  const mimeType = inlineRecord.mimeType;
  const data = inlineRecord.data;
  if (typeof mimeType !== "string" || mimeType.length === 0) {
    throw new Error(`Inline data part at index ${index} is missing "mimeType"`);
  }

  const normalizedMimeType = mimeType.toLowerCase();
  if (!SUPPORTED_MIME_LOOKUP.has(normalizedMimeType)) {
    throw new Error(
      `Unsupported mimeType "${mimeType}" at index ${index}. Supported values: ${SUPPORTED_INLINE_MIME_TYPES.join(", ")}`,
    );
  }

  if (typeof data !== "string" || data.length === 0) {
    throw new Error(`Inline data part at index ${index} is missing base64 "data"`);
  }

  return {
    inlineData: {
      mimeType: normalizedMimeType as SupportedInlineMimeType,
      data,
    },
  };
}

function normalizePart(part: unknown, index: number): MultimodalPart[] {
  if (!part || typeof part !== "object" || Array.isArray(part)) {
    throw new Error(`Multimodal part at index ${index} must be an object`);
  }

  const record = part as Record<string, unknown>;
  const hasText = "text" in record;
  const hasInlineData = "inlineData" in record;

  if (hasText && hasInlineData) {
    throw new Error(`Multimodal part at index ${index} cannot include both "text" and "inlineData"`);
  }

  if (hasText) {
    const text = normalizeTextPart(part, index);
    const chunks: MultimodalPart[] = [];
    for (let offset = 0; offset < text.length; offset += MAX_TEXT_CHARS_PER_PART) {
      chunks.push({ text: text.slice(offset, offset + MAX_TEXT_CHARS_PER_PART) });
    }
    return chunks;
  }

  if (hasInlineData) {
    return [normalizeInlineDataPart(part, index)];
  }

  throw new Error(`Multimodal part at index ${index} must contain either "text" or "inlineData"`);
}

export class PayloadChunker {
  static chunk(parts: MultimodalPart[]): MultimodalPart[][] {
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error("At least one multimodal part is required");
    }

    const normalized: MultimodalPart[] = [];
    for (const [index, part] of parts.entries()) {
      normalized.push(...normalizePart(part, index));
    }

    const chunks: MultimodalPart[][] = [];
    let activeChunk: MultimodalPart[] = [];
    let imageOrPdfCount = 0;

    for (const part of normalized) {
      const nextCount =
        imageOrPdfCount +
        (isInlineDataPart(part) && isImageOrPdfMimeType(part.inlineData.mimeType) ? 1 : 0);

      if (activeChunk.length > 0 && nextCount > MAX_IMAGE_OR_PDF_PARTS_PER_CHUNK) {
        chunks.push(activeChunk);
        activeChunk = [];
        imageOrPdfCount = 0;
      }

      activeChunk.push(part);
      if (isInlineDataPart(part) && isImageOrPdfMimeType(part.inlineData.mimeType)) {
        imageOrPdfCount += 1;
      }
    }

    if (activeChunk.length > 0) {
      chunks.push(activeChunk);
    }

    return chunks;
  }
}

export function multimodalPartsToFallbackText(parts: MultimodalPart[], maxLength = 2_000): string {
  const segments: string[] = [];

  for (const part of parts) {
    if ("text" in part) {
      const text = part.text.trim();
      if (text.length > 0) {
        segments.push(text);
      }
      continue;
    }

    segments.push(`[attachment:${part.inlineData.mimeType}]`);
  }

  const fallback = segments.join("\n").trim() || "[multimodal-memory]";
  return fallback.length <= maxLength ? fallback : `${fallback.slice(0, maxLength)}...`;
}

export const payloadChunkerLimits = {
  maxTextCharsPerPart: MAX_TEXT_CHARS_PER_PART,
  maxImageOrPdfPartsPerChunk: MAX_IMAGE_OR_PDF_PARTS_PER_CHUNK,
};