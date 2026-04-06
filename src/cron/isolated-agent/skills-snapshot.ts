import path from "node:path";
import { resolveAgentSkillsFilter } from "../../agents/agent-scope.js";
import { resolveSkillSnapshotWorkspaceDir } from "../../agents/sandbox.js";
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

  const skillSnapshotWorkspaceDir =
    (await resolveSkillSnapshotWorkspaceDir({
      config: params.config,
      sessionKey: params.sessionKey,
      workspaceDir: params.workspaceDir,
      agentId: params.agentId,
    })) ?? params.workspaceDir;
  const skillSnapshotWorkspaceRemapped =
    path.resolve(skillSnapshotWorkspaceDir) !== path.resolve(params.workspaceDir);
  const snapshotVersion = getSkillsSnapshotVersion(params.workspaceDir);
  const skillFilter = resolveAgentSkillsFilter(params.config, params.agentId);
  const existingSnapshot = params.existingSnapshot;
  const shouldRefresh =
    !existingSnapshot ||
    existingSnapshot.version !== snapshotVersion ||
    !matchesSkillFilter(existingSnapshot.skillFilter, skillFilter) ||
    (skillSnapshotWorkspaceRemapped &&
      !isSkillSnapshotCompatibleWithWorkspace({
        snapshot: existingSnapshot,
        workspaceDir: skillSnapshotWorkspaceDir,
      }));
  if (!shouldRefresh) {
    return existingSnapshot;
  }

  return buildWorkspaceSkillSnapshot(skillSnapshotWorkspaceDir, {
    config: params.config,
    skillFilter,
    eligibility: { remote: getRemoteSkillEligibility() },
    snapshotVersion,
  });
}
