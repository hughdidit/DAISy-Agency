import { describe, expect, it } from "vitest";
import { collectReadonlyCapabilityInputs } from "./collect-readonly.js";
import { resolveCapabilityManifest } from "./resolve.js";
import type { SkillEntry } from "../skills.js";

function makeSkillEntry(name: string): SkillEntry {
  return {
    skill: {
      name,
      description: `desc:${name}`,
      source: "openclaw-bundled",
      filePath: `/tmp/${name}/SKILL.md`,
      baseDir: `/tmp/${name}`,
      disableModelInvocation: false,
    },
    frontmatter: {},
    metadata: {},
  };
}

describe("collectReadonlyCapabilityInputs", () => {
  it("marks collected skills unsupported when readonly projection facts are incomplete", () => {
    const collected = collectReadonlyCapabilityInputs({
      agentId: "main",
      workspaceDir: "/workspace",
      entries: [makeSkillEntry("readonly-skill")],
      projection: {
        configPath: "/workspace/.openclaw-readonly/openclaw.json",
        stateDir: "/workspace/.openclaw-readonly/state",
        workspaceDir: "/workspace",
        pathExists: (targetPath) => targetPath === "/workspace",
      },
    });
    const manifest = resolveCapabilityManifest(collected);
    const capability = manifest.capabilities.find((entry) => entry.id === "readonly-skill");

    expect(capability?.capabilityClass).toBe("unsupported-in-current-runtime");
    expect(capability?.evidence?.runtime?.reasonCodes).toContain("missing-projection");
  });

  it("fails closed for local readonly tools when the workspace projection is missing", () => {
    const collected = collectReadonlyCapabilityInputs({
      agentId: "main",
      workspaceDir: "/workspace",
      projection: {
        workspaceDir: "/workspace",
        pathExists: () => false,
      },
    });
    const manifest = resolveCapabilityManifest(collected);
    const readCapability = manifest.capabilities.find((entry) => entry.id === "read");

    expect(readCapability?.capabilityClass).toBe("unsupported-in-current-runtime");
    expect(readCapability?.evidence?.projection?.reasonCodes).toContain("missing-projection");
  });

  it("keeps brokered readonly tools available when projection-only issues do not affect them", () => {
    const collected = collectReadonlyCapabilityInputs({
      agentId: "main",
      workspaceDir: "/workspace",
      projection: {
        workspaceDir: "/workspace",
        pathExists: () => true,
      },
      pluginTools: [
        {
          name: "voice_call",
          label: "voice_call",
          description: "Voice call helper",
          pluginId: "voice-call",
        },
      ],
    });
    const manifest = resolveCapabilityManifest(collected);
    const webFetch = manifest.capabilities.find((entry) => entry.id === "web_fetch");
    const pluginTool = manifest.capabilities.find((entry) => entry.id === "voice_call");

    expect(webFetch?.capabilityClass).toBe("gateway-brokered");
    expect(pluginTool?.capabilityClass).toBe("gateway-brokered");
  });
});
