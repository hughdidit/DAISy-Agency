import { describe, expect, it } from "vitest";
import { collectGatewayCapabilityInputs } from "./collect-gateway.js";
import { buildResolvedToolCatalogGroupsFromManifest, buildSkillStatusReportFromManifest } from "./joins.js";
import { resolveCapabilityManifest } from "./resolve.js";
import type { SkillEntry } from "../skills.js";

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
});
