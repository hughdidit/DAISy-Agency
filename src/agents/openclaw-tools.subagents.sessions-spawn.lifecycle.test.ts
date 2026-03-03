import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { emitAgentEvent } from "../infra/agent-events.js";
<<<<<<< HEAD:src/agents/openclaw-tools.subagents.sessions-spawn-normalizes-allowlisted-agent-ids.e2e.test.ts
<<<<<<< HEAD
import "./test-helpers/fast-core-tools.js";
<<<<<<< HEAD:src/agents/openclaw-tools.subagents.sessions-spawn-normalizes-allowlisted-agent-ids.test.ts
import { createOpenClawTools } from "./openclaw-tools.js";
=======
=======
import { sleep } from "../utils.js";
>>>>>>> 870b1d50d (perf(test): consolidate sessions_spawn e2e tests):src/agents/openclaw-tools.subagents.sessions-spawn.lifecycle.e2e.test.ts
import { createOpenClawTools } from "./openclaw-tools.js";
import "./test-helpers/fast-core-tools.js";
<<<<<<< HEAD
import {
  callGatewayMock,
  resetConfigOverride,
  setConfigOverride,
} from "./openclaw-tools.subagents.sessions-spawn.mocks.js";
>>>>>>> 615f6e1e4 (refactor(test): share sessions_spawn e2e mocks)
import { resetSubagentRegistryForTests } from "./subagent-registry.js";

describe("openclaw-tools: subagents", () => {
=======
>>>>>>> eef13235a (fix(test): make sessions_spawn e2e harness ordering stable)
=======
>>>>>>> cd8eb079e (perf(test): replace subagent lifecycle polling helper)
import {
  getCallGatewayMock,
  getSessionsSpawnTool,
  resetSessionsSpawnConfigOverride,
  setupSessionsSpawnGatewayMock,
  setSessionsSpawnConfigOverride,
} from "./openclaw-tools.subagents.sessions-spawn.test-harness.js";
>>>>>>> dd11a6bcd (refactor(test): share sessions_spawn e2e harness)
import { resetSubagentRegistryForTests } from "./subagent-registry.js";

const fastModeEnv = vi.hoisted(() => {
  const previous = process.env.OPENCLAW_TEST_FAST;
  process.env.OPENCLAW_TEST_FAST = "1";
  return { previous };
});

vi.mock("./pi-embedded.js", () => ({
  isEmbeddedPiRunActive: () => false,
  isEmbeddedPiRunStreaming: () => false,
  queueEmbeddedPiMessage: () => false,
  waitForEmbeddedPiRunEnd: async () => true,
}));

vi.mock("./tools/agent-step.js", () => ({
  readLatestAssistantReply: async () => "done",
}));

const callGatewayMock = getCallGatewayMock();
const RUN_TIMEOUT_SECONDS = 1;

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD:src/agents/openclaw-tools.subagents.sessions-spawn-normalizes-allowlisted-agent-ids.e2e.test.ts
describe("openclaw-tools: subagents", () => {
>>>>>>> e720e022e (test: stabilize sessions_spawn e2e mocks)
type GatewayRequest = { method?: string; params?: unknown };
type AgentWaitCall = { runId?: string; timeoutMs?: number };

=======
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
function buildDiscordCleanupHooks(onDelete: (key: string | undefined) => void) {
  return {
    onAgentSubagentSpawn: (params: unknown) => {
      const rec = params as { channel?: string; timeout?: number } | undefined;
      expect(rec?.channel).toBe("discord");
      expect(rec?.timeout).toBe(1);
    },
    onSessionsDelete: (params: unknown) => {
      const rec = params as { key?: string } | undefined;
      onDelete(rec?.key);
    },
  };
}

function setupSessionsSpawnGatewayMock(opts: {
  includeSessionsList?: boolean;
  includeChatHistory?: boolean;
  onAgentSubagentSpawn?: (params: unknown) => void;
  onSessionsPatch?: (params: unknown) => void;
  onSessionsDelete?: (params: unknown) => void;
  agentWaitResult?: { status: "ok" | "timeout"; startedAt: number; endedAt: number };
}): {
  calls: Array<GatewayRequest>;
  waitCalls: Array<AgentWaitCall>;
  getChild: () => { runId?: string; sessionKey?: string };
} {
  const calls: Array<GatewayRequest> = [];
  const waitCalls: Array<AgentWaitCall> = [];
  let agentCallCount = 0;
  let childRunId: string | undefined;
  let childSessionKey: string | undefined;

  callGatewayMock.mockImplementation(async (optsUnknown: unknown) => {
    const request = optsUnknown as GatewayRequest;
    calls.push(request);

    if (request.method === "sessions.list" && opts.includeSessionsList) {
      return {
        sessions: [
          {
            key: "main",
            lastChannel: "whatsapp",
            lastTo: "+123",
          },
        ],
      };
    }

    if (request.method === "agent") {
      agentCallCount += 1;
      const runId = `run-${agentCallCount}`;
      const params = request.params as { lane?: string; sessionKey?: string } | undefined;
      // Only capture the first agent call (subagent spawn, not main agent trigger)
      if (params?.lane === "subagent") {
        childRunId = runId;
        childSessionKey = params?.sessionKey ?? "";
        opts.onAgentSubagentSpawn?.(params);
      }
      return {
        runId,
        status: "accepted",
        acceptedAt: 1000 + agentCallCount,
      };
    }

    if (request.method === "agent.wait") {
      const params = request.params as AgentWaitCall | undefined;
      waitCalls.push(params ?? {});
      const res = opts.agentWaitResult ?? { status: "ok", startedAt: 1000, endedAt: 2000 };
      return {
        runId: params?.runId ?? "run-1",
        ...res,
      };
    }

    if (request.method === "sessions.patch") {
      opts.onSessionsPatch?.(request.params);
      return { ok: true };
    }

    if (request.method === "sessions.delete") {
      opts.onSessionsDelete?.(request.params);
      return { ok: true };
    }

    if (request.method === "chat.history" && opts.includeChatHistory) {
      return {
        messages: [
          {
            role: "assistant",
            content: [{ type: "text", text: "done" }],
          },
        ],
      };
    }

    return {};
  });

  return {
    calls,
    waitCalls,
    getChild: () => ({ runId: childRunId, sessionKey: childSessionKey }),
  };
}

<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 6b4590be0 (fix(agents): stabilize sessions_spawn e2e suite)
const waitFor = async (predicate: () => boolean, timeoutMs = 1_500) => {
>>>>>>> 0b7c7ee1a (perf(test): speed up sessions_spawn lifecycle suite setup)
  await vi.waitFor(
    () => {
      expect(predicate()).toBe(true);
    },
    { timeout: timeoutMs, interval: 8 },
  );
};

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> bbcbabab7 (fix(ci): repair e2e mocks and tool schemas)
function expectSingleCompletionSend(
  calls: GatewayRequest[],
  expected: { sessionKey: string; channel: string; to: string; message: string },
) {
  const sendCalls = calls.filter((call) => call.method === "send");
  expect(sendCalls).toHaveLength(1);
  const send = sendCalls[0]?.params as
    | { sessionKey?: string; channel?: string; to?: string; message?: string }
    | undefined;
  expect(send?.sessionKey).toBe(expected.sessionKey);
  expect(send?.channel).toBe(expected.channel);
  expect(send?.to).toBe(expected.to);
  expect(send?.message).toBe(expected.message);
}

<<<<<<< HEAD
>>>>>>> 1934eebbf (refactor(agents): dedupe lifecycle send assertions and stable payload stringify)
function createDeleteCleanupHooks(setDeletedKey: (key: string | undefined) => void) {
  return {
    onAgentSubagentSpawn: (params: unknown) => {
      const rec = params as { channel?: string; timeout?: number } | undefined;
      expect(rec?.channel).toBe("discord");
      expect(rec?.timeout).toBe(1);
    },
    onSessionsDelete: (params: unknown) => {
      const rec = params as { key?: string } | undefined;
      setDeletedKey(rec?.key);
    },
  };
}

>>>>>>> d1cb779f5 (test(agents): dedupe embedded runner and sessions lifecycle fixtures)
=======
>>>>>>> 8178ea472 (feat: thread-bound subagents on Discord (#21805))
=======
async function getDiscordGroupSpawnTool() {
  return await getSessionsSpawnTool({
    agentSessionKey: "discord:group:req",
    agentChannel: "discord",
  });
}

async function executeSpawnAndExpectAccepted(params: {
  tool: Awaited<ReturnType<typeof getSessionsSpawnTool>>;
  callId: string;
  cleanup?: "delete" | "keep";
  label?: string;
}) {
  const result = await params.tool.execute(params.callId, {
    task: "do thing",
    runTimeoutSeconds: RUN_TIMEOUT_SECONDS,
    ...(params.cleanup ? { cleanup: params.cleanup } : {}),
    ...(params.label ? { label: params.label } : {}),
  });
  expect(result.details).toMatchObject({
    status: "accepted",
    runId: "run-1",
  });
  return result;
}

>>>>>>> ad1072842 (test: dedupe agent tests and session helpers)
describe("openclaw-tools: subagents (sessions_spawn lifecycle)", () => {
<<<<<<< HEAD
>>>>>>> 870b1d50d (perf(test): consolidate sessions_spawn e2e tests):src/agents/openclaw-tools.subagents.sessions-spawn.lifecycle.e2e.test.ts
=======
>>>>>>> 610863e73 (test: speed up long-running async suites)
  beforeEach(() => {
    resetSessionsSpawnConfigOverride();
    setSessionsSpawnConfigOverride({
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
      messages: {
        queue: {
          debounceMs: 0,
        },
      },
    });
    resetSubagentRegistryForTests();
    callGatewayMock.mockClear();
  });

  afterAll(() => {
    if (fastModeEnv.previous === undefined) {
      delete process.env.OPENCLAW_TEST_FAST;
      return;
    }
    process.env.OPENCLAW_TEST_FAST = fastModeEnv.previous;
  });

  it("sessions_spawn runs cleanup flow after subagent completion", async () => {
    const patchCalls: Array<{ key?: string; label?: string }> = [];

    const ctx = setupSessionsSpawnGatewayMock({
      includeSessionsList: true,
      includeChatHistory: true,
      onSessionsPatch: (params) => {
        const rec = params as { key?: string; label?: string } | undefined;
        patchCalls.push({ key: rec?.key, label: rec?.label });
      },
    });

    const tool = createOpenClawTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    });

    await executeSpawnAndExpectAccepted({
      tool,
      callId: "call2",
      label: "my-task",
    });

<<<<<<< HEAD:src/agents/openclaw-tools.subagents.sessions-spawn-normalizes-allowlisted-agent-ids.e2e.test.ts
    const tool = createOpenClawTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    }).find((candidate) => candidate.name === "sessions_spawn");
    if (!tool) {
      throw new Error("missing sessions_spawn tool");
      throw new Error("missing child runId");
>>>>>>> 870b1d50d (perf(test): consolidate sessions_spawn e2e tests):src/agents/openclaw-tools.subagents.sessions-spawn.lifecycle.e2e.test.ts
    }
    await waitFor(
      () =>
        ctx.waitCalls.some((call) => call.runId === child.runId) &&
        patchCalls.some((call) => call.label === "my-task") &&
        ctx.calls.filter((call) => call.method === "agent").length >= 2,
    );

    const childWait = ctx.waitCalls.find((call) => call.runId === child.runId);
    expect(childWait?.timeoutMs).toBe(1000);
    // Cleanup should patch the label
    const labelPatch = patchCalls.find((call) => call.label === "my-task");
    expect(labelPatch?.key).toBe(child.sessionKey);
    expect(labelPatch?.label).toBe("my-task");

    // Two agent calls: subagent spawn + main agent trigger
    const agentCalls = ctx.calls.filter((c) => c.method === "agent");
    expect(agentCalls).toHaveLength(2);

    // First call: subagent spawn
    const first = agentCalls[0]?.params as { lane?: string } | undefined;
    expect(first?.lane).toBe("subagent");

    // Second call: main agent trigger (not "Sub-agent announce step." anymore)
    const second = agentCalls[1]?.params as { sessionKey?: string; message?: string } | undefined;
    expect(second?.sessionKey).toBe("agent:main:main");
    expect(second?.message).toContain("subagent task");

    // No direct send to external channel (main agent handles delivery)
    const sendCalls = ctx.calls.filter((c) => c.method === "send");
    expect(sendCalls.length).toBe(0);
    expect(child.sessionKey?.startsWith("agent:main:subagent:")).toBe(true);
  });

  it("sessions_spawn runs cleanup via lifecycle events", async () => {
    let deletedKey: string | undefined;
    const ctx = setupSessionsSpawnGatewayMock({
      ...buildDiscordCleanupHooks((key) => {
        deletedKey = key;
      }),
    });

<<<<<<< HEAD
    const tool = createOpenClawTools({
      agentSessionKey: "discord:group:req",
      agentChannel: "discord",
    });

    const result = await tool.execute("call1", {
      task: "do thing",
      runTimeoutSeconds: RUN_TIMEOUT_SECONDS,
=======
    const tool = await getDiscordGroupSpawnTool();
    await executeSpawnAndExpectAccepted({
      tool,
      callId: "call1",
>>>>>>> ad1072842 (test: dedupe agent tests and session helpers)
      cleanup: "delete",
    });

    const child = ctx.getChild();
    if (!child.runId) {
      throw new Error("missing child runId");
    }
<<<<<<< HEAD
    emitAgentEvent({
      runId: childRunId,
      stream: "lifecycle",
      data: {
        phase: "end",
        startedAt: 1234,
        endedAt: 2345,
      },
    });

    await sleep(0);
    await sleep(0);
    await sleep(0);
=======
    await emitLifecycleEndAndFlush({
      runId: child.runId,
      startedAt: 1234,
      endedAt: 2345,
    });
>>>>>>> 3c75bc0e4 (refactor(test): dedupe agent and discord test fixtures)

    await waitFor(
      () => ctx.calls.filter((call) => call.method === "agent").length >= 2 && Boolean(deletedKey),
    );

    const childWait = ctx.waitCalls.find((call) => call.runId === child.runId);
    expect(childWait?.timeoutMs).toBe(1000);

    const agentCalls = ctx.calls.filter((call) => call.method === "agent");
    expect(agentCalls).toHaveLength(2);

    const first = agentCalls[0]?.params as
      | {
          lane?: string;
          deliver?: boolean;
          sessionKey?: string;
          channel?: string;
        }
      | undefined;
    expect(first?.lane).toBe("subagent");
    expect(first?.deliver).toBe(false);
    expect(first?.channel).toBe("discord");
    expect(first?.sessionKey?.startsWith("agent:main:subagent:")).toBe(true);
    expect(child.sessionKey?.startsWith("agent:main:subagent:")).toBe(true);

    const second = agentCalls[1]?.params as
      | {
          sessionKey?: string;
          message?: string;
          deliver?: boolean;
        }
      | undefined;
    expect(second?.sessionKey).toBe("agent:main:discord:group:req");
    expect(second?.deliver).toBe(false);
    expect(second?.message).toContain("subagent task");

    const sendCalls = ctx.calls.filter((c) => c.method === "send");
    expect(sendCalls.length).toBe(0);

    expect(deletedKey?.startsWith("agent:main:subagent:")).toBe(true);
  });

  it("sessions_spawn deletes session when cleanup=delete via agent.wait", async () => {
    let deletedKey: string | undefined;
    const ctx = setupSessionsSpawnGatewayMock({
      includeChatHistory: true,
      ...buildDiscordCleanupHooks((key) => {
        deletedKey = key;
      }),
      agentWaitResult: { status: "ok", startedAt: 3000, endedAt: 4000 },
    });

    const tool = await getDiscordGroupSpawnTool();
    await executeSpawnAndExpectAccepted({
      tool,
      callId: "call1b",
      cleanup: "delete",
    });

    const child = ctx.getChild();
    if (!child.runId) {
      throw new Error("missing child runId");
    }
    await waitFor(
      () =>
        ctx.waitCalls.some((call) => call.runId === child.runId) &&
        ctx.calls.filter((call) => call.method === "agent").length >= 2 &&
        Boolean(deletedKey),
    );

    const childWait = ctx.waitCalls.find((call) => call.runId === child.runId);
    expect(childWait?.timeoutMs).toBe(1000);
    expect(child.sessionKey?.startsWith("agent:main:subagent:")).toBe(true);

    // Two agent calls: subagent spawn + main agent trigger
    const agentCalls = ctx.calls.filter((call) => call.method === "agent");
    expect(agentCalls).toHaveLength(2);

    // First call: subagent spawn
    const first = agentCalls[0]?.params as { lane?: string } | undefined;
    expect(first?.lane).toBe("subagent");

    // Second call: main agent trigger
    const second = agentCalls[1]?.params as { sessionKey?: string; deliver?: boolean } | undefined;
    expect(second?.sessionKey).toBe("agent:main:discord:group:req");
    expect(second?.deliver).toBe(false);

    // No direct send to external channel (main agent handles delivery)
    const sendCalls = ctx.calls.filter((c) => c.method === "send");
    expect(sendCalls.length).toBe(0);

    // Session should be deleted
    expect(deletedKey?.startsWith("agent:main:subagent:")).toBe(true);
  });

  it("sessions_spawn reports timed out when agent.wait returns timeout", async () => {
    const ctx = setupSessionsSpawnGatewayMock({
      includeChatHistory: true,
      chatHistoryText: "still working",
      agentWaitResult: { status: "timeout", startedAt: 6000, endedAt: 7000 },
    });

    const tool = await getDiscordGroupSpawnTool();
    await executeSpawnAndExpectAccepted({
      tool,
      callId: "call-timeout",
      cleanup: "keep",
    });

    await waitFor(() => ctx.calls.filter((call) => call.method === "agent").length >= 2);

    const mainAgentCall = ctx.calls
      .filter((call) => call.method === "agent")
      .find((call) => {
        const params = call.params as { lane?: string } | undefined;
        return params?.lane !== "subagent";
      });
    const mainMessage = (mainAgentCall?.params as { message?: string } | undefined)?.message ?? "";

    expect(mainMessage).toContain("timed out");
    expect(mainMessage).not.toContain("completed successfully");
  });

  it("sessions_spawn announces with requester accountId", async () => {
    const ctx = setupSessionsSpawnGatewayMock({});

    const tool = createOpenClawTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
      agentAccountId: "kev",
    });

    await executeSpawnAndExpectAccepted({
      tool,
      callId: "call-announce-account",
      cleanup: "keep",
    });

    const child = ctx.getChild();
    if (!child.runId) {
      throw new Error("missing child runId");
    }
<<<<<<< HEAD
    emitAgentEvent({
      runId: childRunId,
      stream: "lifecycle",
      data: {
        phase: "end",
        startedAt: 1000,
        endedAt: 2000,
      },
    });

    await sleep(0);
    await sleep(0);
    await sleep(0);
=======
    await emitLifecycleEndAndFlush({
      runId: child.runId,
      startedAt: 1000,
      endedAt: 2000,
    });
>>>>>>> 3c75bc0e4 (refactor(test): dedupe agent and discord test fixtures)

    const agentCalls = ctx.calls.filter((call) => call.method === "agent");
    expect(agentCalls).toHaveLength(2);
    const announceParams = agentCalls[1]?.params as
      | { accountId?: string; channel?: string; deliver?: boolean }
      | undefined;
    expect(announceParams?.deliver).toBe(false);
    expect(announceParams?.channel).toBeUndefined();
    expect(announceParams?.accountId).toBeUndefined();
  });
});
