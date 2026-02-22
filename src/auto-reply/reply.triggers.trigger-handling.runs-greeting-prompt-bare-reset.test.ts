import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  getRunEmbeddedPiAgentMock,
  installTriggerHandlingE2eTestHooks,
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

function _makeCfg(home: string) {
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
  const res = await getReplyFromConfig(
    {
      Body: "/reset",
      From: "+1003",
      To: "+2000",
      CommandAuthorized: commandAuthorized,
    },
    {},
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-5" },
          workspace: join(home, "openclaw"),
        },
      },
      channels: {
        whatsapp: {
          allowFrom: ["+1999"],
        },
      },
      session: {
        store: join(tmpdir(), `openclaw-session-test-${Date.now()}.json`),
      },
    },
  );
  expect(res).toBeUndefined();
  expect(getRunEmbeddedPiAgentMock()).not.toHaveBeenCalled();
}

describe("trigger handling", () => {
  it("runs a greeting prompt for a bare /reset", async () => {
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
          Body: "/reset",
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
      await runGreetingPromptForBareNewOrReset({ home, body: "/reset", getReplyFromConfig });
>>>>>>> 516cbf436 (refactor(test): dedupe trigger greeting prompt cases)
    });
  });
  it("does not reset for unauthorized /reset", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const res = await getReplyFromConfig(
        {
          Body: "/reset",
          From: "+1003",
          To: "+2000",
          CommandAuthorized: false,
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
              allowFrom: ["+1999"],
            },
          },
          session: {
            store: join(tmpdir(), `moltbot-session-test-${Date.now()}.json`),
          },
        },
      );
      expect(res).toBeUndefined();
      expect(getRunEmbeddedPiAgentMock()).not.toHaveBeenCalled();
=======
      await expectResetBlockedForNonOwner({
        home,
        commandAuthorized: false,
        getReplyFromConfig,
      });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    });
  });
  it("blocks /reset for non-owner senders", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const res = await getReplyFromConfig(
        {
          Body: "/reset",
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
              allowFrom: ["+1999"],
            },
          },
          session: {
            store: join(tmpdir(), `moltbot-session-test-${Date.now()}.json`),
          },
        },
      );
      expect(res).toBeUndefined();
      expect(getRunEmbeddedPiAgentMock()).not.toHaveBeenCalled();
=======
      await expectResetBlockedForNonOwner({
        home,
        commandAuthorized: true,
        getReplyFromConfig,
      });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    });
  });
});
