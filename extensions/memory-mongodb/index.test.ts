/**
 * Memory Plugin (MongoDB Atlas) Tests
 *
 * Tests the memory plugin functionality including:
 * - Plugin registration and configuration
 * - Config parsing and validation
 * - TLS enforcement for connection URIs
 * - Auto-capture filtering
 * - Category detection
 *
 * Live tests (gated on OPENAI_API_KEY + MONGODB_URI + CLAWDBOT_LIVE_TEST=1):
 * - Full tool flow: store → recall → duplicate detection → forget → verify
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "test-key";
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb+srv://test:test@localhost/test";
const HAS_OPENAI_KEY = Boolean(process.env.OPENAI_API_KEY);
const HAS_MONGODB_URI = Boolean(process.env.MONGODB_URI);
const liveEnabled =
  HAS_OPENAI_KEY && HAS_MONGODB_URI && process.env.CLAWDBOT_LIVE_TEST === "1";
const describeLive = liveEnabled ? describe : describe.skip;

describe("memory-mongodb plugin", () => {
  test("plugin metadata is correct", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(memoryPlugin.id).toBe("memory-mongodb");
    expect(memoryPlugin.name).toBe("Memory (MongoDB Atlas)");
    expect(memoryPlugin.kind).toBe("memory");
    expect(memoryPlugin.configSchema).toBeDefined();
    expect(memoryPlugin.register).toBeInstanceOf(Function);
  });

  test("config schema parses valid config", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    const config = memoryPlugin.configSchema?.parse?.({
      embedding: {
        apiKey: OPENAI_API_KEY,
        model: "text-embedding-3-small",
      },
      connectionUri: "mongodb+srv://user:pass@cluster.example.com/test",
      databaseName: "my_memory",
      collectionName: "my_memories",
      vectorSearchIndexName: "my_index",
      autoCapture: true,
      autoRecall: true,
    });

    expect(config).toBeDefined();
    expect(config?.embedding?.apiKey).toBe(OPENAI_API_KEY);
    expect(config?.connectionUri).toBe(
      "mongodb+srv://user:pass@cluster.example.com/test",
    );
    expect(config?.databaseName).toBe("my_memory");
    expect(config?.collectionName).toBe("my_memories");
    expect(config?.vectorSearchIndexName).toBe("my_index");
  });

  test("config schema applies defaults", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    const config = memoryPlugin.configSchema?.parse?.({
      embedding: { apiKey: OPENAI_API_KEY },
      connectionUri: "mongodb+srv://user:pass@cluster.example.com/test",
    });

    expect(config?.databaseName).toBe("daisy_memory");
    expect(config?.collectionName).toBe("memories");
    expect(config?.vectorSearchIndexName).toBe("vector_index");
    expect(config?.autoCapture).toBe(true);
    expect(config?.autoRecall).toBe(true);
    expect(config?.embedding?.model).toBe("text-embedding-3-small");
  });

  test("config schema resolves env vars", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    process.env.TEST_MEMORY_API_KEY = "test-key-123";
    process.env.TEST_MONGODB_URI = "mongodb+srv://user:pass@cluster.example.com/test";

    const config = memoryPlugin.configSchema?.parse?.({
      embedding: { apiKey: "${TEST_MEMORY_API_KEY}" },
      connectionUri: "${TEST_MONGODB_URI}",
    });

    expect(config?.embedding?.apiKey).toBe("test-key-123");
    expect(config?.connectionUri).toBe(
      "mongodb+srv://user:pass@cluster.example.com/test",
    );

    delete process.env.TEST_MEMORY_API_KEY;
    delete process.env.TEST_MONGODB_URI;
  });

  test("config schema rejects missing apiKey", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema?.parse?.({
        embedding: {},
        connectionUri: "mongodb+srv://user:pass@cluster.example.com/test",
      });
    }).toThrow("embedding.apiKey is required");
  });

  test("config schema rejects missing connectionUri", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema?.parse?.({
        embedding: { apiKey: OPENAI_API_KEY },
      });
    }).toThrow("connectionUri is required");
  });

  test("config schema rejects unknown keys", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema?.parse?.({
        embedding: { apiKey: OPENAI_API_KEY },
        connectionUri: "mongodb+srv://user:pass@cluster.example.com/test",
        unknownField: true,
      });
    }).toThrow("unknown keys");
  });

  test("config schema rejects plain mongodb:// without TLS for remote hosts", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(() => {
      memoryPlugin.configSchema?.parse?.({
        embedding: { apiKey: OPENAI_API_KEY },
        connectionUri: "mongodb://user:pass@remote-host.example.com/test",
      });
    }).toThrow("without TLS");
  });

  test("config schema allows plain mongodb:// with tls=true", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    const config = memoryPlugin.configSchema?.parse?.({
      embedding: { apiKey: OPENAI_API_KEY },
      connectionUri: "mongodb://user:pass@remote-host.example.com/test?tls=true",
    });

    expect(config?.connectionUri).toBe(
      "mongodb://user:pass@remote-host.example.com/test?tls=true",
    );
  });

  test("config schema allows plain mongodb:// to localhost", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    const config = memoryPlugin.configSchema?.parse?.({
      embedding: { apiKey: OPENAI_API_KEY },
      connectionUri: "mongodb://localhost:27017/test",
    });

    expect(config?.connectionUri).toBe("mongodb://localhost:27017/test");
  });

  test("shouldCapture filters correctly", async () => {
    const { shouldCapture } = await import("./index.js");

    // Should capture
    expect(shouldCapture("I prefer dark mode for all applications")).toBe(true);
    expect(shouldCapture("Remember that my name is John")).toBe(true);
    expect(shouldCapture("My email is test@example.com")).toBe(true);
    expect(shouldCapture("Call me at +1234567890123")).toBe(true);
    expect(shouldCapture("We decided to use TypeScript")).toBe(true);
    expect(shouldCapture("I always want verbose output")).toBe(true);

    // Should NOT capture
    expect(shouldCapture("x")).toBe(false); // Too short
    expect(shouldCapture("Just a random short msg")).toBe(false); // No trigger
    expect(
      shouldCapture("<relevant-memories>injected content here</relevant-memories>"),
    ).toBe(false); // Injected context
    expect(shouldCapture("<system>some system output</system>")).toBe(false); // System content
  });

  test("detectCategory classifies correctly", async () => {
    const { detectCategory } = await import("./index.js");

    expect(detectCategory("I prefer dark mode")).toBe("preference");
    expect(detectCategory("We decided to use React")).toBe("decision");
    expect(detectCategory("My email is test@example.com")).toBe("entity");
    expect(detectCategory("The server is running on port 3000")).toBe("fact");
    expect(detectCategory("zapamatuj si tohle číslo")).toBe("other");
  });
});

// ============================================================================
// Live tests (require real Atlas cluster + OpenAI key)
// ============================================================================

describeLive("memory-mongodb live tests", () => {
  const testDbName = `moltbot-test-${randomUUID().slice(0, 8)}`;
  let cleanupDb: (() => Promise<void>) | null = null;

  afterEach(async () => {
    if (cleanupDb) {
      await cleanupDb();
      cleanupDb = null;
    }
  });

  test(
    "memory tools work end-to-end",
    async () => {
      const { default: memoryPlugin } = await import("./index.js");
      const liveApiKey = process.env.OPENAI_API_KEY ?? "";
      const liveMongoUri = process.env.MONGODB_URI ?? "";

      // Mock plugin API
      const registeredTools: any[] = [];
      const registeredClis: any[] = [];
      const registeredServices: any[] = [];
      const registeredHooks: Record<string, any[]> = {};
      const logs: string[] = [];

      const mockApi = {
        id: "memory-mongodb",
        name: "Memory (MongoDB Atlas)",
        source: "test",
        config: {},
        pluginConfig: {
          embedding: {
            apiKey: liveApiKey,
            model: "text-embedding-3-small",
          },
          connectionUri: liveMongoUri,
          databaseName: testDbName,
          collectionName: "memories",
          vectorSearchIndexName: "vector_index",
          autoCapture: false,
          autoRecall: false,
        },
        runtime: {},
        logger: {
          info: (msg: string) => logs.push(`[info] ${msg}`),
          warn: (msg: string) => logs.push(`[warn] ${msg}`),
          error: (msg: string) => logs.push(`[error] ${msg}`),
          debug: (msg: string) => logs.push(`[debug] ${msg}`),
        },
        registerTool: (tool: any, opts: any) => {
          registeredTools.push({ tool, opts });
        },
        registerCli: (registrar: any, opts: any) => {
          registeredClis.push({ registrar, opts });
        },
        registerService: (service: any) => {
          registeredServices.push(service);
        },
        on: (hookName: string, handler: any) => {
          if (!registeredHooks[hookName]) registeredHooks[hookName] = [];
          registeredHooks[hookName].push(handler);
        },
        resolvePath: (p: string) => p,
      };

      // Register plugin
      await memoryPlugin.register(mockApi as any);

      // Set up cleanup — drop the test database when done
      const stopService = registeredServices[0];
      cleanupDb = async () => {
        const { MongoClient } = await import("mongodb");
        const client = new MongoClient(liveMongoUri);
        try {
          await client.connect();
          await client.db(testDbName).dropDatabase();
        } finally {
          await client.close();
        }
        if (stopService?.stop) await stopService.stop();
      };

      // Check registration
      expect(registeredTools.length).toBe(3);
      expect(registeredTools.map((t) => t.opts?.name)).toContain("memory_recall");
      expect(registeredTools.map((t) => t.opts?.name)).toContain("memory_store");
      expect(registeredTools.map((t) => t.opts?.name)).toContain("memory_forget");
      expect(registeredClis.length).toBe(1);
      expect(registeredServices.length).toBe(1);

      // Get tool functions
      const storeTool = registeredTools.find(
        (t) => t.opts?.name === "memory_store",
      )?.tool;
      const recallTool = registeredTools.find(
        (t) => t.opts?.name === "memory_recall",
      )?.tool;
      const forgetTool = registeredTools.find(
        (t) => t.opts?.name === "memory_forget",
      )?.tool;

      // Test store
      const storeResult = await storeTool.execute("test-call-1", {
        text: "The user prefers dark mode for all applications",
        importance: 0.8,
        category: "preference",
      });

      expect(storeResult.details?.action).toBe("created");
      expect(storeResult.details?.id).toBeDefined();
      const storedId = storeResult.details?.id;

      // Test recall
      const recallResult = await recallTool.execute("test-call-2", {
        query: "dark mode preference",
        limit: 5,
      });

      expect(recallResult.details?.count).toBeGreaterThan(0);
      expect(recallResult.details?.memories?.[0]?.text).toContain("dark mode");

      // Test duplicate detection
      const duplicateResult = await storeTool.execute("test-call-3", {
        text: "The user prefers dark mode for all applications",
      });

      expect(duplicateResult.details?.action).toBe("duplicate");

      // Test forget
      const forgetResult = await forgetTool.execute("test-call-4", {
        memoryId: storedId,
      });

      expect(forgetResult.details?.action).toBe("deleted");

      // Verify it's gone
      const recallAfterForget = await recallTool.execute("test-call-5", {
        query: "dark mode preference",
        limit: 5,
      });

      expect(recallAfterForget.details?.count).toBe(0);
    },
    60000,
  ); // 60s timeout for live API calls
});
