import type { OpenClawConfig } from "../../config/config.js";
import { getRemoteSkillEligibility } from "../../infra/skills-remote.js";
import { getPluginToolMeta, resolvePluginTools } from "../../plugins/tools.js";
import { DEFAULT_SANDBOX_RUNTIME_PROFILE_ID } from "../../shared/sandbox-runtime-profiles.js";
import {
  resolveAgentDir,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
} from "../agent-scope.js";
import { resolveSandboxConfigForAgent } from "../sandbox/config.js";
import { resolveSandboxRuntimeStatus } from "../sandbox/runtime-status.js";
import { type SkillEligibilityContext, type SkillEntry } from "../skills.js";
import {
  listCoreToolSections,
  resolveCoreToolCapabilityBoundary,
  resolveCoreToolProfiles,
} from "../tool-catalog.js";
import {
  collectWorkspaceSkillCapabilityInputs,
  createGatewayProviderAvailability,
  mergeAvailabilityFacts,
  resolveManagedSkillsDir,
} from "./collect-shared.js";
import type {
  CapabilityAvailabilityFacts,
  CapabilityResolutionInput,
  CollectedToolCapabilityInput,
  ToolResolutionIntent,
} from "./types.js";
import { createCollectedToolMatchKey } from "./types.js";

export type GatewayCapabilityCollectorToolOverride = {
  intent?: ToolResolutionIntent;
  availability?: CapabilityAvailabilityFacts;
};

export type GatewayCapabilityCollectorParams = {
  config?: OpenClawConfig;
  agentId?: string;
  sessionKey?: string;
  workspaceDir?: string;
  agentDir?: string;
  includePlugins?: boolean;
  includeSkills?: boolean;
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
  skillAvailability?: Record<string, CapabilityAvailabilityFacts | undefined>;
  toolOverrides?: Record<string, GatewayCapabilityCollectorToolOverride | undefined>;
};

function buildRuntimeContext(params: {
  config?: OpenClawConfig;
  runtime: ReturnType<typeof resolveSandboxRuntimeStatus>;
}): CapabilityResolutionInput["runtimeContext"] {
  const sandboxCfg = resolveSandboxConfigForAgent(params.config, params.runtime.agentId);
  return {
    agentId: params.runtime.agentId,
    ...(params.runtime.sessionKey ? { sessionKey: params.runtime.sessionKey } : {}),
    sandboxMode: params.runtime.mode,
    sandboxScope: sandboxCfg.scope,
    runtimeProfile: sandboxCfg.profile ?? DEFAULT_SANDBOX_RUNTIME_PROFILE_ID,
    sandboxed: params.runtime.sandboxed,
  };
}

function collectCoreToolInputs(params: {
  runtimeContext: CapabilityResolutionInput["runtimeContext"];
  toolPolicy: CollectedToolCapabilityInput["toolPolicy"];
  toolOverrides?: GatewayCapabilityCollectorParams["toolOverrides"];
}): CollectedToolCapabilityInput[] {
  const sections = listCoreToolSections();
  return sections.flatMap((section, sectionIndex) =>
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
            : undefined,
          override?.availability,
        ),
      };
    }),
  );
}

function collectPluginToolInputs(params: {
  config?: OpenClawConfig;
  agentId: string;
  workspaceDir: string;
  agentDir: string;
  runtimeContext: CapabilityResolutionInput["runtimeContext"];
  toolPolicy: CollectedToolCapabilityInput["toolPolicy"];
  toolOverrides?: GatewayCapabilityCollectorParams["toolOverrides"];
  pluginTools?: GatewayCapabilityCollectorParams["pluginTools"];
  existingToolNames: Set<string>;
}): CollectedToolCapabilityInput[] {
  const pluginTools =
    params.pluginTools ??
    resolvePluginTools({
      context: {
        config: params.config,
        workspaceDir: params.workspaceDir,
        agentDir: params.agentDir,
        agentId: params.agentId,
      },
      existingToolNames: params.existingToolNames,
      toolAllowlist: ["group:plugins"],
      suppressNameConflicts: true,
    }).map((tool) => {
      const meta = getPluginToolMeta(tool);
      return {
        name: tool.name,
        label: tool.label,
        description: tool.description,
        pluginId: meta?.pluginId ?? "plugin",
        optional: meta?.optional,
      };
    });

  return pluginTools
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

export function collectGatewayCapabilityInputs(
  params: GatewayCapabilityCollectorParams = {},
): CapabilityResolutionInput & { managedSkillsDir: string } {
  const config = params.config ?? {};
  const agentId = params.agentId?.trim() || resolveDefaultAgentId(config);
  const workspaceDir = params.workspaceDir ?? resolveAgentWorkspaceDir(config, agentId);
  const agentDir = params.agentDir ?? resolveAgentDir(config, agentId);
  const runtime = resolveSandboxRuntimeStatus({
    cfg: config,
    agentId,
    sessionKey: params.sessionKey,
  });
  const runtimeContext = buildRuntimeContext({
    config,
    runtime,
  });
  const skillCollection =
    params.includeSkills === false
      ? { managedSkillsDir: resolveManagedSkillsDir(params.managedSkillsDir), skills: [] }
      : collectWorkspaceSkillCapabilityInputs({
          workspaceDir,
          runtimeContext,
          config,
          managedSkillsDir: params.managedSkillsDir,
          entries: params.entries,
          eligibility: params.eligibility ?? { remote: getRemoteSkillEligibility() },
          overrides: params.skillAvailability,
        });
  const coreTools = collectCoreToolInputs({
    runtimeContext,
    toolPolicy: runtime.toolPolicy,
    toolOverrides: params.toolOverrides,
  });
  const pluginTools =
    params.includePlugins === false
      ? []
      : collectPluginToolInputs({
          config,
          agentId,
          workspaceDir,
          agentDir,
          runtimeContext,
          toolPolicy: runtime.toolPolicy,
          toolOverrides: params.toolOverrides,
          pluginTools: params.pluginTools,
          existingToolNames: new Set(coreTools.map((tool) => tool.id)),
        });

  return {
    runtimeContext,
    managedSkillsDir: skillCollection.managedSkillsDir,
    skills: skillCollection.skills,
    tools: [...coreTools, ...pluginTools].toSorted((a, b) => a.sortKey.localeCompare(b.sortKey)),
  };
}
