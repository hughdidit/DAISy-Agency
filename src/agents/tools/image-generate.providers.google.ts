import type { OpenClawConfig } from "../../config/config.js";
import { readResponseWithLimit } from "../../media/read-response-with-limit.js";
import { isRecord, safeParseJson } from "../../utils.js";
import { resolveApiKeyForProvider, requireApiKey } from "../model-auth.js";
import {
  assertSupportedGoogleGenerationModel,
  resolveGoogleImageGenerationMaxResponseBytes,
  resolveGoogleImageGenerationModel,
  resolveGoogleImageGenerationTimeoutSeconds,
  type ImageGenerateToolRequest,
  type ImageGenerationAdapterResult,
} from "./image-generate.types.js";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type GeminiInlineData = {
  data?: string;
  mimeType?: string;
  mime_type?: string;
};

function bufferLooksLikeImage(bytes: Buffer): boolean {
  return (
    (bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a) ||
    (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (bytes.length >= 4 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38) ||
    (bytes.length >= 12 &&
      bytes.subarray(0, 4).equals(Buffer.from("RIFF")) &&
      bytes.subarray(8, 12).equals(Buffer.from("WEBP")))
  );
}

function withAbortTimeout(timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

function appendGoogleSizeHint(prompt: string, size?: string): string {
  if (!size) {
    return prompt;
  }
  return `${prompt}\n\nOutput requirements: return a single final image targeting ${size} resolution.`;
}

function collectInlineImageParts(value: unknown, output: GeminiInlineData[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectInlineImageParts(item, output);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }

  const inlineData = (() => {
    const candidate = value.inlineData ?? value.inline_data;
    return isRecord(candidate) ? (candidate as GeminiInlineData) : null;
  })();

  if (inlineData?.data) {
    output.push(inlineData);
  }

  for (const child of Object.values(value)) {
    collectInlineImageParts(child, output);
  }
}

function extractGoogleInlineImages(json: unknown): Array<{ bytes: Buffer; mimeType?: string }> {
  const inlineImages: GeminiInlineData[] = [];
  collectInlineImageParts(json, inlineImages);
  return inlineImages.flatMap((entry) => {
    if (typeof entry.data !== "string") {
      return [];
    }
    const data = entry.data.trim();
    if (!data) {
      return [];
    }
    const mimeType =
      typeof entry.mimeType === "string"
        ? entry.mimeType
        : typeof entry.mime_type === "string"
          ? entry.mime_type
          : undefined;
    const bytes = Buffer.from(data, "base64");
    const declaredAsImage = mimeType ? mimeType.toLowerCase().startsWith("image/") : true;
    const looksLikeImage = bufferLooksLikeImage(bytes);
    return declaredAsImage && looksLikeImage && bytes.length > 0 ? [{ bytes, mimeType }] : [];
  });
}

function extractGoogleErrorMessage(body: string): string | undefined {
  const parsed = safeParseJson<Record<string, unknown>>(body);
  const error = parsed?.error;
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return body.trim() || undefined;
}

export async function generateImageWithGoogle(params: {
  cfg?: OpenClawConfig;
  agentDir?: string;
  request: ImageGenerateToolRequest;
  fetchImpl?: FetchLike;
}): Promise<ImageGenerationAdapterResult> {
  const auth = await resolveApiKeyForProvider({
    provider: "google",
    cfg: params.cfg,
    agentDir: params.agentDir,
  });
  const apiKey = requireApiKey(auth, "google");
  const modelId = resolveGoogleImageGenerationModel({
    cfg: params.cfg,
    modelOverride: params.request.model,
  });
  assertSupportedGoogleGenerationModel(modelId);

  const baseUrl = (
    params.cfg?.models?.providers?.google?.baseUrl ?? "https://generativelanguage.googleapis.com"
  ).replace(/\/+$/, "");
  const timeoutMs = resolveGoogleImageGenerationTimeoutSeconds(params.cfg) * 1000;
  const timeoutSeconds = Math.round(timeoutMs / 1000);
  const maxResponseBytes = resolveGoogleImageGenerationMaxResponseBytes(params.cfg);
  const fetchImpl = params.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("fetch is not available");
  }

  const parts: Array<Record<string, unknown>> = [];
  for (const image of params.request.inputImages ?? []) {
    parts.push({
      inline_data: {
        mime_type: image.mimeType,
        data: image.base64,
      },
    });
  }
  parts.push({
    text: appendGoogleSizeHint(params.request.prompt, params.request.size),
  });

  const requestBody = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
    },
  };

  const { signal, cleanup } = withAbortTimeout(timeoutMs);
  try {
    const response = await fetchImpl(
      `${baseUrl}/v1beta/models/${encodeURIComponent(modelId)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
        signal,
      },
    );

    if (!response.ok) {
      const body = (await readResponseWithLimit(response, 256 * 1024)).toString("utf8");
      const message = extractGoogleErrorMessage(body);
      const staleHint =
        typeof message === "string" && /model|unsupported|deprecated|not found/i.test(message)
          ? ` ${message}`
          : message
            ? ` ${message}`
            : "";
      throw new Error(
        `Google image generation request failed (${response.status} ${response.statusText}).${staleHint}`.trim(),
      );
    }

    const body = await readResponseWithLimit(response, maxResponseBytes);
    const json = JSON.parse(body.toString("utf8")) as unknown;
    const images = extractGoogleInlineImages(json);
    if (images.length === 0) {
      throw new Error("Google image generation returned no image output.");
    }

    return {
      provider: "google",
      model: modelId,
      outputs: images.map((image) => ({
        bytes: image.bytes,
        providerMimeType: image.mimeType,
      })),
    };
  } catch (error) {
    if ((error as { name?: string } | null)?.name === "AbortError") {
      throw new Error(`Google image generation timed out after ${timeoutSeconds} seconds.`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    cleanup();
  }
}
