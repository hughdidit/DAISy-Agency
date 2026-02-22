import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import "./test-helpers/fast-coding-tools.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
import { ensureMoltbotModelsJson } from "./models-config.js";
=======
=======
import type { SessionManager as PiSessionManager } from "@mariozechner/pi-coding-agent";
import "./test-helpers/fast-coding-tools.js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
>>>>>>> 239f72c58 (perf(test): consolidate archive safety cases and cache session manager)
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> 47514e35a (test: dedupe pi embedded runner setup and orphan case)

function createMockUsage(input: number, output: number) {
  return {
    input,
    output,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: input + output,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    },
  };
}

vi.mock("@mariozechner/pi-coding-agent", async () => {
  const actual = await vi.importActual<typeof import("@mariozechner/pi-coding-agent")>(
    "@mariozechner/pi-coding-agent",
  );

  return {
    ...actual,
    createAgentSession: async (
      ...args: Parameters<typeof actual.createAgentSession>
    ): ReturnType<typeof actual.createAgentSession> => {
      const result = await actual.createAgentSession(...args);
      const modelId = (args[0] as { model?: { id?: string } } | undefined)?.model?.id;
      if (modelId === "mock-throw") {
        const session = result.session as { prompt?: (...params: unknown[]) => Promise<unknown> };
        if (session && typeof session.prompt === "function") {
          session.prompt = async () => {
            throw new Error("transport failed");
          };
        }
      }
      return result;
    },
  };
});

vi.mock("@mariozechner/pi-ai", async () => {
  const actual = await vi.importActual<typeof import("@mariozechner/pi-ai")>("@mariozechner/pi-ai");

  const buildAssistantMessage = (model: { api: string; provider: string; id: string }) => ({
    role: "assistant" as const,
    content: [{ type: "text" as const, text: "ok" }],
    stopReason: "stop" as const,
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: createMockUsage(1, 1),
    timestamp: Date.now(),
  });

  const buildAssistantErrorMessage = (model: { api: string; provider: string; id: string }) => ({
    role: "assistant" as const,
    content: [],
    stopReason: "error" as const,
    errorMessage: "boom",
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: createMockUsage(0, 0),
    timestamp: Date.now(),
  });

  return {
    ...actual,
    complete: async (model: { api: string; provider: string; id: string }) => {
      if (model.id === "mock-error") {
        return buildAssistantErrorMessage(model);
      }
      return buildAssistantMessage(model);
    },
    completeSimple: async (model: { api: string; provider: string; id: string }) => {
      if (model.id === "mock-error") {
        return buildAssistantErrorMessage(model);
      }
      return buildAssistantMessage(model);
    },
    streamSimple: (model: { api: string; provider: string; id: string }) => {
<<<<<<< HEAD
<<<<<<< HEAD
      const stream = new actual.AssistantMessageEventStream();
=======
      if (model.id === "mock-throw") {
        throw new Error("transport failed");
      }
=======
>>>>>>> eda941f39 (perf(test): remove flaky transport timeout and dedupe safeBins checks)
      const stream = actual.createAssistantMessageEventStream();
>>>>>>> db3529e92 (chore: Fix types in tests 14/N.)
      queueMicrotask(() => {
        stream.push({
          type: "done",
          reason: "stop",
          message:
            model.id === "mock-error"
              ? buildAssistantErrorMessage(model)
              : buildAssistantMessage(model),
        });
        stream.end();
      });
      return stream;
    },
  };
});

let runEmbeddedPiAgent: typeof import("./pi-embedded-runner/run.js").runEmbeddedPiAgent;
let SessionManager: PiSessionManager;
let tempRoot: string | undefined;
let agentDir: string;
let workspaceDir: string;
let sessionCounter = 0;
let runCounter = 0;

beforeAll(async () => {
  vi.useRealTimers();
<<<<<<< HEAD
  ({ runEmbeddedPiAgent } = await import("./pi-embedded-runner.js"));
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-embedded-agent-"));
=======
  ({ runEmbeddedPiAgent } = await import("./pi-embedded-runner/run.js"));
  ({ SessionManager } = await import("@mariozechner/pi-coding-agent"));
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-embedded-agent-"));
>>>>>>> a9b26d83d (perf(test): narrow pi-embedded runner e2e import path)
  agentDir = path.join(tempRoot, "agent");
  workspaceDir = path.join(tempRoot, "workspace");
  await fs.mkdir(agentDir, { recursive: true });
  await fs.mkdir(workspaceDir, { recursive: true });
}, 60_000);

afterAll(async () => {
  if (!tempRoot) {
    return;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
  tempRoot = undefined;
});

const makeOpenAiConfig = (modelIds: string[]) =>
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

<<<<<<< HEAD
const ensureModels = (cfg: MoltbotConfig) => ensureMoltbotModelsJson(cfg, agentDir) as unknown;

=======
>>>>>>> 47514e35a (test: dedupe pi embedded runner setup and orphan case)
const nextSessionFile = () => {
  sessionCounter += 1;
  return path.join(workspaceDir, `session-${sessionCounter}.jsonl`);
};
const nextRunId = (prefix = "run-embedded-test") => `${prefix}-${++runCounter}`;
const nextSessionKey = () => `agent:test:embedded:${nextRunId("session-key")}`;
const immediateEnqueue = async <T>(task: () => Promise<T>) => task();

const runWithOrphanedSingleUserMessage = async (text: string, sessionKey: string) => {
  const sessionFile = nextSessionFile();
  const sessionManager = SessionManager.open(sessionFile);
  sessionManager.appendMessage({
    role: "user",
    content: [{ type: "text", text }],
    timestamp: Date.now(),
  });

  const cfg = makeOpenAiConfig(["mock-1"]);
  return await runEmbeddedPiAgent({
    sessionId: "session:test",
    sessionKey,
    sessionFile,
    workspaceDir,
    config: cfg,
    prompt: "hello",
    provider: "openai",
    model: "mock-1",
    timeoutMs: 5_000,
    agentDir,
    runId: nextRunId("orphaned-user"),
    enqueue: immediateEnqueue,
  });
};

const textFromContent = (content: unknown) => {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content) && content[0]?.type === "text") {
    return (content[0] as { text?: string }).text;
  }
  return undefined;
};

const readSessionMessages = async (sessionFile: string) => {
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

const runDefaultEmbeddedTurn = async (sessionFile: string, prompt: string, sessionKey: string) => {
  const cfg = makeOpenAiConfig(["mock-1"]);
  await runEmbeddedPiAgent({
    sessionId: "session:test",
    sessionKey,
    sessionFile,
    workspaceDir,
    config: cfg,
    prompt,
    provider: "openai",
    model: "mock-1",
    timeoutMs: 5_000,
    agentDir,
    runId: nextRunId("default-turn"),
    enqueue: immediateEnqueue,
  });
};

<<<<<<< HEAD
<<<<<<< HEAD
describe("runEmbeddedPiAgent", () => {
<<<<<<< HEAD
<<<<<<< HEAD
  it("writes models.json into the provided agentDir", async () => {
    const sessionFile = nextSessionFile();

    const cfg = {
      models: {
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            api: "anthropic-messages",
            apiKey: "sk-minimax-test",
            models: [
              {
                id: "MiniMax-M2.1",
                name: "MiniMax M2.1",
                reasoning: false,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 200000,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
    } satisfies MoltbotConfig;

    await expect(
      runEmbeddedPiAgent({
        sessionId: "session:test",
        sessionKey: testSessionKey,
        sessionFile,
        workspaceDir,
        config: cfg,
        prompt: "hi",
        provider: "definitely-not-a-provider",
        model: "definitely-not-a-model",
        timeoutMs: 1,
        agentDir,
        runId: nextRunId("unknown-model"),
        enqueue: immediateEnqueue,
      }),
    ).rejects.toThrow(/Unknown model:/);

    await expect(fs.stat(path.join(agentDir, "models.json"))).resolves.toBeTruthy();
  });

<<<<<<< HEAD
  itIfNotWin32(
    "persists the first user message before assistant output",
    { timeout: 120_000 },
    async () => {
      const sessionFile = nextSessionFile();
      const cfg = makeOpenAiConfig(["mock-1"]);
      await ensureModels(cfg);
=======
  it("falls back to per-agent workspace when runtime workspaceDir is missing", async () => {
    const sessionFile = nextSessionFile();
    const fallbackWorkspace = path.join(tempRoot ?? os.tmpdir(), "workspace-fallback-main");
    const cfg = {
      ...makeOpenAiConfig(["mock-1"]),
      agents: {
        defaults: {
          workspace: fallbackWorkspace,
        },
      },
    } satisfies OpenClawConfig;

    const result = await runEmbeddedPiAgent({
      sessionId: "session:test-fallback",
      sessionKey: "agent:main:subagent:fallback-workspace",
      sessionFile,
      workspaceDir: undefined as unknown as string,
      config: cfg,
      prompt: "hello",
      provider: "openai",
      model: "mock-1",
      timeoutMs: 5_000,
      agentDir,
      runId: "run-fallback-workspace",
      enqueue: immediateEnqueue,
    });

    expect(result.payloads?.[0]?.text).toBe("ok");
    await expect(fs.stat(fallbackWorkspace)).resolves.toBeTruthy();
  });

  it("throws when sessionKey is malformed", async () => {
    const sessionFile = nextSessionFile();
    const cfg = {
      ...makeOpenAiConfig(["mock-1"]),
      agents: {
        defaults: {
          workspace: path.join(tempRoot ?? os.tmpdir(), "workspace-fallback-main"),
        },
        list: [
          {
            id: "research",
            workspace: path.join(tempRoot ?? os.tmpdir(), "workspace-fallback-research"),
          },
        ],
      },
    } satisfies OpenClawConfig;

    await expect(
      runEmbeddedPiAgent({
        sessionId: "session:test-fallback-malformed",
        sessionKey: "agent::broken",
        agentId: "research",
        sessionFile,
        workspaceDir: undefined as unknown as string,
        config: cfg,
        prompt: "hello",
        provider: "openai",
        model: "mock-1",
        timeoutMs: 5_000,
        agentDir,
        runId: "run-fallback-workspace-malformed",
        enqueue: immediateEnqueue,
      }),
    ).rejects.toThrow("Malformed agent session key");
  });

<<<<<<< HEAD
  it("persists the first user message before assistant output", { timeout: 120_000 }, async () => {
    const sessionFile = nextSessionFile();
<<<<<<< HEAD
    const cfg = makeOpenAiConfig(["mock-1"]);
    await ensureModels(cfg);
>>>>>>> 53a1ac36f (test: normalize paths in OPENCLAW_HOME tests for cross-platform support (#12212))

    await runEmbeddedPiAgent({
      sessionId: "session:test",
      sessionKey: testSessionKey,
      sessionFile,
      workspaceDir,
      config: cfg,
      prompt: "hello",
      provider: "openai",
      model: "mock-1",
      timeoutMs: 5_000,
      agentDir,
      enqueue: immediateEnqueue,
    });
=======
    await runDefaultEmbeddedTurn(sessionFile, "hello");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

    const messages = await readSessionMessages(sessionFile);
    const firstUserIndex = messages.findIndex(
      (message) => message?.role === "user" && textFromContent(message.content) === "hello",
    );
    const firstAssistantIndex = messages.findIndex((message) => message?.role === "assistant");
    expect(firstUserIndex).toBeGreaterThanOrEqual(0);
    if (firstAssistantIndex !== -1) {
      expect(firstUserIndex).toBeLessThan(firstAssistantIndex);
    }
  });

=======
>>>>>>> bd6be417e (test: trim duplicate smoke and embedded runner cases)
=======
>>>>>>> 1437f371f (test: trim duplicate embedded runner setup cases)
  it("persists the user message when prompt fails before assistant output", async () => {
    const sessionFile = nextSessionFile();
    const cfg = makeOpenAiConfig(["mock-error"]);

    const result = await runEmbeddedPiAgent({
      sessionId: "session:test",
      sessionKey: testSessionKey,
      sessionFile,
      workspaceDir,
      config: cfg,
      prompt: "boom",
      provider: "openai",
      model: "mock-error",
      timeoutMs: 5_000,
      agentDir,
      runId: nextRunId("prompt-error"),
      enqueue: immediateEnqueue,
    });
    expect(result.payloads?.[0]?.isError).toBe(true);

    const messages = await readSessionMessages(sessionFile);
    const userIndex = messages.findIndex(
      (message) => message?.role === "user" && textFromContent(message.content) === "boom",
    );
    expect(userIndex).toBeGreaterThanOrEqual(0);
  });

<<<<<<< HEAD
<<<<<<< HEAD
=======
  it("persists prompt transport errors as transcript entries", async () => {
=======
  it("fails fast on prompt transport errors", async () => {
>>>>>>> eda941f39 (perf(test): remove flaky transport timeout and dedupe safeBins checks)
    const sessionFile = nextSessionFile();
    const cfg = makeOpenAiConfig(["mock-throw"]);

    await expect(
      runEmbeddedPiAgent({
=======
=======
describe.concurrent("runEmbeddedPiAgent", () => {
>>>>>>> 568973e5a (perf(test): trim embedded/bash runtime fixture overhead)
=======
describe("runEmbeddedPiAgent", () => {
>>>>>>> 7b229decd (test(perf): dedupe fixtures and reduce flaky waits)
  it("handles prompt error paths without dropping user state", async () => {
    for (const testCase of [
      {
        label: "assistant error response keeps user message",
        model: "mock-error",
        prompt: "boom",
        runIdPrefix: "prompt-error",
        expectReject: false,
      },
      {
        label: "transport error fails fast before writing transcript",
        model: "mock-throw",
        prompt: "transport error",
        runIdPrefix: "transport-error",
        expectReject: true,
      },
    ] as const) {
      const sessionFile = nextSessionFile();
      const cfg = makeOpenAiConfig([testCase.model]);
      const sessionKey = nextSessionKey();
      const execution = runEmbeddedPiAgent({
>>>>>>> 79ec29b15 (test: consolidate embedded prompt error scenarios)
        sessionId: "session:test",
        sessionKey,
        sessionFile,
        workspaceDir,
        config: cfg,
        prompt: testCase.prompt,
        provider: "openai",
        model: testCase.model,
        timeoutMs: 5_000,
        agentDir,
        runId: nextRunId(testCase.runIdPrefix),
        enqueue: immediateEnqueue,
      });

      if (testCase.expectReject) {
        await expect(execution, testCase.label).rejects.toThrow("transport failed");
        await expect(fs.stat(sessionFile), testCase.label).rejects.toBeTruthy();
      } else {
        const result = await execution;
        expect(result.payloads?.[0]?.isError, testCase.label).toBe(true);

        const messages = await readSessionMessages(sessionFile);
        const userIndex = messages.findIndex(
          (message) => message?.role === "user" && textFromContent(message.content) === "boom",
        );
        expect(userIndex, testCase.label).toBeGreaterThanOrEqual(0);
      }
    }
  });

>>>>>>> db3529e92 (chore: Fix types in tests 14/N.)
  it(
    "appends new user + assistant after existing transcript entries",
    { timeout: 90_000 },
    async () => {
      const sessionFile = nextSessionFile();
      const sessionKey = nextSessionKey();

      const sessionManager = SessionManager.open(sessionFile);
      sessionManager.appendMessage({
        role: "user",
        content: [{ type: "text", text: "seed user" }],
        timestamp: Date.now(),
      });
      sessionManager.appendMessage({
        role: "assistant",
        content: [{ type: "text", text: "seed assistant" }],
        stopReason: "stop",
        api: "openai-responses",
        provider: "openai",
        model: "mock-1",
        usage: createMockUsage(1, 1),
        timestamp: Date.now(),
      });

      await runDefaultEmbeddedTurn(sessionFile, "hello", sessionKey);

      const messages = await readSessionMessages(sessionFile);
      const seedUserIndex = messages.findIndex(
        (message) => message?.role === "user" && textFromContent(message.content) === "seed user",
      );
      const seedAssistantIndex = messages.findIndex(
        (message) =>
          message?.role === "assistant" && textFromContent(message.content) === "seed assistant",
      );
      const newUserIndex = messages.findIndex(
        (message) => message?.role === "user" && textFromContent(message.content) === "hello",
      );
      const newAssistantIndex = messages.findIndex(
        (message, index) => index > newUserIndex && message?.role === "assistant",
      );
      expect(seedUserIndex).toBeGreaterThanOrEqual(0);
      expect(seedAssistantIndex).toBeGreaterThan(seedUserIndex);
      expect(newUserIndex).toBeGreaterThan(seedAssistantIndex);
      expect(newAssistantIndex).toBeGreaterThan(newUserIndex);
    },
  );

  it("repairs orphaned user messages and continues", async () => {
    const result = await runWithOrphanedSingleUserMessage("orphaned user", nextSessionKey());

    expect(result.meta.error).toBeUndefined();
    expect(result.payloads?.length ?? 0).toBeGreaterThan(0);
  });
});
