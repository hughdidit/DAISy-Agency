import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD

import { beforeEach, describe, expect, it, vi } from "vitest";

import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
=======
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> e324cb5b9 (perf(test): reduce fixture churn in hot suites)
=======
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
>>>>>>> aa6d8b27a (perf(test): merge queue integration coverage and shrink media fixture)
=======
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> 38098442c (perf(test): reduce setup churn in block streaming and docker tests)
import { loadModelCatalog } from "../agents/model-catalog.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { OpenClawConfig } from "../config/config.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { loadModelCatalog } from "../agents/model-catalog.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { OpenClawConfig } from "../config/config.js";
import { loadModelCatalog } from "../agents/model-catalog.js";
import { getReplyFromConfig } from "./reply.js";

type RunEmbeddedPiAgent = typeof import("../agents/pi-embedded.js").runEmbeddedPiAgent;
type RunEmbeddedPiAgentParams = Parameters<RunEmbeddedPiAgent>[0];
type RunEmbeddedPiAgentReply = Awaited<ReturnType<RunEmbeddedPiAgent>>;

const piEmbeddedMock = vi.hoisted(() => ({
  abortEmbeddedPiRun: vi.fn().mockReturnValue(false),
  runEmbeddedPiAgent: vi.fn<RunEmbeddedPiAgent>(),
  queueEmbeddedPiMessage: vi.fn().mockReturnValue(false),
  resolveEmbeddedSessionLane: (key: string) => `session:${key.trim() || "main"}`,
  isEmbeddedPiRunActive: vi.fn().mockReturnValue(false),
  isEmbeddedPiRunStreaming: vi.fn().mockReturnValue(false),
}));

vi.mock("/src/agents/pi-embedded.js", () => piEmbeddedMock);
vi.mock("../agents/pi-embedded.js", () => piEmbeddedMock);
vi.mock("../agents/model-catalog.js", () => ({
  loadModelCatalog: vi.fn(),
}));

type HomeEnvSnapshot = {
  HOME: string | undefined;
  USERPROFILE: string | undefined;
  HOMEDRIVE: string | undefined;
  HOMEPATH: string | undefined;
  OPENCLAW_STATE_DIR: string | undefined;
};

function snapshotHomeEnv(): HomeEnvSnapshot {
  return {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    HOMEDRIVE: process.env.HOMEDRIVE,
    HOMEPATH: process.env.HOMEPATH,
    OPENCLAW_STATE_DIR: process.env.OPENCLAW_STATE_DIR,
  };
}

function restoreHomeEnv(snapshot: HomeEnvSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

let fixtureRoot = "";
let caseId = 0;

type GetReplyOptions = NonNullable<Parameters<typeof getReplyFromConfig>[1]>;

function createEmbeddedReply(text: string): RunEmbeddedPiAgentReply {
  return {
    payloads: [{ text }],
    meta: {
      durationMs: 5,
      agentMeta: { sessionId: "s", provider: "p", model: "m" },
    },
  };
}

function createTelegramMessage(messageSid: string) {
  return {
    Body: "ping",
    From: "+1004",
    To: "+2000",
    MessageSid: messageSid,
    Provider: "telegram",
  } as const;
}

function createReplyConfig(home: string, streamMode?: "block"): OpenClawConfig {
  return {
    agents: {
      defaults: {
        model: { primary: "anthropic/claude-opus-4-5" },
        workspace: path.join(home, "openclaw"),
      },
    },
    channels: { telegram: { allowFrom: ["*"], streamMode } },
    session: { store: path.join(home, "sessions.json") },
  };
}

async function runTelegramReply(params: {
  home: string;
  messageSid: string;
  onBlockReply?: GetReplyOptions["onBlockReply"];
  onReplyStart?: GetReplyOptions["onReplyStart"];
  disableBlockStreaming?: boolean;
  streamMode?: "block";
}) {
  return getReplyFromConfig(
    createTelegramMessage(params.messageSid),
    {
      onReplyStart: params.onReplyStart,
      onBlockReply: params.onBlockReply,
      disableBlockStreaming: params.disableBlockStreaming,
    },
    createReplyConfig(params.home, params.streamMode),
  );
}

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
<<<<<<< HEAD
  return withTempHomeBase(fn, { prefix: "moltbot-stream-" });
=======
  const home = path.join(fixtureRoot, `case-${++caseId}`);
  await fs.mkdir(path.join(home, ".openclaw", "agents", "main", "sessions"), { recursive: true });
  const envSnapshot = snapshotHomeEnv();
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.OPENCLAW_STATE_DIR = path.join(home, ".openclaw");

  if (process.platform === "win32") {
    const match = home.match(/^([A-Za-z]:)(.*)$/);
    if (match) {
      process.env.HOMEDRIVE = match[1];
      process.env.HOMEPATH = match[2] || "\\";
    }
  }

  try {
    return await fn(home);
  } finally {
    restoreHomeEnv(envSnapshot);
  }
>>>>>>> e324cb5b9 (perf(test): reduce fixture churn in hot suites)
}

describe("block streaming", () => {
  beforeAll(async () => {
    fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-stream-"));
  });

  afterAll(async () => {
    if (process.platform === "win32") {
      await fs.rm(fixtureRoot, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 50,
      });
    } else {
      await fs.rm(fixtureRoot, {
        recursive: true,
        force: true,
      });
    }
  });

  beforeEach(() => {
    vi.stubEnv("OPENCLAW_TEST_FAST", "1");
    piEmbeddedMock.abortEmbeddedPiRun.mockReset().mockReturnValue(false);
    piEmbeddedMock.queueEmbeddedPiMessage.mockReset().mockReturnValue(false);
    piEmbeddedMock.isEmbeddedPiRunActive.mockReset().mockReturnValue(false);
    piEmbeddedMock.isEmbeddedPiRunStreaming.mockReset().mockReturnValue(false);
    piEmbeddedMock.runEmbeddedPiAgent.mockReset();
    vi.mocked(loadModelCatalog).mockResolvedValue([
      { id: "claude-opus-4-5", name: "Opus 4.5", provider: "anthropic" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openai" },
    ]);
  });

<<<<<<< HEAD
<<<<<<< HEAD
  it("waits for block replies before returning final payloads", async () => {
    await withTempHome(async (home) => {
      let releaseTyping: (() => void) | undefined;
      const typingGate = new Promise<void>((resolve) => {
        releaseTyping = resolve;
      });
      let resolveOnReplyStart: (() => void) | undefined;
      const onReplyStartCalled = new Promise<void>((resolve) => {
        resolveOnReplyStart = resolve;
      });
      const onReplyStart = vi.fn(() => {
        resolveOnReplyStart?.();
        return typingGate;
      });
      const onBlockReply = vi.fn().mockResolvedValue(undefined);

      const impl = async (params: RunEmbeddedPiAgentParams) => {
        void params.onBlockReply?.({ text: "hello" });
        return {
          payloads: [{ text: "hello" }],
          meta: {
            durationMs: 5,
            agentMeta: { sessionId: "s", provider: "p", model: "m" },
          },
        };
      };
      piEmbeddedMock.runEmbeddedPiAgent.mockImplementation(impl);

      const replyPromise = getReplyFromConfig(
        {
          Body: "ping",
          From: "+1004",
          To: "+2000",
          MessageSid: "msg-123",
          Provider: "discord",
        },
        {
          onReplyStart,
          onBlockReply,
          disableBlockStreaming: false,
        },
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          channels: { whatsapp: { allowFrom: ["*"] } },
          session: { store: path.join(home, "sessions.json") },
        },
      );

      await onReplyStartCalled;
      releaseTyping?.();

      const res = await replyPromise;
      expect(res).toBeUndefined();
      expect(onBlockReply).toHaveBeenCalledTimes(1);
    });
  });

  it("preserves block reply ordering when typing start is slow", async () => {
=======
  it("waits for block replies and preserves ordering when typing start is slow", async () => {
>>>>>>> e794ef047 (perf(test): reduce hot-suite setup and duplicate test work)
=======
  it("handles ordering, timeout fallback, and telegram streamMode block", async () => {
>>>>>>> 23e8f3a20 (perf(test): merge block-streaming scenarios into single fixture run)
    await withTempHome(async (home) => {
      let releaseTyping: (() => void) | undefined;
      const typingGate = new Promise<void>((resolve) => {
        releaseTyping = resolve;
      });
      let resolveOnReplyStart: (() => void) | undefined;
      const onReplyStartCalled = new Promise<void>((resolve) => {
        resolveOnReplyStart = resolve;
      });
      const onReplyStart = vi.fn(() => {
        resolveOnReplyStart?.();
        return typingGate;
      });
      const seen: string[] = [];
      const onBlockReply = vi.fn(async (payload) => {
        seen.push(payload.text ?? "");
      });

      const impl = async (params: RunEmbeddedPiAgentParams) => {
        void params.onBlockReply?.({ text: "first" });
        void params.onBlockReply?.({ text: "second" });
        return {
          payloads: [{ text: "first" }, { text: "second" }],
          meta: createEmbeddedReply("first").meta,
        };
      };
      piEmbeddedMock.runEmbeddedPiAgent.mockImplementation(impl);

<<<<<<< HEAD
      const replyPromise = getReplyFromConfig(
        {
          Body: "ping",
          From: "+1004",
          To: "+2000",
          MessageSid: "msg-123",
          Provider: "telegram",
        },
        {
          onReplyStart,
          onBlockReply,
          disableBlockStreaming: false,
        },
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          channels: { telegram: { allowFrom: ["*"] } },
          session: { store: path.join(home, "sessions.json") },
        },
      );
=======
      const replyPromise = runTelegramReply({
        home,
        messageSid: "msg-123",
        onReplyStart,
        onBlockReply,
        disableBlockStreaming: false,
      });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

      await onReplyStartCalled;
      releaseTyping?.();

      const res = await replyPromise;
      expect(res).toBeUndefined();
      expect(seen).toEqual(["first\n\nsecond"]);

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  it("drops final payloads when block replies streamed", async () => {
    await withTempHome(async (home) => {
      const onBlockReply = vi.fn().mockResolvedValue(undefined);

      const impl = async (params: RunEmbeddedPiAgentParams) => {
        void params.onBlockReply?.({ text: "chunk-1" });
        return {
          payloads: [{ text: "chunk-1\nchunk-2" }],
          meta: {
            durationMs: 5,
            agentMeta: { sessionId: "s", provider: "p", model: "m" },
          },
        };
      };
      piEmbeddedMock.runEmbeddedPiAgent.mockImplementation(impl);

      const res = await getReplyFromConfig(
        {
          Body: "ping",
          From: "+1004",
          To: "+2000",
          MessageSid: "msg-124",
          Provider: "discord",
        },
        {
          onBlockReply,
          disableBlockStreaming: false,
        },
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          channels: { whatsapp: { allowFrom: ["*"] } },
          session: { store: path.join(home, "sessions.json") },
        },
      );

      expect(res).toBeUndefined();
      expect(onBlockReply).toHaveBeenCalledTimes(1);
    });
  });

=======
>>>>>>> 5caf829d2 (perf(test): trim duplicate gateway and auto-reply test overhead)
  it("falls back to final payloads when block reply send times out", async () => {
=======
  it("falls back to final payloads and respects telegram streamMode block", async () => {
>>>>>>> 4bef423d8 (perf(test): reduce gateway reload waits and trim duplicate invoke coverage)
    await withTempHome(async (home) => {
=======
>>>>>>> 23e8f3a20 (perf(test): merge block-streaming scenarios into single fixture run)
      let sawAbort = false;
      const onBlockReplyTimeout = vi.fn((_, context) => {
        return new Promise<void>((resolve) => {
          context?.abortSignal?.addEventListener(
            "abort",
            () => {
              sawAbort = true;
              resolve();
            },
            { once: true },
          );
        });
      });

      const timeoutImpl = async (params: RunEmbeddedPiAgentParams) => {
        void params.onBlockReply?.({ text: "streamed" });
        return {
          payloads: [{ text: "final" }],
          meta: {
            durationMs: 5,
            agentMeta: { sessionId: "s", provider: "p", model: "m" },
          },
        };
      };
      piEmbeddedMock.runEmbeddedPiAgent.mockImplementation(timeoutImpl);

      const timeoutReplyPromise = getReplyFromConfig(
        {
          Body: "ping",
          From: "+1004",
          To: "+2000",
          MessageSid: "msg-126",
          Provider: "telegram",
        },
        {
          onBlockReply: onBlockReplyTimeout,
          blockReplyTimeoutMs: 1,
          disableBlockStreaming: false,
        },
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          channels: { telegram: { allowFrom: ["*"] } },
          session: { store: path.join(home, "sessions.json") },
        },
      );

      const timeoutRes = await timeoutReplyPromise;
      expect(timeoutRes).toMatchObject({ text: "final" });
      expect(sawAbort).toBe(true);

=======
>>>>>>> 9762e4813 (perf(test): speed up block streaming tests)
      const onBlockReplyStreamMode = vi.fn().mockResolvedValue(undefined);
<<<<<<< HEAD
      piEmbeddedMock.runEmbeddedPiAgent.mockImplementation(async () => ({
        payloads: [{ text: "final" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      }));

      const resStreamMode = await getReplyFromConfig(
        {
          Body: "ping",
          From: "+1004",
          To: "+2000",
          MessageSid: "msg-127",
          Provider: "telegram",
        },
        {
          onBlockReply: onBlockReplyStreamMode,
        },
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          channels: { telegram: { allowFrom: ["*"], streamMode: "block" } },
          session: { store: path.join(home, "sessions.json") },
        },
=======
      piEmbeddedMock.runEmbeddedPiAgent.mockImplementation(async () =>
        createEmbeddedReply("final"),
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      );

      const resStreamMode = await runTelegramReply({
        home,
        messageSid: "msg-127",
        onBlockReply: onBlockReplyStreamMode,
        streamMode: "block",
      });

      const streamPayload = Array.isArray(resStreamMode) ? resStreamMode[0] : resStreamMode;
      expect(streamPayload?.text).toBe("final");
      expect(onBlockReplyStreamMode).not.toHaveBeenCalled();
    });
  });
<<<<<<< HEAD
=======

  it("trims leading whitespace in block-streamed replies", async () => {
    await withTempHome(async (home) => {
      const seen: string[] = [];
      const onBlockReply = vi.fn(async (payload) => {
        seen.push(payload.text ?? "");
      });

      piEmbeddedMock.runEmbeddedPiAgent.mockImplementation(
        async (params: RunEmbeddedPiAgentParams) => {
          void params.onBlockReply?.({ text: "\n\n  Hello from stream" });
          return createEmbeddedReply("\n\n  Hello from stream");
        },
      );

      const res = await runTelegramReply({
        home,
        messageSid: "msg-128",
        onBlockReply,
        disableBlockStreaming: false,
      });

      expect(res).toBeUndefined();
      expect(onBlockReply).toHaveBeenCalledTimes(1);
      expect(seen).toEqual(["Hello from stream"]);
    });
  });

  it("still parses media directives for direct block payloads", async () => {
    await withTempHome(async (home) => {
      const onBlockReply = vi.fn();

      piEmbeddedMock.runEmbeddedPiAgent.mockImplementation(
        async (params: RunEmbeddedPiAgentParams) => {
          void params.onBlockReply?.({ text: "Result\nMEDIA: ./image.png" });
          return createEmbeddedReply("Result\nMEDIA: ./image.png");
        },
      );

      const res = await runTelegramReply({
        home,
        messageSid: "msg-129",
        onBlockReply,
        disableBlockStreaming: false,
      });

      expect(res).toBeUndefined();
      expect(onBlockReply).toHaveBeenCalledTimes(1);
      expect(onBlockReply.mock.calls[0][0]).toMatchObject({
        text: "Result",
        mediaUrls: ["./image.png"],
      });
    });
  });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
});
