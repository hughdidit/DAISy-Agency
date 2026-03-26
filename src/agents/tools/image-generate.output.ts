import { detectMime, extensionForMime, kindFromMime } from "../../media/mime.js";
import type {
  GeneratedImageBinaryOutput,
  ImageGenerationAdapterResult,
  ValidatedGeneratedImage,
} from "./image-generate.types.js";

type ImageDimensions = {
  width: number;
  height: number;
};

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function readPngDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 24) {
    return null;
  }
  const signature = "89504e470d0a1a0a";
  if (bytes.subarray(0, 8).toString("hex") !== signature) {
    return null;
  }
  if (bytes.toString("ascii", 12, 16) !== "IHDR") {
    return null;
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  return isPositiveInteger(width) && isPositiveInteger(height) ? { width, height } : null;
}

function readGifDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 10) {
    return null;
  }
  const header = bytes.toString("ascii", 0, 6);
  if (header !== "GIF87a" && header !== "GIF89a") {
    return null;
  }
  const width = bytes.readUInt16LE(6);
  const height = bytes.readUInt16LE(8);
  return isPositiveInteger(width) && isPositiveInteger(height) ? { width, height } : null;
}

function readJpegDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= bytes.length) {
      return null;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      return null;
    }

    if (offset + 1 >= bytes.length) {
      return null;
    }

    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      if (segmentLength < 7) {
        return null;
      }
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      return isPositiveInteger(width) && isPositiveInteger(height) ? { width, height } : null;
    }

    offset += segmentLength;
  }

  return null;
}

function readWebpDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 16) {
    return null;
  }
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const chunkType = bytes.toString("ascii", 12, 16);
  if (chunkType === "VP8 ") {
    if (bytes.length < 30) {
      return null;
    }
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      return null;
    }
    const width = bytes.readUInt16LE(26) & 0x3fff;
    const height = bytes.readUInt16LE(28) & 0x3fff;
    return isPositiveInteger(width) && isPositiveInteger(height) ? { width, height } : null;
  }

  if (chunkType === "VP8L") {
    if (bytes.length < 25 || bytes[20] !== 0x2f) {
      return null;
    }
    const bits =
      bytes[21] |
      (bytes[22] << 8) |
      (bytes[23] << 16) |
      (bytes[24] << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return isPositiveInteger(width) && isPositiveInteger(height) ? { width, height } : null;
  }

  if (chunkType === "VP8X") {
    if (bytes.length < 30) {
      return null;
    }
    const width = 1 + bytes.readUIntLE(24, 3);
    const height = 1 + bytes.readUIntLE(27, 3);
    return isPositiveInteger(width) && isPositiveInteger(height) ? { width, height } : null;
  }

  return null;
}

function readImageDimensions(bytes: Buffer, mimeType: string): ImageDimensions | null {
  switch (mimeType) {
    case "image/png":
      return readPngDimensions(bytes);
    case "image/gif":
      return readGifDimensions(bytes);
    case "image/jpeg":
      return readJpegDimensions(bytes);
    case "image/webp":
      return readWebpDimensions(bytes);
    default:
      return null;
  }
}

export function selectSingleGeneratedOutput(
  result: ImageGenerationAdapterResult,
): GeneratedImageBinaryOutput {
  if (!Array.isArray(result.outputs) || result.outputs.length === 0) {
    throw new Error(`${result.provider} image generation returned no outputs.`);
  }
  if (result.outputs.length !== 1) {
    throw new Error(
      `${result.provider} image generation returned ${result.outputs.length} outputs; image_generate expects exactly one deterministic output in v1.`,
    );
  }
  return result.outputs[0];
}

export async function validateGeneratedImageOutput(params: {
  output: GeneratedImageBinaryOutput;
  provider: string;
}): Promise<ValidatedGeneratedImage> {
  const bytes = params.output.bytes;
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new Error(`${params.provider} image generation returned an empty payload.`);
  }

  const mimeType =
    (await detectMime({
      buffer: bytes.subarray(0, Math.min(bytes.length, 512)),
    })) ?? undefined;
  if (!mimeType || kindFromMime(mimeType) !== "image") {
    throw new Error(`${params.provider} image generation returned a non-image payload.`);
  }

  const headerDimensions = readImageDimensions(bytes, mimeType);
  if (!headerDimensions && !["image/heic", "image/heif"].includes(mimeType)) {
    throw new Error(`${params.provider} image generation returned invalid image bytes.`);
  }

  const extension = extensionForMime(mimeType);
  if (!extension) {
    throw new Error(`Unsupported generated image MIME type "${mimeType}".`);
  }

  return {
    bytes,
    mimeType,
    extension,
    sizeBytes: bytes.length,
    width:
      typeof params.output.width === "number" &&
      Number.isInteger(params.output.width) &&
      params.output.width > 0
        ? params.output.width
        : (headerDimensions?.width ?? undefined),
    height:
      typeof params.output.height === "number" &&
      Number.isInteger(params.output.height) &&
      params.output.height > 0
        ? params.output.height
        : (headerDimensions?.height ?? undefined),
  };
}
