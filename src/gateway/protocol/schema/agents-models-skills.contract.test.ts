import Ajv from "ajv";
import { describe, expect, it } from "vitest";
import {
  ResolvedCapabilityManifestSchema,
  SkillsStatusResultSchema,
} from "./agents-models-skills.js";

describe("agents-models-skills schemas", () => {
  it("accepts a blocked skills.status payload with explicit deny metadata", () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(SkillsStatusResultSchema);
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

  it("rejects remote-assisted capabilities that omit remote evidence", () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(
      ResolvedCapabilityManifestSchema,
    );
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
    const validate = new Ajv({ allErrors: true, strict: false }).compile(
      ResolvedCapabilityManifestSchema,
    );
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
    const validate = new Ajv({ allErrors: true, strict: false }).compile(
      ResolvedCapabilityManifestSchema,
    );
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
});
