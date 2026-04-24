import AjvPkg from "ajv";
import { describe, expect, it } from "vitest";
import { ResolvedCapabilityManifestSchema } from "../../gateway/protocol/schema/agents-models-skills.js";
import { resolveCapabilityManifest } from "./resolve.js";
import type {
  CapabilityResolutionInput,
  CollectedSkillCapabilityInput,
  CollectedToolCapabilityInput,
} from "./types.js";

function createAjv() {
  return new (AjvPkg as unknown as new (opts?: object) => import("ajv").default)({
    allErrors: true,
    strict: false,
  });
}

const runtimeContext: CapabilityResolutionInput["runtimeContext"] = {
  agentId: "main",
  sandboxMode: "all",
  sandboxScope: "session",
  runtimeProfile: "coding-base",
  sandboxed: true,
};

const toolPolicy: CollectedToolCapabilityInput["toolPolicy"] = {
  allow: [],
  deny: [],
  sources: {
    allow: { source: "default", key: "tools.sandbox.tools.allow" },
    deny: { source: "default", key: "tools.sandbox.tools.deny" },
  },
};

function createSkillInput(
  overrides: Partial<CollectedSkillCapabilityInput> = {},
): CollectedSkillCapabilityInput {
  return {
    matchKey: "skill:openclaw-bundled:/tmp/skill/SKILL.md:test-skill:test-skill",
    sortKey: "skill:001:test-skill",
    name: "test-skill",
    description: "test skill",
    source: "openclaw-bundled",
    bundled: true,
    filePath: "/tmp/skill/SKILL.md",
    baseDir: "/tmp/skill",
    skillKey: "test-skill",
    always: false,
    disabled: false,
    blockedByAllowlist: false,
    eligible: true,
    requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
    missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
    configChecks: [],
    remoteSatisfied: null,
    install: [],
    runtimeContext,
    ...overrides,
  };
}

function createToolInput(
  overrides: Partial<CollectedToolCapabilityInput> = {},
): CollectedToolCapabilityInput {
  return {
    matchKey: "tool:core::read",
    sortKey: "tool:001:read",
    id: "read",
    label: "read",
    description: "Read file contents",
    source: "core",
    defaultProfiles: ["coding"],
    groupId: "fs",
    groupLabel: "Files",
    groupSource: "core",
    runtimeContext,
    toolPolicy,
    intent: "sandbox-local",
    ...overrides,
  };
}

describe("capability resolver", () => {
  it("resolves skill precedence in a deterministic order", () => {
    const manifest = resolveCapabilityManifest({
      runtimeContext,
      skills: [
        createSkillInput({
          name: "disabled-skill",
          skillKey: "disabled-skill",
          matchKey: "skill:openclaw-bundled:/tmp/disabled/SKILL.md:disabled-skill:disabled-skill",
          filePath: "/tmp/disabled/SKILL.md",
          sortKey: "skill:003:disabled-skill",
          disabled: true,
          eligible: false,
        }),
        createSkillInput({
          name: "remote-skill",
          skillKey: "remote-skill",
          matchKey: "skill:openclaw-bundled:/tmp/remote/SKILL.md:remote-skill:remote-skill",
          filePath: "/tmp/remote/SKILL.md",
          sortKey: "skill:002:remote-skill",
          requirements: { bins: ["xcodebuild"], anyBins: [], env: [], config: [], os: [] },
          missing: { bins: ["xcodebuild"], anyBins: [], env: [], config: [], os: [] },
          remoteSatisfied: {
            bins: ["xcodebuild"],
            anyBins: [],
            os: ["darwin"],
            note: "Remote macOS node available.",
          },
        }),
        createSkillInput({
          name: "projection-skill",
          skillKey: "projection-skill",
          matchKey:
            "skill:openclaw-bundled:/tmp/projection/SKILL.md:projection-skill:projection-skill",
          filePath: "/tmp/projection/SKILL.md",
          sortKey: "skill:001:projection-skill",
          availability: {
            projection: {
              missingPaths: ["/workspace/.openclaw-readonly/openclaw.json"],
              reasonCodes: ["missing-projection"],
              detail: "Readonly projection incomplete.",
            },
          },
          eligible: false,
        }),
      ],
      tools: [],
    });

    expect(manifest.capabilities.map((capability) => capability.id)).toEqual([
      "projection-skill",
      "remote-skill",
      "disabled-skill",
    ]);

    const projection = manifest.capabilities[0];
    const remote = manifest.capabilities[1];
    const disabled = manifest.capabilities[2];

    expect(projection?.capabilityClass).toBe("unsupported-in-current-runtime");
    expect(projection?.kind).toBe("skill");
    expect(projection?.evidence?.runtime?.reasonCodes).toContain("missing-projection");
    expect(remote?.capabilityClass).toBe("remote-node-assisted");
    expect(disabled?.capabilityClass).toBe("configured-but-blocked");
  });

  it("resolves blocked, brokered, unsupported, and local tools", () => {
    const manifest = resolveCapabilityManifest({
      runtimeContext,
      skills: [],
      tools: [
        createToolInput({
          id: "blocked-tool",
          label: "blocked-tool",
          matchKey: "tool:core::blocked-tool",
          sortKey: "tool:001:blocked-tool",
          toolPolicy: {
            ...toolPolicy,
            deny: ["blocked-tool"],
          },
        }),
        createToolInput({
          id: "web_fetch",
          label: "web_fetch",
          description: "Gateway fetch",
          matchKey: "tool:core::web_fetch",
          sortKey: "tool:002:web_fetch",
          intent: "gateway-brokered",
          availability: {
            provider: {
              providerId: "gateway",
              providerKind: "gateway",
              transport: "rpc",
              reasonCodes: [],
            },
          },
        }),
        createToolInput({
          id: "nodes",
          label: "nodes",
          matchKey: "tool:core::nodes",
          sortKey: "tool:003:nodes",
          intent: "gateway-brokered",
        }),
        createToolInput({
          id: "read",
          label: "read",
          matchKey: "tool:core::read",
          sortKey: "tool:004:read",
        }),
      ],
    });

    expect(manifest.capabilities.map((capability) => capability.capabilityClass)).toEqual([
      "configured-but-blocked",
      "gateway-brokered",
      "unsupported-in-current-runtime",
      "sandbox-local",
    ]);

    const blocked = manifest.capabilities[0];
    const unsupported = manifest.capabilities[2];

    expect(blocked?.policy?.denyReason).toBe("tool-denied-by-sandbox-policy");
    expect(unsupported?.evidence?.provider?.reasonCodes).toContain("missing-provider");
  });

  it("accepts remote-assisted tool capabilities when explicit remote facts exist", () => {
    const manifest = resolveCapabilityManifest({
      runtimeContext,
      skills: [],
      tools: [
        createToolInput({
          id: "xcodebuild",
          label: "xcodebuild",
          description: "Remote build helper",
          matchKey: "tool:plugin:remote-mac:xcodebuild",
          sortKey: "tool:001:xcodebuild",
          source: "plugin",
          pluginId: "remote-mac",
          defaultProfiles: [],
          groupId: "plugin:remote-mac",
          groupLabel: "remote-mac",
          groupSource: "plugin",
          groupPluginId: "remote-mac",
          intent: "remote-node-assisted",
          availability: {
            runtime: {
              missingBins: ["xcodebuild"],
              reasonCodes: ["missing-runtime-binaries"],
            },
            remote: {
              satisfiedBins: ["xcodebuild"],
              satisfiedOs: ["darwin"],
              note: "Remote macOS node available.",
            },
          },
        }),
      ],
    });

    const capability = manifest.capabilities[0];
    expect(capability?.capabilityClass).toBe("remote-node-assisted");
    expect(capability?.evidence?.remote?.satisfiedBins).toEqual(["xcodebuild"]);
  });

  it("produces manifests that still validate against the SBX-201 schema", () => {
    const manifest = resolveCapabilityManifest({
      runtimeContext,
      skills: [createSkillInput()],
      tools: [
        createToolInput({
          id: "web_search",
          label: "web_search",
          matchKey: "tool:core::web_search",
          sortKey: "tool:001:web_search",
          intent: "gateway-brokered",
          availability: {
            provider: {
              providerId: "gateway",
              providerKind: "gateway",
              transport: "rpc",
              reasonCodes: [],
            },
          },
        }),
      ],
    });

    const validate = createAjv().compile(ResolvedCapabilityManifestSchema);
    expect(validate(manifest)).toBe(true);
  });
});
