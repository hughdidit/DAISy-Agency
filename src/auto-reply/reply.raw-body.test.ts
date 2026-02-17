import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { createTempHomeHarness, makeReplyConfig } from "./reply.test-harness.js";

const agentMocks = vi.hoisted(() => ({
  runEmbeddedPiAgent: vi.fn(),
  loadModelCatalog: vi.fn(),
  webAuthExists: vi.fn().mockResolvedValue(true),
  getWebAuthAgeMs: vi.fn().mockReturnValue(120_000),
  readWebSelfId: vi.fn().mockReturnValue({ e164: "+1999" }),
}));

vi.mock("../agents/pi-embedded.js", () => ({
  abortEmbeddedPiRun: vi.fn().mockReturnValue(false),
  runEmbeddedPiAgent: agentMocks.runEmbeddedPiAgent,
  queueEmbeddedPiMessage: vi.fn().mockReturnValue(false),
  resolveEmbeddedSessionLane: (key: string) => `session:${key.trim() || "main"}`,
  isEmbeddedPiRunActive: vi.fn().mockReturnValue(false),
  isEmbeddedPiRunStreaming: vi.fn().mockReturnValue(false),
}));

vi.mock("../agents/model-catalog.js", () => ({
  loadModelCatalog: agentMocks.loadModelCatalog,
}));

vi.mock("../web/session.js", () => ({
  webAuthExists: agentMocks.webAuthExists,
  getWebAuthAgeMs: agentMocks.getWebAuthAgeMs,
  readWebSelfId: agentMocks.readWebSelfId,
}));

import { getReplyFromConfig } from "./reply.js";

<<<<<<< HEAD
type HomeEnvSnapshot = {
  HOME: string | undefined;
  USERPROFILE: string | undefined;
  HOMEDRIVE: string | undefined;
  HOMEPATH: string | undefined;
  OPENCLAW_STATE_DIR: string | undefined;
  OPENCLAW_AGENT_DIR: string | undefined;
  PI_CODING_AGENT_DIR: string | undefined;
};

function snapshotHomeEnv(): HomeEnvSnapshot {
  return {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    HOMEDRIVE: process.env.HOMEDRIVE,
    HOMEPATH: process.env.HOMEPATH,
    OPENCLAW_STATE_DIR: process.env.OPENCLAW_STATE_DIR,
    OPENCLAW_AGENT_DIR: process.env.OPENCLAW_AGENT_DIR,
    PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR,
  };
}

function restoreHomeEnv(snapshot: HomeEnvSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

let fixtureRoot = "";
let caseId = 0;

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
<<<<<<< HEAD
  return withTempHomeBase(
    async (home) => {
      return await fn(home);
    },
    {
      env: {
        CLAWDBOT_AGENT_DIR: (home) => path.join(home, ".clawdbot", "agent"),
        PI_CODING_AGENT_DIR: (home) => path.join(home, ".clawdbot", "agent"),
      },
      prefix: "moltbot-rawbody-",
    },
  );
=======
  const home = path.join(fixtureRoot, `case-${++caseId}`);
  await fs.mkdir(path.join(home, ".openclaw", "agents", "main", "sessions"), { recursive: true });
  const envSnapshot = snapshotHomeEnv();
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.OPENCLAW_STATE_DIR = path.join(home, ".openclaw");
  process.env.OPENCLAW_AGENT_DIR = path.join(home, ".openclaw", "agent");
  process.env.PI_CODING_AGENT_DIR = path.join(home, ".openclaw", "agent");

  if (process.platform === "win32") {
    const match = home.match(/^([A-Za-z]:)(.*)$/);
    if (match) {
      process.env.HOMEDRIVE = match[1];
      process.env.HOMEPATH = match[2] || "\\";
    }
  }

  try {
    return await fn(home);
  } finally {
    restoreHomeEnv(envSnapshot);
  }
>>>>>>> e324cb5b9 (perf(test): reduce fixture churn in hot suites)
}
=======
const { withTempHome } = createTempHomeHarness({ prefix: "openclaw-rawbody-" });
>>>>>>> cf26c409c (refactor(test): share auto-reply temp home harness)

describe("RawBody directive parsing", () => {
  beforeEach(() => {
    vi.stubEnv("OPENCLAW_TEST_FAST", "1");
    agentMocks.runEmbeddedPiAgent.mockReset();
    agentMocks.loadModelCatalog.mockReset();
    agentMocks.loadModelCatalog.mockResolvedValue([
      { id: "claude-opus-4-5", name: "Opus 4.5", provider: "anthropic" },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("handles directives and history in the prompt", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
<<<<<<< HEAD
      const assertCommandReply = async (input: {
        message: ReplyMessage;
        config: ReplyConfig;
        expectedIncludes: string[];
      }) => {
        vi.mocked(runEmbeddedPiAgent).mockReset();
        const res = await getReplyFromConfig(input.message, {}, input.config);
        const text = Array.isArray(res) ? res[0]?.text : res?.text;
        for (const expected of input.expectedIncludes) {
          expect(text).toContain(expected);
        }
        expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
      };

      await assertCommandReply({
        message: {
          Body: `[Chat messages since your last reply - for context]\\n[WhatsApp ...] Someone: hello\\n\\n[Current message - respond to this]\\n[WhatsApp ...] Jake: /think:high\\n[from: Jake McInteer (+6421807830)]`,
          RawBody: "/think:high",
          From: "+1222",
          To: "+1222",
          ChatType: "group",
          CommandAuthorized: true,
        },
        config: {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
<<<<<<< HEAD
              workspace: path.join(home, "clawd"),
=======
              workspace: path.join(home, "openclaw-1"),
>>>>>>> e324cb5b9 (perf(test): reduce fixture churn in hot suites)
            },
          },
          channels: { whatsapp: { allowFrom: ["*"] } },
          session: { store: path.join(home, "sessions-1.json") },
        },
        expectedIncludes: ["Thinking level set to high."],
      });

<<<<<<< HEAD
      await assertCommandReply({
        message: {
<<<<<<< HEAD
          Body: "[Context]\nJake: /model status\n[from: Jake]",
          RawBody: "/model status",
          From: "+1222",
          To: "+1222",
          ChatType: "group",
          CommandAuthorized: true,
        },
        config: {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
<<<<<<< HEAD
              workspace: path.join(home, "clawd"),
=======
              workspace: path.join(home, "openclaw-2"),
>>>>>>> e324cb5b9 (perf(test): reduce fixture churn in hot suites)
              models: {
                "anthropic/claude-opus-4-5": {},
              },
            },
          },
          channels: { whatsapp: { allowFrom: ["*"] } },
          session: { store: path.join(home, "sessions-2.json") },
        },
        expectedIncludes: ["anthropic/claude-opus-4-5"],
      });

      await assertCommandReply({
        message: {
=======
>>>>>>> e794ef047 (perf(test): reduce hot-suite setup and duplicate test work)
          Body: "[Context]\nJake: /verbose on\n[from: Jake]",
          CommandBody: "/verbose on",
          From: "+1222",
          To: "+1222",
          ChatType: "group",
          CommandAuthorized: true,
        },
        config: {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
<<<<<<< HEAD
<<<<<<< HEAD
              workspace: path.join(home, "clawd"),
=======
              workspace: path.join(home, "openclaw-3"),
>>>>>>> e324cb5b9 (perf(test): reduce fixture churn in hot suites)
=======
              workspace: path.join(home, "openclaw-2"),
>>>>>>> e794ef047 (perf(test): reduce hot-suite setup and duplicate test work)
            },
          },
          channels: { whatsapp: { allowFrom: ["*"] } },
          session: { store: path.join(home, "sessions-2.json") },
        },
        expectedIncludes: ["Verbose logging enabled."],
      });
<<<<<<< HEAD
<<<<<<< HEAD

      await assertCommandReply({
        message: {
          Body: `[Chat messages since your last reply - for context]\\n[WhatsApp ...] Someone: hello\\n\\n[Current message - respond to this]\\n[WhatsApp ...] Jake: /status\\n[from: Jake McInteer (+6421807830)]`,
          RawBody: "/status",
          ChatType: "group",
          From: "+1222",
          To: "+1222",
          SessionKey: "agent:main:whatsapp:group:g1",
          Provider: "whatsapp",
          Surface: "whatsapp",
          SenderE164: "+1222",
          CommandAuthorized: true,
        },
        config: {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
<<<<<<< HEAD
<<<<<<< HEAD
              workspace: path.join(home, "clawd"),
=======
              workspace: path.join(home, "openclaw-4"),
>>>>>>> e324cb5b9 (perf(test): reduce fixture churn in hot suites)
=======
              workspace: path.join(home, "openclaw-3"),
>>>>>>> e794ef047 (perf(test): reduce hot-suite setup and duplicate test work)
            },
          },
          channels: { whatsapp: { allowFrom: ["+1222"] } },
          session: { store: path.join(home, "sessions-3.json") },
        },
        expectedIncludes: ["Session: agent:main:whatsapp:group:g1", "anthropic/claude-opus-4-5"],
      });
=======
>>>>>>> 5caf829d2 (perf(test): trim duplicate gateway and auto-reply test overhead)
    });
  });
=======
>>>>>>> 4bef423d8 (perf(test): reduce gateway reload waits and trim duplicate invoke coverage)

=======
>>>>>>> fecb3f326 (perf(test): trim models/browser suite overhead)
=======
>>>>>>> b4430c126 (perf(test): trim duplicate raw-body and streaming queue scenarios)
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
=======
      agentMocks.runEmbeddedPiAgent.mockResolvedValue({
>>>>>>> 7582e93a8 (perf(test): speed up raw-body reply test)
        payloads: [{ text: "ok" }],
        meta: {
          durationMs: 1,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });

      const groupMessageCtx = {
        Body: "/think:high status please",
        BodyForAgent: "/think:high status please",
        RawBody: "/think:high status please",
        InboundHistory: [{ sender: "Peter", body: "hello", timestamp: 1700000000000 }],
        From: "+1222",
        To: "+1222",
        ChatType: "group",
        GroupSubject: "Ops",
        SenderName: "Jake McInteer",
        SenderE164: "+6421807830",
        CommandAuthorized: true,
      };

<<<<<<< HEAD
<<<<<<< HEAD
      const res = await getReplyFromConfig(
        groupMessageCtx,
        {},
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          channels: { whatsapp: { allowFrom: ["*"] } },
          session: { store: path.join(home, "sessions.json") },
        },
      );
=======
      const res = await getReplyFromConfig(groupMessageCtx, {}, makeReplyConfig(home));
>>>>>>> cf26c409c (refactor(test): share auto-reply temp home harness)
=======
      const res = await getReplyFromConfig(
        groupMessageCtx,
        {},
        makeReplyConfig(home) as OpenClawConfig,
      );
>>>>>>> 7d2ef131c (chore: Fix types in tests 42/N.)

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toBe("ok");
      expect(agentMocks.runEmbeddedPiAgent).toHaveBeenCalledOnce();
      const prompt =
        (agentMocks.runEmbeddedPiAgent.mock.calls[0]?.[0] as { prompt?: string } | undefined)
          ?.prompt ?? "";
      expect(prompt).toContain("Chat history since last reply (untrusted, for context):");
      expect(prompt).toContain('"sender": "Peter"');
      expect(prompt).toContain('"body": "hello"');
      expect(prompt).toContain("status please");
      expect(prompt).not.toContain("/think:high");
    });
  });
});
