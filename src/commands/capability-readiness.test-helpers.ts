import type {
  CommandCapabilityFinding,
  CommandCapabilitySnapshot,
} from "./capability-readiness.js";
import {
  RESOLVED_CAPABILITY_CLASSES,
  buildResolvedSkillCapability,
  buildResolvedToolCapability,
  createResolvedCapabilityManifest,
  type ResolvedCapability,
  type ResolvedCapabilityClass,
  type ResolvedCapabilityRuntimeContext,
} from "../shared/resolved-capability-manifest.js";

const runtimeContext: ResolvedCapabilityRuntimeContext = {
  agentId: "main",
  sandboxMode: "all",
  sandboxScope: "session",
  sandboxed: true,
};

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
    disabled: capability.capabilityClass === "configured-but-blocked"
      ? capability.policy?.denyReason === "skill-disabled"
      : false,
    blockedByAllowlist: capability.capabilityClass === "configured-but-blocked"
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

function buildFindings(capabilities: ResolvedCapability[]): CommandCapabilityFinding[] {
  return [
    {
      id: "browser",
      label: "Browser",
      kind: "tool",
      capabilityClass: "configured-but-blocked",
      primaryReasonCategory: "policy-block",
      summary: "Denied by sandbox tool policy",
      detail: "tools.sandbox.tools.deny",
      remediation:
        "Adjust sandbox tool deny rules in tools.sandbox.tools.deny if this tool should be allowed.",
      policy: capabilities.find((capability) => capability.id === "browser" && capability.kind === "tool")
        ?.policy,
    },
    {
      id: "gws-toolkit",
      label: "gws-toolkit",
      kind: "skill",
      capabilityClass: "configured-but-blocked",
      primaryReasonCategory: "config-gap",
      summary: "Missing required environment configuration",
      detail: "GOOGLE_APPLICATION_CREDENTIALS",
      remediation:
        "Configure the missing environment for this capability via skills.entries.gws-toolkit.",
      policy: capabilities.find((capability) => capability.id === "gws-toolkit" && capability.kind === "skill")
        ?.policy,
    },
    {
      id: "memory-mongodb",
      label: "memory-mongodb",
      kind: "skill",
      capabilityClass: "unsupported-in-current-runtime",
      primaryReasonCategory: "projection-defect",
      summary: "Missing projected runtime material",
      detail: "Readonly projection missing required paths: /workspace/.openclaw-readonly/state/extensions",
      remediation: "Repair the sandbox projection so the required files and manifests are present.",
      evidence: capabilities.find(
        (capability) => capability.id === "memory-mongodb" && capability.kind === "skill",
      )?.evidence,
    },
    {
      id: "mac-clipboard",
      label: "mac-clipboard",
      kind: "skill",
      capabilityClass: "remote-node-assisted",
      primaryReasonCategory: "remote-assisted-availability",
      summary: "Available via remote node assistance",
      detail: "Remote note: paired macOS node provides clipboard access",
      evidence: capabilities.find(
        (capability) => capability.id === "mac-clipboard" && capability.kind === "skill",
      )?.evidence,
    },
    {
      id: "web_fetch",
      label: "Web Fetch",
      kind: "tool",
      capabilityClass: "gateway-brokered",
      primaryReasonCategory: "gateway-brokered-availability",
      summary: "Available via gateway broker",
      detail: "provider: gateway / gateway / rpc",
      evidence: capabilities.find(
        (capability) => capability.id === "web_fetch" && capability.kind === "tool",
      )?.evidence,
    },
  ];
}

export function createEmptyCapabilitySnapshotFixture(): CommandCapabilitySnapshot {
  const manifest = createResolvedCapabilityManifest({
    runtimeContext,
    capabilities: [],
  });
  return {
    runtimeContext,
    counts: {
      total: 0,
      byClass: Object.fromEntries(
        RESOLVED_CAPABILITY_CLASSES.map((capabilityClass) => [capabilityClass, 0]),
      ) as Record<ResolvedCapabilityClass, number>,
    },
    skills: [],
    toolGroups: [],
    manifest,
    findings: [],
  };
}

export function createCapabilitySnapshotFixture(): CommandCapabilitySnapshot {
  const sandboxLocalSkill = buildResolvedSkillCapability({
    name: "discord",
    description: "Discord skill",
    source: "workspace",
    skillKey: "discord",
    bundled: false,
    filePath: "/tmp/workspace/skills/discord/SKILL.md",
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
    name: "mac-clipboard",
    description: "Remote macOS clipboard",
    source: "workspace",
    skillKey: "mac-clipboard",
    bundled: false,
    filePath: "/tmp/workspace/skills/mac-clipboard/SKILL.md",
    requirements: { bins: ["pbpaste"], anyBins: [], env: [], config: [], os: ["darwin"] },
    missing: { bins: ["pbpaste"], anyBins: [], env: [], config: [], os: ["darwin"] },
    configChecks: [],
    disabled: false,
    blockedByAllowlist: false,
    remoteSatisfied: {
      os: ["darwin"],
      bins: ["pbpaste"],
      anyBins: [],
      note: "paired macOS node provides clipboard access",
    },
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
  const configGapSkill = buildResolvedSkillCapability({
    name: "gws-toolkit",
    description: "Google workspace toolkit",
    source: "workspace",
    skillKey: "gws-toolkit",
    bundled: false,
    filePath: "/tmp/workspace/skills/gws-toolkit/SKILL.md",
    primaryEnv: "GOOGLE_APPLICATION_CREDENTIALS",
    requirements: {
      bins: [],
      anyBins: [],
      env: ["GOOGLE_APPLICATION_CREDENTIALS"],
      config: [],
      os: [],
    },
    missing: {
      bins: [],
      anyBins: [],
      env: ["GOOGLE_APPLICATION_CREDENTIALS"],
      config: [],
      os: [],
    },
    configChecks: [],
    disabled: false,
    blockedByAllowlist: false,
    remoteSatisfied: null,
    runtimeContext,
  });
  const unsupportedSkill = buildResolvedSkillCapability({
    name: "memory-mongodb",
    description: "Mongo-backed memory skill",
    source: "workspace",
    skillKey: "memory-mongodb",
    bundled: false,
    filePath: "/tmp/workspace/skills/memory-mongodb/SKILL.md",
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

  const capabilities = [
    sandboxLocalSkill,
    gatewayBrokeredTool,
    remoteSkill,
    blockedTool,
    configGapSkill,
    unsupportedSkill,
  ];
  const manifest = createResolvedCapabilityManifest({
    runtimeContext,
    capabilities,
  });

  return {
    runtimeContext,
    counts: {
      total: capabilities.length,
      byClass: {
        "sandbox-local": 1,
        "gateway-brokered": 1,
        "remote-node-assisted": 1,
        "configured-but-blocked": 2,
        "unsupported-in-current-runtime": 1,
      },
    },
    skills: [
      buildSkillEntry(sandboxLocalSkill),
      buildSkillEntry(remoteSkill),
      buildSkillEntry(configGapSkill),
      buildSkillEntry(unsupportedSkill),
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
            defaultProfiles: gatewayBrokeredTool.defaultProfiles,
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
            defaultProfiles: blockedTool.defaultProfiles,
            capabilityClass: blockedTool.capabilityClass,
            capability: blockedTool,
          },
        ],
      },
    ],
    manifest,
    findings: buildFindings(capabilities),
  };
}
