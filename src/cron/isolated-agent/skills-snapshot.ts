import path from "node:path";
import { resolveAgentSkillsFilter } from "../../agents/agent-scope.js";
import {
  peekSkillSnapshotVisibleWorkspaceDir,
  peekSkillSnapshotWorkspaceDir,
  resolveSkillSnapshotWorkspaceDir,
} from "../../agents/sandbox.js";
import { buildWorkspaceSkillSnapshot, type SkillSnapshot } from "../../agents/skills.js";
import { matchesSkillFilter } from "../../agents/skills/filter.js";
import { getSkillsSnapshotVersion } from "../../agents/skills/refresh.js";
import type { OpenClawConfig } from "../../config/config.js";
import { getRemoteSkillEligibility } from "../../infra/skills-remote.js";

function isPathInsideWorkspaceRoot(filePath: string, workspaceRoot: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const relative = path.relative(workspaceRoot, resolvedPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function extractPromptSkillLocations(prompt?: string): string[] {
  if (!prompt) {
    return [];
  }
  return Array.from(prompt.matchAll(/<location>([^<]+)<\/location>/g))
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);
}

function isCronSkillSnapshotCompatibleWithWorkspace(params: {
  snapshot?: SkillSnapshot;
  workspaceDir: string;
  visibleWorkspaceDir?: string;
}): boolean {
  const snapshot = params.snapshot;
  if (!snapshot) {
    return false;
  }

  const workspaceRoots = (
    params.visibleWorkspaceDir?.trim() ? [params.visibleWorkspaceDir] : [params.workspaceDir]
  )
    .map((root) => root?.trim() ?? "")
    .filter(Boolean);
  const resolvedSkillPaths = (snapshot.resolvedSkills ?? [])
    .map((skill) => (typeof skill?.filePath === "string" ? skill.filePath.trim() : ""))
    .filter(Boolean);
  const promptSkillPaths = extractPromptSkillLocations(snapshot.prompt);
  const candidatePaths = [...resolvedSkillPaths, ...promptSkillPaths];

  if (candidatePaths.length === 0) {
    return true;
  }

  return candidatePaths.every((filePath) =>
    workspaceRoots.some((workspaceRoot) => isPathInsideWorkspaceRoot(filePath, workspaceRoot)),
  );
}

export async function resolveCronSkillsSnapshot(params: {
  workspaceDir: string;
  config: OpenClawConfig;
  agentId: string;
  sessionKey: string;
  existingSnapshot?: SkillSnapshot;
  isFastTestEnv: boolean;
}): Promise<SkillSnapshot> {
  if (params.isFastTestEnv) {
    // Fast unit-test mode skips filesystem scans and snapshot refresh writes.
    return params.existingSnapshot ?? { prompt: "", skills: [] };
  }

  const snapshotVersion = getSkillsSnapshotVersion(params.workspaceDir);
  const skillFilter = resolveAgentSkillsFilter(params.config, params.agentId);
  const existingSnapshot = params.existingSnapshot;
  const expectedSkillSnapshotWorkspaceDir = peekSkillSnapshotWorkspaceDir({
    config: params.config,
    sessionKey: params.sessionKey,
    workspaceDir: params.workspaceDir,
    agentId: params.agentId,
  });
  const expectedSkillSnapshotVisibleWorkspaceDir = peekSkillSnapshotVisibleWorkspaceDir({
    config: params.config,
    sessionKey: params.sessionKey,
    workspaceDir: params.workspaceDir,
    agentId: params.agentId,
  });
  const skillSnapshotWorkspaceRemapped =
    expectedSkillSnapshotWorkspaceDir !== undefined &&
    path.resolve(expectedSkillSnapshotWorkspaceDir) !== path.resolve(params.workspaceDir);
  const shouldRefresh =
    !existingSnapshot ||
    existingSnapshot.version !== snapshotVersion ||
    !matchesSkillFilter(existingSnapshot.skillFilter, skillFilter) ||
    (skillSnapshotWorkspaceRemapped &&
      !isCronSkillSnapshotCompatibleWithWorkspace({
        snapshot: existingSnapshot,
        workspaceDir: expectedSkillSnapshotWorkspaceDir ?? params.workspaceDir,
        visibleWorkspaceDir: expectedSkillSnapshotVisibleWorkspaceDir,
      }));
  if (!shouldRefresh) {
    return existingSnapshot;
  }

  const skillSnapshotWorkspaceDir = await resolveSkillSnapshotWorkspaceDir({
    config: params.config,
    sessionKey: params.sessionKey,
    workspaceDir: params.workspaceDir,
    agentId: params.agentId,
  });
  if (!skillSnapshotWorkspaceDir) {
    return buildWorkspaceSkillSnapshot(params.workspaceDir, {
      config: params.config,
      skillFilter,
      eligibility: { remote: getRemoteSkillEligibility() },
      snapshotVersion,
      entries: [],
      visibleWorkspaceDir: expectedSkillSnapshotVisibleWorkspaceDir,
    });
  }

  return buildWorkspaceSkillSnapshot(skillSnapshotWorkspaceDir, {
    config: params.config,
    skillFilter,
    eligibility: { remote: getRemoteSkillEligibility() },
    snapshotVersion,
    visibleWorkspaceDir: expectedSkillSnapshotVisibleWorkspaceDir,
  });
}
