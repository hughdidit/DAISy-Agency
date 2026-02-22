import "./isolated-agent.mocks.js";
import fs from "node:fs/promises";
<<<<<<< HEAD
import path from "node:path";

=======
>>>>>>> 9b9dc65a2 (fix(test): remove unused cron imports)
import { beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
import type { CliDeps } from "../cli/deps.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createPluginRuntime } from "../plugins/runtime/index.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";
import type { CronJob } from "./types.js";
import { discordPlugin } from "../../extensions/discord/src/channel.js";
import { telegramPlugin } from "../../extensions/telegram/src/channel.js";
import { whatsappPlugin } from "../../extensions/whatsapp/src/channel.js";
import { setDiscordRuntime } from "../../extensions/discord/src/runtime.js";
import { setTelegramRuntime } from "../../extensions/telegram/src/runtime.js";
import { setWhatsAppRuntime } from "../../extensions/whatsapp/src/runtime.js";

vi.mock("../agents/pi-embedded.js", () => ({
  abortEmbeddedPiRun: vi.fn().mockReturnValue(false),
  runEmbeddedPiAgent: vi.fn(),
  resolveEmbeddedSessionLane: (key: string) => `session:${key.trim() || "main"}`,
}));
vi.mock("../agents/model-catalog.js", () => ({
  loadModelCatalog: vi.fn(),
}));
vi.mock("../agents/subagent-announce.js", () => ({
  runSubagentAnnounceFlow: vi.fn(),
}));

=======
import type { CliDeps } from "../cli/deps.js";
>>>>>>> 9a26a735e (refactor(test): share cron isolated agent fixtures)
import { loadModelCatalog } from "../agents/model-catalog.js";
=======
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { CliDeps } from "../cli/deps.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { CliDeps } from "../cli/deps.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { runEmbeddedPiAgent } from "../agents/pi-embedded.js";
import { runSubagentAnnounceFlow } from "../agents/subagent-announce.js";
import type { CliDeps } from "../cli/deps.js";
import { runCronIsolatedAgentTurn } from "./isolated-agent.js";
import {
  makeCfg,
  makeJob,
  withTempCronHome,
  writeSessionStore,
} from "./isolated-agent.test-harness.js";
import { setupIsolatedAgentTurnMocks } from "./isolated-agent.test-setup.js";

function createCliDeps(overrides: Partial<CliDeps> = {}): CliDeps {
  return {
    sendMessageSlack: vi.fn(),
    sendMessageWhatsApp: vi.fn(),
    sendMessageTelegram: vi.fn(),
    sendMessageDiscord: vi.fn(),
    sendMessageSignal: vi.fn(),
    sendMessageIMessage: vi.fn(),
    ...overrides,
  };
}

function mockAgentPayloads(
  payloads: Array<Record<string, unknown>>,
  extra: Partial<Awaited<ReturnType<typeof runEmbeddedPiAgent>>> = {},
): void {
  vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
    payloads,
    meta: {
      durationMs: 5,
      agentMeta: { sessionId: "s", provider: "p", model: "m" },
    },
    ...extra,
  });
}

async function runTelegramAnnounceTurn(params: {
  home: string;
  storePath: string;
  deps: CliDeps;
  delivery: {
    mode: "announce";
    channel: string;
    to?: string;
    bestEffort?: boolean;
  };
}): Promise<Awaited<ReturnType<typeof runCronIsolatedAgentTurn>>> {
  return runCronIsolatedAgentTurn({
    cfg: makeCfg(params.home, params.storePath, {
      channels: { telegram: { botToken: "t-1" } },
    }),
    deps: params.deps,
    job: {
      ...makeJob({ kind: "agentTurn", message: "do it" }),
      delivery: params.delivery,
    },
    message: "do it",
    sessionKey: "cron:job-1",
    lane: "cron",
  });
}

<<<<<<< HEAD
async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(fn, { prefix: "moltbot-cron-" });
}

async function writeSessionStore(home: string) {
  const dir = path.join(home, ".clawdbot", "sessions");
  await fs.mkdir(dir, { recursive: true });
  const storePath = path.join(dir, "sessions.json");
  await fs.writeFile(
    storePath,
    JSON.stringify(
      {
        "agent:main:main": {
          sessionId: "main-session",
          updatedAt: Date.now(),
          lastProvider: "webchat",
          lastTo: "",
=======
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
<<<<<<< HEAD
      job: {
        ...makeJob({ kind: "agentTurn", message: "do it" }),
        delivery: {
          mode: "announce",
          channel: "telegram",
          to: "123",
          bestEffort: true,
>>>>>>> 9a26a735e (refactor(test): share cron isolated agent fixtures)
        },
=======
      delivery: {
        mode: "announce",
        channel: "telegram",
        to: "123",
        bestEffort: true,
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      },
    });

<<<<<<< HEAD
function makeCfg(
  home: string,
  storePath: string,
  overrides: Partial<MoltbotConfig> = {},
): MoltbotConfig {
  const base: MoltbotConfig = {
    agents: {
      defaults: {
        model: "anthropic/claude-opus-4-5",
        workspace: path.join(home, "clawd"),
      },
    },
    session: { store: storePath, mainKey: "main" },
  } as MoltbotConfig;
  return { ...base, ...overrides };
}

function makeJob(payload: CronJob["payload"]): CronJob {
  const now = Date.now();
  return {
    id: "job-1",
    name: "job-1",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "every", everyMs: 60_000 },
    sessionTarget: "isolated",
    wakeMode: "now",
    payload,
    state: {},
  };
=======
    expect(res.status).toBe("ok");
    expect(res.delivered).toBe(false);
    expect(runSubagentAnnounceFlow).not.toHaveBeenCalled();
    expect(deps.sendMessageTelegram).toHaveBeenCalledTimes(1);
  });
>>>>>>> 9a26a735e (refactor(test): share cron isolated agent fixtures)
}

async function expectExplicitTelegramTargetAnnounce(params: {
  payloads: Array<Record<string, unknown>>;
  expectedText: string;
}): Promise<void> {
  await withTempCronHome(async (home) => {
    const storePath = await writeSessionStore(home, { lastProvider: "webchat", lastTo: "" });
    const deps = createCliDeps();
    mockAgentPayloads(params.payloads);
    const res = await runTelegramAnnounceTurn({
      home,
      storePath,
      deps,
      delivery: { mode: "announce", channel: "telegram", to: "123" },
    });

    expect(res.status).toBe("ok");
    expect(res.delivered).toBe(true);
    expect(runSubagentAnnounceFlow).toHaveBeenCalledTimes(1);
    const announceArgs = vi.mocked(runSubagentAnnounceFlow).mock.calls[0]?.[0] as
      | {
          requesterOrigin?: { channel?: string; to?: string };
          roundOneReply?: string;
        }
      | undefined;
    expect(announceArgs?.requesterOrigin?.channel).toBe("telegram");
    expect(announceArgs?.requesterOrigin?.to).toBe("123");
    expect(announceArgs?.roundOneReply).toBe(params.expectedText);
    expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
  });
}

describe("runCronIsolatedAgentTurn", () => {
  beforeEach(() => {
<<<<<<< HEAD
    vi.mocked(runEmbeddedPiAgent).mockReset();
    vi.mocked(loadModelCatalog).mockResolvedValue([]);
    vi.mocked(runSubagentAnnounceFlow).mockReset().mockResolvedValue(true);
<<<<<<< HEAD
    const runtime = createPluginRuntime();
    setDiscordRuntime(runtime);
    setTelegramRuntime(runtime);
    setWhatsAppRuntime(runtime);
=======
>>>>>>> 8fae55e8e (fix(cron): share isolated announce flow + harden cron scheduling/delivery (#11641))
    setActivePluginRegistry(
      createTestRegistry([
        { pluginId: "whatsapp", plugin: whatsappPlugin, source: "test" },
        { pluginId: "telegram", plugin: telegramPlugin, source: "test" },
        { pluginId: "discord", plugin: discordPlugin, source: "test" },
      ]),
    );
=======
    setupIsolatedAgentTurnMocks();
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
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
<<<<<<< HEAD
      const call = vi.mocked(runSubagentAnnounceFlow).mock.calls[0]?.[0];
      expect(call?.label).toBe("Cron: job-1");
=======
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

  it("passes resolved threadId into shared subagent announce flow", async () => {
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
      const announceArgs = vi.mocked(runSubagentAnnounceFlow).mock.calls[0]?.[0] as
        | { requesterOrigin?: { threadId?: string | number; channel?: string; to?: string } }
        | undefined;
      expect(announceArgs?.requesterOrigin?.channel).toBe("telegram");
      expect(announceArgs?.requesterOrigin?.to).toBe("123");
      expect(announceArgs?.requesterOrigin?.threadId).toBe(42);
>>>>>>> 8fae55e8e (fix(cron): share isolated announce flow + harden cron scheduling/delivery (#11641))
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

      const res = await runTelegramAnnounceTurn({
        home,
        storePath,
        deps,
        delivery: { mode: "announce", channel: "telegram", to: "123" },
      });

      expect(res.status).toBe("ok");
      expect(runSubagentAnnounceFlow).not.toHaveBeenCalled();
<<<<<<< HEAD
=======
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
<<<<<<< HEAD
>>>>>>> 8fae55e8e (fix(cron): share isolated announce flow + harden cron scheduling/delivery (#11641))
=======
    });
  });

  it("reports not-delivered when best-effort structured outbound sends all fail", async () => {
    await expectBestEffortTelegramNotDelivered({
      text: "caption",
      mediaUrl: "https://example.com/img.png",
>>>>>>> 9a26a735e (refactor(test): share cron isolated agent fixtures)
    });
  });

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
<<<<<<< HEAD
=======
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
>>>>>>> 8fae55e8e (fix(cron): share isolated announce flow + harden cron scheduling/delivery (#11641))
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
      vi.mocked(runSubagentAnnounceFlow).mockResolvedValue(false);
<<<<<<< HEAD

=======
>>>>>>> 8fae55e8e (fix(cron): share isolated announce flow + harden cron scheduling/delivery (#11641))
      const res = await runCronIsolatedAgentTurn({
        cfg: makeCfg(home, storePath, {
          channels: { telegram: { botToken: "t-1" } },
        }),
=======
      const deps = createCliDeps({
        sendMessageTelegram: vi.fn().mockRejectedValue(new Error("boom")),
      });
      mockAgentPayloads([{ text: "hello from cron", mediaUrl: "https://example.com/img.png" }]);
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
  it("ignores shared announce flow failures when best-effort is enabled", async () => {
    await withTempHome(async (home) => {
      const storePath = await writeSessionStore(home);
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
      vi.mocked(runSubagentAnnounceFlow).mockResolvedValue(false);
<<<<<<< HEAD

=======
>>>>>>> 8fae55e8e (fix(cron): share isolated announce flow + harden cron scheduling/delivery (#11641))
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
<<<<<<< HEAD
=======
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
>>>>>>> 8fae55e8e (fix(cron): share isolated announce flow + harden cron scheduling/delivery (#11641))
    });
=======
  it("ignores direct delivery failures when best-effort is enabled", async () => {
    await expectBestEffortTelegramNotDelivered({ text: "hello from cron" });
>>>>>>> 9a26a735e (refactor(test): share cron isolated agent fixtures)
=======
  it("ignores structured direct delivery failures when best-effort is enabled", async () => {
    await expectBestEffortTelegramNotDelivered({
      text: "hello from cron",
      mediaUrl: "https://example.com/img.png",
    });
>>>>>>> 75001a049 (fix cron announce routing and timeout handling)
  });
});
