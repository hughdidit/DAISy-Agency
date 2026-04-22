import {
  buildResolvedSkillCapability,
  buildResolvedToolCapability,
  createResolvedCapabilityManifest,
  type ResolvedCapabilityEvidence,
  type ResolvedCapabilityPolicy,
  type ResolvedCapabilityRemoteEvidence,
  type ResolvedCapabilityRuntimeContext,
  type ResolvedCapabilityUnavailableReason,
  type ResolvedSkillCapability,
  type ResolvedToolCapability,
} from "../../shared/resolved-capability-manifest.js";
import { resolveSandboxToolPolicyDecision } from "../sandbox/tool-policy.js";
import type {
  CapabilityAvailabilityFacts,
  CapabilityResolutionInput,
  CollectedSkillCapabilityInput,
  CollectedToolCapabilityInput,
} from "./types.js";

function uniqueStrings(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).filter((value) => value.trim().length > 0)));
}

function mergeReasonCodes(
  ...groups: Array<ResolvedCapabilityUnavailableReason[] | undefined>
): ResolvedCapabilityUnavailableReason[] {
  const merged: ResolvedCapabilityUnavailableReason[] = [];
  for (const group of groups) {
    for (const code of group ?? []) {
      if (!merged.includes(code)) {
        merged.push(code);
      }
    }
  }
  return merged;
}

function combineDetail(parts: Array<string | undefined>): string | undefined {
  const cleaned = parts.map((part) => part?.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(" | ") : undefined;
}

function toRemoteEvidence(
  availability?: CapabilityAvailabilityFacts,
): ResolvedCapabilityRemoteEvidence | undefined {
  const remote = availability?.remote;
  if (!remote) {
    return undefined;
  }
  const satisfiedBins = uniqueStrings(remote.satisfiedBins);
  const satisfiedAnyBins = uniqueStrings(remote.satisfiedAnyBins);
  const satisfiedOs = uniqueStrings(remote.satisfiedOs);
  if (
    satisfiedBins.length === 0 &&
    satisfiedAnyBins.length === 0 &&
    satisfiedOs.length === 0 &&
    !remote.note
  ) {
    return undefined;
  }
  return {
    satisfiedBins,
    satisfiedAnyBins,
    satisfiedOs,
    ...(remote.note ? { note: remote.note } : {}),
  };
}

function toResolvedEvidence(
  availability?: CapabilityAvailabilityFacts,
): ResolvedCapabilityEvidence | undefined {
  if (!availability) {
    return undefined;
  }

  const runtimeReasonCodes = mergeReasonCodes(availability.runtime?.reasonCodes);
  const projectionReasonCodes = mergeReasonCodes(availability.projection?.reasonCodes);
  const providerReasonCodes = mergeReasonCodes(availability.provider?.reasonCodes);
  const remote = toRemoteEvidence(availability);

  const runtime =
    availability.runtime &&
    (runtimeReasonCodes.length > 0 ||
      uniqueStrings(availability.runtime.missingBins).length > 0 ||
      uniqueStrings(availability.runtime.missingAnyBins).length > 0 ||
      uniqueStrings(availability.runtime.missingOs).length > 0 ||
      availability.runtime.profile ||
      availability.runtime.detail)
      ? {
          ...(availability.runtime.profile ? { profile: availability.runtime.profile } : {}),
          missingBins: uniqueStrings(availability.runtime.missingBins),
          missingAnyBins: uniqueStrings(availability.runtime.missingAnyBins),
          missingOs: uniqueStrings(availability.runtime.missingOs),
          reasonCodes: runtimeReasonCodes,
          ...(availability.runtime.detail ? { detail: availability.runtime.detail } : {}),
        }
      : undefined;

  const projection =
    availability.projection &&
    (projectionReasonCodes.length > 0 ||
      uniqueStrings(availability.projection.missingPaths).length > 0 ||
      availability.projection.detail)
      ? {
          missingPaths: uniqueStrings(availability.projection.missingPaths),
          reasonCodes: projectionReasonCodes,
          ...(availability.projection.detail ? { detail: availability.projection.detail } : {}),
        }
      : undefined;

  const provider =
    availability.provider &&
    (providerReasonCodes.length > 0 ||
      availability.provider.providerId ||
      availability.provider.providerKind ||
      availability.provider.transport ||
      availability.provider.detail)
      ? {
          ...(availability.provider.providerId
            ? { providerId: availability.provider.providerId }
            : {}),
          ...(availability.provider.providerKind
            ? { providerKind: availability.provider.providerKind }
            : {}),
          ...(availability.provider.transport
            ? { transport: availability.provider.transport }
            : {}),
          reasonCodes: providerReasonCodes,
          ...(availability.provider.detail ? { detail: availability.provider.detail } : {}),
        }
      : undefined;

  const evidence: ResolvedCapabilityEvidence = {
    ...(runtime ? { runtime } : {}),
    ...(projection ? { projection } : {}),
    ...(provider ? { provider } : {}),
    ...(remote ? { remote } : {}),
  };
  return Object.keys(evidence).length > 0 ? evidence : undefined;
}

function resolveSkillRuntimeReasonCodes(
  input: CollectedSkillCapabilityInput,
): ResolvedCapabilityUnavailableReason[] {
  return mergeReasonCodes(
    input.availability?.runtime?.reasonCodes,
    input.availability?.projection?.reasonCodes,
  );
}

function resolveSkillRuntimeDetail(input: CollectedSkillCapabilityInput): string | undefined {
  const projectionDetail =
    input.availability?.projection?.missingPaths &&
    !input.availability.projection.detail &&
    input.availability.projection.missingPaths.length > 0
      ? `Missing projection paths: ${input.availability.projection.missingPaths.join(", ")}`
      : undefined;
  return combineDetail([
    input.availability?.runtime?.detail,
    input.availability?.projection?.detail,
    projectionDetail,
  ]);
}

function resolveToolPolicy(
  input: CollectedToolCapabilityInput,
): ResolvedCapabilityPolicy | undefined {
  if (!input.runtimeContext.sandboxed) {
    return undefined;
  }
  const decision = resolveSandboxToolPolicyDecision(input.toolPolicy, input.id);
  if (decision.allowed) {
    return undefined;
  }
  if (decision.blockedByDeny) {
    return {
      source: {
        kind: "sandbox-tool-policy",
        key: decision.sources.deny.key,
      },
      denyReason: "tool-denied-by-sandbox-policy",
      ...(decision.blockedByAllow
        ? { detail: `Also not allowlisted by ${decision.sources.allow.key}.` }
        : {}),
    };
  }
  return {
    source: {
      kind: "sandbox-tool-policy",
      key: decision.sources.allow.key,
    },
    denyReason: "tool-not-in-sandbox-allowlist",
  };
}

function hasProviderEvidence(availability?: CapabilityAvailabilityFacts): boolean {
  const provider = availability?.provider;
  if (!provider) {
    return false;
  }
  return (
    mergeReasonCodes(provider.reasonCodes).length > 0 ||
    Boolean(provider.providerId || provider.providerKind || provider.transport || provider.detail)
  );
}

function ensureUnsupportedAvailability(
  input: CollectedToolCapabilityInput,
): CapabilityAvailabilityFacts {
  const availability = input.availability ?? {};
  const provider =
    input.intent === "gateway-brokered" || input.intent === "remote-node-assisted"
      ? hasProviderEvidence(availability)
        ? availability.provider
        : {
            ...availability.provider,
            reasonCodes: mergeReasonCodes(availability.provider?.reasonCodes, ["missing-provider"]),
            detail:
              availability.provider?.detail ??
              (input.intent === "remote-node-assisted"
                ? "Remote eligibility facts are missing."
                : "Gateway provider facts are missing."),
          }
      : availability.provider;
  return {
    ...availability,
    ...(provider ? { provider } : {}),
  };
}

export function resolveCollectedSkillCapability(
  input: CollectedSkillCapabilityInput,
): ResolvedSkillCapability {
  return buildResolvedSkillCapability({
    name: input.name,
    description: input.description,
    source: input.source,
    skillKey: input.skillKey,
    bundled: input.bundled,
    filePath: input.filePath,
    primaryEnv: input.primaryEnv,
    requirements: input.requirements,
    missing: input.missing,
    configChecks: input.configChecks,
    disabled: input.disabled,
    blockedByAllowlist: input.blockedByAllowlist,
    remoteSatisfied: input.remoteSatisfied,
    runtimeContext: input.runtimeContext,
    runtimeProfile: input.availability?.runtime?.profile,
    runtimeReasonCodes: resolveSkillRuntimeReasonCodes(input),
    runtimeDetail: resolveSkillRuntimeDetail(input),
  });
}

export function resolveCollectedToolCapability(
  input: CollectedToolCapabilityInput,
): ResolvedToolCapability {
  const policy = resolveToolPolicy(input);
  const evidence = toResolvedEvidence(input.availability);

  if (policy) {
    return buildResolvedToolCapability({
      id: input.id,
      label: input.label,
      description: input.description,
      source: input.source,
      pluginId: input.pluginId,
      optional: input.optional,
      defaultProfiles: input.defaultProfiles,
      runtimeContext: input.runtimeContext,
      capabilityClass: "configured-but-blocked",
      policy,
      ...(evidence ? { evidence } : {}),
    });
  }

  const remoteEvidence = toRemoteEvidence(input.availability);
  if (input.intent === "remote-node-assisted" && remoteEvidence) {
    return buildResolvedToolCapability({
      id: input.id,
      label: input.label,
      description: input.description,
      source: input.source,
      pluginId: input.pluginId,
      optional: input.optional,
      defaultProfiles: input.defaultProfiles,
      runtimeContext: input.runtimeContext,
      capabilityClass: "remote-node-assisted",
      evidence: {
        ...(evidence?.runtime ? { runtime: evidence.runtime } : {}),
        ...(evidence?.projection ? { projection: evidence.projection } : {}),
        ...(evidence?.provider ? { provider: evidence.provider } : {}),
        remote: remoteEvidence,
      },
    });
  }

  const providerReasonCodes = input.availability?.provider?.reasonCodes ?? [];
  const providerReady =
    input.intent === "gateway-brokered" &&
    input.availability?.provider &&
    providerReasonCodes.length === 0;
  if (providerReady && evidence?.provider) {
    return buildResolvedToolCapability({
      id: input.id,
      label: input.label,
      description: input.description,
      source: input.source,
      pluginId: input.pluginId,
      optional: input.optional,
      defaultProfiles: input.defaultProfiles,
      runtimeContext: input.runtimeContext,
      capabilityClass: "gateway-brokered",
      evidence: {
        ...(evidence.runtime ? { runtime: evidence.runtime } : {}),
        ...(evidence.projection ? { projection: evidence.projection } : {}),
        provider: evidence.provider,
      },
    });
  }

  const unsupportedAvailability = ensureUnsupportedAvailability(input);
  const unsupportedEvidence = toResolvedEvidence(unsupportedAvailability);
  const hasUnsupportedEvidence =
    unsupportedEvidence?.runtime ||
    unsupportedEvidence?.projection ||
    unsupportedEvidence?.provider;
  if (hasUnsupportedEvidence) {
    return buildResolvedToolCapability({
      id: input.id,
      label: input.label,
      description: input.description,
      source: input.source,
      pluginId: input.pluginId,
      optional: input.optional,
      defaultProfiles: input.defaultProfiles,
      runtimeContext: input.runtimeContext,
      capabilityClass: "unsupported-in-current-runtime",
      evidence: {
        ...(unsupportedEvidence?.runtime ? { runtime: unsupportedEvidence.runtime } : {}),
        ...(unsupportedEvidence?.projection ? { projection: unsupportedEvidence.projection } : {}),
        ...(unsupportedEvidence?.provider ? { provider: unsupportedEvidence.provider } : {}),
      },
    });
  }

  return buildResolvedToolCapability({
    id: input.id,
    label: input.label,
    description: input.description,
    source: input.source,
    pluginId: input.pluginId,
    optional: input.optional,
    defaultProfiles: input.defaultProfiles,
    runtimeContext: input.runtimeContext,
    capabilityClass: "sandbox-local",
  });
}

function assertUniqueCollectedInputs(
  runtimeContext: ResolvedCapabilityRuntimeContext,
  values: Array<{ matchKey: string }>,
) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.matchKey)) {
      throw new Error(
        `Duplicate capability match key "${value.matchKey}" for agent ${runtimeContext.agentId}.`,
      );
    }
    seen.add(value.matchKey);
  }
}

export function resolveCapabilityManifest(input: CapabilityResolutionInput) {
  assertUniqueCollectedInputs(input.runtimeContext, [...input.skills, ...input.tools]);
  const ordered = [
    ...input.skills.map((skill) => ({
      sortKey: skill.sortKey,
      capability: resolveCollectedSkillCapability(skill),
    })),
    ...input.tools.map((tool) => ({
      sortKey: tool.sortKey,
      capability: resolveCollectedToolCapability(tool),
    })),
  ].toSorted((a, b) => a.sortKey.localeCompare(b.sortKey));

  return createResolvedCapabilityManifest({
    runtimeContext: input.runtimeContext,
    capabilities: ordered.map((entry) => entry.capability),
  });
}
