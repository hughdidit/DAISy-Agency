import fs from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";

type AgentArchiveManifestParams = {
  agentId: string;
  workspaceDir: string;
  agentDir: string;
  sessionsDir: string;
  removedBindings: number;
  removedAllow: number;
  removedCredentialBindings?: number;
  removedDiscordAccounts?: number;
  reason?: string;
};

async function statPath(targetPath: string): Promise<{ exists: boolean; type?: string }> {
  try {
    const stat = await fs.stat(targetPath);
    return {
      exists: true,
      type: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other",
    };
  } catch {
    return { exists: false };
  }
}

function timestampForPath(now = new Date()): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

export async function writeAgentArchiveManifest(
  params: AgentArchiveManifestParams,
): Promise<string> {
  const archiveDir = path.join(resolveStateDir(process.env), "archives", "agents");
  await fs.mkdir(archiveDir, { recursive: true, mode: 0o700 });
  const manifestPath = path.join(
    archiveDir,
    `${timestampForPath()}-${params.agentId}-retirement-manifest.json`,
  );
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    agentId: params.agentId,
    reason: params.reason ?? "agent-retirement",
    paths: {
      workspaceDir: {
        path: params.workspaceDir,
        ...(await statPath(params.workspaceDir)),
      },
      agentDir: {
        path: params.agentDir,
        ...(await statPath(params.agentDir)),
      },
      sessionsDir: {
        path: params.sessionsDir,
        ...(await statPath(params.sessionsDir)),
      },
    },
    removedConfig: {
      bindings: params.removedBindings,
      agentToAgentAllow: params.removedAllow,
      credentialBindings: params.removedCredentialBindings ?? 0,
      discordAccounts: params.removedDiscordAccounts ?? 0,
    },
  };
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf-8",
    mode: 0o600,
  });
  return manifestPath;
}
