import "./reply.directive.directive-behavior.e2e-mocks.js";
import { describe, expect, it, vi } from "vitest";
import { loadSessionStore, resolveSessionKey, saveSessionStore } from "../config/sessions.js";
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
async function runModelDirectiveAndGetText(
  home: string,
  body: string,
): Promise<string | undefined> {
  const res = await getReplyFromConfig(
    { Body: body, From: "+1222", To: "+1222", CommandAuthorized: true },
    {},
    makeWhatsAppDirectiveConfig(home, {
      model: { primary: "anthropic/claude-opus-4-5" },
      models: {
        "anthropic/claude-opus-4-5": {},
        "openai/gpt-4.1-mini": {},
      },
    }),
  );
  return replyText(res);
}

>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
describe("directive behavior", () => {
  installDirectiveBehaviorE2EHooks();

  it("updates tool verbose during an in-flight run (toggle on)", async () => {
    await withTempHome(async (home) => {
      const storePath = sessionStorePath(home);
      const ctx = { Body: "please do the thing", From: "+1004", To: "+2000" };
      const sessionKey = resolveSessionKey(
        "per-sender",
        { From: ctx.From, To: ctx.To, Body: ctx.Body },
        "main",
      );

      vi.mocked(runEmbeddedPiAgent).mockImplementation(async (params) => {
        const shouldEmit = params.shouldEmitToolResult;
        expect(shouldEmit?.()).toBe(false);
        const store = loadSessionStore(storePath);
        const entry = store[sessionKey] ?? {
          sessionId: "s",
          updatedAt: Date.now(),
        };
        store[sessionKey] = {
          ...entry,
          verboseLevel: "on",
          updatedAt: Date.now(),
        };
        await saveSessionStore(storePath, store);
        expect(shouldEmit?.()).toBe(true);
        return {
          payloads: [{ text: "done" }],
          meta: {
            durationMs: 5,
            agentMeta: { sessionId: "s", provider: "p", model: "m" },
          },
        };
      });

      const res = await getReplyFromConfig(
        ctx,
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

      const texts = replyTexts(res);
      expect(texts).toContain("done");
      expect(runEmbeddedPiAgent).toHaveBeenCalledOnce();
    });
  });
  it("updates tool verbose during an in-flight run (toggle off)", async () => {
    await withTempHome(async (home) => {
      const storePath = sessionStorePath(home);
      const ctx = {
        Body: "please do the thing",
        From: "+1004",
        To: "+2000",
      };
      const sessionKey = resolveSessionKey(
        "per-sender",
        { From: ctx.From, To: ctx.To, Body: ctx.Body },
        "main",
      );

      vi.mocked(runEmbeddedPiAgent).mockImplementation(async (params) => {
        const shouldEmit = params.shouldEmitToolResult;
        expect(shouldEmit?.()).toBe(true);
        const store = loadSessionStore(storePath);
        const entry = store[sessionKey] ?? {
          sessionId: "s",
          updatedAt: Date.now(),
        };
        store[sessionKey] = {
          ...entry,
          verboseLevel: "off",
          updatedAt: Date.now(),
        };
        await saveSessionStore(storePath, store);
        expect(shouldEmit?.()).toBe(false);
        return {
          payloads: [{ text: "done" }],
          meta: {
            durationMs: 5,
            agentMeta: { sessionId: "s", provider: "p", model: "m" },
          },
        };
      });

      await getReplyFromConfig(
        { Body: "/verbose on", From: ctx.From, To: ctx.To, CommandAuthorized: true },
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

      const res = await getReplyFromConfig(
        ctx,
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

      const texts = replyTexts(res);
      expect(texts).toContain("done");
      expect(runEmbeddedPiAgent).toHaveBeenCalledOnce();
    });
  });
  it("shows summary on /model", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const storePath = path.join(home, "sessions.json");

      const res = await getReplyFromConfig(
        { Body: "/model", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
        {
          agents: {
            defaults: {
              model: { primary: "anthropic/claude-opus-4-5" },
              workspace: path.join(home, "clawd"),
              models: {
                "anthropic/claude-opus-4-5": {},
                "openai/gpt-4.1-mini": {},
              },
            },
          },
          session: { store: storePath },
        },
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
=======
      const text = await runModelDirectiveAndGetText(home, "/model");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      expect(text).toContain("Current: anthropic/claude-opus-4-5");
      expect(text).toContain("Switch: /model <provider/model>");
      expect(text).toContain("Browse: /models (providers) or /models <provider> (models)");
      expect(text).toContain("More: /model status");
      expect(text).not.toContain("openai/gpt-4.1-mini");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("lists allowlisted models on /model status", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const storePath = path.join(home, "sessions.json");

      const res = await getReplyFromConfig(
        { Body: "/model status", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
        {
          agents: {
            defaults: {
              model: { primary: "anthropic/claude-opus-4-5" },
              workspace: path.join(home, "clawd"),
              models: {
                "anthropic/claude-opus-4-5": {},
                "openai/gpt-4.1-mini": {},
              },
            },
          },
          session: { store: storePath },
        },
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
=======
      const text = await runModelDirectiveAndGetText(home, "/model status");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      expect(text).toContain("anthropic/claude-opus-4-5");
      expect(text).toContain("openai/gpt-4.1-mini");
      expect(text).not.toContain("claude-sonnet-4-1");
      expect(text).toContain("auth:");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
});
