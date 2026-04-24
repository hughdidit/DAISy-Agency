import { describe, expect, it } from "vitest";
import type { SkillEntry } from "../skills.js";
import { collectGatewayCapabilityInputs } from "./collect-gateway.js";
import {
  buildResolvedToolCatalogGroupsFromManifest,
  buildSkillStatusReportFromManifest,
} from "./joins.js";
import { resolveCapabilityManifest } from "./resolve.js";

function makeSkillEntry(params: {
  name: string;
  source?: string;
  os?: string[];
  requires?: { bins?: string[]; env?: string[]; config?: string[] };
}): SkillEntry {
  return {
    skill: {
      name: params.name,
      description: `desc:${params.name}`,
      source: params.source ?? "openclaw-bundled",
      filePath: `/tmp/${params.name}/SKILL.md`,
      baseDir: `/tmp/${params.name}`,
      disableModelInvocation: false,
    },
    frontmatter: {},
    metadata: {
      ...(params.os ? { os: params.os } : {}),
      ...(params.requires ? { requires: params.requires } : {}),
      ...(params.requires?.env?.[0] ? { primaryEnv: params.requires.env[0] } : {}),
    },
  };
}

describe("collectGatewayCapabilityInputs", () => {
  it("collects deterministic skill and tool facts for gateway contexts", () => {
    const collected = collectGatewayCapabilityInputs({
      agentId: "main",
      sessionKey: "main",
      workspaceDir: "/tmp/workspace",
      agentDir: "/tmp/agents/main/agent",
      entries: [
        makeSkillEntry({
          name: "remote-mac-skill",
          os: ["darwin"],
          requires: { bins: ["xcodebuild"] },
        }),
      ],
      eligibility: {
        remote: {
          platforms: ["darwin"],
          hasBin: (bin) => bin === "xcodebuild",
          hasAnyBin: () => false,
          note: "Remote macOS node available.",
        },
      },
      pluginTools: [
        {
          name: "voice_call",
          label: "voice_call",
          description: "Voice call helper",
          pluginId: "voice-call",
          optional: true,
        },
      ],
    });

    expect(collected.runtimeContext.agentId).toBe("main");
    expect(collected.runtimeContext.sandboxMode).toBe("all");
    expect(collected.runtimeContext.sandboxScope).toBe("session");
    expect(collected.runtimeContext.runtimeProfile).toBe("coding-base");
    expect(collected.skills.map((skill) => skill.name)).toEqual(["remote-mac-skill"]);
    expect(collected.skills[0]?.remoteSatisfied?.bins).toEqual(["xcodebuild"]);

    const readTool = collected.tools.find((tool) => tool.id === "read");
    const webFetchTool = collected.tools.find((tool) => tool.id === "web_fetch");
    const pluginTool = collected.tools.find((tool) => tool.id === "voice_call");

    expect(readTool?.intent).toBe("sandbox-local");
    expect(webFetchTool?.intent).toBe("gateway-brokered");
    expect(webFetchTool?.availability?.provider?.providerId).toBe("gateway");
    expect(pluginTool).toMatchObject({
      source: "plugin",
      pluginId: "voice-call",
      intent: "gateway-brokered",
    });
  });

  it("can collect tool facts without scanning workspace skills for tools-only callers", () => {
    const collected = collectGatewayCapabilityInputs({
      agentId: "main",
      sessionKey: "main",
      workspaceDir: "/tmp/workspace",
      agentDir: "/tmp/agents/main/agent",
      includeSkills: false,
      entries: [makeSkillEntry({ name: "should-not-load" })],
      pluginTools: [
        {
          name: "voice_call",
          label: "voice_call",
          description: "Voice call helper",
          pluginId: "voice-call",
          optional: true,
        },
      ],
    });

    expect(collected.skills).toEqual([]);
    expect(collected.managedSkillsDir).toBeTruthy();
    expect(collected.tools.some((tool) => tool.id === "read")).toBe(true);
    expect(collected.tools.find((tool) => tool.id === "voice_call")).toMatchObject({
      source: "plugin",
      pluginId: "voice-call",
      intent: "gateway-brokered",
    });
  });

  it("threads explicit sandbox runtime profile identity into gateway runtime context", () => {
    const collected = collectGatewayCapabilityInputs({
      config: {
        agents: {
          defaults: {
            sandbox: {
              mode: "all",
              scope: "session",
              profile: "browser-automation",
            },
          },
        },
      },
      agentId: "main",
      sessionKey: "main",
      workspaceDir: "/tmp/workspace",
      agentDir: "/tmp/agents/main/agent",
      includeSkills: false,
    });

    expect(collected.runtimeContext.runtimeProfile).toBe("browser-automation");
  });

  it("provides enough data to rebuild skill status and grouped tool views later", () => {
    const collected = collectGatewayCapabilityInputs({
      agentId: "main",
      sessionKey: "main",
      workspaceDir: "/tmp/workspace",
      agentDir: "/tmp/agents/main/agent",
      entries: [makeSkillEntry({ name: "local-skill" })],
      pluginTools: [
        {
          name: "matrix_room",
          label: "matrix_room",
          description: "Matrix room helper",
          pluginId: "matrix",
        },
      ],
    });
    const manifest = resolveCapabilityManifest(collected);
    const skillReport = buildSkillStatusReportFromManifest({
      workspaceDir: "/tmp/workspace",
      managedSkillsDir: collected.managedSkillsDir,
      skills: collected.skills,
      manifest,
    });
    const groups = buildResolvedToolCatalogGroupsFromManifest({
      tools: collected.tools,
      manifest,
    });

    expect(skillReport.skills[0]?.name).toBe("local-skill");
    expect(skillReport.skills[0]?.capability.capabilityClass).toBe("sandbox-local");

    const filesGroup = groups.find((group) => group.id === "fs");
    const pluginGroup = groups.find((group) => group.id === "plugin:matrix");

    expect(filesGroup?.tools.some((tool) => tool.id === "read")).toBe(true);
    expect(pluginGroup?.tools[0]?.capability.capabilityClass).toBe("gateway-brokered");
  });

  it("maps gateway skill status classes through the shared resolver and keeps ordering deterministic", () => {
    const collected = collectGatewayCapabilityInputs({
      agentId: "main",
      sessionKey: "main",
      workspaceDir: "/tmp/workspace",
      agentDir: "/tmp/agents/main/agent",
      entries: [
        makeSkillEntry({
          name: "zzz-workspace",
          source: "openclaw-workspace",
        }),
        makeSkillEntry({
          name: "aaa-plugin",
          source: "openclaw-plugin:voice",
          os: ["darwin"],
          requires: { bins: ["xcodebuild"] },
        }),
        makeSkillEntry({
          name: "mmm-bundled",
          source: "openclaw-bundled",
          requires: { env: ["MISSING_GATEWAY_TEST_ENV"] },
        }),
        makeSkillEntry({
          name: "ddd-projection",
          source: "openclaw-managed",
        }),
      ],
      eligibility: {
        remote: {
          platforms: ["darwin"],
          hasBin: (bin) => bin === "xcodebuild",
          hasAnyBin: () => false,
          note: "Remote macOS node available.",
        },
      },
      skillAvailability: {
        "ddd-projection": {
          projection: {
            missingPaths: ["/workspace/.openclaw-readonly/state/extensions/ddd-projection"],
            reasonCodes: ["missing-projection"],
            detail: "Projection missing skill assets.",
          },
        },
      },
    });
    const manifest = resolveCapabilityManifest(collected);
    const report = buildSkillStatusReportFromManifest({
      workspaceDir: "/tmp/workspace",
      managedSkillsDir: collected.managedSkillsDir,
      skills: collected.skills,
      manifest,
    });

    expect(report.skills.map((skill) => skill.name)).toEqual([
      "aaa-plugin",
      "ddd-projection",
      "mmm-bundled",
      "zzz-workspace",
    ]);

    const remote = report.skills.find((skill) => skill.name === "aaa-plugin");
    const unsupported = report.skills.find((skill) => skill.name === "ddd-projection");
    const blocked = report.skills.find((skill) => skill.name === "mmm-bundled");
    const local = report.skills.find((skill) => skill.name === "zzz-workspace");

    expect(remote).toMatchObject({
      eligible: true,
      capabilityClass: "remote-node-assisted",
    });
    expect(unsupported).toMatchObject({
      eligible: false,
      capabilityClass: "unsupported-in-current-runtime",
    });
    expect(blocked).toMatchObject({
      eligible: false,
      capabilityClass: "configured-but-blocked",
    });
    expect(local).toMatchObject({
      eligible: true,
      capabilityClass: "sandbox-local",
    });
  });

  it("derives report eligible from the resolved capability instead of collected readiness", () => {
    const collected = collectGatewayCapabilityInputs({
      agentId: "main",
      sessionKey: "main",
      workspaceDir: "/tmp/workspace",
      agentDir: "/tmp/agents/main/agent",
      entries: [
        makeSkillEntry({
          name: "blocked-skill",
          requires: { env: ["MISSING_GATEWAY_STATUS_ENV"] },
        }),
      ],
    });
    const manifest = resolveCapabilityManifest(collected);
    const mutatedSkills = collected.skills.map((skill) =>
      skill.name === "blocked-skill" ? { ...skill, eligible: true } : skill,
    );
    const report = buildSkillStatusReportFromManifest({
      workspaceDir: "/tmp/workspace",
      managedSkillsDir: collected.managedSkillsDir,
      skills: mutatedSkills,
      manifest,
    });

    expect(collected.skills[0]?.eligible).toBe(false);
    expect(mutatedSkills[0]?.eligible).toBe(true);
    expect(report.skills[0]?.capabilityClass).toBe("configured-but-blocked");
    expect(report.skills[0]?.eligible).toBe(false);
  });
});
