import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  getRunEmbeddedPiAgentMock,
  installTriggerHandlingE2eTestHooks,
  makeCfg,
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
  ({ getReplyFromConfig } = await import("./reply.js"));
});

>>>>>>> 043ae0044 (test(auto-reply): import reply after harness mocks)
installTriggerHandlingE2eTestHooks();
>>>>>>> eb594a090 (refactor(test): dedupe trigger-handling e2e setup)

async function expectResetBlockedForNonOwner(params: {
  home: string;
  commandAuthorized: boolean;
  getReplyFromConfig: typeof import("./reply.js").getReplyFromConfig;
}): Promise<void> {
  const { home, commandAuthorized, getReplyFromConfig } = params;
  const cfg = makeCfg(home);
  cfg.channels ??= {};
  cfg.channels.whatsapp = {
    ...cfg.channels.whatsapp,
    allowFrom: ["+1999"],
  };
  cfg.session = {
    ...cfg.session,
    store: join(tmpdir(), `openclaw-session-test-${Date.now()}.json`),
  };
  const res = await getReplyFromConfig(
    {
      Body: "/reset",
      From: "+1003",
      To: "+2000",
      CommandAuthorized: commandAuthorized,
    },
    {},
    cfg,
  );
  expect(res).toBeUndefined();
  expect(getRunEmbeddedPiAgentMock()).not.toHaveBeenCalled();
}

describe("trigger handling", () => {
  it("allows /activation from allowFrom in groups", async () => {
    await withTempHome(async (home) => {
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
      expect(getRunEmbeddedPiAgentMock()).not.toHaveBeenCalled();
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
<<<<<<< HEAD
        {
          agents: {
            defaults: {
<<<<<<< HEAD
              model: "anthropic/claude-opus-4-5",
              workspace: join(home, "clawd"),
=======
              model: { primary: "anthropic/claude-opus-4-5" },
              workspace: join(home, "openclaw"),
>>>>>>> 50fd2a99b (chore: Fix types in tests 13/N.)
            },
          },
          channels: {
            whatsapp: {
              allowFrom: ["*"],
              groups: { "*": { requireMention: false } },
            },
          },
          messages: {
            groupChat: {},
          },
          session: { store: join(home, "sessions.json") },
        },
=======
        cfg,
>>>>>>> 829236afa (test: reuse trigger harness defaults in custom configs)
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toBe("ok");
      expect(getRunEmbeddedPiAgentMock()).toHaveBeenCalledOnce();
      const extra = getRunEmbeddedPiAgentMock().mock.calls[0]?.[0]?.extraSystemPrompt ?? "";
      expect(extra).toContain('"chat_type": "group"');
      expect(extra).toContain("Activation: always-on");
    });
  });
<<<<<<< HEAD
<<<<<<< HEAD
  it("runs a greeting prompt for a bare /new", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      getRunEmbeddedPiAgentMock().mockResolvedValue({
        payloads: [{ text: "hello" }],
        meta: {
          durationMs: 1,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });

      const res = await getReplyFromConfig(
        {
          Body: "/new",
          From: "+1003",
          To: "+2000",
          CommandAuthorized: true,
        },
        {},
        {
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
          session: {
            store: join(tmpdir(), `moltbot-session-test-${Date.now()}.json`),
          },
        },
      );
      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toBe("hello");
      expect(getRunEmbeddedPiAgentMock()).toHaveBeenCalledOnce();
      const prompt = getRunEmbeddedPiAgentMock().mock.calls[0]?.[0]?.prompt ?? "";
      expect(prompt).toContain("A new session was started via /new or /reset");
=======
      await runGreetingPromptForBareNewOrReset({ home, body: "/new", getReplyFromConfig });
>>>>>>> 516cbf436 (refactor(test): dedupe trigger greeting prompt cases)
    });
  });
=======
>>>>>>> af547ec52 (test: consolidate trigger-handling suites)
=======
  it("runs a greeting prompt for a bare /reset", async () => {
    await withTempHome(async (home) => {
      await runGreetingPromptForBareNewOrReset({ home, body: "/reset", getReplyFromConfig });
    });
  });
  it("runs a greeting prompt for a bare /new", async () => {
    await withTempHome(async (home) => {
      await runGreetingPromptForBareNewOrReset({ home, body: "/new", getReplyFromConfig });
    });
  });
  it("does not reset for unauthorized /reset", async () => {
    await withTempHome(async (home) => {
      await expectResetBlockedForNonOwner({
        home,
        commandAuthorized: false,
        getReplyFromConfig,
      });
    });
  });
  it("blocks /reset for non-owner senders", async () => {
    await withTempHome(async (home) => {
      await expectResetBlockedForNonOwner({
        home,
        commandAuthorized: true,
        getReplyFromConfig,
      });
    });
  });
>>>>>>> 9f508056d (test: collapse remaining trigger command shards)
});
