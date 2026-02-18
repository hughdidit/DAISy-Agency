import { describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
import type { ChatLog } from "./components/chat-log.js";
=======
>>>>>>> 003d6c45d (chore: Fix types in tests 6/N.)
import { createEventHandlers } from "./tui-event-handlers.js";
import type { AgentEvent, ChatEvent, TuiStateAccess } from "./tui-types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)

<<<<<<< HEAD
<<<<<<< HEAD
import { createEventHandlers } from "./tui-event-handlers.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { AgentEvent, ChatEvent, TuiStateAccess } from "./tui-types.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { createEventHandlers } from "./tui-event-handlers.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { AgentEvent, ChatEvent, TuiStateAccess } from "./tui-types.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
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
=======
type MockFn = ReturnType<typeof vi.fn>;
type HandlerChatLog = {
  startTool: (...args: unknown[]) => void;
  updateToolResult: (...args: unknown[]) => void;
  addSystem: (...args: unknown[]) => void;
  updateAssistant: (...args: unknown[]) => void;
  finalizeAssistant: (...args: unknown[]) => void;
  dropAssistant: (...args: unknown[]) => void;
};
type HandlerTui = { requestRender: (...args: unknown[]) => void };
type MockChatLog = {
  startTool: MockFn;
  updateToolResult: MockFn;
  addSystem: MockFn;
  updateAssistant: MockFn;
  finalizeAssistant: MockFn;
  dropAssistant: MockFn;
};
type MockTui = { requestRender: MockFn };
>>>>>>> 003d6c45d (chore: Fix types in tests 6/N.)

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
    const chatLog = {
      startTool: vi.fn(),
      updateToolResult: vi.fn(),
      addSystem: vi.fn(),
      updateAssistant: vi.fn(),
      finalizeAssistant: vi.fn(),
      dropAssistant: vi.fn(),
<<<<<<< HEAD
    };
    const tui = { requestRender: vi.fn() };
=======
    } as unknown as MockChatLog & HandlerChatLog;
    const tui = { requestRender: vi.fn() } as unknown as MockTui & HandlerTui;
>>>>>>> 003d6c45d (chore: Fix types in tests 6/N.)
    const setActivityStatus = vi.fn();

    return { chatLog, tui, state, setActivityStatus };
  };

<<<<<<< HEAD
  it("processes tool events when runId matches activeChatRunId (even if sessionId differs)", () => {
    const state = makeState({ currentSessionId: "session-xyz", activeChatRunId: "run-123" });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleAgentEvent } = createEventHandlers({
      // Casts are fine here: TUI runtime shape is larger than we need in unit tests.
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: chatLog as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
=======
  const createHandlersHarness = (params?: {
    state?: Partial<TuiStateAccess>;
    chatLog?: HandlerChatLog;
  }) => {
    const state = makeState(params?.state);
    const context = makeContext(state);
    const chatLog = (params?.chatLog ?? context.chatLog) as MockChatLog & HandlerChatLog;
    const handlers = createEventHandlers({
      chatLog,
      tui: context.tui,
>>>>>>> a69e7682c (refactor(test): dedupe channel and monitor action suites)
      state,
      setActivityStatus: context.setActivityStatus,
      loadHistory: context.loadHistory,
      isLocalRunId: context.isLocalRunId,
      forgetLocalRunId: context.forgetLocalRunId,
    });
    return {
      ...context,
      state,
      chatLog,
      ...handlers,
    };
  };

  it("processes tool events when runId matches activeChatRunId (even if sessionId differs)", () => {
    const { chatLog, tui, handleAgentEvent } = createHandlersHarness({
      state: { currentSessionId: "session-xyz", activeChatRunId: "run-123" },
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
<<<<<<< HEAD
    const state = makeState({ activeChatRunId: "run-1" });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleAgentEvent } = createEventHandlers({
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: chatLog as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
      state,
      setActivityStatus,
=======
    const { chatLog, tui, handleAgentEvent } = createHandlersHarness({
      state: { activeChatRunId: "run-1" },
>>>>>>> a69e7682c (refactor(test): dedupe channel and monitor action suites)
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
<<<<<<< HEAD
    const state = makeState({ activeChatRunId: "run-9" });
    const { tui, setActivityStatus } = makeContext(state);
    const { handleAgentEvent } = createEventHandlers({
<<<<<<< HEAD
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: { startTool: vi.fn(), updateToolResult: vi.fn() } as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
=======
      chatLog: {
        startTool: vi.fn(),
        updateToolResult: vi.fn(),
        addSystem: vi.fn(),
        updateAssistant: vi.fn(),
        finalizeAssistant: vi.fn(),
        dropAssistant: vi.fn(),
      } as unknown as HandlerChatLog,
      tui,
>>>>>>> 003d6c45d (chore: Fix types in tests 6/N.)
      state,
      setActivityStatus,
=======
    const chatLog = {
      startTool: vi.fn(),
      updateToolResult: vi.fn(),
      addSystem: vi.fn(),
      updateAssistant: vi.fn(),
      finalizeAssistant: vi.fn(),
      dropAssistant: vi.fn(),
    } as unknown as HandlerChatLog;
    const { tui, setActivityStatus, handleAgentEvent } = createHandlersHarness({
      state: { activeChatRunId: "run-9" },
      chatLog,
>>>>>>> a69e7682c (refactor(test): dedupe channel and monitor action suites)
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
<<<<<<< HEAD
    const state = makeState({ activeChatRunId: null });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleChatEvent, handleAgentEvent } = createEventHandlers({
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: chatLog as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
      state,
      setActivityStatus,
=======
    const { state, chatLog, handleChatEvent, handleAgentEvent } = createHandlersHarness({
      state: { activeChatRunId: null },
>>>>>>> a69e7682c (refactor(test): dedupe channel and monitor action suites)
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
<<<<<<< HEAD
    const state = makeState({ activeChatRunId: null });
    const { chatLog, tui, setActivityStatus } = makeContext(state);
    const { handleChatEvent, handleAgentEvent } = createEventHandlers({
      // oxlint-disable-next-line typescript/no-explicit-any
      chatLog: chatLog as any,
      // oxlint-disable-next-line typescript/no-explicit-any
      tui: tui as any,
      state,
      setActivityStatus,
=======
    const { state, chatLog, tui, handleChatEvent, handleAgentEvent } = createHandlersHarness({
      state: { activeChatRunId: null },
>>>>>>> a69e7682c (refactor(test): dedupe channel and monitor action suites)
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

<<<<<<< HEAD
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
=======
  it("accepts tool events after chat final for the same run", () => {
    const { state, chatLog, tui, handleChatEvent, handleAgentEvent } = createHandlersHarness({
      state: { activeChatRunId: null },
    });

    handleChatEvent({
      runId: "run-final",
      sessionKey: state.currentSessionKey,
      state: "final",
      message: { content: [{ type: "text", text: "done" }] },
    });

    handleAgentEvent({
      runId: "run-final",
      stream: "tool",
      data: { phase: "start", toolCallId: "tc-final", name: "session_status" },
    });

    expect(chatLog.startTool).toHaveBeenCalledWith("tc-final", "session_status", undefined);
    expect(tui.requestRender).toHaveBeenCalled();
  });

  it("ignores lifecycle updates for non-active runs in the same session", () => {
    const { state, tui, setActivityStatus, handleChatEvent, handleAgentEvent } =
      createHandlersHarness({
        state: { activeChatRunId: "run-active" },
      });
>>>>>>> a69e7682c (refactor(test): dedupe channel and monitor action suites)

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
    const { chatLog, tui, handleAgentEvent } = createHandlersHarness({
      state: {
        activeChatRunId: "run-123",
        sessionInfo: { verboseLevel: "off" },
      },
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
    const { chatLog, handleAgentEvent } = createHandlersHarness({
      state: {
        activeChatRunId: "run-123",
        sessionInfo: { verboseLevel: "on" },
      },
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
    const { state, loadHistory, handleChatEvent } = createHandlersHarness({
      state: { activeChatRunId: null },
    });

    handleChatEvent({
      runId: "external-run",
      sessionKey: state.currentSessionKey,
      state: "final",
      message: { content: [{ type: "text", text: "done" }] },
    });

    expect(loadHistory).toHaveBeenCalledTimes(1);
  });

  function createConcurrentRunHarness(localContent = "partial") {
    const { state, chatLog, setActivityStatus, loadHistory, handleChatEvent } =
      createHandlersHarness({
        state: { activeChatRunId: "run-active" },
      });

    handleChatEvent({
      runId: "run-active",
      sessionKey: state.currentSessionKey,
      state: "delta",
      message: { content: localContent },
    });

    return { state, chatLog, setActivityStatus, loadHistory, handleChatEvent };
  }

  it("does not reload history or clear active run when another run final arrives mid-stream", () => {
    const { state, chatLog, setActivityStatus, loadHistory, handleChatEvent } =
      createConcurrentRunHarness("partial");

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
    const { state, chatLog, loadHistory, handleChatEvent } =
      createConcurrentRunHarness("local stream");

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
    const { state, chatLog, handleChatEvent } = createHandlersHarness({
      state: { activeChatRunId: null },
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
