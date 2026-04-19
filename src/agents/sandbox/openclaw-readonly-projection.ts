import fs from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import { redactConfigObject } from "../../config/redact-snapshot.js";
import { resolveStorePath } from "../../config/sessions.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { loadPluginManifestRegistry } from "../../plugins/manifest-registry.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { resolveAgentSkillsFilter } from "../agent-scope.js";

const log = createSubsystemLogger("sandbox/openclaw-readonly");

const OPENCLAW_READONLY_SKILL = "openclaw-readonly";
export const OPENCLAW_READONLY_PROJECTION_DIRNAME = ".openclaw-readonly";
export const OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT = "/tmp/.openclaw-readonly";

export type OpenClawReadonlyProjection = {
  enabled: boolean;
  needsSyntheticBind: boolean;
  hostProjectionRoot: string;
  hostConfigPath: string;
  hostStateDir: string;
  containerProjectionRoot: string;
  containerConfigPath: string;
  containerStateDir: string;
};

function shouldProjectOpenClawReadonly(params: {
  config: OpenClawConfig;
  agentId: string;
}): boolean {
  const skillFilter = resolveAgentSkillsFilter(params.config, params.agentId);
  return skillFilter === undefined || skillFilter.includes(OPENCLAW_READONLY_SKILL);
}

function resolveHostProjectionPaths(sandboxWorkspaceDir: string, agentId: string) {
  const safeAgentId = normalizeAgentId(agentId);
  const projectionRoot = path.join(
    sandboxWorkspaceDir,
    OPENCLAW_READONLY_PROJECTION_DIRNAME,
    "agents",
    safeAgentId,
  );
  return {
    projectionRoot,
    configPath: path.join(projectionRoot, "openclaw.json"),
    stateDir: path.join(projectionRoot, "state"),
  };
}

function resolveContainerProjectionPaths(containerWorkdir: string, agentId: string) {
  const safeAgentId = normalizeAgentId(agentId);
  const projectionRoot = path.posix.join(
    containerWorkdir,
    OPENCLAW_READONLY_PROJECTION_DIRNAME,
    "agents",
    safeAgentId,
  );
  return {
    projectionRoot,
    configPath: path.posix.join(projectionRoot, "openclaw.json"),
    stateDir: path.posix.join(projectionRoot, "state"),
  };
}

function resolveSyntheticContainerProjectionPaths(agentId: string) {
  const safeAgentId = normalizeAgentId(agentId);
  const projectionRoot = path.posix.join(
    OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT,
    "agents",
    safeAgentId,
  );
  return {
    projectionRoot,
    configPath: path.posix.join(projectionRoot, "openclaw.json"),
    stateDir: path.posix.join(projectionRoot, "state"),
  };
}

async function copyIfExists(sourcePath: string, targetPath: string): Promise<void> {
  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    const code =
      error instanceof Error && "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;
    if (code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function copyDirectoryIfExists(sourcePath: string, targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(sourcePath);
    if (!stat.isDirectory()) {
      return false;
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.cp(sourcePath, targetPath, { recursive: true });
    return true;
  } catch (error) {
    const code =
      error instanceof Error && "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;
    if (code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function buildProjectedConfig(config: OpenClawConfig): OpenClawConfig {
  const projected = redactConfigObject(structuredClone(config));
  if (projected.session && typeof projected.session === "object") {
    projected.session = { ...projected.session };
    delete projected.session.store;
  }
  return projected;
}

async function clearDirectoryContents(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
  const entries = await fs.readdir(dirPath);
  await Promise.all(
    entries.map(async (entry) => {
      await fs.rm(path.join(dirPath, entry), { recursive: true, force: true });
    }),
  );
}

async function syncProjectedPluginRoots(params: {
  config: OpenClawConfig;
  workspaceDir?: string;
  projection: OpenClawReadonlyProjection;
}): Promise<void> {
  const manifestRegistry = loadPluginManifestRegistry({
    config: params.config,
    workspaceDir: params.workspaceDir,
  });
  if (manifestRegistry.plugins.length === 0) {
    return;
  }

  const extensionsRoot = path.join(params.projection.hostStateDir, "extensions");
  let copied = 0;
  for (const [index, record] of manifestRegistry.plugins.entries()) {
    const targetRoot = path.join(extensionsRoot, `plugin-${String(index).padStart(3, "0")}`);
    try {
      if (await copyDirectoryIfExists(record.rootDir, targetRoot)) {
        copied += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn(
        `Failed to project readonly plugin root for ${record.id} from ${record.rootDir}: ${message}`,
      );
    }
  }

  if (copied > 0) {
    log.debug?.(
      `Projected ${copied} plugin root${copied === 1 ? "" : "s"} into ${extensionsRoot} for readonly sandbox validation.`,
    );
  }
}

export function resolveOpenClawReadonlyProjection(params: {
  config: OpenClawConfig;
  agentId: string;
  workspaceDir: string;
  sandboxWorkspaceDir: string;
  containerWorkdir: string;
}): OpenClawReadonlyProjection {
  const hostPaths = resolveHostProjectionPaths(params.sandboxWorkspaceDir, params.agentId);
  const needsSyntheticBind = params.workspaceDir !== params.sandboxWorkspaceDir;
  const containerPaths = needsSyntheticBind
    ? resolveSyntheticContainerProjectionPaths(params.agentId)
    : resolveContainerProjectionPaths(params.containerWorkdir, params.agentId);
  return {
    enabled: shouldProjectOpenClawReadonly({ config: params.config, agentId: params.agentId }),
    needsSyntheticBind,
    hostProjectionRoot: hostPaths.projectionRoot,
    hostConfigPath: hostPaths.configPath,
    hostStateDir: hostPaths.stateDir,
    containerProjectionRoot: containerPaths.projectionRoot,
    containerConfigPath: containerPaths.configPath,
    containerStateDir: containerPaths.stateDir,
  };
}

export async function syncOpenClawReadonlyProjection(params: {
  config: OpenClawConfig;
  agentId: string;
  projection: OpenClawReadonlyProjection;
  workspaceDir?: string;
}): Promise<void> {
  await clearDirectoryContents(params.projection.hostProjectionRoot);
  if (!params.projection.enabled) {
    return;
  }

  await fs.mkdir(params.projection.hostStateDir, { recursive: true });

  const projectedConfig = buildProjectedConfig(params.config);
  await fs.writeFile(
    params.projection.hostConfigPath,
    `${JSON.stringify(projectedConfig, null, 2)}\n`,
    "utf8",
  );

  const sourceStorePath = resolveStorePath(params.config.session?.store, {
    agentId: params.agentId,
  });
  const targetStorePath = path.join(
    params.projection.hostStateDir,
    "agents",
    params.agentId,
    "sessions",
    "sessions.json",
  );
  await copyIfExists(sourceStorePath, targetStorePath);
  await syncProjectedPluginRoots({
    config: params.config,
    workspaceDir: params.workspaceDir,
    projection: params.projection,
  });

  log.debug?.(
    `Projected readonly snapshot for ${params.agentId} into ${params.projection.hostProjectionRoot} for sandbox diagnostics.`,
  );
}
