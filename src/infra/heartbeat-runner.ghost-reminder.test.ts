import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
import { telegramPlugin } from "../../extensions/telegram/src/channel.js";
import { setTelegramRuntime } from "../../extensions/telegram/src/runtime.js";
<<<<<<< HEAD
=======
=======
>>>>>>> 5e8b1f5ac (refactor(test): centralize trigger and cron test helpers)
import * as replyModule from "../auto-reply/reply.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { OpenClawConfig } from "../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { resolveMainSessionKey } from "../config/sessions.js";
=======
>>>>>>> 694a9eb6d (test(heartbeat): reuse shared sandbox for ghost reminder scenarios)
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createPluginRuntime } from "../plugins/runtime/index.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";
<<<<<<< HEAD
=======
import { runHeartbeatOnce } from "./heartbeat-runner.js";
<<<<<<< HEAD
import { seedSessionStore } from "./heartbeat-runner.test-utils.js";
>>>>>>> cb6b835a4 (test: dedupe heartbeat and action-runner fixtures)
=======
import { seedMainSessionStore, withTempHeartbeatSandbox } from "./heartbeat-runner.test-utils.js";
>>>>>>> 694a9eb6d (test(heartbeat): reuse shared sandbox for ghost reminder scenarios)
=======
import { runHeartbeatOnce } from "./heartbeat-runner.js";
import {
  seedMainSessionStore,
  setupTelegramHeartbeatPluginRuntimeForTests,
  withTempHeartbeatSandbox,
} from "./heartbeat-runner.test-utils.js";
>>>>>>> 5e8b1f5ac (refactor(test): centralize trigger and cron test helpers)
import { enqueueSystemEvent, resetSystemEventsForTest } from "./system-events.js";
import { runHeartbeatOnce } from "./heartbeat-runner.js";

// Avoid pulling optional runtime deps during isolated runs.
vi.mock("jiti", () => ({ createJiti: () => () => ({}) }));

beforeEach(() => {
<<<<<<< HEAD
  const runtime = createPluginRuntime();
  setTelegramRuntime(runtime);
  setActivePluginRegistry(
    createTestRegistry([{ pluginId: "telegram", plugin: telegramPlugin, source: "test" }]),
  );
  // Reset system events queue to avoid cross-test pollution
=======
  setupTelegramHeartbeatPluginRuntimeForTests();
>>>>>>> 5e8b1f5ac (refactor(test): centralize trigger and cron test helpers)
  resetSystemEventsForTest();
});

afterEach(() => {
  // Clean up after each test
  resetSystemEventsForTest();
});

describe("Ghost reminder bug (issue #13317)", () => {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  it("should NOT trigger CRON_EVENT_PROMPT when only HEARTBEAT_OK is in system events", async () => {
=======
=======
  const withTempDir = async <T>(
    prefix: string,
    run: (tmpDir: string) => Promise<T>,
  ): Promise<T> => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    try {
      return await run(tmpDir);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  };

=======
>>>>>>> 694a9eb6d (test(heartbeat): reuse shared sandbox for ghost reminder scenarios)
  const createHeartbeatDeps = (replyText: string) => {
    const sendTelegram = vi.fn().mockResolvedValue({
      messageId: "m1",
      chatId: "155462274",
    });
    const getReplySpy = vi
      .spyOn(replyModule, "getReplyFromConfig")
      .mockResolvedValue({ text: replyText });
    return { sendTelegram, getReplySpy };
  };

<<<<<<< HEAD
>>>>>>> 1bbeedfab (test(infra): dedupe heartbeat ghost reminder temp/mocks setup)
  const createConfig = async (
    tmpDir: string,
  ): Promise<{ cfg: OpenClawConfig; sessionKey: string }> => {
    const storePath = path.join(tmpDir, "sessions.json");
=======
  const createConfig = async (params: {
    tmpDir: string;
    storePath: string;
  }): Promise<{ cfg: OpenClawConfig; sessionKey: string }> => {
>>>>>>> 694a9eb6d (test(heartbeat): reuse shared sandbox for ghost reminder scenarios)
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: params.tmpDir,
          heartbeat: {
            every: "5m",
            target: "telegram",
          },
        },
      },
      channels: { telegram: { allowFrom: ["*"] } },
      session: { store: params.storePath },
    };
    const sessionKey = await seedMainSessionStore(params.storePath, cfg, {
      lastChannel: "telegram",
      lastProvider: "telegram",
      lastTo: "155462274",
    });

    return { cfg, sessionKey };
  };

  const expectCronEventPrompt = (
    calledCtx: {
      Provider?: string;
      Body?: string;
    } | null,
    reminderText: string,
  ) => {
    expect(calledCtx).not.toBeNull();
    expect(calledCtx?.Provider).toBe("cron-event");
    expect(calledCtx?.Body).toContain("scheduled reminder has been triggered");
    expect(calledCtx?.Body).toContain(reminderText);
    expect(calledCtx?.Body).not.toContain("HEARTBEAT_OK");
    expect(calledCtx?.Body).not.toContain("heartbeat poll");
  };

  const runCronReminderCase = async (
    tmpPrefix: string,
    enqueue: (sessionKey: string) => void,
  ): Promise<{
    result: Awaited<ReturnType<typeof runHeartbeatOnce>>;
    sendTelegram: ReturnType<typeof vi.fn>;
    calledCtx: { Provider?: string; Body?: string } | null;
  }> => {
    return runHeartbeatCase({
      tmpPrefix,
      replyText: "Relay this reminder now",
      reason: "cron:reminder-job",
      enqueue,
    });
  };

  const runHeartbeatCase = async (params: {
    tmpPrefix: string;
    replyText: string;
    reason: string;
    enqueue: (sessionKey: string) => void;
  }): Promise<{
    result: Awaited<ReturnType<typeof runHeartbeatOnce>>;
    sendTelegram: ReturnType<typeof vi.fn>;
    calledCtx: { Provider?: string; Body?: string } | null;
    replyCallCount: number;
  }> => {
    return withTempHeartbeatSandbox(
      async ({ tmpDir, storePath }) => {
        const { sendTelegram, getReplySpy } = createHeartbeatDeps(params.replyText);
        const { cfg, sessionKey } = await createConfig({ tmpDir, storePath });
        params.enqueue(sessionKey);
        const result = await runHeartbeatOnce({
          cfg,
          agentId: "main",
          reason: params.reason,
          deps: {
            sendTelegram,
          },
        });
        const calledCtx = (getReplySpy.mock.calls[0]?.[0] ?? null) as {
          Provider?: string;
          Body?: string;
        } | null;
        return {
          result,
          sendTelegram,
          calledCtx,
          replyCallCount: getReplySpy.mock.calls.length,
        };
      },
      { prefix: params.tmpPrefix },
    );
  };

  it("does not use CRON_EVENT_PROMPT when only a HEARTBEAT_OK event is present", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 2b143de55 (refactor(test): dedupe ghost reminder assertions)
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-ghost-"));
    const storePath = path.join(tmpDir, "sessions.json");
    
    try {
      const cfg: OpenClawConfig = {
        agents: {
          defaults: {
            workspace: tmpDir,
            heartbeat: {
              every: "5m",
              target: "telegram",
            },
          },
        },
        channels: { telegram: { allowFrom: ["*"] } },
        session: { store: storePath },
      };
      
      const sessionKey = resolveMainSessionKey(cfg);
=======
    await withTempDir("openclaw-ghost-", async (tmpDir) => {
      const { sendTelegram, getReplySpy } = createHeartbeatDeps("Heartbeat check-in");
      const { cfg } = await createConfig(tmpDir);
      enqueueSystemEvent("HEARTBEAT_OK", { sessionKey: resolveMainSessionKey(cfg) });
>>>>>>> 1bbeedfab (test(infra): dedupe heartbeat ghost reminder temp/mocks setup)

      await fs.writeFile(
        storePath,
        JSON.stringify(
          {
            [sessionKey]: {
              sessionId: "sid",
              updatedAt: Date.now(),
              lastChannel: "telegram",
              lastProvider: "telegram",
              lastTo: "155462274",
            },
          },
          null,
          2,
        ),
      );

      // Simulate leftover HEARTBEAT_OK from previous heartbeat
      enqueueSystemEvent("HEARTBEAT_OK", { sessionKey });

      const sendTelegram = vi.fn().mockResolvedValue({
        messageId: "m1",
        chatId: "155462274",
      });

      // Run heartbeat with cron: reason (simulating cron job firing)
      const result = await runHeartbeatOnce({
        cfg,
        agentId: "main",
        reason: "cron:test-job",
        deps: {
          sendTelegram,
        },
      });

<<<<<<< HEAD
      // Check that heartbeat ran successfully
      expect(result.status).toBeDefined();
      
      // The bug: sendTelegram would be called with a message containing
      // "scheduled reminder" even though no actual reminder content exists.
      // The fix: should use regular heartbeat prompt, NOT CRON_EVENT_PROMPT.
      
      // If a message was sent, verify it doesn't contain ghost reminder text
      if (result.status === "sent") {
        const calls = sendTelegram.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const message = calls[0][0].message;
        
        // Should NOT contain the ghost reminder prompt
        expect(message).not.toContain("scheduled reminder has been triggered");
        expect(message).not.toContain("relay this reminder");
      }
      
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
=======
      expect(result.status).toBe("ran");
      expect(getReplySpy).toHaveBeenCalledTimes(1);
      const calledCtx = getReplySpy.mock.calls[0]?.[0];
      expect(calledCtx?.Provider).toBe("heartbeat");
      expect(calledCtx?.Body).not.toContain("scheduled reminder has been triggered");
      expect(calledCtx?.Body).not.toContain("relay this reminder");
      expect(sendTelegram).toHaveBeenCalled();
    });
>>>>>>> 1bbeedfab (test(infra): dedupe heartbeat ghost reminder temp/mocks setup)
=======
    await withTempHeartbeatSandbox(
      async ({ tmpDir, storePath }) => {
        const { sendTelegram, getReplySpy } = createHeartbeatDeps("Heartbeat check-in");
        const { cfg, sessionKey } = await createConfig({ tmpDir, storePath });
=======
    const { result, sendTelegram, calledCtx, replyCallCount } = await runHeartbeatCase({
      tmpPrefix: "openclaw-ghost-",
      replyText: "Heartbeat check-in",
      reason: "cron:test-job",
      enqueue: (sessionKey) => {
>>>>>>> 34ea33f05 (refactor: dedupe core config and runtime helpers)
        enqueueSystemEvent("HEARTBEAT_OK", { sessionKey });
      },
<<<<<<< HEAD
      { prefix: "openclaw-ghost-" },
    );
>>>>>>> 694a9eb6d (test(heartbeat): reuse shared sandbox for ghost reminder scenarios)
=======
    });
    expect(result.status).toBe("ran");
    expect(replyCallCount).toBe(1);
    expect(calledCtx?.Provider).toBe("heartbeat");
    expect(calledCtx?.Body).not.toContain("scheduled reminder has been triggered");
    expect(calledCtx?.Body).not.toContain("relay this reminder");
    expect(sendTelegram).toHaveBeenCalled();
>>>>>>> 34ea33f05 (refactor: dedupe core config and runtime helpers)
  });

<<<<<<< HEAD
  it("should trigger CRON_EVENT_PROMPT when actual cron message exists", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cron-"));
    const storePath = path.join(tmpDir, "sessions.json");
    
    try {
      const cfg: OpenClawConfig = {
        agents: {
          defaults: {
            workspace: tmpDir,
            heartbeat: {
              every: "5m",
              target: "telegram",
            },
          },
        },
        channels: { telegram: { allowFrom: ["*"] } },
        session: { store: storePath },
      };
      
      const sessionKey = resolveMainSessionKey(cfg);

<<<<<<< HEAD
      await fs.writeFile(
        storePath,
        JSON.stringify(
          {
            [sessionKey]: {
              sessionId: "sid",
              updatedAt: Date.now(),
              lastChannel: "telegram",
              lastProvider: "telegram",
              lastTo: "155462274",
            },
          },
          null,
          2,
        ),
      );
=======
      expect(result.status).toBe("ran");
      expectCronEventPrompt(getReplySpy, "Reminder: Check Base Scout results");
      expect(sendTelegram).toHaveBeenCalled();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
=======
  it("uses CRON_EVENT_PROMPT when an actionable cron event exists", async () => {
    const { result, sendTelegram, calledCtx } = await runCronReminderCase(
      "openclaw-cron-",
      (sessionKey) => {
        enqueueSystemEvent("Reminder: Check Base Scout results", { sessionKey });
      },
    );
    expect(result.status).toBe("ran");
    expectCronEventPrompt(calledCtx, "Reminder: Check Base Scout results");
    expect(sendTelegram).toHaveBeenCalled();
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
  });
>>>>>>> 2b143de55 (refactor(test): dedupe ghost reminder assertions)

<<<<<<< HEAD
      // Simulate real cron message (not HEARTBEAT_OK)
      enqueueSystemEvent("Reminder: Check Base Scout results", { sessionKey });

      const sendTelegram = vi.fn().mockResolvedValue({
        messageId: "m1",
        chatId: "155462274",
      });

      const result = await runHeartbeatOnce({
        cfg,
        agentId: "main",
        reason: "cron:reminder-job",
        deps: {
          sendTelegram,
        },
      });

<<<<<<< HEAD
      // Check that heartbeat ran
      expect(result.status).toBeDefined();
      
      // If a message was sent, verify it DOES contain the cron reminder prompt
      if (result.status === "sent") {
        const calls = sendTelegram.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const message = calls[0][0].message;
        
        // SHOULD contain the cron reminder prompt
        expect(message).toContain("scheduled reminder has been triggered");
      }
      
=======
      expect(result.status).toBe("ran");
      expectCronEventPrompt(getReplySpy, "Reminder: Check Base Scout results");
      expect(sendTelegram).toHaveBeenCalled();
>>>>>>> 2b143de55 (refactor(test): dedupe ghost reminder assertions)
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
=======
  it("uses CRON_EVENT_PROMPT when cron events are mixed with heartbeat noise", async () => {
    const { result, sendTelegram, calledCtx } = await runCronReminderCase(
      "openclaw-cron-mixed-",
      (sessionKey) => {
        enqueueSystemEvent("HEARTBEAT_OK", { sessionKey });
        enqueueSystemEvent("Reminder: Check Base Scout results", { sessionKey });
      },
    );
    expect(result.status).toBe("ran");
    expectCronEventPrompt(calledCtx, "Reminder: Check Base Scout results");
    expect(sendTelegram).toHaveBeenCalled();
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
  });

  it("uses CRON_EVENT_PROMPT for tagged cron events on interval wake", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cron-interval-"));
    const sendTelegram = vi.fn().mockResolvedValue({
      messageId: "m1",
      chatId: "155462274",
    });
    const getReplySpy = vi
      .spyOn(replyModule, "getReplyFromConfig")
      .mockResolvedValue({ text: "Relay this cron update now" });

    try {
=======
    await withTempDir("openclaw-cron-interval-", async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "HEARTBEAT.md"), "- Check status\n", "utf-8");
      const { sendTelegram, getReplySpy } = createHeartbeatDeps("Relay this cron update now");
>>>>>>> 1bbeedfab (test(infra): dedupe heartbeat ghost reminder temp/mocks setup)
      const { cfg, sessionKey } = await createConfig(tmpDir);
      enqueueSystemEvent("Cron: QMD maintenance completed", {
        sessionKey,
        contextKey: "cron:qmd-maintenance",
      });
=======
    await withTempHeartbeatSandbox(
      async ({ tmpDir, storePath }) => {
        const { sendTelegram, getReplySpy } = createHeartbeatDeps("Relay this cron update now");
        const { cfg, sessionKey } = await createConfig({ tmpDir, storePath });
=======
    const { result, sendTelegram, calledCtx, replyCallCount } = await runHeartbeatCase({
      tmpPrefix: "openclaw-cron-interval-",
      replyText: "Relay this cron update now",
      reason: "interval",
      enqueue: (sessionKey) => {
>>>>>>> 34ea33f05 (refactor: dedupe core config and runtime helpers)
        enqueueSystemEvent("Cron: QMD maintenance completed", {
          sessionKey,
          contextKey: "cron:qmd-maintenance",
        });
<<<<<<< HEAD
>>>>>>> 694a9eb6d (test(heartbeat): reuse shared sandbox for ghost reminder scenarios)

        const result = await runHeartbeatOnce({
          cfg,
          agentId: "main",
          reason: "interval",
          deps: {
            sendTelegram,
          },
        });

        expect(result.status).toBe("ran");
        expect(getReplySpy).toHaveBeenCalledTimes(1);
        const calledCtx = getReplySpy.mock.calls[0]?.[0];
        expect(calledCtx?.Provider).toBe("cron-event");
        expect(calledCtx?.Body).toContain("scheduled reminder has been triggered");
        expect(calledCtx?.Body).toContain("Cron: QMD maintenance completed");
        expect(calledCtx?.Body).not.toContain("Read HEARTBEAT.md");
        expect(sendTelegram).toHaveBeenCalled();
=======
>>>>>>> 34ea33f05 (refactor: dedupe core config and runtime helpers)
      },
    });
    expect(result.status).toBe("ran");
    expect(replyCallCount).toBe(1);
    expect(calledCtx?.Provider).toBe("cron-event");
    expect(calledCtx?.Body).toContain("scheduled reminder has been triggered");
    expect(calledCtx?.Body).toContain("Cron: QMD maintenance completed");
    expect(calledCtx?.Body).not.toContain("Read HEARTBEAT.md");
    expect(sendTelegram).toHaveBeenCalled();
  });
});
