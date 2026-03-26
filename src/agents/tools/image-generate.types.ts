import type { OpenClawConfig } from "../../config/config.js";
import { resolveAgentModelPrimaryValue } from "../../config/model-input.js";
import type {
  ComfyUiImageGenerationPresetConfig,
  ImageGenerationToolsConfig,
} from "../../config/types.tools.js";
import { clampInt } from "../../utils.js";
import { parseModelRef } from "../model-selection.js";

export const IMAGE_GENERATE_TOOL_NAME = "image_generate";
export const GENERATED_IMAGES_DIRNAME = "generated-images";
export const DEFAULT_GOOGLE_IMAGE_GENERATION_MODEL = "gemini-2.5-flash-image";
export const DEFAULT_GOOGLE_TIMEOUT_SECONDS = 120;
export const GOOGLE_TIMEOUT_SECONDS_CAP = 120;
export const DEFAULT_GOOGLE_MAX_INPUT_IMAGES = 14;
export const DEFAULT_GOOGLE_MAX_RESPONSE_BYTES = 20 * 1024 * 1024;
export const DEFAULT_COMFYUI_TIMEOUT_SECONDS = 60;
export const COMFYUI_TIMEOUT_SECONDS_CAP = 300;
export const DEFAULT_COMFYUI_POLL_INTERVAL_MS = 1000;
export const DEFAULT_COMFYUI_MAX_REQUEST_BYTES = 512 * 1024;
export const DEFAULT_COMFYUI_MAX_RESPONSE_BYTES = 20 * 1024 * 1024;
export const STALE_GOOGLE_IMAGE_GENERATION_MODELS = new Set(["gemini-3-pro-image-preview"]);
export const DEFAULT_LOCAL_COMFYUI_HOSTNAMES = ["localhost", "127.0.0.1", "::1"];

export const IMAGE_GENERATION_SIZES = ["1K", "2K", "4K"] as const;

export type ImageGenerationProvider = "google" | "comfyui";
export type ImageGenerationSize = (typeof IMAGE_GENERATION_SIZES)[number];

export type LoadedInputImage = {
  base64: string;
  mimeType: string;
  source: string;
};

export type ImageGenerateToolRequest = {
  prompt: string;
  provider?: ImageGenerationProvider;
  model?: string;
  size?: ImageGenerationSize;
  preset?: string;
  inputImages?: LoadedInputImage[];
  comfyui?: {
    negativePrompt?: string;
    seed?: number;
    steps?: number;
    cfgScale?: number;
    width?: number;
    height?: number;
    sampler?: string;
    scheduler?: string;
  };
};

export type GeneratedImageBinaryOutput = {
  bytes: Buffer;
  providerMimeType?: string;
  width?: number;
  height?: number;
  seed?: number;
  providerMetadata?: Record<string, unknown>;
};

export type ImageGenerationAdapterResult = {
  provider: ImageGenerationProvider;
  model?: string;
  workflowId?: string;
  jobId?: string;
  outputs: GeneratedImageBinaryOutput[];
};

export type ValidatedGeneratedImage = {
  bytes: Buffer;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  width?: number;
  height?: number;
};

export type SavedGeneratedImage = {
  localPath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
};

export function isImageGenerationProvider(value: string): value is ImageGenerationProvider {
  return value === "google" || value === "comfyui";
}

export function normalizeImageGenerationSize(value: unknown): ImageGenerationSize | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  return IMAGE_GENERATION_SIZES.find((candidate) => candidate === normalized);
}

export function getImageGenerationConfig(cfg?: OpenClawConfig): ImageGenerationToolsConfig | undefined {
  return cfg?.tools?.imageGeneration;
}

export function getConfiguredImageGenerationModelRef(cfg?: OpenClawConfig): string | undefined {
  return resolveAgentModelPrimaryValue(cfg?.agents?.defaults?.imageGenerationModel);
}

export function resolveConfiguredImageGenerationProvider(
  cfg?: OpenClawConfig,
): ImageGenerationProvider | undefined {
  const toolProvider = getImageGenerationConfig(cfg)?.defaultProvider;
  if (toolProvider && isImageGenerationProvider(toolProvider)) {
    return toolProvider;
  }
  const configuredModel = getConfiguredImageGenerationModelRef(cfg);
  if (!configuredModel) {
    return undefined;
  }
  return parseImageGenerationModelRef(configuredModel)?.provider;
}

export function parseImageGenerationModelRef(
  raw: string,
): { provider: ImageGenerationProvider; id: string } | null {
  const parsed = parseModelRef(raw, "google");
  if (!parsed || !isImageGenerationProvider(parsed.provider)) {
    return null;
  }
  return {
    provider: parsed.provider,
    id: parsed.model,
  };
}

export function resolveGoogleImageGenerationModel(params: {
  cfg?: OpenClawConfig;
  modelOverride?: string;
}): string {
  const explicit = params.modelOverride?.trim();
  if (explicit) {
    const parsed = parseImageGenerationModelRef(explicit);
    if (!parsed || parsed.provider !== "google") {
      throw new Error(`image_generate model must be google/<model-id>, got "${explicit}"`);
    }
    return assertSupportedGoogleGenerationModel(parsed.id);
  }

  const configModel = getImageGenerationConfig(params.cfg)?.google?.model?.trim();
  if (configModel) {
    return assertSupportedGoogleGenerationModel(configModel);
  }

  const defaultModel = getConfiguredImageGenerationModelRef(params.cfg);
  if (defaultModel) {
    const parsed = parseImageGenerationModelRef(defaultModel);
    if (parsed?.provider === "google") {
      return assertSupportedGoogleGenerationModel(parsed.id);
    }
  }

  return DEFAULT_GOOGLE_IMAGE_GENERATION_MODEL;
}

export function assertSupportedGoogleGenerationModel(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed) {
    throw new Error("Google image generation model required.");
  }
  if (STALE_GOOGLE_IMAGE_GENERATION_MODELS.has(trimmed)) {
    throw new Error(
      `Configured Google image generation model "${trimmed}" is stale or unsupported. Update tools.imageGeneration.google.model or agents.defaults.imageGenerationModel.`,
    );
  }
  return trimmed;
}

export function resolveGoogleImageGenerationTimeoutSeconds(cfg?: OpenClawConfig): number {
  const configured = getImageGenerationConfig(cfg)?.google?.timeoutSeconds;
  const raw =
    typeof configured === "number" && Number.isFinite(configured)
      ? configured
      : DEFAULT_GOOGLE_TIMEOUT_SECONDS;
  return clampInt(raw, 1, GOOGLE_TIMEOUT_SECONDS_CAP);
}

export function resolveGoogleImageGenerationMaxInputImages(cfg?: OpenClawConfig): number {
  const configured = getImageGenerationConfig(cfg)?.google?.maxInputImages;
  const raw =
    typeof configured === "number" && Number.isFinite(configured)
      ? configured
      : DEFAULT_GOOGLE_MAX_INPUT_IMAGES;
  return clampInt(raw, 1, DEFAULT_GOOGLE_MAX_INPUT_IMAGES);
}

export function resolveGoogleImageGenerationMaxResponseBytes(cfg?: OpenClawConfig): number {
  const configured = getImageGenerationConfig(cfg)?.google?.maxResponseBytes;
  const raw =
    typeof configured === "number" && Number.isFinite(configured)
      ? configured
      : DEFAULT_GOOGLE_MAX_RESPONSE_BYTES;
  return clampInt(raw, 1024, DEFAULT_GOOGLE_MAX_RESPONSE_BYTES);
}

export function resolveComfyUiTimeoutSeconds(cfg?: OpenClawConfig): number {
  const configured = getImageGenerationConfig(cfg)?.comfyui?.timeoutSeconds;
  const raw =
    typeof configured === "number" && Number.isFinite(configured)
      ? configured
      : DEFAULT_COMFYUI_TIMEOUT_SECONDS;
  return clampInt(raw, 1, COMFYUI_TIMEOUT_SECONDS_CAP);
}

export function resolveComfyUiPollIntervalMs(cfg?: OpenClawConfig): number {
  const configured = getImageGenerationConfig(cfg)?.comfyui?.pollIntervalMs;
  const raw =
    typeof configured === "number" && Number.isFinite(configured)
      ? configured
      : DEFAULT_COMFYUI_POLL_INTERVAL_MS;
  return clampInt(raw, 250, 10_000);
}

export function resolveComfyUiMaxRequestBytes(cfg?: OpenClawConfig): number {
  const configured = getImageGenerationConfig(cfg)?.comfyui?.maxRequestBytes;
  const raw =
    typeof configured === "number" && Number.isFinite(configured)
      ? configured
      : DEFAULT_COMFYUI_MAX_REQUEST_BYTES;
  return clampInt(raw, 1024, 5 * 1024 * 1024);
}

export function resolveComfyUiMaxResponseBytes(cfg?: OpenClawConfig): number {
  const configured = getImageGenerationConfig(cfg)?.comfyui?.maxResponseBytes;
  const raw =
    typeof configured === "number" && Number.isFinite(configured)
      ? configured
      : DEFAULT_COMFYUI_MAX_RESPONSE_BYTES;
  return clampInt(raw, 1024, 50 * 1024 * 1024);
}

export function resolveComfyUiPreset(params: {
  cfg?: OpenClawConfig;
  presetOverride?: string;
  modelOverride?: string;
}): { presetId: string; preset: ComfyUiImageGenerationPresetConfig } {
  const config = getImageGenerationConfig(params.cfg)?.comfyui;
  const presetId = (() => {
    const explicitModel = params.modelOverride?.trim();
    if (explicitModel) {
      const parsed = parseImageGenerationModelRef(explicitModel);
      if (!parsed || parsed.provider !== "comfyui") {
        throw new Error(`image_generate model must be comfyui/<preset-id>, got "${explicitModel}"`);
      }
      return parsed.id;
    }
    const presetOverride = params.presetOverride?.trim();
    if (presetOverride) {
      return presetOverride;
    }
    const explicitDefault = config?.defaultPreset?.trim();
    if (explicitDefault) {
      return explicitDefault;
    }
    const configuredModel = getConfiguredImageGenerationModelRef(params.cfg);
    if (configuredModel) {
      const parsed = parseImageGenerationModelRef(configuredModel);
      if (parsed?.provider === "comfyui") {
        return parsed.id;
      }
    }
    throw new Error(
      "ComfyUI preset required. Set tools.imageGeneration.comfyui.defaultPreset, agents.defaults.imageGenerationModel, or pass preset/model.",
    );
  })();

  const preset = config?.presets?.[presetId];
  if (!preset) {
    throw new Error(`Unknown ComfyUI preset "${presetId}".`);
  }
  return { presetId, preset };
}

export function resolveAvailableImageGenerationProviders(params: {
  cfg?: OpenClawConfig;
  googleAvailable: boolean;
  comfyuiAvailable: boolean;
}): ImageGenerationProvider[] {
  const providers: ImageGenerationProvider[] = [];
  if (params.googleAvailable) {
    providers.push("google");
  }
  if (params.comfyuiAvailable) {
    providers.push("comfyui");
  }
  return providers;
}
