import type { ResolvedToolCatalogGroup } from "../agents/capabilities/index.js";
import type { SkillStatusReport } from "../agents/skills-status.js";
import type { ToolProfileId } from "../agents/tool-catalog.js";
import {
  buildCommandCapabilitySnapshot,
  createCommandCapabilityFinding,
  type CommandCapabilityFinding,
  type CommandCapabilitySnapshot,
} from "../commands/capability-readiness.js";
import {
  buildResolvedSkillCapability,
  buildResolvedToolCapability,
  createResolvedCapabilityManifest,
  type ResolvedCapability,
  type ResolvedCapabilityRuntimeContext,
} from "../shared/resolved-capability-manifest.js";
import {
  CAPABILITY_PARITY_GATEWAY_SKILL_SUBJECTS,
  CAPABILITY_PARITY_READONLY_SUBJECTS,
  CAPABILITY_PARITY_SKILL_SUBJECTS,
  CAPABILITY_READINESS_PARITY_MATRIX,
  filterCapabilityParityRows,
  sortCapabilityParityRows,
  type CapabilityParityRow,
} from "./capability-readiness-parity-matrix.js";

export {
  CAPABILITY_PARITY_GATEWAY_SKILL_SUBJECTS,
  CAPABILITY_PARITY_READONLY_SUBJECTS,
  CAPABILITY_PARITY_SKILL_SUBJECTS,
  CAPABILITY_READINESS_PARITY_MATRIX,
  filterCapabilityParityRows,
  type CapabilityParityRow,
} from "./capability-readiness-parity-matrix.js";

const runtimeContext: ResolvedCapabilityRuntimeContext = {
  agentId: "main",
  sandboxMode: "all",
  sandboxScope: "session",
  sandboxed: true,
};

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
    baseDir: capability.filePath.replace(/\/SKILL\.md$/, ""),
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
