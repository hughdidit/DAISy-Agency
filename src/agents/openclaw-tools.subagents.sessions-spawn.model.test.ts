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
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "./defaults.js";
import "./test-helpers/fast-core-tools.js";
import {
  getCallGatewayMock,
  getSessionsSpawnTool,
  resetSessionsSpawnConfigOverride,
  setSessionsSpawnConfigOverride,
} from "./openclaw-tools.subagents.sessions-spawn.test-harness.js";
import { resetSubagentRegistryForTests } from "./subagent-registry.js";
import { SUBAGENT_SPAWN_ACCEPTED_NOTE } from "./subagent-spawn.js";

const callGatewayMock = getCallGatewayMock();
type GatewayCall = { method?: string; params?: unknown };
type SessionsSpawnConfigOverride = Parameters<typeof setSessionsSpawnConfigOverride>[0];

<<<<<<< HEAD
<<<<<<< HEAD:src/agents/openclaw-tools.subagents.sessions-spawn-applies-model-child-session.e2e.test.ts
describe("openclaw-tools: subagents", () => {
>>>>>>> e720e022e (test: stabilize sessions_spawn e2e mocks)

function mockPatchAndSingleAgentRun(params: { calls: GatewayCall[]; runId: string }) {
  callGatewayMock.mockImplementation(async (opts: unknown) => {
    const request = opts as GatewayCall;
    params.calls.push(request);
    if (request.method === "sessions.patch") {
      return { ok: true };
    }
    if (request.method === "agent") {
      return { runId: params.runId, status: "accepted" };
    }
    return {};
  });
}

>>>>>>> eef13235a (fix(test): make sessions_spawn e2e harness ordering stable)
describe("openclaw-tools: subagents (sessions_spawn model + thinking)", () => {
>>>>>>> 870b1d50d (perf(test): consolidate sessions_spawn e2e tests):src/agents/openclaw-tools.subagents.sessions-spawn.model.e2e.test.ts
  beforeEach(() => {
    resetSessionsSpawnConfigOverride();
    resetSubagentRegistryForTests();
    callGatewayMock.mockClear();
  });

  it("sessions_spawn applies a model to the child session", async () => {
    const calls: GatewayCall[] = [];
    mockLongRunningSpawnFlow({ calls, acceptedAtBase: 3000 });

    const tool = createOpenClawTools({
      agentSessionKey: "discord:group:req",
      agentChannel: "discord",
    });

    const result = await tool.execute("call3", {
      task: "do thing",
      runTimeoutSeconds: 1,
      model: "claude-haiku-4-5",
      cleanup: "keep",
    });
    expect(result.details).toMatchObject({
      status: "accepted",
      note: SUBAGENT_SPAWN_ACCEPTED_NOTE,
      modelApplied: true,
    });

    const patchIndex = calls.findIndex((call) => call.method === "sessions.patch");
    const agentIndex = calls.findIndex((call) => call.method === "agent");
    expect(patchIndex).toBeGreaterThan(-1);
    expect(agentIndex).toBeGreaterThan(-1);
    expect(patchIndex).toBeLessThan(agentIndex);
    const patchCall = calls.find(
      (call) => call.method === "sessions.patch" && (call.params as { model?: string })?.model,
    );
    expect(patchCall?.params).toMatchObject({
      key: expect.stringContaining("subagent:"),
      model: "claude-haiku-4-5",
    });
  });

  it("sessions_spawn forwards thinking overrides to the agent run", async () => {
    const calls: Array<{ method?: string; params?: unknown }> = [];

    callGatewayMock.mockImplementation(async (opts: unknown) => {
      const request = opts as { method?: string; params?: unknown };
      calls.push(request);
      if (request.method === "agent") {
        return { runId: "run-thinking", status: "accepted" };
      }
      return {};
    });

    const tool = createOpenClawTools({
      agentSessionKey: "discord:group:req",
      agentChannel: "discord",
    });

    const result = await tool.execute("call-thinking", {
      task: "do thing",
      thinking: "high",
    });
    expect(result.details).toMatchObject({
      status: "accepted",
    });

    const agentCall = calls.find((call) => call.method === "agent");
    expect(agentCall?.params).toMatchObject({
      thinking: "high",
    });
  });

  it("sessions_spawn rejects invalid thinking levels", async () => {
    const calls: Array<{ method?: string }> = [];

    callGatewayMock.mockImplementation(async (opts: unknown) => {
      const request = opts as { method?: string };
      calls.push(request);
      return {};
    });

    const tool = createOpenClawTools({
      agentSessionKey: "discord:group:req",
      agentChannel: "discord",
    });

    const result = await tool.execute("call-thinking-invalid", {
      task: "do thing",
      thinking: "banana",
    });
    expect(result.details).toMatchObject({
      status: "error",
    });
    const errorDetails = result.details as { error?: unknown };
    expect(String(errorDetails.error)).toMatch(/Invalid thinking level/i);
    expect(calls).toHaveLength(0);
  });

  it("sessions_spawn applies default subagent model from defaults config", async () => {
    resetSubagentRegistryForTests();
    callGatewayMock.mockReset();
    setSessionsSpawnConfigOverride({
      session: { mainKey: "main", scope: "per-sender" },
      agents: { defaults: { subagents: { model: "minimax/MiniMax-M2.1" } } },
    });
    const calls: GatewayCall[] = [];
    mockPatchAndSingleAgentRun({ calls, runId: "run-default-model" });

<<<<<<< HEAD
    const tool = createOpenClawTools({
      agentSessionKey: "agent:main:main",
      agentChannel: "discord",
    });

    const result = await tool.execute("call-default-model", {
      task: "do thing",
    });
    expect(result.details).toMatchObject({
      status: "accepted",
      modelApplied: true,
    });

    const patchCall = calls.find(
      (call) => call.method === "sessions.patch" && (call.params as { model?: string })?.model,
    );
    expect(patchCall?.params).toMatchObject({
      model: "minimax/MiniMax-M2.1",
=======
    await expectSpawnUsesConfiguredModel({
      config: {
        session: { mainKey: "main", scope: "per-sender" },
        agents: { defaults: { subagents: { model: "minimax/MiniMax-M2.1" } } },
      },
      runId: "run-default-model",
      callId: "call-default-model",
      expectedModel: "minimax/MiniMax-M2.1",
>>>>>>> ccd68d816 (test(subagents): dedupe sessions_spawn model expectation paths)
    });
  });

  it("sessions_spawn falls back to runtime default model when no model config is set", async () => {
    await expectSpawnUsesConfiguredModel({
      runId: "run-runtime-default-model",
      callId: "call-runtime-default-model",
      expectedModel: `${DEFAULT_PROVIDER}/${DEFAULT_MODEL}`,
    });
  });

  it("sessions_spawn prefers per-agent subagent model over defaults", async () => {
    await expectSpawnUsesConfiguredModel({
      config: {
        session: { mainKey: "main", scope: "per-sender" },
        agents: {
          defaults: { subagents: { model: "minimax/MiniMax-M2.1" } },
          list: [{ id: "research", subagents: { model: "opencode/claude" } }],
        },
      },
      runId: "run-agent-model",
      callId: "call-agent-model",
      expectedModel: "opencode/claude",
    });
  });

  it("sessions_spawn prefers target agent primary model over global default", async () => {
    await expectSpawnUsesConfiguredModel({
      config: {
        session: { mainKey: "main", scope: "per-sender" },
        agents: {
          defaults: { model: { primary: "minimax/MiniMax-M2.1" } },
          list: [{ id: "research", model: { primary: "opencode/claude" } }],
        },
      },
      runId: "run-agent-primary-model",
      callId: "call-agent-primary-model",
      expectedModel: "opencode/claude",
    });
  });

  it("sessions_spawn fails when model patch is rejected", async () => {
    const calls: GatewayCall[] = [];
    mockLongRunningSpawnFlow({
      calls,
      acceptedAtBase: 4000,
      patch: async (request) => {
        const model = (request.params as { model?: unknown } | undefined)?.model;
        if (model === "bad-model") {
          throw new Error("invalid model: bad-model");
        }
        return { ok: true };
      },
    });

    const tool = await getSessionsSpawnTool({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    });

    const result = await tool.execute("call4", {
      task: "do thing",
      runTimeoutSeconds: 1,
      model: "bad-model",
    });
    expect(result.details).toMatchObject({
      status: "error",
    });
    expect(String((result.details as { error?: string }).error ?? "")).toContain("invalid model");
    expect(calls.some((call) => call.method === "agent")).toBe(false);
  });

  it("sessions_spawn supports legacy timeoutSeconds alias", async () => {
    let spawnedTimeout: number | undefined;

    callGatewayMock.mockImplementation(async (opts: unknown) => {
      const request = opts as { method?: string; params?: unknown };
      if (request.method === "agent") {
        const params = request.params as { timeout?: number } | undefined;
        spawnedTimeout = params?.timeout;
        return { runId: "run-1", status: "accepted", acceptedAt: 1000 };
      }
      return {};
    });

    const tool = await getSessionsSpawnTool({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    });

    const result = await tool.execute("call5", {
      task: "do thing",
      timeoutSeconds: 2,
    });
    expect(result.details).toMatchObject({
      status: "accepted",
      runId: "run-1",
    });
    expect(spawnedTimeout).toBe(2);
  });
});
