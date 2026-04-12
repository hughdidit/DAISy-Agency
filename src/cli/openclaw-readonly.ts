#!/usr/bin/env node
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { isMainModule } from "../infra/is-main.js";

export type OpenClawReadonlyCommand =
  | {
      key: "status";
      args: ["status"];
      requiresWorkspace: false;
    }
  | {
      key: "sandbox-explain";
      args: ["sandbox", "explain"];
      requiresWorkspace: false;
    }
  | {
      key: "skills-list";
      args: ["skills", "list"];
      requiresWorkspace: true;
    }
  | {
      key: "skills-check";
      args: ["skills", "check"];
      requiresWorkspace: true;
    };

export type OpenClawReadonlyResolvedEnv = {
  command: OpenClawReadonlyCommand;
  configPath: string;
  stateDir: string;
  agentId: string;
  workspaceDir?: string;
};

export type OpenClawReadonlyRuntime = {
  log: (message: string) => void;
  error: (message: string) => void;
  exit: (code: number) => void;
};

type OpenClawReadonlyDeps = {
  env: NodeJS.ProcessEnv;
  runtime: OpenClawReadonlyRuntime;
  pathExists: (targetPath: string) => boolean;
  importStatusCommand: () => Promise<{
    statusCommand: (
      opts: {
        json?: boolean;
        deep?: boolean;
        usage?: boolean;
        timeoutMs?: number;
        verbose?: boolean;
        all?: boolean;
      },
      runtime: OpenClawReadonlyRuntime,
    ) => Promise<void>;
  }>;
  importSandboxExplainCommand: () => Promise<{
    sandboxExplainCommand: (
      opts: { session?: string; agent?: string; json: boolean },
      runtime: OpenClawReadonlyRuntime,
    ) => Promise<void>;
  }>;
  importSkillsModules: () => Promise<{
    loadConfig: () => unknown;
    buildWorkspaceSkillStatus: (
      workspaceDir: string,
      opts?: { config?: unknown },
    ) => unknown;
    formatSkillsList: (report: unknown, opts: Record<string, unknown>) => string;
    formatSkillsCheck: (report: unknown, opts: Record<string, unknown>) => string;
  }>;
};

const SUPPORTED_INVOCATIONS = [
  "openclaw-readonly status",
  "openclaw-readonly sandbox explain",
  "openclaw-readonly skills list",
  "openclaw-readonly skills check",
] as const;

function formatUnsupportedCommandDetails(): string {
  return [
    "Allowed commands:",
    ...SUPPORTED_INVOCATIONS.map((value) => `  - ${value}`),
    "Flags and extra positional arguments are not supported in v1.",
  ].join("\n");
}

export function parseOpenClawReadonlyCommand(
  argv: readonly string[],
): OpenClawReadonlyCommand {
  const args = argv.map((value) => value.trim()).filter(Boolean);

  if (args.length === 0) {
    throw new Error(
      `Missing command.\n${formatUnsupportedCommandDetails()}\n` +
        "Use the bundled launcher script for sandbox diagnostics only.",
    );
  }

  const flagged = args.find((value) => value.startsWith("-"));
  if (flagged) {
    throw new Error(
      `Flags are not supported for openclaw-readonly: ${flagged}\n${formatUnsupportedCommandDetails()}`,
    );
  }

  if (args.length === 1 && args[0] === "status") {
    return { key: "status", args: ["status"], requiresWorkspace: false };
  }

  if (args.length === 2 && args[0] === "sandbox" && args[1] === "explain") {
    return {
      key: "sandbox-explain",
      args: ["sandbox", "explain"],
      requiresWorkspace: false,
    };
  }

  if (args.length === 2 && args[0] === "skills" && args[1] === "list") {
    return {
      key: "skills-list",
      args: ["skills", "list"],
      requiresWorkspace: true,
    };
  }

  if (args.length === 2 && args[0] === "skills" && args[1] === "check") {
    return {
      key: "skills-check",
      args: ["skills", "check"],
      requiresWorkspace: true,
    };
  }

  throw new Error(
    `Unsupported command: ${args.join(" ")}\n${formatUnsupportedCommandDetails()}`,
  );
}

function requireEnvValue(
  env: NodeJS.ProcessEnv,
  key: string,
  label: string,
): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${key}. ${label} must be mounted read-only into the sandbox before ` +
        "running openclaw-readonly.",
    );
  }
  return value;
}

export function resolveOpenClawReadonlyEnv(
  command: OpenClawReadonlyCommand,
  env: NodeJS.ProcessEnv = process.env,
  pathExists: (targetPath: string) => boolean = (targetPath) => fs.existsSync(targetPath),
): OpenClawReadonlyResolvedEnv {
  const configPath = requireEnvValue(
    env,
    "OPENCLAW_READONLY_CONFIG_PATH",
    "The readonly config file",
  );
  if (!pathExists(configPath)) {
    throw new Error(
      `Missing readonly config mount: ${configPath}\n` +
        "Bind the config file into the sandbox and set OPENCLAW_READONLY_CONFIG_PATH to that file path.",
    );
  }

  const stateDir = requireEnvValue(
    env,
    "OPENCLAW_READONLY_STATE_DIR",
    "The readonly state directory",
  );
  if (!pathExists(stateDir)) {
    throw new Error(
      `Missing readonly state mount: ${stateDir}\n` +
        "Bind a synthetic read-only state root into the sandbox and set OPENCLAW_READONLY_STATE_DIR to that directory.",
    );
  }

  const agentId = env.OPENCLAW_READONLY_AGENT_ID?.trim() || "main";
  const workspaceDir = env.OPENCLAW_READONLY_WORKSPACE_DIR?.trim() || undefined;

  if (command.requiresWorkspace) {
    if (!workspaceDir) {
      throw new Error(
        "Missing OPENCLAW_READONLY_WORKSPACE_DIR. Mount the sandbox-visible workspace " +
          '(for example "/agent") and set OPENCLAW_READONLY_WORKSPACE_DIR before running ' +
          `${command.args.join(" ")}.`,
      );
    }
    if (!pathExists(workspaceDir)) {
      throw new Error(
        `Missing readonly workspace mount: ${workspaceDir}\n` +
          "Bind the sandbox-visible workspace directory read-only and set OPENCLAW_READONLY_WORKSPACE_DIR to that mount path.",
      );
    }
  }

  return {
    command,
    configPath,
    stateDir,
    agentId,
    workspaceDir,
  };
}

export function applyOpenClawReadonlyEnv(env: NodeJS.ProcessEnv = process.env): void {
  const configPath = env.OPENCLAW_READONLY_CONFIG_PATH?.trim();
  const stateDir = env.OPENCLAW_READONLY_STATE_DIR?.trim();

  if (configPath) {
    env.OPENCLAW_CONFIG_PATH = configPath;
  }
  if (stateDir) {
    env.OPENCLAW_STATE_DIR = stateDir;
  }
  env.OPENCLAW_AUTH_STORE_READONLY = "1";
  env.OPENCLAW_DISABLE_CONFIG_CACHE = "1";
}

function createDefaultReadonlyRuntime(): OpenClawReadonlyRuntime {
  return {
    log: (message) => console.log(message),
    error: (message) => console.error(message),
    exit: (code) => process.exit(code),
  };
}

function createDefaultReadonlyDeps(): OpenClawReadonlyDeps {
  return {
    env: process.env,
    runtime: createDefaultReadonlyRuntime(),
    pathExists: (targetPath) => fs.existsSync(targetPath),
    importStatusCommand: async () => await import("../commands/status.command.js"),
    importSandboxExplainCommand: async () => await import("../commands/sandbox-explain.js"),
    importSkillsModules: async () => {
      const [{ loadConfig }, { buildWorkspaceSkillStatus }, formatting] = await Promise.all([
        import("../config/config.js"),
        import("../agents/skills-status.js"),
        import("./skills-cli.format.js"),
      ]);
      return {
        loadConfig,
        buildWorkspaceSkillStatus,
        formatSkillsList: formatting.formatSkillsList,
        formatSkillsCheck: formatting.formatSkillsCheck,
      };
    },
  };
}

async function runOpenClawReadonlyResolved(
  resolved: OpenClawReadonlyResolvedEnv,
  deps: OpenClawReadonlyDeps,
): Promise<void> {
  switch (resolved.command.key) {
    case "status": {
      const { statusCommand } = await deps.importStatusCommand();
      await statusCommand({}, deps.runtime);
      return;
    }
    case "sandbox-explain": {
      const { sandboxExplainCommand } = await deps.importSandboxExplainCommand();
      await sandboxExplainCommand({ agent: resolved.agentId, json: false }, deps.runtime);
      return;
    }
    case "skills-list":
    case "skills-check": {
      const { loadConfig, buildWorkspaceSkillStatus, formatSkillsCheck, formatSkillsList } =
        await deps.importSkillsModules();
      const config = loadConfig();
      const report = buildWorkspaceSkillStatus(resolved.workspaceDir ?? "", { config });
      deps.runtime.log(
        resolved.command.key === "skills-list"
          ? formatSkillsList(report, {})
          : formatSkillsCheck(report, {}),
      );
      return;
    }
  }
}

export async function runOpenClawReadonly(
  argv: readonly string[] = process.argv.slice(2),
  overrides: Partial<OpenClawReadonlyDeps> = {},
): Promise<void> {
  const deps = {
    ...createDefaultReadonlyDeps(),
    ...overrides,
  } satisfies OpenClawReadonlyDeps;

  try {
    const command = parseOpenClawReadonlyCommand(argv);
    const resolved = resolveOpenClawReadonlyEnv(command, deps.env, deps.pathExists);
    applyOpenClawReadonlyEnv(deps.env);
    await runOpenClawReadonlyResolved(resolved, deps);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.runtime.error(message);
    deps.runtime.exit(1);
  }
}

if (isMainModule({ currentFile: fileURLToPath(import.meta.url) })) {
  await runOpenClawReadonly();
}
