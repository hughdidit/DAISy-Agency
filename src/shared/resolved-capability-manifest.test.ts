import { describe, expect, it } from "vitest";
import {
  RESOLVED_CAPABILITY_CLASSES,
  RESOLVED_CAPABILITY_DENY_REASONS,
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
});
