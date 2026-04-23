import { describe, expect, it, vi } from "vitest";
import { loadAgentSkills } from "./agent-skills.ts";
import type { AgentSkillsState } from "./agent-skills.ts";

function createState(): { state: AgentSkillsState; request: ReturnType<typeof vi.fn> } {
  const request = vi.fn();
  const state: AgentSkillsState = {
    client: {
      request,
    } as unknown as AgentSkillsState["client"],
    connected: true,
    agentSkillsLoading: false,
    agentSkillsError: null,
    agentSkillsReport: null,
    agentSkillsAgentId: null,
  };
  return { state, request };
}

describe("loadAgentSkills", () => {
  it("stores resolver-backed skill payloads unchanged", async () => {
    const { state, request } = createState();
    const payload = {
      workspaceDir: "/tmp/workspace-main",
      managedSkillsDir: "/tmp/skills",
      skills: [
        {
          name: "discord",
          description: "Discord skill",
          source: "openclaw-bundled",
          bundled: true,
          filePath: "/tmp/skills/discord/SKILL.md",
          baseDir: "/tmp/skills/discord",
          skillKey: "discord",
          always: false,
          disabled: false,
          blockedByAllowlist: false,
          eligible: false,
          capabilityClass: "configured-but-blocked",
          capability: {
            id: "discord",
            label: "discord",
            description: "Discord skill",
            kind: "skill",
            capabilityClass: "configured-but-blocked",
            runtimeContext: { agentId: "main", sandboxMode: "all", sandboxed: true },
            skillKey: "discord",
            source: "openclaw-bundled",
            bundled: true,
            filePath: "/tmp/skills/discord/SKILL.md",
            requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
            missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
            configChecks: [],
            policy: {
              source: { kind: "bundled-skill-allowlist", key: "agents.list[0].skills" },
              denyReason: "bundled-skill-not-allowlisted",
              detail: "Agent allowlist excludes discord",
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
    request.mockResolvedValue(payload);

    await loadAgentSkills(state, "main");

    expect(request).toHaveBeenCalledWith("skills.status", { agentId: "main" });
    expect(state.agentSkillsReport).toEqual(payload);
    expect(state.agentSkillsAgentId).toBe("main");
    expect(state.agentSkillsError).toBeNull();
  });

  it("captures request errors without mutating prior report state", async () => {
    const { state, request } = createState();
    state.agentSkillsReport = { workspaceDir: "x", managedSkillsDir: "y", skills: [] };
    request.mockRejectedValue(new Error("gateway unavailable"));

    await loadAgentSkills(state, "main");

    expect(state.agentSkillsError).toContain("gateway unavailable");
    expect(state.agentSkillsReport).toEqual({ workspaceDir: "x", managedSkillsDir: "y", skills: [] });
    expect(state.agentSkillsLoading).toBe(false);
  });
});
