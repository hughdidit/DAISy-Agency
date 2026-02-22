<<<<<<< HEAD
import fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { MoltbotConfig } from "../config/config.js";
import { ensureMoltbotModelsJson } from "./models-config.js";
=======
import { describe, expect, it } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { SandboxContext } from "./sandbox.js";
>>>>>>> 222b2d7c3 (refactor(test): trim pi-embedded-runner e2e scaffolding)
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { buildEmbeddedSandboxInfo } from "./pi-embedded-runner.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { SandboxContext } from "./sandbox.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { buildEmbeddedSandboxInfo } from "./pi-embedded-runner.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { SandboxContext } from "./sandbox.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { buildEmbeddedSandboxInfo } from "./pi-embedded-runner.js";
import type { SandboxContext } from "./sandbox.js";

<<<<<<< HEAD
<<<<<<< HEAD
vi.mock("@mariozechner/pi-ai", async () => {
  const actual = await vi.importActual<typeof import("@mariozechner/pi-ai")>("@mariozechner/pi-ai");
  return {
    ...actual,
    streamSimple: (model: { api: string; provider: string; id: string }) => {
      if (model.id === "mock-error") {
        throw new Error("boom");
      }
      const stream = new actual.AssistantMessageEventStream();
      queueMicrotask(() => {
        stream.push({
          type: "done",
          reason: "stop",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "ok" }],
            stopReason: "stop",
            api: model.api,
            provider: model.provider,
            model: model.id,
            usage: {
              input: 1,
              output: 1,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 2,
              cost: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                total: 0,
              },
            },
            timestamp: Date.now(),
          },
        });
      });
      return stream;
    },
  };
});

const _makeOpenAiConfig = (modelIds: string[]) =>
  ({
    models: {
      providers: {
        openai: {
          api: "openai-responses",
          apiKey: "sk-test",
          baseUrl: "https://example.com",
          models: modelIds.map((id) => ({
            id,
            name: `Mock ${id}`,
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 16_000,
            maxTokens: 2048,
          })),
        },
      },
    },
  }) satisfies MoltbotConfig;

const _ensureModels = (cfg: MoltbotConfig, agentDir: string) =>
  ensureMoltbotModelsJson(cfg, agentDir) as unknown;

const _textFromContent = (content: unknown) => {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content) && content[0]?.type === "text") {
    return (content[0] as { text?: string }).text;
  }
  return undefined;
};

const _readSessionMessages = async (sessionFile: string) => {
  const raw = await fs.readFile(sessionFile, "utf-8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as {
          type?: string;
          message?: { role?: string; content?: unknown };
        },
    )
    .filter((entry) => entry.type === "message")
    .map((entry) => entry.message as { role?: string; content?: unknown });
};

=======
>>>>>>> 222b2d7c3 (refactor(test): trim pi-embedded-runner e2e scaffolding)
=======
function createSandboxContext(overrides?: Partial<SandboxContext>): SandboxContext {
  const base = {
    enabled: true,
    sessionKey: "session:test",
    workspaceDir: "/tmp/openclaw-sandbox",
    agentWorkspaceDir: "/tmp/openclaw-workspace",
    workspaceAccess: "none",
    containerName: "openclaw-sbx-test",
    containerWorkdir: "/workspace",
    docker: {
      image: "openclaw-sandbox:bookworm-slim",
      containerPrefix: "openclaw-sbx-",
      workdir: "/workspace",
      readOnlyRoot: true,
      tmpfs: ["/tmp"],
      network: "none",
      user: "1000:1000",
      capDrop: ["ALL"],
      env: { LANG: "C.UTF-8" },
    },
    tools: {
      allow: ["exec"],
      deny: ["browser"],
    },
    browserAllowHostControl: true,
    browser: {
      bridgeUrl: "http://localhost:9222",
      noVncUrl: "http://localhost:6080",
      containerName: "openclaw-sbx-browser-test",
    },
  } satisfies SandboxContext;
  return { ...base, ...overrides };
}

>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
describe("buildEmbeddedSandboxInfo", () => {
  it("returns undefined when sandbox is missing", () => {
    expect(buildEmbeddedSandboxInfo()).toBeUndefined();
  });

  it("maps sandbox context into prompt info", () => {
<<<<<<< HEAD
    const sandbox = {
      enabled: true,
      sessionKey: "session:test",
      workspaceDir: "/tmp/moltbot-sandbox",
      agentWorkspaceDir: "/tmp/moltbot-workspace",
      workspaceAccess: "none",
      containerName: "moltbot-sbx-test",
      containerWorkdir: "/workspace",
      docker: {
        image: "moltbot-sandbox:bookworm-slim",
        containerPrefix: "moltbot-sbx-",
        workdir: "/workspace",
        readOnlyRoot: true,
        tmpfs: ["/tmp"],
        network: "none",
        user: "1000:1000",
        capDrop: ["ALL"],
        env: { LANG: "C.UTF-8" },
      },
      tools: {
        allow: ["exec"],
        deny: ["browser"],
      },
      browserAllowHostControl: true,
      browser: {
        bridgeUrl: "http://localhost:9222",
        noVncUrl: "http://localhost:6080",
        containerName: "moltbot-sbx-browser-test",
      },
    } satisfies SandboxContext;
=======
    const sandbox = createSandboxContext();
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

    expect(buildEmbeddedSandboxInfo(sandbox)).toEqual({
      enabled: true,
<<<<<<< HEAD
      workspaceDir: "/tmp/moltbot-sandbox",
=======
      workspaceDir: "/tmp/openclaw-sandbox",
      containerWorkspaceDir: "/workspace",
>>>>>>> 2bf330777 (fix (sandbox/prompts): align workspace guidance with container workdir)
      workspaceAccess: "none",
      agentWorkspaceMount: undefined,
      browserBridgeUrl: "http://localhost:9222",
      browserNoVncUrl: "http://localhost:6080",
      hostBrowserAllowed: true,
    });
  });

  it("includes elevated info when allowed", () => {
<<<<<<< HEAD
    const sandbox = {
      enabled: true,
      sessionKey: "session:test",
      workspaceDir: "/tmp/moltbot-sandbox",
      agentWorkspaceDir: "/tmp/moltbot-workspace",
      workspaceAccess: "none",
      containerName: "moltbot-sbx-test",
      containerWorkdir: "/workspace",
      docker: {
        image: "moltbot-sandbox:bookworm-slim",
        containerPrefix: "moltbot-sbx-",
        workdir: "/workspace",
        readOnlyRoot: true,
        tmpfs: ["/tmp"],
        network: "none",
        user: "1000:1000",
        capDrop: ["ALL"],
        env: { LANG: "C.UTF-8" },
      },
      tools: {
        allow: ["exec"],
        deny: ["browser"],
      },
=======
    const sandbox = createSandboxContext({
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      browserAllowHostControl: false,
      browser: undefined,
    });

    expect(
      buildEmbeddedSandboxInfo(sandbox, {
        enabled: true,
        allowed: true,
        defaultLevel: "on",
      }),
    ).toEqual({
      enabled: true,
<<<<<<< HEAD
      workspaceDir: "/tmp/moltbot-sandbox",
=======
      workspaceDir: "/tmp/openclaw-sandbox",
      containerWorkspaceDir: "/workspace",
>>>>>>> 2bf330777 (fix (sandbox/prompts): align workspace guidance with container workdir)
      workspaceAccess: "none",
      agentWorkspaceMount: undefined,
      hostBrowserAllowed: false,
      elevated: { allowed: true, defaultLevel: "on" },
    });
  });
});
