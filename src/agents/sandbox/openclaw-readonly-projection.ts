import fs from "node:fs/promises";
import path from "node:path";
import { resolveAgentSkillsFilter } from "../agent-scope.js";
import type { OpenClawConfig } from "../../config/config.js";
import { redactConfigObject } from "../../config/redact-snapshot.js";
import { resolveStorePath } from "../../config/sessions.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("sandbox/openclaw-readonly");

const OPENCLAW_READONLY_SKILL = "openclaw-readonly";
export const OPENCLAW_READONLY_PROJECTION_DIRNAME = ".openclaw-readonly";

function shouldProjectOpenClawReadonly(params: {
  config: OpenClawConfig;
  agentId: string;
}): boolean {
  const skillFilter = resolveAgentSkillsFilter(params.config, params.agentId);
  return skillFilter === undefined || skillFilter.includes(OPENCLAW_READONLY_SKILL);
}

function resolveProjectionPaths(sandboxWorkspaceDir: string, agentId: string) {
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

export async function syncOpenClawReadonlyProjection(params: {
  config: OpenClawConfig;
  agentId: string;
  workspaceDir: string;
  sandboxWorkspaceDir: string;
}): Promise<void> {
  const { projectionRoot, configPath, stateDir } = resolveProjectionPaths(
    params.sandboxWorkspaceDir,
    params.agentId,
  );
  const enabled =
    params.workspaceDir === params.sandboxWorkspaceDir &&
    shouldProjectOpenClawReadonly({ config: params.config, agentId: params.agentId });

  if (!enabled) {
    await fs.rm(projectionRoot, { recursive: true, force: true });
    return;
  }

  await fs.rm(projectionRoot, { recursive: true, force: true });
  await fs.mkdir(stateDir, { recursive: true });

  const projectedConfig = buildProjectedConfig(params.config);
  await fs.writeFile(configPath, `${JSON.stringify(projectedConfig, null, 2)}\n`, "utf8");

  const sourceStorePath = resolveStorePath(params.config.session?.store, {
    agentId: params.agentId,
  });
  const targetStorePath = path.join(
    stateDir,
    "agents",
    params.agentId,
    "sessions",
    "sessions.json",
  );
  await copyIfExists(sourceStorePath, targetStorePath);

  log.debug?.(
    `Projected readonly snapshot for ${params.agentId} into ${projectionRoot} for sandbox diagnostics.`,
  );
}
