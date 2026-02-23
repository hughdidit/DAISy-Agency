import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  addSubagentRunForTests,
  resetSubagentRegistryForTests,
} from "../../agents/subagent-registry.js";
import type { MoltbotConfig } from "../../config/config.js";
import * as internalHooks from "../../hooks/internal-hooks.js";
import { clearPluginCommands, registerPluginCommand } from "../../plugins/commands.js";
import type { MsgContext } from "../templating.js";
import { resetBashChatCommandForTests } from "./bash-command.js";
import { buildCommandContext, handleCommands } from "./commands.js";
import { parseInlineDirectives } from "./directive-handling.js";

// Avoid expensive workspace scans during /context tests.
vi.mock("./commands-context-report.js", () => ({
  buildContextReply: async (params: { command: { commandBodyNormalized: string } }) => {
    const normalized = params.command.commandBodyNormalized;
    if (normalized === "/context list") {
      return { text: "Injected workspace files:\n- AGENTS.md" };
    }
    if (normalized === "/context detail") {
      return { text: "Context breakdown (detailed)\nTop tools (schema size):" };
    }
    return { text: "/context\n- /context list\nInline shortcut" };
  },
}));

let testWorkspaceDir = os.tmpdir();

beforeAll(async () => {
  testWorkspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-commands-"));
  await fs.writeFile(path.join(testWorkspaceDir, "AGENTS.md"), "# Agents\n", "utf-8");
});

afterAll(async () => {
  await fs.rm(testWorkspaceDir, { recursive: true, force: true });
});

function buildParams(commandBody: string, cfg: MoltbotConfig, ctxOverrides?: Partial<MsgContext>) {
  const ctx = {
    Body: commandBody,
    CommandBody: commandBody,
    CommandSource: "text",
    CommandAuthorized: true,
    Provider: "whatsapp",
    Surface: "whatsapp",
    ...ctxOverrides,
  } as MsgContext;

  const command = buildCommandContext({
    ctx,
    cfg,
    isGroup: false,
    triggerBodyNormalized: commandBody.trim().toLowerCase(),
    commandAuthorized: true,
  });

  return {
    ctx,
    cfg,
    command,
    directives: parseInlineDirectives(commandBody),
    elevated: { enabled: true, allowed: true, failures: [] },
    sessionKey: "agent:main:main",
    workspaceDir: testWorkspaceDir,
    defaultGroupActivation: () => "mention",
    resolvedVerboseLevel: "off" as const,
    resolvedReasoningLevel: "off" as const,
    resolveDefaultThinkingLevel: async () => undefined,
    provider: "whatsapp",
    model: "test-model",
    contextTokens: 0,
    isGroup: false,
  };
}

describe("handleCommands gating", () => {
  it("blocks /bash when disabled", async () => {
    resetBashChatCommandForTests();
    const cfg = {
      commands: { bash: false, text: true },
      whatsapp: { allowFrom: ["*"] },
    } as MoltbotConfig;
    const params = buildParams("/bash echo hi", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("bash is disabled");
  });

  it("blocks /bash when elevated is not allowlisted", async () => {
    resetBashChatCommandForTests();
    const cfg = {
      commands: { bash: true, text: true },
      whatsapp: { allowFrom: ["*"] },
    } as MoltbotConfig;
    const params = buildParams("/bash echo hi", cfg);
    params.elevated = {
      enabled: true,
      allowed: false,
      failures: [{ gate: "allowFrom", key: "tools.elevated.allowFrom.whatsapp" }],
    };
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("elevated is not available");
  });

  it("blocks /config when disabled", async () => {
    const cfg = {
      commands: { config: false, debug: false, text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/config show", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("/config is disabled");
  });

  it("blocks /debug when disabled", async () => {
    const cfg = {
      commands: { config: false, debug: false, text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
<<<<<<< HEAD
    } as MoltbotConfig;
    const params = buildParams("/debug show", cfg);
=======
    } as OpenClawConfig;
    const params = buildParams("/status", cfg);

    const result = await handleCompactCommand(
      {
        ...params,
      },
      true,
    );

    expect(result).toBeNull();
    expect(vi.mocked(compactEmbeddedPiSession)).not.toHaveBeenCalled();
  });

  it("rejects unauthorized /compact commands", async () => {
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as OpenClawConfig;
    const params = buildParams("/compact", cfg);

    const result = await handleCompactCommand(
      {
        ...params,
        command: {
          ...params.command,
          isAuthorizedSender: false,
          senderId: "unauthorized",
        },
      },
      true,
    );

    expect(result).toEqual({ shouldContinue: false });
    expect(vi.mocked(compactEmbeddedPiSession)).not.toHaveBeenCalled();
  });

  it("routes manual compaction with explicit trigger and context metadata", async () => {
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
      session: { store: "/tmp/openclaw-session-store.json" },
    } as OpenClawConfig;
    const params = buildParams("/compact: focus on decisions", cfg, {
      From: "+15550001",
      To: "+15550002",
    });
    const agentDir = "/tmp/openclaw-agent-compact";
    vi.mocked(compactEmbeddedPiSession).mockResolvedValueOnce({
      ok: true,
      compacted: false,
    });

    const result = await handleCompactCommand(
      {
        ...params,
        agentDir,
        sessionEntry: {
          sessionId: "session-1",
          updatedAt: Date.now(),
          groupId: "group-1",
          groupChannel: "#general",
          space: "workspace-1",
          spawnedBy: "agent:main:parent",
          totalTokens: 12345,
        },
      },
      true,
    );

    expect(result?.shouldContinue).toBe(false);
    expect(vi.mocked(compactEmbeddedPiSession)).toHaveBeenCalledOnce();
    expect(vi.mocked(compactEmbeddedPiSession)).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        sessionKey: "agent:main:main",
        trigger: "manual",
        customInstructions: "focus on decisions",
        messageChannel: "whatsapp",
        groupId: "group-1",
        groupChannel: "#general",
        groupSpace: "workspace-1",
        spawnedBy: "agent:main:parent",
        agentDir,
      }),
    );
  });
});

describe("buildCommandsPaginationKeyboard", () => {
  it("adds agent id to callback data when provided", () => {
    const keyboard = buildCommandsPaginationKeyboard(2, 3, "agent-main");
    expect(keyboard[0]).toEqual([
      { text: "◀ Prev", callback_data: "commands_page_1:agent-main" },
      { text: "2/3", callback_data: "commands_page_noop:agent-main" },
      { text: "Next ▶", callback_data: "commands_page_3:agent-main" },
    ]);
  });
});

describe("parseConfigCommand", () => {
  it("parses config/debug command actions and JSON payloads", () => {
    const cases: Array<{
      parse: (input: string) => unknown;
      input: string;
      expected: unknown;
    }> = [
      { parse: parseConfigCommand, input: "/config", expected: { action: "show" } },
      {
        parse: parseConfigCommand,
        input: "/config show",
        expected: { action: "show", path: undefined },
      },
      {
        parse: parseConfigCommand,
        input: "/config show foo.bar",
        expected: { action: "show", path: "foo.bar" },
      },
      {
        parse: parseConfigCommand,
        input: "/config get foo.bar",
        expected: { action: "show", path: "foo.bar" },
      },
      {
        parse: parseConfigCommand,
        input: "/config unset foo.bar",
        expected: { action: "unset", path: "foo.bar" },
      },
      {
        parse: parseConfigCommand,
        input: '/config set foo={"a":1}',
        expected: { action: "set", path: "foo", value: { a: 1 } },
      },
      { parse: parseDebugCommand, input: "/debug", expected: { action: "show" } },
      { parse: parseDebugCommand, input: "/debug show", expected: { action: "show" } },
      { parse: parseDebugCommand, input: "/debug reset", expected: { action: "reset" } },
      {
        parse: parseDebugCommand,
        input: "/debug unset foo.bar",
        expected: { action: "unset", path: "foo.bar" },
      },
      {
        parse: parseDebugCommand,
        input: '/debug set foo={"a":1}',
        expected: { action: "set", path: "foo", value: { a: 1 } },
      },
    ];

    for (const testCase of cases) {
      expect(testCase.parse(testCase.input)).toEqual(testCase.expected);
    }
  });
});

describe("extractMessageText", () => {
  it("preserves user markers and sanitizes assistant markers", () => {
    const cases = [
      {
        message: { role: "user", content: "Here [Tool Call: foo (ID: 1)] ok" },
        expectedText: "Here [Tool Call: foo (ID: 1)] ok",
      },
      {
        message: { role: "assistant", content: "Here [Tool Call: foo (ID: 1)] ok" },
        expectedText: "Here ok",
      },
    ] as const;

    for (const testCase of cases) {
      const result = extractMessageText(testCase.message);
      expect(result?.text).toBe(testCase.expectedText);
    }
  });
});

describe("handleCommands /config configWrites gating", () => {
  it("blocks /config set when channel config writes are disabled", async () => {
    const cfg = {
      commands: { config: true, text: true },
      channels: { whatsapp: { allowFrom: ["*"], configWrites: false } },
    } as OpenClawConfig;
    const params = buildParams('/config set messages.ackReaction=":)"', cfg);
>>>>>>> 36400df08 (fix: pass agentDir to /compact command for agent-specific auth (#24133))
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("/debug is disabled");
  });
});

describe("handleCommands bash alias", () => {
  it("routes !poll through the /bash handler", async () => {
    resetBashChatCommandForTests();
    const cfg = {
      commands: { bash: true, text: true },
      whatsapp: { allowFrom: ["*"] },
    } as MoltbotConfig;
    const params = buildParams("!poll", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("No active bash job");
  });

  it("routes !stop through the /bash handler", async () => {
    resetBashChatCommandForTests();
    const cfg = {
      commands: { bash: true, text: true },
      whatsapp: { allowFrom: ["*"] },
    } as MoltbotConfig;
    const params = buildParams("!stop", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("No active bash job");
  });
});

<<<<<<< HEAD
=======
function buildPolicyParams(
  commandBody: string,
  cfg: OpenClawConfig,
  ctxOverrides?: Partial<MsgContext>,
): HandleCommandsParams {
  const ctx = {
    Body: commandBody,
    CommandBody: commandBody,
    CommandSource: "text",
    CommandAuthorized: true,
    Provider: "telegram",
    Surface: "telegram",
    ...ctxOverrides,
  } as MsgContext;

  const command = buildCommandContext({
    ctx,
    cfg,
    isGroup: false,
    triggerBodyNormalized: commandBody.trim().toLowerCase(),
    commandAuthorized: true,
  });

  const params: HandleCommandsParams = {
    ctx,
    cfg,
    command,
    directives: parseInlineDirectives(commandBody),
    elevated: { enabled: true, allowed: true, failures: [] },
    sessionKey: "agent:main:main",
    workspaceDir: "/tmp",
    defaultGroupActivation: () => "mention",
    resolvedVerboseLevel: "off",
    resolvedReasoningLevel: "off",
    resolveDefaultThinkingLevel: async () => undefined,
    provider: "telegram",
    model: "test-model",
    contextTokens: 0,
    isGroup: false,
  };
  return params;
}

describe("handleCommands /allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists config + store allowFrom entries", async () => {
    readChannelAllowFromStoreMock.mockResolvedValueOnce(["456"]);

    const cfg = {
      commands: { text: true },
      channels: { telegram: { allowFrom: ["123", "@Alice"] } },
    } as OpenClawConfig;
    const params = buildPolicyParams("/allowlist list dm", cfg);
    const result = await handleCommands(params);

    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Channel: telegram");
    expect(result.reply?.text).toContain("DM allowFrom (config): 123, @alice");
    expect(result.reply?.text).toContain("Paired allowFrom (store): 456");
  });

  it("adds entries to config and pairing store", async () => {
    readConfigFileSnapshotMock.mockResolvedValueOnce({
      valid: true,
      parsed: {
        channels: { telegram: { allowFrom: ["123"] } },
      },
    });
    validateConfigObjectWithPluginsMock.mockImplementation((config: unknown) => ({
      ok: true,
      config,
    }));
    addChannelAllowFromStoreEntryMock.mockResolvedValueOnce({
      changed: true,
      allowFrom: ["123", "789"],
    });

    const cfg = {
      commands: { text: true, config: true },
      channels: { telegram: { allowFrom: ["123"] } },
    } as OpenClawConfig;
    const params = buildPolicyParams("/allowlist add dm 789", cfg);
    const result = await handleCommands(params);

    expect(result.shouldContinue).toBe(false);
    expect(writeConfigFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        channels: { telegram: { allowFrom: ["123", "789"] } },
      }),
    );
    expect(addChannelAllowFromStoreEntryMock).toHaveBeenCalledWith({
      channel: "telegram",
      entry: "789",
    });
    expect(result.reply?.text).toContain("DM allowlist added");
  });

  it("removes Slack DM allowlist entries from canonical allowFrom and deletes legacy dm.allowFrom", async () => {
    readConfigFileSnapshotMock.mockResolvedValueOnce({
      valid: true,
      parsed: {
        channels: {
          slack: {
            allowFrom: ["U111", "U222"],
            dm: { allowFrom: ["U111", "U222"] },
            configWrites: true,
          },
        },
      },
    });
    validateConfigObjectWithPluginsMock.mockImplementation((config: unknown) => ({
      ok: true,
      config,
    }));

    const cfg = {
      commands: { text: true, config: true },
      channels: {
        slack: {
          allowFrom: ["U111", "U222"],
          dm: { allowFrom: ["U111", "U222"] },
          configWrites: true,
        },
      },
    } as OpenClawConfig;

    const params = buildPolicyParams("/allowlist remove dm U111", cfg, {
      Provider: "slack",
      Surface: "slack",
    });
    const result = await handleCommands(params);

    expect(result.shouldContinue).toBe(false);
    expect(writeConfigFileMock).toHaveBeenCalledTimes(1);
    const written = writeConfigFileMock.mock.calls[0]?.[0] as OpenClawConfig;
    expect(written.channels?.slack?.allowFrom).toEqual(["U222"]);
    expect(written.channels?.slack?.dm?.allowFrom).toBeUndefined();
    expect(result.reply?.text).toContain("channels.slack.allowFrom");
  });

  it("removes Discord DM allowlist entries from canonical allowFrom and deletes legacy dm.allowFrom", async () => {
    readConfigFileSnapshotMock.mockResolvedValueOnce({
      valid: true,
      parsed: {
        channels: {
          discord: {
            allowFrom: ["111", "222"],
            dm: { allowFrom: ["111", "222"] },
            configWrites: true,
          },
        },
      },
    });
    validateConfigObjectWithPluginsMock.mockImplementation((config: unknown) => ({
      ok: true,
      config,
    }));

    const cfg = {
      commands: { text: true, config: true },
      channels: {
        discord: {
          allowFrom: ["111", "222"],
          dm: { allowFrom: ["111", "222"] },
          configWrites: true,
        },
      },
    } as OpenClawConfig;

    const params = buildPolicyParams("/allowlist remove dm 111", cfg, {
      Provider: "discord",
      Surface: "discord",
    });
    const result = await handleCommands(params);

    expect(result.shouldContinue).toBe(false);
    expect(writeConfigFileMock).toHaveBeenCalledTimes(1);
    const written = writeConfigFileMock.mock.calls[0]?.[0] as OpenClawConfig;
    expect(written.channels?.discord?.allowFrom).toEqual(["222"]);
    expect(written.channels?.discord?.dm?.allowFrom).toBeUndefined();
    expect(result.reply?.text).toContain("channels.discord.allowFrom");
  });
});

describe("/models command", () => {
  const cfg = {
    commands: { text: true },
    agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } },
  } as unknown as OpenClawConfig;

  it.each(["discord", "whatsapp"])("lists providers on %s (text)", async (surface) => {
    const params = buildPolicyParams("/models", cfg, { Provider: surface, Surface: surface });
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Providers:");
    expect(result.reply?.text).toContain("anthropic");
    expect(result.reply?.text).toContain("Use: /models <provider>");
  });

  it("lists providers on telegram (buttons)", async () => {
    const params = buildPolicyParams("/models", cfg, { Provider: "telegram", Surface: "telegram" });
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toBe("Select a provider:");
    const buttons = (result.reply?.channelData as { telegram?: { buttons?: unknown[][] } })
      ?.telegram?.buttons;
    expect(buttons).toBeDefined();
    expect(buttons?.length).toBeGreaterThan(0);
  });

  it("lists provider models with pagination hints", async () => {
    // Use discord surface for text-based output tests
    const params = buildPolicyParams("/models anthropic", cfg, { Surface: "discord" });
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Models (anthropic");
    expect(result.reply?.text).toContain("page 1/");
    expect(result.reply?.text).toContain("anthropic/claude-opus-4-5");
    expect(result.reply?.text).toContain("Switch: /model <provider/model>");
    expect(result.reply?.text).toContain("All: /models anthropic all");
  });

  it("ignores page argument when all flag is present", async () => {
    // Use discord surface for text-based output tests
    const params = buildPolicyParams("/models anthropic 3 all", cfg, { Surface: "discord" });
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Models (anthropic");
    expect(result.reply?.text).toContain("page 1/1");
    expect(result.reply?.text).toContain("anthropic/claude-opus-4-5");
    expect(result.reply?.text).not.toContain("Page out of range");
  });

  it("errors on out-of-range pages", async () => {
    // Use discord surface for text-based output tests
    const params = buildPolicyParams("/models anthropic 4", cfg, { Surface: "discord" });
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Page out of range");
    expect(result.reply?.text).toContain("valid: 1-");
  });

  it("handles unknown providers", async () => {
    const params = buildPolicyParams("/models not-a-provider", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Unknown provider");
    expect(result.reply?.text).toContain("Available providers");
  });

  it("lists configured models outside the curated catalog", async () => {
    const customCfg = {
      commands: { text: true },
      agents: {
        defaults: {
          model: {
            primary: "localai/ultra-chat",
            fallbacks: ["anthropic/claude-opus-4-5"],
          },
          imageModel: "visionpro/studio-v1",
        },
      },
    } as unknown as OpenClawConfig;

    // Use discord surface for text-based output tests
    const providerList = await handleCommands(
      buildPolicyParams("/models", customCfg, { Surface: "discord" }),
    );
    expect(providerList.reply?.text).toContain("localai");
    expect(providerList.reply?.text).toContain("visionpro");

    const result = await handleCommands(
      buildPolicyParams("/models localai", customCfg, { Surface: "discord" }),
    );
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Models (localai");
    expect(result.reply?.text).toContain("localai/ultra-chat");
    expect(result.reply?.text).not.toContain("Unknown provider");
  });
});

>>>>>>> cb84c537f (fix: normalize status auth cost handling and models header tests)
describe("handleCommands plugin commands", () => {
  it("dispatches registered plugin commands", async () => {
    clearPluginCommands();
    const result = registerPluginCommand("test-plugin", {
      name: "card",
      description: "Test card",
      handler: async () => ({ text: "from plugin" }),
    });
    expect(result.ok).toBe(true);

    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/card", cfg);
    const commandResult = await handleCommands(params);

    expect(commandResult.shouldContinue).toBe(false);
    expect(commandResult.reply?.text).toBe("from plugin");
    clearPluginCommands();
  });
});

describe("handleCommands identity", () => {
  it("returns sender details for /whoami", async () => {
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/whoami", cfg, {
      SenderId: "12345",
      SenderUsername: "TestUser",
      ChatType: "direct",
    });
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Channel: whatsapp");
    expect(result.reply?.text).toContain("User id: 12345");
    expect(result.reply?.text).toContain("Username: @TestUser");
    expect(result.reply?.text).toContain("AllowFrom: 12345");
  });
});

describe("handleCommands hooks", () => {
  it("triggers hooks for /new with arguments", async () => {
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/new take notes", cfg);
    const spy = vi.spyOn(internalHooks, "triggerInternalHook").mockResolvedValue();

    await handleCommands(params);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "command", action: "new" }));
    spy.mockRestore();
  });
});

describe("handleCommands context", () => {
  it("returns context help for /context", async () => {
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/context", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("/context list");
    expect(result.reply?.text).toContain("Inline shortcut");
  });

  it("returns a per-file breakdown for /context list", async () => {
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/context list", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Injected workspace files:");
    expect(result.reply?.text).toContain("AGENTS.md");
  });

  it("returns a detailed breakdown for /context detail", async () => {
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/context detail", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Context breakdown (detailed)");
    expect(result.reply?.text).toContain("Top tools (schema size):");
  });
});

describe("handleCommands subagents", () => {
  it("lists subagents when none exist", async () => {
    resetSubagentRegistryForTests();
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/subagents list", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Subagents: none");
  });

  it("lists subagents for the current command session over the target session", async () => {
    resetSubagentRegistryForTests();
    addSubagentRunForTests({
      runId: "run-1",
      childSessionKey: "agent:main:subagent:abc",
      requesterSessionKey: "agent:main:slack:slash:u1",
      requesterDisplayKey: "agent:main:slack:slash:u1",
      task: "do thing",
      cleanup: "keep",
      createdAt: 1000,
      startedAt: 1000,
    });
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/subagents list", cfg, {
      CommandSource: "native",
      CommandTargetSessionKey: "agent:main:main",
    });
    params.sessionKey = "agent:main:slack:slash:u1";
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Subagents (current session)");
    expect(result.reply?.text).toContain("agent:main:subagent:abc");
  });

  it("omits subagent status line when none exist", async () => {
    resetSubagentRegistryForTests();
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
      session: { mainKey: "main", scope: "per-sender" },
    } as MoltbotConfig;
    const params = buildParams("/status", cfg);
    params.resolvedVerboseLevel = "on";
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).not.toContain("Subagents:");
  });

  it("returns help for unknown subagents action", async () => {
    resetSubagentRegistryForTests();
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/subagents foo", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("/subagents");
  });

  it("returns usage for subagents info without target", async () => {
    resetSubagentRegistryForTests();
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
    } as MoltbotConfig;
    const params = buildParams("/subagents info", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("/subagents info");
  });

  it("includes subagent count in /status when active", async () => {
    resetSubagentRegistryForTests();
    addSubagentRunForTests({
      runId: "run-1",
      childSessionKey: "agent:main:subagent:abc",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      task: "do thing",
      cleanup: "keep",
      createdAt: 1000,
      startedAt: 1000,
    });
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
      session: { mainKey: "main", scope: "per-sender" },
    } as MoltbotConfig;
    const params = buildParams("/status", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("🤖 Subagents: 1 active");
  });

  it("includes subagent details in /status when verbose", async () => {
    resetSubagentRegistryForTests();
    addSubagentRunForTests({
      runId: "run-1",
      childSessionKey: "agent:main:subagent:abc",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      task: "do thing",
      cleanup: "keep",
      createdAt: 1000,
      startedAt: 1000,
    });
    addSubagentRunForTests({
      runId: "run-2",
      childSessionKey: "agent:main:subagent:def",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      task: "finished task",
      cleanup: "keep",
      createdAt: 900,
      startedAt: 900,
      endedAt: 1200,
      outcome: { status: "ok" },
    });
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
      session: { mainKey: "main", scope: "per-sender" },
    } as MoltbotConfig;
    const params = buildParams("/status", cfg);
    params.resolvedVerboseLevel = "on";
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("🤖 Subagents: 1 active");
    expect(result.reply?.text).toContain("· 1 done");
  });

  it("returns info for a subagent", async () => {
    resetSubagentRegistryForTests();
    addSubagentRunForTests({
      runId: "run-1",
      childSessionKey: "agent:main:subagent:abc",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      task: "do thing",
      cleanup: "keep",
      createdAt: 1000,
      startedAt: 1000,
      endedAt: 2000,
      outcome: { status: "ok" },
    });
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
      session: { mainKey: "main", scope: "per-sender" },
    } as MoltbotConfig;
    const params = buildParams("/subagents info 1", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("Subagent info");
    expect(result.reply?.text).toContain("Run: run-1");
    expect(result.reply?.text).toContain("Status: done");
  });
});

describe("handleCommands /tts", () => {
  it("returns status for bare /tts on text command surfaces", async () => {
    const cfg = {
      commands: { text: true },
      channels: { whatsapp: { allowFrom: ["*"] } },
      messages: { tts: { prefsPath: path.join(testWorkspaceDir, "tts.json") } },
    } as MoltbotConfig;
    const params = buildParams("/tts", cfg);
    const result = await handleCommands(params);
    expect(result.shouldContinue).toBe(false);
    expect(result.reply?.text).toContain("TTS status");
  });
});
