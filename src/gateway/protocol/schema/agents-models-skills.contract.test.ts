import AjvPkg from "ajv";
import { describe, expect, it } from "vitest";
import {
  ResolvedCapabilityManifestSchema,
  SkillsStatusResultSchema,
} from "./agents-models-skills.js";

function createAjv() {
  return new (AjvPkg as unknown as new (opts?: object) => import("ajv").default)({
    allErrors: true,
    strict: false,
  });
}

describe("agents-models-skills schemas", () => {
  it("accepts a blocked skills.status payload with explicit deny metadata", () => {
    const validate = createAjv().compile(SkillsStatusResultSchema);
    const payload = {
      workspaceDir: "/tmp/ws",
      managedSkillsDir: "/tmp/skills",
      skills: [
        {
          name: "discord",
          description: "discord skill",
          source: "openclaw-bundled",
          bundled: true,
          filePath: "/tmp/discord/SKILL.md",
          baseDir: "/tmp/discord",
          skillKey: "discord",
          always: false,
          disabled: false,
          blockedByAllowlist: true,
          eligible: false,
          capabilityClass: "configured-but-blocked",
          capability: {
            id: "discord",
            label: "discord",
            description: "discord skill",
            kind: "skill",
            capabilityClass: "configured-but-blocked",
            runtimeContext: { agentId: "main" },
            skillKey: "discord",
            source: "openclaw-bundled",
            bundled: true,
            filePath: "/tmp/discord/SKILL.md",
            requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
            missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
            configChecks: [],
            policy: {
              source: {
                kind: "bundled-skill-allowlist",
                key: "skills.allowBundled",
              },
              denyReason: "bundled-skill-not-allowlisted",
            },
          },
          requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
          missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
          configChecks: [],
          remoteSatisfied: null,
          install: [],
        },
      ],
    };

    expect(validate(payload)).toBe(true);
  });

  it("accepts runtime contexts that include a supported runtime profile", () => {
    const validate = createAjv().compile(ResolvedCapabilityManifestSchema);
    const payload = {
      schemaVersion: 1,
      runtimeContext: {
        agentId: "main",
        sandboxMode: "all",
        sandboxScope: "session",
        runtimeProfile: "coding-base",
        sandboxed: true,
      },
      capabilities: [
        {
          id: "read",
          label: "read",
          description: "read",
          kind: "tool",
          capabilityClass: "sandbox-local",
          runtimeContext: {
            agentId: "main",
            sandboxMode: "all",
            sandboxScope: "session",
            runtimeProfile: "coding-base",
            sandboxed: true,
          },
          source: "core",
        },
      ],
    };

    expect(validate(payload)).toBe(true);
  });

  it("rejects remote-assisted capabilities that omit remote evidence", () => {
    const validate = createAjv().compile(ResolvedCapabilityManifestSchema);
    const payload = {
      schemaVersion: 1,
      runtimeContext: { agentId: "main" },
      capabilities: [
        {
          id: "xcodebuild",
          label: "xcodebuild",
          description: "remote mac helper",
          kind: "tool",
          capabilityClass: "remote-node-assisted",
          runtimeContext: { agentId: "main" },
          source: "plugin",
          pluginId: "remote-mac",
          evidence: {},
        },
      ],
    };

    expect(validate(payload)).toBe(false);
  });

  it("rejects blocked capabilities that omit policy metadata", () => {
    const validate = createAjv().compile(ResolvedCapabilityManifestSchema);
    const payload = {
      schemaVersion: 1,
      runtimeContext: { agentId: "main" },
      capabilities: [
        {
          id: "bash",
          label: "bash",
          description: "shell",
          kind: "tool",
          capabilityClass: "configured-but-blocked",
          runtimeContext: { agentId: "main" },
          source: "core",
        },
      ],
    };

    expect(validate(payload)).toBe(false);
  });

  it("rejects unsupported capabilities without availability evidence", () => {
    const validate = createAjv().compile(ResolvedCapabilityManifestSchema);
    const payload = {
      schemaVersion: 1,
      runtimeContext: { agentId: "main" },
      capabilities: [
        {
          id: "node",
          label: "node",
          description: "runtime",
          kind: "tool",
          capabilityClass: "unsupported-in-current-runtime",
          runtimeContext: { agentId: "main" },
          source: "core",
          evidence: {},
        },
      ],
    };

    expect(validate(payload)).toBe(false);
  });

  it("rejects unsupported skill capabilities that omit runtime evidence", () => {
    const validate = createAjv().compile(ResolvedCapabilityManifestSchema);
    const payload = {
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

    expect(validate(payload)).toBe(false);
  });

  it("rejects blocked capabilities with unknown policy source kinds", () => {
    const validate = createAjv().compile(ResolvedCapabilityManifestSchema);
    const payload = {
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

    expect(validate(payload)).toBe(false);
  });
});
