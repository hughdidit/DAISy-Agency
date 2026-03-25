import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mcpClientMocks = vi.hoisted(() => ({
  insertMany: vi.fn(),
  aggregate: vi.fn().mockResolvedValue([]),
  deleteOne: vi.fn().mockResolvedValue(true),
  countDocuments: vi.fn().mockResolvedValue(0),
  close: vi.fn().mockResolvedValue(undefined),
  setRuntimeEnvOverrides: vi.fn(),
}));

vi.mock("./mcp-client-service.js", () => ({
  McpClientService: vi.fn().mockImplementation(() => mcpClientMocks),
}));

vi.mock("./gemini-service.js", () => ({
  GeminiService: vi.fn().mockImplementation(() => ({
    embed: vi.fn().mockResolvedValue([0.1, 0.2]),
  })),
}));

describe("memory-mongodb plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mcpClientMocks.aggregate.mockResolvedValue([]);
    mcpClientMocks.deleteOne.mockResolvedValue(true);
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
        indexName: "my_index",
      },
      retrieval: {
        minScore: 0.2,
        vectorLimit: 6,
        numCandidatesMultiplier: 12,
      },
      autoCapture: true,
      autoRecall: true,
    });

    expect(config.gemini.apiKey).toBe("test-key");
    expect(config.database.name).toBe("my_memory");
    expect(config.database.collection).toBe("my_memories");
    expect(config.database.indexName).toBe("my_index");
    expect(config.retrieval.minScore).toBe(0.2);
    expect(config.retrieval.vectorLimit).toBe(6);
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
    expect(config.database.indexName).toBe("vector_index");
    expect(config.retrieval.minScore).toBe(0.1);
    expect(config.retrieval.vectorLimit).toBe(8);
    expect(config.autoCapture).toBe(true);
    expect(config.autoRecall).toBe(true);
    if (config.mcp.transport === "stdio") {
      expect(config.mcp.stdio.command).toBe(process.execPath);
      expect(config.mcp.stdio.args).toEqual([resolveBundledMongoMcpServerEntrypoint()]);
    }
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
        start: (ctx: { stateDir: string }) => Promise<void>;
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
