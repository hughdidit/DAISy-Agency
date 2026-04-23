import {
  collectGatewayCapabilityInputs,
  collectReadonlyCapabilityInputs,
  buildResolvedToolCatalogGroupsFromManifest,
  buildSkillStatusReportFromManifest,
  resolveCapabilityManifest,
  type ResolvedToolCatalogGroup,
} from "../agents/capabilities/index.js";
import {
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
} from "../agents/agent-scope.js";
import type { OpenClawConfig } from "../config/config.js";
import {
  RESOLVED_CAPABILITY_CLASSES,
  type ResolvedCapability,
  type ResolvedCapabilityClass,
  type ResolvedCapabilityEvidence,
  type ResolvedCapabilityManifest,
  type ResolvedCapabilityPolicy,
  type ResolvedCapabilityRuntimeContext,
} from "../shared/resolved-capability-manifest.js";
import type { SkillStatusReport } from "../agents/skills-status.js";

export const COMMAND_CAPABILITY_REASON_CATEGORIES = [
  "policy-block",
  "config-gap",
  "runtime-profile-gap",
  "projection-defect",
  "remote-assisted-availability",
  "gateway-brokered-availability",
] as const;

export type CommandCapabilityReasonCategory =
  (typeof COMMAND_CAPABILITY_REASON_CATEGORIES)[number];

export type CommandCapabilityFinding = {
  id: string;
  label: string;
  kind: ResolvedCapability["kind"];
  capabilityClass: ResolvedCapabilityClass;
  primaryReasonCategory: CommandCapabilityReasonCategory;
  summary: string;
  detail?: string;
  remediation?: string;
  policy?: ResolvedCapabilityPolicy;
  evidence?: ResolvedCapabilityEvidence;
};

export type CommandCapabilityCounts = {
  total: number;
  byClass: Record<ResolvedCapabilityClass, number>;
};

export type CommandCapabilitySnapshot = {
  runtimeContext: ResolvedCapabilityRuntimeContext;
  counts: CommandCapabilityCounts;
  skills: SkillStatusReport["skills"];
  toolGroups: ResolvedToolCatalogGroup[];
  manifest: ResolvedCapabilityManifest;
  findings: CommandCapabilityFinding[];
};

type CommandCapabilityMode = "gateway" | "readonly-sandbox";

function initializeCapabilityCounts(): CommandCapabilityCounts {
  return {
    total: 0,
    byClass: Object.fromEntries(
      RESOLVED_CAPABILITY_CLASSES.map((capabilityClass) => [capabilityClass, 0]),
    ) as Record<ResolvedCapabilityClass, number>,
  };
}

function formatList(values: string[]): string | undefined {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(", ") : undefined;
}

function formatEvidenceDetail(evidence?: ResolvedCapabilityEvidence): string | undefined {
  if (!evidence) {
    return undefined;
  }
  const parts: string[] = [];
  if (evidence.runtime?.detail?.trim()) {
    parts.push(evidence.runtime.detail.trim());
  }
  if (evidence.projection?.detail?.trim()) {
    parts.push(evidence.projection.detail.trim());
  }
  if (evidence.provider?.detail?.trim()) {
    parts.push(evidence.provider.detail.trim());
  }
  if (evidence.remote?.note?.trim()) {
    parts.push(evidence.remote.note.trim());
  }
  if (parts.length > 0) {
    return parts.join(" | ");
  }

  const runtimeParts: string[] = [];
  if (evidence.runtime?.profile?.trim()) {
    runtimeParts.push(`profile ${evidence.runtime.profile.trim()}`);
  }
  const missingBins = formatList(evidence.runtime?.missingBins ?? []);
  if (missingBins) {
    runtimeParts.push(`missing bins: ${missingBins}`);
  }
  const missingAnyBins = formatList(evidence.runtime?.missingAnyBins ?? []);
  if (missingAnyBins) {
    runtimeParts.push(`missing one of: ${missingAnyBins}`);
  }
  const missingOs = formatList(evidence.runtime?.missingOs ?? []);
  if (missingOs) {
    runtimeParts.push(`unsupported OS: ${missingOs}`);
  }
  if (runtimeParts.length > 0) {
    parts.push(runtimeParts.join("; "));
  }

  const missingPaths = formatList(evidence.projection?.missingPaths ?? []);
  if (missingPaths) {
    parts.push(`missing projected paths: ${missingPaths}`);
  }

  const providerParts = [
    evidence.provider?.providerId?.trim(),
    evidence.provider?.providerKind?.trim(),
    evidence.provider?.transport?.trim(),
  ].filter((value): value is string => Boolean(value));
  if (providerParts.length > 0) {
    parts.push(`provider: ${providerParts.join(" / ")}`);
  }

  const remoteParts: string[] = [];
  const satisfiedOs = formatList(evidence.remote?.satisfiedOs ?? []);
  if (satisfiedOs) {
    remoteParts.push(`remote OS: ${satisfiedOs}`);
  }
  const satisfiedBins = formatList(evidence.remote?.satisfiedBins ?? []);
  if (satisfiedBins) {
    remoteParts.push(`remote bins: ${satisfiedBins}`);
  }
  const satisfiedAnyBins = formatList(evidence.remote?.satisfiedAnyBins ?? []);
  if (satisfiedAnyBins) {
    remoteParts.push(`remote provides one of: ${satisfiedAnyBins}`);
  }
  if (remoteParts.length > 0) {
    parts.push(remoteParts.join("; "));
  }

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function formatPolicyDetail(policy?: ResolvedCapabilityPolicy): string | undefined {
  const detail = policy?.detail?.trim() || policy?.source.detail?.trim();
  if (detail) {
    return detail;
  }
  return policy?.source.key?.trim() || undefined;
}

function hasProjectionGap(evidence?: ResolvedCapabilityEvidence): boolean {
  return Boolean(
    evidence?.runtime?.reasonCodes.includes("missing-projection") ||
      evidence?.projection?.reasonCodes.includes("missing-projection") ||
      (evidence?.projection?.missingPaths?.length ?? 0) > 0,
  );
}

function hasProviderGap(evidence?: ResolvedCapabilityEvidence): boolean {
  return Boolean(evidence?.provider?.reasonCodes.includes("missing-provider"));
}

function determineReasonCategory(capability: ResolvedCapability): CommandCapabilityReasonCategory | null {
  switch (capability.capabilityClass) {
    case "sandbox-local":
      return null;
    case "gateway-brokered":
      return "gateway-brokered-availability";
    case "remote-node-assisted":
      return "remote-assisted-availability";
    case "configured-but-blocked":
      return capability.policy?.denyReason === "missing-required-env" ||
        capability.policy?.denyReason === "missing-required-config"
        ? "config-gap"
        : "policy-block";
    case "unsupported-in-current-runtime":
      if (hasProjectionGap(capability.evidence)) {
        return "projection-defect";
      }
      if (hasProviderGap(capability.evidence)) {
        return "gateway-brokered-availability";
      }
      return "runtime-profile-gap";
  }
}

function summarizeBlockedCapability(capability: ResolvedCapability): Pick<
  CommandCapabilityFinding,
  "summary" | "detail" | "remediation"
> {
  const policyKey = capability.policy?.source.key ?? "config";
  switch (capability.policy?.denyReason) {
    case "missing-required-env":
      return {
        summary: "Missing required environment configuration",
        detail: formatPolicyDetail(capability.policy),
        remediation: `Configure the missing environment for this capability via ${policyKey}.`,
      };
    case "missing-required-config":
      return {
        summary: "Missing required config",
        detail: formatPolicyDetail(capability.policy),
        remediation: `Configure the missing settings for this capability via ${policyKey}.`,
      };
    case "skill-disabled":
      return {
        summary: "Disabled in config",
        detail: formatPolicyDetail(capability.policy),
        remediation: `Enable this capability via ${policyKey}.`,
      };
    case "bundled-skill-not-allowlisted":
      return {
        summary: "Blocked by bundled skill allowlist",
        detail: formatPolicyDetail(capability.policy),
        remediation: "Allowlist the bundled skill via skills.allowBundled if it should be available.",
      };
    case "tool-denied-by-sandbox-policy":
      return {
        summary: "Denied by sandbox tool policy",
        detail: formatPolicyDetail(capability.policy),
        remediation: `Adjust sandbox tool deny rules in ${policyKey} if this tool should be allowed.`,
      };
    case "tool-not-in-sandbox-allowlist":
      return {
        summary: "Not allowlisted by sandbox tool policy",
        detail: formatPolicyDetail(capability.policy),
        remediation: `Add this tool to the sandbox allowlist in ${policyKey} if it should be available.`,
      };
    default:
      return {
        summary: "Blocked by policy",
        detail: formatPolicyDetail(capability.policy),
      };
  }
}

function summarizeUnsupportedCapability(capability: ResolvedCapability): Pick<
  CommandCapabilityFinding,
  "summary" | "detail" | "remediation"
> {
  if (hasProjectionGap(capability.evidence)) {
    return {
      summary: "Missing projected runtime material",
      detail: formatEvidenceDetail(capability.evidence),
      remediation: "Repair the sandbox projection so the required files and manifests are present.",
    };
  }
  if (hasProviderGap(capability.evidence)) {
    return {
      summary: "Gateway/provider path is not available",
      detail: formatEvidenceDetail(capability.evidence),
      remediation: "Restore or configure the required gateway/provider path for this capability.",
    };
  }
  return {
    summary: "Unsupported in the current runtime/profile",
    detail: formatEvidenceDetail(capability.evidence),
    remediation: "Use or configure a runtime/profile that includes the required binaries, OS support, or declared capability support.",
  };
}

function summarizeAvailabilityCapability(capability: ResolvedCapability): Pick<
  CommandCapabilityFinding,
  "summary" | "detail" | "remediation"
> {
  if (capability.capabilityClass === "remote-node-assisted") {
    return {
      summary: "Available via remote node assistance",
      detail: formatEvidenceDetail(capability.evidence),
    };
  }
  return {
    summary: "Available via gateway broker",
    detail: formatEvidenceDetail(capability.evidence),
  };
}

function createCapabilityFinding(capability: ResolvedCapability): CommandCapabilityFinding | null {
  const primaryReasonCategory = determineReasonCategory(capability);
  if (!primaryReasonCategory) {
    return null;
  }
  const summarySource =
    capability.capabilityClass === "configured-but-blocked"
      ? summarizeBlockedCapability(capability)
      : capability.capabilityClass === "unsupported-in-current-runtime"
        ? summarizeUnsupportedCapability(capability)
        : summarizeAvailabilityCapability(capability);

  return {
    id: capability.id,
    label: capability.label,
    kind: capability.kind,
    capabilityClass: capability.capabilityClass,
    primaryReasonCategory,
    summary: summarySource.summary,
    ...(summarySource.detail ? { detail: summarySource.detail } : {}),
    ...(summarySource.remediation ? { remediation: summarySource.remediation } : {}),
    ...(capability.policy ? { policy: capability.policy } : {}),
    ...(capability.evidence ? { evidence: capability.evidence } : {}),
  };
}

function rankFinding(finding: CommandCapabilityFinding): number {
  switch (finding.capabilityClass) {
    case "configured-but-blocked":
      return 0;
    case "unsupported-in-current-runtime":
      return 1;
    case "remote-node-assisted":
      return 2;
    case "gateway-brokered":
      return 3;
    case "sandbox-local":
      return 4;
  }
}

function sortFindings(a: CommandCapabilityFinding, b: CommandCapabilityFinding): number {
  const rank = rankFinding(a) - rankFinding(b);
  if (rank !== 0) {
    return rank;
  }
  if (a.kind !== b.kind) {
    return a.kind.localeCompare(b.kind);
  }
  return a.label.localeCompare(b.label);
}

export function pickCapabilityFindings(
  snapshot: CommandCapabilitySnapshot,
  options: {
    capabilityClasses?: ResolvedCapabilityClass[];
    limit?: number;
  } = {},
): CommandCapabilityFinding[] {
  const allowed = options.capabilityClasses
    ? new Set(options.capabilityClasses)
    : null;
  const findings = snapshot.findings.filter(
    (finding) => !allowed || allowed.has(finding.capabilityClass),
  );
  return typeof options.limit === "number" ? findings.slice(0, options.limit) : findings;
}

export function collectCommandCapabilitySnapshot(params: {
  config: OpenClawConfig;
  agentId?: string;
  sessionKey?: string;
  mode?: CommandCapabilityMode;
}): CommandCapabilitySnapshot {
  const agentId = params.agentId?.trim() || resolveDefaultAgentId(params.config);
  const workspaceDir = resolveAgentWorkspaceDir(params.config, agentId);
  const mode = params.mode ?? "gateway";
  const collected =
    mode === "readonly-sandbox"
      ? collectReadonlyCapabilityInputs({
          config: params.config,
          agentId,
          workspaceDir,
        })
      : collectGatewayCapabilityInputs({
          config: params.config,
          agentId,
          sessionKey: params.sessionKey,
          workspaceDir,
        });
  const manifest = resolveCapabilityManifest(collected);
  const skills = buildSkillStatusReportFromManifest({
    workspaceDir,
    managedSkillsDir: collected.managedSkillsDir,
    skills: collected.skills,
    manifest,
  }).skills;
  const toolGroups = buildResolvedToolCatalogGroupsFromManifest({
    tools: collected.tools,
    manifest,
  });
  const counts = initializeCapabilityCounts();
  const findings = manifest.capabilities
    .map((capability) => {
      counts.total += 1;
      counts.byClass[capability.capabilityClass] += 1;
      return createCapabilityFinding(capability);
    })
    .filter((finding): finding is CommandCapabilityFinding => Boolean(finding))
    .toSorted(sortFindings);

  return {
    runtimeContext: manifest.runtimeContext,
    counts,
    skills,
    toolGroups,
    manifest,
    findings,
  };
}
