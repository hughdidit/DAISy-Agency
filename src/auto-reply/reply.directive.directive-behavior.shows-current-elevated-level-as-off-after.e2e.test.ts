import "./reply.directive.directive-behavior.e2e-mocks.js";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadSessionStore } from "../config/sessions.js";
import {
  installDirectiveBehaviorE2EHooks,
  makeRestrictedElevatedDisabledConfig,
  runEmbeddedPiAgent,
  withTempHome,
} from "./reply.directive.directive-behavior.e2e-harness.js";
import { getReplyFromConfig } from "./reply.js";

<<<<<<< HEAD
const MAIN_SESSION_KEY = "agent:main:main";

vi.mock("../agents/pi-embedded.js", () => ({
  abortEmbeddedPiRun: vi.fn().mockReturnValue(false),
  runEmbeddedPiAgent: vi.fn(),
  queueEmbeddedPiMessage: vi.fn().mockReturnValue(false),
  resolveEmbeddedSessionLane: (key: string) => `session:${key.trim() || "main"}`,
  isEmbeddedPiRunActive: vi.fn().mockReturnValue(false),
  isEmbeddedPiRunStreaming: vi.fn().mockReturnValue(false),
}));
vi.mock("../agents/model-catalog.js", () => ({
  loadModelCatalog: vi.fn(),
}));

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(
    async (home) => {
      return await fn(home);
    },
    {
      env: {
        CLAWDBOT_AGENT_DIR: (home) => path.join(home, ".clawdbot", "agent"),
        PI_CODING_AGENT_DIR: (home) => path.join(home, ".clawdbot", "agent"),
      },
      prefix: "moltbot-reply-",
    },
  );
}

function _assertModelSelection(
  storePath: string,
  selection: { model?: string; provider?: string } = {},
) {
  const store = loadSessionStore(storePath);
  const entry = store[MAIN_SESSION_KEY];
  expect(entry).toBeDefined();
  expect(entry?.modelOverride).toBe(selection.model);
  expect(entry?.providerOverride).toBe(selection.provider);
}

=======
>>>>>>> 2b9a501b7 (refactor(test): dedupe directive behavior e2e setup)
describe("directive behavior", () => {
  installDirectiveBehaviorE2EHooks();

  it("shows current elevated level as off after toggling it off", async () => {
    await withTempHome(async (home) => {
      const storePath = path.join(home, "sessions.json");

      await getReplyFromConfig(
        {
          Body: "/elevated off",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
          SenderE164: "+1222",
          CommandAuthorized: true,
        },
        {},
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
              elevatedDefault: "on",
            },
          },
          tools: {
            elevated: {
              allowFrom: { whatsapp: ["+1222"] },
            },
          },
          channels: { whatsapp: { allowFrom: ["+1222"] } },
          session: { store: storePath },
        },
      );

      const res = await getReplyFromConfig(
        {
          Body: "/elevated",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
          SenderE164: "+1222",
          CommandAuthorized: true,
        },
        {},
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
              elevatedDefault: "on",
            },
          },
          tools: {
            elevated: {
              allowFrom: { whatsapp: ["+1222"] },
            },
          },
          channels: { whatsapp: { allowFrom: ["+1222"] } },
          session: { store: storePath },
        },
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toContain("Current elevated level: off");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("can toggle elevated off then back on (status reflects on)", async () => {
    await withTempHome(async (home) => {
      const storePath = path.join(home, "sessions.json");

      const cfg = {
        agents: {
          defaults: {
            model: "anthropic/claude-opus-4-5",
            workspace: path.join(home, "clawd"),
            elevatedDefault: "on",
          },
        },
        tools: {
          elevated: {
            allowFrom: { whatsapp: ["+1222"] },
          },
        },
        channels: { whatsapp: { allowFrom: ["+1222"] } },
        session: { store: storePath },
      } as const;

      await getReplyFromConfig(
        {
          Body: "/elevated off",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
          SenderE164: "+1222",
          CommandAuthorized: true,
        },
        {},
        cfg,
      );
      await getReplyFromConfig(
        {
          Body: "/elevated on",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
          SenderE164: "+1222",
          CommandAuthorized: true,
        },
        {},
        cfg,
      );

      const res = await getReplyFromConfig(
        {
          Body: "/status",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
          SenderE164: "+1222",
          CommandAuthorized: true,
        },
        {},
        cfg,
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      const optionsLine = text?.split("\n").find((line) => line.trim().startsWith("⚙️"));
      expect(optionsLine).toBeTruthy();
      expect(optionsLine).toContain("elevated");

      const store = loadSessionStore(storePath);
      expect(store["agent:main:main"]?.elevatedLevel).toBe("on");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("rejects per-agent elevated when disabled", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        {
          Body: "/elevated on",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
          SenderE164: "+1222",
          SessionKey: "agent:restricted:main",
          CommandAuthorized: true,
        },
        {},
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
            list: [
              {
                id: "restricted",
                tools: {
                  elevated: { enabled: false },
                },
              },
            ],
          },
          tools: {
            elevated: {
              allowFrom: { whatsapp: ["+1222"] },
            },
          },
          channels: { whatsapp: { allowFrom: ["+1222"] } },
          session: { store: path.join(home, "sessions.json") },
        },
=======
        makeRestrictedElevatedDisabledConfig(home),
>>>>>>> 165dbc232 (refactor(test): share directive elevated config)
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toContain("agents.list[].tools.elevated.enabled");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
});
