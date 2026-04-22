import { describe, expect, it } from "vitest";
import {
  RESOLVED_CAPABILITY_CLASSES,
  RESOLVED_CAPABILITY_DENY_REASONS,
  RESOLVED_CAPABILITY_POLICY_SOURCE_KINDS,
  RESOLVED_CAPABILITY_UNAVAILABLE_REASONS,
  adaptToolCatalogEntryToResolvedCapability,
  buildResolvedSkillCapability,
  buildResolvedToolCapability,
  createResolvedCapabilityManifest,
  isResolvedCapabilityManifest,
} from "./resolved-capability-manifest.js";

describe("resolved capability manifest", () => {
  it("keeps the architecture enum values stable", () => {
    expect(RESOLVED_CAPABILITY_CLASSES).toEqual([
      "sandbox-local",
      "gateway-brokered",
      "remote-node-assisted",
      "configured-but-blocked",
      "unsupported-in-current-runtime",
    ]);
    expect(RESOLVED_CAPABILITY_DENY_REASONS).toContain("tool-denied-by-sandbox-policy");
    expect(RESOLVED_CAPABILITY_POLICY_SOURCE_KINDS).toContain("bundled-skill-allowlist");
    expect(RESOLVED_CAPABILITY_UNAVAILABLE_REASONS).toContain("missing-runtime-binaries");
  });

  it("creates JSON-serializable manifests that round-trip through the runtime guard", () => {
    const capability = buildResolvedSkillCapability({
      name: "openclaw-readonly",
      description: "readonly diagnostics",
      source: "openclaw-bundled",
      skillKey: "openclaw-readonly",
      bundled: true,
      filePath: "/tmp/openclaw-readonly/SKILL.md",
      requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
      missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
      configChecks: [],
      disabled: false,
      blockedByAllowlist: false,
      remoteSatisfied: null,
      runtimeContext: { agentId: "main", sandboxMode: "all", sandboxed: true },
    });

    const manifest = createResolvedCapabilityManifest({
      runtimeContext: capability.runtimeContext,
      capabilities: [capability],
    });
    const roundTripped = JSON.parse(JSON.stringify(manifest));

    expect(isResolvedCapabilityManifest(roundTripped)).toBe(true);
    expect(roundTripped.capabilities[0]?.capabilityClass).toBe("sandbox-local");
  });

  it("rejects manifests that rename capability classes", () => {
    const invalid = {
      schemaVersion: 1,
      runtimeContext: { agentId: "main" },
      capabilities: [
        {
          id: "bash",
          label: "bash",
          description: "shell",
          kind: "tool",
          capabilityClass: "gateway-proxied",
          runtimeContext: { agentId: "main" },
          source: "core",
        },
      ],
    };

    expect(isResolvedCapabilityManifest(invalid)).toBe(false);
  });

  it("requires policy metadata for blocked tool capabilities", () => {
    expect(() =>
      buildResolvedToolCapability({
        id: "bash",
        label: "bash",
        description: "sandbox shell",
        source: "core",
        capabilityClass: "configured-but-blocked",
        runtimeContext: { agentId: "main" },
      } as never),
    ).toThrow(/missing policy metadata/);
  });

  it("builds gateway-brokered tool capabilities with synthetic provider evidence", () => {
    const capability = buildResolvedToolCapability({
      id: "web_fetch",
      label: "web_fetch",
      description: "gateway-brokered fetch",
      source: "core",
      capabilityClass: "gateway-brokered",
      runtimeContext: { agentId: "main", sandboxMode: "all", sandboxed: true },
      evidence: {
        provider: {
          providerId: "gateway",
          providerKind: "gateway",
          transport: "rpc",
          reasonCodes: [],
        },
      },
      defaultProfiles: ["coding", "full"],
    });

    expect(capability.kind).toBe("tool");
    expect(capability.capabilityClass).toBe("gateway-brokered");
    expect(capability.evidence?.provider?.transport).toBe("rpc");
  });

  it("adapts tool catalog entries into sandbox-local capabilities by default", () => {
    const capability = adaptToolCatalogEntryToResolvedCapability({
      id: "tts",
      label: "tts",
      description: "text to speech",
      source: "core",
      defaultProfiles: ["messaging", "full"],
      runtimeContext: { agentId: "main" },
    });

    expect(capability.kind).toBe("tool");
    expect(capability.capabilityClass).toBe("sandbox-local");
    expect(capability.defaultProfiles).toEqual(["messaging", "full"]);
  });

  it("prefers remote-node-assisted for skills with remote-backed runtime gaps", () => {
    const capability = buildResolvedSkillCapability({
      name: "remote-mac-skill",
      description: "remote mac helper",
      source: "openclaw-bundled",
      skillKey: "remote-mac-skill",
      bundled: true,
      filePath: "/tmp/remote-mac-skill/SKILL.md",
      requirements: { bins: ["xcodebuild"], anyBins: [], env: [], config: [], os: [] },
      missing: { bins: ["xcodebuild"], anyBins: [], env: [], config: [], os: [] },
      configChecks: [],
      disabled: false,
      blockedByAllowlist: false,
      remoteSatisfied: {
        bins: ["xcodebuild"],
        anyBins: [],
        os: ["darwin"],
        note: "Remote macOS node available.",
      },
      runtimeContext: { agentId: "main", sandboxed: true },
    });

    expect(capability.capabilityClass).toBe("remote-node-assisted");
    expect(capability.evidence?.runtime?.missingBins).toEqual(["xcodebuild"]);
    expect(capability.evidence?.remote?.satisfiedBins).toEqual(["xcodebuild"]);
  });

  it("supports explicit runtime profile and projection-derived reasons for skills", () => {
    const capability = buildResolvedSkillCapability({
      name: "profiled-skill",
      description: "profiled skill",
      source: "openclaw-bundled",
      skillKey: "profiled-skill",
      bundled: true,
      filePath: "/tmp/profiled-skill/SKILL.md",
      requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
      missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
      configChecks: [],
      disabled: false,
      blockedByAllowlist: false,
      remoteSatisfied: null,
      runtimeContext: { agentId: "main", sandboxed: true },
      runtimeProfile: "ops-readonly",
      runtimeReasonCodes: ["missing-runtime-profile", "missing-projection"],
      runtimeDetail: "Readonly projection incomplete.",
    });

    expect(capability.capabilityClass).toBe("unsupported-in-current-runtime");
    expect(capability.evidence?.runtime?.profile).toBe("ops-readonly");
    expect(capability.evidence?.runtime?.reasonCodes).toEqual([
      "missing-runtime-profile",
      "missing-projection",
    ]);
    expect(capability.evidence?.runtime?.detail).toBe("Readonly projection incomplete.");
  });

  it("requires remote evidence for remote-assisted tool capabilities", () => {
    expect(() =>
      buildResolvedToolCapability({
        id: "xcodebuild",
        label: "xcodebuild",
        description: "macOS build helper",
        source: "plugin",
        pluginId: "remote-mac",
        capabilityClass: "remote-node-assisted",
        runtimeContext: { agentId: "main" },
        evidence: {},
      } as never),
    ).toThrow(/missing remote evidence/);
  });

  it("rejects blocked manifests with unknown policy source kinds", () => {
    const invalid = {
      schemaVersion: 1,
      runtimeContext: { agentId: "main" },
      capabilities: [
        {
          id: "discord",
          label: "discord",
          description: "discord skill",
          kind: "skill",
          capabilityClass: "configured-but-blocked",
          runtimeContext: { agentId: "main" },
          skillKey: "discord",
          source: "openclaw-bundled",
          filePath: "/tmp/discord/SKILL.md",
          requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
          missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
          configChecks: [],
          policy: {
            source: {
              kind: "gateway-policy",
              key: "skills.allowBundled",
            },
            denyReason: "bundled-skill-not-allowlisted",
          },
        },
      ],
    };

    expect(isResolvedCapabilityManifest(invalid)).toBe(false);
  });

  it("rejects blocked manifests with malformed optional policy detail fields", () => {
    const invalid = {
      schemaVersion: 1,
      runtimeContext: { agentId: "main", sandboxed: "true" },
      capabilities: [
        {
          id: "discord",
          label: "discord",
          description: "discord skill",
          kind: "skill",
          capabilityClass: "configured-but-blocked",
          runtimeContext: { agentId: "main", sandboxMode: "all", sandboxed: true },
          skillKey: "discord",
          source: "openclaw-bundled",
          filePath: "/tmp/discord/SKILL.md",
          requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
          missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
          configChecks: [],
          policy: {
            source: {
              kind: "bundled-skill-allowlist",
              key: "skills.allowBundled",
              detail: 42,
            },
            denyReason: "bundled-skill-not-allowlisted",
            detail: 42,
          },
        },
      ],
    };

    expect(isResolvedCapabilityManifest(invalid)).toBe(false);
  });

  it("rejects unsupported skill manifests that omit runtime evidence", () => {
    const invalid = {
      schemaVersion: 1,
      runtimeContext: { agentId: "main" },
      capabilities: [
        {
          id: "trello",
          label: "trello",
          description: "trello skill",
          kind: "skill",
          capabilityClass: "unsupported-in-current-runtime",
          runtimeContext: { agentId: "main" },
          skillKey: "trello",
          source: "openclaw-bundled",
          filePath: "/tmp/trello/SKILL.md",
          requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
          missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
          configChecks: [],
          evidence: {
            provider: {
              providerId: "gateway",
              reasonCodes: ["missing-provider"],
            },
          },
        },
      ],
    };

    expect(isResolvedCapabilityManifest(invalid)).toBe(false);
  });
});
