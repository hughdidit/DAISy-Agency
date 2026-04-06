import path from "node:path";
import { resolveAgentSkillsFilter } from "../../agents/agent-scope.js";
import {
  peekSkillSnapshotWorkspaceDir,
  resolveSkillSnapshotWorkspaceDir,
} from "../../agents/sandbox.js";
import {
  buildWorkspaceSkillSnapshot,
  isSkillSnapshotCompatibleWithWorkspace,
  type SkillSnapshot,
} from "../../agents/skills.js";
import { matchesSkillFilter } from "../../agents/skills/filter.js";
import { getSkillsSnapshotVersion } from "../../agents/skills/refresh.js";
import type { OpenClawConfig } from "../../config/config.js";
import { getRemoteSkillEligibility } from "../../infra/skills-remote.js";

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
  const skillSnapshotWorkspaceRemapped =
    expectedSkillSnapshotWorkspaceDir !== undefined &&
    path.resolve(expectedSkillSnapshotWorkspaceDir) !== path.resolve(params.workspaceDir);
  const shouldRefresh =
    !existingSnapshot ||
    existingSnapshot.version !== snapshotVersion ||
    !matchesSkillFilter(existingSnapshot.skillFilter, skillFilter) ||
    (skillSnapshotWorkspaceRemapped &&
      !isSkillSnapshotCompatibleWithWorkspace({
        snapshot: existingSnapshot,
        workspaceDir: expectedSkillSnapshotWorkspaceDir ?? params.workspaceDir,
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
    });
  }

  return buildWorkspaceSkillSnapshot(skillSnapshotWorkspaceDir, {
    config: params.config,
    skillFilter,
    eligibility: { remote: getRemoteSkillEligibility() },
    snapshotVersion,
  });
}
