import type { OpenClawConfig } from "../../config/config.js";
import { resolveUserPath } from "../../utils.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agent-scope.js";
import { resolveSandboxConfigForAgent } from "./config.js";
import * as docker from "./docker.js";
import { removeSandboxBrowserContainer, removeSandboxContainer } from "./manage.js";
import { readBrowserRegistry, readRegistry } from "./registry.js";
import { resolveSandboxAgentId, resolveSandboxWorkspaceDir } from "./shared.js";

type StartupRepairLog = {
  warn?: (message: string) => void;
};

type StartupRepairEntry = {
  containerName: string;
  scopeKey: string;
};

function dedupeStartupRepairEntries(entries: readonly StartupRepairEntry[]): StartupRepairEntry[] {
  const deduped = new Map<string, StartupRepairEntry>();
  for (const entry of entries) {
    deduped.set(entry.containerName, entry);
  }
  return [...deduped.values()];
}

async function readLiveSandboxEntries(log?: StartupRepairLog): Promise<{
  containers: StartupRepairEntry[];
  browsers: StartupRepairEntry[];
}> {
  const execDocker = (docker as Partial<typeof import("./docker.js")>).execDocker;
  const readDockerContainerLabel = (docker as Partial<typeof import("./docker.js")>)
    .readDockerContainerLabel;
  if (!execDocker || !readDockerContainerLabel) {
    const message =
      "Live sandbox discovery is unavailable during startup repair because required Docker helpers were not loaded; continuing with registry data only.";
    if (log?.warn) {
      log.warn(message);
    } else {
      console.warn(message);
    }
    return { containers: [], browsers: [] };
  }

  const result = await execDocker(
    ["ps", "-a", "--filter", "label=openclaw.sandbox=1", "--format", "{{.Names}}"],
    { allowFailure: true },
  );
  if (result.code !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    const details = [stderr && `stderr=${stderr}`, stdout && `stdout=${stdout}`]
      .filter(Boolean)
      .join(" ");
    const message = `Failed to scan live sandbox containers during startup repair (exit ${result.code})${details ? ` ${details}` : ""}.`;
    if (log?.warn) {
      log.warn(message);
    } else {
      console.warn(message);
    }
    return { containers: [], browsers: [] };
  }

  const containers: StartupRepairEntry[] = [];
  const browsers: StartupRepairEntry[] = [];
  const names = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const containerName of names) {
    const scopeKey = await readDockerContainerLabel(containerName, "openclaw.sessionKey");
    if (!scopeKey) {
      continue;
    }
    const isBrowser =
      (await readDockerContainerLabel(containerName, "openclaw.sandboxBrowser")) === "1";
    const entry = { containerName, scopeKey };
    if (isBrowser) {
      browsers.push(entry);
    } else {
      containers.push(entry);
    }
  }

  return { containers, browsers };
}

function resolveExpectedWorkspace(params: { cfg: OpenClawConfig; scopeKey: string }) {
  const agentId = resolveSandboxAgentId(params.scopeKey) ?? resolveDefaultAgentId(params.cfg);
  const sandboxCfg = resolveSandboxConfigForAgent(params.cfg, agentId);
  const agentWorkspaceDir = resolveAgentWorkspaceDir(params.cfg, agentId);
  const workspaceRoot = resolveUserPath(sandboxCfg.workspaceRoot);
  const sandboxWorkspaceDir =
    sandboxCfg.scope === "shared"
      ? workspaceRoot
      : resolveSandboxWorkspaceDir(workspaceRoot, params.scopeKey);
  const workspaceDir =
    sandboxCfg.workspaceAccess === "rw" ? agentWorkspaceDir : sandboxWorkspaceDir;
  return { sandboxCfg, workspaceDir };
}

async function repairRegistryEntries(params: {
  cfg: OpenClawConfig;
  entries: readonly StartupRepairEntry[];
  remove: (containerName: string) => Promise<void>;
}) {
  let removedCount = 0;

  for (const entry of params.entries) {
    const { sandboxCfg, workspaceDir } = resolveExpectedWorkspace({
      cfg: params.cfg,
      scopeKey: entry.scopeKey,
    });
    const workspaceDirResolution = await docker.resolveDockerHostPathInfo(workspaceDir);
    const existingMounts =
      sandboxCfg.workspaceAccess !== "none" && workspaceDirResolution.remapSucceeded
        ? await docker.readDockerBindMounts(entry.containerName)
        : null;
    const workspaceMountUnsafe = docker.hasUnsafeWorkspaceMount({
      mounts: existingMounts,
      containerName: entry.containerName,
      expectedSource: workspaceDirResolution.path,
      destination: sandboxCfg.docker.workdir,
      workspaceAccess: sandboxCfg.workspaceAccess,
      expectedSourceTrusted: workspaceDirResolution.remapSucceeded,
    });
    if (!workspaceMountUnsafe) {
      continue;
    }
    await params.remove(entry.containerName);
    removedCount += 1;
  }

  return removedCount;
}

export async function repairSandboxWorkspaceMountsOnStartup(
  cfg: OpenClawConfig,
  log?: StartupRepairLog,
) {
  const [registry, browserRegistry, live] = await Promise.all([
    readRegistry(),
    readBrowserRegistry(),
    readLiveSandboxEntries(log).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log?.warn?.(
        `Live sandbox discovery failed during startup repair; continuing with registry data only. Error: ${message}`,
      );
      return { containers: [], browsers: [] };
    }),
  ]);
  const [removedContainers, removedBrowsers] = await Promise.all([
    repairRegistryEntries({
      cfg,
      entries: dedupeStartupRepairEntries([
        ...registry.entries.map((entry) => ({ ...entry, scopeKey: entry.sessionKey })),
        ...live.containers,
      ]),
      remove: removeSandboxContainer,
    }),
    repairRegistryEntries({
      cfg,
      entries: dedupeStartupRepairEntries([
        ...browserRegistry.entries.map((entry) => ({ ...entry, scopeKey: entry.sessionKey })),
        ...live.browsers,
      ]),
      remove: removeSandboxBrowserContainer,
    }),
  ]);

  const removedTotal = removedContainers + removedBrowsers;
  if (removedTotal > 0) {
    log?.warn?.(
      `Removed ${removedTotal} stale sandbox container(s) on startup so they can be recreated with the current workspace mount mapping.`,
    );
  }
}
