import { describe, expect, test, vi } from "vitest";

vi.mock("./mcp-client-service.js", () => ({
  McpClientService: vi.fn().mockImplementation(() => ({
    insertMany: vi.fn(),
    aggregate: vi.fn().mockResolvedValue([]),
    deleteOne: vi.fn().mockResolvedValue(true),
    countDocuments: vi.fn().mockResolvedValue(0),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("./voyage-service.js", () => ({
  VoyageService: vi.fn().mockImplementation(() => ({
    embed: vi.fn().mockResolvedValue([0.1, 0.2]),
    rerank: vi.fn().mockResolvedValue([]),
  })),
}));

describe("memory-mongodb plugin", () => {
  test("plugin metadata is correct", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    expect(memoryPlugin.id).toBe("memory-mongodb");
    expect(memoryPlugin.name).toBe("Memory (MongoDB Atlas)");
    expect(memoryPlugin.kind).toBe("memory");
    expect(memoryPlugin.configSchema).toBeDefined();
    expect(memoryPlugin.register).toBeInstanceOf(Function);
  });

  test("config schema parses valid stdio config", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    const config = memoryPlugin.configSchema.parse({
      mcp: {
        transport: "stdio",
        stdio: {
          command: "npx",
          args: ["-y", "mongodb-mcp-server"],
          env: {
            MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
          },
        },
      },
      voyage: {
        apiKey: "test-key",
        embeddingModel: "voyage-3-large",
        rerankModel: "rerank-2",
      },
      database: {
        name: "my_memory",
        collection: "my_memories",
        indexName: "my_index",
      },
      retrieval: {
        minScore: 0.2,
        vectorLimit: 6,
        numCandidatesMultiplier: 12,
        rerankEnabled: true,
        rerankLimit: 5,
      },
      autoCapture: true,
      autoRecall: true,
    });

    expect(config.voyage.apiKey).toBe("test-key");
    expect(config.database.name).toBe("my_memory");
    expect(config.database.collection).toBe("my_memories");
    expect(config.database.indexName).toBe("my_index");
    expect(config.retrieval.minScore).toBe(0.2);
    expect(config.retrieval.vectorLimit).toBe(6);
  });

  test("config schema applies defaults", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    const config = memoryPlugin.configSchema.parse({
      mcp: {
        transport: "stdio",
        stdio: {
          env: {
            MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
          },
        },
      },
      voyage: { apiKey: "test-key" },
    });

    expect(config.voyage.embeddingModel).toBe("voyage-3-large");
    expect(config.voyage.rerankModel).toBe("rerank-2");
    expect(config.database.name).toBe("daisy_memory");
    expect(config.database.collection).toBe("memories");
    expect(config.database.indexName).toBe("vector_index");
    expect(config.retrieval.minScore).toBe(0.1);
    expect(config.retrieval.vectorLimit).toBe(8);
    expect(config.retrieval.rerankEnabled).toBe(true);
    expect(config.autoCapture).toBe(true);
    expect(config.autoRecall).toBe(true);
  });

  test("config schema resolves env vars", async () => {
    const { default: memoryPlugin } = await import("./index.js");

    process.env.TEST_VOYAGE_API_KEY = "voyage-key-123";
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
      voyage: { apiKey: "${TEST_VOYAGE_API_KEY}" },
    });

    expect(config.voyage.apiKey).toBe("voyage-key-123");
    expect(config.mcp.transport).toBe("stdio");
    if (config.mcp.transport === "stdio") {
      expect(config.mcp.stdio.env.MDB_MCP_CONNECTION_STRING).toBe(
        "mongodb+srv://user:pass@cluster.example.com/test",
      );
    }

    delete process.env.TEST_VOYAGE_API_KEY;
    delete process.env.TEST_MONGODB_URI;
  });

  test("config schema rejects missing voyage api key", async () => {
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
        voyage: {},
      });
    }).toThrow("voyage.apiKey is required");
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
        voyage: { apiKey: "test-key" },
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
        voyage: { apiKey: "test-key" },
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
      voyage: { apiKey: "test-key" },
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
        voyage: { apiKey: "test-key" },
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
        voyage: { apiKey: "test-key" },
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
