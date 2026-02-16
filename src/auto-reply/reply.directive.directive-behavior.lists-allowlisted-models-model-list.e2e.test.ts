import "./reply.directive.directive-behavior.e2e-mocks.js";
import { describe, expect, it, vi } from "vitest";
import {
  assertModelSelection,
  installDirectiveBehaviorE2EHooks,
  loadModelCatalog,
  makeWhatsAppDirectiveConfig,
  replyText,
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

function assertModelSelection(
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
async function runModelDirective(
  home: string,
  body: string,
  options: {
    defaults?: Record<string, unknown>;
    extra?: Record<string, unknown>;
  } = {},
): Promise<string | undefined> {
  const res = await getReplyFromConfig(
    { Body: body, From: "+1222", To: "+1222", CommandAuthorized: true },
    {},
    makeWhatsAppDirectiveConfig(
      home,
      {
        model: { primary: "anthropic/claude-opus-4-5" },
        models: {
          "anthropic/claude-opus-4-5": {},
          "openai/gpt-4.1-mini": {},
        },
        ...options.defaults,
      },
      { session: { store: sessionStorePath(home) }, ...options.extra },
    ),
  );
  return replyText(res);
}

>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
describe("directive behavior", () => {
  installDirectiveBehaviorE2EHooks();

  it("aliases /model list to /models", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const storePath = path.join(home, "sessions.json");

      const res = await getReplyFromConfig(
        { Body: "/model list", From: "+1222", To: "+1222", CommandAuthorized: true },
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
      const text = await runModelDirective(home, "/model list");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      expect(text).toContain("Providers:");
      expect(text).toContain("- anthropic");
      expect(text).toContain("- openai");
      expect(text).toContain("Use: /models <provider>");
      expect(text).toContain("Switch: /model <provider/model>");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows current model when catalog is unavailable", async () => {
    await withTempHome(async (home) => {
      vi.mocked(loadModelCatalog).mockResolvedValueOnce([]);
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
      const text = await runModelDirective(home, "/model");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      expect(text).toContain("Current: anthropic/claude-opus-4-5");
      expect(text).toContain("Switch: /model <provider/model>");
      expect(text).toContain("Browse: /models (providers) or /models <provider> (models)");
      expect(text).toContain("More: /model status");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("includes catalog providers when no allowlist is set", async () => {
    await withTempHome(async (home) => {
      vi.mocked(loadModelCatalog).mockResolvedValue([
        { id: "claude-opus-4-5", name: "Opus 4.5", provider: "anthropic" },
        { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openai" },
        { id: "grok-4", name: "Grok 4", provider: "xai" },
      ]);
<<<<<<< HEAD
      const storePath = path.join(home, "sessions.json");

      const res = await getReplyFromConfig(
        { Body: "/model list", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
        {
          agents: {
            defaults: {
              model: {
                primary: "anthropic/claude-opus-4-5",
                fallbacks: ["openai/gpt-4.1-mini"],
              },
              imageModel: { primary: "minimax/MiniMax-M2.1" },
              workspace: path.join(home, "clawd"),
            },
=======
      const text = await runModelDirective(home, "/model list", {
        defaults: {
          model: {
            primary: "anthropic/claude-opus-4-5",
            fallbacks: ["openai/gpt-4.1-mini"],
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
          },
          imageModel: { primary: "minimax/MiniMax-M2.1" },
          models: undefined,
        },
      });
      expect(text).toContain("Providers:");
      expect(text).toContain("- anthropic");
      expect(text).toContain("- openai");
      expect(text).toContain("- xai");
      expect(text).toContain("Use: /models <provider>");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("lists config-only providers when catalog is present", async () => {
    await withTempHome(async (home) => {
      // Catalog present but missing custom providers: /model should still include
      // allowlisted provider/model keys from config.
      vi.mocked(loadModelCatalog).mockResolvedValueOnce([
        {
          provider: "anthropic",
          id: "claude-opus-4-5",
          name: "Claude Opus 4.5",
        },
        { provider: "openai", id: "gpt-4.1-mini", name: "GPT-4.1 mini" },
      ]);
<<<<<<< HEAD
      const storePath = path.join(home, "sessions.json");

      const res = await getReplyFromConfig(
        { Body: "/models minimax", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
        {
          agents: {
            defaults: {
              model: { primary: "anthropic/claude-opus-4-5" },
              workspace: path.join(home, "clawd"),
              models: {
                "anthropic/claude-opus-4-5": {},
                "openai/gpt-4.1-mini": {},
                "minimax/MiniMax-M2.1": { alias: "minimax" },
              },
            },
=======
      const text = await runModelDirective(home, "/models minimax", {
        defaults: {
          models: {
            "anthropic/claude-opus-4-5": {},
            "openai/gpt-4.1-mini": {},
            "minimax/MiniMax-M2.1": { alias: "minimax" },
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
          },
        },
        extra: {
          models: {
            mode: "merge",
            providers: {
              minimax: {
                baseUrl: "https://api.minimax.io/anthropic",
                api: "anthropic-messages",
                models: [{ id: "MiniMax-M2.1", name: "MiniMax M2.1" }],
              },
            },
          },
        },
      });
      expect(text).toContain("Models (minimax)");
      expect(text).toContain("minimax/MiniMax-M2.1");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("does not repeat missing auth labels on /model list", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const storePath = path.join(home, "sessions.json");

      const res = await getReplyFromConfig(
        { Body: "/model list", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
        {
          agents: {
            defaults: {
              model: { primary: "anthropic/claude-opus-4-5" },
              workspace: path.join(home, "clawd"),
              models: {
                "anthropic/claude-opus-4-5": {},
              },
            },
=======
      const text = await runModelDirective(home, "/model list", {
        defaults: {
          models: {
            "anthropic/claude-opus-4-5": {},
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
          },
        },
      });
      expect(text).toContain("Providers:");
      expect(text).not.toContain("missing (missing)");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("sets model override on /model directive", async () => {
    await withTempHome(async (home) => {
      const storePath = sessionStorePath(home);

      await getReplyFromConfig(
        { Body: "/model openai/gpt-4.1-mini", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: { primary: "anthropic/claude-opus-4-5" },
              workspace: path.join(home, "clawd"),
              models: {
                "anthropic/claude-opus-4-5": {},
                "openai/gpt-4.1-mini": {},
              },
=======
        makeWhatsAppDirectiveConfig(
          home,
          {
            model: { primary: "anthropic/claude-opus-4-5" },
            models: {
              "anthropic/claude-opus-4-5": {},
              "openai/gpt-4.1-mini": {},
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
            },
          },
          { session: { store: storePath } },
        ),
      );

      assertModelSelection(storePath, {
        model: "gpt-4.1-mini",
        provider: "openai",
      });
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("supports model aliases on /model directive", async () => {
    await withTempHome(async (home) => {
      const storePath = sessionStorePath(home);

      await getReplyFromConfig(
        { Body: "/model Opus", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: { primary: "openai/gpt-4.1-mini" },
              workspace: path.join(home, "clawd"),
              models: {
                "openai/gpt-4.1-mini": {},
                "anthropic/claude-opus-4-5": { alias: "Opus" },
              },
=======
        makeWhatsAppDirectiveConfig(
          home,
          {
            model: { primary: "openai/gpt-4.1-mini" },
            models: {
              "openai/gpt-4.1-mini": {},
              "anthropic/claude-opus-4-5": { alias: "Opus" },
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
            },
          },
          { session: { store: storePath } },
        ),
      );

      assertModelSelection(storePath, {
        model: "claude-opus-4-5",
        provider: "anthropic",
      });
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
});
