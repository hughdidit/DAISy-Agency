import { afterEach, describe, expect, it, vi } from "vitest";
import type { SkillStatusReport } from "../agents/skills-status.js";
import type { OpenClawConfig } from "../config/config.js";
import { captureFullEnv } from "../test-utils/env.js";
import {
  applyOpenClawReadonlyEnv,
  type OpenClawReadonlyRuntime,
  parseOpenClawReadonlyCommand,
  resolveOpenClawReadonlyEnv,
  runOpenClawReadonly,
} from "./openclaw-readonly.js";

type TestLoadConfig = typeof import("../config/config.js").loadConfig;
type TestBuildWorkspaceSkillStatus =
  typeof import("../agents/skills-status.js").buildWorkspaceSkillStatus;
type TestFormatSkillsList = typeof import("./skills-cli.format.js").formatSkillsList;
type TestFormatSkillsCheck = typeof import("./skills-cli.format.js").formatSkillsCheck;

describe("openclaw-readonly CLI", () => {
  const runtime: OpenClawReadonlyRuntime = {
    log: vi.fn<(...args: unknown[]) => void>(),
    error: vi.fn<(...args: unknown[]) => void>(),
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

  it("requires readonly config and state mounts when no fallback is available", () => {
    const command = parseOpenClawReadonlyCommand(["status"]);
    expect(() =>
      resolveOpenClawReadonlyEnv(command, {}, () => false),
    ).toThrow(
      "Missing readonly config mount: /workspace/.openclaw-readonly/agents/main/openclaw.json",
    );
  });

  it("accepts the projected readonly fallback without explicit readonly env vars", () => {
    const command = parseOpenClawReadonlyCommand(["status"]);
    const resolved = resolveOpenClawReadonlyEnv(
      command,
      {},
      (targetPath) =>
        targetPath === "/workspace/.openclaw-readonly/agents/main/openclaw.json" ||
        targetPath === "/workspace/.openclaw-readonly/agents/main/state",
    );

    expect(resolved.configPath).toBe("/workspace/.openclaw-readonly/agents/main/openclaw.json");
    expect(resolved.stateDir).toBe("/workspace/.openclaw-readonly/agents/main/state");
  });

  it("requires a workspace mount for skills diagnostics when no fallback is available", () => {
    const command = parseOpenClawReadonlyCommand(["skills", "list"]);
    expect(() =>
      resolveOpenClawReadonlyEnv(
        command,
        {
          OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
          OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
        },
        (targetPath) =>
          targetPath === "/readonly/openclaw.json" || targetPath === "/readonly/state",
      ),
    ).toThrow("Missing OPENCLAW_READONLY_WORKSPACE_DIR");
  });

  it("prefers the sandbox workspace fallback for skills diagnostics", () => {
    const command = parseOpenClawReadonlyCommand(["skills", "list"]);
    const resolved = resolveOpenClawReadonlyEnv(
      command,
      {
        OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
        OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
      },
      (targetPath) =>
        targetPath === "/readonly/openclaw.json" ||
        targetPath === "/readonly/state" ||
        targetPath === "/workspace",
    );

    expect(resolved.workspaceDir).toBe("/workspace");
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

  it("uses OPENCLAW_READONLY_PROJECTION_ROOT when deriving fallback paths", () => {
    const env: NodeJS.ProcessEnv = {
      OPENCLAW_READONLY_PROJECTION_ROOT: "/sandbox-root/.openclaw-readonly",
    };

    applyOpenClawReadonlyEnv(env);

    expect(env.OPENCLAW_CONFIG_PATH).toBe("/sandbox-root/.openclaw-readonly/openclaw.json");
    expect(env.OPENCLAW_STATE_DIR).toBe("/sandbox-root/.openclaw-readonly/state");
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
      const config = { agents: {} } as OpenClawConfig;
      const report = {
        skills: [],
        workspaceDir: "/agent",
        managedSkillsDir: "/managed-skills",
      } satisfies SkillStatusReport;
      const buildWorkspaceSkillStatus = vi.fn<TestBuildWorkspaceSkillStatus>(() => report);
      const formatSkillsList = vi.fn<TestFormatSkillsList>(() => "skills list output");
      const formatSkillsCheck = vi.fn<TestFormatSkillsCheck>(() => "skills check output");
      const loadConfig = vi.fn<TestLoadConfig>(() => config);

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
        config,
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
