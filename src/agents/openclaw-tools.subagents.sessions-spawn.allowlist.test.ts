<<<<<<< HEAD
<<<<<<< HEAD
import { beforeEach, describe, expect, it, vi } from "vitest";

const callGatewayMock = vi.fn();
vi.mock("../gateway/call.js", () => ({
  callGateway: (opts: unknown) => callGatewayMock(opts),
}));

let configOverride: ReturnType<(typeof import("../config/config.js"))["loadConfig"]> = {
  session: {
    mainKey: "main",
    scope: "per-sender",
  },
};

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: () => configOverride,
    resolveGatewayPort: () => 18789,
  };
});

import "./test-helpers/fast-core-tools.js";
import { createOpenClawTools } from "./openclaw-tools.js";
import { resetSubagentRegistryForTests } from "./subagent-registry.js";

describe("openclaw-tools: subagents", () => {
=======
import { beforeEach, describe, expect, it, vi } from "vitest";
=======
import { beforeEach, describe, expect, it } from "vitest";
>>>>>>> dd11a6bcd (refactor(test): share sessions_spawn e2e harness)
import { createOpenClawTools } from "./openclaw-tools.js";
import "./test-helpers/fast-core-tools.js";
import {
  getCallGatewayMock,
  getSessionsSpawnTool,
  resetSessionsSpawnConfigOverride,
  setSessionsSpawnConfigOverride,
} from "./openclaw-tools.subagents.sessions-spawn.test-harness.js";
import { resetSubagentRegistryForTests } from "./subagent-registry.js";

const callGatewayMock = getCallGatewayMock();

<<<<<<< HEAD
<<<<<<< HEAD:src/agents/openclaw-tools.subagents.sessions-spawn-allows-cross-agent-spawning-configured.e2e.test.ts
describe("openclaw-tools: subagents", () => {
>>>>>>> e720e022e (test: stabilize sessions_spawn e2e mocks)
describe("openclaw-tools: subagents (sessions_spawn allowlist)", () => {
>>>>>>> 870b1d50d (perf(test): consolidate sessions_spawn e2e tests):src/agents/openclaw-tools.subagents.sessions-spawn.allowlist.e2e.test.ts
=======
describe("openclaw-tools: subagents (sessions_spawn allowlist)", () => {
  function setAllowAgents(allowAgents: string[]) {
    setSessionsSpawnConfigOverride({
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
      agents: {
        list: [
          {
            id: "main",
            subagents: {
              allowAgents,
            },
          },
        ],
      },
    });
  }

  function mockAcceptedSpawn(acceptedAt: number) {
    let childSessionKey: string | undefined;
    callGatewayMock.mockImplementation(async (opts: unknown) => {
      const request = opts as { method?: string; params?: unknown };
      if (request.method === "agent") {
        const params = request.params as { sessionKey?: string } | undefined;
        childSessionKey = params?.sessionKey;
        return { runId: "run-1", status: "accepted", acceptedAt };
      }
      if (request.method === "agent.wait") {
        return { status: "timeout" };
      }
      return {};
    });
    return () => childSessionKey;
  }

  async function executeSpawn(callId: string, agentId: string, sandbox?: "inherit" | "require") {
    const tool = await getSessionsSpawnTool({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    });
    return tool.execute(callId, { task: "do thing", agentId, sandbox });
  }

  async function expectAllowedSpawn(params: {
    allowAgents: string[];
    agentId: string;
    callId: string;
    acceptedAt: number;
  }) {
    setAllowAgents(params.allowAgents);
    const getChildSessionKey = mockAcceptedSpawn(params.acceptedAt);

    const result = await executeSpawn(params.callId, params.agentId);

    expect(result.details).toMatchObject({
      status: "accepted",
      runId: "run-1",
    });
    expect(getChildSessionKey()?.startsWith(`agent:${params.agentId}:subagent:`)).toBe(true);
  }

>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
  beforeEach(() => {
    resetSessionsSpawnConfigOverride();
    resetSubagentRegistryForTests();
    callGatewayMock.mockClear();
  });

  it("sessions_spawn only allows same-agent by default", async () => {
    const tool = await getSessionsSpawnTool({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    });

    const result = await tool.execute("call6", {
      task: "do thing",
      agentId: "beta",
    });
    expect(result.details).toMatchObject({
      status: "forbidden",
    });
    expect(callGatewayMock).not.toHaveBeenCalled();
  });

  it("sessions_spawn forbids cross-agent spawning when not allowed", async () => {
    setSessionsSpawnConfigOverride({
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
      agents: {
        list: [
          {
            id: "main",
            subagents: {
              allowAgents: ["alpha"],
            },
          },
        ],
      },
    });

    const tool = await getSessionsSpawnTool({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    });

    const result = await tool.execute("call9", {
      task: "do thing",
      agentId: "beta",
    });
    expect(result.details).toMatchObject({
      status: "forbidden",
    });
    expect(callGatewayMock).not.toHaveBeenCalled();
  });

  it("sessions_spawn allows cross-agent spawning when configured", async () => {
    resetSubagentRegistryForTests();
    callGatewayMock.mockReset();
    setSessionsSpawnConfigOverride({
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
      agents: {
        list: [
          {
            id: "main",
            subagents: {
              allowAgents: ["beta"],
            },
          },
        ],
      },
    });

    let childSessionKey: string | undefined;
    callGatewayMock.mockImplementation(async (opts: unknown) => {
      const request = opts as { method?: string; params?: unknown };
      if (request.method === "agent") {
        const params = request.params as { sessionKey?: string } | undefined;
        childSessionKey = params?.sessionKey;
        return { runId: "run-1", status: "accepted", acceptedAt: 5000 };
      }
      if (request.method === "agent.wait") {
        return { status: "timeout" };
      }
      return {};
    });

<<<<<<< HEAD
    const tool = createOpenClawTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    });

    const result = await tool.execute("call7", {
      task: "do thing",
=======
    await expectAllowedSpawn({
      allowAgents: ["beta"],
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      agentId: "beta",
      callId: "call7",
      acceptedAt: 5000,
    });
  });

  it("sessions_spawn allows any agent when allowlist is *", async () => {
    resetSubagentRegistryForTests();
    callGatewayMock.mockReset();
    setSessionsSpawnConfigOverride({
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
      agents: {
        list: [
          {
            id: "main",
            subagents: {
              allowAgents: ["*"],
            },
          },
        ],
      },
    });

    let childSessionKey: string | undefined;
    callGatewayMock.mockImplementation(async (opts: unknown) => {
      const request = opts as { method?: string; params?: unknown };
      if (request.method === "agent") {
        const params = request.params as { sessionKey?: string } | undefined;
        childSessionKey = params?.sessionKey;
        return { runId: "run-1", status: "accepted", acceptedAt: 5100 };
      }
      if (request.method === "agent.wait") {
        return { status: "timeout" };
      }
      return {};
    });

<<<<<<< HEAD
    const tool = createOpenClawTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    });

    const result = await tool.execute("call8", {
      task: "do thing",
=======
    await expectAllowedSpawn({
      allowAgents: ["*"],
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      agentId: "beta",
      callId: "call8",
      acceptedAt: 5100,
    });
  });

  it("sessions_spawn normalizes allowlisted agent ids", async () => {
    await expectAllowedSpawn({
      allowAgents: ["Research"],
      agentId: "research",
      callId: "call10",
      acceptedAt: 5200,
    });
  });

  it("forbids sandboxed cross-agent spawns that would unsandbox the child", async () => {
    setSessionsSpawnConfigOverride({
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
          },
        },
        list: [
          {
            id: "main",
            subagents: {
              allowAgents: ["research"],
            },
          },
          {
            id: "research",
            sandbox: {
              mode: "off",
            },
          },
        ],
      },
    });

    const result = await executeSpawn("call11", "research");
    const details = result.details as { status?: string; error?: string };

    expect(details.status).toBe("forbidden");
    expect(details.error).toContain("Sandboxed sessions cannot spawn unsandboxed subagents.");
    expect(callGatewayMock).not.toHaveBeenCalled();
  });

  it('forbids sandbox="require" when target runtime is unsandboxed', async () => {
    setSessionsSpawnConfigOverride({
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
      agents: {
        list: [
          {
            id: "main",
            subagents: {
              allowAgents: ["research"],
            },
          },
          {
            id: "research",
            sandbox: {
              mode: "off",
            },
          },
        ],
      },
    });

    const result = await executeSpawn("call12", "research", "require");
    const details = result.details as { status?: string; error?: string };

    expect(details.status).toBe("forbidden");
    expect(details.error).toContain('sandbox="require"');
    expect(callGatewayMock).not.toHaveBeenCalled();
  });
});
