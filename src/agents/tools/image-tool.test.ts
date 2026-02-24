import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OpenClawConfig } from "../../config/config.js";
<<<<<<< HEAD
=======
import type { ModelDefinitionConfig } from "../../config/types.models.js";
import { withFetchPreconnect } from "../../test-utils/fetch-mock.js";
import { createOpenClawCodingTools } from "../pi-tools.js";
import type { SandboxContext } from "../sandbox.js";
import type { SandboxFsBridge, SandboxResolvedPath } from "../sandbox/fs-bridge.js";
import {
  createHostSandboxFsBridge,
  createSandboxFsBridgeFromResolver,
} from "../test-helpers/host-sandbox-fs-bridge.js";
import { createPiToolsSandboxContext } from "../test-helpers/pi-tools-sandbox-context.js";
>>>>>>> dd9d9c1c6 (fix(security): enforce workspaceOnly for sandbox image tool)
import { __testing, createImageTool, resolveImageModelConfigForTool } from "./image-tool.js";

async function writeAuthProfiles(agentDir: string, profiles: unknown) {
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(
    path.join(agentDir, "auth-profiles.json"),
    `${JSON.stringify(profiles, null, 2)}\n`,
    "utf8",
  );
}

<<<<<<< HEAD
=======
async function withTempAgentDir<T>(run: (agentDir: string) => Promise<T>): Promise<T> {
  const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
  try {
    return await run(agentDir);
  } finally {
    await fs.rm(agentDir, { recursive: true, force: true });
  }
}

const ONE_PIXEL_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=";
const ONE_PIXEL_GIF_B64 = "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";

async function withTempWorkspacePng(
  cb: (args: { workspaceDir: string; imagePath: string }) => Promise<void>,
) {
  const workspaceParent = await fs.mkdtemp(path.join(process.cwd(), ".openclaw-workspace-image-"));
  try {
    const workspaceDir = path.join(workspaceParent, "workspace");
    await fs.mkdir(workspaceDir, { recursive: true });
    const imagePath = path.join(workspaceDir, "photo.png");
    await fs.writeFile(imagePath, Buffer.from(ONE_PIXEL_PNG_B64, "base64"));
    await cb({ workspaceDir, imagePath });
  } finally {
    await fs.rm(workspaceParent, { recursive: true, force: true });
  }
}

function createUnsafeMountedBridge(params: {
  root: string;
  agentHostRoot: string;
  workspaceContainerRoot?: string;
}): SandboxFsBridge {
  const root = path.resolve(params.root);
  const agentHostRoot = path.resolve(params.agentHostRoot);
  const workspaceContainerRoot = params.workspaceContainerRoot ?? "/workspace";

  const resolvePath = (filePath: string, cwd?: string): SandboxResolvedPath => {
    const hostPath =
      filePath === "/agent" || filePath === "/agent/" || filePath.startsWith("/agent/")
        ? path.join(
            agentHostRoot,
            filePath === "/agent" || filePath === "/agent/" ? "" : filePath.slice("/agent/".length),
          )
        : path.isAbsolute(filePath)
          ? filePath
          : path.resolve(cwd ?? root, filePath);

    const relFromRoot = path.relative(root, hostPath);
    const relativePath =
      relFromRoot && !relFromRoot.startsWith("..") && !path.isAbsolute(relFromRoot)
        ? relFromRoot.split(path.sep).filter(Boolean).join(path.posix.sep)
        : filePath.replace(/\\/g, "/");

    const containerPath = filePath.startsWith("/")
      ? filePath.replace(/\\/g, "/")
      : relativePath
        ? path.posix.join(workspaceContainerRoot, relativePath)
        : workspaceContainerRoot;

    return { hostPath, relativePath, containerPath };
  };

  return createSandboxFsBridgeFromResolver(resolvePath);
}

function createSandbox(params: {
  sandboxRoot: string;
  agentRoot: string;
  fsBridge: SandboxFsBridge;
}): SandboxContext {
  return createPiToolsSandboxContext({
    workspaceDir: params.sandboxRoot,
    agentWorkspaceDir: params.agentRoot,
    workspaceAccess: "rw",
    fsBridge: params.fsBridge,
    tools: { allow: [], deny: [] },
  });
}

function stubMinimaxOkFetch() {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    json: async () => ({
      content: "ok",
      base_resp: { status_code: 0, status_msg: "" },
    }),
  });
  global.fetch = withFetchPreconnect(fetch);
  vi.stubEnv("MINIMAX_API_KEY", "minimax-test");
  return fetch;
}

function stubOpenAiCompletionsOkFetch(text = "ok") {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          const chunks = [
            `data: ${JSON.stringify({
              id: "chatcmpl-moonshot-test",
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: "kimi-k2.5",
              choices: [
                {
                  index: 0,
                  delta: { role: "assistant", content: text },
                  finish_reason: null,
                },
              ],
            })}\n\n`,
            `data: ${JSON.stringify({
              id: "chatcmpl-moonshot-test",
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: "kimi-k2.5",
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            })}\n\n`,
            "data: [DONE]\n\n",
          ];
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      }),
      {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      },
    ),
  );
  global.fetch = withFetchPreconnect(fetch);
  return fetch;
}

function createMinimaxImageConfig(): OpenClawConfig {
  return {
    agents: {
      defaults: {
        model: { primary: "minimax/MiniMax-M2.1" },
        imageModel: { primary: "minimax/MiniMax-VL-01" },
      },
    },
  };
}

function makeModelDefinition(id: string, input: Array<"text" | "image">): ModelDefinitionConfig {
  return {
    id,
    name: id,
    reasoning: false,
    input,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 8_192,
  };
}

async function expectImageToolExecOk(
  tool: {
    execute: (toolCallId: string, input: { prompt: string; image: string }) => Promise<unknown>;
  },
  image: string,
) {
  await expect(
    tool.execute("t1", {
      prompt: "Describe the image.",
      image,
    }),
  ).resolves.toMatchObject({
    content: [{ type: "text", text: "ok" }],
  });
}

function requireImageTool<T>(tool: T | null | undefined): T {
  expect(tool).not.toBeNull();
  if (!tool) {
    throw new Error("expected image tool");
  }
  return tool;
}

function findSchemaUnionKeywords(schema: unknown, path = "root"): string[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }
  if (Array.isArray(schema)) {
    return schema.flatMap((item, index) => findSchemaUnionKeywords(item, `${path}[${index}]`));
  }
  const record = schema as Record<string, unknown>;
  const out: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    const nextPath = `${path}.${key}`;
    if (key === "anyOf" || key === "oneOf" || key === "allOf") {
      out.push(nextPath);
    }
    out.push(...findSchemaUnionKeywords(value, nextPath));
  }
  return out;
}

>>>>>>> dd9d9c1c6 (fix(security): enforce workspaceOnly for sandbox image tool)
describe("image tool implicit imageModel config", () => {
  const priorFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_OAUTH_TOKEN", "");
    vi.stubEnv("MINIMAX_API_KEY", "");
    // Avoid implicit Copilot provider discovery hitting the network in tests.
    vi.stubEnv("COPILOT_GITHUB_TOKEN", "");
    vi.stubEnv("GH_TOKEN", "");
    vi.stubEnv("GITHUB_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error global fetch cleanup
    global.fetch = priorFetch;
  });

  it("stays disabled without auth when no pairing is possible", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "openai/gpt-5.2" } } },
    };
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toBeNull();
    expect(createImageTool({ config: cfg, agentDir })).toBeNull();
  });

  it("pairs minimax primary with MiniMax-VL-01 (and fallbacks) when auth exists", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    vi.stubEnv("MINIMAX_API_KEY", "minimax-test");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-test");
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.1" } } },
    };
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toEqual({
      primary: "minimax/MiniMax-VL-01",
      fallbacks: ["openai/gpt-5-mini", "anthropic/claude-opus-4-5"],
    });
    expect(createImageTool({ config: cfg, agentDir })).not.toBeNull();
  });

  it("pairs a custom provider when it declares an image-capable model", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    await writeAuthProfiles(agentDir, {
      version: 1,
      profiles: {
        "acme:default": { type: "api_key", provider: "acme", key: "sk-test" },
      },
    });
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "acme/text-1" } } },
      models: {
        providers: {
          acme: {
            models: [
              { id: "text-1", input: ["text"] },
              { id: "vision-1", input: ["text", "image"] },
            ],
          },
        },
      },
    };
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toEqual({
      primary: "acme/vision-1",
    });
    expect(createImageTool({ config: cfg, agentDir })).not.toBeNull();
  });

  it("prefers explicit agents.defaults.imageModel", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.1" },
          imageModel: { primary: "openai/gpt-5-mini" },
        },
      },
    };
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toEqual({
      primary: "openai/gpt-5-mini",
    });
  });

  it("keeps image tool available when primary model supports images (for explicit requests)", async () => {
    // When the primary model supports images, we still keep the tool available
    // because images are auto-injected into prompts. The tool description is
    // adjusted via modelHasVision to discourage redundant usage.
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          model: { primary: "acme/vision-1" },
          imageModel: { primary: "openai/gpt-5-mini" },
        },
      },
      models: {
        providers: {
          acme: {
            models: [{ id: "vision-1", input: ["text", "image"] }],
          },
        },
      },
    };
    // Tool should still be available for explicit image analysis requests
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toEqual({
      primary: "openai/gpt-5-mini",
    });
    const tool = createImageTool({ config: cfg, agentDir, modelHasVision: true });
    expect(tool).not.toBeNull();
    expect(tool?.description).toContain(
      "Only use this tool when the image was NOT already provided",
    );
  });

  it("sandboxes image paths like the read tool", async () => {
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-sandbox-"));
    const agentDir = path.join(stateDir, "agent");
    const sandboxRoot = path.join(stateDir, "sandbox");
    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(sandboxRoot, { recursive: true });
    await fs.writeFile(path.join(sandboxRoot, "img.png"), "fake", "utf8");

    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.1" } } },
    };
    const tool = createImageTool({ config: cfg, agentDir, sandboxRoot });
    expect(tool).not.toBeNull();
    if (!tool) throw new Error("expected image tool");

    await expect(tool.execute("t1", { image: "https://example.com/a.png" })).rejects.toThrow(
      /Sandboxed image tool does not allow remote URLs/i,
    );

    await expect(tool.execute("t2", { image: "../escape.png" })).rejects.toThrow(
      /escapes sandbox root/i,
    );
  });

  it("applies tools.fs.workspaceOnly to image paths in sandbox mode", async () => {
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-sandbox-"));
    const agentDir = path.join(stateDir, "agent");
    const sandboxRoot = path.join(stateDir, "sandbox");
    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(sandboxRoot, { recursive: true });
    await fs.writeFile(path.join(agentDir, "secret.png"), Buffer.from(ONE_PIXEL_PNG_B64, "base64"));

    const bridge = createUnsafeMountedBridge({ root: sandboxRoot, agentHostRoot: agentDir });
    const sandbox = createSandbox({ sandboxRoot, agentRoot: agentDir, fsBridge: bridge });
    const fetch = stubMinimaxOkFetch();
    const cfg: OpenClawConfig = {
      ...createMinimaxImageConfig(),
      tools: { fs: { workspaceOnly: true } },
    };

    try {
      const tools = createOpenClawCodingTools({
        config: cfg,
        agentDir,
        sandbox,
        workspaceDir: sandboxRoot,
      });
      const readTool = tools.find((candidate) => candidate.name === "read");
      if (!readTool) {
        throw new Error("expected read tool");
      }
      const imageTool = requireImageTool(tools.find((candidate) => candidate.name === "image"));

      await expect(readTool.execute("t1", { path: "/agent/secret.png" })).rejects.toThrow(
        /Path escapes sandbox root/i,
      );
      await expect(
        imageTool.execute("t2", {
          prompt: "Describe the image.",
          image: "/agent/secret.png",
        }),
      ).rejects.toThrow(/Path escapes sandbox root/i);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      await fs.rm(stateDir, { recursive: true, force: true });
    }
  });

  it("rewrites inbound absolute paths into sandbox media/inbound", async () => {
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-sandbox-"));
    const agentDir = path.join(stateDir, "agent");
    const sandboxRoot = path.join(stateDir, "sandbox");
    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(path.join(sandboxRoot, "media", "inbound"), {
      recursive: true,
    });
    const pngB64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=";
    await fs.writeFile(
      path.join(sandboxRoot, "media", "inbound", "photo.png"),
      Buffer.from(pngB64, "base64"),
    );

    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({
        content: "ok",
        base_resp: { status_code: 0, status_msg: "" },
      }),
    });
    // @ts-expect-error partial global
    global.fetch = fetch;
    vi.stubEnv("MINIMAX_API_KEY", "minimax-test");

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.1" },
          imageModel: { primary: "minimax/MiniMax-VL-01" },
        },
      },
    };
    const tool = createImageTool({ config: cfg, agentDir, sandboxRoot });
    expect(tool).not.toBeNull();
    if (!tool) throw new Error("expected image tool");

    const res = await tool.execute("t1", {
      prompt: "Describe the image.",
      image: "@/Users/steipete/.openclaw/media/inbound/photo.png",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect((res.details as { rewrittenFrom?: string }).rewrittenFrom).toContain("photo.png");
  });
});

describe("image tool data URL support", () => {
  it("decodes base64 image data URLs", () => {
    const pngB64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=";
    const out = __testing.decodeDataUrl(`data:image/png;base64,${pngB64}`);
    expect(out.kind).toBe("image");
    expect(out.mimeType).toBe("image/png");
    expect(out.buffer.length).toBeGreaterThan(0);
  });

  it("rejects non-image data URLs", () => {
    expect(() => __testing.decodeDataUrl("data:text/plain;base64,SGVsbG8=")).toThrow(
      /Unsupported data URL type/i,
    );
  });
});

describe("image tool MiniMax VLM routing", () => {
  const pngB64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=";
  const priorFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("MINIMAX_API_KEY", "");
    vi.stubEnv("COPILOT_GITHUB_TOKEN", "");
    vi.stubEnv("GH_TOKEN", "");
    vi.stubEnv("GITHUB_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error global fetch cleanup
    global.fetch = priorFetch;
  });

  it("calls /v1/coding_plan/vlm for minimax image models", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({
        content: "ok",
        base_resp: { status_code: 0, status_msg: "" },
      }),
    });
    // @ts-expect-error partial global
    global.fetch = fetch;

    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-minimax-vlm-"));
    vi.stubEnv("MINIMAX_API_KEY", "minimax-test");
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.1" } } },
    };
    const tool = createImageTool({ config: cfg, agentDir });
    expect(tool).not.toBeNull();
    if (!tool) throw new Error("expected image tool");

    const res = await tool.execute("t1", {
      prompt: "Describe the image.",
      image: `data:image/png;base64,${pngB64}`,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.minimax.chat/v1/coding_plan/vlm");
    expect(init?.method).toBe("POST");
    expect(String((init?.headers as Record<string, string>)?.Authorization)).toBe(
      "Bearer minimax-test",
    );
    expect(String(init?.body)).toContain('"prompt":"Describe the image."');
    expect(String(init?.body)).toContain('"image_url":"data:image/png;base64,');

    const text = res.content?.find((b) => b.type === "text")?.text ?? "";
    expect(text).toBe("ok");
  });

  it("surfaces MiniMax API errors from /v1/coding_plan/vlm", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({
        content: "",
        base_resp: { status_code: 1004, status_msg: "bad key" },
      }),
    });
    // @ts-expect-error partial global
    global.fetch = fetch;

    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-minimax-vlm-"));
    vi.stubEnv("MINIMAX_API_KEY", "minimax-test");
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.1" } } },
    };
    const tool = createImageTool({ config: cfg, agentDir });
    expect(tool).not.toBeNull();
    if (!tool) throw new Error("expected image tool");

    await expect(
      tool.execute("t1", {
        prompt: "Describe the image.",
        image: `data:image/png;base64,${pngB64}`,
      }),
    ).rejects.toThrow(/MiniMax VLM API error/i);
  });
});

describe("image tool response validation", () => {
  it("rejects image-model responses with no final text", () => {
    expect(() =>
      __testing.coerceImageAssistantText({
        provider: "openai",
        model: "gpt-5-mini",
        message: {
          role: "assistant",
          api: "openai-responses",
          provider: "openai",
          model: "gpt-5-mini",
          stopReason: "stop",
          timestamp: Date.now(),
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              total: 0,
            },
          },
          content: [{ type: "thinking", thinking: "hmm" }],
        },
      }),
    ).toThrow(/returned no text/i);
  });

  it("surfaces provider errors from image-model responses", () => {
    expect(() =>
      __testing.coerceImageAssistantText({
        provider: "openai",
        model: "gpt-5-mini",
        message: {
          role: "assistant",
          api: "openai-responses",
          provider: "openai",
          model: "gpt-5-mini",
          stopReason: "error",
          errorMessage: "boom",
          timestamp: Date.now(),
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              total: 0,
            },
          },
          content: [],
        },
      }),
    ).toThrow(/boom/i);
  });

  it("returns trimmed text from image-model responses", () => {
    const text = __testing.coerceImageAssistantText({
      provider: "anthropic",
      model: "claude-opus-4-5",
      message: {
        role: "assistant",
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude-opus-4-5",
        stopReason: "stop",
        timestamp: Date.now(),
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0,
          },
        },
        content: [{ type: "text", text: "  hello  " }],
      },
    });
    expect(text).toBe("hello");
  });
});
