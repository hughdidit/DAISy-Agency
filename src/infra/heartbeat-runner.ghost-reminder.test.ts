import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { telegramPlugin } from "../../extensions/telegram/src/channel.js";
import { setTelegramRuntime } from "../../extensions/telegram/src/runtime.js";
<<<<<<< HEAD
=======
import * as replyModule from "../auto-reply/reply.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { OpenClawConfig } from "../config/config.js";
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
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createPluginRuntime } from "../plugins/runtime/index.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";
<<<<<<< HEAD
=======
import { runHeartbeatOnce } from "./heartbeat-runner.js";
import { seedSessionStore } from "./heartbeat-runner.test-utils.js";
>>>>>>> cb6b835a4 (test: dedupe heartbeat and action-runner fixtures)
import { enqueueSystemEvent, resetSystemEventsForTest } from "./system-events.js";
import { runHeartbeatOnce } from "./heartbeat-runner.js";

// Avoid pulling optional runtime deps during isolated runs.
vi.mock("jiti", () => ({ createJiti: () => () => ({}) }));

beforeEach(() => {
  const runtime = createPluginRuntime();
  setTelegramRuntime(runtime);
  setActivePluginRegistry(
    createTestRegistry([{ pluginId: "telegram", plugin: telegramPlugin, source: "test" }]),
  );
  // Reset system events queue to avoid cross-test pollution
  resetSystemEventsForTest();
});

afterEach(() => {
  // Clean up after each test
  resetSystemEventsForTest();
});

describe("Ghost reminder bug (issue #13317)", () => {
<<<<<<< HEAD
  it("should NOT trigger CRON_EVENT_PROMPT when only HEARTBEAT_OK is in system events", async () => {
=======
  const createConfig = async (
    tmpDir: string,
  ): Promise<{ cfg: OpenClawConfig; sessionKey: string }> => {
    const storePath = path.join(tmpDir, "sessions.json");
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

    await seedSessionStore(storePath, sessionKey, {
      lastChannel: "telegram",
      lastProvider: "telegram",
      lastTo: "155462274",
    });

    return { cfg, sessionKey };
  };

  const expectCronEventPrompt = (
    getReplySpy: { mock: { calls: unknown[][] } },
    reminderText: string,
  ) => {
    expect(getReplySpy).toHaveBeenCalledTimes(1);
    const calledCtx = (getReplySpy.mock.calls[0]?.[0] ?? null) as {
      Provider?: string;
      Body?: string;
    } | null;
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
    getReplySpy: ReturnType<typeof vi.fn>;
  }> => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), tmpPrefix));
    const sendTelegram = vi.fn().mockResolvedValue({
      messageId: "m1",
      chatId: "155462274",
    });
    const getReplySpy = vi
      .spyOn(replyModule, "getReplyFromConfig")
      .mockResolvedValue({ text: "Relay this reminder now" });

    try {
      const { cfg, sessionKey } = await createConfig(tmpDir);
      enqueue(sessionKey);
      const result = await runHeartbeatOnce({
        cfg,
        agentId: "main",
        reason: "cron:reminder-job",
        deps: {
          sendTelegram,
        },
      });
      return { result, sendTelegram, getReplySpy };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  };

  it("does not use CRON_EVENT_PROMPT when only a HEARTBEAT_OK event is present", async () => {
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
    const { result, sendTelegram, getReplySpy } = await runCronReminderCase(
      "openclaw-cron-",
      (sessionKey) => {
        enqueueSystemEvent("Reminder: Check Base Scout results", { sessionKey });
      },
    );
    expect(result.status).toBe("ran");
    expectCronEventPrompt(getReplySpy, "Reminder: Check Base Scout results");
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
    const { result, sendTelegram, getReplySpy } = await runCronReminderCase(
      "openclaw-cron-mixed-",
      (sessionKey) => {
        enqueueSystemEvent("HEARTBEAT_OK", { sessionKey });
        enqueueSystemEvent("Reminder: Check Base Scout results", { sessionKey });
      },
    );
    expect(result.status).toBe("ran");
    expectCronEventPrompt(getReplySpy, "Reminder: Check Base Scout results");
    expect(sendTelegram).toHaveBeenCalled();
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
  });

  it("uses CRON_EVENT_PROMPT for tagged cron events on interval wake", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cron-interval-"));
    const sendTelegram = vi.fn().mockResolvedValue({
      messageId: "m1",
      chatId: "155462274",
    });
    const getReplySpy = vi
      .spyOn(replyModule, "getReplyFromConfig")
      .mockResolvedValue({ text: "Relay this cron update now" });

    try {
      const { cfg, sessionKey } = await createConfig(tmpDir);
      enqueueSystemEvent("Cron: QMD maintenance completed", {
        sessionKey,
        contextKey: "cron:qmd-maintenance",
      });

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
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
