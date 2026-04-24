import { render } from "lit";
import { describe, expect, it } from "vitest";
import { createCapabilityParitySkillStatusReportFixture } from "../../../../src/test-utils/capability-readiness-parity-browser.js";
import type {
  ResolvedCapabilityEvidence,
  ResolvedSkillCapability,
  ResolvedToolCapability,
} from "../types.ts";
import { renderAgentSkills, renderAgentTools } from "./agents-panels-tools-skills.ts";

type CapabilityPolicy = Extract<
  ResolvedSkillCapability | ResolvedToolCapability,
  { policy: unknown }
>["policy"];

type ToolCapabilityOverrides = {
  id?: string;
  label?: string;
  description?: string;
  source?: "core" | "plugin";
  defaultProfiles?: string[];
  pluginId?: string;
  optional?: boolean;
  policy?: CapabilityPolicy;
  evidence?: ResolvedCapabilityEvidence;
};

type SkillCapabilityOverrides = {
  id?: string;
  label?: string;
  description?: string;
  skillKey?: string;
  source?: string;
  bundled?: boolean;
  filePath?: string;
  requirements?: ResolvedSkillCapability["requirements"];
  missing?: ResolvedSkillCapability["missing"];
  configChecks?: ResolvedSkillCapability["configChecks"];
  policy?: CapabilityPolicy;
  evidence?: ResolvedCapabilityEvidence;
};

function createToolCapability(
  capabilityClass: ResolvedToolCapability["capabilityClass"],
  overrides: ToolCapabilityOverrides = {},
): ResolvedToolCapability {
  return {
    id: overrides.id ?? capabilityClass,
    label: overrides.label ?? capabilityClass,
    description: overrides.description ?? capabilityClass,
    kind: "tool" as const,
    capabilityClass,
    runtimeContext: { agentId: "main", sandboxMode: "all", sandboxed: true },
    source: overrides.source ?? "core",
    defaultProfiles: overrides.defaultProfiles ?? [],
    ...(overrides.pluginId ? { pluginId: overrides.pluginId } : {}),
    ...(overrides.optional !== undefined ? { optional: Boolean(overrides.optional) } : {}),
    ...("policy" in overrides && overrides.policy ? { policy: overrides.policy } : {}),
    ...("evidence" in overrides && overrides.evidence ? { evidence: overrides.evidence } : {}),
  } as ResolvedToolCapability;
}

function createSkillCapability(
  capabilityClass: ResolvedSkillCapability["capabilityClass"],
  overrides: SkillCapabilityOverrides = {},
): ResolvedSkillCapability {
  const skillKey = overrides.skillKey ?? capabilityClass;
  return {
    id: overrides.id ?? capabilityClass,
    label: overrides.label ?? capabilityClass,
    description: overrides.description ?? capabilityClass,
    kind: "skill" as const,
    capabilityClass,
    runtimeContext: { agentId: "main", sandboxMode: "all", sandboxed: true },
    skillKey,
    source: overrides.source ?? "workspace",
    bundled: overrides.bundled ?? false,
    filePath: overrides.filePath ?? `/tmp/${skillKey}/SKILL.md`,
    requirements: overrides.requirements ?? { bins: [], anyBins: [], env: [], config: [], os: [] },
    missing: overrides.missing ?? { bins: [], anyBins: [], env: [], config: [], os: [] },
    configChecks: overrides.configChecks ?? [],
    ...("policy" in overrides && overrides.policy ? { policy: overrides.policy } : {}),
    ...("evidence" in overrides && overrides.evidence ? { evidence: overrides.evidence } : {}),
  } as ResolvedSkillCapability;
}

function createBaseParams(overrides: Partial<Parameters<typeof renderAgentTools>[0]> = {}) {
  return {
    agentId: "main",
    configForm: {
      agents: {
        list: [{ id: "main", tools: { profile: "full" } }],
      },
    } as Record<string, unknown>,
    configLoading: false,
    configSaving: false,
    configDirty: false,
    toolsCatalogLoading: false,
    toolsCatalogError: null,
    toolsCatalogResult: null,
    onProfileChange: () => undefined,
    onOverridesChange: () => undefined,
    onConfigReload: () => undefined,
    onConfigSave: () => undefined,
    ...overrides,
  };
}

function createSkillParams(overrides: Partial<Parameters<typeof renderAgentSkills>[0]> = {}) {
  return {
    agentId: "main",
    report: {
      workspaceDir: "/tmp/workspace-main",
      managedSkillsDir: "/tmp/skills",
      skills: [],
    },
    loading: false,
    error: null,
    activeAgentId: "main",
    configForm: {
      agents: {
        list: [{ id: "main" }],
      },
    } as Record<string, unknown>,
    configLoading: false,
    configSaving: false,
    configDirty: false,
    filter: "",
    onFilterChange: () => undefined,
    onRefresh: () => undefined,
    onToggle: () => undefined,
    onClear: () => undefined,
    onDisableAll: () => undefined,
    onConfigReload: () => undefined,
    onConfigSave: () => undefined,
    ...overrides,
  };
}

describe("agents tools and skills panels (browser)", () => {
  it("renders per-tool provenance, optional marker, and resolver-backed readiness", async () => {
    const container = document.createElement("div");
    render(
      renderAgentTools(
        createBaseParams({
          toolsCatalogResult: {
            agentId: "main",
            profiles: [
              { id: "minimal", label: "Minimal" },
              { id: "coding", label: "Coding" },
              { id: "messaging", label: "Messaging" },
              { id: "full", label: "Full" },
            ],
            groups: [
              {
                id: "media",
                label: "Media",
                source: "core",
                tools: [
                  {
                    id: "tts",
                    label: "tts",
                    description: "Text-to-speech conversion",
                    source: "core",
                    defaultProfiles: [],
                    capabilityClass: "sandbox-local",
                    capability: createToolCapability("sandbox-local", {
                      id: "tts",
                      label: "tts",
                    }),
                  },
                ],
              },
              {
                id: "plugin:voice-call",
                label: "voice-call",
                source: "plugin",
                pluginId: "voice-call",
                tools: [
                  {
                    id: "voice_call",
                    label: "voice_call",
                    description: "Voice call tool",
                    source: "plugin",
                    pluginId: "voice-call",
                    optional: true,
                    defaultProfiles: [],
                    capabilityClass: "gateway-brokered",
                    capability: createToolCapability("gateway-brokered", {
                      id: "voice_call",
                      source: "plugin",
                      pluginId: "voice-call",
                      optional: true,
                      evidence: {
                        provider: {
                          providerId: "voice-call",
                          providerKind: "plugin",
                          transport: "gateway-plugin",
                          reasonCodes: [],
                        },
                      },
                    }),
                  },
                ],
              },
            ],
          },
        }),
      ),
      container,
    );
    await Promise.resolve();

    const text = container.textContent ?? "";
    expect(text).toContain("core");
    expect(text).toContain("plugin:voice-call");
    expect(text).toContain("optional");
    expect(text).toContain("sandbox-local");
    expect(text).toContain("gateway-brokered");
    expect(text).toContain("Brokered by plugin voice-call via gateway-plugin");
  });

  it("renders distinct readiness details for blocked, unsupported, and remote-assisted tools", async () => {
    const container = document.createElement("div");
    render(
      renderAgentTools(
        createBaseParams({
          toolsCatalogResult: {
            agentId: "main",
            profiles: [{ id: "full", label: "Full" }],
            groups: [
              {
                id: "ops",
                label: "Ops",
                source: "core",
                tools: [
                  {
                    id: "remote-tool",
                    label: "remote-tool",
                    description: "Remote backed tool",
                    source: "core",
                    defaultProfiles: [],
                    capabilityClass: "remote-node-assisted",
                    capability: createToolCapability("remote-node-assisted", {
                      id: "remote-tool",
                      evidence: {
                        remote: {
                          satisfiedBins: ["jq"],
                          satisfiedAnyBins: [],
                          satisfiedOs: [],
                          note: "Remote node provides jq",
                        },
                      },
                    }),
                  },
                  {
                    id: "blocked-tool",
                    label: "blocked-tool",
                    description: "Blocked tool",
                    source: "core",
                    defaultProfiles: [],
                    capabilityClass: "configured-but-blocked",
                    capability: createToolCapability("configured-but-blocked", {
                      id: "blocked-tool",
                      policy: {
                        source: { kind: "sandbox-tool-policy", key: "tools.deny" },
                        denyReason: "tool-denied-by-sandbox-policy",
                        detail: "Denied by agent policy",
                      },
                    }),
                  },
                  {
                    id: "unsupported-tool",
                    label: "unsupported-tool",
                    description: "Unsupported tool",
                    source: "core",
                    defaultProfiles: [],
                    capabilityClass: "unsupported-in-current-runtime",
                    capability: createToolCapability("unsupported-in-current-runtime", {
                      id: "unsupported-tool",
                      evidence: {
                        runtime: {
                          profile: "minimal",
                          missingBins: ["ffmpeg"],
                          missingAnyBins: [],
                          missingOs: [],
                          reasonCodes: ["missing-runtime-binaries"],
                          detail: "ffmpeg is not installed",
                        },
                      },
                    }),
                  },
                ],
              },
            ],
          },
        }),
      ),
      container,
    );
    await Promise.resolve();

    const text = container.textContent ?? "";
    expect(text).toContain("remote-node-assisted");
    expect(text).toContain("Remote node provides jq");
    expect(text).toContain("configured-but-blocked");
    expect(text).toContain("Denied by agent policy");
    expect(text).toContain("unsupported-in-current-runtime");
    expect(text).toContain("Missing required runtime binaries");
    expect(text).toContain("Missing bins: ffmpeg");
  });

  it("renders distinct readiness details for blocked, unsupported, and remote-assisted skills", async () => {
    const container = document.createElement("div");
    render(
      renderAgentSkills(
        createSkillParams({
          report: {
            workspaceDir: "/tmp/workspace-main",
            managedSkillsDir: "/tmp/skills",
            skills: [
              {
                name: "remote-skill",
                description: "Remote backed skill",
                source: "workspace",
                bundled: false,
                filePath: "/tmp/workspace-main/skills/remote-skill/SKILL.md",
                baseDir: "/tmp/workspace-main/skills/remote-skill",
                skillKey: "remote-skill",
                always: false,
                disabled: false,
                blockedByAllowlist: false,
                eligible: true,
                capabilityClass: "remote-node-assisted",
                capability: createSkillCapability("remote-node-assisted", {
                  id: "remote-skill",
                  skillKey: "remote-skill",
                  evidence: {
                    remote: {
                      satisfiedBins: ["rg"],
                      satisfiedAnyBins: [],
                      satisfiedOs: [],
                      note: "Remote node provides ripgrep",
                    },
                  },
                }),
                requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
                missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
                configChecks: [],
                remoteSatisfied: null,
                install: [],
              },
              {
                name: "blocked-skill",
                description: "Blocked skill",
                source: "workspace",
                bundled: false,
                filePath: "/tmp/workspace-main/skills/blocked-skill/SKILL.md",
                baseDir: "/tmp/workspace-main/skills/blocked-skill",
                skillKey: "blocked-skill",
                always: false,
                disabled: true,
                blockedByAllowlist: false,
                eligible: false,
                capabilityClass: "configured-but-blocked",
                capability: createSkillCapability("configured-but-blocked", {
                  id: "blocked-skill",
                  skillKey: "blocked-skill",
                  policy: {
                    source: { kind: "skill-config-entry", key: "skills.entries.blocked-skill" },
                    denyReason: "skill-disabled",
                    detail: "Disabled in config",
                  },
                }),
                requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
                missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
                configChecks: [],
                remoteSatisfied: null,
                install: [],
              },
              {
                name: "unsupported-skill",
                description: "Unsupported skill",
                source: "workspace",
                bundled: false,
                filePath: "/tmp/workspace-main/skills/unsupported-skill/SKILL.md",
                baseDir: "/tmp/workspace-main/skills/unsupported-skill",
                skillKey: "unsupported-skill",
                always: false,
                disabled: false,
                blockedByAllowlist: false,
                eligible: false,
                capabilityClass: "unsupported-in-current-runtime",
                capability: createSkillCapability("unsupported-in-current-runtime", {
                  id: "unsupported-skill",
                  skillKey: "unsupported-skill",
                  evidence: {
                    runtime: {
                      profile: "minimal",
                      missingBins: ["python"],
                      missingAnyBins: [],
                      missingOs: [],
                      reasonCodes: ["missing-runtime-binaries"],
                      detail: "python is not installed",
                    },
                  },
                }),
                requirements: { bins: ["python"], anyBins: [], env: [], config: [], os: [] },
                missing: { bins: ["python"], anyBins: [], env: [], config: [], os: [] },
                configChecks: [],
                remoteSatisfied: null,
                install: [],
              },
            ],
          },
        }),
      ),
      container,
    );
    await Promise.resolve();

    const text = container.textContent ?? "";
    expect(text).toContain("remote-node-assisted");
    expect(text).toContain("Remote node provides ripgrep");
    expect(text).toContain("configured-but-blocked");
    expect(text).toContain("Disabled in config");
    expect(text).toContain("unsupported-in-current-runtime");
    expect(text).toContain("Missing bins: python");
  });

  it("renders the shared parity skill matrix without collapsing eligible and blocked states", async () => {
    const container = document.createElement("div");
    render(
      renderAgentSkills(
        createSkillParams({
          report: createCapabilityParitySkillStatusReportFixture(),
        }),
      ),
      container,
    );
    await Promise.resolve();

    const rows = [...container.querySelectorAll<HTMLElement>(".agent-skill-row")];
    const rowText = (skillName: string) => {
      const row = rows.find((candidate) => candidate.textContent?.includes(skillName));
      expect(row, `expected skill row for ${skillName}`).toBeTruthy();
      return row?.textContent ?? "";
    };

    expect(rowText("local-skill")).toContain("sandbox-local");
    expect(rowText("remote-mac-skill")).toContain("remote-node-assisted");
    expect(rowText("env-blocked-skill")).toContain("configured-but-blocked");
    expect(rowText("projection-defect-skill")).toContain("unsupported-in-current-runtime");
    expect(rowText("unsupported-runtime-skill")).toContain("unsupported-in-current-runtime");
  });

  it("shows degraded fallback messaging when runtime catalog fails", async () => {
    const container = document.createElement("div");
    render(
      renderAgentTools(
        createBaseParams({
          toolsCatalogError: "unavailable",
          toolsCatalogResult: null,
        }),
      ),
      container,
    );
    await Promise.resolve();

    const text = container.textContent ?? "";
    expect(text).toContain("Could not load runtime tool catalog");
    expect(text).toContain("without runtime readiness details");
    expect(text).not.toContain("sandbox-local");
  });
});
