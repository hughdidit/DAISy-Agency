import fs from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  expectInlineCommandHandledAndStripped,
  getRunEmbeddedPiAgentMock,
  installTriggerHandlingE2eTestHooks,
  loadGetReplyFromConfig,
  MAIN_SESSION_KEY,
  makeCfg,
  makeWhatsAppElevatedCfg,
  mockRunEmbeddedPiAgentOk,
  readSessionStore,
  requireSessionStorePath,
  runGreetingPromptForBareNewOrReset,
  withTempHome,
} from "./reply.triggers.trigger-handling.test-harness.js";

<<<<<<< HEAD
<<<<<<< HEAD
const _MAIN_SESSION_KEY = "agent:main:main";

const webMocks = vi.hoisted(() => ({
  webAuthExists: vi.fn().mockResolvedValue(true),
  getWebAuthAgeMs: vi.fn().mockReturnValue(120_000),
  readWebSelfId: vi.fn().mockReturnValue({ e164: "+1999" }),
}));

vi.mock("../web/session.js", () => webMocks);

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(
    async (home) => {
      vi.mocked(runEmbeddedPiAgent).mockClear();
      vi.mocked(abortEmbeddedPiRun).mockClear();
      return await fn(home);
    },
    { prefix: "moltbot-triggers-" },
  );
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

afterEach(() => {
  vi.restoreAllMocks();
});
=======
=======
let getReplyFromConfig: typeof import("./reply.js").getReplyFromConfig;
beforeAll(async () => {
  getReplyFromConfig = await loadGetReplyFromConfig();
});

>>>>>>> 043ae0044 (test(auto-reply): import reply after harness mocks)
installTriggerHandlingE2eTestHooks();
>>>>>>> eb594a090 (refactor(test): dedupe trigger-handling e2e setup)

function makeUnauthorizedWhatsAppCfg(home: string) {
  const baseCfg = makeCfg(home);
  return {
    ...baseCfg,
    channels: {
      ...baseCfg.channels,
      whatsapp: {
        allowFrom: ["+1000"],
      },
    },
  };
}

async function expectResetBlockedForNonOwner(params: { home: string }): Promise<void> {
  const { home } = params;
  const runEmbeddedPiAgentMock = getRunEmbeddedPiAgentMock();
  runEmbeddedPiAgentMock.mockClear();
  const cfg = makeCfg(home);
  cfg.channels ??= {};
  cfg.channels.whatsapp = {
    ...cfg.channels.whatsapp,
    allowFrom: ["+1999"],
  };
  cfg.session = {
    ...cfg.session,
    store: join(home, "blocked-reset.sessions.json"),
  };
  const res = await getReplyFromConfig(
    {
      Body: "/reset",
      From: "+1003",
      To: "+2000",
      CommandAuthorized: true,
    },
    {},
    cfg,
  );
  expect(res).toBeUndefined();
  expect(runEmbeddedPiAgentMock).not.toHaveBeenCalled();
}

async function expectUnauthorizedCommandDropped(home: string, body: "/status") {
  const runEmbeddedPiAgentMock = getRunEmbeddedPiAgentMock();
  const cfg = makeUnauthorizedWhatsAppCfg(home);

  const res = await getReplyFromConfig(
    {
      Body: body,
      From: "+2001",
      To: "+2000",
      Provider: "whatsapp",
      SenderE164: "+2001",
    },
    {},
    cfg,
  );

  expect(res).toBeUndefined();
  expect(runEmbeddedPiAgentMock).not.toHaveBeenCalled();
}

function mockEmbeddedOk() {
  return mockRunEmbeddedPiAgentOk("ok");
}

async function runInlineUnauthorizedCommand(params: { home: string; command: "/status" }) {
  const cfg = makeUnauthorizedWhatsAppCfg(params.home);
  const res = await getReplyFromConfig(
    {
      Body: `please ${params.command} now`,
      From: "+2001",
      To: "+2000",
      Provider: "whatsapp",
      SenderE164: "+2001",
    },
    {},
    cfg,
  );
  return res;
}

describe("trigger handling", () => {
  it("handles owner-admin commands without invoking the agent", async () => {
    await withTempHome(async (home) => {
      {
        const runEmbeddedPiAgentMock = getRunEmbeddedPiAgentMock();
        runEmbeddedPiAgentMock.mockClear();
        const cfg = makeCfg(home);
        const res = await getReplyFromConfig(
          {
            Body: "/activation mention",
            From: "123@g.us",
            To: "+2000",
            ChatType: "group",
            Provider: "whatsapp",
            SenderE164: "+999",
            CommandAuthorized: true,
          },
          {},
          cfg,
        );
        const text = Array.isArray(res) ? res[0]?.text : res?.text;
        expect(text).toBe("⚙️ Group activation set to mention.");
        expect(runEmbeddedPiAgentMock).not.toHaveBeenCalled();
      }

      {
        const runEmbeddedPiAgentMock = getRunEmbeddedPiAgentMock();
        runEmbeddedPiAgentMock.mockClear();
        const cfg = makeUnauthorizedWhatsAppCfg(home);
        const res = await getReplyFromConfig(
          {
            Body: "/send off",
            From: "+1000",
            To: "+2000",
            Provider: "whatsapp",
            SenderE164: "+1000",
            CommandAuthorized: true,
          },
          {},
          cfg,
        );
        const text = Array.isArray(res) ? res[0]?.text : res?.text;
        expect(text).toContain("Send policy set to off");

        const storeRaw = await fs.readFile(requireSessionStorePath(cfg), "utf-8");
        const store = JSON.parse(storeRaw) as Record<string, { sendPolicy?: string }>;
        expect(store[MAIN_SESSION_KEY]?.sendPolicy).toBe("deny");
        expect(runEmbeddedPiAgentMock).not.toHaveBeenCalled();
      }
    });
  });

  it("injects group activation context into the system prompt", async () => {
    await withTempHome(async (home) => {
      getRunEmbeddedPiAgentMock().mockResolvedValue({
        payloads: [{ text: "ok" }],
        meta: {
          durationMs: 1,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });
      const cfg = makeCfg(home);
      cfg.channels ??= {};
      cfg.channels.whatsapp = {
        ...cfg.channels.whatsapp,
        allowFrom: ["*"],
        groups: { "*": { requireMention: false } },
      };
      cfg.messages = {
        ...cfg.messages,
        groupChat: {},
      };

      const res = await getReplyFromConfig(
        {
          Body: "hello group",
          From: "123@g.us",
          To: "+2000",
          ChatType: "group",
          Provider: "whatsapp",
          SenderE164: "+2000",
          GroupSubject: "Test Group",
          GroupMembers: "Alice (+1), Bob (+2)",
        },
        {},
        cfg,
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toBe("ok");
      expect(getRunEmbeddedPiAgentMock()).toHaveBeenCalledOnce();
      const extra = getRunEmbeddedPiAgentMock().mock.calls[0]?.[0]?.extraSystemPrompt ?? "";
      expect(extra).toContain('"chat_type": "group"');
      expect(extra).toContain("Activation: always-on");
    });
  });

  it("runs a greeting prompt for bare /new and blocks unauthorized /reset", async () => {
    await withTempHome(async (home) => {
      await runGreetingPromptForBareNewOrReset({ home, body: "/new", getReplyFromConfig });
      await expectResetBlockedForNonOwner({ home });
    });
  });

  it("handles inline commands and strips directives before the agent", async () => {
    await withTempHome(async (home) => {
      await expectInlineCommandHandledAndStripped({
        home,
        getReplyFromConfig,
        body: "please /whoami now",
        stripToken: "/whoami",
        blockReplyContains: "Identity",
        requestOverrides: { SenderId: "12345" },
      });
    });
  });

  it("enforces top-level command auth while keeping inline text", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      const runEmbeddedPiAgentMock = getRunEmbeddedPiAgentMock();
      const baseCfg = makeCfg(home);
      const cfg = {
<<<<<<< HEAD
        agents: {
          defaults: {
            model: "anthropic/claude-opus-4-5",
            workspace: join(home, "clawd"),
          },
        },
=======
        ...baseCfg,
>>>>>>> eb594a090 (refactor(test): dedupe trigger-handling e2e setup)
        channels: {
          ...baseCfg.channels,
          whatsapp: {
            allowFrom: ["+1000"],
          },
        },
      };

      const res = await getReplyFromConfig(
        {
          Body: "/status",
          From: "+2001",
          To: "+2000",
          Provider: "whatsapp",
          SenderE164: "+2001",
        },
        {},
        cfg,
      );

      expect(res).toBeUndefined();
      expect(runEmbeddedPiAgentMock).not.toHaveBeenCalled();
=======
      await expectUnauthorizedCommandDropped(home, "/status");
>>>>>>> 24ea941e2 (test: dedupe auto-reply web and signal flows)
=======
      for (const command of ["/status", "/whoami"] as const) {
        await expectUnauthorizedCommandDropped(home, command);
      }
<<<<<<< HEAD
>>>>>>> 67bccc1fa (test: merge allow-from trigger shard and dedupe inline cases)
    });
  });

  it("keeps inline commands for unauthorized senders", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
<<<<<<< HEAD
      const runEmbeddedPiAgentMock = getRunEmbeddedPiAgentMock();
      const baseCfg = makeCfg(home);
      const cfg = {
<<<<<<< HEAD
        agents: {
          defaults: {
            model: "anthropic/claude-opus-4-5",
            workspace: join(home, "clawd"),
          },
        },
=======
        ...baseCfg,
>>>>>>> eb594a090 (refactor(test): dedupe trigger-handling e2e setup)
        channels: {
          ...baseCfg.channels,
          whatsapp: {
            allowFrom: ["+1000"],
          },
        },
      };

      const res = await getReplyFromConfig(
        {
          Body: "/whoami",
          From: "+2001",
          To: "+2000",
          Provider: "whatsapp",
          SenderE164: "+2001",
        },
        {},
        cfg,
      );

      expect(res).toBeUndefined();
      expect(runEmbeddedPiAgentMock).not.toHaveBeenCalled();
=======
      await expectUnauthorizedCommandDropped(home, "/whoami");
>>>>>>> 24ea941e2 (test: dedupe auto-reply web and signal flows)
    });
  });

  it("keeps inline /status for unauthorized senders", async () => {
    await withTempHome(async (home) => {
=======
      await expectUnauthorizedCommandDropped(home, "/status");
>>>>>>> b81bce703 (test: streamline trigger and session coverage)
      const runEmbeddedPiAgentMock = mockEmbeddedOk();
      const res = await runInlineUnauthorizedCommand({
        home,
        command: "/status",
      });
      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toBe("ok");
      expect(runEmbeddedPiAgentMock).toHaveBeenCalled();
<<<<<<< HEAD
      const prompt = runEmbeddedPiAgentMock.mock.calls[0]?.[0]?.prompt ?? "";
      expect(prompt).toContain("/status");
    });
  });

  it("keeps inline /help for unauthorized senders", async () => {
    await withTempHome(async (home) => {
      const runEmbeddedPiAgentMock = mockEmbeddedOk();
      const res = await runInlineUnauthorizedCommand({
        home,
        command: "/help",
      });
      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toBe("ok");
      expect(runEmbeddedPiAgentMock).toHaveBeenCalled();
      const prompt = runEmbeddedPiAgentMock.mock.calls[0]?.[0]?.prompt ?? "";
      expect(prompt).toContain("/help");
=======
=======
>>>>>>> 3f03cdea5 (test: optimize redundant suites for faster runtime)
      for (const command of ["/status", "/help"] as const) {
        const runEmbeddedPiAgentMock = mockEmbeddedOk();
        const res = await runInlineUnauthorizedCommand({
          home,
          command,
        });
        const text = Array.isArray(res) ? res[0]?.text : res?.text;
        expect(text).toBe("ok");
        expect(runEmbeddedPiAgentMock).toHaveBeenCalled();
        const prompt = runEmbeddedPiAgentMock.mock.calls.at(-1)?.[0]?.prompt ?? "";
        expect(prompt).toContain(command);
      }
<<<<<<< HEAD
>>>>>>> 67bccc1fa (test: merge allow-from trigger shard and dedupe inline cases)
    });
  });

  it("returns help without invoking the agent", async () => {
    await withTempHome(async (home) => {
=======
>>>>>>> ddc67aa4e (test: collapse duplicate trigger command coverage)
      const runEmbeddedPiAgentMock = getRunEmbeddedPiAgentMock();
      const callsBeforeHelp = runEmbeddedPiAgentMock.mock.calls.length;
      const helpRes = await getReplyFromConfig(
        {
          Body: "/help",
          From: "+1002",
          To: "+2000",
          CommandAuthorized: true,
        },
        {},
        makeCfg(home),
      );
      const helpText = Array.isArray(helpRes) ? helpRes[0]?.text : helpRes?.text;
      expect(helpText).toContain("Help");
      expect(helpText).toContain("Session");
      expect(helpText).toContain("More: /commands for full list");
      expect(runEmbeddedPiAgentMock.mock.calls.length).toBe(callsBeforeHelp);
=======
      const prompt = runEmbeddedPiAgentMock.mock.calls.at(-1)?.[0]?.prompt ?? "";
      expect(prompt).toContain("/status");
>>>>>>> b81bce703 (test: streamline trigger and session coverage)
    });
  });

  it("enforces elevated toggles across enabled and mention scenarios", async () => {
    await withTempHome(async (home) => {
      const isolateStore = (cfg: ReturnType<typeof makeWhatsAppElevatedCfg>, label: string) => {
        cfg.session = { ...cfg.session, store: join(home, `${label}.sessions.json`) };
        return cfg;
      };

      {
        const cfg = isolateStore(makeWhatsAppElevatedCfg(home, { elevatedEnabled: false }), "off");
        const res = await getReplyFromConfig(
          {
            Body: "/elevated on",
            From: "+1000",
            To: "+2000",
            Provider: "whatsapp",
            SenderE164: "+1000",
          },
          {},
          cfg,
        );
        const text = Array.isArray(res) ? res[0]?.text : res?.text;
        expect(text).toContain("tools.elevated.enabled");

        const storeRaw = await fs.readFile(requireSessionStorePath(cfg), "utf-8");
        const store = JSON.parse(storeRaw) as Record<string, { elevatedLevel?: string }>;
        expect(store[MAIN_SESSION_KEY]?.elevatedLevel).toBeUndefined();
      }

      {
        const cfg = isolateStore(
          makeWhatsAppElevatedCfg(home, { requireMentionInGroups: true }),
          "group-on",
        );
        const res = await getReplyFromConfig(
          {
            Body: "/elevated on",
            From: "whatsapp:group:123@g.us",
            To: "whatsapp:+2000",
            Provider: "whatsapp",
            SenderE164: "+1000",
            CommandAuthorized: true,
            ChatType: "group",
            WasMentioned: true,
          },
          {},
          cfg,
        );
        const text = Array.isArray(res) ? res[0]?.text : res?.text;
        expect(text).toContain("Elevated mode set to ask");
        const store = await readSessionStore(cfg);
        expect(store["agent:main:whatsapp:group:123@g.us"]?.elevatedLevel).toBe("on");
      }

      {
        const cfg = isolateStore(makeWhatsAppElevatedCfg(home), "inline-unapproved");
        const runEmbeddedPiAgentMock = getRunEmbeddedPiAgentMock();
        runEmbeddedPiAgentMock.mockClear();
        runEmbeddedPiAgentMock.mockResolvedValue({
          payloads: [{ text: "ok" }],
          meta: {
            durationMs: 1,
            agentMeta: { sessionId: "s", provider: "p", model: "m" },
          },
        });

        const res = await getReplyFromConfig(
          {
            Body: "please /elevated on now",
            From: "+2000",
            To: "+2000",
            Provider: "whatsapp",
            SenderE164: "+2000",
          },
          {},
          cfg,
        );
        const text = Array.isArray(res) ? res[0]?.text : res?.text;
        expect(text).not.toContain("elevated is not available right now");
        expect(runEmbeddedPiAgentMock).toHaveBeenCalled();
      }
    });
  });

  it("handles discord elevated allowlist and override behavior", async () => {
    await withTempHome(async (home) => {
      {
        const cfg = makeCfg(home);
        cfg.session = { ...cfg.session, store: join(home, "discord-allow.sessions.json") };
        cfg.tools = { elevated: { allowFrom: { discord: ["123"] } } };

        const res = await getReplyFromConfig(
          {
            Body: "/elevated on",
            From: "discord:123",
            To: "user:123",
            Provider: "discord",
            SenderName: "Peter Steinberger",
            SenderUsername: "steipete",
            SenderTag: "steipete",
            CommandAuthorized: true,
          },
          {},
          cfg,
        );
        const text = Array.isArray(res) ? res[0]?.text : res?.text;
        expect(text).toContain("Elevated mode set to ask");
        const store = await readSessionStore(cfg);
        expect(store[MAIN_SESSION_KEY]?.elevatedLevel).toBe("on");
      }

      {
        const cfg = makeCfg(home);
        cfg.session = { ...cfg.session, store: join(home, "discord-deny.sessions.json") };
        cfg.tools = {
          elevated: {
            allowFrom: { discord: [] },
          },
        };

        const res = await getReplyFromConfig(
          {
            Body: "/elevated on",
            From: "discord:123",
            To: "user:123",
            Provider: "discord",
            SenderName: "steipete",
          },
          {},
          cfg,
        );
        const text = Array.isArray(res) ? res[0]?.text : res?.text;
        expect(text).toContain("tools.elevated.allowFrom.discord");
        expect(getRunEmbeddedPiAgentMock()).not.toHaveBeenCalled();
      }
    });
  });

  it("returns a context overflow fallback when the embedded agent throws", async () => {
    await withTempHome(async (home) => {
      getRunEmbeddedPiAgentMock().mockRejectedValue(new Error("Context window exceeded"));

      const res = await getReplyFromConfig(
        {
          Body: "hello",
          From: "+1002",
          To: "+2000",
        },
        {},
        makeCfg(home),
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toBe(
        "⚠️ Context overflow — prompt too large for this model. Try a shorter message or a larger-context model.",
      );
      expect(getRunEmbeddedPiAgentMock()).toHaveBeenCalledOnce();
    });
  });
});
