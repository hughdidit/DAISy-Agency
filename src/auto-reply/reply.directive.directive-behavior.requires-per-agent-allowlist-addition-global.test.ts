import "./reply.directive.directive-behavior.e2e-mocks.js";
import { describe, expect, it } from "vitest";
import {
  installDirectiveBehaviorE2EHooks,
  makeWhatsAppDirectiveConfig,
  replyText,
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
function makeWorkElevatedAllowlistConfig(home: string) {
  const base = makeWhatsAppDirectiveConfig(
    home,
    {
      model: "anthropic/claude-opus-4-5",
    },
    {
      tools: {
        elevated: {
          allowFrom: { whatsapp: ["+1222", "+1333"] },
        },
      },
      channels: { whatsapp: { allowFrom: ["+1222", "+1333"] } },
    },
  );
  return {
    ...base,
    agents: {
      ...base.agents,
      list: [
        {
          id: "work",
          tools: {
            elevated: {
              allowFrom: { whatsapp: ["+1333"] },
            },
          },
        },
      ],
    },
  };
}

function makeElevatedDirectiveConfig(
  home: string,
  defaults: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
) {
  return makeWhatsAppDirectiveConfig(
    home,
    {
      model: "anthropic/claude-opus-4-5",
      ...defaults,
    },
    {
      tools: {
        elevated: {
          allowFrom: { whatsapp: ["+1222"] },
        },
      },
      channels: { whatsapp: { allowFrom: ["+1222"] } },
      ...extra,
    },
  );
}

function makeCommandMessage(body: string, from = "+1222") {
  return {
    Body: body,
    From: from,
    To: from,
    Provider: "whatsapp",
    SenderE164: from,
    CommandAuthorized: true,
  } as const;
}

>>>>>>> b7ef0a5d0 (refactor(test): reuse directive per-agent allowlist config)
describe("directive behavior", () => {
  installDirectiveBehaviorE2EHooks();

  it("requires per-agent allowlist in addition to global", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        {
          Body: "/elevated on",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
          SenderE164: "+1222",
          SessionKey: "agent:work:main",
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
                id: "work",
                tools: {
                  elevated: {
                    allowFrom: { whatsapp: ["+1333"] },
                  },
                },
              },
            ],
          },
          tools: {
            elevated: {
              allowFrom: { whatsapp: ["+1222", "+1333"] },
            },
          },
          channels: { whatsapp: { allowFrom: ["+1222", "+1333"] } },
          session: { store: path.join(home, "sessions.json") },
        },
=======
        makeWorkElevatedAllowlistConfig(home),
>>>>>>> b7ef0a5d0 (refactor(test): reuse directive per-agent allowlist config)
      );

      const text = replyText(res);
      expect(text).toContain("agents.list[].tools.elevated.allowFrom.whatsapp");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("allows elevated when both global and per-agent allowlists match", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        {
          ...makeCommandMessage("/elevated on", "+1333"),
          SessionKey: "agent:work:main",
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
                id: "work",
                tools: {
                  elevated: {
                    allowFrom: { whatsapp: ["+1333"] },
                  },
                },
              },
            ],
          },
          tools: {
            elevated: {
              allowFrom: { whatsapp: ["+1222", "+1333"] },
            },
          },
          channels: { whatsapp: { allowFrom: ["+1222", "+1333"] } },
          session: { store: path.join(home, "sessions.json") },
        },
=======
        makeWorkElevatedAllowlistConfig(home),
>>>>>>> b7ef0a5d0 (refactor(test): reuse directive per-agent allowlist config)
      );

      const text = replyText(res);
      expect(text).toContain("Elevated mode set to ask");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("warns when elevated is used in direct runtime", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        makeCommandMessage("/elevated off"),
        {},
<<<<<<< HEAD
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
              sandbox: { mode: "off" },
            },
=======
        makeWhatsAppDirectiveConfig(
          home,
          {
            model: "anthropic/claude-opus-4-5",
            sandbox: { mode: "off" },
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
          },
          {
            tools: {
              elevated: {
                allowFrom: { whatsapp: ["+1222"] },
              },
            },
            channels: { whatsapp: { allowFrom: ["+1222"] } },
          },
        ),
=======
        makeElevatedDirectiveConfig(home, { sandbox: { mode: "off" } }),
>>>>>>> 2fd211b70 (test(auto-reply): dedupe directive behavior e2e fixtures)
      );

      const text = replyText(res);
      expect(text).toContain("Elevated mode disabled.");
      expect(text).toContain("Runtime is direct; sandboxing does not apply.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("rejects invalid elevated level", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        makeCommandMessage("/elevated maybe"),
        {},
<<<<<<< HEAD
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
=======
        makeWhatsAppDirectiveConfig(
          home,
          { model: "anthropic/claude-opus-4-5" },
          {
            tools: {
              elevated: {
                allowFrom: { whatsapp: ["+1222"] },
              },
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
            },
            channels: { whatsapp: { allowFrom: ["+1222"] } },
          },
        ),
=======
        makeElevatedDirectiveConfig(home),
>>>>>>> 2fd211b70 (test(auto-reply): dedupe directive behavior e2e fixtures)
      );

      const text = replyText(res);
      expect(text).toContain("Unrecognized elevated level");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("handles multiple directives in a single message", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        makeCommandMessage("/elevated off\n/verbose on"),
        {},
<<<<<<< HEAD
<<<<<<< HEAD
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
=======
        makeWhatsAppDirectiveConfig(
          home,
          { model: "anthropic/claude-opus-4-5" },
          {
            tools: {
              elevated: {
                allowFrom: { whatsapp: ["+1222"] },
              },
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
            },
            channels: { whatsapp: { allowFrom: ["+1222"] } },
          },
        ),
=======
        makeElevatedDirectiveConfig(home),
>>>>>>> 2fd211b70 (test(auto-reply): dedupe directive behavior e2e fixtures)
      );

      const text = replyText(res);
      expect(text).toContain("Elevated mode disabled.");
      expect(text).toContain("Verbose logging enabled.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
});
