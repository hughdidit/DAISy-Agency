import { beforeEach, describe, expect, it, vi } from "vitest";

const agentSpy = vi.fn(async () => ({ runId: "run-main", status: "ok" }));
const sessionsDeleteSpy = vi.fn();
const readLatestAssistantReplyMock = vi.fn(async () => "raw subagent reply");
const embeddedRunMock = {
  isEmbeddedPiRunActive: vi.fn(() => false),
  isEmbeddedPiRunStreaming: vi.fn(() => false),
  queueEmbeddedPiMessage: vi.fn(() => false),
  waitForEmbeddedPiRunEnd: vi.fn(async () => true),
};
let sessionStore: Record<string, Record<string, unknown>> = {};
let configOverride: ReturnType<(typeof import("../config/config.js"))["loadConfig"]> = {
  session: {
    mainKey: "main",
    scope: "per-sender",
  },
};

vi.mock("../gateway/call.js", () => ({
  callGateway: vi.fn(async (req: unknown) => {
    const typed = req as { method?: string; params?: { message?: string; sessionKey?: string } };
    if (typed.method === "agent") {
      return await agentSpy(typed);
    }
    if (typed.method === "agent.wait") {
      return { status: "error", startedAt: 10, endedAt: 20, error: "boom" };
    }
<<<<<<< HEAD
    if (typed.method === "sessions.patch") return {};
    if (typed.method === "sessions.delete") return {};
=======
    if (typed.method === "sessions.patch") {
      return {};
    }
    if (typed.method === "sessions.delete") {
      sessionsDeleteSpy(typed);
      return {};
    }
>>>>>>> 191da1feb (fix: context overflow compaction and subagent announce improvements (#11664) (thanks @tyler6204))
    return {};
  }),
}));

vi.mock("./tools/agent-step.js", () => ({
  readLatestAssistantReply: readLatestAssistantReplyMock,
}));

vi.mock("../config/sessions.js", () => ({
  loadSessionStore: vi.fn(() => sessionStore),
  resolveAgentIdFromSessionKey: () => "main",
  resolveStorePath: () => "/tmp/sessions.json",
  resolveMainSessionKey: () => "agent:main:main",
  readSessionUpdatedAt: vi.fn(() => undefined),
  recordSessionMetaFromInbound: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./pi-embedded.js", () => embeddedRunMock);

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: () => configOverride,
  };
});

describe("subagent announce formatting", () => {
  beforeEach(() => {
    agentSpy.mockClear();
    sessionsDeleteSpy.mockClear();
    embeddedRunMock.isEmbeddedPiRunActive.mockReset().mockReturnValue(false);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReset().mockReturnValue(false);
    embeddedRunMock.queueEmbeddedPiMessage.mockReset().mockReturnValue(false);
    embeddedRunMock.waitForEmbeddedPiRunEnd.mockReset().mockResolvedValue(true);
    readLatestAssistantReplyMock.mockReset().mockResolvedValue("raw subagent reply");
    sessionStore = {};
    configOverride = {
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
    };
  });

  it("sends instructional message to main agent with status and findings", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-123",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      task: "do thing",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: true,
      startedAt: 10,
      endedAt: 20,
    });

    expect(agentSpy).toHaveBeenCalled();
    const call = agentSpy.mock.calls[0]?.[0] as {
      params?: { message?: string; sessionKey?: string };
    };
    const msg = call?.params?.message as string;
    expect(call?.params?.sessionKey).toBe("agent:main:main");
    expect(msg).toContain("background task");
    expect(msg).toContain("failed");
    expect(msg).toContain("boom");
    expect(msg).toContain("Findings:");
    expect(msg).toContain("raw subagent reply");
    expect(msg).toContain("Stats:");
  });

  it("includes success status when outcome is ok", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    // Use waitForCompletion: false so it uses the provided outcome instead of calling agent.wait
    await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-456",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      task: "do thing",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    const call = agentSpy.mock.calls[0]?.[0] as { params?: { message?: string } };
    const msg = call?.params?.message as string;
    expect(msg).toContain("completed successfully");
  });

  it("steers announcements into an active run when queue mode is steer", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(true);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(true);
    embeddedRunMock.queueEmbeddedPiMessage.mockReturnValue(true);
    sessionStore = {
      "agent:main:main": {
        sessionId: "session-123",
        lastChannel: "whatsapp",
        lastTo: "+1555",
        queueMode: "steer",
      },
    };

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-789",
      requesterSessionKey: "main",
      requesterDisplayKey: "main",
      task: "do thing",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    expect(didAnnounce).toBe(true);
    expect(embeddedRunMock.queueEmbeddedPiMessage).toHaveBeenCalledWith(
      "session-123",
      expect.stringContaining("background task"),
    );
    expect(agentSpy).not.toHaveBeenCalled();
  });

  it("queues announce delivery with origin account routing", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(true);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);
    sessionStore = {
      "agent:main:main": {
        sessionId: "session-456",
        lastChannel: "whatsapp",
        lastTo: "+1555",
        lastAccountId: "kev",
        queueMode: "collect",
        queueDebounceMs: 0,
      },
    };

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-999",
      requesterSessionKey: "main",
      requesterDisplayKey: "main",
      task: "do thing",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    expect(didAnnounce).toBe(true);
<<<<<<< HEAD
    await expect.poll(() => agentSpy.mock.calls.length).toBe(1);
=======
    const params = await getSingleAgentCallParams();
    expect(params.channel).toBe("whatsapp");
    expect(params.to).toBe("+1555");
    expect(params.accountId).toBe("kev");
  });

  it("keeps queued idempotency unique for same-ms distinct child runs", async () => {
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(true);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);
    sessionStore = {
      "agent:main:main": {
        sessionId: "session-followup",
        lastChannel: "whatsapp",
        lastTo: "+1555",
        queueMode: "followup",
        queueDebounceMs: 0,
      },
    };
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    try {
      await runSubagentAnnounceFlow({
        childSessionKey: "agent:main:subagent:worker",
        childRunId: "run-1",
        requesterSessionKey: "main",
        requesterDisplayKey: "main",
        ...defaultOutcomeAnnounce,
        task: "first task",
      });
      await runSubagentAnnounceFlow({
        childSessionKey: "agent:main:subagent:worker",
        childRunId: "run-2",
        requesterSessionKey: "main",
        requesterDisplayKey: "main",
        ...defaultOutcomeAnnounce,
        task: "second task",
      });
    } finally {
      nowSpy.mockRestore();
    }

    expect(agentSpy).toHaveBeenCalledTimes(2);
    const idempotencyKeys = agentSpy.mock.calls
      .map((call) => (call[0] as { params?: Record<string, unknown> })?.params?.idempotencyKey)
      .filter((value): value is string => typeof value === "string");
    expect(idempotencyKeys).toContain("announce:v1:agent:main:subagent:worker:run-1");
    expect(idempotencyKeys).toContain("announce:v1:agent:main:subagent:worker:run-2");
    expect(new Set(idempotencyKeys).size).toBe(2);
  });

  it("prefers direct delivery first for completion-mode and then queues on direct failure", async () => {
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(true);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);
    sessionStore = {
      "agent:main:main": {
        sessionId: "session-collect",
        lastChannel: "whatsapp",
        lastTo: "+1555",
        queueMode: "collect",
        queueDebounceMs: 0,
      },
    };
    sendSpy.mockRejectedValueOnce(new Error("direct delivery unavailable"));

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:worker",
      childRunId: "run-completion-direct-fallback",
      requesterSessionKey: "main",
      requesterDisplayKey: "main",
      expectsCompletionMessage: true,
      ...defaultOutcomeAnnounce,
    });

    expect(didAnnounce).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(agentSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0]?.[0]).toMatchObject({
      method: "send",
      params: { sessionKey: "agent:main:main" },
    });
    expect(agentSpy.mock.calls[0]?.[0]).toMatchObject({
      method: "agent",
      params: { sessionKey: "agent:main:main" },
    });
    expect(agentSpy.mock.calls[0]?.[0]).toMatchObject({
      method: "agent",
      params: { channel: "whatsapp", to: "+1555", deliver: true },
    });
  });

  it("falls back to internal requester-session injection when completion route is missing", async () => {
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(false);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);
    sessionStore = {
      "agent:main:main": {
        sessionId: "requester-session-no-route",
      },
    };
    agentSpy.mockImplementationOnce(async (req: AgentCallRequest) => {
      const deliver = req.params?.deliver;
      const channel = req.params?.channel;
      if (deliver === true && typeof channel !== "string") {
        throw new Error("Channel is required when deliver=true");
      }
      return { runId: "run-main", status: "ok" };
    });

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:worker",
      childRunId: "run-completion-missing-route",
      requesterSessionKey: "main",
      requesterDisplayKey: "main",
      expectsCompletionMessage: true,
      ...defaultOutcomeAnnounce,
    });

    expect(didAnnounce).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(0);
    expect(agentSpy).toHaveBeenCalledTimes(1);
    expect(agentSpy.mock.calls[0]?.[0]).toMatchObject({
      method: "agent",
      params: {
        sessionKey: "agent:main:main",
        deliver: false,
      },
    });
  });

  it("uses direct completion delivery when explicit channel+to route is available", async () => {
    sessionStore = {
      "agent:main:main": {
        sessionId: "requester-session-direct-route",
      },
    };
    agentSpy.mockImplementationOnce(async () => {
      throw new Error("agent fallback should not run when direct route exists");
    });

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:worker",
      childRunId: "run-completion-explicit-route",
      requesterSessionKey: "main",
      requesterDisplayKey: "main",
      requesterOrigin: { channel: "discord", to: "channel:12345", accountId: "acct-1" },
      expectsCompletionMessage: true,
      ...defaultOutcomeAnnounce,
    });

    expect(didAnnounce).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(agentSpy).toHaveBeenCalledTimes(0);
    expect(sendSpy.mock.calls[0]?.[0]).toMatchObject({
      method: "send",
      params: {
        sessionKey: "agent:main:main",
        channel: "discord",
        to: "channel:12345",
      },
    });
  });

  it("returns failure for completion-mode when direct delivery fails and queue fallback is unavailable", async () => {
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(false);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);
    sessionStore = {
      "agent:main:main": {
        sessionId: "session-direct-only",
        lastChannel: "whatsapp",
        lastTo: "+1555",
      },
    };
    sendSpy.mockRejectedValueOnce(new Error("direct delivery unavailable"));

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:worker",
      childRunId: "run-completion-direct-fail",
      requesterSessionKey: "main",
      requesterDisplayKey: "main",
      expectsCompletionMessage: true,
      ...defaultOutcomeAnnounce,
    });

    expect(didAnnounce).toBe(false);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(agentSpy).toHaveBeenCalledTimes(0);
  });

  it("uses assistant output for completion-mode when latest assistant text exists", async () => {
    chatHistoryMock.mockResolvedValueOnce({
      messages: [
        {
          role: "toolResult",
          content: [{ type: "text", text: "old tool output" }],
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "assistant completion text" }],
        },
      ],
    });
    readLatestAssistantReplyMock.mockResolvedValue("");

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:worker",
      childRunId: "run-completion-assistant-output",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      requesterOrigin: { channel: "discord", to: "channel:12345", accountId: "acct-1" },
      expectsCompletionMessage: true,
      ...defaultOutcomeAnnounce,
    });

    expect(didAnnounce).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const call = sendSpy.mock.calls[0]?.[0] as { params?: { message?: string } };
    const msg = call?.params?.message as string;
    expect(msg).toContain("assistant completion text");
    expect(msg).not.toContain("old tool output");
  });

  it("falls back to latest tool output for completion-mode when assistant output is empty", async () => {
    chatHistoryMock.mockResolvedValueOnce({
      messages: [
        {
          role: "assistant",
          content: [{ type: "text", text: "" }],
        },
        {
          role: "toolResult",
          content: [{ type: "text", text: "tool output only" }],
        },
      ],
    });
    readLatestAssistantReplyMock.mockResolvedValue("");

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:worker",
      childRunId: "run-completion-tool-output",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      requesterOrigin: { channel: "discord", to: "channel:12345", accountId: "acct-1" },
      expectsCompletionMessage: true,
      ...defaultOutcomeAnnounce,
    });

    expect(didAnnounce).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const call = sendSpy.mock.calls[0]?.[0] as { params?: { message?: string } };
    const msg = call?.params?.message as string;
    expect(msg).toContain("tool output only");
  });

  it("ignores user text when deriving fallback completion output", async () => {
    chatHistoryMock.mockResolvedValueOnce({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "user prompt should not be announced" }],
        },
      ],
    });
    readLatestAssistantReplyMock.mockResolvedValue("");

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:worker",
      childRunId: "run-completion-ignore-user",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      requesterOrigin: { channel: "discord", to: "channel:12345", accountId: "acct-1" },
      expectsCompletionMessage: true,
      ...defaultOutcomeAnnounce,
    });

    expect(didAnnounce).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const call = sendSpy.mock.calls[0]?.[0] as { params?: { message?: string } };
    const msg = call?.params?.message as string;
    expect(msg).toContain("✅ Subagent main finished");
    expect(msg).not.toContain("user prompt should not be announced");
  });

  it("queues announce delivery back into requester subagent session", async () => {
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(true);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);
    sessionStore = {
      "agent:main:subagent:orchestrator": {
        sessionId: "session-orchestrator",
        spawnDepth: 1,
        queueMode: "collect",
        queueDebounceMs: 0,
      },
    };

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:worker",
      childRunId: "run-worker-queued",
      requesterSessionKey: "agent:main:subagent:orchestrator",
      requesterDisplayKey: "agent:main:subagent:orchestrator",
      requesterOrigin: { channel: "whatsapp", to: "+1555", accountId: "acct" },
      ...defaultOutcomeAnnounce,
    });

    expect(didAnnounce).toBe(true);
    expect(agentSpy).toHaveBeenCalledTimes(1);
>>>>>>> 3eabd5389 (Tests: add regressions for subagent completion fallback and explicit direct route)

    const call = agentSpy.mock.calls[0]?.[0] as { params?: Record<string, unknown> };
    expect(call?.params?.channel).toBe("whatsapp");
    expect(call?.params?.to).toBe("+1555");
    expect(call?.params?.accountId).toBe("kev");
  });

  it("splits collect-mode queues when accountId differs", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(true);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);
    sessionStore = {
      "agent:main:main": {
        sessionId: "session-acc-split",
        lastChannel: "whatsapp",
        lastTo: "+1555",
        queueMode: "collect",
        queueDebounceMs: 80,
      },
    };

    await Promise.all([
      runSubagentAnnounceFlow({
        childSessionKey: "agent:main:subagent:test-a",
        childRunId: "run-a",
        requesterSessionKey: "main",
        requesterDisplayKey: "main",
        requesterOrigin: { accountId: "acct-a" },
        task: "do thing",
        timeoutMs: 1000,
        cleanup: "keep",
        waitForCompletion: false,
        startedAt: 10,
        endedAt: 20,
        outcome: { status: "ok" },
      }),
      runSubagentAnnounceFlow({
        childSessionKey: "agent:main:subagent:test-b",
        childRunId: "run-b",
        requesterSessionKey: "main",
        requesterDisplayKey: "main",
        requesterOrigin: { accountId: "acct-b" },
        task: "do thing",
        timeoutMs: 1000,
        cleanup: "keep",
        waitForCompletion: false,
        startedAt: 10,
        endedAt: 20,
        outcome: { status: "ok" },
      }),
    ]);

    await new Promise((r) => setTimeout(r, 120));
    expect(agentSpy).toHaveBeenCalledTimes(2);
    const accountIds = agentSpy.mock.calls.map(
      (call) => (call?.[0] as { params?: { accountId?: string } })?.params?.accountId,
    );
    expect(accountIds).toEqual(expect.arrayContaining(["acct-a", "acct-b"]));
  });

  it("uses requester origin for direct announce when not queued", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(false);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-direct",
      requesterSessionKey: "agent:main:main",
      requesterOrigin: { channel: "whatsapp", accountId: "acct-123" },
      requesterDisplayKey: "main",
      task: "do thing",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    expect(didAnnounce).toBe(true);
    const call = agentSpy.mock.calls[0]?.[0] as { params?: Record<string, unknown> };
    expect(call?.params?.channel).toBe("whatsapp");
    expect(call?.params?.accountId).toBe("acct-123");
  });

  it("retries reading subagent output when early lifecycle completion had no text", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValueOnce(true).mockReturnValue(false);
    embeddedRunMock.waitForEmbeddedPiRunEnd.mockResolvedValue(true);
    readLatestAssistantReplyMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce("Read #12 complete.");
    sessionStore = {
      "agent:main:subagent:test": {
        sessionId: "child-session-1",
      },
    };

    await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-child",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      task: "context-stress-test",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    expect(embeddedRunMock.waitForEmbeddedPiRunEnd).toHaveBeenCalledWith("child-session-1", 1000);
    const call = agentSpy.mock.calls[0]?.[0] as { params?: { message?: string } };
    expect(call?.params?.message).toContain("Read #12 complete.");
    expect(call?.params?.message).not.toContain("(no output)");
  });

  it("defers announce when child run is still active after wait timeout", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(true);
    embeddedRunMock.waitForEmbeddedPiRunEnd.mockResolvedValue(false);
    sessionStore = {
      "agent:main:subagent:test": {
        sessionId: "child-session-active",
      },
    };

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-child-active",
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      task: "context-stress-test",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    expect(didAnnounce).toBe(false);
    expect(agentSpy).not.toHaveBeenCalled();
  });

  it("does not delete child session when announce is deferred for an active run", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(true);
    embeddedRunMock.waitForEmbeddedPiRunEnd.mockResolvedValue(false);
    sessionStore = {
      "agent:main:subagent:test": {
        sessionId: "child-session-active",
      },
    };

    const didAnnounce = await runSubagentAnnounceFlow({
<<<<<<< HEAD
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-child-active-delete",
=======
      childSessionKey: "agent:main:subagent:parent",
      childRunId: "run-parent-synth",
      requesterSessionKey: "agent:main:subagent:orchestrator",
      requesterDisplayKey: "agent:main:subagent:orchestrator",
      ...defaultOutcomeAnnounce,
      timeoutMs: 100,
    });

    expect(didAnnounce).toBe(true);
    const call = agentSpy.mock.calls[0]?.[0] as { params?: { message?: string } };
    const msg = call?.params?.message ?? "";
    expect(msg).toContain("Final synthesized answer.");
    expect(msg).not.toContain("Waiting for child output...");
  });

  it("bubbles child announce to parent requester when requester subagent already ended", async () => {
    subagentRegistryMock.isSubagentSessionRunActive.mockReturnValue(false);
    subagentRegistryMock.resolveRequesterForChildSession.mockReturnValue({
>>>>>>> 78c3c2a54 (fix: stabilize flaky tests and sanitize directive-only chat tags)
      requesterSessionKey: "agent:main:main",
      requesterDisplayKey: "main",
      task: "context-stress-test",
      timeoutMs: 1000,
      cleanup: "delete",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    expect(didAnnounce).toBe(false);
    expect(sessionsDeleteSpy).not.toHaveBeenCalled();
  });

  it("normalizes requesterOrigin for direct announce delivery", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(false);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-direct-origin",
      requesterSessionKey: "agent:main:main",
      requesterOrigin: { channel: " whatsapp ", accountId: " acct-987 " },
      requesterDisplayKey: "main",
      task: "do thing",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    expect(didAnnounce).toBe(true);
    const call = agentSpy.mock.calls[0]?.[0] as { params?: Record<string, unknown> };
    expect(call?.params?.channel).toBe("whatsapp");
    expect(call?.params?.accountId).toBe("acct-987");
  });

  it("prefers requesterOrigin channel over stale session lastChannel in queued announce", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(true);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);
    // Session store has stale whatsapp channel, but the requesterOrigin says bluebubbles.
    sessionStore = {
      "agent:main:main": {
        sessionId: "session-stale",
        lastChannel: "whatsapp",
        queueMode: "collect",
        queueDebounceMs: 0,
      },
    };

    const didAnnounce = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-stale-channel",
      requesterSessionKey: "main",
      requesterOrigin: { channel: "bluebubbles", to: "bluebubbles:chat_guid:123" },
      requesterDisplayKey: "main",
      task: "do thing",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    expect(didAnnounce).toBe(true);
    await expect.poll(() => agentSpy.mock.calls.length).toBe(1);

    const call = agentSpy.mock.calls[0]?.[0] as { params?: Record<string, unknown> };
    // The channel should match requesterOrigin, NOT the stale session entry.
    expect(call?.params?.channel).toBe("bluebubbles");
    expect(call?.params?.to).toBe("bluebubbles:chat_guid:123");
  });

  it("splits collect-mode announces when accountId differs", async () => {
    const { runSubagentAnnounceFlow } = await import("./subagent-announce.js");
    embeddedRunMock.isEmbeddedPiRunActive.mockReturnValue(true);
    embeddedRunMock.isEmbeddedPiRunStreaming.mockReturnValue(false);
    sessionStore = {
      "agent:main:main": {
        sessionId: "session-789",
        lastChannel: "whatsapp",
        lastTo: "+1555",
        queueMode: "collect",
        queueDebounceMs: 0,
      },
    };

    await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-a",
      requesterSessionKey: "main",
      requesterOrigin: { accountId: "acct-a" },
      requesterDisplayKey: "main",
      task: "do thing",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:subagent:test",
      childRunId: "run-b",
      requesterSessionKey: "main",
      requesterOrigin: { accountId: "acct-b" },
      requesterDisplayKey: "main",
      task: "do thing",
      timeoutMs: 1000,
      cleanup: "keep",
      waitForCompletion: false,
      startedAt: 10,
      endedAt: 20,
      outcome: { status: "ok" },
    });

    await expect.poll(() => agentSpy.mock.calls.length).toBe(2);

    const accountIds = agentSpy.mock.calls.map(
      (call) => (call[0] as { params?: Record<string, unknown> }).params?.accountId,
    );
    expect(accountIds).toContain("acct-a");
    expect(accountIds).toContain("acct-b");
    expect(agentSpy).toHaveBeenCalledTimes(2);
  });
});
