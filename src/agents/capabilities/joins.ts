import type {
  ResolvedCapability,
  ResolvedCapabilityManifest,
  ResolvedSkillCapability,
  ResolvedToolCapability,
} from "../../shared/resolved-capability-manifest.js";
import type { SkillStatusEntry, SkillStatusReport } from "../skills-status.js";
import type {
  CapabilityManifestIndex,
  CollectedSkillCapabilityInput,
  CollectedToolCapabilityInput,
  ResolvedToolCatalogGroup,
} from "./types.js";
import {
  createCollectedSkillMatchKey,
  createCollectedToolMatchKey,
  createResolvedCapabilityMatchKey,
} from "./types.js";

function isEligibleSkillCapabilityClass(capabilityClass: ResolvedSkillCapability["capabilityClass"]) {
  return capabilityClass === "sandbox-local" || capabilityClass === "remote-node-assisted";
}

export function indexResolvedCapabilityManifest(
  manifest: ResolvedCapabilityManifest,
): CapabilityManifestIndex {
  const byMatchKey = new Map<string, ResolvedCapability>();
  const skillsByMatchKey = new Map<string, ResolvedSkillCapability>();
  const toolsByMatchKey = new Map<string, ResolvedToolCapability>();
  for (const capability of manifest.capabilities) {
    const key = createResolvedCapabilityMatchKey(capability);
    byMatchKey.set(key, capability);
    if (capability.kind === "skill") {
      skillsByMatchKey.set(key, capability);
    } else {
      toolsByMatchKey.set(key, capability);
    }
  }
  return {
    manifest,
    byMatchKey,
    skillsByMatchKey,
    toolsByMatchKey,
  };
}

function requireSkillCapability(
  index: CapabilityManifestIndex,
  skill: CollectedSkillCapabilityInput,
) {
  const key = createCollectedSkillMatchKey({
    name: skill.name,
    source: skill.source,
    filePath: skill.filePath,
    skillKey: skill.skillKey,
  });
  const capability = index.skillsByMatchKey.get(key);
  if (!capability) {
    throw new Error(`Missing resolved skill capability for "${skill.name}".`);
  }
  return capability;
}

function requireToolCapability(index: CapabilityManifestIndex, tool: CollectedToolCapabilityInput) {
  const key = createCollectedToolMatchKey({
    id: tool.id,
    source: tool.source,
    pluginId: tool.pluginId,
  });
  const capability = index.toolsByMatchKey.get(key);
  if (!capability) {
    throw new Error(`Missing resolved tool capability for "${tool.id}".`);
  }
  return capability;
}

export function buildSkillStatusReportFromManifest(params: {
  workspaceDir: string;
  managedSkillsDir: string;
  skills: CollectedSkillCapabilityInput[];
  manifest: ResolvedCapabilityManifest;
}): SkillStatusReport {
  const index = indexResolvedCapabilityManifest(params.manifest);
  const skills: SkillStatusEntry[] = params.skills.map((skill) => {
    const capability = requireSkillCapability(index, skill);
    return {
      name: skill.name,
      description: skill.description,
      source: skill.source,
      bundled: skill.bundled,
      filePath: skill.filePath,
      baseDir: skill.baseDir,
      skillKey: skill.skillKey,
      ...(skill.primaryEnv ? { primaryEnv: skill.primaryEnv } : {}),
      ...(skill.emoji ? { emoji: skill.emoji } : {}),
      ...(skill.homepage ? { homepage: skill.homepage } : {}),
      always: skill.always,
      disabled: skill.disabled,
      blockedByAllowlist: skill.blockedByAllowlist,
      eligible: isEligibleSkillCapabilityClass(capability.capabilityClass),
      capabilityClass: capability.capabilityClass,
      capability,
      requirements: skill.requirements,
      missing: skill.missing,
      configChecks: skill.configChecks,
      remoteSatisfied: skill.remoteSatisfied,
      install: skill.install,
    };
  });
  return {
    workspaceDir: params.workspaceDir,
    managedSkillsDir: params.managedSkillsDir,
    skills,
  };
}

export function buildResolvedToolCatalogGroupsFromManifest(params: {
  tools: CollectedToolCapabilityInput[];
  manifest: ResolvedCapabilityManifest;
}): ResolvedToolCatalogGroup[] {
  const index = indexResolvedCapabilityManifest(params.manifest);
  const groups = new Map<string, ResolvedToolCatalogGroup>();
  for (const tool of params.tools.toSorted((a, b) => a.sortKey.localeCompare(b.sortKey))) {
    const capability = requireToolCapability(index, tool);
    const group = groups.get(tool.groupId) ?? {
      id: tool.groupId,
      label: tool.groupLabel,
      source: tool.groupSource,
      ...(tool.groupPluginId ? { pluginId: tool.groupPluginId } : {}),
      tools: [],
    };
    group.tools.push({
      id: tool.id,
      label: tool.label,
      description: tool.description,
      source: tool.source,
      ...(tool.pluginId ? { pluginId: tool.pluginId } : {}),
      ...(tool.optional !== undefined ? { optional: tool.optional } : {}),
      defaultProfiles: tool.defaultProfiles,
      capabilityClass: capability.capabilityClass,
      capability,
    });
    groups.set(tool.groupId, group);
  }
  return [...groups.values()];
}
