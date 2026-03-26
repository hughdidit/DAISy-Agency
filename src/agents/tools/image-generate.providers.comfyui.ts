import type { OpenClawConfig } from "../../config/config.js";
import { fetchWithSsrFGuard, withStrictGuardedFetchMode } from "../../infra/net/fetch-guard.js";
import { readResponseWithLimit } from "../../media/read-response-with-limit.js";
import { isRecord, sleep } from "../../utils.js";
import { buildComfyUiWorkflow } from "./image-generate.comfyui-preset.js";
import {
  DEFAULT_LOCAL_COMFYUI_HOSTNAMES,
  resolveComfyUiMaxRequestBytes,
  resolveComfyUiMaxResponseBytes,
  resolveComfyUiPollIntervalMs,
  resolveComfyUiPreset,
  resolveComfyUiTimeoutSeconds,
  type ImageGenerateToolRequest,
  type ImageGenerationAdapterResult,
} from "./image-generate.types.js";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type ComfyUiImageReference = {
  filename: string;
  subfolder?: string;
  type?: string;
};

function resolveComfyUiBaseUrl(cfg?: OpenClawConfig): URL {
  const raw = cfg?.tools?.imageGeneration?.comfyui?.baseUrl?.trim();
  if (!raw) {
    throw new Error("ComfyUI base URL is not configured.");
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch (error) {
    throw new Error(`Invalid ComfyUI base URL "${raw}".`, { cause: error });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("ComfyUI base URL must use http or https.");
  }
  return parsed;
}

function resolveComfyUiAllowedHostnames(cfg?: OpenClawConfig): string[] {
  const comfy = cfg?.tools?.imageGeneration?.comfyui;
  const configured = comfy?.allowedHostnames?.map((entry) => entry.trim()).filter(Boolean) ?? [];
  if (comfy?.allowRemote === true) {
    return configured;
  }
  return configured.length > 0 ? configured : DEFAULT_LOCAL_COMFYUI_HOSTNAMES;
}

function assertComfyUiTargetAllowed(baseUrl: URL, cfg?: OpenClawConfig): string[] {
  const comfy = cfg?.tools?.imageGeneration?.comfyui;
  const hostname = baseUrl.hostname.trim().toLowerCase();
  const allowedHostnames = resolveComfyUiAllowedHostnames(cfg);
  const isAllowed = allowedHostnames.some((entry) => entry.toLowerCase() === hostname);

  if (comfy?.allowRemote === true) {
    if (!isAllowed) {
      throw new Error(
        `ComfyUI hostname "${hostname}" is not allowlisted. Add it to tools.imageGeneration.comfyui.allowedHostnames.`,
      );
    }
    return allowedHostnames;
  }

  if (!isAllowed) {
    throw new Error(
      `ComfyUI remote targets are disabled by default. Refusing "${hostname}". Set tools.imageGeneration.comfyui.allowRemote=true and allowlist the hostname to override.`,
    );
  }
  return allowedHostnames;
}

async function readJsonResponse(response: Response, maxBytes: number): Promise<unknown> {
  const body = await readResponseWithLimit(response, maxBytes);
  return JSON.parse(body.toString("utf8")) as unknown;
}

async function readJsonAndRelease(
  result: { response: Response; release: () => Promise<void> },
  maxBytes: number,
): Promise<unknown> {
  try {
    return await readJsonResponse(result.response, maxBytes);
  } finally {
    await result.release();
  }
}

async function readBytesAndRelease(
  result: { response: Response; release: () => Promise<void> },
  maxBytes: number,
): Promise<Buffer> {
  try {
    return await readResponseWithLimit(result.response, maxBytes);
  } finally {
    await result.release();
  }
}

function listComfyUiOutputImages(params: {
  historyEntry: Record<string, unknown>;
  outputNodeId?: string;
  outputImageIndex?: number;
}): ComfyUiImageReference[] {
  const outputsValue = params.historyEntry.outputs;
  if (!isRecord(outputsValue)) {
    return [];
  }

  const nodeEntries = params.outputNodeId
    ? [[params.outputNodeId, outputsValue[params.outputNodeId]]]
    : Object.entries(outputsValue);
  const results: ComfyUiImageReference[] = [];

  for (const [, nodeValue] of nodeEntries) {
    if (!isRecord(nodeValue) || !Array.isArray(nodeValue.images)) {
      continue;
    }
    const images = nodeValue.images.filter(
      (entry): entry is ComfyUiImageReference =>
        isRecord(entry) && typeof entry.filename === "string" && entry.filename.trim().length > 0,
    );
    if (
      typeof params.outputImageIndex === "number" &&
      Number.isFinite(params.outputImageIndex) &&
      params.outputImageIndex >= 0
    ) {
      const selected = images[params.outputImageIndex];
      if (selected) {
        results.push(selected);
      }
      continue;
    }
    results.push(...images);
  }

  return results;
}

function extractHistoryEntry(
  historyJson: unknown,
  promptId: string,
): Record<string, unknown> | null {
  if (!isRecord(historyJson)) {
    return null;
  }
  const entry = historyJson[promptId];
  return isRecord(entry) ? entry : null;
}

async function guardedFetch(params: {
  url: string;
  init?: RequestInit;
  timeoutMs: number;
  allowedHostnames: string[];
  fetchImpl?: FetchLike;
}): Promise<{ response: Response; release: () => Promise<void> }> {
  const guarded = await fetchWithSsrFGuard(
    withStrictGuardedFetchMode({
      url: params.url,
      init: params.init,
      timeoutMs: params.timeoutMs,
      fetchImpl: params.fetchImpl,
      policy: {
        allowedHostnames: params.allowedHostnames,
      },
      auditContext: "image-generate:comfyui",
    }),
  );
  return {
    response: guarded.response,
    release: guarded.release,
  };
}

export async function generateImageWithComfyUi(params: {
  cfg?: OpenClawConfig;
  request: ImageGenerateToolRequest;
  fetchImpl?: FetchLike;
}): Promise<ImageGenerationAdapterResult> {
  const baseUrl = resolveComfyUiBaseUrl(params.cfg);
  const allowedHostnames = assertComfyUiTargetAllowed(baseUrl, params.cfg);
  const { presetId, preset } = resolveComfyUiPreset({
    cfg: params.cfg,
    presetOverride: params.request.preset,
    modelOverride: params.request.model,
  });
  const workflow = buildComfyUiWorkflow({
    preset,
    request: params.request,
  });

  const maxRequestBytes = resolveComfyUiMaxRequestBytes(params.cfg);
  const maxResponseBytes = resolveComfyUiMaxResponseBytes(params.cfg);
  const timeoutMs = resolveComfyUiTimeoutSeconds(params.cfg) * 1000;
  const pollIntervalMs = resolveComfyUiPollIntervalMs(params.cfg);
  const submitBody = JSON.stringify({ prompt: workflow.workflow });
  const submitBytes = Buffer.byteLength(submitBody, "utf8");
  if (submitBytes > maxRequestBytes) {
    throw new Error(
      `ComfyUI workflow request exceeds the configured size limit (${submitBytes} bytes > ${maxRequestBytes} bytes).`,
    );
  }

  const submitResult = await guardedFetch({
    url: new URL("/prompt", baseUrl).toString(),
    timeoutMs,
    allowedHostnames,
    fetchImpl: params.fetchImpl,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: submitBody,
    },
  });
  if (!submitResult.response.ok) {
    const text = (await readBytesAndRelease(submitResult, 256 * 1024)).toString("utf8").trim();
    throw new Error(
      `ComfyUI workflow submission failed (${submitResult.response.status} ${submitResult.response.statusText})${text ? `: ${text}` : ""}`,
    );
  }
  const submitted = (await readJsonAndRelease(submitResult, 256 * 1024)) as Record<string, unknown>;
  const promptId =
    typeof submitted.prompt_id === "string"
      ? submitted.prompt_id
      : typeof submitted.promptId === "string"
        ? submitted.promptId
        : undefined;
  if (!promptId) {
    throw new Error("ComfyUI workflow submission did not return a prompt_id.");
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const historyResult = await guardedFetch({
      url: new URL(`/history/${encodeURIComponent(promptId)}`, baseUrl).toString(),
      timeoutMs: Math.min(timeoutMs, pollIntervalMs * 4),
      allowedHostnames,
      fetchImpl: params.fetchImpl,
    });
    if (!historyResult.response.ok) {
      const text = (await readBytesAndRelease(historyResult, 256 * 1024)).toString("utf8").trim();
      throw new Error(
        `ComfyUI history polling failed (${historyResult.response.status} ${historyResult.response.statusText})${text ? `: ${text}` : ""}`,
      );
    }
    const historyJson = await readJsonAndRelease(historyResult, maxResponseBytes);
    const historyEntry = extractHistoryEntry(historyJson, promptId);
    if (historyEntry) {
      if (historyEntry.outputs !== undefined && !isRecord(historyEntry.outputs)) {
        throw new Error(`ComfyUI history result for prompt "${promptId}" is malformed.`);
      }
      const images = listComfyUiOutputImages({
        historyEntry,
        outputNodeId: workflow.outputNodeId,
        outputImageIndex: workflow.outputImageIndex,
      });
      if (images.length > 1) {
        throw new Error(
          `ComfyUI workflow "${presetId}" returned multiple image outputs; configure a deterministic output node/index for v1.`,
        );
      }
      if (images.length === 1) {
        const image = images[0];
        const viewUrl = new URL("/view", baseUrl);
        viewUrl.searchParams.set("filename", image.filename);
        if (image.subfolder) {
          viewUrl.searchParams.set("subfolder", image.subfolder);
        }
        if (image.type) {
          viewUrl.searchParams.set("type", image.type);
        }
        const imageResult = await guardedFetch({
          url: viewUrl.toString(),
          timeoutMs: Math.min(timeoutMs, 30_000),
          allowedHostnames,
          fetchImpl: params.fetchImpl,
        });
        if (!imageResult.response.ok) {
          const text = (await readBytesAndRelease(imageResult, 256 * 1024)).toString("utf8").trim();
          throw new Error(
            `ComfyUI image retrieval failed (${imageResult.response.status} ${imageResult.response.statusText})${text ? `: ${text}` : ""}`,
          );
        }
        const bytes = await readBytesAndRelease(imageResult, maxResponseBytes);
        return {
          provider: "comfyui",
          workflowId: presetId,
          jobId: promptId,
          outputs: [{ bytes }],
        };
      }
      if (historyEntry.outputs !== undefined) {
        throw new Error(
          `ComfyUI history result for prompt "${promptId}" contained no usable image output.`,
        );
      }
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `ComfyUI image generation timed out after ${resolveComfyUiTimeoutSeconds(params.cfg)} seconds.`,
  );
}
