import fs from "node:fs";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import {
  normalizePluginsConfig,
  resolveEffectiveEnableState,
  resolveMemorySlotDecision,
} from "../../plugins/config-state.js";
import {
  loadPluginManifestRegistry,
  type PluginManifestRecord,
} from "../../plugins/manifest-registry.js";
import { resolveDefaultAgentId } from "../agent-scope.js";
import { resolveSandboxConfigForAgent } from "../sandbox/config.js";
import { resolveSandboxToolPolicyForAgent } from "../sandbox/tool-policy.js";
import { type SkillEligibilityContext, type SkillEntry } from "../skills.js";
import {
  listCoreToolSections,
  resolveCoreToolCapabilityBoundary,
  resolveCoreToolProfiles,
} from "../tool-catalog.js";
import {
  buildMissingProjectionAvailability,
  collectWorkspaceSkillCapabilityInputs,
  createGatewayProviderAvailability,
  mergeAvailabilityFacts,
} from "./collect-shared.js";
import type {
  CapabilityAvailabilityFacts,
  CapabilityResolutionInput,
  CollectedToolCapabilityInput,
  ToolResolutionIntent,
} from "./types.js";
import { createCollectedSkillMatchKey, createCollectedToolMatchKey } from "./types.js";

export type ReadonlyCapabilityCollectorParams = {
  config?: OpenClawConfig;
  agentId?: string;
  workspaceDir?: string;
  managedSkillsDir?: string;
  entries?: SkillEntry[];
  eligibility?: SkillEligibilityContext;
  pluginTools?: Array<{
    name: string;
    label?: string;
    description?: string;
    pluginId: string;
    optional?: boolean;
  }>;
  projection?: {
    configPath?: string;
    stateDir?: string;
    workspaceDir?: string;
    pathExists?: (targetPath: string) => boolean;
  };
  skillAvailability?: Record<string, CapabilityAvailabilityFacts | undefined>;
  toolOverrides?: Record<
    string,
    | {
        intent?: ToolResolutionIntent;
        availability?: CapabilityAvailabilityFacts;
      }
    | undefined
  >;
  pluginManifestRecords?: PluginManifestRecord[];
};

function collectMissingProjectionPaths(
  projection?: ReadonlyCapabilityCollectorParams["projection"],
): string[] {
  const pathExists = projection?.pathExists ?? ((targetPath: string) => fs.existsSync(targetPath));
  const missing: string[] = [];
  for (const targetPath of [
    projection?.configPath,
    projection?.stateDir,
    projection?.workspaceDir,
  ]) {
    if (targetPath && !pathExists(targetPath)) {
      missing.push(targetPath);
    }
  }
  return missing;
}

function buildReadonlyRuntimeContext(params: {
  config?: OpenClawConfig;
  agentId: string;
}): CapabilityResolutionInput["runtimeContext"] {
  const sandboxCfg = resolveSandboxConfigForAgent(params.config, params.agentId);
  return {
    agentId: params.agentId,
    sandboxMode: sandboxCfg.mode,
    sandboxScope: sandboxCfg.scope,
    sandboxed: true,
  };
}

function isLexicallyInsideRoot(rootDir: string, candidatePath: string): boolean {
  const relative = path.relative(rootDir, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function buildSyntheticReadonlyPluginSkillName(params: {
  pluginId: string;
  candidatePath: string;
}): string {
  const baseName = path.basename(params.candidatePath).trim();
  if (!baseName || baseName === "." || baseName === "..") {
    return `${params.pluginId}:skill`;
  }
  if (baseName.toLowerCase() === "skills") {
    return `${params.pluginId}:skills`;
  }
  return baseName;
}

function buildSyntheticReadonlyPluginSkillInput(params: {
  record: PluginManifestRecord;
  candidatePath: string;
  rawSkillPath: string;
  runtimeContext: CapabilityResolutionInput["runtimeContext"];
}): CapabilityResolutionInput["skills"][number] {
  const baseDir =
    path.basename(params.candidatePath).toLowerCase() === "skill.md"
      ? path.dirname(params.candidatePath)
      : params.candidatePath;
  const filePath =
    path.basename(params.candidatePath).toLowerCase() === "skill.md"
      ? params.candidatePath
      : path.join(params.candidatePath, "SKILL.md");
  const name = buildSyntheticReadonlyPluginSkillName({
    pluginId: params.record.id,
    candidatePath: baseDir,
  });
  const description = `Readonly projection is missing plugin skill path "${params.rawSkillPath}" from plugin "${params.record.id}".`;
  const source = `openclaw-plugin:${params.record.id}`;
  return {
    matchKey: createCollectedSkillMatchKey({
      name,
      source,
      filePath,
      skillKey: name,
    }),
    sortKey: `skill:${name.toLowerCase()}:${filePath.toLowerCase()}`,
    name,
    description,
    source,
    bundled: false,
    filePath,
    baseDir,
    skillKey: name,
    always: false,
    disabled: false,
    blockedByAllowlist: false,
    eligible: false,
    requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
    missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
    configChecks: [],
    remoteSatisfied: null,
    install: [],
    runtimeContext: params.runtimeContext,
    availability: buildMissingProjectionAvailability(
      [baseDir],
      `Readonly projection missing plugin skill path declared by ${params.record.id}`,
    ),
  };
}

function collectMissingReadonlyPluginSkillInputs(params: {
  config?: OpenClawConfig;
  workspaceDir: string;
  runtimeContext: CapabilityResolutionInput["runtimeContext"];
  pathExists: (targetPath: string) => boolean;
  pluginManifestRecords?: PluginManifestRecord[];
}): CapabilityResolutionInput["skills"] {
  const registry =
    params.pluginManifestRecords ??
    loadPluginManifestRegistry({
      workspaceDir: params.workspaceDir,
      config: params.config,
    }).plugins;
  if (registry.length === 0) {
    return [];
  }

  const normalizedPlugins = normalizePluginsConfig(params.config?.plugins);
  const acpEnabled = params.config?.acp?.enabled !== false;
  const memorySlot = normalizedPlugins.slots.memory;
  let selectedMemoryPluginId: string | null = null;
  const synthetic: CapabilityResolutionInput["skills"] = [];
  const seen = new Set<string>();

  for (const record of registry) {
    if (!record.skills || record.skills.length === 0) {
      continue;
    }
    const enableState = resolveEffectiveEnableState({
      id: record.id,
      origin: record.origin,
      config: normalizedPlugins,
      rootConfig: params.config,
    });
    if (!enableState.enabled) {
      continue;
    }
    if (!acpEnabled && record.id === "acpx") {
      continue;
    }
    const memoryDecision = resolveMemorySlotDecision({
      id: record.id,
      kind: record.kind,
      slot: memorySlot,
      selectedId: selectedMemoryPluginId,
    });
    if (!memoryDecision.enabled) {
      continue;
    }
    if (memoryDecision.selected && record.kind === "memory") {
      selectedMemoryPluginId = record.id;
    }

    for (const rawSkillPath of record.skills) {
      const trimmedSkillPath = rawSkillPath.trim();
      if (!trimmedSkillPath) {
        continue;
      }
      const candidatePath = path.resolve(record.rootDir, trimmedSkillPath);
      if (!isLexicallyInsideRoot(record.rootDir, candidatePath)) {
        continue;
      }
      if (params.pathExists(candidatePath)) {
        continue;
      }
      const key = `${record.id}:${candidatePath}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      synthetic.push(
        buildSyntheticReadonlyPluginSkillInput({
          record,
          candidatePath,
          rawSkillPath: trimmedSkillPath,
          runtimeContext: params.runtimeContext,
        }),
      );
    }
  }

  return synthetic.toSorted((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function collectReadonlyCoreTools(params: {
  runtimeContext: CapabilityResolutionInput["runtimeContext"];
  toolPolicy: CollectedToolCapabilityInput["toolPolicy"];
  missingWorkspacePaths: string[];
  toolOverrides?: ReadonlyCapabilityCollectorParams["toolOverrides"];
}) {
  const missingProjectionAvailability = buildMissingProjectionAvailability(
    params.missingWorkspacePaths,
    "Readonly projection missing workspace paths",
  );
  return listCoreToolSections().flatMap((section, sectionIndex) =>
    section.tools.map((tool, toolIndex) => {
      const baseIntent = resolveCoreToolCapabilityBoundary(tool.id);
      const override = params.toolOverrides?.[tool.id];
      const intent = override?.intent ?? baseIntent;
      return {
        matchKey: createCollectedToolMatchKey({ id: tool.id, source: "core" }),
        sortKey: `tool:core:${sectionIndex.toString().padStart(2, "0")}:${toolIndex
          .toString()
          .padStart(3, "0")}:${tool.id}`,
        id: tool.id,
        label: tool.label,
        description: tool.description,
        source: "core",
        defaultProfiles: resolveCoreToolProfiles(tool.id),
        groupId: section.id,
        groupLabel: section.label,
        groupSource: "core",
        runtimeContext: params.runtimeContext,
        toolPolicy: params.toolPolicy,
        intent,
        availability: mergeAvailabilityFacts(
          intent === "gateway-brokered"
            ? createGatewayProviderAvailability({
                providerId: "gateway",
                providerKind: "gateway",
                transport: "rpc",
              })
            : missingProjectionAvailability,
          override?.availability,
        ),
      } satisfies CollectedToolCapabilityInput;
    }),
  );
}

function collectReadonlyPluginTools(params: {
  runtimeContext: CapabilityResolutionInput["runtimeContext"];
  toolPolicy: CollectedToolCapabilityInput["toolPolicy"];
  pluginTools?: ReadonlyCapabilityCollectorParams["pluginTools"];
  toolOverrides?: ReadonlyCapabilityCollectorParams["toolOverrides"];
}) {
  return (params.pluginTools ?? [])
    .map((tool) => {
      const override = params.toolOverrides?.[tool.name];
      const intent = override?.intent ?? "gateway-brokered";
      return {
        matchKey: createCollectedToolMatchKey({
          id: tool.name,
          source: "plugin",
          pluginId: tool.pluginId,
        }),
        sortKey: `tool:plugin:${tool.pluginId.toLowerCase()}:${tool.name.toLowerCase()}`,
        id: tool.name,
        label: tool.label?.trim() ? tool.label.trim() : tool.name,
        description: tool.description?.trim() ? tool.description.trim() : "Plugin tool",
        source: "plugin",
        pluginId: tool.pluginId,
        optional: tool.optional,
        defaultProfiles: [],
        groupId: `plugin:${tool.pluginId}`,
        groupLabel: tool.pluginId,
        groupSource: "plugin",
        groupPluginId: tool.pluginId,
        runtimeContext: params.runtimeContext,
        toolPolicy: params.toolPolicy,
        intent,
        availability: mergeAvailabilityFacts(
          intent === "gateway-brokered"
            ? createGatewayProviderAvailability({
                providerId: tool.pluginId,
                providerKind: "plugin",
                transport: "gateway-plugin",
              })
            : undefined,
          override?.availability,
        ),
      } satisfies CollectedToolCapabilityInput;
    })
    .toSorted((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export function collectReadonlyCapabilityInputs(
  params: ReadonlyCapabilityCollectorParams = {},
): CapabilityResolutionInput & { managedSkillsDir: string } {
  const config = params.config ?? {};
  const agentId = params.agentId?.trim() || resolveDefaultAgentId(config);
  const workspaceDir = params.workspaceDir ?? "/workspace";
  const pathExists =
    params.projection?.pathExists ?? ((targetPath: string) => fs.existsSync(targetPath));
  const runtimeContext = buildReadonlyRuntimeContext({
    config,
    agentId,
  });
  const toolPolicy = resolveSandboxToolPolicyForAgent(config, agentId);
  const missingProjectionPaths = collectMissingProjectionPaths(params.projection);
  const skillAvailability = params.skillAvailability ? { ...params.skillAvailability } : {};
  const missingProjectionAvailability = buildMissingProjectionAvailability(
    missingProjectionPaths,
    "Readonly projection missing required paths",
  );
  const hasExplicitEntries = Array.isArray(params.entries);
  const canLoadWorkspace = pathExists(workspaceDir);
  const canCollectSkills = hasExplicitEntries || canLoadWorkspace;
  const skillCollectionRaw = canCollectSkills
    ? collectWorkspaceSkillCapabilityInputs({
        workspaceDir,
        runtimeContext,
        config,
        managedSkillsDir: params.managedSkillsDir,
        entries: params.entries,
        eligibility: params.eligibility,
        overrides: skillAvailability,
      })
    : { managedSkillsDir: params.managedSkillsDir ?? "", skills: [] };
  const syntheticPluginSkills = canLoadWorkspace
    ? collectMissingReadonlyPluginSkillInputs({
        config,
        workspaceDir,
        runtimeContext,
        pathExists,
        pluginManifestRecords: params.pluginManifestRecords,
      })
    : [];
  const combinedSkills = [...skillCollectionRaw.skills, ...syntheticPluginSkills].toSorted((a, b) =>
    a.sortKey.localeCompare(b.sortKey),
  );
  const skillCollection = missingProjectionAvailability
    ? {
        managedSkillsDir: skillCollectionRaw.managedSkillsDir,
        skills: combinedSkills.map((skill) => ({
          ...skill,
          availability: mergeAvailabilityFacts(missingProjectionAvailability, skill.availability),
        })),
      }
    : {
        managedSkillsDir: skillCollectionRaw.managedSkillsDir,
        skills: combinedSkills,
      };

  return {
    runtimeContext,
    managedSkillsDir: skillCollection.managedSkillsDir,
    skills: skillCollection.skills,
    tools: [
      ...collectReadonlyCoreTools({
        runtimeContext,
        toolPolicy,
        missingWorkspacePaths: params.projection?.workspaceDir ? missingProjectionPaths : [],
        toolOverrides: params.toolOverrides,
      }),
      ...collectReadonlyPluginTools({
        runtimeContext,
        toolPolicy,
        pluginTools: params.pluginTools,
        toolOverrides: params.toolOverrides,
      }),
    ].toSorted((a, b) => a.sortKey.localeCompare(b.sortKey)),
  };
}
