import fs from "node:fs";
import type { OpenClawConfig } from "../../config/config.js";
import { resolveDefaultAgentId } from "../agent-scope.js";
import { resolveSandboxConfigForAgent } from "../sandbox/config.js";
import { resolveSandboxToolPolicyForAgent } from "../sandbox/tool-policy.js";
import { type SkillEligibilityContext, type SkillEntry } from "../skills.js";
import {
  listCoreToolSections,
  resolveCoreToolCapabilityBoundary,
  resolveCoreToolProfiles,
  type ToolProfileId,
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
import { createCollectedToolMatchKey } from "./types.js";

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
        defaultProfiles: resolveCoreToolProfiles(tool.id) as ToolProfileId[],
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
  const agentId = params.agentId?.trim() || resolveDefaultAgentId(params.config);
  const workspaceDir = params.workspaceDir ?? "/workspace";
  const pathExists =
    params.projection?.pathExists ?? ((targetPath: string) => fs.existsSync(targetPath));
  const runtimeContext = buildReadonlyRuntimeContext({
    config: params.config,
    agentId,
  });
  const toolPolicy = resolveSandboxToolPolicyForAgent(params.config, agentId);
  const missingProjectionPaths = collectMissingProjectionPaths(params.projection);
  const skillAvailability = { ...(params.skillAvailability ?? {}) };
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
        config: params.config,
        managedSkillsDir: params.managedSkillsDir,
        entries: params.entries,
        eligibility: params.eligibility,
        overrides: skillAvailability,
      })
    : { managedSkillsDir: params.managedSkillsDir ?? "", skills: [] };
  const skillCollection = missingProjectionAvailability
    ? {
        managedSkillsDir: skillCollectionRaw.managedSkillsDir,
        skills: skillCollectionRaw.skills.map((skill) => ({
          ...skill,
          availability: mergeAvailabilityFacts(missingProjectionAvailability, skill.availability),
        })),
      }
    : skillCollectionRaw;

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
