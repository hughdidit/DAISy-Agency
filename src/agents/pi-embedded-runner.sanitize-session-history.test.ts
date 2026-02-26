import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { SessionManager } from "@mariozechner/pi-coding-agent";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as helpers from "./pi-embedded-helpers.js";
<<<<<<< HEAD
=======
import {
  expectGoogleModelApiFullSanitizeCall,
  loadSanitizeSessionHistoryWithCleanMocks,
  makeMockSessionManager,
  makeInMemorySessionManager,
  makeModelSnapshotEntry,
  makeReasoningAssistantMessages,
  makeSimpleUserMessages,
  sanitizeSnapshotChangedOpenAIReasoning,
  type SanitizeSessionHistoryFn,
  sanitizeWithOpenAIResponses,
  TEST_SESSION_ID,
} from "./pi-embedded-runner.sanitize-session-history.test-harness.js";
import { makeZeroUsageSnapshot } from "./usage.js";
>>>>>>> 7e0b3f16e (fix: preserve assistant usage snapshots during compaction cleanup)

type SanitizeSessionHistory =
  typeof import("./pi-embedded-runner/google.js").sanitizeSessionHistory;
let sanitizeSessionHistory: SanitizeSessionHistory;

// Mock dependencies
vi.mock("./pi-embedded-helpers.js", async () => {
  const actual = await vi.importActual("./pi-embedded-helpers.js");
  return {
    ...actual,
    isGoogleModelApi: vi.fn(),
    sanitizeSessionMessagesImages: vi.fn().mockImplementation(async (msgs) => msgs),
  };
});

// We don't mock session-transcript-repair.js as it is a pure function and complicates mocking.
// We rely on the real implementation which should pass through our simple messages.

describe("sanitizeSessionHistory", () => {
  const mockSessionManager = {
    getEntries: vi.fn().mockReturnValue([]),
    appendCustomEntry: vi.fn(),
  } as unknown as SessionManager;

  const mockMessages: AgentMessage[] = [{ role: "user", content: "hello" }];

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(helpers.sanitizeSessionMessagesImages).mockImplementation(async (msgs) => msgs);
    vi.resetModules();
    ({ sanitizeSessionHistory } = await import("./pi-embedded-runner/google.js"));
  });

  it("sanitizes tool call ids for Google model APIs", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(true);

    await sanitizeSessionHistory({
      messages: mockMessages,
      modelApi: "google-generative-ai",
      provider: "google-vertex",
      sessionManager: mockSessionManager,
      sessionId: "test-session",
    });

    expect(helpers.sanitizeSessionMessagesImages).toHaveBeenCalledWith(
      mockMessages,
      "session:history",
      expect.objectContaining({ sanitizeMode: "full", sanitizeToolCallIds: true }),
    );
  });

  it("sanitizes tool call ids with strict9 for Mistral models", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    await sanitizeSessionHistory({
      messages: mockMessages,
      modelApi: "openai-responses",
      provider: "openrouter",
      modelId: "mistralai/devstral-2512:free",
      sessionManager: mockSessionManager,
      sessionId: "test-session",
    });

    expect(helpers.sanitizeSessionMessagesImages).toHaveBeenCalledWith(
      mockMessages,
      "session:history",
      expect.objectContaining({
        sanitizeMode: "full",
        sanitizeToolCallIds: true,
        toolCallIdMode: "strict9",
      }),
    );
  });

  it("does not sanitize tool call ids for non-Google APIs", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    await sanitizeSessionHistory({
      messages: mockMessages,
      modelApi: "anthropic-messages",
      provider: "anthropic",
      sessionManager: mockSessionManager,
      sessionId: "test-session",
    });

    expect(helpers.sanitizeSessionMessagesImages).toHaveBeenCalledWith(
      mockMessages,
      "session:history",
      expect.objectContaining({ sanitizeMode: "full", sanitizeToolCallIds: false }),
    );
  });

  it("does not sanitize tool call ids for openai-responses", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    await sanitizeSessionHistory({
      messages: mockMessages,
      modelApi: "openai-responses",
      provider: "openai",
      sessionManager: mockSessionManager,
      sessionId: "test-session",
    });

    expect(helpers.sanitizeSessionMessagesImages).toHaveBeenCalledWith(
      mockMessages,
      "session:history",
      expect.objectContaining({ sanitizeMode: "images-only", sanitizeToolCallIds: false }),
    );
  });

  it("annotates inter-session user messages before context sanitization", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const messages: AgentMessage[] = [
      {
        role: "user",
        content: "forwarded instruction",
        provenance: {
          kind: "inter_session",
          sourceSessionKey: "agent:main:req",
          sourceTool: "sessions_send",
        },
      } as unknown as AgentMessage,
    ];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-responses",
      provider: "openai",
      sessionManager: mockSessionManager,
      sessionId: "test-session",
    });

    const first = result[0] as Extract<AgentMessage, { role: "user" }>;
    expect(first.role).toBe("user");
    expect(typeof first.content).toBe("string");
    expect(first.content as string).toContain("[Inter-session message]");
    expect(first.content as string).toContain("sourceSession=agent:main:req");
  });

<<<<<<< HEAD
=======
  it("drops stale assistant usage snapshots kept before latest compaction summary", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const messages = [
      { role: "user", content: "old context" },
      {
        role: "assistant",
        content: [{ type: "text", text: "old answer" }],
        stopReason: "stop",
        usage: {
          input: 191_919,
          output: 2_000,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 193_919,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
      },
      {
        role: "compactionSummary",
        summary: "compressed",
        tokensBefore: 191_919,
        timestamp: new Date().toISOString(),
      },
    ] as unknown as AgentMessage[];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-responses",
      provider: "openai",
      sessionManager: mockSessionManager,
      sessionId: TEST_SESSION_ID,
    });

    const staleAssistant = result.find((message) => message.role === "assistant") as
      | (AgentMessage & { usage?: unknown })
      | undefined;
    expect(staleAssistant).toBeDefined();
    expect(staleAssistant?.usage).toEqual(makeZeroUsageSnapshot());
  });

  it("preserves fresh assistant usage snapshots created after latest compaction summary", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const messages = [
      {
        role: "assistant",
        content: [{ type: "text", text: "pre-compaction answer" }],
        stopReason: "stop",
        usage: {
          input: 120_000,
          output: 3_000,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 123_000,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
      },
      {
        role: "compactionSummary",
        summary: "compressed",
        tokensBefore: 123_000,
        timestamp: new Date().toISOString(),
      },
      { role: "user", content: "new question" },
      {
        role: "assistant",
        content: [{ type: "text", text: "fresh answer" }],
        stopReason: "stop",
        usage: {
          input: 1_000,
          output: 250,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 1_250,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
      },
    ] as unknown as AgentMessage[];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-responses",
      provider: "openai",
      sessionManager: mockSessionManager,
      sessionId: TEST_SESSION_ID,
    });

    const assistants = result.filter((message) => message.role === "assistant") as Array<
      AgentMessage & { usage?: unknown }
    >;
    expect(assistants).toHaveLength(2);
    expect(assistants[0]?.usage).toEqual(makeZeroUsageSnapshot());
    expect(assistants[1]?.usage).toBeDefined();
  });

  it("drops stale usage when compaction summary appears before kept assistant messages", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const compactionTs = Date.parse("2026-02-26T12:00:00.000Z");
    const messages = [
      {
        role: "compactionSummary",
        summary: "compressed",
        tokensBefore: 191_919,
        timestamp: new Date(compactionTs).toISOString(),
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "kept pre-compaction answer" }],
        stopReason: "stop",
        timestamp: compactionTs - 1_000,
        usage: {
          input: 191_919,
          output: 2_000,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 193_919,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
      },
    ] as unknown as AgentMessage[];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-responses",
      provider: "openai",
      sessionManager: mockSessionManager,
      sessionId: TEST_SESSION_ID,
    });

    const assistant = result.find((message) => message.role === "assistant") as
      | (AgentMessage & { usage?: unknown })
      | undefined;
    expect(assistant?.usage).toEqual(makeZeroUsageSnapshot());
  });

  it("keeps fresh usage after compaction timestamp in summary-first ordering", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const compactionTs = Date.parse("2026-02-26T12:00:00.000Z");
    const messages = [
      {
        role: "compactionSummary",
        summary: "compressed",
        tokensBefore: 123_000,
        timestamp: new Date(compactionTs).toISOString(),
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "kept pre-compaction answer" }],
        stopReason: "stop",
        timestamp: compactionTs - 2_000,
        usage: {
          input: 120_000,
          output: 3_000,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 123_000,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
      },
      { role: "user", content: "new question", timestamp: compactionTs + 1_000 },
      {
        role: "assistant",
        content: [{ type: "text", text: "fresh answer" }],
        stopReason: "stop",
        timestamp: compactionTs + 2_000,
        usage: {
          input: 1_000,
          output: 250,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 1_250,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
      },
    ] as unknown as AgentMessage[];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-responses",
      provider: "openai",
      sessionManager: mockSessionManager,
      sessionId: TEST_SESSION_ID,
    });

    const assistants = result.filter((message) => message.role === "assistant") as Array<
      AgentMessage & { usage?: unknown; content?: unknown }
    >;
    const keptAssistant = assistants.find((message) =>
      JSON.stringify(message.content).includes("kept pre-compaction answer"),
    );
    const freshAssistant = assistants.find((message) =>
      JSON.stringify(message.content).includes("fresh answer"),
    );
    expect(keptAssistant?.usage).toEqual(makeZeroUsageSnapshot());
    expect(freshAssistant?.usage).toBeDefined();
  });

>>>>>>> 7e0b3f16e (fix: preserve assistant usage snapshots during compaction cleanup)
  it("keeps reasoning-only assistant messages for openai-responses", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const messages: AgentMessage[] = [
      { role: "user", content: "hello" },
      {
        role: "assistant",
        stopReason: "aborted",
        content: [
          {
            type: "thinking",
            thinking: "reasoning",
            thinkingSignature: "sig",
          },
        ],
      },
    ];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-responses",
      provider: "openai",
      sessionManager: mockSessionManager,
      sessionId: "test-session",
    });

    expect(result).toHaveLength(2);
    expect(result[1]?.role).toBe("assistant");
  });

  it("does not synthesize tool results for openai-responses", async () => {
    const messages: AgentMessage[] = [
      {
        role: "assistant",
        content: [{ type: "toolCall", id: "call_1", name: "read", arguments: {} }],
      },
    ];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-responses",
      provider: "openai",
      sessionManager: mockSessionManager,
      sessionId: "test-session",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe("assistant");
  });

  it("does not downgrade openai reasoning when the model has not changed", async () => {
    const sessionEntries: Array<{ type: string; customType: string; data: unknown }> = [
      {
        type: "custom",
        customType: "model-snapshot",
        data: {
          timestamp: Date.now(),
          provider: "openai",
          modelApi: "openai-responses",
          modelId: "gpt-5.2-codex",
        },
      },
    ];
    const sessionManager = {
      getEntries: vi.fn(() => sessionEntries),
      appendCustomEntry: vi.fn((customType: string, data: unknown) => {
        sessionEntries.push({ type: "custom", customType, data });
      }),
    } as unknown as SessionManager;
    const messages: AgentMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: "reasoning",
            thinkingSignature: JSON.stringify({ id: "rs_test", type: "reasoning" }),
          },
        ],
      },
    ];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-responses",
      provider: "openai",
<<<<<<< HEAD
=======
      sessionManager: mockSessionManager,
      sessionId: "test-session",
    });

    expect(result.map((msg) => msg.role)).toEqual(["user"]);
  });

  it("downgrades orphaned openai reasoning even when the model has not changed", async () => {
    const sessionEntries = [
      makeModelSnapshotEntry({
        provider: "openai",
        modelApi: "openai-responses",
        modelId: "gpt-5.2-codex",
      }),
    ];
    const sessionManager = makeInMemorySessionManager(sessionEntries);
    const messages = makeReasoningAssistantMessages({ thinkingSignature: "json" });

    const result = await sanitizeWithOpenAIResponses({
      sanitizeSessionHistory,
      messages,
>>>>>>> 46bf210e0 (fix: always drop orphaned OpenAI reasoning blocks in session history)
      modelId: "gpt-5.2-codex",
      sessionManager,
      sessionId: "test-session",
    });

    expect(result).toEqual([]);
  });

  it("downgrades openai reasoning only when the model changes", async () => {
    const sessionEntries: Array<{ type: string; customType: string; data: unknown }> = [
      {
        type: "custom",
        customType: "model-snapshot",
        data: {
          timestamp: Date.now(),
          provider: "anthropic",
          modelApi: "anthropic-messages",
          modelId: "claude-3-7",
        },
      },
    ];
    const sessionManager = {
      getEntries: vi.fn(() => sessionEntries),
      appendCustomEntry: vi.fn((customType: string, data: unknown) => {
        sessionEntries.push({ type: "custom", customType, data });
      }),
    } as unknown as SessionManager;
    const messages: AgentMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: "reasoning",
            thinkingSignature: { id: "rs_test", type: "reasoning" },
          },
        ],
      },
    ];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-responses",
      provider: "openai",
      modelId: "gpt-5.2-codex",
      sessionManager,
      sessionId: "test-session",
    });

    expect(result).toEqual([]);
  });

  it("drops assistant thinking blocks for github-copilot models", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const messages = [
      { role: "user", content: "hello" },
      {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: "internal",
            thinkingSignature: "reasoning_text",
          },
          { type: "text", text: "hi" },
        ],
      },
    ] as unknown as AgentMessage[];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-completions",
      provider: "github-copilot",
      modelId: "claude-opus-4.6",
      sessionManager: makeMockSessionManager(),
      sessionId: TEST_SESSION_ID,
    });

    expect(result[1]?.role).toBe("assistant");
    const assistant = result[1] as Extract<AgentMessage, { role: "assistant" }>;
    expect(assistant.content).toEqual([{ type: "text", text: "hi" }]);
  });

  it("preserves assistant turn when all content is thinking blocks (github-copilot)", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const messages = [
      { role: "user", content: "hello" },
      {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: "some reasoning",
            thinkingSignature: "reasoning_text",
          },
        ],
      },
      { role: "user", content: "follow up" },
    ] as unknown as AgentMessage[];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-completions",
      provider: "github-copilot",
      modelId: "claude-opus-4.6",
      sessionManager: makeMockSessionManager(),
      sessionId: TEST_SESSION_ID,
    });

    // Assistant turn should be preserved (not dropped) to maintain turn alternation
    expect(result).toHaveLength(3);
    expect(result[1]?.role).toBe("assistant");
    const assistant = result[1] as Extract<AgentMessage, { role: "assistant" }>;
    expect(assistant.content).toEqual([{ type: "text", text: "" }]);
  });

  it("preserves tool_use blocks when dropping thinking blocks (github-copilot)", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const messages = [
      { role: "user", content: "read a file" },
      {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: "I should use the read tool",
            thinkingSignature: "reasoning_text",
          },
          { type: "toolCall", id: "tool_123", name: "read", arguments: { path: "/tmp/test" } },
          { type: "text", text: "Let me read that file." },
        ],
      },
    ] as unknown as AgentMessage[];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-completions",
      provider: "github-copilot",
      modelId: "claude-opus-4.6",
      sessionManager: makeMockSessionManager(),
      sessionId: TEST_SESSION_ID,
    });

    expect(result[1]?.role).toBe("assistant");
    const assistant = result[1] as Extract<AgentMessage, { role: "assistant" }>;
    const types = assistant.content.map((b: { type: string }) => b.type);
    expect(types).toContain("toolCall");
    expect(types).toContain("text");
    expect(types).not.toContain("thinking");
  });

  it("does not drop thinking blocks for non-copilot providers", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const messages = [
      { role: "user", content: "hello" },
      {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: "internal",
            thinkingSignature: "some_sig",
          },
          { type: "text", text: "hi" },
        ],
      },
    ] as unknown as AgentMessage[];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "anthropic-messages",
      provider: "anthropic",
      modelId: "claude-opus-4-6",
      sessionManager: makeMockSessionManager(),
      sessionId: TEST_SESSION_ID,
    });

    expect(result[1]?.role).toBe("assistant");
    const assistant = result[1] as Extract<AgentMessage, { role: "assistant" }>;
    const types = assistant.content.map((b: { type: string }) => b.type);
    expect(types).toContain("thinking");
  });

  it("does not drop thinking blocks for non-claude copilot models", async () => {
    vi.mocked(helpers.isGoogleModelApi).mockReturnValue(false);

    const messages = [
      { role: "user", content: "hello" },
      {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: "internal",
            thinkingSignature: "some_sig",
          },
          { type: "text", text: "hi" },
        ],
      },
    ] as unknown as AgentMessage[];

    const result = await sanitizeSessionHistory({
      messages,
      modelApi: "openai-completions",
      provider: "github-copilot",
      modelId: "gpt-5.2",
      sessionManager: makeMockSessionManager(),
      sessionId: TEST_SESSION_ID,
    });

    expect(result[1]?.role).toBe("assistant");
    const assistant = result[1] as Extract<AgentMessage, { role: "assistant" }>;
    const types = assistant.content.map((b: { type: string }) => b.type);
    expect(types).toContain("thinking");
  });
});
