import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
import { beforeEach, describe, expect, it, vi } from "vitest";
=======
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
import * as replyModule from "../auto-reply/reply.js";
import type { MoltbotConfig } from "../config/config.js";
import { resolveMainSessionKey } from "../config/sessions.js";
<<<<<<< HEAD
import { runHeartbeatOnce } from "./heartbeat-runner.js";
<<<<<<< HEAD
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createPluginRuntime } from "../plugins/runtime/index.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";
import { telegramPlugin } from "../../extensions/telegram/src/channel.js";
import { whatsappPlugin } from "../../extensions/whatsapp/src/channel.js";
import { setTelegramRuntime } from "../../extensions/telegram/src/runtime.js";
import { setWhatsAppRuntime } from "../../extensions/whatsapp/src/runtime.js";
=======
=======
import { runHeartbeatOnce, type HeartbeatDeps } from "./heartbeat-runner.js";
>>>>>>> f476c8b48 (Fix #12767: Heartbeat  strip responsePrefix before HEARTBEAT_OK suppression)
import { installHeartbeatRunnerTestRuntime } from "./heartbeat-runner.test-harness.js";
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)

// Avoid pulling optional runtime deps during isolated runs.
vi.mock("jiti", () => ({ createJiti: () => () => ({}) }));

installHeartbeatRunnerTestRuntime();

describe("resolveHeartbeatIntervalMs", () => {
  function createHeartbeatConfig(params: {
    tmpDir: string;
    storePath: string;
    heartbeat: Record<string, unknown>;
    channels: Record<string, unknown>;
    messages?: Record<string, unknown>;
  }): OpenClawConfig {
    return {
      agents: {
        defaults: {
          workspace: params.tmpDir,
          heartbeat: params.heartbeat as never,
        },
      },
      channels: params.channels as never,
      ...(params.messages ? { messages: params.messages as never } : {}),
      session: { store: params.storePath },
    };
  }

  async function seedMainSession(
    storePath: string,
    cfg: OpenClawConfig,
    session: {
      sessionId?: string;
      updatedAt?: number;
      lastChannel: string;
      lastProvider: string;
      lastTo: string;
    },
  ) {
    const sessionKey = resolveMainSessionKey(cfg);
    await seedSessionStore(storePath, sessionKey, session);
    return sessionKey;
  }

  function makeWhatsAppDeps(
    params: {
      sendWhatsApp?: ReturnType<typeof vi.fn>;
      getQueueSize?: () => number;
      nowMs?: () => number;
      webAuthExists?: () => Promise<boolean>;
      hasActiveWebListener?: () => boolean;
    } = {},
  ) {
    return {
      ...(params.sendWhatsApp
        ? { sendWhatsApp: params.sendWhatsApp as unknown as HeartbeatDeps["sendWhatsApp"] }
        : {}),
      getQueueSize: params.getQueueSize ?? (() => 0),
      nowMs: params.nowMs ?? (() => 0),
      webAuthExists: params.webAuthExists ?? (async () => true),
      hasActiveWebListener: params.hasActiveWebListener ?? (() => true),
    } satisfies HeartbeatDeps;
  }

  function makeTelegramDeps(
    params: {
      sendTelegram?: ReturnType<typeof vi.fn>;
      getQueueSize?: () => number;
      nowMs?: () => number;
    } = {},
  ) {
    return {
      ...(params.sendTelegram
        ? { sendTelegram: params.sendTelegram as unknown as HeartbeatDeps["sendTelegram"] }
        : {}),
      getQueueSize: params.getQueueSize ?? (() => 0),
      nowMs: params.nowMs ?? (() => 0),
    } satisfies HeartbeatDeps;
  }

  async function seedSessionStore(
    storePath: string,
    sessionKey: string,
    session: {
      sessionId?: string;
      updatedAt?: number;
      lastChannel: string;
      lastProvider: string;
      lastTo: string;
    },
  ) {
    await fs.writeFile(
      storePath,
      JSON.stringify(
        {
          [sessionKey]: {
            sessionId: session.sessionId ?? "sid",
            updatedAt: session.updatedAt ?? Date.now(),
            ...session,
          },
        },
        null,
        2,
      ),
    );
  }

  async function withTempHeartbeatSandbox<T>(
    fn: (ctx: {
      tmpDir: string;
      storePath: string;
      replySpy: ReturnType<typeof vi.spyOn>;
    }) => Promise<T>,
  ) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-hb-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const replySpy = vi.spyOn(replyModule, "getReplyFromConfig");
    try {
      return await fn({ tmpDir, storePath, replySpy });
    } finally {
      replySpy.mockRestore();
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }

  async function withTempTelegramHeartbeatSandbox<T>(
    fn: (ctx: {
      tmpDir: string;
      storePath: string;
      replySpy: ReturnType<typeof vi.spyOn>;
    }) => Promise<T>,
  ) {
    const prevTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "";
    try {
      return await withTempHeartbeatSandbox(fn);
    } finally {
      if (prevTelegramToken === undefined) {
        delete process.env.TELEGRAM_BOT_TOKEN;
      } else {
        process.env.TELEGRAM_BOT_TOKEN = prevTelegramToken;
      }
    }
  }

  it("respects ackMaxChars for heartbeat acks", async () => {
<<<<<<< HEAD
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-hb-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const replySpy = vi.spyOn(replyModule, "getReplyFromConfig");
    try {
      const cfg: MoltbotConfig = {
=======
    await withTempHeartbeatSandbox(async ({ tmpDir, storePath, replySpy }) => {
<<<<<<< HEAD
      const cfg: OpenClawConfig = {
>>>>>>> ee331e8d5 (refactor(test): share heartbeat sandbox)
        agents: {
          defaults: {
            workspace: tmpDir,
            heartbeat: {
              every: "5m",
              target: "whatsapp",
              ackMaxChars: 0,
            },
          },
=======
      const cfg = createHeartbeatConfig({
        tmpDir,
        storePath,
        heartbeat: {
          every: "5m",
          target: "whatsapp",
          ackMaxChars: 0,
>>>>>>> 9c6e879a0 (refactor(test): dedupe heartbeat runner e2e scaffolding)
        },
        channels: { whatsapp: { allowFrom: ["*"] } },
      });

      await seedMainSession(storePath, cfg, {
        lastChannel: "whatsapp",
        lastProvider: "whatsapp",
        lastTo: "+1555",
      });

      replySpy.mockResolvedValue({ text: "HEARTBEAT_OK 🦞" });
      const sendWhatsApp = vi.fn().mockResolvedValue({
        messageId: "m1",
        toJid: "jid",
      });

      await runHeartbeatOnce({
        cfg,
        deps: makeWhatsAppDeps({ sendWhatsApp }),
      });

      expect(sendWhatsApp).toHaveBeenCalled();
    });
  });

  it("sends HEARTBEAT_OK when visibility.showOk is true", async () => {
<<<<<<< HEAD
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-hb-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const replySpy = vi.spyOn(replyModule, "getReplyFromConfig");
    try {
      const cfg: MoltbotConfig = {
=======
    await withTempHeartbeatSandbox(async ({ tmpDir, storePath, replySpy }) => {
<<<<<<< HEAD
      const cfg: OpenClawConfig = {
>>>>>>> ee331e8d5 (refactor(test): share heartbeat sandbox)
        agents: {
          defaults: {
            workspace: tmpDir,
            heartbeat: {
              every: "5m",
              target: "whatsapp",
            },
          },
=======
      const cfg = createHeartbeatConfig({
        tmpDir,
        storePath,
        heartbeat: {
          every: "5m",
          target: "whatsapp",
>>>>>>> 9c6e879a0 (refactor(test): dedupe heartbeat runner e2e scaffolding)
        },
        channels: { whatsapp: { allowFrom: ["*"], heartbeat: { showOk: true } } },
      });

      await seedMainSession(storePath, cfg, {
        lastChannel: "whatsapp",
        lastProvider: "whatsapp",
        lastTo: "+1555",
      });

      replySpy.mockResolvedValue({ text: "HEARTBEAT_OK" });
      const sendWhatsApp = vi.fn().mockResolvedValue({
        messageId: "m1",
        toJid: "jid",
      });

      await runHeartbeatOnce({
        cfg,
        deps: makeWhatsAppDeps({ sendWhatsApp }),
      });

      expect(sendWhatsApp).toHaveBeenCalledTimes(1);
      expect(sendWhatsApp).toHaveBeenCalledWith("+1555", "HEARTBEAT_OK", expect.any(Object));
    });
  });

  it("does not deliver HEARTBEAT_OK to telegram when showOk is false", async () => {
    await withTempTelegramHeartbeatSandbox(async ({ tmpDir, storePath, replySpy }) => {
      const cfg = createHeartbeatConfig({
        tmpDir,
        storePath,
        heartbeat: {
          every: "5m",
          target: "telegram",
        },
        channels: {
          telegram: {
            token: "test-token",
            allowFrom: ["*"],
            heartbeat: { showOk: false },
          },
        },
      });

      await seedMainSession(storePath, cfg, {
        lastChannel: "telegram",
        lastProvider: "telegram",
        lastTo: "12345",
      });

      replySpy.mockResolvedValue({ text: "HEARTBEAT_OK" });
      const sendTelegram = vi.fn().mockResolvedValue({
        messageId: "m1",
        toJid: "jid",
      });

      await runHeartbeatOnce({
        cfg,
        deps: makeTelegramDeps({ sendTelegram }),
      });

      expect(sendTelegram).not.toHaveBeenCalled();
    });
  });

  it("strips responsePrefix before detecting HEARTBEAT_OK and skips telegram delivery", async () => {
    await withTempTelegramHeartbeatSandbox(async ({ tmpDir, storePath, replySpy }) => {
      const cfg = createHeartbeatConfig({
        tmpDir,
        storePath,
        heartbeat: {
          every: "5m",
          target: "telegram",
        },
        channels: {
          telegram: {
            token: "test-token",
            allowFrom: ["*"],
            heartbeat: { showOk: false },
          },
        },
        messages: { responsePrefix: "[openclaw]" },
      });

      await seedMainSession(storePath, cfg, {
        lastChannel: "telegram",
        lastProvider: "telegram",
        lastTo: "12345",
      });

      replySpy.mockResolvedValue({ text: "[openclaw] HEARTBEAT_OK" });
      const sendTelegram = vi.fn().mockResolvedValue({
        messageId: "m1",
        toJid: "jid",
      });

      await runHeartbeatOnce({
        cfg,
        deps: makeTelegramDeps({ sendTelegram }),
      });

      expect(sendTelegram).not.toHaveBeenCalled();
    });
  });

  it("skips heartbeat LLM calls when visibility disables all output", async () => {
<<<<<<< HEAD
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-hb-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const replySpy = vi.spyOn(replyModule, "getReplyFromConfig");
    try {
      const cfg: MoltbotConfig = {
=======
    await withTempHeartbeatSandbox(async ({ tmpDir, storePath, replySpy }) => {
<<<<<<< HEAD
      const cfg: OpenClawConfig = {
>>>>>>> ee331e8d5 (refactor(test): share heartbeat sandbox)
        agents: {
          defaults: {
            workspace: tmpDir,
            heartbeat: {
              every: "5m",
              target: "whatsapp",
            },
          },
=======
      const cfg = createHeartbeatConfig({
        tmpDir,
        storePath,
        heartbeat: {
          every: "5m",
          target: "whatsapp",
>>>>>>> 9c6e879a0 (refactor(test): dedupe heartbeat runner e2e scaffolding)
        },
        channels: {
          whatsapp: {
            allowFrom: ["*"],
            heartbeat: { showOk: false, showAlerts: false, useIndicator: false },
          },
        },
      });

      await seedMainSession(storePath, cfg, {
        lastChannel: "whatsapp",
        lastProvider: "whatsapp",
        lastTo: "+1555",
      });

      const sendWhatsApp = vi.fn().mockResolvedValue({
        messageId: "m1",
        toJid: "jid",
      });

      const result = await runHeartbeatOnce({
        cfg,
        deps: makeWhatsAppDeps({ sendWhatsApp }),
      });

      expect(replySpy).not.toHaveBeenCalled();
      expect(sendWhatsApp).not.toHaveBeenCalled();
      expect(result).toEqual({ status: "skipped", reason: "alerts-disabled" });
    });
  });

  it("skips delivery for markup-wrapped HEARTBEAT_OK", async () => {
<<<<<<< HEAD
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-hb-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const replySpy = vi.spyOn(replyModule, "getReplyFromConfig");
    try {
      const cfg: MoltbotConfig = {
=======
    await withTempHeartbeatSandbox(async ({ tmpDir, storePath, replySpy }) => {
<<<<<<< HEAD
      const cfg: OpenClawConfig = {
>>>>>>> ee331e8d5 (refactor(test): share heartbeat sandbox)
        agents: {
          defaults: {
            workspace: tmpDir,
            heartbeat: {
              every: "5m",
              target: "whatsapp",
            },
          },
=======
      const cfg = createHeartbeatConfig({
        tmpDir,
        storePath,
        heartbeat: {
          every: "5m",
          target: "whatsapp",
>>>>>>> 9c6e879a0 (refactor(test): dedupe heartbeat runner e2e scaffolding)
        },
        channels: { whatsapp: { allowFrom: ["*"] } },
      });

      await seedMainSession(storePath, cfg, {
        lastChannel: "whatsapp",
        lastProvider: "whatsapp",
        lastTo: "+1555",
      });

      replySpy.mockResolvedValue({ text: "<b>HEARTBEAT_OK</b>" });
      const sendWhatsApp = vi.fn().mockResolvedValue({
        messageId: "m1",
        toJid: "jid",
      });

      await runHeartbeatOnce({
        cfg,
        deps: makeWhatsAppDeps({ sendWhatsApp }),
      });

      expect(sendWhatsApp).not.toHaveBeenCalled();
    });
  });

  it("does not regress updatedAt when restoring heartbeat sessions", async () => {
<<<<<<< HEAD
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-hb-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const replySpy = vi.spyOn(replyModule, "getReplyFromConfig");
    try {
=======
    await withTempHeartbeatSandbox(async ({ tmpDir, storePath, replySpy }) => {
>>>>>>> ee331e8d5 (refactor(test): share heartbeat sandbox)
      const originalUpdatedAt = 1000;
      const bumpedUpdatedAt = 2000;
<<<<<<< HEAD
      const cfg: MoltbotConfig = {
        agents: {
          defaults: {
            workspace: tmpDir,
            heartbeat: {
              every: "5m",
              target: "whatsapp",
            },
          },
=======
      const cfg = createHeartbeatConfig({
        tmpDir,
        storePath,
        heartbeat: {
          every: "5m",
          target: "whatsapp",
>>>>>>> 9c6e879a0 (refactor(test): dedupe heartbeat runner e2e scaffolding)
        },
        channels: { whatsapp: { allowFrom: ["*"] } },
      });

      const sessionKey = await seedMainSession(storePath, cfg, {
        updatedAt: originalUpdatedAt,
        lastChannel: "whatsapp",
        lastProvider: "whatsapp",
        lastTo: "+1555",
      });

      replySpy.mockImplementationOnce(async () => {
        const raw = await fs.readFile(storePath, "utf-8");
        const parsed = JSON.parse(raw) as Record<string, { updatedAt?: number } | undefined>;
        if (parsed[sessionKey]) {
          parsed[sessionKey] = {
            ...parsed[sessionKey],
            updatedAt: bumpedUpdatedAt,
          };
        }
        await fs.writeFile(storePath, JSON.stringify(parsed, null, 2));
        return { text: "" };
      });

      await runHeartbeatOnce({
        cfg,
        deps: makeWhatsAppDeps(),
      });

      const finalStore = JSON.parse(await fs.readFile(storePath, "utf-8")) as Record<
        string,
        { updatedAt?: number } | undefined
      >;
      expect(finalStore[sessionKey]?.updatedAt).toBe(bumpedUpdatedAt);
    });
  });

  it("skips WhatsApp delivery when not linked or running", async () => {
<<<<<<< HEAD
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-hb-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const replySpy = vi.spyOn(replyModule, "getReplyFromConfig");
    try {
      const cfg: MoltbotConfig = {
=======
    await withTempHeartbeatSandbox(async ({ tmpDir, storePath, replySpy }) => {
<<<<<<< HEAD
      const cfg: OpenClawConfig = {
>>>>>>> ee331e8d5 (refactor(test): share heartbeat sandbox)
        agents: {
          defaults: {
            workspace: tmpDir,
            heartbeat: { every: "5m", target: "whatsapp" },
          },
        },
=======
      const cfg = createHeartbeatConfig({
        tmpDir,
        storePath,
        heartbeat: { every: "5m", target: "whatsapp" },
>>>>>>> 9c6e879a0 (refactor(test): dedupe heartbeat runner e2e scaffolding)
        channels: { whatsapp: { allowFrom: ["*"] } },
      });
      await seedMainSession(storePath, cfg, {
        lastChannel: "whatsapp",
        lastProvider: "whatsapp",
        lastTo: "+1555",
      });

      replySpy.mockResolvedValue({ text: "Heartbeat alert" });
      const sendWhatsApp = vi.fn().mockResolvedValue({
        messageId: "m1",
        toJid: "jid",
      });

      const res = await runHeartbeatOnce({
        cfg,
        deps: makeWhatsAppDeps({
          sendWhatsApp,
          webAuthExists: async () => false,
          hasActiveWebListener: () => false,
        }),
      });

      expect(res.status).toBe("skipped");
      expect(res).toMatchObject({ reason: "whatsapp-not-linked" });
      expect(sendWhatsApp).not.toHaveBeenCalled();
    });
  });

<<<<<<< HEAD
  it("passes through accountId for telegram heartbeats", async () => {
<<<<<<< HEAD
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-hb-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const replySpy = vi.spyOn(replyModule, "getReplyFromConfig");
    const prevTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "";
    try {
      const cfg: MoltbotConfig = {
=======
=======
  async function expectTelegramHeartbeatAccountId(params: {
    heartbeat: Record<string, unknown>;
    telegram: Record<string, unknown>;
    expectedAccountId: string | undefined;
  }): Promise<void> {
>>>>>>> 937e1c21f (refactor(test): table telegram heartbeat account cases)
    await withTempTelegramHeartbeatSandbox(async ({ tmpDir, storePath, replySpy }) => {
<<<<<<< HEAD
      const cfg: OpenClawConfig = {
>>>>>>> 9c5404d95 (refactor(test): dedupe telegram heartbeat test setup)
        agents: {
          defaults: {
            workspace: tmpDir,
            heartbeat: params.heartbeat as never,
          },
        },
        channels: { telegram: params.telegram as never },
        session: { store: storePath },
      };
      const sessionKey = resolveMainSessionKey(cfg);

      await seedSessionStore(storePath, sessionKey, {
=======
      const cfg = createHeartbeatConfig({
        tmpDir,
        storePath,
        heartbeat: params.heartbeat,
        channels: { telegram: params.telegram },
      });
      await seedMainSession(storePath, cfg, {
>>>>>>> 9c6e879a0 (refactor(test): dedupe heartbeat runner e2e scaffolding)
        lastChannel: "telegram",
        lastProvider: "telegram",
        lastTo: "123456",
      });

      replySpy.mockResolvedValue({ text: "Hello from heartbeat" });
      const sendTelegram = vi.fn().mockResolvedValue({
        messageId: "m1",
        chatId: "123456",
      });

      await runHeartbeatOnce({
        cfg,
        deps: makeTelegramDeps({ sendTelegram }),
      });

      expect(sendTelegram).toHaveBeenCalledTimes(1);
      expect(sendTelegram).toHaveBeenCalledWith(
        "123456",
        "Hello from heartbeat",
        expect.objectContaining({ accountId: params.expectedAccountId, verbose: false }),
      );
    });
  }

  it.each([
    {
      title: "passes through accountId for telegram heartbeats",
      heartbeat: { every: "5m", target: "telegram" },
      telegram: { botToken: "test-bot-token-123" },
      expectedAccountId: undefined,
    },
    {
      title: "does not pre-resolve telegram accountId (allows config-only account tokens)",
      heartbeat: { every: "5m", target: "telegram" },
      telegram: {
        accounts: {
          work: { botToken: "test-bot-token-123" },
        },
      },
      expectedAccountId: undefined,
    },
    {
      title: "uses explicit heartbeat accountId for telegram delivery",
      heartbeat: { every: "5m", target: "telegram", accountId: "work" },
      telegram: {
        accounts: {
          work: { botToken: "test-bot-token-123" },
        },
<<<<<<< HEAD
        session: { store: storePath },
      };
      const sessionKey = resolveMainSessionKey(cfg);

      await seedSessionStore(storePath, sessionKey, {
        lastChannel: "telegram",
        lastProvider: "telegram",
        lastTo: "123456",
      });

      replySpy.mockResolvedValue({ text: "Hello from heartbeat" });
      const sendTelegram = vi.fn().mockResolvedValue({
        messageId: "m1",
        chatId: "123456",
      });

      await runHeartbeatOnce({
        cfg,
        deps: {
          sendTelegram,
          getQueueSize: () => 0,
          nowMs: () => 0,
        },
      });

      expect(sendTelegram).toHaveBeenCalledTimes(1);
      expect(sendTelegram).toHaveBeenCalledWith(
        "123456",
        "Hello from heartbeat",
        expect.objectContaining({ accountId: "work", verbose: false }),
      );
    });
  });

  it("does not pre-resolve telegram accountId (allows config-only account tokens)", async () => {
<<<<<<< HEAD
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-hb-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const replySpy = vi.spyOn(replyModule, "getReplyFromConfig");
    const prevTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "";
    try {
      const cfg: MoltbotConfig = {
=======
    await withTempTelegramHeartbeatSandbox(async ({ tmpDir, storePath, replySpy }) => {
      const cfg: OpenClawConfig = {
>>>>>>> 9c5404d95 (refactor(test): dedupe telegram heartbeat test setup)
        agents: {
          defaults: {
            workspace: tmpDir,
            heartbeat: { every: "5m", target: "telegram" },
          },
        },
        channels: {
          telegram: {
            accounts: {
              work: { botToken: "test-bot-token-123" },
            },
          },
        },
        session: { store: storePath },
      };
      const sessionKey = resolveMainSessionKey(cfg);

      await seedSessionStore(storePath, sessionKey, {
        lastChannel: "telegram",
        lastProvider: "telegram",
        lastTo: "123456",
      });

      replySpy.mockResolvedValue({ text: "Hello from heartbeat" });
      const sendTelegram = vi.fn().mockResolvedValue({
        messageId: "m1",
        chatId: "123456",
      });

      await runHeartbeatOnce({
        cfg,
        deps: {
          sendTelegram,
          getQueueSize: () => 0,
          nowMs: () => 0,
        },
      });

      expect(sendTelegram).toHaveBeenCalledTimes(1);
      expect(sendTelegram).toHaveBeenCalledWith(
        "123456",
        "Hello from heartbeat",
        expect.objectContaining({ accountId: undefined, verbose: false }),
      );
    });
=======
      },
      expectedAccountId: "work",
    },
  ])("$title", async ({ heartbeat, telegram, expectedAccountId }) => {
    await expectTelegramHeartbeatAccountId({ heartbeat, telegram, expectedAccountId });
>>>>>>> 937e1c21f (refactor(test): table telegram heartbeat account cases)
  });
});
