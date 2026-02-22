import { beforeAll, describe, expect, it } from "vitest";
import {
  expectInlineCommandHandledAndStripped,
  getRunEmbeddedPiAgentMock,
  installTriggerHandlingE2eTestHooks,
  loadGetReplyFromConfig,
  makeCfg,
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

async function expectUnauthorizedCommandDropped(home: string, body: "/status" | "/whoami") {
  const runEmbeddedPiAgentMock = getRunEmbeddedPiAgentMock();
  const baseCfg = makeCfg(home);
  const cfg = {
    ...baseCfg,
    channels: {
      ...baseCfg.channels,
      whatsapp: {
        allowFrom: ["+1000"],
      },
    },
  };

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

describe("trigger handling", () => {
  it("handles inline /commands and strips it before the agent", async () => {
    await withTempHome(async (home) => {
      await expectInlineCommandHandledAndStripped({
        home,
        getReplyFromConfig,
        body: "please /commands now",
        stripToken: "/commands",
        blockReplyContains: "Slash commands",
      });
    });
  });

  it("handles inline /whoami and strips it before the agent", async () => {
    await withTempHome(async (home) => {
      await expectInlineCommandHandledAndStripped({
        home,
        getReplyFromConfig,
        body: "please /whoami now",
        stripToken: "/whoami",
        blockReplyContains: "Identity",
        requestOverrides: {
          SenderId: "12345",
        },
      });
    });
  });

  it("drops /status for unauthorized senders", async () => {
    await withTempHome(async (home) => {
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
    });
  });

  it("drops /whoami for unauthorized senders", async () => {
    await withTempHome(async (home) => {
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
});
