import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import type { PluginManifestRecord } from "../../plugins/manifest-registry.js";
import {
  CAPABILITY_PARITY_READONLY_SUBJECTS,
  filterCapabilityParityRows,
  normalizeResolvedCapabilitiesParityRows,
} from "../../test-utils/capability-readiness-parity.js";
import { withEnv } from "../../test-utils/env.js";
import type { SkillEntry } from "../skills.js";
import { collectReadonlyCapabilityInputs } from "./collect-readonly.js";
import { buildResolvedToolCatalogGroupsFromManifest } from "./joins.js";
import { buildReadonlySkillStatusReport } from "./readonly-report.js";
import { resolveCapabilityManifest } from "./resolve.js";

function makeSkillEntry(
  name: string,
  overrides: Partial<SkillEntry> = {},
  metadata: SkillEntry["metadata"] = {},
): SkillEntry {
  const { skill: skillOverrides, metadata: metadataOverrides, ...entryOverrides } = overrides;
  return {
    skill: {
      name,
      description: `desc:${name}`,
      source: "openclaw-bundled",
      filePath: `/tmp/${name}/SKILL.md`,
      baseDir: `/tmp/${name}`,
      disableModelInvocation: false,
      ...skillOverrides,
    },
    frontmatter: {},
    metadata: metadataOverrides ?? metadata,
    ...entryOverrides,
  };
}

function makePluginManifestRecord(params: {
  id: string;
  rootDir: string;
  skills: string[];
}): PluginManifestRecord {
  return {
    id: params.id,
    channels: [],
    providers: [],
    skills: params.skills,
    origin: "workspace",
    rootDir: params.rootDir,
    source: params.rootDir,
    manifestPath: `${params.rootDir}/openclaw.plugin.json`,
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

  it("still collects explicit readonly skill entries when workspaceDir is omitted", () => {
    const collected = collectReadonlyCapabilityInputs({
      agentId: "main",
      entries: [makeSkillEntry("explicit-readonly-skill")],
      projection: {
        configPath: "/workspace/.openclaw-readonly/openclaw.json",
        stateDir: "/workspace/.openclaw-readonly/state",
        pathExists: () => false,
      },
    });
    const manifest = resolveCapabilityManifest(collected);
    const capability = manifest.capabilities.find(
      (entry) => entry.id === "explicit-readonly-skill",
    );

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

  it("keeps readonly-visible bundled skills sandbox-local through the shared resolver", () => {
    const { report } = buildReadonlySkillStatusReport({
      agentId: "main",
      workspaceDir: "/workspace",
      entries: [makeSkillEntry("bundled-readonly-skill")],
      projection: {
        configPath: "/workspace/.openclaw-readonly/openclaw.json",
        stateDir: "/workspace/.openclaw-readonly/state",
        workspaceDir: "/workspace",
        pathExists: () => true,
      },
    });

    expect(report.skills[0]).toMatchObject({
      name: "bundled-readonly-skill",
      eligible: true,
      capabilityClass: "sandbox-local",
    });
  });

  it("keeps projected plugin skills sandbox-local when readonly discovery can see them", () => {
    const pluginRoot = "/workspace/.openclaw-readonly/state/extensions/demo-plugin";
    const projectedSkillDir = `${pluginRoot}/skills/projected-demo-skill`;
    const { report } = buildReadonlySkillStatusReport({
      agentId: "main",
      workspaceDir: "/workspace",
      entries: [
        makeSkillEntry(
          "projected-demo-skill",
          {
            skill: {
              name: "projected-demo-skill",
              description: "desc:projected-demo-skill",
              source: "openclaw-extra",
              filePath: `${projectedSkillDir}/SKILL.md`,
              baseDir: projectedSkillDir,
              disableModelInvocation: false,
            },
          },
          {},
        ),
      ],
      projection: {
        configPath: "/workspace/.openclaw-readonly/openclaw.json",
        stateDir: "/workspace/.openclaw-readonly/state",
        workspaceDir: "/workspace",
        pathExists: () => true,
      },
      pluginManifestRecords: [
        makePluginManifestRecord({
          id: "demo-plugin",
          rootDir: pluginRoot,
          skills: ["./skills/projected-demo-skill"],
        }),
      ],
    });

    expect(report.skills.find((skill) => skill.name === "projected-demo-skill")).toMatchObject({
      eligible: true,
      capabilityClass: "sandbox-local",
    });
  });

  it("reports declared plugin skill paths missing from readonly projection as unsupported", () => {
    const pluginRoot = "/workspace/.openclaw-readonly/state/extensions/demo-plugin";
    const { report } = buildReadonlySkillStatusReport({
      agentId: "main",
      workspaceDir: "/workspace",
      projection: {
        configPath: "/workspace/.openclaw-readonly/openclaw.json",
        stateDir: "/workspace/.openclaw-readonly/state",
        workspaceDir: "/workspace",
        pathExists: (targetPath) =>
          targetPath === "/workspace" ||
          targetPath === "/workspace/.openclaw-readonly/openclaw.json" ||
          targetPath === "/workspace/.openclaw-readonly/state",
      },
      pluginManifestRecords: [
        makePluginManifestRecord({
          id: "demo-plugin",
          rootDir: pluginRoot,
          skills: ["./skills/projected-demo-skill"],
        }),
      ],
    });

    expect(
      report.skills.find((skill) => skill.name === "demo-plugin:projected-demo-skill"),
    ).toMatchObject({
      eligible: false,
      capabilityClass: "unsupported-in-current-runtime",
    });
  });

  it("keeps remote-assisted readonly skills explicit instead of treating them as sandbox-local", () => {
    const { report } = buildReadonlySkillStatusReport({
      agentId: "main",
      workspaceDir: "/workspace",
      entries: [
        makeSkillEntry(
          "remote-mac-skill",
          {},
          {
            os: ["darwin"],
            requires: { bins: ["xcodebuild"] },
          },
        ),
      ],
      eligibility: {
        remote: {
          platforms: ["darwin"],
          hasBin: (bin) => bin === "xcodebuild",
          hasAnyBin: () => false,
          note: "Remote macOS node available.",
        },
      },
      projection: {
        configPath: "/workspace/.openclaw-readonly/openclaw.json",
        stateDir: "/workspace/.openclaw-readonly/state",
        workspaceDir: "/workspace",
        pathExists: () => true,
      },
    });

    expect(report.skills.find((skill) => skill.name === "remote-mac-skill")).toMatchObject({
      eligible: true,
      capabilityClass: "remote-node-assisted",
    });
  });

  it("keeps disabled readonly skills configured-but-blocked under the shared resolver", () => {
    const config = {
      skills: {
        entries: {
          "disabled-readonly-skill": {
            enabled: false,
          },
        },
      },
    } as OpenClawConfig;
    const { report } = buildReadonlySkillStatusReport({
      config,
      agentId: "main",
      workspaceDir: "/workspace",
      entries: [makeSkillEntry("disabled-readonly-skill")],
      projection: {
        configPath: "/workspace/.openclaw-readonly/openclaw.json",
        stateDir: "/workspace/.openclaw-readonly/state",
        workspaceDir: "/workspace",
        pathExists: () => true,
      },
    });

    expect(report.skills.find((skill) => skill.name === "disabled-readonly-skill")).toMatchObject({
      eligible: false,
      capabilityClass: "configured-but-blocked",
    });
  });

  it("keeps readonly skill and tool readiness aligned with the shared parity matrix", () => {
    withEnv({ MISSING_GATEWAY_TEST_ENV: undefined }, () => {
      const collected = collectReadonlyCapabilityInputs({
        config: {
          tools: {
            sandbox: {
              tools: {
                deny: ["browser"],
              },
            },
          },
        } satisfies OpenClawConfig,
        agentId: "main",
        workspaceDir: "/workspace",
        entries: [
          makeSkillEntry("local-skill"),
          makeSkillEntry(
            "remote-mac-skill",
            {},
            {
              os: ["darwin"],
              requires: { bins: ["xcodebuild"] },
            },
          ),
          makeSkillEntry(
            "env-blocked-skill",
            {},
            {
              requires: { env: ["MISSING_GATEWAY_TEST_ENV"] },
              primaryEnv: "MISSING_GATEWAY_TEST_ENV",
            },
          ),
          makeSkillEntry(
            "projection-defect-skill",
            {
              skill: {
                name: "projection-defect-skill",
                description: "desc:projection-defect-skill",
                source: "openclaw-extra",
                filePath:
                  "/workspace/.openclaw-readonly/state/extensions/demo-plugin/skills/projection-defect-skill/SKILL.md",
                baseDir:
                  "/workspace/.openclaw-readonly/state/extensions/demo-plugin/skills/projection-defect-skill",
                disableModelInvocation: false,
              },
            },
            {},
          ),
          makeSkillEntry(
            "unsupported-runtime-skill",
            {},
            {
              os: ["never-supported-sbx207"],
            },
          ),
        ],
        eligibility: {
          remote: {
            platforms: ["darwin"],
            hasBin: (bin) => bin === "xcodebuild",
            hasAnyBin: () => false,
            note: "Remote macOS node available.",
          },
        },
        projection: {
          configPath: "/workspace/.openclaw-readonly/openclaw.json",
          stateDir: "/workspace/.openclaw-readonly/state",
          workspaceDir: "/workspace",
          pathExists: (targetPath) =>
            targetPath === "/workspace" ||
            targetPath === "/workspace/.openclaw-readonly/openclaw.json" ||
            targetPath === "/workspace/.openclaw-readonly/state" ||
            targetPath.endsWith("/skills/local-skill/SKILL.md") ||
            targetPath.endsWith("/skills/remote-mac-skill/SKILL.md") ||
            targetPath.endsWith("/skills/env-blocked-skill/SKILL.md") ||
            targetPath.endsWith("/skills/unsupported-runtime-skill/SKILL.md"),
        },
        pluginManifestRecords: [
          makePluginManifestRecord({
            id: "demo-plugin",
            rootDir: "/workspace/.openclaw-readonly/state/extensions/demo-plugin",
            skills: ["./skills/projection-defect-skill"],
          }),
        ],
      });
      const manifest = resolveCapabilityManifest(collected);
      const groups = buildResolvedToolCatalogGroupsFromManifest({
        tools: collected.tools,
        manifest,
      });

      expect(
        normalizeResolvedCapabilitiesParityRows(
          manifest.capabilities.filter((capability) =>
            CAPABILITY_PARITY_READONLY_SUBJECTS.includes(
              capability.id as (typeof CAPABILITY_PARITY_READONLY_SUBJECTS)[number],
            ),
          ),
        ),
      ).toEqual(filterCapabilityParityRows(CAPABILITY_PARITY_READONLY_SUBJECTS));
      expect(groups.flatMap((group) => group.tools.map((tool) => tool.id)).sort()).toEqual(
        expect.arrayContaining(["browser", "web_fetch"]),
      );
    });
  });
});
