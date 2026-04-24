import type {
  RequirementConfigCheck,
  RequirementRemoteSatisfied,
  Requirements,
} from "../../shared/requirements.js";
import type { SandboxRuntimeProfileId } from "../../shared/sandbox-runtime-profiles.js";
import type {
  ResolvedCapability,
  ResolvedCapabilityManifest,
  ResolvedCapabilityRuntimeContext,
  ResolvedCapabilityUnavailableReason,
  ResolvedSkillCapability,
  ResolvedToolCapability,
} from "../../shared/resolved-capability-manifest.js";
import type { SandboxToolPolicyResolved } from "../sandbox/types.js";
import type { ToolProfileId } from "../tool-catalog.js";

export type CapabilityRuntimeFacts = {
  profile?: SandboxRuntimeProfileId;
  missingBins?: string[];
  missingAnyBins?: string[];
  missingOs?: string[];
  reasonCodes?: ResolvedCapabilityUnavailableReason[];
  detail?: string;
};

export type CapabilityProjectionFacts = {
  missingPaths?: string[];
  reasonCodes?: ResolvedCapabilityUnavailableReason[];
  detail?: string;
};

export type CapabilityProviderFacts = {
  providerId?: string;
  providerKind?: string;
  transport?: string;
  reasonCodes?: ResolvedCapabilityUnavailableReason[];
  detail?: string;
};

export type CapabilityRemoteFacts = {
  satisfiedBins?: string[];
  satisfiedAnyBins?: string[];
  satisfiedOs?: string[];
  note?: string;
};

export type CapabilityAvailabilityFacts = {
  runtime?: CapabilityRuntimeFacts;
  projection?: CapabilityProjectionFacts;
  provider?: CapabilityProviderFacts;
  remote?: CapabilityRemoteFacts;
};

export type CollectedSkillInstallOption = {
  id: string;
  kind: "brew" | "node" | "go" | "uv" | "download";
  label: string;
  bins: string[];
};

export type CollectedSkillCapabilityInput = {
  matchKey: string;
  sortKey: string;
  name: string;
  description: string;
  source: string;
  bundled: boolean;
  filePath: string;
  baseDir: string;
  skillKey: string;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  always: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  eligible: boolean;
  requirements: Requirements;
  missing: Requirements;
  configChecks: RequirementConfigCheck[];
  remoteSatisfied: RequirementRemoteSatisfied | null;
  install: CollectedSkillInstallOption[];
  runtimeContext: ResolvedCapabilityRuntimeContext;
  availability?: CapabilityAvailabilityFacts;
};

export type ToolResolutionIntent = "sandbox-local" | "gateway-brokered" | "remote-node-assisted";

export type CollectedToolCapabilityInput = {
  matchKey: string;
  sortKey: string;
  id: string;
  label: string;
  description: string;
  source: "core" | "plugin";
  pluginId?: string;
  optional?: boolean;
  defaultProfiles: ToolProfileId[];
  groupId: string;
  groupLabel: string;
  groupSource: "core" | "plugin";
  groupPluginId?: string;
  runtimeContext: ResolvedCapabilityRuntimeContext;
  toolPolicy: SandboxToolPolicyResolved;
  intent: ToolResolutionIntent;
  availability?: CapabilityAvailabilityFacts;
};

export type CapabilityResolutionInput = {
  runtimeContext: ResolvedCapabilityRuntimeContext;
  skills: CollectedSkillCapabilityInput[];
  tools: CollectedToolCapabilityInput[];
};

export type ResolvedToolCatalogEntry = {
  id: string;
  label: string;
  description: string;
  source: "core" | "plugin";
  pluginId?: string;
  optional?: boolean;
  defaultProfiles: ToolProfileId[];
  capabilityClass: ResolvedToolCapability["capabilityClass"];
  capability: ResolvedToolCapability;
};

export type ResolvedToolCatalogGroup = {
  id: string;
  label: string;
  source: "core" | "plugin";
  pluginId?: string;
  tools: ResolvedToolCatalogEntry[];
};

export type CapabilityManifestIndex = {
  manifest: ResolvedCapabilityManifest;
  byMatchKey: Map<string, ResolvedCapability>;
  skillsByMatchKey: Map<string, ResolvedSkillCapability>;
  toolsByMatchKey: Map<string, ResolvedToolCapability>;
};

export function createCollectedSkillMatchKey(params: {
  name: string;
  source: string;
  filePath: string;
  skillKey: string;
}): string {
  return `skill:${params.source}:${params.filePath}:${params.skillKey}:${params.name}`;
}

export function createCollectedToolMatchKey(params: {
  id: string;
  source: "core" | "plugin";
  pluginId?: string;
}): string {
  return `tool:${params.source}:${params.pluginId ?? ""}:${params.id}`;
}

export function createResolvedCapabilityMatchKey(capability: ResolvedCapability): string {
  if (capability.kind === "skill") {
    return createCollectedSkillMatchKey({
      name: capability.id,
      source: capability.source,
      filePath: capability.filePath,
      skillKey: capability.skillKey,
    });
  }
  return createCollectedToolMatchKey({
    id: capability.id,
    source: capability.source,
    pluginId: capability.pluginId,
  });
}
