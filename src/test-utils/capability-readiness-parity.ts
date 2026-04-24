import type { ResolvedToolCatalogGroup } from "../agents/capabilities/index.js";
import type { SkillStatusReport } from "../agents/skills-status.js";
import type { ToolProfileId } from "../agents/tool-catalog.js";
import {
  buildCommandCapabilitySnapshot,
  createCommandCapabilityFinding,
  type CommandCapabilityFinding,
  type CommandCapabilityReasonCategory,
  type CommandCapabilitySnapshot,
} from "../commands/capability-readiness.js";
import {
  buildResolvedSkillCapability,
  buildResolvedToolCapability,
  createResolvedCapabilityManifest,
  type ResolvedCapability,
  type ResolvedCapabilityClass,
  type ResolvedCapabilityRuntimeContext,
} from "../shared/resolved-capability-manifest.js";

export type CapabilityParityRow = {
  subject: string;
  kind: ResolvedCapability["kind"];
  capabilityClass: ResolvedCapabilityClass;
  primaryReasonCategory: CommandCapabilityReasonCategory | null;
};

export const CAPABILITY_READINESS_PARITY_MATRIX: CapabilityParityRow[] = [
  {
    subject: "local-skill",
    kind: "skill",
    capabilityClass: "sandbox-local",
    primaryReasonCategory: null,
  },
  {
    subject: "web_fetch",
    kind: "tool",
    capabilityClass: "gateway-brokered",
    primaryReasonCategory: "gateway-brokered-availability",
  },
  {
    subject: "remote-mac-skill",
    kind: "skill",
    capabilityClass: "remote-node-assisted",
    primaryReasonCategory: "remote-assisted-availability",
  },
  {
    subject: "env-blocked-skill",
    kind: "skill",
    capabilityClass: "configured-but-blocked",
    primaryReasonCategory: "config-gap",
  },
  {
    subject: "browser",
    kind: "tool",
    capabilityClass: "configured-but-blocked",
    primaryReasonCategory: "policy-block",
  },
  {
    subject: "projection-defect-skill",
    kind: "skill",
    capabilityClass: "unsupported-in-current-runtime",
    primaryReasonCategory: "projection-defect",
  },
  {
    subject: "unsupported-runtime-skill",
    kind: "skill",
    capabilityClass: "unsupported-in-current-runtime",
    primaryReasonCategory: "runtime-profile-gap",
  },
];

export const CAPABILITY_PARITY_GATEWAY_SKILL_SUBJECTS = [
  "local-skill",
  "remote-mac-skill",
  "env-blocked-skill",
  "unsupported-runtime-skill",
] as const;

export const CAPABILITY_PARITY_SKILL_SUBJECTS = [
  "local-skill",
  "remote-mac-skill",
  "env-blocked-skill",
  "projection-defect-skill",
  "unsupported-runtime-skill",
] as const;

export const CAPABILITY_PARITY_READONLY_SUBJECTS = [
  "local-skill",
  "web_fetch",
  "remote-mac-skill",
  "env-blocked-skill",
  "browser",
  "projection-defect-skill",
  "unsupported-runtime-skill",
] as const;

const CAPABILITY_PARITY_ORDER = new Map(
  CAPABILITY_READINESS_PARITY_MATRIX.map((row, index) => [row.subject, index]),
);

const runtimeContext: ResolvedCapabilityRuntimeContext = {
  agentId: "main",
  sandboxMode: "all",
  sandboxScope: "session",
  sandboxed: true,
};

function sortCapabilityParityRows(rows: CapabilityParityRow[]): CapabilityParityRow[] {
  return [...rows].toSorted((left, right) => {
    const leftOrder = CAPABILITY_PARITY_ORDER.get(left.subject) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = CAPABILITY_PARITY_ORDER.get(right.subject) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }
    return left.subject.localeCompare(right.subject);
  });
}

function normalizeParityRow(capability: ResolvedCapability): CapabilityParityRow {
  const finding = createCommandCapabilityFinding(capability);
  return {
    subject: capability.id,
    kind: capability.kind,
    capabilityClass: capability.capabilityClass,
    primaryReasonCategory: finding?.primaryReasonCategory ?? null,
  };
}

function buildSkillEntry(capability: ReturnType<typeof buildResolvedSkillCapability>) {
  const remoteSatisfied =
    capability.capabilityClass === "remote-node-assisted"
      ? {
          os: capability.evidence.remote.satisfiedOs,
          bins: capability.evidence.remote.satisfiedBins,
          anyBins: capability.evidence.remote.satisfiedAnyBins,
          note: capability.evidence.remote.note,
        }
      : null;

  return {
    name: capability.id,
    description: capability.description,
    source: capability.source,
    bundled: capability.bundled ?? false,
    filePath: capability.filePath,
    baseDir: "/tmp/workspace/skills",
    skillKey: capability.skillKey,
    primaryEnv: capability.primaryEnv,
    always: false,
    disabled:
      capability.capabilityClass === "configured-but-blocked"
        ? capability.policy?.denyReason === "skill-disabled"
        : false,
    blockedByAllowlist:
      capability.capabilityClass === "configured-but-blocked"
        ? capability.policy?.denyReason === "bundled-skill-not-allowlisted"
        : false,
    eligible:
      capability.capabilityClass === "sandbox-local" ||
      capability.capabilityClass === "remote-node-assisted",
    capabilityClass: capability.capabilityClass,
    capability,
    requirements: capability.requirements,
    missing: capability.missing,
    configChecks: capability.configChecks,
    remoteSatisfied,
    install: [],
  };
}

export function filterCapabilityParityRows(subjects: readonly string[]): CapabilityParityRow[] {
  const allowed = new Set(subjects);
  return sortCapabilityParityRows(
    CAPABILITY_READINESS_PARITY_MATRIX.filter((row) => allowed.has(row.subject)),
  );
}

export function normalizeResolvedCapabilitiesParityRows(
  capabilities: readonly ResolvedCapability[],
): CapabilityParityRow[] {
  return sortCapabilityParityRows(capabilities.map(normalizeParityRow));
}

export function normalizeSkillStatusParityRows(
  skills: SkillStatusReport["skills"],
): CapabilityParityRow[] {
  return sortCapabilityParityRows(
    skills.map((skill) => ({
      subject: skill.name,
      kind: "skill" as const,
      capabilityClass: skill.capabilityClass,
      primaryReasonCategory:
        createCommandCapabilityFinding(skill.capability)?.primaryReasonCategory ?? null,
    })),
  );
}

export function normalizeToolGroupParityRows(
  toolGroups: readonly ResolvedToolCatalogGroup[],
): CapabilityParityRow[] {
  const rows: CapabilityParityRow[] = [];
  for (const group of toolGroups) {
    for (const tool of group.tools) {
      rows.push({
        subject: tool.id,
        kind: "tool",
        capabilityClass: tool.capabilityClass,
        primaryReasonCategory:
          createCommandCapabilityFinding(tool.capability)?.primaryReasonCategory ?? null,
      });
    }
  }
  return sortCapabilityParityRows(rows);
}

export function normalizeCommandCapabilityFindingRows(
  findings: readonly CommandCapabilityFinding[],
): CapabilityParityRow[] {
  return sortCapabilityParityRows(
    findings.map((finding) => ({
      subject: finding.id,
      kind: finding.kind,
      capabilityClass: finding.capabilityClass,
      primaryReasonCategory: finding.primaryReasonCategory,
    })),
  );
}

export function normalizeCapabilitySnapshotParityRows(
  snapshot: Pick<CommandCapabilitySnapshot, "manifest">,
): CapabilityParityRow[] {
  return normalizeResolvedCapabilitiesParityRows(snapshot.manifest.capabilities);
}

export function createEmptyCapabilitySnapshotFixture(): CommandCapabilitySnapshot {
  return buildCommandCapabilitySnapshot({
    manifest: createResolvedCapabilityManifest({
      runtimeContext,
      capabilities: [],
    }),
    skills: [],
    toolGroups: [],
  });
}

export function createCapabilityParitySnapshotFixture(): CommandCapabilitySnapshot {
  const localSkill = buildResolvedSkillCapability({
    name: "local-skill",
    description: "Local workspace skill",
    source: "workspace",
    skillKey: "local-skill",
    bundled: false,
    filePath: "/tmp/workspace/skills/local-skill/SKILL.md",
    requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
    missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
    configChecks: [],
    disabled: false,
    blockedByAllowlist: false,
    remoteSatisfied: null,
    runtimeContext,
  });
  const gatewayBrokeredTool = buildResolvedToolCapability({
    id: "web_fetch",
    label: "Web Fetch",
    description: "Gateway web fetch",
    source: "core",
    defaultProfiles: ["coding"],
    runtimeContext,
    capabilityClass: "gateway-brokered",
    evidence: {
      provider: {
        providerId: "gateway",
        providerKind: "gateway",
        transport: "rpc",
        reasonCodes: [],
      },
    },
  });
  const remoteSkill = buildResolvedSkillCapability({
    name: "remote-mac-skill",
    description: "Remote macOS clipboard",
    source: "workspace",
    skillKey: "remote-mac-skill",
    bundled: false,
    filePath: "/tmp/workspace/skills/remote-mac-skill/SKILL.md",
    requirements: { bins: ["xcodebuild"], anyBins: [], env: [], config: [], os: ["darwin"] },
    missing: { bins: ["xcodebuild"], anyBins: [], env: [], config: [], os: ["darwin"] },
    configChecks: [],
    disabled: false,
    blockedByAllowlist: false,
    remoteSatisfied: {
      os: ["darwin"],
      bins: ["xcodebuild"],
      anyBins: [],
      note: "paired macOS node provides clipboard access",
    },
    runtimeContext,
  });
  const blockedSkill = buildResolvedSkillCapability({
    name: "env-blocked-skill",
    description: "Skill missing required env",
    source: "workspace",
    skillKey: "env-blocked-skill",
    bundled: false,
    filePath: "/tmp/workspace/skills/env-blocked-skill/SKILL.md",
    primaryEnv: "MISSING_GATEWAY_TEST_ENV",
    requirements: {
      bins: [],
      anyBins: [],
      env: ["MISSING_GATEWAY_TEST_ENV"],
      config: [],
      os: [],
    },
    missing: {
      bins: [],
      anyBins: [],
      env: ["MISSING_GATEWAY_TEST_ENV"],
      config: [],
      os: [],
    },
    configChecks: [],
    disabled: false,
    blockedByAllowlist: false,
    remoteSatisfied: null,
    runtimeContext,
  });
  const blockedTool = buildResolvedToolCapability({
    id: "browser",
    label: "Browser",
    description: "Browser automation",
    source: "core",
    defaultProfiles: ["full"],
    runtimeContext,
    capabilityClass: "configured-but-blocked",
    policy: {
      source: {
        kind: "sandbox-tool-policy",
        key: "tools.sandbox.tools.deny",
      },
      denyReason: "tool-denied-by-sandbox-policy",
    },
  });
  const projectionDefectSkill = buildResolvedSkillCapability({
    name: "projection-defect-skill",
    description: "Skill missing readonly projection",
    source: "workspace",
    skillKey: "projection-defect-skill",
    bundled: false,
    filePath: "/tmp/workspace/skills/projection-defect-skill/SKILL.md",
    requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
    missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
    configChecks: [],
    disabled: false,
    blockedByAllowlist: false,
    remoteSatisfied: null,
    runtimeContext,
    runtimeReasonCodes: ["missing-projection"],
    runtimeDetail:
      "Readonly projection missing required paths: /workspace/.openclaw-readonly/state/extensions",
  });
  const unsupportedRuntimeSkill = buildResolvedSkillCapability({
    name: "unsupported-runtime-skill",
    description: "Skill requiring an unsupported runtime",
    source: "workspace",
    skillKey: "unsupported-runtime-skill",
    bundled: false,
    filePath: "/tmp/workspace/skills/unsupported-runtime-skill/SKILL.md",
    requirements: { bins: [], anyBins: [], env: [], config: [], os: ["never-supported-sbx207"] },
    missing: { bins: [], anyBins: [], env: [], config: [], os: ["never-supported-sbx207"] },
    configChecks: [],
    disabled: false,
    blockedByAllowlist: false,
    remoteSatisfied: null,
    runtimeContext,
  });

  const manifest = createResolvedCapabilityManifest({
    runtimeContext,
    capabilities: [
      localSkill,
      gatewayBrokeredTool,
      remoteSkill,
      blockedSkill,
      blockedTool,
      projectionDefectSkill,
      unsupportedRuntimeSkill,
    ],
  });

  return buildCommandCapabilitySnapshot({
    manifest,
    skills: [
      buildSkillEntry(localSkill),
      buildSkillEntry(remoteSkill),
      buildSkillEntry(blockedSkill),
      buildSkillEntry(projectionDefectSkill),
      buildSkillEntry(unsupportedRuntimeSkill),
    ],
    toolGroups: [
      {
        id: "core:network",
        label: "Network",
        source: "core",
        tools: [
          {
            id: gatewayBrokeredTool.id,
            label: gatewayBrokeredTool.label,
            description: gatewayBrokeredTool.description,
            source: gatewayBrokeredTool.source,
            defaultProfiles: (gatewayBrokeredTool.defaultProfiles ?? []) as ToolProfileId[],
            capabilityClass: gatewayBrokeredTool.capabilityClass,
            capability: gatewayBrokeredTool,
          },
        ],
      },
      {
        id: "core:browser",
        label: "Browser",
        source: "core",
        tools: [
          {
            id: blockedTool.id,
            label: blockedTool.label,
            description: blockedTool.description,
            source: blockedTool.source,
            defaultProfiles: (blockedTool.defaultProfiles ?? []) as ToolProfileId[],
            capabilityClass: blockedTool.capabilityClass,
            capability: blockedTool,
          },
        ],
      },
    ],
  });
}

export function createCapabilityParitySkillStatusReportFixture(): SkillStatusReport {
  const snapshot = createCapabilityParitySnapshotFixture();
  return {
    workspaceDir: "/tmp/workspace",
    managedSkillsDir: "/tmp/workspace/.managed-skills",
    skills: snapshot.skills,
  };
}
