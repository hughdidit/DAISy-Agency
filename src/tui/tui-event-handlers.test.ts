import { describe, expect, it, vi } from "vitest";

<<<<<<< HEAD
import { createEventHandlers } from "./tui-event-handlers.js";
import type { AgentEvent, ChatEvent, TuiStateAccess } from "./tui-types.js";

type MockChatLog = {
  startTool: ReturnType<typeof vi.fn>;
  updateToolResult: ReturnType<typeof vi.fn>;
  addSystem: ReturnType<typeof vi.fn>;
  updateAssistant: ReturnType<typeof vi.fn>;
  finalizeAssistant: ReturnType<typeof vi.fn>;
};
=======
type MockChatLog = Pick<
  ChatLog,
  | "startTool"
  | "updateToolResult"
  | "addSystem"
  | "updateAssistant"
  | "finalizeAssistant"
  | "dropAssistant"
>;
type MockTui = Pick<TUI, "requestRender">;
>>>>>>> 078642b30 (fix(discord): defer component interactions to prevent timeout (#16287))

describe("tui-event-handlers: handleAgentEvent", () => {
  const makeState = (overrides?: Partial<TuiStateAccess>): TuiStateAccess => ({
    agentDefaultId: "main",
    sessionMainKey: "agent:main:main",
    sessionScope: "global",
    agents: [],
    currentAgentId: "main",
    currentSessionKey: "agent:main:main",
    currentSessionId: "session-1",
    activeChatRunId: "run-1",
    historyLoaded: true,
    sessionInfo: {},
    initialSessionApplied: true,
    isConnected: true,
    autoMessageSent: false,
    toolsExpanded: false,
    showThinking: false,
    connectionStatus: "connected",
    activityStatus: "idle",
    statusTimeout: null,
    lastCtrlCAt: 0,
    ...overrides,
  });

  const makeContext = (state: TuiStateAccess) => {
    const chatLog: MockChatLog = {
      startTool: vi.fn(),
      updateToolResult: vi.fn(),
      addSystem: vi.fn(),
      updateAssistant: vi.fn(),
      finalizeAssistant: vi.fn(),
      dropAssistant: vi.fn(),
    };
    const tui = { requestRender: vi.fn() };
    const setActivityStatus = vi.fn();

    return { chatLog, tui, state, setActivityStatus };
  };

  it("processes tool events when runId matches activeChatRunId (even if sessionId differs)", () => {
    const state = makeState({ currentSessionId: "session-xyz", activeChatRunId: "run-123" });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleAgentEvent } = createEventHandlers({
      // Casts are fine here: TUI runtime shape is larger than we need in unit tests.
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: chatLog as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
      state,
      setActivityStatus,
    });

    const evt: AgentEvent = {
      runId: "run-123",
      stream: "tool",
      data: {
        phase: "start",
        toolCallId: "tc1",
        name: "exec",
        args: { command: "echo hi" },
      },
    };

    handleAgentEvent(evt);

    expect(chatLog.startTool).toHaveBeenCalledWith("tc1", "exec", { command: "echo hi" });
    expect(tui.requestRender).toHaveBeenCalledTimes(1);
  });

  it("ignores tool events when runId does not match activeChatRunId", () => {
    const state = makeState({ activeChatRunId: "run-1" });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleAgentEvent } = createEventHandlers({
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: chatLog as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
      state,
      setActivityStatus,
    });

    const evt: AgentEvent = {
      runId: "run-2",
      stream: "tool",
      data: { phase: "start", toolCallId: "tc1", name: "exec" },
    };

    handleAgentEvent(evt);

    expect(chatLog.startTool).not.toHaveBeenCalled();
    expect(chatLog.updateToolResult).not.toHaveBeenCalled();
    expect(tui.requestRender).not.toHaveBeenCalled();
  });

  it("processes lifecycle events when runId matches activeChatRunId", () => {
    const state = makeState({ activeChatRunId: "run-9" });
    const { tui, setActivityStatus } = makeContext(state);
    const { handleAgentEvent } = createEventHandlers({
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: { startTool: vi.fn(), updateToolResult: vi.fn() } as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
      state,
      setActivityStatus,
    });

    const evt: AgentEvent = {
      runId: "run-9",
      stream: "lifecycle",
      data: { phase: "start" },
    };

    handleAgentEvent(evt);

    expect(setActivityStatus).toHaveBeenCalledWith("running");
    expect(tui.requestRender).toHaveBeenCalledTimes(1);
  });

  it("captures runId from chat events when activeChatRunId is unset", () => {
    const state = makeState({ activeChatRunId: null });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleChatEvent, handleAgentEvent } = createEventHandlers({
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: chatLog as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
      state,
      setActivityStatus,
    });

    const chatEvt: ChatEvent = {
      runId: "run-42",
      sessionKey: state.currentSessionKey,
      state: "delta",
      message: { content: "hello" },
    };

    handleChatEvent(chatEvt);

    expect(state.activeChatRunId).toBe("run-42");

    const agentEvt: AgentEvent = {
      runId: "run-42",
      stream: "tool",
      data: { phase: "start", toolCallId: "tc1", name: "exec" },
    };

    handleAgentEvent(agentEvt);

    expect(chatLog.startTool).toHaveBeenCalledWith("tc1", "exec", undefined);
  });

  it("clears run mapping when the session changes", () => {
    const state = makeState({ activeChatRunId: null });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleChatEvent, handleAgentEvent } = createEventHandlers({
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: chatLog as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
      state,
      setActivityStatus,
    });

    handleChatEvent({
      runId: "run-old",
      sessionKey: state.currentSessionKey,
      state: "delta",
      message: { content: "hello" },
    });

    state.currentSessionKey = "agent:main:other";
    state.activeChatRunId = null;
    tui.requestRender.mockClear();

    handleAgentEvent({
      runId: "run-old",
      stream: "tool",
      data: { phase: "start", toolCallId: "tc2", name: "exec" },
    });

    expect(chatLog.startTool).not.toHaveBeenCalled();
    expect(tui.requestRender).not.toHaveBeenCalled();
  });

  it("ignores lifecycle updates for non-active runs in the same session", () => {
    const state = makeState({ activeChatRunId: "run-active" });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleChatEvent, handleAgentEvent } = createEventHandlers({
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: chatLog as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
      state,
      setActivityStatus,
    });

    handleChatEvent({
      runId: "run-other",
      sessionKey: state.currentSessionKey,
      state: "delta",
      message: { content: "hello" },
    });
    setActivityStatus.mockClear();
    tui.requestRender.mockClear();

    handleAgentEvent({
      runId: "run-other",
      stream: "lifecycle",
      data: { phase: "end" },
    });

    expect(setActivityStatus).not.toHaveBeenCalled();
    expect(tui.requestRender).not.toHaveBeenCalled();
  });
<<<<<<< HEAD
=======

  it("suppresses tool events when verbose is off", () => {
    const state = makeState({
      activeChatRunId: "run-123",
      sessionInfo: { verboseLevel: "off" },
    });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleAgentEvent } = createEventHandlers({
      chatLog,
      tui,
      state,
      setActivityStatus,
    });

    handleAgentEvent({
      runId: "run-123",
      stream: "tool",
      data: { phase: "start", toolCallId: "tc-off", name: "session_status" },
    });

    expect(chatLog.startTool).not.toHaveBeenCalled();
    expect(tui.requestRender).not.toHaveBeenCalled();
  });

  it("omits tool output when verbose is on (non-full)", () => {
    const state = makeState({
      activeChatRunId: "run-123",
      sessionInfo: { verboseLevel: "on" },
    });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleAgentEvent } = createEventHandlers({
      chatLog,
      tui,
      state,
      setActivityStatus,
    });

    handleAgentEvent({
      runId: "run-123",
      stream: "tool",
      data: {
        phase: "update",
        toolCallId: "tc-on",
        name: "session_status",
        partialResult: { content: [{ type: "text", text: "secret" }] },
      },
    });

    handleAgentEvent({
      runId: "run-123",
      stream: "tool",
      data: {
        phase: "result",
        toolCallId: "tc-on",
        name: "session_status",
        result: { content: [{ type: "text", text: "secret" }] },
        isError: false,
      },
    });

    expect(chatLog.updateToolResult).toHaveBeenCalledTimes(1);
    expect(chatLog.updateToolResult).toHaveBeenCalledWith(
      "tc-on",
      { content: [] },
      { isError: false },
    );
  });

  it("refreshes history after a non-local chat final", () => {
    const state = makeState({ activeChatRunId: null });
    const { chatLog, tui, setActivityStatus, loadHistory, isLocalRunId, forgetLocalRunId } =
      makeContext(state);
    const { handleChatEvent } = createEventHandlers({
      chatLog,
      tui,
      state,
      setActivityStatus,
      loadHistory,
      isLocalRunId,
      forgetLocalRunId,
    });

    handleChatEvent({
      runId: "external-run",
      sessionKey: state.currentSessionKey,
      state: "final",
      message: { content: [{ type: "text", text: "done" }] },
    });

    expect(loadHistory).toHaveBeenCalledTimes(1);
  });

  it("does not reload history or clear active run when another run final arrives mid-stream", () => {
    const state = makeState({ activeChatRunId: "run-active" });
    const { chatLog, tui, setActivityStatus, loadHistory, isLocalRunId, forgetLocalRunId } =
      makeContext(state);
    const { handleChatEvent } = createEventHandlers({
      chatLog,
      tui,
      state,
      setActivityStatus,
      loadHistory,
      isLocalRunId,
      forgetLocalRunId,
    });

    handleChatEvent({
      runId: "run-active",
      sessionKey: state.currentSessionKey,
      state: "delta",
      message: { content: "partial" },
    });

    loadHistory.mockClear();
    setActivityStatus.mockClear();

    handleChatEvent({
      runId: "run-other",
      sessionKey: state.currentSessionKey,
      state: "final",
      message: { content: [{ type: "text", text: "other final" }] },
    });

    expect(loadHistory).not.toHaveBeenCalled();
    expect(state.activeChatRunId).toBe("run-active");
    expect(setActivityStatus).not.toHaveBeenCalledWith("idle");

    handleChatEvent({
      runId: "run-active",
      sessionKey: state.currentSessionKey,
      state: "delta",
      message: { content: "continued" },
    });

    expect(chatLog.updateAssistant).toHaveBeenLastCalledWith("continued", "run-active");
  });

  it("suppresses non-local empty final placeholders during concurrent runs", () => {
    const state = makeState({ activeChatRunId: "run-active" });
    const { chatLog, tui, setActivityStatus, loadHistory, isLocalRunId, forgetLocalRunId } =
      makeContext(state);
    const { handleChatEvent } = createEventHandlers({
      chatLog,
      tui,
      state,
      setActivityStatus,
      loadHistory,
      isLocalRunId,
      forgetLocalRunId,
    });

    handleChatEvent({
      runId: "run-active",
      sessionKey: state.currentSessionKey,
      state: "delta",
      message: { content: "local stream" },
    });

    loadHistory.mockClear();
    chatLog.finalizeAssistant.mockClear();
    chatLog.dropAssistant.mockClear();

    handleChatEvent({
      runId: "run-other",
      sessionKey: state.currentSessionKey,
      state: "final",
      message: { content: [] },
    });

    expect(chatLog.finalizeAssistant).not.toHaveBeenCalledWith("(no output)", "run-other");
    expect(chatLog.dropAssistant).toHaveBeenCalledWith("run-other");
    expect(loadHistory).not.toHaveBeenCalled();
    expect(state.activeChatRunId).toBe("run-active");
  });

  it("drops streaming assistant when chat final has no message", () => {
    const state = makeState({ activeChatRunId: null });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleChatEvent } = createEventHandlers({
      chatLog,
      tui,
      state,
      setActivityStatus,
    });

    handleChatEvent({
      runId: "run-silent",
      sessionKey: state.currentSessionKey,
      state: "delta",
      message: { content: "hello" },
    });
    chatLog.dropAssistant.mockClear();
    chatLog.finalizeAssistant.mockClear();

    handleChatEvent({
      runId: "run-silent",
      sessionKey: state.currentSessionKey,
      state: "final",
    });

    expect(chatLog.dropAssistant).toHaveBeenCalledWith("run-silent");
    expect(chatLog.finalizeAssistant).not.toHaveBeenCalled();
  });
>>>>>>> 078642b30 (fix(discord): defer component interactions to prevent timeout (#16287))
});
