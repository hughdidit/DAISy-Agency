<<<<<<< HEAD
import fs from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD

import { afterEach, describe, expect, it, vi } from "vitest";

=======
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> 387fb4074 (perf(test): skip heavy boot paths in reply suites)
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
=======
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> cfc2604d3 (perf(test): speed up heartbeat typing suite)
=======
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTempHomeHarness, makeReplyConfig } from "./reply.test-harness.js";
>>>>>>> cf26c409c (refactor(test): share auto-reply temp home harness)

const runEmbeddedPiAgentMock = vi.fn();

vi.mock("../agents/model-fallback.js", () => ({
  runWithModelFallback: async ({
    provider,
    model,
    run,
  }: {
    provider: string;
    model: string;
    run: (provider: string, model: string) => Promise<unknown>;
  }) => ({
    result: await run(provider, model),
    provider,
    model,
  }),
}));

vi.mock("../agents/pi-embedded.js", () => ({
  abortEmbeddedPiRun: vi.fn().mockReturnValue(false),
  runEmbeddedPiAgent: (params: unknown) => runEmbeddedPiAgentMock(params),
  queueEmbeddedPiMessage: vi.fn().mockReturnValue(false),
  resolveEmbeddedSessionLane: (key: string) => `session:${key.trim() || "main"}`,
  isEmbeddedPiRunActive: vi.fn().mockReturnValue(false),
  isEmbeddedPiRunStreaming: vi.fn().mockReturnValue(false),
}));

const webMocks = vi.hoisted(() => ({
  webAuthExists: vi.fn().mockResolvedValue(true),
  getWebAuthAgeMs: vi.fn().mockReturnValue(120_000),
  readWebSelfId: vi.fn().mockReturnValue({ e164: "+1999" }),
}));

vi.mock("../web/session.js", () => webMocks);

import { getReplyFromConfig } from "./reply.js";

const { withTempHome } = createTempHomeHarness({
  prefix: "openclaw-typing-",
  beforeEachCase: () => runEmbeddedPiAgentMock.mockClear(),
});

<<<<<<< HEAD
afterAll(async () => {
  if (!fixtureRoot) {
    return;
  }
  await fs.rm(fixtureRoot, { recursive: true, force: true });
});

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
<<<<<<< HEAD
  return withTempHomeBase(
    async (home) => {
      runEmbeddedPiAgentMock.mockClear();
      return await fn(home);
    },
    { prefix: "moltbot-typing-" },
  );
=======
  const home = join(fixtureRoot, `case-${++caseId}`);
  await fs.mkdir(join(home, ".openclaw", "agents", "main", "sessions"), { recursive: true });
  const envSnapshot = snapshotHomeEnv();
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.OPENCLAW_STATE_DIR = join(home, ".openclaw");
  process.env.OPENCLAW_AGENT_DIR = join(home, ".openclaw", "agent");
  process.env.PI_CODING_AGENT_DIR = join(home, ".openclaw", "agent");

  if (process.platform === "win32") {
    const match = home.match(/^([A-Za-z]:)(.*)$/);
    if (match) {
      process.env.HOMEDRIVE = match[1];
      process.env.HOMEPATH = match[2] || "\\";
    }
  }

  try {
    runEmbeddedPiAgentMock.mockClear();
    return await fn(home);
  } finally {
    restoreHomeEnv(envSnapshot);
  }
>>>>>>> cfc2604d3 (perf(test): speed up heartbeat typing suite)
}

function makeCfg(home: string) {
  return {
    agents: {
      defaults: {
        model: "anthropic/claude-opus-4-5",
        workspace: join(home, "clawd"),
      },
    },
    channels: {
      whatsapp: {
        allowFrom: ["*"],
      },
    },
    session: { store: join(home, "sessions.json") },
  };
}

=======
>>>>>>> cf26c409c (refactor(test): share auto-reply temp home harness)
afterEach(() => {
  vi.restoreAllMocks();
});

describe("getReplyFromConfig typing (heartbeat)", () => {
  beforeEach(() => {
    vi.stubEnv("OPENCLAW_TEST_FAST", "1");
  });

  it("starts typing for normal runs", async () => {
    await withTempHome(async (home) => {
      runEmbeddedPiAgentMock.mockResolvedValueOnce({
        payloads: [{ text: "ok" }],
        meta: {},
      });
      const onReplyStart = vi.fn();

      await getReplyFromConfig(
        { Body: "hi", From: "+1000", To: "+2000", Provider: "whatsapp" },
        { onReplyStart, isHeartbeat: false },
        makeReplyConfig(home),
      );

      expect(onReplyStart).toHaveBeenCalled();
    });
  });

  it("does not start typing for heartbeat runs", async () => {
    await withTempHome(async (home) => {
      runEmbeddedPiAgentMock.mockResolvedValueOnce({
        payloads: [{ text: "ok" }],
        meta: {},
      });
      const onReplyStart = vi.fn();

      await getReplyFromConfig(
        { Body: "hi", From: "+1000", To: "+2000", Provider: "whatsapp" },
        { onReplyStart, isHeartbeat: true },
        makeReplyConfig(home),
      );

      expect(onReplyStart).not.toHaveBeenCalled();
    });
  });
});
