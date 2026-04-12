import { afterEach, describe, expect, it, vi } from "vitest";
import { captureFullEnv } from "../test-utils/env.js";
import {
  applyOpenClawReadonlyEnv,
  parseOpenClawReadonlyCommand,
  resolveOpenClawReadonlyEnv,
  runOpenClawReadonly,
} from "./openclaw-readonly.js";

describe("openclaw-readonly CLI", () => {
  const runtime = {
    log: vi.fn<(message: string) => void>(),
    error: vi.fn<(message: string) => void>(),
    exit: vi.fn<(code: number) => void>(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([[["status"]], [["sandbox", "explain"]], [["skills", "list"]], [["skills", "check"]]])(
    "allows the exact tuple %j",
    (argv) => {
      expect(parseOpenClawReadonlyCommand(argv)).toBeDefined();
    },
  );

  it.each([
    [["status", "--all"], "Flags are not supported"],
    [["skills", "list", "foo"], "Unsupported command"],
    [["gateway", "status"], "Unsupported command"],
    [["config", "get"], "Unsupported command"],
    [["update"], "Unsupported command"],
    [["models", "auth"], "Unsupported command"],
    [["secrets", "audit"], "Unsupported command"],
    [["skills", "info"], "Unsupported command"],
    [["doctor", "--plain"], "Flags are not supported"],
  ])("rejects %j", (argv, expected) => {
    expect(() => parseOpenClawReadonlyCommand(argv)).toThrow(expected);
  });

  it("requires readonly config and state mounts", () => {
    const command = parseOpenClawReadonlyCommand(["status"]);
    expect(() => resolveOpenClawReadonlyEnv(command, {}, () => true)).toThrow(
      "Missing OPENCLAW_READONLY_CONFIG_PATH",
    );
  });

  it("requires a workspace mount for skills diagnostics", () => {
    const command = parseOpenClawReadonlyCommand(["skills", "list"]);
    expect(() =>
      resolveOpenClawReadonlyEnv(
        command,
        {
          OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
          OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
        },
        () => true,
      ),
    ).toThrow("Missing OPENCLAW_READONLY_WORKSPACE_DIR");
  });

  it("maps readonly env vars into the runtime env contract", () => {
    const env: NodeJS.ProcessEnv = {
      OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
      OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
    };

    applyOpenClawReadonlyEnv(env);

    expect(env.OPENCLAW_CONFIG_PATH).toBe("/readonly/openclaw.json");
    expect(env.OPENCLAW_STATE_DIR).toBe("/readonly/state");
    expect(env.OPENCLAW_AUTH_STORE_READONLY).toBe("1");
    expect(env.OPENCLAW_DISABLE_CONFIG_CACHE).toBe("1");
  });

  it("defaults OPENCLAW_READONLY_AGENT_ID to main", () => {
    const command = parseOpenClawReadonlyCommand(["sandbox", "explain"]);
    const resolved = resolveOpenClawReadonlyEnv(
      command,
      {
        OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
        OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
      },
      () => true,
    );

    expect(resolved.agentId).toBe("main");
  });

  it("dispatches skills list with the sandbox-visible workspace override", async () => {
    const snapshot = captureFullEnv();
    try {
      const buildWorkspaceSkillStatus = vi.fn(() => ({ skills: [] }));
      const formatSkillsList = vi.fn(() => "skills list output");
      const formatSkillsCheck = vi.fn(() => "skills check output");
      const loadConfig = vi.fn(() => ({ agents: {} }));

      await runOpenClawReadonly(["skills", "list"], {
        env: {
          OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
          OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
          OPENCLAW_READONLY_WORKSPACE_DIR: "/agent",
        },
        runtime,
        pathExists: () => true,
        importStatusCommand: async () => ({
          statusCommand: vi.fn(),
        }),
        importSandboxExplainCommand: async () => ({
          sandboxExplainCommand: vi.fn(),
        }),
        importSkillsModules: async () => ({
          loadConfig,
          buildWorkspaceSkillStatus,
          formatSkillsList,
          formatSkillsCheck,
        }),
      });

      expect(buildWorkspaceSkillStatus).toHaveBeenCalledWith("/agent", {
        config: { agents: {} },
      });
      expect(formatSkillsList).toHaveBeenCalled();
      expect(runtime.log).toHaveBeenCalledWith("skills list output");
      expect(runtime.exit).not.toHaveBeenCalled();
    } finally {
      snapshot.restore();
    }
  });

  it("surfaces actionable runtime failures", async () => {
    await runOpenClawReadonly(["skills", "check"], {
      env: {
        OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
        OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
        OPENCLAW_READONLY_WORKSPACE_DIR: "/missing-agent",
      },
      runtime,
      pathExists: (targetPath) => targetPath !== "/missing-agent",
    });

    expect(runtime.error).toHaveBeenCalledWith(
      expect.stringContaining("Missing readonly workspace"),
    );
    expect(runtime.exit).toHaveBeenCalledWith(1);
  });
});
