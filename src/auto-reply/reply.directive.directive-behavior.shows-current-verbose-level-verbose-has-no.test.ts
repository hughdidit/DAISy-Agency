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

<<<<<<< HEAD
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
=======
async function runQueueDirective(home: string, body: string) {
  return runCommand(home, body);
}

>>>>>>> 706c9ec72 (test: consolidate directive behavior suites)
describe("directive behavior", () => {
  installDirectiveBehaviorE2EHooks();

  it("shows current verbose level when /verbose has no argument", async () => {
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
=======
      const text = await runCommand(home, "/verbose", { defaults: { verboseDefault: "on" } });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      expect(text).toContain("Current verbose level: on");
      expect(text).toContain("Options: on, full, off.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows current reasoning level when /reasoning has no argument", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
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
=======
      const text = await runCommand(home, "/reasoning");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      expect(text).toContain("Current reasoning level: off");
      expect(text).toContain("Options: on, off, stream.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows current elevated level when /elevated has no argument", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
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
=======
      const res = await runElevatedCommand(home, "/elevated");
      const text = replyText(res);
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      expect(text).toContain("Current elevated level: on");
      expect(text).toContain("Options: on, off, ask, full.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows current exec defaults when /exec has no argument", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
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
=======
      const text = await runCommand(home, "/exec", {
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
      expect(text).toContain(
        "Current exec defaults: host=gateway, security=allowlist, ask=always, node=mac-1.",
      );
      expect(text).toContain(
        "Options: host=sandbox|gateway|node, security=deny|allowlist|full, ask=off|on-miss|always, node=<id>.",
      );
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("persists elevated off and reflects it in /status (even when default is on)", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
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
=======
      const storePath = sessionStorePath(home);
      const res = await runElevatedCommand(home, "/elevated off\n/status");
      const text = replyText(res);
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
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

      const store = loadSessionStore(storePath);
      expect(store["agent:main:main"]?.elevatedLevel).toBe("off");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows current elevated level as off after toggling it off", async () => {
    await withTempHome(async (home) => {
      await runElevatedCommand(home, "/elevated off");
      const res = await runElevatedCommand(home, "/elevated");
      const text = replyText(res);
      expect(text).toContain("Current elevated level: off");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("can toggle elevated off then back on (status reflects on)", async () => {
    await withTempHome(async (home) => {
      const storePath = sessionStorePath(home);
      await runElevatedCommand(home, "/elevated off");
      await runElevatedCommand(home, "/elevated on");
      const res = await runElevatedCommand(home, "/status");
      const text = replyText(res);
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
        makeRestrictedElevatedDisabledConfig(home) as unknown as OpenClawConfig,
      );

      const text = replyText(res);
      expect(text).toContain("agents.list[].tools.elevated.enabled");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows elevated off in status when per-agent elevated is disabled", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
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

      const text = replyText(res);
      expect(text).not.toContain("elevated");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("acks queue directive and persists override", async () => {
    await withTempHome(async (home) => {
      const storePath = sessionStorePath(home);

      const text = await runQueueDirective(home, "/queue interrupt");

      expect(text).toMatch(/^⚙️ Queue mode set to interrupt\./);
      const store = loadSessionStore(storePath);
      const entry = Object.values(store)[0];
      expect(entry?.queueMode).toBe("interrupt");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("persists queue options when directive is standalone", async () => {
    await withTempHome(async (home) => {
      const storePath = sessionStorePath(home);

      const text = await runQueueDirective(home, "/queue collect debounce:2s cap:5 drop:old");

      expect(text).toMatch(/^⚙️ Queue mode set to collect\./);
      expect(text).toMatch(/Queue debounce set to 2000ms/);
      expect(text).toMatch(/Queue cap set to 5/);
      expect(text).toMatch(/Queue drop set to old/);
      const store = loadSessionStore(storePath);
      const entry = Object.values(store)[0];
      expect(entry?.queueMode).toBe("collect");
      expect(entry?.queueDebounceMs).toBe(2000);
      expect(entry?.queueCap).toBe(5);
      expect(entry?.queueDrop).toBe("old");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("resets queue mode to default", async () => {
    await withTempHome(async (home) => {
      const storePath = sessionStorePath(home);

      await runQueueDirective(home, "/queue interrupt");
      const text = await runQueueDirective(home, "/queue reset");
      expect(text).toMatch(/^⚙️ Queue mode reset to default\./);
      const store = loadSessionStore(storePath);
      const entry = Object.values(store)[0];
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
<<<<<<< HEAD
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
=======
        makeElevatedDirectiveConfig(home),
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
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
