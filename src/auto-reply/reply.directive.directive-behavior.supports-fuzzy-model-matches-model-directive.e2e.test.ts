import "./reply.directive.directive-behavior.e2e-mocks.js";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertModelSelection,
  installDirectiveBehaviorE2EHooks,
  runEmbeddedPiAgent,
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
function makeMoonshotConfig(home: string, storePath: string) {
  return {
    agents: {
      defaults: {
        model: { primary: "anthropic/claude-opus-4-5" },
        workspace: path.join(home, "openclaw"),
        models: {
          "anthropic/claude-opus-4-5": {},
          "moonshot/kimi-k2-0905-preview": {},
        },
      },
    },
    models: {
      mode: "merge",
      providers: {
        moonshot: {
          baseUrl: "https://api.moonshot.ai/v1",
          apiKey: "sk-test",
          api: "openai-completions",
          models: [{ id: "kimi-k2-0905-preview", name: "Kimi K2" }],
        },
      },
    },
    session: { store: storePath },
  };
}

>>>>>>> a54707b86 (refactor(test): dedupe fuzzy model directive config)
describe("directive behavior", () => {
  installDirectiveBehaviorE2EHooks();

  async function runMoonshotModelDirective(params: {
    home: string;
    storePath: string;
    body: string;
  }) {
    return await getReplyFromConfig(
      { Body: params.body, From: "+1222", To: "+1222", CommandAuthorized: true },
      {},
      makeMoonshotConfig(params.home, params.storePath),
    );
  }

  function expectMoonshotSelectionFromResponse(params: {
    response: Awaited<ReturnType<typeof getReplyFromConfig>>;
    storePath: string;
  }) {
    const text = Array.isArray(params.response) ? params.response[0]?.text : params.response?.text;
    expect(text).toContain("Model set to moonshot/kimi-k2-0905-preview.");
    assertModelSelection(params.storePath, {
      provider: "moonshot",
      model: "kimi-k2-0905-preview",
    });
    expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
  }

  it("supports fuzzy model matches on /model directive", async () => {
    await withTempHome(async (home) => {
      const storePath = path.join(home, "sessions.json");

<<<<<<< HEAD
      const res = await getReplyFromConfig(
        { Body: "/model kimi", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: { primary: "anthropic/claude-opus-4-5" },
              workspace: path.join(home, "clawd"),
              models: {
                "anthropic/claude-opus-4-5": {},
                "moonshot/kimi-k2-0905-preview": {},
              },
            },
          },
          models: {
            mode: "merge",
            providers: {
              moonshot: {
                baseUrl: "https://api.moonshot.ai/v1",
                apiKey: "sk-test",
                api: "openai-completions",
                models: [{ id: "kimi-k2-0905-preview", name: "Kimi K2" }],
              },
            },
          },
          session: { store: storePath },
        },
=======
        makeMoonshotConfig(home, storePath),
>>>>>>> a54707b86 (refactor(test): dedupe fuzzy model directive config)
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toContain("Model set to moonshot/kimi-k2-0905-preview.");
      assertModelSelection(storePath, {
        provider: "moonshot",
        model: "kimi-k2-0905-preview",
=======
      const res = await runMoonshotModelDirective({
        home,
        storePath,
        body: "/model kimi",
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      });

      expectMoonshotSelectionFromResponse({ response: res, storePath });
    });
  });
  it("resolves provider-less exact model ids via fuzzy matching when unambiguous", async () => {
    await withTempHome(async (home) => {
      const storePath = path.join(home, "sessions.json");

<<<<<<< HEAD
      const res = await getReplyFromConfig(
        {
          Body: "/model kimi-k2-0905-preview",
          From: "+1222",
          To: "+1222",
          CommandAuthorized: true,
        },
        {},
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: { primary: "anthropic/claude-opus-4-5" },
              workspace: path.join(home, "clawd"),
              models: {
                "anthropic/claude-opus-4-5": {},
                "moonshot/kimi-k2-0905-preview": {},
              },
            },
          },
          models: {
            mode: "merge",
            providers: {
              moonshot: {
                baseUrl: "https://api.moonshot.ai/v1",
                apiKey: "sk-test",
                api: "openai-completions",
                models: [{ id: "kimi-k2-0905-preview", name: "Kimi K2" }],
              },
            },
          },
          session: { store: storePath },
        },
=======
        makeMoonshotConfig(home, storePath),
>>>>>>> a54707b86 (refactor(test): dedupe fuzzy model directive config)
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toContain("Model set to moonshot/kimi-k2-0905-preview.");
      assertModelSelection(storePath, {
        provider: "moonshot",
        model: "kimi-k2-0905-preview",
=======
      const res = await runMoonshotModelDirective({
        home,
        storePath,
        body: "/model kimi-k2-0905-preview",
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      });

      expectMoonshotSelectionFromResponse({ response: res, storePath });
    });
  });
  it("supports fuzzy matches within a provider on /model provider/model", async () => {
    await withTempHome(async (home) => {
      const storePath = path.join(home, "sessions.json");

<<<<<<< HEAD
      const res = await getReplyFromConfig(
        { Body: "/model moonshot/kimi", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: { primary: "anthropic/claude-opus-4-5" },
              workspace: path.join(home, "clawd"),
              models: {
                "anthropic/claude-opus-4-5": {},
                "moonshot/kimi-k2-0905-preview": {},
              },
            },
          },
          models: {
            mode: "merge",
            providers: {
              moonshot: {
                baseUrl: "https://api.moonshot.ai/v1",
                apiKey: "sk-test",
                api: "openai-completions",
                models: [{ id: "kimi-k2-0905-preview", name: "Kimi K2" }],
              },
            },
          },
          session: { store: storePath },
        },
=======
        makeMoonshotConfig(home, storePath),
>>>>>>> a54707b86 (refactor(test): dedupe fuzzy model directive config)
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toContain("Model set to moonshot/kimi-k2-0905-preview.");
      assertModelSelection(storePath, {
        provider: "moonshot",
        model: "kimi-k2-0905-preview",
=======
      const res = await runMoonshotModelDirective({
        home,
        storePath,
        body: "/model moonshot/kimi",
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      });

      expectMoonshotSelectionFromResponse({ response: res, storePath });
    });
  });
  it("picks the best fuzzy match when multiple models match", async () => {
    await withTempHome(async (home) => {
      const storePath = path.join(home, "sessions.json");

      await getReplyFromConfig(
        { Body: "/model minimax", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
        {
          agents: {
            defaults: {
              model: { primary: "minimax/MiniMax-M2.1" },
              workspace: path.join(home, "clawd"),
              models: {
                "minimax/MiniMax-M2.1": {},
                "minimax/MiniMax-M2.1-lightning": {},
                "lmstudio/minimax-m2.1-gs32": {},
              },
            },
          },
          models: {
            mode: "merge",
            providers: {
              minimax: {
                baseUrl: "https://api.minimax.io/anthropic",
                apiKey: "sk-test",
                api: "anthropic-messages",
                models: [{ id: "MiniMax-M2.1", name: "MiniMax M2.1" }],
              },
              lmstudio: {
                baseUrl: "http://127.0.0.1:1234/v1",
                apiKey: "lmstudio",
                api: "openai-responses",
                models: [{ id: "minimax-m2.1-gs32", name: "MiniMax M2.1 GS32" }],
              },
            },
          },
          session: { store: storePath },
        },
      );

      assertModelSelection(storePath);
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("picks the best fuzzy match within a provider", async () => {
    await withTempHome(async (home) => {
      const storePath = path.join(home, "sessions.json");

      await getReplyFromConfig(
        { Body: "/model minimax/m2.1", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
        {
          agents: {
            defaults: {
              model: { primary: "minimax/MiniMax-M2.1" },
              workspace: path.join(home, "clawd"),
              models: {
                "minimax/MiniMax-M2.1": {},
                "minimax/MiniMax-M2.1-lightning": {},
              },
            },
          },
          models: {
            mode: "merge",
            providers: {
              minimax: {
                baseUrl: "https://api.minimax.io/anthropic",
                apiKey: "sk-test",
                api: "anthropic-messages",
                models: [
                  { id: "MiniMax-M2.1", name: "MiniMax M2.1" },
                  {
                    id: "MiniMax-M2.1-lightning",
                    name: "MiniMax M2.1 Lightning",
                  },
                ],
              },
            },
          },
          session: { store: storePath },
        },
      );

      assertModelSelection(storePath);
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
});
