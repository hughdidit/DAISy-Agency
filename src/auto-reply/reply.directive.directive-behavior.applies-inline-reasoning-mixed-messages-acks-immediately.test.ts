import "./reply.directive.directive-behavior.e2e-mocks.js";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { loadSessionStore, resolveSessionKey, saveSessionStore } from "../config/sessions.js";
import {
  installDirectiveBehaviorE2EHooks,
  makeEmbeddedTextResult,
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
=======
=======
async function writeSkill(params: { workspaceDir: string; name: string; description: string }) {
  const { workspaceDir, name, description } = params;
  const skillDir = path.join(workspaceDir, "skills", name);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`,
    "utf-8",
  );
}

async function runThinkingDirective(home: string, model: string) {
  const res = await getReplyFromConfig(
    {
      Body: "/thinking xhigh",
      From: "+1004",
      To: "+2000",
      CommandAuthorized: true,
    },
    {},
    makeWhatsAppDirectiveConfig(home, { model }, { session: { store: sessionStorePath(home) } }),
  );
  return replyTexts(res);
}

>>>>>>> f6ee1c99a (test: merge thinking and queue directive shards)
async function runThinkDirectiveAndGetText(home: string): Promise<string | undefined> {
>>>>>>> b11ff9f7d (test: collapse directive behavior shards)
  const res = await getReplyFromConfig(
    { Body: "/think", From: "+1222", To: "+1222", CommandAuthorized: true },
    {},
    makeWhatsAppDirectiveConfig(home, {
      model: "anthropic/claude-opus-4-5",
      thinkingDefault: "high",
    }),
  );
  return replyText(res);
}

function mockEmbeddedResponse(text: string) {
  vi.mocked(runEmbeddedPiAgent).mockResolvedValue(makeEmbeddedTextResult(text));
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

<<<<<<< HEAD
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
=======
function makeRunConfig(home: string, storePath: string) {
  return makeWhatsAppDirectiveConfig(
    home,
    { model: "anthropic/claude-opus-4-5" },
    { session: { store: storePath } },
  );
}

async function runInFlightVerboseToggleCase(params: {
  home: string;
  shouldEmitBefore: boolean;
  toggledVerboseLevel: "on" | "off";
  seedVerboseOn?: boolean;
}) {
  const storePath = sessionStorePath(params.home);
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

  vi.mocked(runEmbeddedPiAgent).mockImplementation(async (agentParams) => {
    const shouldEmit = agentParams.shouldEmitToolResult;
    expect(shouldEmit?.()).toBe(params.shouldEmitBefore);
    const store = loadSessionStore(storePath);
    const entry = store[sessionKey] ?? {
      sessionId: "s",
      updatedAt: Date.now(),
    };
    store[sessionKey] = {
      ...entry,
      verboseLevel: params.toggledVerboseLevel,
      updatedAt: Date.now(),
    };
    await saveSessionStore(storePath, store);
    expect(shouldEmit?.()).toBe(!params.shouldEmitBefore);
    return makeEmbeddedTextResult("done");
  });

  if (params.seedVerboseOn) {
    await getReplyFromConfig(
      { Body: "/verbose on", From: ctx.From, To: ctx.To, CommandAuthorized: true },
      {},
      makeRunConfig(params.home, storePath),
    );
  }

  const res = await getReplyFromConfig(ctx, {}, makeRunConfig(params.home, storePath));
  return { res };
}

>>>>>>> b11ff9f7d (test: collapse directive behavior shards)
describe("directive behavior", () => {
  installDirectiveBehaviorE2EHooks();

  it("keeps reasoning acks out of mixed messages, including rapid repeats", async () => {
    await withTempHome(async (home) => {
      mockEmbeddedResponse("done");

      const blockReplies: string[] = [];
      const storePath = sessionStorePath(home);

<<<<<<< HEAD
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
=======
      const firstRes = await runInlineReasoningMessage({
>>>>>>> 31ca7fb27 (test: consolidate directive behavior test scenarios)
        home,
        body: "please reply\n/reasoning on",
        storePath,
        blockReplies,
      });
<<<<<<< HEAD
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
=======
      expect(replyTexts(firstRes)).toContain("done");
>>>>>>> 31ca7fb27 (test: consolidate directive behavior test scenarios)

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
  it("updates tool verbose during an in-flight run (toggle on)", async () => {
    await withTempHome(async (home) => {
      const { res } = await runInFlightVerboseToggleCase({
        home,
        shouldEmitBefore: false,
        toggledVerboseLevel: "on",
      });

      const texts = replyTexts(res);
      expect(texts).toContain("done");
      expect(runEmbeddedPiAgent).toHaveBeenCalledOnce();
    });
  });
  it("updates tool verbose during an in-flight run (toggle off)", async () => {
    await withTempHome(async (home) => {
      const { res } = await runInFlightVerboseToggleCase({
        home,
        shouldEmitBefore: true,
        toggledVerboseLevel: "off",
        seedVerboseOn: true,
      });

      const texts = replyTexts(res);
      expect(texts).toContain("done");
      expect(runEmbeddedPiAgent).toHaveBeenCalledOnce();
    });
  });
  it("shows current think level when /think has no argument", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
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
=======
      const text = await runThinkDirectiveAndGetText(home);
>>>>>>> b11ff9f7d (test: collapse directive behavior shards)
      expect(text).toContain("Current thinking level: high");
      expect(text).toContain("Options: off, minimal, low, medium, high.");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
>>>>>>> b11ff9f7d (test: collapse directive behavior shards)
=======
  it("accepts /thinking xhigh for codex models", async () => {
    await withTempHome(async (home) => {
      const texts = await runThinkingDirective(home, "openai-codex/gpt-5.2-codex");
      expect(texts).toContain("Thinking level set to xhigh.");
    });
  });
  it("accepts /thinking xhigh for openai gpt-5.2", async () => {
    await withTempHome(async (home) => {
      const texts = await runThinkingDirective(home, "openai/gpt-5.2");
      expect(texts).toContain("Thinking level set to xhigh.");
    });
  });
  it("rejects /thinking xhigh for non-codex models", async () => {
    await withTempHome(async (home) => {
      const texts = await runThinkingDirective(home, "openai/gpt-4.1-mini");
      expect(texts).toContain(
        'Thinking level "xhigh" is only supported for openai/gpt-5.2, openai-codex/gpt-5.3-codex, openai-codex/gpt-5.3-codex-spark, openai-codex/gpt-5.2-codex, openai-codex/gpt-5.1-codex, github-copilot/gpt-5.2-codex or github-copilot/gpt-5.2.',
      );
    });
  });
  it("keeps reserved command aliases from matching after trimming", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        {
          Body: "/help",
          From: "+1222",
          To: "+1222",
          CommandAuthorized: true,
        },
        {},
        makeWhatsAppDirectiveConfig(
          home,
          {
            model: "anthropic/claude-opus-4-5",
            models: {
              "anthropic/claude-opus-4-5": { alias: " help " },
            },
          },
          { session: { store: sessionStorePath(home) } },
        ),
      );

      const text = replyText(res);
      expect(text).toContain("Help");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("treats skill commands as reserved for model aliases", async () => {
    await withTempHome(async (home) => {
      const workspace = path.join(home, "openclaw");
      await writeSkill({
        workspaceDir: workspace,
        name: "demo-skill",
        description: "Demo skill",
      });

      await getReplyFromConfig(
        {
          Body: "/demo_skill",
          From: "+1222",
          To: "+1222",
          CommandAuthorized: true,
        },
        {},
        makeWhatsAppDirectiveConfig(
          home,
          {
            model: "anthropic/claude-opus-4-5",
            workspace,
            models: {
              "anthropic/claude-opus-4-5": { alias: "demo_skill" },
            },
          },
          { session: { store: sessionStorePath(home) } },
        ),
      );

      expect(runEmbeddedPiAgent).toHaveBeenCalled();
      const prompt = vi.mocked(runEmbeddedPiAgent).mock.calls[0]?.[0]?.prompt ?? "";
      expect(prompt).toContain('Use the "demo-skill" skill');
    });
  });
  it("errors on invalid queue options", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        {
          Body: "/queue collect debounce:bogus cap:zero drop:maybe",
          From: "+1222",
          To: "+1222",
          CommandAuthorized: true,
        },
        {},
        makeWhatsAppDirectiveConfig(
          home,
          { model: "anthropic/claude-opus-4-5" },
          {
            session: { store: sessionStorePath(home) },
          },
        ),
      );

      const text = replyText(res);
      expect(text).toContain("Invalid debounce");
      expect(text).toContain("Invalid cap");
      expect(text).toContain("Invalid drop policy");
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
  it("shows current queue settings when /queue has no arguments", async () => {
    await withTempHome(async (home) => {
      const res = await getReplyFromConfig(
        {
          Body: "/queue",
          From: "+1222",
          To: "+1222",
          Provider: "whatsapp",
          CommandAuthorized: true,
        },
        {},
        makeWhatsAppDirectiveConfig(
          home,
          { model: "anthropic/claude-opus-4-5" },
          {
            messages: {
              queue: {
                mode: "collect",
                debounceMs: 1500,
                cap: 9,
                drop: "summarize",
              },
            },
            session: { store: sessionStorePath(home) },
          },
        ),
      );

      const text = replyText(res);
      expect(text).toContain(
        "Current queue settings: mode=collect, debounce=1500ms, cap=9, drop=summarize.",
      );
      expect(text).toContain(
        "Options: modes steer, followup, collect, steer+backlog, interrupt; debounce:<ms|s|m>, cap:<n>, drop:old|new|summarize.",
      );
      expect(runEmbeddedPiAgent).not.toHaveBeenCalled();
    });
  });
>>>>>>> f6ee1c99a (test: merge thinking and queue directive shards)
});
