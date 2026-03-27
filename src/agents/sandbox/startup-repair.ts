import type { OpenClawConfig } from "../../config/config.js";
import { resolveUserPath } from "../../utils.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agent-scope.js";
import { resolveSandboxConfigForAgent } from "./config.js";
import {
  hasUnsafeWorkspaceMount,
  readDockerBindMounts,
  resolveDockerHostPathInfo,
} from "./docker.js";
import { removeSandboxBrowserContainer, removeSandboxContainer } from "./manage.js";
import {
  readBrowserRegistry,
  readRegistry,
  type SandboxBrowserRegistryEntry,
  type SandboxRegistryEntry,
} from "./registry.js";
import {
  resolveSandboxAgentId,
  resolveSandboxWorkspaceDir,
} from "./shared.js";

type StartupRepairLog = {
  warn?: (message: string) => void;
};

type StartupRepairEntry = {
  containerName: string;
  scopeKey: string;
};

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

async function repairRegistryEntries<TEntry extends StartupRepairEntry>(params: {
  cfg: OpenClawConfig;
  entries: readonly TEntry[];
  remove: (containerName: string) => Promise<void>;
}) {
  let removedCount = 0;

  for (const entry of params.entries) {
    const { sandboxCfg, workspaceDir } = resolveExpectedWorkspace({
      cfg: params.cfg,
      scopeKey: entry.scopeKey,
    });
    const workspaceDirResolution = await resolveDockerHostPathInfo(workspaceDir);
    const existingMounts =
      sandboxCfg.workspaceAccess !== "none" && workspaceDirResolution.remapSucceeded
        ? await readDockerBindMounts(entry.containerName)
        : null;
    const workspaceMountUnsafe = hasUnsafeWorkspaceMount({
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
  const [registry, browserRegistry] = await Promise.all([readRegistry(), readBrowserRegistry()]);
  const [removedContainers, removedBrowsers] = await Promise.all([
    repairRegistryEntries<SandboxRegistryEntry>({
      cfg,
      entries: registry.entries.map((entry) => ({ ...entry, scopeKey: entry.sessionKey })),
      remove: removeSandboxContainer,
    }),
    repairRegistryEntries<SandboxBrowserRegistryEntry>({
      cfg,
      entries: browserRegistry.entries.map((entry) => ({ ...entry, scopeKey: entry.sessionKey })),
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
