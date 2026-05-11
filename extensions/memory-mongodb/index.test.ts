import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mcpClientMocks = vi.hoisted(() => ({
  insertMany: vi.fn(),
  aggregate: vi.fn().mockResolvedValue([]),
  deleteOne: vi.fn().mockResolvedValue(true),
  updateMany: vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
  countDocuments: vi.fn().mockResolvedValue(0),
  close: vi.fn().mockResolvedValue(undefined),
  setRuntimeEnvOverrides: vi.fn(),
}));

const defaultToolContext = {
  agentId: "main",
  sessionKey: "agent:main:main",
};

function materializeTool(
  toolOrFactory: unknown,
  opts?: { name?: string },
  ctx: Record<string, unknown> = defaultToolContext,
) {
  if (typeof toolOrFactory === "function") {
    const built = (toolOrFactory as (ctx: Record<string, unknown>) => unknown)(ctx);
    if (!built || typeof built !== "object") {
      throw new Error("tool factory did not return a tool");
    }
    const named = built as { name?: string };
    if (!named.name && opts?.name) {
      named.name = opts.name;
    }
    return built;
  }
  return toolOrFactory;
}

function memoryInsertCalls() {
  return mcpClientMocks.insertMany.mock.calls.filter((call) => call[1] === "memories");
}

vi.mock("./mcp-client-service.js", () => ({
  McpClientService: vi.fn(function MockMcpClientService() {
    return mcpClientMocks;
  }),
}));

vi.mock("./gemini-service.js", () => ({
  GeminiService: vi.fn(function MockGeminiService() {
    return {
      embed: vi.fn().mockResolvedValue([0.1, 0.2]),
    };
  }),
}));

describe("memory-mongodb plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mcpClientMocks.aggregate.mockResolvedValue([]);
    mcpClientMocks.deleteOne.mockResolvedValue(true);
    mcpClientMocks.updateMany.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    mcpClientMocks.countDocuments.mockResolvedValue(0);
    mcpClientMocks.close.mockResolvedValue(undefined);
  });
  test("plugin metadata is correct", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(memoryPlugin.id).toBe("memory-mongodb");
    expect(memoryPlugin.name).toBe("Memory (MongoDB MCP + Gemini)");
    expect(memoryPlugin.kind).toBe("memory");
    expect(memoryPlugin.configSchema).toBeDefined();
    expect(memoryPlugin.register).toBeInstanceOf(Function);
  });

  test("tools support store -> recall -> forget -> recall round-trip behavior", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const registeredTools = new Map<string, any>();
    let storedDocument: Record<string, unknown> | null = null;
    const deletedIds = new Set<string>();

    mcpClientMocks.insertMany.mockImplementation(async (_database, _collection, documents) => {
      storedDocument = documents[0] as Record<string, unknown>;
      return 1;
    });
    mcpClientMocks.aggregate.mockImplementation(async () => {
      if (!storedDocument) {
        return [];
      }
      const id = storedDocument._id;
      if (typeof id === "string" && deletedIds.has(id)) {
        return [];
      }
      return [
        {
          ...storedDocument,
          score: 0.99,
        },
      ];
    });
    mcpClientMocks.deleteOne.mockImplementation(async (_database, _collection, filter) => {
      const id = filter?._id;
      if (typeof id !== "string") {
        return false;
      }
      if (!storedDocument || storedDocument._id !== id || deletedIds.has(id)) {
        return false;
      }
      deletedIds.add(id);
      return true;
    });

    memoryPlugin.register({
      pluginConfig: {
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      registerTool: (tool: unknown, opts?: { name?: string }) => {
        const resolved = materializeTool(tool, opts) as { name: string };
        registeredTools.set(resolved.name, resolved);
      },
      registerCli: vi.fn(),
      registerService: vi.fn(),
      on: vi.fn(),
    } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

    const memoryStore = registeredTools.get("memory_store");
    const memoryRecall = registeredTools.get("memory_recall");
    const memoryForget = registeredTools.get("memory_forget");
    expect(memoryStore).toBeDefined();
    expect(memoryRecall).toBeDefined();
    expect(memoryForget).toBeDefined();

    const storeResult = await memoryStore.execute("tc_store", {
      text: "mcp round trip probe",
      importance: 0.7,
      category: "fact",
    });
    const storedId = storeResult.details?.id as string;
    expect(storeResult.details?.action).toBe("created");
    expect(typeof storedId).toBe("string");
    expect(storedId.length).toBeGreaterThan(0);

    const recallBeforeForget = await memoryRecall.execute("tc_recall_1", {
      query: "mcp round trip probe",
      limit: 5,
    });
    expect(recallBeforeForget.details?.count).toBe(1);

    const forgetResult = await memoryForget.execute("tc_forget", {
      memoryId: storedId,
    });
    expect(forgetResult.details?.action).toBe("deleted");

    const recallAfterForget = await memoryRecall.execute("tc_recall_2", {
      query: "mcp round trip probe",
      limit: 5,
    });
    expect(recallAfterForget.details?.count).toBe(0);
  });

  test("registers memory-ops primitives and supports scoped execution", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const registeredTools = new Map<string, any>();

    mcpClientMocks.insertMany.mockResolvedValue(1);
    mcpClientMocks.aggregate.mockResolvedValue([]);

    memoryPlugin.register({
      pluginConfig: {
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      registerTool: (tool: unknown, opts?: { name?: string }) => {
        const resolved = materializeTool(tool, opts) as { name: string };
        registeredTools.set(resolved.name, resolved);
      },
      registerCli: vi.fn(),
      registerService: vi.fn(),
      on: vi.fn(),
    } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

    const required = [
      "memory_capture",
      "memory_hygiene",
      "commitment_tracker",
      "preference_miner",
      "memory_audit",
      "memory_recallx",
    ];
    for (const name of required) {
      expect(registeredTools.has(name)).toBe(true);
    }

    const memoryRecall = registeredTools.get("memory_recall");
    const memoryRecallX = registeredTools.get("memory_recallx");
    expect(memoryRecall).toBeDefined();
    expect(memoryRecallX).toBeDefined();

    const memoryRecallProps = Object.keys(memoryRecall.parameters?.properties ?? {}).sort();
    expect(memoryRecallProps).toEqual(["limit", "query"]);

    const memoryRecallXProps = Object.keys(memoryRecallX.parameters?.properties ?? {});
    expect(memoryRecallXProps).toContain("kinds");
    expect(memoryRecallXProps).toContain("openCommitmentsOnly");
    expect(memoryRecallXProps).toContain("preferencesOnly");
    expect(memoryRecallXProps).toContain("modalities");
    expect(memoryRecallXProps).toContain("includeSecrets");
    expect(memoryRecallXProps).toContain("includeMetadata");

    const memoryCapture = registeredTools.get("memory_capture");
    const captureResult = await memoryCapture.execute("tc_capture", {
      entries: [
        {
          text: "I prefer concise responses",
          kind: "preference",
          importance: 0.8,
          confidence: 0.9,
          preference: {
            key: "response_style",
            value: "concise",
          },
        },
      ],
    });
    expect(Array.isArray(captureResult.details?.outcomes)).toBe(true);

    const memoryHygiene = registeredTools.get("memory_hygiene");
    const hygieneResult = await memoryHygiene.execute("tc_hygiene", {
      mode: "plan",
    });
    expect(hygieneResult.details?.mode).toBe("plan");
  });

  test("memory_store rejects secret-like content by default and allows explicit secret storage", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const registeredTools = new Map<string, any>();

    mcpClientMocks.insertMany.mockResolvedValue(1);
    mcpClientMocks.aggregate.mockResolvedValue([]);

    memoryPlugin.register({
      pluginConfig: {
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      registerTool: (tool: unknown, opts?: { name?: string }) => {
        const resolved = materializeTool(tool, opts) as { name: string };
        registeredTools.set(resolved.name, resolved);
      },
      registerCli: vi.fn(),
      registerService: vi.fn(),
      on: vi.fn(),
    } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

    const memoryStore = registeredTools.get("memory_store");
    expect(memoryStore).toBeDefined();

    const rejected = await memoryStore.execute("tc_store_secret_default", {
      text: "apiKey=super-secret",
      importance: 0.9,
      category: "fact",
    });
    expect(rejected.details?.action).toBe("rejected_secret");
    expect(rejected.content[0]?.text).toContain("sensitivity=secret");

    const stored = await memoryStore.execute("tc_store_secret_explicit", {
      text: "apiKey=super-secret",
      importance: 0.9,
      category: "fact",
      sensitivity: "secret",
    });
    expect(stored.details?.action).toBe("created");
    expect(stored.content[0]?.text).toBe("Stored secret memory.");
  });

  test("memory_recallx excludes secrets by default and redacts summary text when included", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const registeredTools = new Map<string, any>();
    const now = Date.now();
    const secretDocument = {
      _id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      text: "apiKey=super-secret",
      vector: [0.1, 0.2],
      importance: 0.9,
      category: "fact",
      type: "semantic",
      metadata: {
        source: "memory_capture",
        ops: {
          scopeSubject: "agent:main",
          kind: "fact",
          sensitivity: "secret",
        },
      },
      createdAt: now,
      updatedAt: now,
      score: 0.95,
    };

    mcpClientMocks.insertMany.mockResolvedValue(1);
    mcpClientMocks.aggregate.mockResolvedValue([secretDocument]);

    memoryPlugin.register({
      pluginConfig: {
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      registerTool: (tool: unknown, opts?: { name?: string }) => {
        const resolved = materializeTool(tool, opts) as { name: string };
        registeredTools.set(resolved.name, resolved);
      },
      registerCli: vi.fn(),
      registerService: vi.fn(),
      on: vi.fn(),
    } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

    const memoryRecall = registeredTools.get("memory_recall");
    const memoryRecallX = registeredTools.get("memory_recallx");

    const basicRecall = await memoryRecall.execute("tc_recall_secret_filtered", {
      query: "api key",
      limit: 5,
    });
    expect(basicRecall.details?.count).toBe(0);

    const excluded = await memoryRecallX.execute("tc_recallx_secret_filtered", {
      query: "api key",
      limit: 5,
    });
    expect(excluded.details?.count).toBe(0);

    const included = await memoryRecallX.execute("tc_recallx_secret_included", {
      query: "api key",
      limit: 5,
      includeSecrets: true,
    });
    expect(included.details?.count).toBe(1);
    expect(included.content[0]?.text).toContain("[secret redacted]");
    expect(included.content[0]?.text).not.toContain("apiKey=super-secret");
    expect(included.details?.memories?.[0]?.text).toBe("apiKey=super-secret");
  });

  test("scoped tools fail closed when agent scope cannot be derived", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const registeredTools = new Map<string, any>();

    memoryPlugin.register({
      pluginConfig: {
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      registerTool: (tool: unknown, opts?: { name?: string }) => {
        const resolved = materializeTool(tool, opts, {}) as { name: string };
        registeredTools.set(resolved.name, resolved);
      },
      registerCli: vi.fn(),
      registerService: vi.fn(),
      on: vi.fn(),
    } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

    const recall = registeredTools.get("memory_recall");
    const result = await recall.execute("tc_recall_scope_missing", { query: "anything" });
    expect(result.details?.error).toBe("missing_scope_subject");
  });

  test("auto-recall resolves memory scope from hook context", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const hooks = new Map<string, any>();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const now = Date.now();

    mcpClientMocks.aggregate.mockResolvedValue([
      {
        _id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        text: "Daisy prefers memory continuity checks before status reports.",
        vector: [0.1, 0.2],
        importance: 0.8,
        category: "preference",
        type: "semantic",
        metadata: {
          source: "memory_capture",
          ops: { scopeSubject: "agent:daisy", kind: "preference" },
        },
        createdAt: now,
        updatedAt: now,
        score: 0.95,
      },
      {
        _id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        text: "Finn scoped memory must not be injected into Daisy runs.",
        vector: [0.1, 0.2],
        importance: 0.8,
        category: "fact",
        type: "semantic",
        metadata: {
          source: "memory_capture",
          ops: { scopeSubject: "agent:finn", kind: "fact" },
        },
        createdAt: now,
        updatedAt: now,
        score: 0.99,
      },
    ]);

    memoryPlugin.register({
      pluginConfig: {
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      },
      logger,
      registerTool: vi.fn(),
      registerCli: vi.fn(),
      registerService: vi.fn(),
      on: (hookName: string, handler: unknown) => {
        hooks.set(hookName, handler);
      },
    } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

    const beforeAgentStart = hooks.get("before_agent_start") as (
      event: { prompt: string },
      ctx?: { agentId?: string; sessionKey?: string },
    ) => Promise<{ prependContext?: string } | undefined>;

    const result = await beforeAgentStart(
      { prompt: "recall the memory continuity preference" },
      { agentId: "daisy", sessionKey: "agent:daisy:main" },
    );

    expect(result?.prependContext).toContain("Daisy prefers memory continuity checks");
    expect(result?.prependContext).not.toContain("Finn scoped memory");
    expect(logger.warn).not.toHaveBeenCalledWith(
      "memory-mongodb: auto-recall skipped due to missing scope",
    );
  });

  test("auto-capture resolves memory scope from hook context", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const hooks = new Map<string, any>();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    mcpClientMocks.insertMany.mockResolvedValue(1);
    mcpClientMocks.aggregate.mockResolvedValue([]);

    memoryPlugin.register({
      pluginConfig: {
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      },
      logger,
      registerTool: vi.fn(),
      registerCli: vi.fn(),
      registerService: vi.fn(),
      on: (hookName: string, handler: unknown) => {
        hooks.set(hookName, handler);
      },
    } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

    const agentEnd = hooks.get("agent_end") as (
      event: { success: boolean; messages: Array<Record<string, unknown>> },
      ctx?: { agentId?: string; sessionKey?: string },
    ) => Promise<void>;

    await agentEnd(
      {
        success: true,
        messages: [{ role: "user", content: "I prefer concise memory status updates." }],
      },
      { agentId: "finn", sessionKey: "agent:finn:main" },
    );

    expect(memoryInsertCalls()).toHaveLength(1);
    const insertCall = memoryInsertCalls()[0] as unknown[] | undefined;
    const insertedDocuments = insertCall?.[2] as
      | Array<{ metadata?: { ops?: { scopeSubject?: string } } }>
      | undefined;
    expect(insertedDocuments?.[0]?.metadata?.ops?.scopeSubject).toBe("agent:finn");
    expect(logger.warn).not.toHaveBeenCalledWith(
      "memory-mongodb: auto-capture skipped due to missing scope",
    );
  });

  test("auto-capture does not store assistant-originated speculation", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const hooks = new Map<string, any>();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    mcpClientMocks.insertMany.mockResolvedValue(1);
    mcpClientMocks.aggregate.mockResolvedValue([]);

    memoryPlugin.register({
      pluginConfig: {
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      },
      logger,
      registerTool: vi.fn(),
      registerCli: vi.fn(),
      registerService: vi.fn(),
      on: (hookName: string, handler: unknown) => {
        hooks.set(hookName, handler);
      },
    } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

    const agentEnd = hooks.get("agent_end") as (
      event: { success: boolean; messages: Array<Record<string, unknown>> },
      ctx?: { agentId?: string; sessionKey?: string },
    ) => Promise<void>;

    await agentEnd(
      {
        success: true,
        messages: [
          {
            role: "assistant",
            content: "I decided the user always needs this speculative memory.",
          },
        ],
      },
      { agentId: "finn", sessionKey: "agent:finn:main" },
    );

    expect(memoryInsertCalls()).toHaveLength(0);
  });

  test("auto hooks fall back to legacy event-carried scope and still fail closed when absent", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const hooks = new Map<string, any>();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const now = Date.now();

    mcpClientMocks.aggregate.mockResolvedValue([
      {
        _id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        text: "Subagent scoped recall survives legacy event fallback.",
        vector: [0.1, 0.2],
        importance: 0.8,
        category: "fact",
        type: "semantic",
        metadata: {
          source: "memory_capture",
          ops: { scopeSubject: "subagent:worker", kind: "fact" },
        },
        createdAt: now,
        updatedAt: now,
        score: 0.92,
      },
    ]);

    memoryPlugin.register({
      pluginConfig: {
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      },
      logger,
      registerTool: vi.fn(),
      registerCli: vi.fn(),
      registerService: vi.fn(),
      on: (hookName: string, handler: unknown) => {
        hooks.set(hookName, handler);
      },
    } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

    const beforeAgentStart = hooks.get("before_agent_start") as (
      event: { prompt: string; agentId?: string; sessionKey?: string },
      ctx?: { agentId?: string; sessionKey?: string },
    ) => Promise<{ prependContext?: string } | undefined>;

    const legacyResult = await beforeAgentStart({
      prompt: "legacy scoped recall",
      agentId: "daisy",
      sessionKey: "agent:daisy:subagent:worker",
    });
    expect(legacyResult?.prependContext).toContain("Subagent scoped recall");

    const partialContextResult = await beforeAgentStart(
      {
        prompt: "partial context scoped recall",
        agentId: "daisy",
        sessionKey: "agent:daisy:subagent:worker",
      },
      { agentId: "daisy" },
    );
    expect(partialContextResult?.prependContext).toContain("Subagent scoped recall");

    const missingScopeResult = await beforeAgentStart({ prompt: "missing scoped recall" }, {});
    expect(missingScopeResult).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      "memory-mongodb: auto-recall skipped due to missing scope",
    );
  });

  test("auto-capture falls back to legacy event-carried scope and still fails closed when absent", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const hooks = new Map<string, any>();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    mcpClientMocks.insertMany.mockResolvedValue(1);
    mcpClientMocks.aggregate.mockResolvedValue([]);

    memoryPlugin.register({
      pluginConfig: {
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      },
      logger,
      registerTool: vi.fn(),
      registerCli: vi.fn(),
      registerService: vi.fn(),
      on: (hookName: string, handler: unknown) => {
        hooks.set(hookName, handler);
      },
    } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

    const agentEnd = hooks.get("agent_end") as (
      event: {
        success: boolean;
        messages: Array<Record<string, unknown>>;
        agentId?: string;
        sessionKey?: string;
      },
      ctx?: { agentId?: string; sessionKey?: string },
    ) => Promise<void>;

    await agentEnd({
      success: true,
      agentId: "daisy",
      sessionKey: "agent:daisy:subagent:worker",
      messages: [{ role: "user", content: "I prefer concise subagent memory notes." }],
    });

    expect(memoryInsertCalls()).toHaveLength(1);
    const insertCall = memoryInsertCalls()[0] as unknown[] | undefined;
    const insertedDocuments = insertCall?.[2] as
      | Array<{ metadata?: { ops?: { scopeSubject?: string } } }>
      | undefined;
    expect(insertedDocuments?.[0]?.metadata?.ops?.scopeSubject).toBe("subagent:worker");

    await agentEnd(
      {
        success: true,
        messages: [{ role: "user", content: "I prefer concise memory status updates." }],
      },
      {},
    );

    expect(memoryInsertCalls()).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "memory-mongodb: auto-capture skipped due to missing scope",
    );
  });

  test("config schema parses valid absolute-path custom stdio launcher", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    const config = memoryPlugin.configSchema.parse({
      mcp: {
        transport: "stdio",
        stdio: {
          allowCustomLauncher: true,
          command: "/opt/mongodb-mcp/node",
          args: ["/opt/mongodb-mcp/dist/index.js"],
          env: {
            MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
          },
        },
      },
      gemini: {
        apiKey: "test-key",
        embeddingModel: "gemini-embedding-2-preview",
      },
      database: {
        name: "my_memory",
        collection: "my_memories",
        eventCollection: "my_events",
        indexName: "my_index",
        indexNameV2: "my_index_v2",
      },
      routing: {
        tenantId: "tenant-a",
        workspaceId: "workspace-a",
        defaultVisibility: "workspace",
        legacyFallback: false,
      },
      retrieval: {
        minScore: 0.2,
        vectorLimit: 6,
        numCandidatesMultiplier: 12,
      },
      autoCapture: true,
      autoRecall: true,
      ops: {
        enabled: true,
        schemaMode: "strict-validator",
        supportedDocumentMimeTypes: ["application/pdf"],
      },
    });

    expect(config.gemini.apiKey).toBe("test-key");
    expect(config.database.name).toBe("my_memory");
    expect(config.database.collection).toBe("my_memories");
    expect(config.database.eventCollection).toBe("my_events");
    expect(config.database.indexName).toBe("my_index");
    expect(config.database.indexNameV2).toBe("my_index_v2");
    expect(config.routing).toEqual({
      tenantId: "tenant-a",
      workspaceId: "workspace-a",
      defaultVisibility: "workspace",
      legacyFallback: false,
    });
    expect(config.retrieval.minScore).toBe(0.2);
    expect(config.retrieval.vectorLimit).toBe(6);
    expect(config.ops.schemaMode).toBe("strict-validator");
    if (config.mcp.transport === "stdio") {
      expect(config.mcp.stdio.command).toBe("/opt/mongodb-mcp/node");
      expect(config.mcp.stdio.args).toEqual(["/opt/mongodb-mcp/dist/index.js"]);
    }
  });

  test("config schema applies defaults", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const { resolveBundledMongoMcpServerEntrypoint } = await import("./config.js");

    const config = memoryPlugin.configSchema.parse({
      mcp: {
        transport: "stdio",
        stdio: {
          env: {
            MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
          },
        },
      },
      gemini: { apiKey: "test-key" },
    });

    expect(config.gemini.embeddingModel).toBe("gemini-embedding-2-preview");
    expect(config.database.name).toBe("daisy_memory");
    expect(config.database.collection).toBe("memories");
    expect(config.database.eventCollection).toBe("memory_events");
    expect(config.database.indexName).toBe("vector_index");
    expect(config.database.indexNameV2).toBe("vector_index_v2");
    expect(config.routing).toEqual({
      tenantId: "default",
      workspaceId: "default",
      defaultVisibility: "private",
      legacyFallback: true,
    });
    expect(config.retrieval.minScore).toBe(0.1);
    expect(config.retrieval.vectorLimit).toBe(8);
    expect(config.autoCapture).toBe(true);
    expect(config.autoRecall).toBe(true);
    expect(config.ops.enabled).toBe(true);
    expect(config.ops.schemaMode).toBe("additive");
    expect(config.ops.preferenceMinObservations).toBe(2);
    if (config.mcp.transport === "stdio") {
      expect(config.mcp.stdio.command).toBe(process.execPath);
      expect(config.mcp.stdio.args).toEqual([resolveBundledMongoMcpServerEntrypoint()]);
    }
  });

  test("config schema rejects null objects and blank database names", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const baseConfig = {
      mcp: {
        transport: "stdio",
        stdio: {
          env: {
            MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
          },
        },
      },
      gemini: { apiKey: "test-key" },
    };

    expect(() => {
      memoryPlugin.configSchema.parse({
        ...baseConfig,
        database: null,
      });
    }).toThrow("database must be an object");

    expect(() => {
      memoryPlugin.configSchema.parse({
        ...baseConfig,
        routing: null,
      });
    }).toThrow("routing must be an object");

    expect(() => {
      memoryPlugin.configSchema.parse({
        ...baseConfig,
        database: {
          collection: "  ",
        },
      });
    }).toThrow("database.collection must be a non-empty string");
  });

  test("config schema rejects ops.enabled=false", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema.parse({
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
        ops: {
          enabled: false,
        },
      });
    }).toThrow("ops.enabled=false is not supported");
  });

  test("config schema rejects custom launcher overrides without explicit allowCustomLauncher", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema.parse({
        mcp: {
          transport: "stdio",
          stdio: {
            command: "/opt/mongodb-mcp/node",
            args: ["/opt/mongodb-mcp/dist/index.js"],
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      });
    }).toThrow("allowCustomLauncher=true");
  });

  test("config schema rejects package-manager launchers like npx", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema.parse({
        mcp: {
          transport: "stdio",
          stdio: {
            allowCustomLauncher: true,
            command: "npx",
            args: ["/opt/mongodb-mcp/dist/index.js"],
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      });
    }).toThrow("cannot use a shell or package-manager launcher");
  });

  test("registers a required service that prepares stdio runtime dirs and verifies readiness", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const services: Array<Record<string, unknown>> = [];
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-mongodb-"));

    try {
      memoryPlugin.register({
        pluginConfig: {
          mcp: {
            transport: "stdio",
            stdio: {
              env: {
                MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
              },
            },
          },
          gemini: { apiKey: "test-key" },
        },
        logger,
        registerTool: vi.fn(),
        registerCli: vi.fn(),
        registerService: (service: Record<string, unknown>) => {
          services.push(service);
        },
        on: vi.fn(),
      } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

      expect(services).toHaveLength(1);
      const service = services[0] as {
        required?: boolean;
        start: (ctx: { stateDir: string; config: unknown; logger: unknown }) => Promise<void>;
      };
      const homeDir = path.join(stateDir, "plugins", "memory-mongodb", "mcp-stdio", "home");
      const tempDir = path.join(stateDir, "plugins", "memory-mongodb", "mcp-stdio", "tmp");

      await service.start({
        stateDir,
        config: {} as never,
        logger,
      });

      expect(service.required).toBe(true);
      expect(mcpClientMocks.setRuntimeEnvOverrides).toHaveBeenCalledWith({
        HOME: homeDir,
        TMPDIR: tempDir,
      });
      expect(mcpClientMocks.countDocuments).toHaveBeenCalledWith("daisy_memory", "memories");
      expect(fs.existsSync(homeDir)).toBe(true);
      expect(fs.existsSync(tempDir)).toBe(true);
    } finally {
      fs.rmSync(stateDir, { recursive: true, force: true });
    }
  });

  test("CLI commands prepare stdio runtime dirs before first DB access", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const registerCli = vi.fn();
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-mongodb-cli-"));
    const originalStateDir = process.env.OPENCLAW_STATE_DIR;
    const originalHome = process.env.OPENCLAW_HOME;
    const originalLog = console.log;
    const cliProgram = new Command();

    process.env.OPENCLAW_STATE_DIR = stateDir;
    process.env.OPENCLAW_HOME = stateDir;
    console.log = vi.fn();

    try {
      memoryPlugin.register({
        pluginConfig: {
          mcp: {
            transport: "stdio",
            stdio: {
              env: {
                MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
              },
            },
          },
          gemini: { apiKey: "test-key" },
        },
        logger,
        registerTool: vi.fn(),
        registerCli,
        registerService: vi.fn(),
        on: vi.fn(),
      } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

      expect(registerCli).toHaveBeenCalledOnce();
      const cliRegistrar = registerCli.mock.calls[0]?.[0] as ({
        program,
      }: {
        program: Command;
      }) => void;

      cliRegistrar({ program: cliProgram });
      await cliProgram.parseAsync(["node", "test", "ltm", "list"], {
        from: "node",
      });

      const homeDir = path.join(stateDir, "plugins", "memory-mongodb", "mcp-stdio", "home");
      const tempDir = path.join(stateDir, "plugins", "memory-mongodb", "mcp-stdio", "tmp");

      expect(mcpClientMocks.setRuntimeEnvOverrides).toHaveBeenCalledWith({
        HOME: homeDir,
        TMPDIR: tempDir,
      });
      expect(mcpClientMocks.countDocuments).toHaveBeenCalledWith("daisy_memory", "memories");
      expect(fs.existsSync(homeDir)).toBe(true);
      expect(fs.existsSync(tempDir)).toBe(true);
    } finally {
      console.log = originalLog;
      if (originalStateDir === undefined) {
        delete process.env.OPENCLAW_STATE_DIR;
      } else {
        process.env.OPENCLAW_STATE_DIR = originalStateDir;
      }
      if (originalHome === undefined) {
        delete process.env.OPENCLAW_HOME;
      } else {
        process.env.OPENCLAW_HOME = originalHome;
      }
      fs.rmSync(stateDir, { recursive: true, force: true });
    }
  });

  test("CLI backfill-ops dry-run scans without update-many mutations", async () => {
    const { default: memoryPlugin } = await import("./index.js");
    const registerCli = vi.fn();
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-mongodb-backfill-cli-"));
    const originalStateDir = process.env.OPENCLAW_STATE_DIR;
    const originalHome = process.env.OPENCLAW_HOME;
    const originalLog = console.log;
    const cliProgram = new Command();

    process.env.OPENCLAW_STATE_DIR = stateDir;
    process.env.OPENCLAW_HOME = stateDir;
    console.log = vi.fn();
    mcpClientMocks.aggregate.mockResolvedValue([
      {
        _id: "legacy-cli",
        text: "The user prefers private DAISy memory by default.",
        category: "fact",
        type: "semantic",
      },
    ]);

    try {
      memoryPlugin.register({
        pluginConfig: {
          mcp: {
            transport: "stdio",
            stdio: {
              env: {
                MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
              },
            },
          },
          gemini: { apiKey: "test-key" },
        },
        logger,
        registerTool: vi.fn(),
        registerCli,
        registerService: vi.fn(),
        on: vi.fn(),
      } as unknown as import("openclaw/plugin-sdk").OpenClawPluginApi);

      const cliRegistrar = registerCli.mock.calls[0]?.[0] as ({
        program,
      }: {
        program: Command;
      }) => void;

      cliRegistrar({ program: cliProgram });
      await cliProgram.parseAsync(["node", "test", "ltm", "backfill-ops", "--dry-run"], {
        from: "node",
      });

      const logMock = console.log as unknown as { mock: { calls: unknown[][] } };
      const output = JSON.parse(String(logMock.mock.calls[0]?.[0]));
      expect(output).toEqual(
        expect.objectContaining({
          dryRun: true,
          scopeSubject: "agent:daisy",
          tenantId: "default",
          workspaceId: "default",
          scanned: 1,
          eligible: 1,
          updated: 0,
          sampleIds: ["legacy-cli"],
        }),
      );
      expect(mcpClientMocks.updateMany).not.toHaveBeenCalled();
    } finally {
      console.log = originalLog;
      if (originalStateDir === undefined) {
        delete process.env.OPENCLAW_STATE_DIR;
      } else {
        process.env.OPENCLAW_STATE_DIR = originalStateDir;
      }
      if (originalHome === undefined) {
        delete process.env.OPENCLAW_HOME;
      } else {
        process.env.OPENCLAW_HOME = originalHome;
      }
      fs.rmSync(stateDir, { recursive: true, force: true });
    }
  });

  test("bundled MCP resolver rejects version drift", async () => {
    const { BUNDLED_MCP_SERVER_VERSION, resolveBundledMongoMcpServerEntrypoint } =
      await import("./config.js");
    const originalReadFileSync = fs.readFileSync.bind(fs);
    const readFileSyncSpy = vi.spyOn(fs, "readFileSync").mockImplementation(((
      filePath: Parameters<typeof fs.readFileSync>[0],
      options?: Parameters<typeof fs.readFileSync>[1],
    ) => {
      const rawPath = String(filePath);
      if (rawPath.includes("mongodb-mcp-server") && rawPath.endsWith("package.json")) {
        return JSON.stringify({
          version: "9.9.9",
          bin: { "mongodb-mcp-server": "dist/index.js" },
        });
      }
      return originalReadFileSync(filePath, options);
    }) as typeof fs.readFileSync);

    try {
      expect(() => resolveBundledMongoMcpServerEntrypoint()).toThrow(
        `Bundled MongoDB MCP server (mongodb-mcp-server@${BUNDLED_MCP_SERVER_VERSION}) is not installed or could not be resolved. Install the bundled dependency or set mcp.stdio.command and mcp.stdio.args explicitly. Resolution failed: unexpected mongodb-mcp-server version: expected ${BUNDLED_MCP_SERVER_VERSION}, got 9.9.9`,
      );
    } finally {
      readFileSyncSpy.mockRestore();
    }
  });

  test("config schema resolves env vars", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    process.env.TEST_GEMINI_API_KEY = "gemini-key-123";
    process.env.TEST_MONGODB_URI = "mongodb+srv://user:pass@cluster.example.com/test";

    const config = memoryPlugin.configSchema.parse({
      mcp: {
        transport: "stdio",
        stdio: {
          env: {
            MDB_MCP_CONNECTION_STRING: "${TEST_MONGODB_URI}",
          },
        },
      },
      gemini: { apiKey: "${TEST_GEMINI_API_KEY}" },
    });

    expect(config.gemini.apiKey).toBe("gemini-key-123");
    expect(config.mcp.transport).toBe("stdio");
    if (config.mcp.transport === "stdio") {
      expect(config.mcp.stdio.env.MDB_MCP_CONNECTION_STRING).toBe(
        "mongodb+srv://user:pass@cluster.example.com/test",
      );
    }

    delete process.env.TEST_GEMINI_API_KEY;
    delete process.env.TEST_MONGODB_URI;
  });

  test("config schema rejects missing gemini api key", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema.parse({
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: {},
      });
    }).toThrow("gemini.apiKey is required");
  });

  test("config schema rejects missing stdio connection string", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema.parse({
        mcp: {
          transport: "stdio",
          stdio: {
            env: {},
          },
        },
        gemini: { apiKey: "test-key" },
      });
    }).toThrow("MDB_MCP_CONNECTION_STRING");
  });

  test("config schema rejects plain mongodb:// without TLS for remote hosts", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema.parse({
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb://user:pass@remote-host.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
      });
    }).toThrow("without TLS");
  });

  test("config schema allows plain mongodb:// to localhost", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    const config = memoryPlugin.configSchema.parse({
      mcp: {
        transport: "stdio",
        stdio: {
          env: {
            MDB_MCP_CONNECTION_STRING: "mongodb://localhost:27017/test",
          },
        },
      },
      gemini: { apiKey: "test-key" },
    });

    expect(config.mcp.transport).toBe("stdio");
  });

  test("config schema rejects unknown keys", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema.parse({
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
        unknownField: true,
      });
    }).toThrow("unknown keys");
  });

  test("shouldCapture filters correctly", async () => {
    const { shouldCapture, compileTriggers } = await import("./index.js");
    const { DEFAULT_CAPTURE_TRIGGERS } = await import("./config.js");
    const triggers = compileTriggers(DEFAULT_CAPTURE_TRIGGERS);

    expect(shouldCapture("I prefer dark mode for all applications", triggers)).toBe(true);
    expect(shouldCapture("Remember that my name is John", triggers)).toBe(true);
    expect(shouldCapture("My email is test@example.com", triggers)).toBe(true);
    expect(shouldCapture("x", triggers)).toBe(false);
    expect(
      shouldCapture("<relevant-memories>injected content here</relevant-memories>", triggers),
    ).toBe(false);
  });

  test("config rejects invalid captureTrigger regex", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema.parse({
        mcp: {
          transport: "stdio",
          stdio: {
            env: {
              MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
            },
          },
        },
        gemini: { apiKey: "test-key" },
        captureTriggers: ["(invalid["],
      });
    }).toThrow("Invalid captureTrigger regex");
  });

  test("detectCategory classifies correctly", async () => {
    const { detectCategory } = await import("./index.js");

    expect(detectCategory("I prefer dark mode")).toBe("preference");
    expect(detectCategory("We decided to use React")).toBe("decision");
    expect(detectCategory("My email is test@example.com")).toBe("entity");
    expect(detectCategory("The server is running on port 3000")).toBe("fact");
    expect(detectCategory("some random unique text xyz")).toBe("other");
  });
});
