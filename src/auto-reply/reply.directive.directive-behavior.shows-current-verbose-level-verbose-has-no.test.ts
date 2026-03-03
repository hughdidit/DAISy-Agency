import "./reply.directive.directive-behavior.e2e-mocks.js";
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { loadSessionStore } from "../config/sessions.js";
import {
  AUTHORIZED_WHATSAPP_COMMAND,
  assertElevatedOffStatusReply,
  installDirectiveBehaviorE2EHooks,
  makeElevatedDirectiveConfig,
  makeRestrictedElevatedDisabledConfig,
  makeWhatsAppDirectiveConfig,
  replyText,
  runEmbeddedPiAgent,
  sessionStorePath,
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
const COMMAND_MESSAGE_BASE = {
  From: "+1222",
  To: "+1222",
  CommandAuthorized: true,
} as const;

async function runCommand(
  home: string,
  body: string,
  options: { defaults?: Record<string, unknown>; extra?: Record<string, unknown> } = {},
) {
  const res = await getReplyFromConfig(
    { ...COMMAND_MESSAGE_BASE, Body: body },
    {},
    makeWhatsAppDirectiveConfig(
      home,
      {
        model: "anthropic/claude-opus-4-5",
        ...options.defaults,
      },
      options.extra ?? {},
    ),
  );
  return replyText(res);
}

async function runElevatedCommand(home: string, body: string) {
  return getReplyFromConfig(
    { ...AUTHORIZED_WHATSAPP_COMMAND, Body: body },
    {},
    makeElevatedDirectiveConfig(home),
  );
}

>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
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

function makeAllowlistedElevatedConfig(
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

>>>>>>> e048ed1ef (test: merge elevated allowlist directive shard)
describe("directive behavior", () => {
  installDirectiveBehaviorE2EHooks();

  it("reports current directive defaults when no arguments are provided", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const res = await getReplyFromConfig(
        { Body: "/verbose", From: "+1222", To: "+1222", CommandAuthorized: true },
        {},
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
              verboseDefault: "on",
            },
          },
          session: { store: path.join(home, "sessions.json") },
        },
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toContain("Current verbose level: on");
      expect(text).toContain("Options: on, full, off.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows current reasoning level when /reasoning has no argument", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        { Body: "/reasoning", From: "+1222", To: "+1222", CommandAuthorized: true },
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
      expect(text).toContain("Current reasoning level: off");
      expect(text).toContain("Options: on, off, stream.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows current elevated level when /elevated has no argument", async () => {
    await withTempHome(async (home) => {
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
          session: { store: path.join(home, "sessions.json") },
        },
      );

      const text = Array.isArray(res) ? res[0]?.text : res?.text;
      expect(text).toContain("Current elevated level: on");
      expect(text).toContain("Options: on, off, ask, full.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows current exec defaults when /exec has no argument", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        {
          Body: "/exec",
          From: "+1222",
          To: "+1222",
          CommandAuthorized: true,
        },
        {},
        {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: path.join(home, "clawd"),
            },
          },
        extra: {
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
          tools: {
            exec: {
              host: "gateway",
              security: "allowlist",
              ask: "always",
              node: "mac-1",
            },
          },
        },
      });
      expect(execText).toContain(
        "Current exec defaults: host=gateway, security=allowlist, ask=always, node=mac-1.",
      );
      expect(execText).toContain(
        "Options: host=sandbox|gateway|node, security=deny|allowlist|full, ask=off|on-miss|always, node=<id>.",
      );
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("persists elevated toggles across /status and /elevated", async () => {
    await withTempHome(async (home) => {
      const storePath = path.join(home, "sessions.json");

      const res = await getReplyFromConfig(
        {
          Body: "/elevated off\n/status",
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
      expect(text).toContain("Elevated mode disabled.");
      const optionsLine = text?.split("\n").find((line) => line.trim().startsWith("⚙️"));
      expect(optionsLine).toBeTruthy();
      expect(optionsLine).not.toContain("elevated");
=======
=======
      expect(text).toContain("Session: agent:main:main");
>>>>>>> 706c9ec72 (test: consolidate directive behavior suites)
      assertElevatedOffStatusReply(text);
>>>>>>> 3138dbaf7 (test(auto-reply): share elevated-off status assertion)
=======
>>>>>>> 31ca7fb27 (test: consolidate directive behavior test scenarios)

      const offStatusText = replyText(await runElevatedCommand(home, "/elevated off\n/status"));
      expect(offStatusText).toContain("Session: agent:main:main");
      assertElevatedOffStatusReply(offStatusText);

      const offLevelText = replyText(await runElevatedCommand(home, "/elevated"));
      expect(offLevelText).toContain("Current elevated level: off");
      expect(loadSessionStore(storePath)["agent:main:main"]?.elevatedLevel).toBe("off");

      await runElevatedCommand(home, "/elevated on");
      const onStatusText = replyText(await runElevatedCommand(home, "/status"));
      const optionsLine = onStatusText?.split("\n").find((line) => line.trim().startsWith("⚙️"));
      expect(optionsLine).toBeTruthy();
      expect(optionsLine).toContain("elevated");

      const store = loadSessionStore(storePath);
      expect(store["agent:main:main"]?.elevatedLevel).toBe("on");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("enforces per-agent elevated restrictions and status visibility", async () => {
    await withTempHome(async (home) => {
      const deniedRes = await getReplyFromConfig(
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
        makeRestrictedElevatedDisabledConfig(home) as unknown as OpenClawConfig,
      );
      const deniedText = replyText(deniedRes);
      expect(deniedText).toContain("agents.list[].tools.elevated.enabled");

      const statusRes = await getReplyFromConfig(
        {
          Body: "/status",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
          SenderE164: "+1222",
          SessionKey: "agent:restricted:main",
          CommandAuthorized: true,
        },
        {},
        makeRestrictedElevatedDisabledConfig(home) as unknown as OpenClawConfig,
      );
      const statusText = replyText(statusRes);
      expect(statusText).not.toContain("elevated");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("applies per-agent allowlist requirements before allowing elevated", async () => {
    await withTempHome(async (home) => {
      const deniedRes = await getReplyFromConfig(
        {
          ...makeCommandMessage("/elevated on", "+1222"),
          SessionKey: "agent:work:main",
        },
        {},
        makeWorkElevatedAllowlistConfig(home),
      );

      const deniedText = replyText(deniedRes);
      expect(deniedText).toContain("agents.list[].tools.elevated.allowFrom.whatsapp");

      const allowedRes = await getReplyFromConfig(
        {
          ...makeCommandMessage("/elevated on", "+1333"),
          SessionKey: "agent:work:main",
        },
        {},
        makeWorkElevatedAllowlistConfig(home),
      );

      const allowedText = replyText(allowedRes);
      expect(allowedText).toContain("Elevated mode set to ask");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("handles runtime warning, invalid level, and multi-directive elevated inputs", async () => {
    await withTempHome(async (home) => {
      for (const scenario of [
        {
          body: "/elevated off",
          config: makeAllowlistedElevatedConfig(home, { sandbox: { mode: "off" } }),
          expectedSnippets: [
            "Elevated mode disabled.",
            "Runtime is direct; sandboxing does not apply.",
          ],
        },
        {
          body: "/elevated maybe",
          config: makeAllowlistedElevatedConfig(home),
          expectedSnippets: ["Unrecognized elevated level"],
        },
        {
          body: "/elevated off\n/verbose on",
          config: makeAllowlistedElevatedConfig(home),
          expectedSnippets: ["Elevated mode disabled.", "Verbose logging enabled."],
        },
      ]) {
        const res = await getReplyFromConfig(
          makeCommandMessage(scenario.body),
          {},
          scenario.config,
        );
        const text = replyText(res);
        for (const snippet of scenario.expectedSnippets) {
          expect(text).toContain(snippet);
        }
      }
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("persists queue overrides and reset behavior", async () => {
    await withTempHome(async (home) => {
      const storePath = sessionStorePath(home);

      const interruptText = await runQueueDirective(home, "/queue interrupt");
      expect(interruptText).toMatch(/^⚙️ Queue mode set to interrupt\./);
      let store = loadSessionStore(storePath);
      let entry = Object.values(store)[0];
      expect(entry?.queueMode).toBe("interrupt");

      const collectText = await runQueueDirective(
        home,
        "/queue collect debounce:2s cap:5 drop:old",
      );

      expect(collectText).toMatch(/^⚙️ Queue mode set to collect\./);
      expect(collectText).toMatch(/Queue debounce set to 2000ms/);
      expect(collectText).toMatch(/Queue cap set to 5/);
      expect(collectText).toMatch(/Queue drop set to old/);
      store = loadSessionStore(storePath);
      entry = Object.values(store)[0];
      expect(entry?.queueMode).toBe("collect");
      expect(entry?.queueDebounceMs).toBe(2000);
      expect(entry?.queueCap).toBe(5);
      expect(entry?.queueDrop).toBe("old");

      const resetText = await runQueueDirective(home, "/queue reset");
      expect(resetText).toMatch(/^⚙️ Queue mode reset to default\./);
      store = loadSessionStore(storePath);
      entry = Object.values(store)[0];
      expect(entry?.queueMode).toBeUndefined();
      expect(entry?.queueDebounceMs).toBeUndefined();
      expect(entry?.queueCap).toBeUndefined();
      expect(entry?.queueDrop).toBeUndefined();
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("strips inline elevated directives from the user text (does not persist session override)", async () => {
    await withTempHome(async (home) => {
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "ok" }],
        meta: {
          durationMs: 1,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });
      const storePath = sessionStorePath(home);

      await getReplyFromConfig(
        {
          Body: "hello there /elevated off",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
          SenderE164: "+1222",
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

      const store = loadSessionStore(storePath);
      expect(store["agent:main:main"]?.elevatedLevel).toBeUndefined();

      const calls = vi.mocked(runEmbeddedPiAgent).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const call = calls[0]?.[0];
      expect(call?.prompt).toContain("hello there");
      expect(call?.prompt).not.toContain("/elevated");
    });
  });
});
