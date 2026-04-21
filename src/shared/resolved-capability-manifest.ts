import type {
  RequirementConfigCheck,
  RequirementRemoteSatisfied,
  Requirements,
} from "./requirements.js";

export const RESOLVED_CAPABILITY_SCHEMA_VERSION = 1 as const;

export const RESOLVED_CAPABILITY_CLASSES = [
  "sandbox-local",
  "gateway-brokered",
  "remote-node-assisted",
  "configured-but-blocked",
  "unsupported-in-current-runtime",
] as const;

export type ResolvedCapabilityClass = (typeof RESOLVED_CAPABILITY_CLASSES)[number];

export const RESOLVED_CAPABILITY_KINDS = ["tool", "skill"] as const;

export type ResolvedCapabilityKind = (typeof RESOLVED_CAPABILITY_KINDS)[number];

export const RESOLVED_CAPABILITY_DENY_REASONS = [
  "skill-disabled",
  "bundled-skill-not-allowlisted",
  "missing-required-env",
  "missing-required-config",
  "tool-denied-by-sandbox-policy",
  "tool-not-in-sandbox-allowlist",
] as const;

export type ResolvedCapabilityDenyReason = (typeof RESOLVED_CAPABILITY_DENY_REASONS)[number];

export const RESOLVED_CAPABILITY_UNAVAILABLE_REASONS = [
  "missing-runtime-binaries",
  "missing-runtime-any-binaries",
  "unsupported-os",
  "missing-runtime-profile",
  "missing-projection",
  "missing-provider",
] as const;

export type ResolvedCapabilityUnavailableReason =
  (typeof RESOLVED_CAPABILITY_UNAVAILABLE_REASONS)[number];

export type ResolvedCapabilityRuntimeContext = {
  agentId: string;
  sessionKey?: string;
  sandboxMode?: string;
  sandboxScope?: string;
  sandboxed?: boolean;
};

export type ResolvedCapabilityPolicySource = {
  kind: "skill-config-entry" | "bundled-skill-allowlist" | "sandbox-tool-policy";
  key: string;
  detail?: string;
};

export const RESOLVED_CAPABILITY_POLICY_SOURCE_KINDS = [
  "skill-config-entry",
  "bundled-skill-allowlist",
  "sandbox-tool-policy",
] as const;

export type ResolvedCapabilityPolicySourceKind =
  (typeof RESOLVED_CAPABILITY_POLICY_SOURCE_KINDS)[number];

export type ResolvedCapabilityPolicy = {
  source: ResolvedCapabilityPolicySource;
  denyReason: ResolvedCapabilityDenyReason;
  detail?: string;
};

export type ResolvedCapabilityRuntimeEvidence = {
  profile?: string;
  missingBins: string[];
  missingAnyBins: string[];
  missingOs: string[];
  reasonCodes: ResolvedCapabilityUnavailableReason[];
  detail?: string;
};

export type ResolvedCapabilityProjectionEvidence = {
  missingPaths: string[];
  reasonCodes: ResolvedCapabilityUnavailableReason[];
  detail?: string;
};

export type ResolvedCapabilityProviderEvidence = {
  providerId?: string;
  providerKind?: string;
  transport?: string;
  reasonCodes: ResolvedCapabilityUnavailableReason[];
  detail?: string;
};

export type ResolvedCapabilityRemoteEvidence = {
  satisfiedBins: string[];
  satisfiedAnyBins: string[];
  satisfiedOs: string[];
  note?: string;
};

export type ResolvedCapabilityEvidence = {
  runtime?: ResolvedCapabilityRuntimeEvidence;
  projection?: ResolvedCapabilityProjectionEvidence;
  provider?: ResolvedCapabilityProviderEvidence;
  remote?: ResolvedCapabilityRemoteEvidence;
};

type ResolvedCapabilityBase<
  TKind extends ResolvedCapabilityKind,
  TClass extends ResolvedCapabilityClass,
> = {
  id: string;
  label: string;
  description: string;
  kind: TKind;
  capabilityClass: TClass;
  runtimeContext: ResolvedCapabilityRuntimeContext;
  policy?: ResolvedCapabilityPolicy;
  evidence?: ResolvedCapabilityEvidence;
};

type ResolvedSkillCapabilityBase<TClass extends ResolvedCapabilityClass> = ResolvedCapabilityBase<
  "skill",
  TClass
> & {
  skillKey: string;
  source: string;
  bundled?: boolean;
  filePath: string;
  primaryEnv?: string;
  requirements: Requirements;
  missing: Requirements;
  configChecks: RequirementConfigCheck[];
};

type ResolvedToolCapabilityBase<TClass extends ResolvedCapabilityClass> = ResolvedCapabilityBase<
  "tool",
  TClass
> & {
  source: "core" | "plugin";
  pluginId?: string;
  optional?: boolean;
  defaultProfiles?: Array<"minimal" | "coding" | "messaging" | "full">;
};

export type ResolvedSkillLocalCapability = ResolvedSkillCapabilityBase<"sandbox-local">;

export type ResolvedSkillRemoteCapability = ResolvedSkillCapabilityBase<"remote-node-assisted"> & {
  evidence: ResolvedCapabilityEvidence & {
    remote: ResolvedCapabilityRemoteEvidence;
  };
};

export type ResolvedSkillBlockedCapability =
  ResolvedSkillCapabilityBase<"configured-but-blocked"> & {
    policy: ResolvedCapabilityPolicy;
    evidence?: ResolvedCapabilityEvidence;
  };

export type ResolvedSkillUnsupportedCapability =
  ResolvedSkillCapabilityBase<"unsupported-in-current-runtime"> & {
    evidence: ResolvedCapabilityEvidence & {
      runtime: ResolvedCapabilityRuntimeEvidence;
    };
  };

export type ResolvedSkillCapability =
  | ResolvedSkillLocalCapability
  | ResolvedSkillRemoteCapability
  | ResolvedSkillBlockedCapability
  | ResolvedSkillUnsupportedCapability;

export type ResolvedToolLocalCapability = ResolvedToolCapabilityBase<"sandbox-local">;

export type ResolvedToolBrokeredCapability = ResolvedToolCapabilityBase<"gateway-brokered"> & {
  evidence: ResolvedCapabilityEvidence & {
    provider: ResolvedCapabilityProviderEvidence;
  };
};

export type ResolvedToolRemoteCapability = ResolvedToolCapabilityBase<"remote-node-assisted"> & {
  evidence: ResolvedCapabilityEvidence & {
    remote: ResolvedCapabilityRemoteEvidence;
  };
};

export type ResolvedToolBlockedCapability = ResolvedToolCapabilityBase<"configured-but-blocked"> & {
  policy: ResolvedCapabilityPolicy;
  evidence?: ResolvedCapabilityEvidence;
};

export type ResolvedToolUnsupportedCapability =
  ResolvedToolCapabilityBase<"unsupported-in-current-runtime"> & {
    evidence: ResolvedCapabilityEvidence & {
      runtime?: ResolvedCapabilityRuntimeEvidence;
      projection?: ResolvedCapabilityProjectionEvidence;
      provider?: ResolvedCapabilityProviderEvidence;
    };
  };

export type ResolvedToolCapability =
  | ResolvedToolLocalCapability
  | ResolvedToolBrokeredCapability
  | ResolvedToolRemoteCapability
  | ResolvedToolBlockedCapability
  | ResolvedToolUnsupportedCapability;

export type ResolvedCapability = ResolvedSkillCapability | ResolvedToolCapability;

export type ResolvedCapabilityManifest = {
  schemaVersion: typeof RESOLVED_CAPABILITY_SCHEMA_VERSION;
  runtimeContext: ResolvedCapabilityRuntimeContext;
  capabilities: ResolvedCapability[];
};

export type ResolvedSkillCapabilityAdapterInput = {
  name: string;
  description: string;
  source: string;
  skillKey: string;
  bundled: boolean;
  filePath: string;
  primaryEnv?: string;
  requirements: Requirements;
  missing: Requirements;
  configChecks: RequirementConfigCheck[];
  disabled: boolean;
  blockedByAllowlist: boolean;
  remoteSatisfied: RequirementRemoteSatisfied | null;
  runtimeContext: ResolvedCapabilityRuntimeContext;
};

export type ResolvedToolCapabilityAdapterInput = Omit<ResolvedToolCapability, "kind">;

export type ToolCatalogCapabilityAdapterInput = {
  id: string;
  label: string;
  description: string;
  source: "core" | "plugin";
  pluginId?: string;
  optional?: boolean;
  defaultProfiles?: Array<"minimal" | "coding" | "messaging" | "full">;
  runtimeContext: ResolvedCapabilityRuntimeContext;
  capabilityClass?: Extract<
    ResolvedCapabilityClass,
    | "sandbox-local"
    | "gateway-brokered"
    | "remote-node-assisted"
    | "configured-but-blocked"
    | "unsupported-in-current-runtime"
  >;
  policy?: ResolvedCapabilityPolicy;
  evidence?: ResolvedCapabilityEvidence;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function hasObjectShape<T extends string>(
  value: Record<string, unknown>,
  key: T,
): value is Record<T, Record<string, unknown>> {
  return isRecord(value[key]);
}

export function isResolvedCapabilityClass(value: unknown): value is ResolvedCapabilityClass {
  return typeof value === "string" && RESOLVED_CAPABILITY_CLASSES.includes(value as never);
}

export function isResolvedCapabilityKind(value: unknown): value is ResolvedCapabilityKind {
  return typeof value === "string" && RESOLVED_CAPABILITY_KINDS.includes(value as never);
}

export function isResolvedCapabilityDenyReason(
  value: unknown,
): value is ResolvedCapabilityDenyReason {
  return typeof value === "string" && RESOLVED_CAPABILITY_DENY_REASONS.includes(value as never);
}

export function isResolvedCapabilityUnavailableReason(
  value: unknown,
): value is ResolvedCapabilityUnavailableReason {
  return (
    typeof value === "string" && RESOLVED_CAPABILITY_UNAVAILABLE_REASONS.includes(value as never)
  );
}

export function isResolvedCapabilityManifest(value: unknown): value is ResolvedCapabilityManifest {
  if (!isRecord(value)) {
    return false;
  }
  if (value.schemaVersion !== RESOLVED_CAPABILITY_SCHEMA_VERSION) {
    return false;
  }
  if (!isResolvedCapabilityRuntimeContext(value.runtimeContext)) {
    return false;
  }
  if (!Array.isArray(value.capabilities)) {
    return false;
  }
  return value.capabilities.every(isResolvedCapability);
}

export function isResolvedCapability(value: unknown): value is ResolvedCapability {
  if (!isRecord(value)) {
    return false;
  }
  if (!isResolvedCapabilityKind(value.kind) || !isResolvedCapabilityClass(value.capabilityClass)) {
    return false;
  }
  if (typeof value.id !== "string" || typeof value.label !== "string") {
    return false;
  }
  if (typeof value.description !== "string") {
    return false;
  }
  if (!isResolvedCapabilityRuntimeContext(value.runtimeContext)) {
    return false;
  }
  if (value.policy !== undefined && !isResolvedCapabilityPolicy(value.policy)) {
    return false;
  }
  if (value.evidence !== undefined && !isResolvedCapabilityEvidence(value.evidence)) {
    return false;
  }
  const matchesKind =
    value.kind === "skill" ? isResolvedSkillCapability(value) : isResolvedToolCapability(value);
  if (!matchesKind) {
    return false;
  }
  return hasCapabilityVariantRequirements(value);
}

export function isResolvedCapabilityPolicy(value: unknown): value is ResolvedCapabilityPolicy {
  if (!isRecord(value) || !hasObjectShape(value, "source")) {
    return false;
  }
  const source = value.source;
  return (
    isResolvedCapabilityPolicySourceKind(source.kind) &&
    typeof source.key === "string" &&
    isOptionalString(source.detail) &&
    isResolvedCapabilityDenyReason(value["denyReason"]) &&
    isOptionalString(value["detail"])
  );
}

export function isResolvedCapabilityPolicySourceKind(
  value: unknown,
): value is ResolvedCapabilityPolicySourceKind {
  return (
    typeof value === "string" && RESOLVED_CAPABILITY_POLICY_SOURCE_KINDS.includes(value as never)
  );
}

export function isResolvedCapabilityEvidence(value: unknown): value is ResolvedCapabilityEvidence {
  if (!isRecord(value)) {
    return false;
  }
  if (value.runtime !== undefined && !isResolvedRuntimeEvidence(value.runtime)) {
    return false;
  }
  if (value.projection !== undefined && !isResolvedProjectionEvidence(value.projection)) {
    return false;
  }
  if (value.provider !== undefined && !isResolvedProviderEvidence(value.provider)) {
    return false;
  }
  if (value.remote !== undefined && !isResolvedRemoteEvidence(value.remote)) {
    return false;
  }
  return true;
}

export function isResolvedCapabilityRuntimeContext(
  value: unknown,
): value is ResolvedCapabilityRuntimeContext {
  return (
    isRecord(value) &&
    typeof value.agentId === "string" &&
    isOptionalString(value.sessionKey) &&
    isOptionalString(value.sandboxMode) &&
    isOptionalString(value.sandboxScope) &&
    isOptionalBoolean(value.sandboxed)
  );
}

export function isResolvedRuntimeEvidence(
  value: unknown,
): value is ResolvedCapabilityRuntimeEvidence {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isStringArray(value.missingBins) &&
    isStringArray(value.missingAnyBins) &&
    isStringArray(value.missingOs) &&
    Array.isArray(value.reasonCodes) &&
    value.reasonCodes.every(isResolvedCapabilityUnavailableReason) &&
    isOptionalString(value.profile) &&
    isOptionalString(value.detail)
  );
}

export function isResolvedProjectionEvidence(
  value: unknown,
): value is ResolvedCapabilityProjectionEvidence {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isStringArray(value.missingPaths) &&
    Array.isArray(value.reasonCodes) &&
    value.reasonCodes.every(isResolvedCapabilityUnavailableReason) &&
    isOptionalString(value.detail)
  );
}

export function isResolvedProviderEvidence(
  value: unknown,
): value is ResolvedCapabilityProviderEvidence {
  if (!isRecord(value)) {
    return false;
  }
  return (
    Array.isArray(value.reasonCodes) &&
    value.reasonCodes.every(isResolvedCapabilityUnavailableReason) &&
    isOptionalString(value.providerId) &&
    isOptionalString(value.providerKind) &&
    isOptionalString(value.transport) &&
    isOptionalString(value.detail)
  );
}

export function isResolvedRemoteEvidence(
  value: unknown,
): value is ResolvedCapabilityRemoteEvidence {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isStringArray(value.satisfiedBins) &&
    isStringArray(value.satisfiedAnyBins) &&
    isStringArray(value.satisfiedOs) &&
    isOptionalString(value.note)
  );
}

export function createResolvedCapabilityManifest(params: {
  runtimeContext: ResolvedCapabilityRuntimeContext;
  capabilities: ResolvedCapability[];
}): ResolvedCapabilityManifest {
  return {
    schemaVersion: RESOLVED_CAPABILITY_SCHEMA_VERSION,
    runtimeContext: params.runtimeContext,
    capabilities: params.capabilities,
  };
}

export function buildResolvedToolCapability(
  input: ResolvedToolCapabilityAdapterInput,
): ResolvedToolCapability {
  const capability = {
    ...input,
    kind: "tool" as const,
  } as ResolvedToolCapability;
  assertCapabilityVariantRequirements(capability);
  return capability;
}

export function adaptToolCatalogEntryToResolvedCapability(
  input: ToolCatalogCapabilityAdapterInput,
): ResolvedToolCapability {
  return buildResolvedToolCapability({
    id: input.id,
    label: input.label,
    description: input.description,
    source: input.source,
    pluginId: input.pluginId,
    optional: input.optional,
    defaultProfiles: input.defaultProfiles,
    runtimeContext: input.runtimeContext,
    capabilityClass: input.capabilityClass ?? "sandbox-local",
    ...(input.policy ? { policy: input.policy } : {}),
    ...(input.evidence ? { evidence: input.evidence } : {}),
  } as ResolvedToolCapabilityAdapterInput);
}

export function buildResolvedSkillCapability(
  input: ResolvedSkillCapabilityAdapterInput,
): ResolvedSkillCapability {
  const remoteEvidence = toRemoteEvidence(input.remoteSatisfied);
  const runtimeEvidence = toRuntimeEvidence(input.missing);
  const sharedBase = {
    id: input.name,
    label: input.name,
    description: input.description,
    kind: "skill" as const,
    runtimeContext: input.runtimeContext,
    skillKey: input.skillKey,
    source: input.source,
    bundled: input.bundled,
    filePath: input.filePath,
    primaryEnv: input.primaryEnv,
    requirements: input.requirements,
    missing: input.missing,
    configChecks: input.configChecks,
  };
  const evidence: ResolvedCapabilityEvidence | undefined = {
    ...(runtimeEvidence ? { runtime: runtimeEvidence } : {}),
    ...(remoteEvidence ? { remote: remoteEvidence } : {}),
  };
  const hasEvidence = Object.keys(evidence).length > 0 ? evidence : undefined;

  if (input.disabled) {
    return {
      ...sharedBase,
      capabilityClass: "configured-but-blocked",
      policy: {
        source: {
          kind: "skill-config-entry",
          key: `skills.entries.${input.skillKey}.enabled`,
        },
        denyReason: "skill-disabled",
      },
      ...(hasEvidence ? { evidence: hasEvidence } : {}),
    };
  }

  if (input.blockedByAllowlist) {
    return {
      ...sharedBase,
      capabilityClass: "configured-but-blocked",
      policy: {
        source: {
          kind: "bundled-skill-allowlist",
          key: "skills.allowBundled",
        },
        denyReason: "bundled-skill-not-allowlisted",
      },
      ...(hasEvidence ? { evidence: hasEvidence } : {}),
    };
  }

  const configBlock = toConfigBlock(input);
  if (configBlock) {
    return {
      ...sharedBase,
      capabilityClass: "configured-but-blocked",
      policy: configBlock,
      ...(hasEvidence ? { evidence: hasEvidence } : {}),
    };
  }

  if (remoteEvidence) {
    return {
      ...sharedBase,
      capabilityClass: "remote-node-assisted",
      evidence: {
        ...(runtimeEvidence ? { runtime: runtimeEvidence } : {}),
        remote: remoteEvidence,
      },
    };
  }

  if (runtimeEvidence) {
    return {
      ...sharedBase,
      capabilityClass: "unsupported-in-current-runtime",
      evidence: {
        runtime: runtimeEvidence,
      },
    };
  }

  return {
    ...sharedBase,
    capabilityClass: "sandbox-local",
  };
}

function toRemoteEvidence(
  remoteSatisfied: RequirementRemoteSatisfied | null,
): ResolvedCapabilityRemoteEvidence | undefined {
  if (!remoteSatisfied) {
    return undefined;
  }
  if (
    remoteSatisfied.bins.length === 0 &&
    remoteSatisfied.anyBins.length === 0 &&
    remoteSatisfied.os.length === 0 &&
    !remoteSatisfied.note
  ) {
    return undefined;
  }
  return {
    satisfiedBins: remoteSatisfied.bins,
    satisfiedAnyBins: remoteSatisfied.anyBins,
    satisfiedOs: remoteSatisfied.os,
    ...(remoteSatisfied.note ? { note: remoteSatisfied.note } : {}),
  };
}

function toRuntimeEvidence(missing: Requirements): ResolvedCapabilityRuntimeEvidence | undefined {
  const reasonCodes: ResolvedCapabilityUnavailableReason[] = [];
  if (missing.bins.length > 0) {
    reasonCodes.push("missing-runtime-binaries");
  }
  if (missing.anyBins.length > 0) {
    reasonCodes.push("missing-runtime-any-binaries");
  }
  if (missing.os.length > 0) {
    reasonCodes.push("unsupported-os");
  }
  if (reasonCodes.length === 0) {
    return undefined;
  }
  return {
    missingBins: missing.bins,
    missingAnyBins: missing.anyBins,
    missingOs: missing.os,
    reasonCodes,
  };
}

function toConfigBlock(
  input: ResolvedSkillCapabilityAdapterInput,
): ResolvedCapabilityPolicy | undefined {
  if (input.missing.env.length > 0) {
    return {
      source: {
        kind: "skill-config-entry",
        key: `skills.entries.${input.skillKey}`,
        detail: input.missing.env.join(","),
      },
      denyReason: "missing-required-env",
      detail: input.missing.env.join(", "),
    };
  }
  if (input.missing.config.length > 0) {
    return {
      source: {
        kind: "skill-config-entry",
        key: `skills.entries.${input.skillKey}`,
        detail: input.missing.config.join(","),
      },
      denyReason: "missing-required-config",
      detail: input.missing.config.join(", "),
    };
  }
  return undefined;
}

function assertCapabilityVariantRequirements(capability: ResolvedCapability) {
  if (!hasCapabilityVariantRequirements(capability)) {
    if (capability.capabilityClass === "configured-but-blocked") {
      throw new Error(`blocked capability "${capability.id}" is missing policy metadata`);
    }
    if (capability.capabilityClass === "remote-node-assisted") {
      throw new Error(`remote-assisted capability "${capability.id}" is missing remote evidence`);
    }
    if (capability.capabilityClass === "gateway-brokered") {
      throw new Error(
        `gateway-brokered capability "${capability.id}" is missing provider evidence`,
      );
    }
    if (capability.capabilityClass === "unsupported-in-current-runtime") {
      throw new Error(`unsupported capability "${capability.id}" is missing availability evidence`);
    }
  }
}

function hasCapabilityVariantRequirements(capability: Record<string, unknown>): boolean {
  if (capability.capabilityClass === "configured-but-blocked" && !capability.policy) {
    return false;
  }
  if (capability.capabilityClass === "remote-node-assisted") {
    return isRecord(capability.evidence) && isResolvedRemoteEvidence(capability.evidence.remote);
  }
  if (capability.capabilityClass === "unsupported-in-current-runtime") {
    if (!isRecord(capability.evidence)) {
      return false;
    }
    if (capability.kind === "skill") {
      return isResolvedRuntimeEvidence(capability.evidence.runtime);
    }
    if (
      !(
        isResolvedRuntimeEvidence(capability.evidence.runtime) ||
        isResolvedProjectionEvidence(capability.evidence.projection) ||
        isResolvedProviderEvidence(capability.evidence.provider)
      )
    ) {
      return false;
    }
  }
  if (capability.capabilityClass === "gateway-brokered") {
    return (
      isRecord(capability.evidence) && isResolvedProviderEvidence(capability.evidence.provider)
    );
  }
  return true;
}

function isResolvedSkillCapability(
  value: Record<string, unknown>,
): value is ResolvedSkillCapability {
  return (
    value.kind === "skill" &&
    typeof value.skillKey === "string" &&
    typeof value.source === "string" &&
    typeof value.filePath === "string" &&
    isRequirements(value.requirements) &&
    isRequirements(value.missing) &&
    Array.isArray(value.configChecks) &&
    value.configChecks.every(isConfigCheck)
  );
}

function isResolvedToolCapability(value: Record<string, unknown>): value is ResolvedToolCapability {
  return (
    value.kind === "tool" &&
    (value.source === "core" || value.source === "plugin") &&
    (value.defaultProfiles === undefined ||
      (Array.isArray(value.defaultProfiles) &&
        value.defaultProfiles.every((profile) =>
          ["minimal", "coding", "messaging", "full"].includes(profile),
        )))
  );
}

function isRequirements(value: unknown): value is Requirements {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isStringArray(value.bins) &&
    isStringArray(value.anyBins) &&
    isStringArray(value.env) &&
    isStringArray(value.config) &&
    isStringArray(value.os)
  );
}

function isConfigCheck(value: unknown): value is RequirementConfigCheck {
  return isRecord(value) && typeof value.path === "string" && typeof value.satisfied === "boolean";
}
