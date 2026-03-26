import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import "./../test-helpers/fast-core-tools.js";
import { createOpenClawTools } from "../openclaw-tools.js";
import { createImageGenerateTool } from "./image-generate-tool.js";
import { generateImageWithComfyUi } from "./image-generate.providers.comfyui.js";
import { generateImageWithGoogle } from "./image-generate.providers.google.js";
import { saveGeneratedImage } from "./image-generate.storage.js";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE0Y6sAAAAASUVORK5CYII=";
const PNG_BYTES = Buffer.from(PNG_BASE64, "base64");

async function withTempDir<T>(prefix: string, run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function withTempAgentAndWorkspace<T>(
  run: (params: { agentDir: string; workspaceDir: string }) => Promise<T>,
): Promise<T> {
  return await withTempDir("openclaw-imggen-agent-", async (agentDir) => {
    return await withTempDir("openclaw-imggen-workspace-", async (workspaceDir) => {
      return await run({ agentDir, workspaceDir });
    });
  });
}

async function startJsonServer(
  handler: (
    req: http.IncomingMessage,
    body: string,
  ) => Promise<{
    status?: number;
    headers?: Record<string, string>;
    body?: string | Buffer;
  }>,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const response = await handler(req, Buffer.concat(chunks).toString("utf8"));
    res.statusCode = response.status ?? 200;
    for (const [key, value] of Object.entries(response.headers ?? {})) {
      res.setHeader(key, value);
    }
    res.end(response.body ?? "");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve test server address");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

function makeGoogleConfig(baseUrl: string, model = "gemini-2.5-flash-image"): OpenClawConfig {
  return {
    models: {
      providers: {
        google: {
          baseUrl,
          models: [],
        },
      },
    },
    tools: {
      imageGeneration: {
        enabled: true,
        google: {
          model,
        },
      },
    },
  } satisfies OpenClawConfig;
}

function makeComfyUiConfig(baseUrl: string): OpenClawConfig {
  return {
    tools: {
      imageGeneration: {
        enabled: true,
        defaultProvider: "comfyui",
        comfyui: {
          baseUrl,
          defaultPreset: "portrait",
          presets: {
            portrait: {
              description: "Portrait preset",
              workflow: {
                "1": {
                  class_type: "CLIPTextEncode",
                  inputs: {
                    text: "placeholder",
                  },
                },
                "9": {
                  class_type: "SaveImage",
                  inputs: {},
                },
              },
              inputs: {
                prompt: {
                  nodeId: "1",
                  inputName: "text",
                },
              },
              output: {
                nodeId: "9",
                imageIndex: 0,
              },
            },
          },
        },
      },
    },
  } satisfies OpenClawConfig;
}

function makeImageGenerationConfig(enabled: boolean): OpenClawConfig {
  return {
    tools: {
      imageGeneration: {
        enabled,
      },
    },
  } satisfies OpenClawConfig;
}

describe("image_generate", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns null when disabled", async () => {
    await withTempAgentAndWorkspace(async ({ agentDir, workspaceDir }) => {
      vi.stubEnv("GEMINI_API_KEY", "test-gemini");
      const tool = createImageGenerateTool({
        agentDir,
        workspaceDir,
        config: makeImageGenerationConfig(false),
      });
      expect(tool).toBeNull();
    });
  });

  it("registers in the core tool list when google auth is available", async () => {
    await withTempAgentAndWorkspace(async ({ agentDir, workspaceDir }) => {
      vi.stubEnv("GEMINI_API_KEY", "test-gemini");
      const tools = createOpenClawTools({
        agentDir,
        workspaceDir,
        config: makeImageGenerationConfig(true),
      });
      expect(tools.some((tool) => tool.name === "image_generate")).toBe(true);
    });
  });

  it("registers without agentDir when google env auth is available", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-gemini");
    const tool = createImageGenerateTool({
      workspaceDir: os.tmpdir(),
      config: makeImageGenerationConfig(true),
    });
    expect(tool?.name).toBe("image_generate");
  });

  it("saves a generated Google image and uses the configured model id", async () => {
    const requests: string[] = [];
    const requestApiKeys: string[] = [];
    const server = await startJsonServer(async (req) => {
      requests.push(req.url ?? "");
      const apiKeyHeader = req.headers["x-goog-api-key"];
      requestApiKeys.push(Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : (apiKeyHeader ?? ""));
      return {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inline_data: {
                      mime_type: "image/png",
                      data: PNG_BASE64,
                    },
                  },
                ],
              },
            },
          ],
        }),
      };
    });

    try {
      await withTempAgentAndWorkspace(async ({ agentDir, workspaceDir }) => {
        vi.stubEnv("GEMINI_API_KEY", "test-gemini");
        const tool = createImageGenerateTool({
          agentDir,
          workspaceDir,
          config: makeGoogleConfig(server.baseUrl, "custom-google-model"),
        });
        expect(tool).not.toBeNull();
        const result = await tool!.execute("call-1", {
          prompt: "Generate a green square",
        } as never);
        const details = result.details as Record<string, unknown>;
        expect(requests[0]).toContain("/models/custom-google-model:generateContent");
        expect(requests[0]).not.toContain("?key=");
        expect(requestApiKeys[0]).toBe("test-gemini");
        expect(details.provider).toBe("google");
        expect(details.model).toBe("custom-google-model");
        expect(typeof details.localPath).toBe("string");
        await expect(fs.access(String(details.localPath))).resolves.toBeUndefined();
        expect(details.fileName).toMatch(/\.png$/);
        expect(details.sizeBytes).toBe(PNG_BYTES.length);
      });
    } finally {
      await server.close();
    }
  });

  it("fails clearly when Google auth is missing", async () => {
    await withTempDir("openclaw-imggen-agent-", async (agentDir) => {
      const fetchImpl = vi.fn();
      await expect(
        generateImageWithGoogle({
          agentDir,
          request: { prompt: "Generate an image" },
          fetchImpl,
        }),
      ).rejects.toThrow(/No API key found for provider "google"/);
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  it("fails clearly when the configured Google model is stale", async () => {
    await withTempDir("openclaw-imggen-agent-", async (agentDir) => {
      vi.stubEnv("GEMINI_API_KEY", "test-gemini");
      await expect(
        generateImageWithGoogle({
          agentDir,
          cfg: makeGoogleConfig("http://127.0.0.1:9999", "gemini-3-pro-image-preview"),
          request: { prompt: "Generate an image" },
          fetchImpl: vi.fn(),
        }),
      ).rejects.toThrow(/stale or unsupported/);
    });
  });

  it("times out Google generation after 120 seconds", async () => {
    vi.useFakeTimers();
    await withTempDir("openclaw-imggen-agent-", async (agentDir) => {
      vi.stubEnv("GEMINI_API_KEY", "test-gemini");
      const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        });
      });

      const pending = generateImageWithGoogle({
        agentDir,
        request: { prompt: "Generate an image" },
        fetchImpl,
      });
      await vi.advanceTimersByTimeAsync(120_000);
      await expect(pending).rejects.toThrow("Google image generation timed out after 120 seconds.");
    });
  });

  it("rejects non-image Google payloads before writing", async () => {
    const server = await startJsonServer(async () => ({
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: Buffer.from("not-an-image").toString("base64"),
                  },
                },
              ],
            },
          },
        ],
      }),
    }));

    try {
      await withTempAgentAndWorkspace(async ({ agentDir, workspaceDir }) => {
        vi.stubEnv("GEMINI_API_KEY", "test-gemini");
        const tool = createImageGenerateTool({
          agentDir,
          workspaceDir,
          config: makeGoogleConfig(server.baseUrl),
        });
        await expect(
          tool!.execute("call-1", {
            prompt: "Generate a square",
          } as never),
        ).rejects.toThrow(/non-image payload|invalid image bytes/);
      });
    } finally {
      await server.close();
    }
  });

  it("saves a generated ComfyUI image and returns workflow metadata", async () => {
    let submittedWorkflow: Record<string, unknown> | null = null;
    const server = await startJsonServer(async (req, body) => {
      if (req.url?.startsWith("/prompt")) {
        submittedWorkflow = JSON.parse(body) as Record<string, unknown>;
        return {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt_id: "job-1" }),
        };
      }
      if (req.url?.startsWith("/history/job-1")) {
        return {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "job-1": {
              outputs: {
                "9": {
                  images: [
                    {
                      filename: "out.png",
                      subfolder: "",
                      type: "output",
                    },
                  ],
                },
              },
            },
          }),
        };
      }
      if (req.url?.startsWith("/view?")) {
        return {
          headers: { "Content-Type": "image/png" },
          body: PNG_BYTES,
        };
      }
      return { status: 404, body: "not found" };
    });

    try {
      await withTempAgentAndWorkspace(async ({ workspaceDir }) => {
        const tool = createImageGenerateTool({
          workspaceDir,
          config: makeComfyUiConfig(server.baseUrl),
        });
        expect(tool).not.toBeNull();
        const result = await tool!.execute("call-1", {
          prompt: "Studio portrait",
          provider: "comfyui",
        } as never);
        const details = result.details as Record<string, unknown>;
        expect(details.provider).toBe("comfyui");
        expect(details.workflowId).toBe("portrait");
        expect(details.jobId).toBe("job-1");
        const promptWorkflow = submittedWorkflow?.prompt as Record<string, unknown> | undefined;
        const promptNode = promptWorkflow?.["1"] as
          | { inputs?: Record<string, unknown> }
          | undefined;
        expect(promptNode?.inputs?.text).toBe("Studio portrait");
        await expect(fs.access(String(details.localPath))).resolves.toBeUndefined();
      });
    } finally {
      await server.close();
    }
  });

  it("rejects ComfyUI multiple outputs when one deterministic result is expected", async () => {
    const server = await startJsonServer(async (req) => {
      if (req.url?.startsWith("/prompt")) {
        return {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt_id: "job-2" }),
        };
      }
      if (req.url?.startsWith("/history/job-2")) {
        return {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "job-2": {
              outputs: {
                "9": {
                  images: [
                    { filename: "out-1.png", subfolder: "", type: "output" },
                    { filename: "out-2.png", subfolder: "", type: "output" },
                  ],
                },
              },
            },
          }),
        };
      }
      return { status: 404, body: "not found" };
    });

    try {
      await expect(
        generateImageWithComfyUi({
          cfg: makeComfyUiConfig(server.baseUrl),
          request: {
            prompt: "Studio portrait",
            provider: "comfyui",
          },
        }),
      ).rejects.toThrow(/multiple image outputs/);
    } finally {
      await server.close();
    }
  });

  it("fails clearly when ComfyUI history is malformed", async () => {
    const server = await startJsonServer(async (req) => {
      if (req.url?.startsWith("/prompt")) {
        return {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt_id: "job-bad" }),
        };
      }
      if (req.url?.startsWith("/history/job-bad")) {
        return {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "job-bad": {
              outputs: "oops",
            },
          }),
        };
      }
      return { status: 404, body: "not found" };
    });

    try {
      await expect(
        generateImageWithComfyUi({
          cfg: makeComfyUiConfig(server.baseUrl),
          request: {
            prompt: "Studio portrait",
            provider: "comfyui",
          },
        }),
      ).rejects.toThrow(/history result .* malformed/i);
    } finally {
      await server.close();
    }
  });

  it("times out ComfyUI polling when no completed output arrives", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/prompt")) {
        return Promise.resolve(
          new Response(JSON.stringify({ prompt_id: "job-stalled" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url.includes("/history/job-stalled")) {
        return Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(new Response("not found", { status: 404 }));
    });

    const pending = generateImageWithComfyUi({
      cfg: {
        tools: {
          imageGeneration: {
            comfyui: {
              baseUrl: "http://127.0.0.1:8188",
              defaultPreset: "portrait",
              timeoutSeconds: 1,
              pollIntervalMs: 250,
              presets:
                makeComfyUiConfig("http://127.0.0.1:8188").tools!.imageGeneration!.comfyui!.presets,
            },
          },
        },
      } satisfies OpenClawConfig,
      request: {
        prompt: "Studio portrait",
        provider: "comfyui",
      },
      fetchImpl,
    });

    await vi.advanceTimersByTimeAsync(1_500);
    await expect(pending).rejects.toThrow("ComfyUI image generation timed out after 1 seconds.");
  });

  it("rejects an unknown ComfyUI preset", async () => {
    await expect(
      generateImageWithComfyUi({
        cfg: makeComfyUiConfig("http://127.0.0.1:8188"),
        request: {
          prompt: "Studio portrait",
          provider: "comfyui",
          preset: "missing",
        },
        fetchImpl: vi.fn(),
      }),
    ).rejects.toThrow(/Unknown ComfyUI preset "missing"/);
  });

  it("allocates collision-safe filenames when the hash/timestamp matches", async () => {
    await withTempDir("openclaw-imggen-save-", async (workspaceDir) => {
      const now = new Date("2026-03-25T12:00:00.000Z");
      const first = await saveGeneratedImage({
        workspaceDir,
        validated: {
          bytes: PNG_BYTES,
          mimeType: "image/png",
          extension: ".png",
          sizeBytes: PNG_BYTES.length,
          width: 1,
          height: 1,
        },
        requestFingerprint: "same-request",
        now,
      });
      const second = await saveGeneratedImage({
        workspaceDir,
        validated: {
          bytes: PNG_BYTES,
          mimeType: "image/png",
          extension: ".png",
          sizeBytes: PNG_BYTES.length,
          width: 1,
          height: 1,
        },
        requestFingerprint: "same-request",
        now,
      });

      expect(first.fileName).not.toBe(second.fileName);
      expect(second.fileName).toMatch(/-01\.png$/);
    });
  });

  it("fails when the workspace path is not writable as a directory", async () => {
    await withTempDir("openclaw-imggen-workfile-", async (parentDir) => {
      const workspaceFile = path.join(parentDir, "workspace.txt");
      await fs.writeFile(workspaceFile, "not-a-directory");
      await expect(
        saveGeneratedImage({
          workspaceDir: workspaceFile,
          validated: {
            bytes: PNG_BYTES,
            mimeType: "image/png",
            extension: ".png",
            sizeBytes: PNG_BYTES.length,
          },
          requestFingerprint: "workspace-failure",
        }),
      ).rejects.toThrow();
    });
  });

  it("blocks sandbox escape when the bridge resolves outside the sandbox root", async () => {
    await withTempDir("openclaw-imggen-sandbox-", async (sandboxRoot) => {
      const fakeBridge = {
        resolvePath: () => ({
          hostPath: path.join(path.dirname(sandboxRoot), "escape", "file.png"),
          relativePath: "../escape/file.png",
          containerPath: "/workspace/generated-images/file.png",
        }),
        stat: async () => null,
        writeFile: async () => undefined,
      };

      await expect(
        saveGeneratedImage({
          sandbox: {
            root: sandboxRoot,
            bridge: fakeBridge as never,
          },
          validated: {
            bytes: PNG_BYTES,
            mimeType: "image/png",
            extension: ".png",
            sizeBytes: PNG_BYTES.length,
          },
          requestFingerprint: "sandbox-escape",
        }),
      ).rejects.toThrow(/escapes sandbox root/);
    });
  });

  it("rejects an unsupported provider input", async () => {
    await withTempAgentAndWorkspace(async ({ agentDir, workspaceDir }) => {
      vi.stubEnv("GEMINI_API_KEY", "test-gemini");
      const tool = createImageGenerateTool({
        agentDir,
        workspaceDir,
        config: makeImageGenerationConfig(true),
      });
      await expect(
        tool!.execute("call-1", {
          prompt: "Generate a square",
          provider: "bogus",
        } as never),
      ).rejects.toThrow(/Unsupported image generation provider/);
    });
  });

  it("rejects an empty prompt", async () => {
    await withTempAgentAndWorkspace(async ({ agentDir, workspaceDir }) => {
      vi.stubEnv("GEMINI_API_KEY", "test-gemini");
      const tool = createImageGenerateTool({
        agentDir,
        workspaceDir,
        config: makeImageGenerationConfig(true),
      });
      await expect(
        tool!.execute("call-1", {
          prompt: "   ",
        } as never),
      ).rejects.toThrow(/prompt required/);
    });
  });
});
