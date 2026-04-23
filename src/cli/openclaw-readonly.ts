#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StatusRuntimeContext } from "../commands/status.scan.js";
import { isMainModule } from "../infra/is-main.js";
import type { RuntimeEnv } from "../runtime.js";

type ReadonlyLoadConfig = typeof import("../config/config.js").loadConfig;
type ReadonlyBuildReadonlySkillStatusReport =
  typeof import("../agents/capabilities/index.js").buildReadonlySkillStatusReport;
type ReadonlyGetRemoteSkillEligibility =
  typeof import("../infra/skills-remote.js").getRemoteSkillEligibility;
type ReadonlyFormatSkillsList = typeof import("./skills-cli.format.js").formatSkillsList;
type ReadonlyFormatSkillsCheck = typeof import("./skills-cli.format.js").formatSkillsCheck;

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

export type OpenClawReadonlyRuntime = RuntimeEnv;

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
        runtimeContext?: StatusRuntimeContext;
      },
      runtime: OpenClawReadonlyRuntime,
    ) => Promise<void>;
  }>;
  importSandboxExplainCommand: () => Promise<{
    sandboxExplainCommand: (
      opts: {
        session?: string;
        agent?: string;
        json: boolean;
        readonlyRuntime?: {
          workspaceDir?: string;
        };
      },
      runtime: OpenClawReadonlyRuntime,
    ) => Promise<void>;
  }>;
  importSkillsModules: () => Promise<{
    loadConfig: ReadonlyLoadConfig;
    buildReadonlySkillStatusReport: ReadonlyBuildReadonlySkillStatusReport;
    getRemoteSkillEligibility: ReadonlyGetRemoteSkillEligibility;
    formatSkillsList: ReadonlyFormatSkillsList;
    formatSkillsCheck: ReadonlyFormatSkillsCheck;
  }>;
};

const SUPPORTED_INVOCATIONS = [
  "openclaw-readonly status",
  "openclaw-readonly sandbox explain",
  "openclaw-readonly skills list",
  "openclaw-readonly skills check",
] as const;

function resolveReadonlyProjectionRoot(env: NodeJS.ProcessEnv): string {
  const agentId = env.OPENCLAW_READONLY_AGENT_ID?.trim() || "main";
  return (
    env.OPENCLAW_READONLY_PROJECTION_ROOT?.trim() ||
    path.posix.join("/workspace", ".openclaw-readonly", "agents", agentId)
  );
}

function formatUnsupportedCommandDetails(): string {
  return [
    "Allowed commands:",
    ...SUPPORTED_INVOCATIONS.map((value) => `  - ${value}`),
    "Flags and extra positional arguments are not supported in v1.",
  ].join("\n");
}

export function parseOpenClawReadonlyCommand(argv: readonly string[]): OpenClawReadonlyCommand {
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

  throw new Error(`Unsupported command: ${args.join(" ")}\n${formatUnsupportedCommandDetails()}`);
}

function resolveReadonlyConfigPath(env: NodeJS.ProcessEnv): string {
  return (
    env.OPENCLAW_READONLY_CONFIG_PATH?.trim() ||
    env.OPENCLAW_CONFIG_PATH?.trim() ||
    path.posix.join(resolveReadonlyProjectionRoot(env), "openclaw.json")
  );
}

function resolveReadonlyStateDir(env: NodeJS.ProcessEnv): string {
  return (
    env.OPENCLAW_READONLY_STATE_DIR?.trim() ||
    env.OPENCLAW_STATE_DIR?.trim() ||
    path.posix.join(resolveReadonlyProjectionRoot(env), "state")
  );
}

function resolveReadonlyWorkspaceDir(
  env: NodeJS.ProcessEnv,
  pathExists: (targetPath: string) => boolean,
): string | undefined {
  const explicit = env.OPENCLAW_READONLY_WORKSPACE_DIR?.trim();
  if (explicit) {
    return explicit;
  }
  if (pathExists("/agent")) {
    return "/agent";
  }
  if (pathExists("/workspace")) {
    return "/workspace";
  }
  return undefined;
}

export function resolveOpenClawReadonlyEnv(
  command: OpenClawReadonlyCommand,
  env: NodeJS.ProcessEnv = process.env,
  pathExists: (targetPath: string) => boolean = (targetPath) => fs.existsSync(targetPath),
): OpenClawReadonlyResolvedEnv {
  const projectionRoot = resolveReadonlyProjectionRoot(env);
  const configPath = resolveReadonlyConfigPath(env);
  if (!pathExists(configPath)) {
    throw new Error(
      `Missing readonly config mount: ${configPath}\n` +
        `Set OPENCLAW_READONLY_CONFIG_PATH explicitly, keep OPENCLAW_CONFIG_PATH available in the sandbox, or let the sandbox project ${path.posix.join(projectionRoot, "openclaw.json")}.`,
    );
  }

  const stateDir = resolveReadonlyStateDir(env);
  if (!pathExists(stateDir)) {
    throw new Error(
      `Missing readonly state mount: ${stateDir}\n` +
        `Set OPENCLAW_READONLY_STATE_DIR explicitly, keep OPENCLAW_STATE_DIR available in the sandbox, or let the sandbox project ${path.posix.join(projectionRoot, "state")}.`,
    );
  }

  const agentId = env.OPENCLAW_READONLY_AGENT_ID?.trim() || "main";
  const workspaceDir = resolveReadonlyWorkspaceDir(env, pathExists);

  if (command.requiresWorkspace) {
    if (!workspaceDir) {
      throw new Error(
        "Missing OPENCLAW_READONLY_WORKSPACE_DIR. Mount the sandbox-visible workspace " +
          '(for example "/agent") or keep /workspace available before running ' +
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
  const configPath = resolveReadonlyConfigPath(env);
  const stateDir = resolveReadonlyStateDir(env);

  env.OPENCLAW_CONFIG_PATH = configPath;
  env.OPENCLAW_STATE_DIR = stateDir;
  env.OPENCLAW_AUTH_STORE_READONLY = "1";
  env.OPENCLAW_DISABLE_CONFIG_CACHE = "1";
}

function createDefaultReadonlyRuntime(): OpenClawReadonlyRuntime {
  return {
    log: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
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
      const [
        { loadConfig },
        { buildReadonlySkillStatusReport },
        { getRemoteSkillEligibility },
        formatting,
      ] = await Promise.all([
        import("../config/config.js"),
        import("../agents/capabilities/index.js"),
        import("../infra/skills-remote.js"),
        import("./skills-cli.format.js"),
      ]);
      return {
        loadConfig,
        buildReadonlySkillStatusReport,
        getRemoteSkillEligibility,
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
      await statusCommand(
        {
          runtimeContext: {
            kind: "readonly-sandbox",
            agentId: resolved.agentId,
          },
        },
        deps.runtime,
      );
      return;
    }
    case "sandbox-explain": {
      const { sandboxExplainCommand } = await deps.importSandboxExplainCommand();
      await sandboxExplainCommand(
        {
          agent: resolved.agentId,
          json: false,
          readonlyRuntime: {
            workspaceDir: resolved.workspaceDir,
          },
        },
        deps.runtime,
      );
      return;
    }
    case "skills-list":
    case "skills-check": {
      const {
        loadConfig,
        buildReadonlySkillStatusReport,
        getRemoteSkillEligibility,
        formatSkillsCheck,
        formatSkillsList,
      } = await deps.importSkillsModules();
      const config = loadConfig();
      if (!resolved.workspaceDir) {
        throw new Error(`Missing readonly workspace mount for ${resolved.command.args.join(" ")}.`);
      }
      const { report } = buildReadonlySkillStatusReport({
        config,
        agentId: resolved.agentId,
        workspaceDir: resolved.workspaceDir,
        eligibility: { remote: getRemoteSkillEligibility() },
        projection: {
          configPath: resolved.configPath,
          stateDir: resolved.stateDir,
          workspaceDir: resolved.workspaceDir,
          pathExists: deps.pathExists,
        },
      });
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
