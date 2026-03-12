export const payloadChunkerLimits = {
  maxImageOrPdfPartsPerChunk: 6,
  maxTextCharsPerPart: 28_000,
} as const;

const allowedMimeTypes = new Set([
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

export type SupportedMimeType =
  | "image/png"
  | "image/jpeg"
  | "image/jpg"
  | "video/mp4"
  | "video/quicktime"
  | "audio/mpeg"
  | "audio/mp3"
  | "audio/wav"
  | "application/pdf";

export type MultimodalTextPart = {
  text: string;
  inlineData?: never;
};

export type MultimodalInlineDataPart = {
  inlineData: {
    mimeType: SupportedMimeType;
    data: string;
  };
  text?: never;
};

export type MultimodalPart = MultimodalTextPart | MultimodalInlineDataPart;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
    throw new Error(`Unsupported mimeType: ${mimeType}`);
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

export class PayloadChunker {
  static chunk(parts: MultimodalPart[]): MultimodalPart[][] {
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error("At least one multimodal part is required");
    }

    const expandedParts: MultimodalPart[] = [];

    for (let i = 0; i < parts.length; i += 1) {
      const normalized = normalizePart(parts[i], i);

      if ("text" in normalized) {
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
        "inlineData" in part && isImageOrPdfMimeType(part.inlineData.mimeType)
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

      if ("inlineData" in part && isImageOrPdfMimeType(part.inlineData.mimeType)) {
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

    if ("text" in normalized) {
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
