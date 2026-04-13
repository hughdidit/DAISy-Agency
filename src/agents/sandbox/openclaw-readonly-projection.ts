import fs from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import { redactConfigObject } from "../../config/redact-snapshot.js";
import { resolveStorePath } from "../../config/sessions.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { resolveAgentSkillsFilter } from "../agent-scope.js";

const log = createSubsystemLogger("sandbox/openclaw-readonly");

const OPENCLAW_READONLY_SKILL = "openclaw-readonly";
export const OPENCLAW_READONLY_PROJECTION_DIRNAME = ".openclaw-readonly";

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
  const projectionRoot = path.join(
    sandboxWorkspaceDir,
    OPENCLAW_READONLY_PROJECTION_DIRNAME,
    "agents",
    agentId,
  );
  return {
    projectionRoot,
    configPath: path.join(projectionRoot, "openclaw.json"),
    stateDir: path.join(projectionRoot, "state"),
  };
}

function resolveContainerProjectionPaths(containerWorkdir: string, agentId: string) {
  const projectionRoot = path.posix.join(
    containerWorkdir,
    OPENCLAW_READONLY_PROJECTION_DIRNAME,
    "agents",
    agentId,
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

function buildProjectedConfig(config: OpenClawConfig): OpenClawConfig {
  const projected = redactConfigObject(structuredClone(config));
  if (projected.session && typeof projected.session === "object") {
    projected.session = { ...projected.session };
    delete projected.session.store;
  }
  return projected;
}

export function resolveOpenClawReadonlyProjection(params: {
  config: OpenClawConfig;
  agentId: string;
  workspaceDir: string;
  sandboxWorkspaceDir: string;
  containerWorkdir: string;
}): OpenClawReadonlyProjection {
  const hostPaths = resolveHostProjectionPaths(params.sandboxWorkspaceDir, params.agentId);
  const containerPaths = resolveContainerProjectionPaths(params.containerWorkdir, params.agentId);
  return {
    enabled: shouldProjectOpenClawReadonly({ config: params.config, agentId: params.agentId }),
    needsSyntheticBind: params.workspaceDir !== params.sandboxWorkspaceDir,
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
}): Promise<void> {
  await fs.rm(params.projection.hostProjectionRoot, { recursive: true, force: true });
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

  log.debug?.(
    `Projected readonly snapshot for ${params.agentId} into ${params.projection.hostProjectionRoot} for sandbox diagnostics.`,
  );
}
