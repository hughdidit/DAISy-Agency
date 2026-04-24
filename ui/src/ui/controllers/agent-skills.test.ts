import { describe, expect, it, vi } from "vitest";
import {
  CAPABILITY_PARITY_SKILL_SUBJECTS,
  createCapabilityParitySkillStatusReportFixture,
  filterCapabilityParityRows,
  normalizeSkillStatusParityRows,
} from "../../../../src/test-utils/capability-readiness-parity.js";
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
  it("stores resolver-backed skill payloads without changing parity", async () => {
    const { state, request } = createState();
    const payload = createCapabilityParitySkillStatusReportFixture();
    request.mockResolvedValue(payload);

    await loadAgentSkills(state, "main");

    expect(request).toHaveBeenCalledWith("skills.status", { agentId: "main" });
    expect(state.agentSkillsReport).toEqual(payload);
    expect(state.agentSkillsAgentId).toBe("main");
    expect(normalizeSkillStatusParityRows(state.agentSkillsReport?.skills ?? [])).toEqual(
      filterCapabilityParityRows(CAPABILITY_PARITY_SKILL_SUBJECTS),
    );
  });

  it("captures request errors without mutating prior report state", async () => {
    const { state, request } = createState();
    state.agentSkillsReport = { workspaceDir: "x", managedSkillsDir: "y", skills: [] };
    request.mockRejectedValue(new Error("gateway unavailable"));

    await loadAgentSkills(state, "main");

    expect(state.agentSkillsError).toContain("gateway unavailable");
    expect(state.agentSkillsReport).toEqual({
      workspaceDir: "x",
      managedSkillsDir: "y",
      skills: [],
    });
    expect(state.agentSkillsLoading).toBe(false);
  });
});
