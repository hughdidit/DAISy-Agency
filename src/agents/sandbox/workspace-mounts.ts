import { SANDBOX_AGENT_WORKSPACE_MOUNT } from "./constants.js";
import type { SandboxWorkspaceAccess } from "./types.js";

function mainWorkspaceMountSuffix(access: SandboxWorkspaceAccess): "" | ":ro" {
  return access === "rw" ? "" : ":ro";
}

function agentWorkspaceMountSuffix(access: SandboxWorkspaceAccess): "" | ":ro" {
  return access === "ro" ? ":ro" : "";
}

export function appendWorkspaceMountArgs(params: {
  args: string[];
  workspaceDir: string;
  agentWorkspaceDir: string;
  hostWorkspaceDir?: string;
  hostAgentWorkspaceDir?: string;
  workdir: string;
  workspaceAccess: SandboxWorkspaceAccess;
}) {
  const {
    args,
    workspaceDir,
    agentWorkspaceDir,
    hostWorkspaceDir,
    hostAgentWorkspaceDir,
    workdir,
    workspaceAccess,
  } = params;
  const mainMountSource = hostWorkspaceDir ?? workspaceDir;
  const agentMountSource = hostAgentWorkspaceDir ?? agentWorkspaceDir;

  args.push("-v", `${mainMountSource}:${workdir}${mainWorkspaceMountSuffix(workspaceAccess)}`);
  if (workspaceAccess !== "none" && workspaceDir !== agentWorkspaceDir) {
    args.push(
      "-v",
      `${agentMountSource}:${SANDBOX_AGENT_WORKSPACE_MOUNT}${agentWorkspaceMountSuffix(workspaceAccess)}`,
    );
  }
}
