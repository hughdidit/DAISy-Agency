import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { resolveUserPath } from "../../utils.js";
import { loadWebMediaRaw } from "../../web/media.js";
import { resolveEnvApiKey } from "../model-auth.js";
import {
  imageResultFromFile,
  readNumberParam,
  readStringArrayParam,
  readStringParam,
  ToolInputError,
} from "./common.js";
import { buildComfyUiWorkflow } from "./image-generate.comfyui-preset.js";
import {
  selectSingleGeneratedOutput,
  validateGeneratedImageOutput,
} from "./image-generate.output.js";
import { generateImageWithComfyUi } from "./image-generate.providers.comfyui.js";
import { generateImageWithGoogle } from "./image-generate.providers.google.js";
import { saveGeneratedImage } from "./image-generate.storage.js";
import {
  getImageGenerationConfig,
  IMAGE_GENERATE_TOOL_NAME,
  isImageGenerationProvider,
  normalizeImageGenerationSize,
  parseImageGenerationModelRef,
  resolveAvailableImageGenerationProviders,
  resolveComfyUiPreset,
  resolveConfiguredImageGenerationProvider,
  resolveGoogleImageGenerationMaxInputImages,
  type ImageGenerateToolRequest,
  type ImageGenerationProvider,
  type LoadedInputImage,
} from "./image-generate.types.js";
import { resolveMediaToolLocalRoots } from "./media-tool-shared.js";
import { hasAuthForProvider } from "./model-config.helpers.js";
import {
  createSandboxBridgeReadFile,
  resolveSandboxedBridgeMediaPath,
  type AnyAgentTool,
  type SandboxedBridgeMediaPathConfig,
  type SandboxFsBridge,
  type ToolFsPolicy,
} from "./tool-runtime.helpers.js";

type ImageGenerateSandboxConfig = {
  root: string;
  bridge: SandboxFsBridge;
};

function parseRequestedProvider(
  params: Record<string, unknown>,
): ImageGenerationProvider | undefined {
  const raw = readStringParam(params, "provider");
  if (!raw) {
    return undefined;
  }
  const normalized = raw.trim().toLowerCase();
  if (!isImageGenerationProvider(normalized)) {
    throw new ToolInputError(`Unsupported image generation provider "${raw}".`);
  }
  return normalized;
}

function parsePrompt(params: Record<string, unknown>): string {
  return readStringParam(params, "prompt", {
    required: true,
    label: "prompt",
  });
}

function parseComfyUiOverrides(params: Record<string, unknown>) {
  return {
    negativePrompt: readStringParam(params, "negativePrompt"),
    seed: readNumberParam(params, "seed", { integer: true }),
    steps: readNumberParam(params, "steps", { integer: true }),
    cfgScale: readNumberParam(params, "cfgScale"),
    width: readNumberParam(params, "width", { integer: true }),
    height: readNumberParam(params, "height", { integer: true }),
    sampler: readStringParam(params, "sampler"),
    scheduler: readStringParam(params, "scheduler"),
  };
}

function resolveEffectiveProvider(params: {
  cfg?: OpenClawConfig;
  requestedProvider?: ImageGenerationProvider;
  requestedModel?: string;
  hasInputImages: boolean;
  availableProviders: ImageGenerationProvider[];
}): ImageGenerationProvider {
  if (params.requestedProvider) {
    return params.requestedProvider;
  }

  const parsedModel = params.requestedModel
    ? parseImageGenerationModelRef(params.requestedModel)
    : null;
  if (parsedModel) {
    return parsedModel.provider;
  }

  if (params.hasInputImages) {
    if (!params.availableProviders.includes("google")) {
      throw new Error(
        "Google image generation is required for input-image requests, but Google is not configured.",
      );
    }
    return "google";
  }

  const configuredProvider = resolveConfiguredImageGenerationProvider(params.cfg);
  if (configuredProvider && params.availableProviders.includes(configuredProvider)) {
    return configuredProvider;
  }

  if (params.availableProviders.length === 1) {
    return params.availableProviders[0];
  }

  throw new Error(
    "image_generate provider is ambiguous. Set tools.imageGeneration.defaultProvider, agents.defaults.imageGenerationModel, or pass provider/model explicitly.",
  );
}

async function loadGoogleInputImages(params: {
  imageInputs: string[];
  workspaceDir?: string;
  sandbox?: ImageGenerateSandboxConfig;
  fsPolicy?: ToolFsPolicy;
}): Promise<LoadedInputImage[]> {
  if (params.imageInputs.length === 0) {
    return [];
  }

  const localRoots = resolveMediaToolLocalRoots(params.workspaceDir, {
    workspaceOnly: params.fsPolicy?.workspaceOnly === true,
  });
  const sandboxConfig: SandboxedBridgeMediaPathConfig | null = params.sandbox?.root.trim()
    ? {
        root: params.sandbox.root.trim(),
        bridge: params.sandbox.bridge,
        workspaceOnly: params.fsPolicy?.workspaceOnly === true,
      }
    : null;

  const results: LoadedInputImage[] = [];
  for (const rawInput of params.imageInputs) {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      continue;
    }
    const directInput = trimmed.startsWith("@") ? trimmed.slice(1).trim() : trimmed;
    if (!directInput) {
      continue;
    }

    const resolvedInput = (() => {
      if (sandboxConfig) {
        return directInput;
      }
      if (directInput.startsWith("~")) {
        return resolveUserPath(directInput);
      }
      return directInput;
    })();

    const isRemoteUrl = /^https?:\/\//i.test(resolvedInput);
    if (sandboxConfig && isRemoteUrl) {
      throw new Error("Sandboxed image_generate does not allow remote input image URLs.");
    }

    const resolvedPath = sandboxConfig
      ? await resolveSandboxedBridgeMediaPath({
          sandbox: sandboxConfig,
          mediaPath: resolvedInput,
          inboundFallbackDir: "media/inbound",
        })
      : { resolved: resolvedInput };

    const media = sandboxConfig
      ? await loadWebMediaRaw(resolvedPath.resolved, {
          sandboxValidated: true,
          readFile: createSandboxBridgeReadFile({ sandbox: sandboxConfig }),
        })
      : await loadWebMediaRaw(resolvedPath.resolved, { localRoots });

    if (media.kind !== "image") {
      throw new Error(`Input image "${rawInput}" is not an image.`);
    }
    const mimeType = media.contentType ?? "image/png";
    results.push({
      base64: media.buffer.toString("base64"),
      mimeType,
      source: resolvedPath.resolved,
    });
  }

  return results;
}

function buildRequestFingerprint(params: {
  provider: ImageGenerationProvider;
  request: ImageGenerateToolRequest;
}): string {
  return JSON.stringify({
    provider: params.provider,
    prompt: params.request.prompt,
    model: params.request.model,
    preset: params.request.preset,
    size: params.request.size,
    inputImages: params.request.inputImages?.map((image) => image.source) ?? [],
    comfyui: params.request.comfyui ?? {},
  });
}

export function createImageGenerateTool(options?: {
  config?: OpenClawConfig;
  agentDir?: string;
  workspaceDir?: string;
  sandbox?: ImageGenerateSandboxConfig;
  fsPolicy?: ToolFsPolicy;
}): AnyAgentTool | null {
  const config = getImageGenerationConfig(options?.config);
  if (config?.enabled === false) {
    return null;
  }

  const googleAvailable =
    Boolean(resolveEnvApiKey("google")?.apiKey) ||
    (Boolean(options?.agentDir?.trim()) &&
      hasAuthForProvider({
        provider: "google",
        agentDir: options!.agentDir!.trim(),
      }));
  const comfyuiConfig = config?.comfyui;
  const comfyuiAvailable =
    Boolean(comfyuiConfig?.baseUrl?.trim()) &&
    Boolean(comfyuiConfig?.presets && Object.keys(comfyuiConfig.presets).length > 0);

  const availableProviders = resolveAvailableImageGenerationProviders({
    cfg: options?.config,
    googleAvailable,
    comfyuiAvailable,
  });
  if (availableProviders.length === 0) {
    return null;
  }

  return {
    name: IMAGE_GENERATE_TOOL_NAME,
    label: "Image Generate",
    description:
      "Generate a single image artifact and save it into the workspace. Supports Google Nano Banana and configured ComfyUI presets. Returns MEDIA:<path> plus structured file metadata for downstream delivery tools.",
    parameters: Type.Object({
      prompt: Type.String(),
      provider: Type.Optional(Type.String({ description: "google or comfyui" })),
      model: Type.Optional(
        Type.String({
          description: "Provider/model override. Use google/<model-id> or comfyui/<preset-id>.",
        }),
      ),
      image: Type.Optional(
        Type.String({ description: "Optional Google input image path or URL." }),
      ),
      images: Type.Optional(
        Type.Array(Type.String(), { description: "Optional Google input images." }),
      ),
      size: Type.Optional(
        Type.String({ description: "Optional output size hint: 1K, 2K, or 4K." }),
      ),
      resolution: Type.Optional(Type.String({ description: "Alias for size." })),
      preset: Type.Optional(Type.String({ description: "Optional ComfyUI preset override." })),
      negativePrompt: Type.Optional(Type.String()),
      seed: Type.Optional(Type.Number()),
      steps: Type.Optional(Type.Number()),
      cfgScale: Type.Optional(Type.Number()),
      width: Type.Optional(Type.Number()),
      height: Type.Optional(Type.Number()),
      sampler: Type.Optional(Type.String()),
      scheduler: Type.Optional(Type.String()),
    }),
    execute: async (_toolCallId, rawArgs) => {
      const params =
        rawArgs && typeof rawArgs === "object" ? (rawArgs as Record<string, unknown>) : {};
      const prompt = parsePrompt(params);
      const requestedProvider = parseRequestedProvider(params);
      const requestedModel = readStringParam(params, "model");
      const preset = readStringParam(params, "preset");
      const size =
        normalizeImageGenerationSize(params.size) ??
        normalizeImageGenerationSize(params.resolution);
      if ((params.size || params.resolution) && !size) {
        throw new ToolInputError("size/resolution must be one of 1K, 2K, or 4K.");
      }

      const imageInputs = [
        ...(readStringParam(params, "image") ? [readStringParam(params, "image")!] : []),
        ...(readStringArrayParam(params, "images") ?? []),
      ].filter(Boolean);

      const provider = resolveEffectiveProvider({
        cfg: options?.config,
        requestedProvider,
        requestedModel,
        hasInputImages: imageInputs.length > 0,
        availableProviders,
      });

      if (provider === "comfyui" && imageInputs.length > 0) {
        throw new Error("ComfyUI input-image editing is not supported in image_generate v1.");
      }

      if (provider === "google") {
        const maxInputImages = resolveGoogleImageGenerationMaxInputImages(options?.config);
        if (imageInputs.length > maxInputImages) {
          throw new Error(
            `Too many input images: ${imageInputs.length}. Google image generation allows at most ${maxInputImages}.`,
          );
        }
      }

      const inputImages =
        provider === "google"
          ? await loadGoogleInputImages({
              imageInputs,
              workspaceDir: options?.workspaceDir,
              sandbox: options?.sandbox,
              fsPolicy: options?.fsPolicy,
            })
          : [];

      const request: ImageGenerateToolRequest = {
        prompt,
        provider,
        model: requestedModel,
        preset,
        size,
        inputImages,
        comfyui: parseComfyUiOverrides(params),
      };

      if (provider === "comfyui") {
        buildComfyUiWorkflow({
          preset: resolveComfyUiPreset({
            cfg: options?.config,
            presetOverride: preset,
            modelOverride: requestedModel,
          }).preset,
          request,
        });
      }

      const adapterResult =
        provider === "google"
          ? await generateImageWithGoogle({
              cfg: options?.config,
              agentDir: options?.agentDir,
              request,
            })
          : await generateImageWithComfyUi({
              cfg: options?.config,
              request,
            });

      const output = selectSingleGeneratedOutput(adapterResult);
      const validated = await validateGeneratedImageOutput({
        provider,
        output,
      });
      const saved = await saveGeneratedImage({
        workspaceDir: options?.workspaceDir,
        sandbox: options?.sandbox,
        validated,
        requestFingerprint: buildRequestFingerprint({ provider, request }),
      });

      return await imageResultFromFile({
        label: IMAGE_GENERATE_TOOL_NAME,
        path: saved.localPath,
        details: {
          localPath: saved.localPath,
          fileName: saved.fileName,
          mimeType: saved.mimeType,
          provider,
          ...(adapterResult.model ? { model: adapterResult.model } : {}),
          ...(adapterResult.workflowId ? { workflowId: adapterResult.workflowId } : {}),
          ...(saved.width ? { width: saved.width } : {}),
          ...(saved.height ? { height: saved.height } : {}),
          sizeBytes: saved.sizeBytes,
          ...(typeof output.seed === "number" ? { seed: output.seed } : {}),
          ...(adapterResult.jobId ? { jobId: adapterResult.jobId } : {}),
        },
      });
    },
  };
}
