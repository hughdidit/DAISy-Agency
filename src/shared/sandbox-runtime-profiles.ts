const OFFICIAL_SANDBOX_BASE_IMAGE = "openclaw-sandbox:bookworm-slim";
const OFFICIAL_SANDBOX_COMMON_IMAGE = "openclaw-sandbox-common:bookworm-slim";
const OFFICIAL_SANDBOX_BROWSER_IMAGE = "openclaw-sandbox-browser:bookworm-slim";

export const SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS = [
  "ops-readonly",
  "coding-base",
  "coding-extended",
  "browser-automation",
] as const;

export type SandboxRuntimeProfileId = (typeof SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS)[number];

export const SANDBOX_RUNTIME_IMAGE_MATCH_KINDS = ["exact"] as const;

export type SandboxRuntimeImageMatchKind = (typeof SANDBOX_RUNTIME_IMAGE_MATCH_KINDS)[number];

export const SANDBOX_RUNTIME_IMAGE_ROLES = ["docker", "browser"] as const;

export type SandboxRuntimeImageRole = (typeof SANDBOX_RUNTIME_IMAGE_ROLES)[number];

export const SANDBOX_RUNTIME_NETWORK_POSTURES = [
  "projected-readonly",
  "sandbox-none",
  "gateway-brokered",
  "sandbox-browser-bridge",
] as const;

export type SandboxRuntimeNetworkPosture = (typeof SANDBOX_RUNTIME_NETWORK_POSTURES)[number];

export const SANDBOX_RUNTIME_FILESYSTEM_EXPECTATIONS = [
  "projected-readonly",
  "workspace-rw",
  "workspace-rw-extended-runtime",
  "workspace-rw-with-browser",
] as const;

export type SandboxRuntimeFilesystemExpectation =
  (typeof SANDBOX_RUNTIME_FILESYSTEM_EXPECTATIONS)[number];

export const SANDBOX_RUNTIME_SKILL_FAMILY_IDS = [
  "readonly-diagnostics",
  "coding-devtools",
  "browser-web-automation",
  "messaging",
  "memory-backed",
  "external-api-configured",
] as const;

export type SandboxRuntimeSkillFamilyId = (typeof SANDBOX_RUNTIME_SKILL_FAMILY_IDS)[number];

export const SANDBOX_RUNTIME_CAPABILITY_FAMILY_IDS = [
  "filesystem-read",
  "filesystem-edit",
  "runtime-exec",
  "gateway-web",
  "memory",
  "sessions",
  "browser-automation",
  "messaging",
  "automation",
  "nodes",
  "media",
  "plugin-brokered",
] as const;

export type SandboxRuntimeCapabilityFamilyId =
  (typeof SANDBOX_RUNTIME_CAPABILITY_FAMILY_IDS)[number];

export const SANDBOX_RUNTIME_SUPPORT_MODES = [
  "readonly-projected",
  "sandbox-coding",
  "sandbox-coding-extended",
  "sandbox-browser-assisted",
] as const;

export type SandboxRuntimeSupportMode = (typeof SANDBOX_RUNTIME_SUPPORT_MODES)[number];

export const SANDBOX_RUNTIME_SUPPORT_STATUSES = [
  "official",
  "synthetic-readonly",
  "custom-image",
  "image-mismatch",
] as const;

export type SandboxRuntimeSupportStatus = (typeof SANDBOX_RUNTIME_SUPPORT_STATUSES)[number];

export type SandboxRuntimeImageMatchRule = {
  kind: SandboxRuntimeImageMatchKind;
  role: SandboxRuntimeImageRole;
  image: string;
  primary?: boolean;
  note?: string;
};

export type SandboxRuntimeProfileAssistance = {
  sandboxLocal: boolean;
  gatewayBrokered: boolean;
  browser: boolean;
  remoteNode: boolean;
};

export type SandboxRuntimeProfileMetadata = {
  id: SandboxRuntimeProfileId;
  label: string;
  description: string;
  intendedWorkload: string;
  trustPosture: string;
  baselineExpectations: string;
  supportMode: SandboxRuntimeSupportMode;
  assistance: SandboxRuntimeProfileAssistance;
  imageRules: readonly SandboxRuntimeImageMatchRule[];
  expectedBinaries: readonly string[];
  expectedRuntimes: readonly string[];
  expectedNetworkPosture: SandboxRuntimeNetworkPosture;
  filesystemExpectation: SandboxRuntimeFilesystemExpectation;
  supportedSkillFamilies: readonly SandboxRuntimeSkillFamilyId[];
  supportedCapabilityFamilies: readonly SandboxRuntimeCapabilityFamilyId[];
  unsupportedBehaviors: readonly string[];
  projectionRequirements?: readonly string[];
  browserRuntimeRequired?: boolean;
};

export type SandboxRuntimeProfile = SandboxRuntimeProfileMetadata;

export const DEFAULT_SANDBOX_RUNTIME_PROFILE_ID = "coding-base" as const;

export const SUPPORTED_SANDBOX_RUNTIME_PROFILES = [
  {
    id: "ops-readonly",
    label: "Ops Readonly",
    description:
      "Read-only sandbox profile for diagnostics, inspection, and other non-mutating operator workflows.",
    intendedWorkload:
      "Sandbox-safe triage, status inspection, config/state projection review, and read-only skill execution.",
    trustPosture:
      "Minimal authority with read-only projections, no mutable workspace guarantee, and no implied browser runtime.",
    baselineExpectations:
      "Should support readonly diagnostics against projected config/state/workspace inputs and fail closed when projection material is missing.",
    supportMode: "readonly-projected",
    assistance: {
      sandboxLocal: true,
      gatewayBrokered: true,
      browser: false,
      remoteNode: false,
    },
    imageRules: [],
    expectedBinaries: ["read"],
    expectedRuntimes: ["projected-readonly-runtime"],
    expectedNetworkPosture: "projected-readonly",
    filesystemExpectation: "projected-readonly",
    supportedSkillFamilies: [
      "readonly-diagnostics",
      "coding-devtools",
      "messaging",
      "memory-backed",
      "external-api-configured",
    ],
    supportedCapabilityFamilies: [
      "filesystem-read",
      "gateway-web",
      "memory",
      "sessions",
      "messaging",
      "plugin-brokered",
    ],
    unsupportedBehaviors: [
      "Mutable workspace editing",
      "General shell execution",
      "Dedicated browser automation",
      "Assuming host or Docker image contents define support",
    ],
    projectionRequirements: [
      "Projected config/state/workspace material must be present and truthful.",
      "Readonly runtime must not claim support when projections are incomplete.",
    ],
  },
  {
    id: "coding-base",
    label: "Coding Base",
    description:
      "Default sandbox profile for normal coding and editing workflows inside the declared sandbox boundary.",
    intendedWorkload:
      "Routine code editing, repository inspection, patch application, and command execution within the configured workspace access policy.",
    trustPosture:
      "Sandbox-first coding runtime with explicit workspace access and no default guarantee of direct network egress.",
    baselineExpectations:
      "Should support ordinary coding tools inside the sandbox boundary, rely on brokered capabilities where required, and avoid assuming extra packages from setupCommand accidents.",
    supportMode: "sandbox-coding",
    assistance: {
      sandboxLocal: true,
      gatewayBrokered: true,
      browser: false,
      remoteNode: true,
    },
    imageRules: [
      {
        kind: "exact",
        role: "docker",
        image: OFFICIAL_SANDBOX_BASE_IMAGE,
        primary: true,
      },
    ],
    expectedBinaries: ["node", "npm", "git", "bash"],
    expectedRuntimes: ["nodejs", "shell"],
    expectedNetworkPosture: "sandbox-none",
    filesystemExpectation: "workspace-rw",
    supportedSkillFamilies: [
      "readonly-diagnostics",
      "coding-devtools",
      "messaging",
      "memory-backed",
      "external-api-configured",
    ],
    supportedCapabilityFamilies: [
      "filesystem-read",
      "filesystem-edit",
      "runtime-exec",
      "gateway-web",
      "memory",
      "sessions",
      "messaging",
      "automation",
      "nodes",
      "media",
      "plugin-brokered",
    ],
    unsupportedBehaviors: [
      "Automatic browser support without the dedicated browser runtime",
      "Treating custom image contents as new official profile identity",
    ],
  },
  {
    id: "coding-extended",
    label: "Coding Extended",
    description:
      "Extended coding profile backed by the common sandbox image for workflows that need a broader maintained runtime baseline.",
    intendedWorkload:
      "Coding and automation workflows that still run inside the sandbox boundary but depend on the maintained common image rather than the base image alone.",
    trustPosture:
      "Sandbox-first coding runtime with the same trust boundary as coding-base, but with a larger official runtime footprint declared explicitly.",
    baselineExpectations:
      "Should support the coding-base family set plus the broader maintained runtimes intentionally shipped in the common sandbox image.",
    supportMode: "sandbox-coding-extended",
    assistance: {
      sandboxLocal: true,
      gatewayBrokered: true,
      browser: false,
      remoteNode: true,
    },
    imageRules: [
      {
        kind: "exact",
        role: "docker",
        image: OFFICIAL_SANDBOX_COMMON_IMAGE,
        primary: true,
      },
    ],
    expectedBinaries: ["node", "npm", "git", "bash", "python3", "uv"],
    expectedRuntimes: ["nodejs", "python", "shell"],
    expectedNetworkPosture: "sandbox-none",
    filesystemExpectation: "workspace-rw-extended-runtime",
    supportedSkillFamilies: [
      "readonly-diagnostics",
      "coding-devtools",
      "messaging",
      "memory-backed",
      "external-api-configured",
    ],
    supportedCapabilityFamilies: [
      "filesystem-read",
      "filesystem-edit",
      "runtime-exec",
      "gateway-web",
      "memory",
      "sessions",
      "messaging",
      "automation",
      "nodes",
      "media",
      "plugin-brokered",
    ],
    unsupportedBehaviors: [
      "Automatic browser support without the dedicated browser runtime",
      "Treating extra packages from a custom common-image fork as official support expansion",
    ],
  },
  {
    id: "browser-automation",
    label: "Browser Automation",
    description:
      "Sandbox profile for browser and CDP-driven workflows when the sandbox browser runtime is enabled.",
    intendedWorkload:
      "Browser automation, page inspection, and web workflows that depend on the dedicated sandbox browser container.",
    trustPosture:
      "Sandboxed browser workload with isolated browser runtime and explicit broker/browser enablement requirements.",
    baselineExpectations:
      "Should pair the normal sandbox runtime with the dedicated sandbox browser runtime and must not claim browser support when browser sandboxing is disabled.",
    supportMode: "sandbox-browser-assisted",
    assistance: {
      sandboxLocal: true,
      gatewayBrokered: true,
      browser: true,
      remoteNode: false,
    },
    imageRules: [
      {
        kind: "exact",
        role: "docker",
        image: OFFICIAL_SANDBOX_BASE_IMAGE,
        note: "Browser automation still relies on the base sandbox runtime for non-browser local tools.",
      },
      {
        kind: "exact",
        role: "browser",
        image: OFFICIAL_SANDBOX_BROWSER_IMAGE,
        primary: true,
      },
    ],
    expectedBinaries: ["node", "npm", "git", "bash", "chrome"],
    expectedRuntimes: ["nodejs", "browser-cdp", "shell"],
    expectedNetworkPosture: "sandbox-browser-bridge",
    filesystemExpectation: "workspace-rw-with-browser",
    supportedSkillFamilies: [
      "readonly-diagnostics",
      "coding-devtools",
      "browser-web-automation",
      "messaging",
      "memory-backed",
      "external-api-configured",
    ],
    supportedCapabilityFamilies: [
      "filesystem-read",
      "filesystem-edit",
      "runtime-exec",
      "gateway-web",
      "memory",
      "sessions",
      "browser-automation",
      "messaging",
      "automation",
      "nodes",
      "media",
      "plugin-brokered",
    ],
    unsupportedBehaviors: [
      "Claiming browser support when agents.defaults.sandbox.browser.enabled=false",
      "Treating arbitrary browser-related packages in the base sandbox image as browser profile support",
    ],
    browserRuntimeRequired: true,
  },
] as const satisfies readonly SandboxRuntimeProfileMetadata[];

const SANDBOX_RUNTIME_PROFILE_BY_ID = new Map<SandboxRuntimeProfileId, SandboxRuntimeProfileMetadata>(
  SUPPORTED_SANDBOX_RUNTIME_PROFILES.map((profile) => [profile.id, profile]),
);

type SandboxRuntimeImageMatchResult = {
  profileId: SandboxRuntimeProfileId;
  rule: SandboxRuntimeImageMatchRule;
};

const SANDBOX_RUNTIME_PROFILE_IMAGE_RULES = SUPPORTED_SANDBOX_RUNTIME_PROFILES.flatMap((profile) =>
  profile.imageRules.map((rule) => ({
    profileId: profile.id,
    rule,
  })),
);

function includesHint(haystack: string, hints: readonly string[]): boolean {
  return hints.some((hint) => haystack.includes(hint));
}

export function isSandboxRuntimeProfileId(value: unknown): value is SandboxRuntimeProfileId {
  return (
    typeof value === "string" &&
    SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS.includes(value as SandboxRuntimeProfileId)
  );
}

export function isSandboxRuntimeSupportStatus(value: unknown): value is SandboxRuntimeSupportStatus {
  return (
    typeof value === "string" &&
    SANDBOX_RUNTIME_SUPPORT_STATUSES.includes(value as SandboxRuntimeSupportStatus)
  );
}

export function getSandboxRuntimeProfile(
  id: SandboxRuntimeProfileId,
): SandboxRuntimeProfileMetadata | undefined {
  return SANDBOX_RUNTIME_PROFILE_BY_ID.get(id);
}

export function matchSandboxRuntimeImage(params: {
  image?: string;
  role: SandboxRuntimeImageRole;
}): SandboxRuntimeImageMatchResult | undefined {
  const image = params.image?.trim();
  if (!image) {
    return undefined;
  }
  return SANDBOX_RUNTIME_PROFILE_IMAGE_RULES.find(
    (entry) =>
      entry.rule.role === params.role &&
      entry.rule.kind === "exact" &&
      entry.rule.image === image,
  );
}

export function getSandboxRuntimePrimaryImageRule(
  profileId: SandboxRuntimeProfileId,
  role?: SandboxRuntimeImageRole,
): SandboxRuntimeImageMatchRule | undefined {
  const profile = getSandboxRuntimeProfile(profileId);
  if (!profile) {
    return undefined;
  }
  const rules = role
    ? profile.imageRules.filter((rule) => rule.role === role)
    : [...profile.imageRules];
  return rules.find((rule) => rule.primary) ?? rules[0];
}

export function supportsSandboxRuntimeSkillFamily(
  profileId: SandboxRuntimeProfileId,
  family: SandboxRuntimeSkillFamilyId,
): boolean {
  const profile = getSandboxRuntimeProfile(profileId);
  return Boolean(profile?.supportedSkillFamilies.includes(family));
}

export function supportsSandboxRuntimeCapabilityFamily(
  profileId: SandboxRuntimeProfileId,
  family: SandboxRuntimeCapabilityFamilyId,
): boolean {
  const profile = getSandboxRuntimeProfile(profileId);
  return Boolean(profile?.supportedCapabilityFamilies.includes(family));
}

export function resolveCoreToolCapabilityFamily(
  toolId: string,
): SandboxRuntimeCapabilityFamilyId {
  switch (toolId) {
    case "read":
      return "filesystem-read";
    case "write":
    case "edit":
    case "apply_patch":
      return "filesystem-edit";
    case "exec":
    case "process":
      return "runtime-exec";
    case "web_search":
    case "web_fetch":
      return "gateway-web";
    case "memory_search":
    case "memory_get":
      return "memory";
    case "sessions_list":
    case "sessions_history":
    case "sessions_send":
    case "sessions_spawn":
    case "subagents":
    case "session_status":
    case "agents_list":
      return "sessions";
    case "browser":
    case "canvas":
      return "browser-automation";
    case "message":
      return "messaging";
    case "cron":
    case "gateway":
      return "automation";
    case "nodes":
      return "nodes";
    case "image_generate":
    case "image":
    case "tts":
      return "media";
    default:
      return "automation";
  }
}

export function inferSandboxSkillFamily(params: {
  name: string;
  source: string;
  skillKey: string;
  primaryEnv?: string;
  requirements?: {
    env?: string[];
    config?: string[];
  };
}): SandboxRuntimeSkillFamilyId {
  const descriptor = `${params.name} ${params.source} ${params.skillKey}`.toLowerCase();
  if (includesHint(descriptor, ["readonly", "doctor", "session-logs", "healthcheck"])) {
    return "readonly-diagnostics";
  }
  if (includesHint(descriptor, ["browser", "canvas", "peekaboo", "camsnap"])) {
    return "browser-web-automation";
  }
  if (
    includesHint(descriptor, [
      "discord",
      "slack",
      "voice-call",
      "voice_call",
      "imsg",
      "bluebubbles",
      "telegram",
      "matrix",
      "whatsapp",
    ])
  ) {
    return "messaging";
  }
  if (includesHint(descriptor, ["memory", "mongodb"])) {
    return "memory-backed";
  }
  if (
    Boolean(params.primaryEnv) ||
    (params.requirements?.env?.length ?? 0) > 0 ||
    (params.requirements?.config?.length ?? 0) > 0
  ) {
    return "external-api-configured";
  }
  return "coding-devtools";
}
