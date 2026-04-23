import { html } from "lit";
import type { ResolvedCapabilityEvidence, SkillStatusEntry, ToolCatalogEntry } from "../types.ts";

type CapabilityDetails = SkillStatusEntry["capability"] | ToolCatalogEntry["capability"];
type CapabilityClass = ToolCatalogEntry["capabilityClass"];

const CAPABILITY_CLASS_LABELS: Record<CapabilityClass, string> = {
  "sandbox-local": "sandbox-local",
  "gateway-brokered": "gateway-brokered",
  "remote-node-assisted": "remote-node-assisted",
  "configured-but-blocked": "configured-but-blocked",
  "unsupported-in-current-runtime": "unsupported-in-current-runtime",
};

const DENY_REASON_LABELS = {
  "skill-disabled": "Disabled in config",
  "bundled-skill-not-allowlisted": "Not allowlisted for this agent",
  "missing-required-env": "Missing required environment",
  "missing-required-config": "Missing required config",
  "tool-denied-by-sandbox-policy": "Denied by sandbox policy",
  "tool-not-in-sandbox-allowlist": "Not in sandbox allowlist",
} as const;

const UNAVAILABLE_REASON_LABELS = {
  "missing-runtime-binaries": "Missing required runtime binaries",
  "missing-runtime-any-binaries": "No supported runtime binary found",
  "unsupported-os": "Unsupported in current OS/runtime",
  "missing-runtime-profile": "Missing required runtime profile",
  "missing-projection": "Missing projected runtime assets",
  "missing-provider": "Required provider is unavailable",
} as const;

function pushUnique(target: string[], value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed || target.includes(trimmed)) {
    return;
  }
  target.push(trimmed);
}

function formatList(prefix: string, values: string[]) {
  return values.length > 0 ? `${prefix}${values.join(", ")}` : null;
}

function describePolicy(capability: CapabilityDetails) {
  if (!("policy" in capability) || !capability.policy) {
    return [];
  }
  const details: string[] = [];
  pushUnique(details, DENY_REASON_LABELS[capability.policy.denyReason]);
  pushUnique(details, capability.policy.detail);
  pushUnique(
    details,
    capability.policy.source.detail
      ? `Policy source: ${capability.policy.source.kind} (${capability.policy.source.detail})`
      : `Policy source: ${capability.policy.source.kind}`,
  );
  return details;
}

function describeRuntime(capability: CapabilityDetails) {
  const runtime = getCapabilityEvidence(capability)?.runtime;
  if (!runtime) {
    return [];
  }
  const details: string[] = [];
  pushUnique(details, runtime.detail);
  for (const code of runtime.reasonCodes) {
    pushUnique(details, UNAVAILABLE_REASON_LABELS[code]);
  }
  pushUnique(details, runtime.profile ? `Runtime profile: ${runtime.profile}` : null);
  pushUnique(details, formatList("Missing bins: ", runtime.missingBins));
  pushUnique(details, formatList("Need any of: ", runtime.missingAnyBins));
  pushUnique(details, formatList("Unsupported OS requirements: ", runtime.missingOs));
  return details;
}

function describeProvider(capability: CapabilityDetails) {
  const provider = getCapabilityEvidence(capability)?.provider;
  if (!provider) {
    return [];
  }
  const details: string[] = [];
  pushUnique(details, provider.detail);
  const providerBits = [
    provider.providerKind,
    provider.providerId,
    provider.transport ? `via ${provider.transport}` : undefined,
  ].filter((value): value is string => Boolean(value && value.trim()));
  pushUnique(details, providerBits.length > 0 ? `Brokered by ${providerBits.join(" ")}` : null);
  for (const code of provider.reasonCodes) {
    pushUnique(details, UNAVAILABLE_REASON_LABELS[code]);
  }
  return details;
}

function describeProjection(capability: CapabilityDetails) {
  const projection = getCapabilityEvidence(capability)?.projection;
  if (!projection) {
    return [];
  }
  const details: string[] = [];
  pushUnique(details, projection.detail);
  for (const code of projection.reasonCodes) {
    pushUnique(details, UNAVAILABLE_REASON_LABELS[code]);
  }
  pushUnique(details, formatList("Missing projection paths: ", projection.missingPaths));
  return details;
}

function describeRemote(capability: CapabilityDetails) {
  const remote = getCapabilityEvidence(capability)?.remote;
  if (!remote) {
    return [];
  }
  const details: string[] = [];
  pushUnique(details, remote.note);
  pushUnique(details, formatList("Remote satisfies bins: ", remote.satisfiedBins));
  pushUnique(details, formatList("Remote satisfies any of: ", remote.satisfiedAnyBins));
  pushUnique(details, formatList("Remote satisfies OS: ", remote.satisfiedOs));
  return details;
}

function getCapabilityEvidence(
  capability: CapabilityDetails,
): ResolvedCapabilityEvidence | undefined {
  return "evidence" in capability ? capability.evidence : undefined;
}

export function computeCapabilityDetails(capability: CapabilityDetails): string[] {
  const details: string[] = [];
  for (const value of describePolicy(capability)) {
    pushUnique(details, value);
  }
  for (const value of describeRuntime(capability)) {
    pushUnique(details, value);
  }
  for (const value of describeProvider(capability)) {
    pushUnique(details, value);
  }
  for (const value of describeProjection(capability)) {
    pushUnique(details, value);
  }
  for (const value of describeRemote(capability)) {
    pushUnique(details, value);
  }
  return details;
}

function resolveCapabilityChipClass(capabilityClass: CapabilityClass) {
  switch (capabilityClass) {
    case "sandbox-local":
    case "gateway-brokered":
    case "remote-node-assisted":
      return "chip-ok";
    case "configured-but-blocked":
    case "unsupported-in-current-runtime":
      return "chip-warn";
    default:
      return "";
  }
}

export function renderCapabilityClassChip(capabilityClass: CapabilityClass) {
  return html`
    <span class="chip ${resolveCapabilityChipClass(capabilityClass)}">
      ${CAPABILITY_CLASS_LABELS[capabilityClass]}
    </span>
  `;
}
