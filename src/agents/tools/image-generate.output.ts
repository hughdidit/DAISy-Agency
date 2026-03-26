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

const SUPPORTED_GENERATED_IMAGE_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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

  let offset = 8;
  let sawHeader = false;
  let sawImageData = false;
  let dimensions: ImageDimensions | null = null;

  while (offset + 12 <= bytes.length) {
    const chunkLength = bytes.readUInt32BE(offset);
    const chunkType = bytes.toString("ascii", offset + 4, offset + 8);
    const chunkDataStart = offset + 8;
    const chunkDataEnd = chunkDataStart + chunkLength;
    const chunkEnd = chunkDataEnd + 4;
    if (chunkDataEnd < chunkDataStart || chunkEnd > bytes.length) {
      return null;
    }

    if (!sawHeader && chunkType !== "IHDR") {
      return null;
    }

    if (chunkType === "IHDR") {
      if (sawHeader || chunkLength !== 13) {
        return null;
      }
      const width = bytes.readUInt32BE(chunkDataStart);
      const height = bytes.readUInt32BE(chunkDataStart + 4);
      if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
        return null;
      }
      dimensions = { width, height };
      sawHeader = true;
    } else if (chunkType === "IDAT") {
      if (!sawHeader || chunkLength === 0) {
        return null;
      }
      sawImageData = true;
    } else if (chunkType === "IEND") {
      if (!sawHeader || chunkLength !== 0 || !sawImageData || chunkEnd !== bytes.length) {
        return null;
      }
      return dimensions;
    }

    offset = chunkEnd;
  }

  return null;
}

function readGifDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 13) {
    return null;
  }
  const header = bytes.toString("ascii", 0, 6);
  if (header !== "GIF87a" && header !== "GIF89a") {
    return null;
  }
  const width = bytes.readUInt16LE(6);
  const height = bytes.readUInt16LE(8);
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
    return null;
  }

  let offset = 13;
  const globalColorTablePacked = bytes[10];
  if ((globalColorTablePacked & 0x80) !== 0) {
    const globalColorTableSize = 3 * 2 ** ((globalColorTablePacked & 0x07) + 1);
    if (offset + globalColorTableSize > bytes.length) {
      return null;
    }
    offset += globalColorTableSize;
  }

  let sawImageDescriptor = false;
  while (offset < bytes.length) {
    const blockType = bytes[offset];
    offset += 1;

    if (blockType === 0x3b) {
      return sawImageDescriptor && offset === bytes.length ? { width, height } : null;
    }

    if (blockType === 0x21) {
      if (offset + 2 > bytes.length) {
        return null;
      }
      offset += 1;
      const extensionBlockSize = bytes[offset];
      offset += 1;
      if (offset + extensionBlockSize > bytes.length) {
        return null;
      }
      offset += extensionBlockSize;
      while (offset < bytes.length) {
        const subBlockSize = bytes[offset];
        offset += 1;
        if (subBlockSize === 0) {
          break;
        }
        if (offset + subBlockSize > bytes.length) {
          return null;
        }
        offset += subBlockSize;
      }
      continue;
    }

    if (blockType !== 0x2c) {
      return null;
    }
    if (offset + 9 > bytes.length) {
      return null;
    }

    const localColorTablePacked = bytes[offset + 8];
    offset += 9;

    if ((localColorTablePacked & 0x80) !== 0) {
      const localColorTableSize = 3 * 2 ** ((localColorTablePacked & 0x07) + 1);
      if (offset + localColorTableSize > bytes.length) {
        return null;
      }
      offset += localColorTableSize;
    }

    if (offset >= bytes.length) {
      return null;
    }
    offset += 1;
    while (offset < bytes.length) {
      const subBlockSize = bytes[offset];
      offset += 1;
      if (subBlockSize === 0) {
        sawImageDescriptor = true;
        break;
      }
      if (offset + subBlockSize > bytes.length) {
        return null;
      }
      offset += subBlockSize;
    }
  }

  return null;
}

function readJpegDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  let dimensions: ImageDimensions | null = null;
  let sawStartOfScan = false;

  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= bytes.length) {
      return null;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9) {
      return dimensions && sawStartOfScan && offset === bytes.length ? dimensions : null;
    }

    if (marker >= 0xd0 && marker <= 0xd7) {
      continue;
    }

    if (marker === 0x01) {
      continue;
    }

    if (offset + 1 >= bytes.length) {
      return null;
    }

    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }

    if (marker === 0xda) {
      if (!dimensions) {
        return null;
      }
      sawStartOfScan = true;
      offset += segmentLength;
      while (offset + 1 < bytes.length) {
        if (bytes[offset] !== 0xff) {
          offset += 1;
          continue;
        }

        const next = bytes[offset + 1];
        if (next === 0x00) {
          offset += 2;
          continue;
        }
        if (next >= 0xd0 && next <= 0xd7) {
          offset += 2;
          continue;
        }
        if (next === 0xd9) {
          return offset + 2 === bytes.length ? dimensions : null;
        }
        return null;
      }
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
      if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
        return null;
      }
      dimensions = { width, height };
    }

    offset += segmentLength;
  }

  return null;
}

function readWebpDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 20) {
    return null;
  }
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const riffPayloadSize = bytes.readUInt32LE(4);
  if (riffPayloadSize + 8 !== bytes.length) {
    return null;
  }

  let offset = 12;
  let dimensions: ImageDimensions | null = null;
  let sawPrimaryImageChunk = false;

  while (offset + 8 <= bytes.length) {
    const chunkType = bytes.toString("ascii", offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;
    const chunkDataEnd = chunkDataStart + chunkSize;
    const paddedChunkEnd = chunkDataEnd + (chunkSize % 2);
    if (chunkDataEnd < chunkDataStart || paddedChunkEnd > bytes.length) {
      return null;
    }

    if (chunkType === "VP8 ") {
      if (chunkSize < 10) {
        return null;
      }
      if (
        bytes[chunkDataStart + 3] !== 0x9d ||
        bytes[chunkDataStart + 4] !== 0x01 ||
        bytes[chunkDataStart + 5] !== 0x2a
      ) {
        return null;
      }
      const width = bytes.readUInt16LE(chunkDataStart + 6) & 0x3fff;
      const height = bytes.readUInt16LE(chunkDataStart + 8) & 0x3fff;
      if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
        return null;
      }
      dimensions = { width, height };
      sawPrimaryImageChunk = true;
    } else if (chunkType === "VP8L") {
      if (chunkSize < 5 || bytes[chunkDataStart] !== 0x2f) {
        return null;
      }
      const bits = bytes.readUInt32LE(chunkDataStart + 1);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >> 14) & 0x3fff) + 1;
      if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
        return null;
      }
      dimensions = { width, height };
      sawPrimaryImageChunk = true;
    } else if (chunkType === "VP8X") {
      if (chunkSize < 10) {
        return null;
      }
      const width = 1 + bytes.readUIntLE(chunkDataStart + 4, 3);
      const height = 1 + bytes.readUIntLE(chunkDataStart + 7, 3);
      if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
        return null;
      }
      dimensions ??= { width, height };
    }

    offset = paddedChunkEnd;
  }

  return sawPrimaryImageChunk && offset === bytes.length ? dimensions : null;
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

  if (!SUPPORTED_GENERATED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported generated image MIME type "${mimeType}".`);
  }

  const headerDimensions = readImageDimensions(bytes, mimeType);
  if (!headerDimensions) {
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
        : headerDimensions.width,
    height:
      typeof params.output.height === "number" &&
      Number.isInteger(params.output.height) &&
      params.output.height > 0
        ? params.output.height
        : headerDimensions.height,
  };
}
