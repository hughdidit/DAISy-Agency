import "./isolated-agent.mocks.js";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSubagentAnnounceFlow } from "../agents/subagent-announce.js";
import type { CliDeps } from "../cli/deps.js";
import {
  createCliDeps,
  mockAgentPayloads,
  runTelegramAnnounceTurn,
} from "./isolated-agent.delivery.test-helpers.js";
import { runCronIsolatedAgentTurn } from "./isolated-agent.js";
import {
  makeCfg,
  makeJob,
  withTempCronHome,
  writeSessionStore,
} from "./isolated-agent.test-harness.js";
import { setupIsolatedAgentTurnMocks } from "./isolated-agent.test-setup.js";

async function runExplicitTelegramAnnounceTurn(params: {
  home: string;
  storePath: string;
  deps: CliDeps;
}): Promise<Awaited<ReturnType<typeof runCronIsolatedAgentTurn>>> {
  return runTelegramAnnounceTurn({
    ...params,
    delivery: { mode: "announce", channel: "telegram", to: "123" },
  });
}

function expectDeliveredOk(result: Awaited<ReturnType<typeof runCronIsolatedAgentTurn>>): void {
  expect(result.status).toBe("ok");
  expect(result.delivered).toBe(true);
}

async function expectBestEffortTelegramNotDelivered(
  payload: Record<string, unknown>,
): Promise<void> {
  await withTempCronHome(async (home) => {
    const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
    const deps = createCliDeps({
      sendMessageTelegram: vi.fn().mockRejectedValue(new Error("boom")),
    });
    mockAgentPayloads([payload]);
    const res = await runTelegramAnnounceTurn({
      home,
      storePath,
      deps,
      delivery: {
        mode: "announce",
        channel: "telegram",
        to: "123",
        bestEffort: true,
      },
    });

    expect(res.status).toBe("ok");
    expect(res.delivered).toBe(false);
    expect(runSubagentAnnounceFlow).not.toHaveBeenCalled();
    expect(deps.sendMessageTelegram).toHaveBeenCalledTimes(1);
  });
}

async function expectExplicitTelegramTargetAnnounce(params: {
  payloads: Array<Record<string, unknown>>;
  expectedText: string;
}): Promise<void> {
  await withTempCronHome(async (home) => {
    const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
    const deps = createCliDeps();
    mockAgentPayloads(params.payloads);
    const res = await runExplicitTelegramAnnounceTurn({
      home,
      storePath,
      deps,
    });

    expectDeliveredOk(res);
    expect(runSubagentAnnounceFlow).toHaveBeenCalledTimes(1);
    const announceArgs = vi.mocked(runSubagentAnnounceFlow).mock.calls[0]?.[0] as
      | {
          requesterOrigin?: { channel?: string; to?: string };
          roundOneReply?: string;
          bestEffortDeliver?: boolean;
        }
      | undefined;
    expect(announceArgs?.requesterOrigin?.channel).toBe("telegram");
    expect(announceArgs?.requesterOrigin?.to).toBe("123");
    expect(announceArgs?.roundOneReply).toBe(params.expectedText);
    expect(announceArgs?.bestEffortDeliver).toBe(false);
    expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
  });
}

describe("runCronIsolatedAgentTurn", () => {
  beforeEach(() => {
    setupIsolatedAgentTurnMocks();
  });

<<<<<<< HEAD
<<<<<<< HEAD
  it("announces via shared subagent flow when delivery is requested", async () => {
    await withTempHome(async (home) => {
      const storePath = await writeSessionStore(home);
=======
  it("delivers directly when delivery has an explicit target", async () => {
<<<<<<< HEAD
    await withTempCronHome(async (home) => {
      const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
>>>>>>> 9a26a735e (refactor(test): share cron isolated agent fixtures)
      const deps: CliDeps = {
        sendMessageWhatsApp: vi.fn(),
        sendMessageTelegram: vi.fn(),
        sendMessageDiscord: vi.fn(),
        sendMessageSignal: vi.fn(),
        sendMessageIMessage: vi.fn(),
      };
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "hello from cron" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });

      const res = await runCronIsolatedAgentTurn({
        cfg: makeCfg(home, storePath, {
          channels: { telegram: { botToken: "t-1" } },
        }),
        deps,
        job: {
          ...makeJob({ kind: "agentTurn", message: "do it" }),
          delivery: { mode: "announce", channel: "telegram", to: "123" },
        },
        message: "do it",
        sessionKey: "cron:job-1",
        lane: "cron",
      });

      expect(res.status).toBe("ok");
      expect(runSubagentAnnounceFlow).toHaveBeenCalledTimes(1);
      const announceArgs = vi.mocked(runSubagentAnnounceFlow).mock.calls[0]?.[0] as
        | { announceType?: string }
        | undefined;
      expect(announceArgs?.announceType).toBe("cron job");
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
=======
    await expectExplicitTelegramTargetDelivery({
=======
  it("routes text-only explicit target delivery through announce flow", async () => {
    await expectExplicitTelegramTargetAnnounce({
>>>>>>> 75001a049 (fix cron announce routing and timeout handling)
      payloads: [{ text: "hello from cron" }],
      expectedText: "hello from cron",
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    });
  });

<<<<<<< HEAD
<<<<<<< HEAD
  it("passes final payload text into shared subagent announce flow", async () => {
    await withTempHome(async (home) => {
      const storePath = await writeSessionStore(home);
=======
  it("delivers the final payload text when delivery has an explicit target", async () => {
<<<<<<< HEAD
    await withTempCronHome(async (home) => {
      const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
>>>>>>> 9a26a735e (refactor(test): share cron isolated agent fixtures)
      const deps: CliDeps = {
        sendMessageWhatsApp: vi.fn(),
        sendMessageTelegram: vi.fn(),
        sendMessageDiscord: vi.fn(),
        sendMessageSignal: vi.fn(),
        sendMessageIMessage: vi.fn(),
      };
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "Working on it..." }, { text: "Final weather summary" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });

      const res = await runCronIsolatedAgentTurn({
        cfg: makeCfg(home, storePath, {
          channels: { telegram: { botToken: "t-1" } },
        }),
        deps,
        job: {
          ...makeJob({ kind: "agentTurn", message: "do it" }),
          delivery: { mode: "announce", channel: "telegram", to: "123" },
        },
        message: "do it",
        sessionKey: "cron:job-1",
        lane: "cron",
      });

      expect(res.status).toBe("ok");
      expect(runSubagentAnnounceFlow).toHaveBeenCalledTimes(1);
      const announceArgs = vi.mocked(runSubagentAnnounceFlow).mock.calls[0]?.[0] as
        | { roundOneReply?: string; requesterOrigin?: { threadId?: string | number } }
        | undefined;
      expect(announceArgs?.roundOneReply).toBe("Final weather summary");
      expect(announceArgs?.requesterOrigin?.threadId).toBeUndefined();
=======
    await expectExplicitTelegramTargetDelivery({
=======
  it("announces the final payload text when delivery has an explicit target", async () => {
    await expectExplicitTelegramTargetAnnounce({
>>>>>>> 75001a049 (fix cron announce routing and timeout handling)
      payloads: [{ text: "Working on it..." }, { text: "Final weather summary" }],
      expectedText: "Final weather summary",
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    });
  });

  it("routes announce injection to the delivery-target session key", async () => {
    await withTempCronHome(async (home) => {
      const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
      const deps = createCliDeps();
      mockAgentPayloads([{ text: "hello from cron" }]);

      const res = await runCronIsolatedAgentTurn({
        cfg: makeCfg(home, storePath, {
          session: {
            store: storePath,
            mainKey: "main",
            dmScope: "per-channel-peer",
          },
          channels: {
            telegram: { botToken: "t-1" },
          },
        }),
        deps,
        job: {
          ...makeJob({ kind: "agentTurn", message: "do it" }),
          delivery: { mode: "announce", channel: "telegram", to: "123" },
        },
        message: "do it",
        sessionKey: "cron:job-1",
        lane: "cron",
      });

      expect(res.status).toBe("ok");
      expect(runSubagentAnnounceFlow).toHaveBeenCalledTimes(1);
      const announceArgs = vi.mocked(runSubagentAnnounceFlow).mock.calls[0]?.[0] as
        | {
            requesterSessionKey?: string;
            requesterOrigin?: { channel?: string; to?: string };
          }
        | undefined;
      expect(announceArgs?.requesterSessionKey).toBe("agent:main:telegram:direct:123");
      expect(announceArgs?.requesterOrigin?.channel).toBe("telegram");
      expect(announceArgs?.requesterOrigin?.to).toBe("123");
    });
  });

  it("routes threaded announce targets through direct delivery", async () => {
    await withTempCronHome(async (home) => {
      const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
      await fs.writeFile(
        storePath,
        JSON.stringify(
          {
            "agent:main:main": {
              sessionId: "main-session",
              updatedAt: Date.now(),
              lastChannel: "telegram",
              lastTo: "123",
              lastThreadId: 42,
            },
          },
          null,
          2,
        ),
        "utf-8",
      );
      const deps = createCliDeps();
      mockAgentPayloads([{ text: "Final weather summary" }]);
      const res = await runTelegramAnnounceTurn({
        home,
        storePath,
        deps,
        delivery: { mode: "announce", channel: "last" },
      });

      expect(res.status).toBe("ok");
<<<<<<< HEAD
      const announceArgs = vi.mocked(runSubagentAnnounceFlow).mock.calls[0]?.[0] as
        | { requesterOrigin?: { threadId?: string | number; channel?: string; to?: string } }
        | undefined;
      expect(announceArgs?.requesterOrigin?.channel).toBe("telegram");
      expect(announceArgs?.requesterOrigin?.to).toBe("123");
      expect(announceArgs?.requesterOrigin?.threadId).toBe(42);
=======
      expect(res.delivered).toBe(true);
      expect(runSubagentAnnounceFlow).not.toHaveBeenCalled();
      expect(deps.sendMessageTelegram).toHaveBeenCalledTimes(1);
      expect(deps.sendMessageTelegram).toHaveBeenCalledWith(
        "123",
        "Final weather summary",
        expect.objectContaining({
          messageThreadId: 42,
        }),
      );
>>>>>>> ffb12397a (fix(cron): direct-deliver thread and topic announce targets)
    });
  });

  it("skips announce when messaging tool already sent to target", async () => {
    await withTempCronHome(async (home) => {
      const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
      const deps = createCliDeps();
      mockAgentPayloads([{ text: "sent" }], {
        didSendViaMessagingTool: true,
        messagingToolSentTargets: [{ tool: "message", provider: "telegram", to: "123" }],
      });

      const res = await runExplicitTelegramAnnounceTurn({
        home,
        storePath,
        deps,
      });

<<<<<<< HEAD
      expect(res.status).toBe("ok");
=======
      expectDeliveredOk(res);
>>>>>>> 1c753ea78 (test: dedupe fixtures and test harness setup)
      expect(runSubagentAnnounceFlow).not.toHaveBeenCalled();
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
    });
  });

<<<<<<< HEAD
=======
  it("reports not-delivered when best-effort structured outbound sends all fail", async () => {
    await expectBestEffortTelegramNotDelivered({
      text: "caption",
      mediaUrl: "https://example.com/img.png",
    });
  });

>>>>>>> 9a26a735e (refactor(test): share cron isolated agent fixtures)
  it("skips announce for heartbeat-only output", async () => {
    await withTempCronHome(async (home) => {
      const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
      const deps = createCliDeps();
      mockAgentPayloads([{ text: "HEARTBEAT_OK" }]);
      const res = await runTelegramAnnounceTurn({
        home,
        storePath,
        deps,
        delivery: { mode: "announce", channel: "telegram", to: "123" },
      });

      expect(res.status).toBe("ok");
      expect(runSubagentAnnounceFlow).not.toHaveBeenCalled();
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
    });
  });

<<<<<<< HEAD
<<<<<<< HEAD
  it("fails when shared announce flow fails and best-effort is disabled", async () => {
    await withTempHome(async (home) => {
      const storePath = await writeSessionStore(home);
=======
  it("fails when direct delivery fails and best-effort is disabled", async () => {
=======
  it("fails when structured direct delivery fails and best-effort is disabled", async () => {
>>>>>>> 75001a049 (fix cron announce routing and timeout handling)
    await withTempCronHome(async (home) => {
      const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
<<<<<<< HEAD
>>>>>>> 9a26a735e (refactor(test): share cron isolated agent fixtures)
      const deps: CliDeps = {
        sendMessageWhatsApp: vi.fn(),
=======
      const deps = createCliDeps({
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
        sendMessageTelegram: vi.fn().mockRejectedValue(new Error("boom")),
      });
<<<<<<< HEAD
<<<<<<< HEAD
      vi.mocked(runSubagentAnnounceFlow).mockResolvedValue(false);
      const res = await runCronIsolatedAgentTurn({
        cfg: makeCfg(home, storePath, {
          channels: { telegram: { botToken: "t-1" } },
        }),
=======
      mockAgentPayloads([{ text: "hello from cron" }]);
=======
      mockAgentPayloads([{ text: "hello from cron", mediaUrl: "https://example.com/img.png" }]);
>>>>>>> 75001a049 (fix cron announce routing and timeout handling)
      const res = await runTelegramAnnounceTurn({
        home,
        storePath,
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
        deps,
        delivery: { mode: "announce", channel: "telegram", to: "123" },
      });

      expect(res.status).toBe("error");
      expect(res.error).toBe("cron announce delivery failed");
    });
  });

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  it("ignores shared announce flow failures when best-effort is enabled", async () => {
    await withTempHome(async (home) => {
      const storePath = await writeSessionStore(home);
      const deps: CliDeps = {
        sendMessageWhatsApp: vi.fn(),
        sendMessageTelegram: vi.fn().mockRejectedValue(new Error("boom")),
        sendMessageDiscord: vi.fn(),
        sendMessageSignal: vi.fn(),
        sendMessageIMessage: vi.fn(),
      };
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "hello from cron" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });
      vi.mocked(runSubagentAnnounceFlow).mockResolvedValue(false);
      const res = await runCronIsolatedAgentTurn({
        cfg: makeCfg(home, storePath, {
          channels: { telegram: { botToken: "t-1" } },
        }),
        deps,
        job: {
          ...makeJob({ kind: "agentTurn", message: "do it" }),
          delivery: {
            mode: "announce",
            channel: "telegram",
            to: "123",
            bestEffort: true,
          },
        },
        message: "do it",
        sessionKey: "cron:job-1",
        lane: "cron",
      });

      expect(res.status).toBe("ok");
      expect(runSubagentAnnounceFlow).toHaveBeenCalledTimes(1);
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
    });
=======
  it("ignores direct delivery failures when best-effort is enabled", async () => {
    await expectBestEffortTelegramNotDelivered({ text: "hello from cron" });
>>>>>>> 9a26a735e (refactor(test): share cron isolated agent fixtures)
=======
=======
  it("fails when announce delivery reports false and best-effort is disabled", async () => {
    await withTempCronHome(async (home) => {
      const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
      const deps = createCliDeps();
      mockAgentPayloads([{ text: "hello from cron" }]);
      vi.mocked(runSubagentAnnounceFlow).mockResolvedValueOnce(false);

      const res = await runTelegramAnnounceTurn({
        home,
        storePath,
        deps,
        delivery: {
          mode: "announce",
          channel: "telegram",
          to: "123",
          bestEffort: false,
        },
      });

      expect(res.status).toBe("error");
      expect(res.error).toContain("cron announce delivery failed");
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
    });
  });

>>>>>>> 32e6ccb7b (test(cron): cover announce failure when best-effort is off)
  it("ignores structured direct delivery failures when best-effort is enabled", async () => {
    await expectBestEffortTelegramNotDelivered({
      text: "hello from cron",
      mediaUrl: "https://example.com/img.png",
    });
>>>>>>> 75001a049 (fix cron announce routing and timeout handling)
  });
});
