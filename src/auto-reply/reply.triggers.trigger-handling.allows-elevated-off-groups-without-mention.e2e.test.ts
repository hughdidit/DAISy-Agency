import fs from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSessionStore } from "../config/sessions.js";
import {
  installTriggerHandlingE2eTestHooks,
  loadGetReplyFromConfig,
  MAIN_SESSION_KEY,
  makeWhatsAppElevatedCfg,
  requireSessionStorePath,
  runDirectElevatedToggleAndLoadStore,
  withTempHome,
} from "./reply.triggers.trigger-handling.test-harness.js";

<<<<<<< HEAD
<<<<<<< HEAD
const MAIN_SESSION_KEY = "agent:main:main";

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
  getReplyFromConfig = await loadGetReplyFromConfig();
});

>>>>>>> 043ae0044 (test(auto-reply): import reply after harness mocks)
installTriggerHandlingE2eTestHooks();
>>>>>>> eb594a090 (refactor(test): dedupe trigger-handling e2e setup)

describe("trigger handling", () => {
  it("allows elevated off in groups without mention", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
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
        tools: {
          elevated: {
            allowFrom: { whatsapp: ["+1000"] },
          },
        },
        channels: {
          ...baseCfg.channels,
          whatsapp: {
            allowFrom: ["+1000"],
            groups: { "*": { requireMention: false } },
          },
        },
      };
=======
      const cfg = makeWhatsAppElevatedCfg(home, { requireMentionInGroups: false });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

      const res = await getReplyFromConfig(
        {
          Body: "/elevated off",
          From: "whatsapp:group:123@g.us",
          To: "whatsapp:+2000",
          Provider: "whatsapp",
          SenderE164: "+1000",
          CommandAuthorized: true,
          ChatType: "group",
          WasMentioned: false,
        },
        {},
        cfg,
      );
      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toContain("Elevated mode disabled.");

      const store = loadSessionStore(requireSessionStorePath(cfg));
      expect(store["agent:main:whatsapp:group:123@g.us"]?.elevatedLevel).toBe("off");
    });
  });

  it("allows elevated directive in groups when mentioned", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
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
        tools: {
          elevated: {
            allowFrom: { whatsapp: ["+1000"] },
          },
        },
        channels: {
          ...baseCfg.channels,
          whatsapp: {
            allowFrom: ["+1000"],
            groups: { "*": { requireMention: true } },
          },
        },
      };
=======
      const cfg = makeWhatsAppElevatedCfg(home, { requireMentionInGroups: true });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

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

      const storeRaw = await fs.readFile(requireSessionStorePath(cfg), "utf-8");
      const store = JSON.parse(storeRaw) as Record<string, { elevatedLevel?: string }>;
      expect(store["agent:main:whatsapp:group:123@g.us"]?.elevatedLevel).toBe("on");
    });
  });

  it("allows elevated directive in direct chats without mentions", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
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
        tools: {
          elevated: {
            allowFrom: { whatsapp: ["+1000"] },
          },
        },
        channels: {
          ...baseCfg.channels,
          whatsapp: {
            allowFrom: ["+1000"],
          },
        },
      };

      const res = await getReplyFromConfig(
        {
          Body: "/elevated on",
          From: "+1000",
          To: "+2000",
          Provider: "whatsapp",
          SenderE164: "+1000",
          CommandAuthorized: true,
        },
        {},
=======
      const cfg = makeWhatsAppElevatedCfg(home);
      const { text, store } = await runDirectElevatedToggleAndLoadStore({
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
        cfg,
        getReplyFromConfig,
      });
      expect(text).toContain("Elevated mode set to ask");
      expect(store[MAIN_SESSION_KEY]?.elevatedLevel).toBe("on");
    });
  });
});
