import "./reply.directive.directive-behavior.e2e-mocks.js";
import { describe, expect, it, vi } from "vitest";
import { loadSessionStore } from "../config/sessions.js";
import {
  installDirectiveBehaviorE2EHooks,
  makeWhatsAppDirectiveConfig,
  replyText,
  replyTexts,
  runEmbeddedPiAgent,
  sessionStorePath,
  withTempHome,
} from "./reply.directive.directive-behavior.e2e-harness.js";
import { getReplyFromConfig } from "./reply.js";

<<<<<<< HEAD
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
=======
async function runThinkDirectiveAndGetText(
  home: string,
  options: { thinkingDefault?: "high" } = {},
): Promise<string | undefined> {
  const res = await getReplyFromConfig(
    { Body: "/think", From: "+1222", To: "+1222", CommandAuthorized: true },
    {},
    makeWhatsAppDirectiveConfig(home, {
      model: "anthropic/claude-opus-4-5",
      ...(options.thinkingDefault ? { thinkingDefault: options.thinkingDefault } : {}),
    }),
  );
  return replyText(res);
}

function mockEmbeddedResponse(text: string) {
  vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
    payloads: [{ text }],
    meta: {
      durationMs: 5,
      agentMeta: { sessionId: "s", provider: "p", model: "m" },
    },
  });
}

async function runInlineReasoningMessage(params: {
  home: string;
  body: string;
  storePath: string;
  blockReplies: string[];
}) {
  return await getReplyFromConfig(
    {
      Body: params.body,
      From: "+1222",
      To: "+1222",
      Provider: "whatsapp",
    },
    {
      onBlockReply: (payload) => {
        if (payload.text) {
          params.blockReplies.push(payload.text);
        }
      },
    },
    makeWhatsAppDirectiveConfig(
      params.home,
      { model: "anthropic/claude-opus-4-5" },
      {
        session: { store: params.storePath },
      },
    ),
  );
}

>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
describe("directive behavior", () => {
  installDirectiveBehaviorE2EHooks();

  it("applies inline reasoning in mixed messages and acks immediately", async () => {
    await withTempHome(async (home) => {
      mockEmbeddedResponse("done");

      const blockReplies: string[] = [];
      const storePath = sessionStorePath(home);

<<<<<<< HEAD
      const res = await getReplyFromConfig(
        {
          Body: "please reply\n/reasoning on",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
        },
        {
          onBlockReply: (payload) => {
            if (payload.text) {
              blockReplies.push(payload.text);
            }
          },
        },
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          channels: { whatsapp: { allowFrom: ["*"] } },
          session: { store: storePath },
        },
      );
=======
      const res = await runInlineReasoningMessage({
        home,
        body: "please reply\n/reasoning on",
        storePath,
        blockReplies,
      });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

      const texts = replyTexts(res);
      expect(texts).toContain("done");

      expect(runEmbeddedPiAgent).toHaveBeenCalledOnce();
    });
  });
  it("keeps reasoning acks for rapid mixed directives", async () => {
    await withTempHome(async (home) => {
      mockEmbeddedResponse("ok");

      const blockReplies: string[] = [];
      const storePath = sessionStorePath(home);

<<<<<<< HEAD
      await getReplyFromConfig(
        {
          Body: "do it\n/reasoning on",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
        },
        {
          onBlockReply: (payload) => {
            if (payload.text) {
              blockReplies.push(payload.text);
            }
          },
        },
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          channels: { whatsapp: { allowFrom: ["*"] } },
          session: { store: storePath },
        },
      );

      await getReplyFromConfig(
        {
          Body: "again\n/reasoning on",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
        },
        {
          onBlockReply: (payload) => {
            if (payload.text) {
              blockReplies.push(payload.text);
            }
          },
        },
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          channels: { whatsapp: { allowFrom: ["*"] } },
          session: { store: storePath },
        },
      );
=======
      await runInlineReasoningMessage({
        home,
        body: "do it\n/reasoning on",
        storePath,
        blockReplies,
      });

      await runInlineReasoningMessage({
        home,
        body: "again\n/reasoning on",
        storePath,
        blockReplies,
      });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

      expect(runEmbeddedPiAgent).toHaveBeenCalledTimes(2);
      expect(blockReplies.length).toBe(0);
    });
  });
  it("acks verbose directive immediately with system marker", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        { Body: "/verbose on", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          session: { store: path.join(home, "sessions.json") },
        },
=======
        makeWhatsAppDirectiveConfig(home, { model: "anthropic/claude-opus-4-5" }),
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      );

      const text = replyText(res);
      expect(text).toMatch(/^⚙️ Verbose logging enabled\./);
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("persists verbose off when directive is standalone", async () => {
    await withTempHome(async (home) => {
      const storePath = sessionStorePath(home);

      const res = await getReplyFromConfig(
        { Body: "/verbose off", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
=======
        makeWhatsAppDirectiveConfig(
          home,
          { model: "anthropic/claude-opus-4-5" },
          {
            session: { store: storePath },
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
          },
        ),
      );

      const text = replyText(res);
      expect(text).toMatch(/Verbose logging disabled\./);
      const store = loadSessionStore(storePath);
      const entry = Object.values(store)[0];
      expect(entry?.verboseLevel).toBe("off");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows current think level when /think has no argument", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const res = await getReplyFromConfig(
        { Body: "/think", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
              thinkingDefault: "high",
            },
          },
          session: { store: path.join(home, "sessions.json") },
        },
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
=======
      const text = await runThinkDirectiveAndGetText(home, { thinkingDefault: "high" });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      expect(text).toContain("Current thinking level: high");
      expect(text).toContain("Options: off, minimal, low, medium, high.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows off when /think has no argument and no default set", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const res = await getReplyFromConfig(
        { Body: "/think", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
          session: { store: path.join(home, "sessions.json") },
        },
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
=======
      const text = await runThinkDirectiveAndGetText(home);
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      expect(text).toContain("Current thinking level: off");
      expect(text).toContain("Options: off, minimal, low, medium, high.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
});
