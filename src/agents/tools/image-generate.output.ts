import sharp from "sharp";
import { detectMime, extensionForMime, kindFromMime } from "../../media/mime.js";
import type {
  GeneratedImageBinaryOutput,
  ImageGenerationAdapterResult,
  ValidatedGeneratedImage,
} from "./image-generate.types.js";

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

  const metadata = await sharp(bytes, { animated: true })
    .metadata()
    .catch(() => null);
  if (!metadata?.format) {
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
        : (metadata.width ?? undefined),
    height:
      typeof params.output.height === "number" &&
      Number.isInteger(params.output.height) &&
      params.output.height > 0
        ? params.output.height
        : (metadata.height ?? undefined),
  };
}
