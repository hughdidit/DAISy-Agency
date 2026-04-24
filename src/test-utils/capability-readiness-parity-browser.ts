import {
  buildResolvedSkillCapability,
  type ResolvedCapability,
  type ResolvedCapabilityClass,
  type ResolvedCapabilityEvidence,
  type ResolvedCapabilityRuntimeContext,
  type ResolvedSkillCapability,
} from "../shared/resolved-capability-manifest.js";
import {
  CAPABILITY_PARITY_SKILL_SUBJECTS,
  filterCapabilityParityRows,
  sortCapabilityParityRows,
  type CapabilityParityRow,
} from "./capability-readiness-parity-matrix.js";

type BrowserSkillStatusEntry = {
  name: string;
  description: string;
  source: string;
  bundled: boolean;
  filePath: string;
  baseDir: string;
  skillKey: string;
  primaryEnv?: string;
  always: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  eligible: boolean;
  capabilityClass: ResolvedCapabilityClass;
  capability: ResolvedSkillCapability;
  requirements: ResolvedSkillCapability["requirements"];
  missing: ResolvedSkillCapability["missing"];
  configChecks: ResolvedSkillCapability["configChecks"];
  remoteSatisfied: {
    os: string[];
    bins: string[];
    anyBins: string[];
    note?: string;
  } | null;
  install: [];
};

export type BrowserSkillStatusReport = {
  workspaceDir: string;
  managedSkillsDir: string;
  skills: BrowserSkillStatusEntry[];
};

const runtimeContext: ResolvedCapabilityRuntimeContext = {
  agentId: "main",
  sandboxMode: "all",
  sandboxScope: "session",
  sandboxed: true,
};

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

function determineCapabilityReasonCategory(
  capability: ResolvedCapability | undefined,
  capabilityClass: ResolvedCapabilityClass,
): CapabilityParityRow["primaryReasonCategory"] {
  switch (capabilityClass) {
    case "sandbox-local":
      return null;
    case "gateway-brokered":
      return "gateway-brokered-availability";
    case "remote-node-assisted":
      return "remote-assisted-availability";
    case "configured-but-blocked":
      return capability?.policy?.denyReason === "missing-required-env" ||
        capability?.policy?.denyReason === "missing-required-config"
        ? "config-gap"
        : "policy-block";
    case "unsupported-in-current-runtime":
      if (hasProjectionGap(capability?.evidence)) {
        return "projection-defect";
      }
      if (hasProviderGap(capability?.evidence)) {
        return "gateway-brokered-availability";
      }
      return "runtime-profile-gap";
  }
}

function buildSkillEntry(capability: ResolvedSkillCapability): BrowserSkillStatusEntry {
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
      capability.capabilityClass === "configured-but-blocked" &&
      capability.policy?.denyReason === "skill-disabled",
    blockedByAllowlist:
      capability.capabilityClass === "configured-but-blocked" &&
      capability.policy?.denyReason === "bundled-skill-not-allowlisted",
    eligible:
      capability.capabilityClass === "sandbox-local" ||
      capability.capabilityClass === "remote-node-assisted",
    capabilityClass: capability.capabilityClass,
    capability,
    requirements: capability.requirements,
    missing: capability.missing,
    configChecks: capability.configChecks,
    remoteSatisfied:
      capability.capabilityClass === "remote-node-assisted"
        ? {
            os: capability.evidence.remote.satisfiedOs,
            bins: capability.evidence.remote.satisfiedBins,
            anyBins: capability.evidence.remote.satisfiedAnyBins,
            note: capability.evidence.remote.note,
          }
        : null,
    install: [],
  };
}

export function normalizeSkillStatusParityRows(
  skills: readonly Pick<BrowserSkillStatusEntry, "name" | "capabilityClass" | "capability">[],
): CapabilityParityRow[] {
  return sortCapabilityParityRows(
    skills.map((skill) => ({
      subject: skill.name,
      kind: "skill" as const,
      capabilityClass: skill.capabilityClass,
      primaryReasonCategory: determineCapabilityReasonCategory(
        skill.capability,
        skill.capabilityClass,
      ),
    })),
  );
}

export function createCapabilityParitySkillStatusReportFixture(): BrowserSkillStatusReport {
  const skills = [
    buildResolvedSkillCapability({
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
    }),
    buildResolvedSkillCapability({
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
    }),
    buildResolvedSkillCapability({
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
    }),
    buildResolvedSkillCapability({
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
    }),
    buildResolvedSkillCapability({
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
    }),
  ].map(buildSkillEntry);

  return {
    workspaceDir: "/tmp/workspace",
    managedSkillsDir: "/tmp/workspace/.managed-skills",
    skills,
  };
}

export { CAPABILITY_PARITY_SKILL_SUBJECTS, filterCapabilityParityRows, type CapabilityParityRow };
