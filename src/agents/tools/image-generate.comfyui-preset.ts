import type { ComfyUiImageGenerationPresetConfig } from "../../config/types.tools.js";
import type { ImageGenerateToolRequest } from "./image-generate.types.js";

type ComfyUiInputValue = string | number;

const PATCHABLE_COMFYUI_FIELDS = [
  "prompt",
  "negativePrompt",
  "seed",
  "steps",
  "cfgScale",
  "width",
  "height",
  "sampler",
  "scheduler",
] as const;

type PatchableComfyUiField = (typeof PATCHABLE_COMFYUI_FIELDS)[number];

export type BuiltComfyUiWorkflow = {
  workflow: Record<string, Record<string, unknown>>;
  outputNodeId?: string;
  outputImageIndex?: number;
};

function deepCloneWorkflow(
  workflow: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  return JSON.parse(JSON.stringify(workflow)) as Record<string, Record<string, unknown>>;
}

function resolveRequestValue(
  request: ImageGenerateToolRequest,
  field: PatchableComfyUiField,
): ComfyUiInputValue | undefined {
  switch (field) {
    case "prompt":
      return request.prompt;
    case "negativePrompt":
      return request.comfyui?.negativePrompt;
    case "seed":
      return request.comfyui?.seed;
    case "steps":
      return request.comfyui?.steps;
    case "cfgScale":
      return request.comfyui?.cfgScale;
    case "width":
      return request.comfyui?.width;
    case "height":
      return request.comfyui?.height;
    case "sampler":
      return request.comfyui?.sampler;
    case "scheduler":
      return request.comfyui?.scheduler;
  }
}

export function buildComfyUiWorkflow(params: {
  preset: ComfyUiImageGenerationPresetConfig;
  request: ImageGenerateToolRequest;
}): BuiltComfyUiWorkflow {
  const workflow = deepCloneWorkflow(params.preset.workflow);

  for (const field of PATCHABLE_COMFYUI_FIELDS) {
    const mapping = params.preset.inputs?.[field];
    const value = resolveRequestValue(params.request, field);
    if (!mapping || value === undefined) {
      continue;
    }
    const node = workflow[mapping.nodeId];
    if (!node || typeof node !== "object") {
      throw new Error(
        `ComfyUI preset references missing node "${mapping.nodeId}" for field "${field}".`,
      );
    }
    const inputs = node.inputs;
    if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
      throw new Error(
        `ComfyUI preset node "${mapping.nodeId}" does not expose an inputs object for field "${field}".`,
      );
    }
    (inputs as Record<string, unknown>)[mapping.inputName] = value;
  }

  return {
    workflow,
    outputNodeId: params.preset.output?.nodeId,
    outputImageIndex: params.preset.output?.imageIndex,
  };
}
