import { beforeEach, describe, expect, test, vi } from "vitest";

const connect = vi.fn();
const callTool = vi.fn();
const close = vi.fn();
const StdioClientTransport = vi.fn();
const SSEClientTransport = vi.fn();

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect,
    callTool,
    close,
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation((args) => {
    StdioClientTransport(args);
    return { kind: "stdio", args };
  }),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation((url) => {
    SSEClientTransport(url);
    return { kind: "sse", url };
  }),
}));

describe("mcp client service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connect.mockResolvedValue(undefined);
    callTool.mockResolvedValue({ structuredContent: { insertedCount: 1 } });
    close.mockResolvedValue(undefined);
  });

  test("uses stdio transport and parses structured content", async () => {
    const originalPath = process.env.PATH;
    const originalInheritedEnv = process.env.MCP_TEST_INHERITED_ENV;

    try {
      process.env.PATH = process.env.PATH ?? "test-path";
      process.env.MCP_TEST_INHERITED_ENV = "inherited";
      const { McpClientService } = await import("./mcp-client-service.js");
      const { memoryConfigSchema, resolveBundledMongoMcpServerEntrypoint } =
        await import("./config.js");

      const bundledEntrypoint = resolveBundledMongoMcpServerEntrypoint();
      const cfg = memoryConfigSchema.parse({
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
      if (cfg.mcp.transport !== "stdio") {
        throw new Error("expected stdio config");
      }

      const service = new McpClientService(cfg.mcp);
      service.setRuntimeEnvOverrides({
        HOME: "/plugin-scoped/home",
        TMPDIR: "/plugin-scoped/tmp",
      });

      const inserted = await service.insertMany("db", "memories", [{ text: "hello" }]);

      expect(inserted).toBe(1);
      expect(connect).toHaveBeenCalledTimes(1);
      expect(StdioClientTransport).toHaveBeenCalledTimes(1);
      const stdioArgs = StdioClientTransport.mock.calls[0]?.[0] as {
        command: string;
        args: string[];
        env: Record<string, string | undefined>;
      };
      expect(stdioArgs.command).toBe(process.execPath);
      expect(stdioArgs.args).toEqual([bundledEntrypoint]);
      expect(stdioArgs.env.MDB_MCP_CONNECTION_STRING).toBe(
        "mongodb+srv://user:pass@cluster.example.com/test",
      );
      expect(stdioArgs.env.HOME).toBe("/plugin-scoped/home");
      expect(stdioArgs.env.TMPDIR).toBe("/plugin-scoped/tmp");
      expect(stdioArgs.env.PATH).toBe(process.env.PATH);
      expect(stdioArgs.env.MCP_TEST_INHERITED_ENV).toBeUndefined();

      expect(callTool).toHaveBeenCalledWith({
        name: "insert-many",
        arguments: {
          database: "db",
          collection: "memories",
          documents: [{ text: "hello" }],
        },
      });
    } finally {
      if (originalPath === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = originalPath;
      }

      if (originalInheritedEnv === undefined) {
        delete process.env.MCP_TEST_INHERITED_ENV;
      } else {
        process.env.MCP_TEST_INHERITED_ENV = originalInheritedEnv;
      }
    }
  });

  test("preserves explicit absolute-path custom command and args overrides", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    const service = new McpClientService({
      transport: "stdio",
      stdio: {
        command: "/opt/mongodb-mcp/node",
        args: ["/opt/mongodb-mcp/dist/index.js"],
        env: {
          MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
        },
      },
    });

    await service.insertMany("db", "memories", [{ text: "hello" }]);

    const stdioArgs = StdioClientTransport.mock.calls[0]?.[0] as {
      command: string;
      args: string[];
    };
    expect(stdioArgs.command).toBe("/opt/mongodb-mcp/node");
    expect(stdioArgs.args).toEqual(["/opt/mongodb-mcp/dist/index.js"]);
  });

  test("parses aggregate response from later text block when first block is prose", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    callTool
      .mockResolvedValueOnce({ content: [{ type: "text", text: "connected" }] })
      .mockResolvedValueOnce({
        content: [
          { type: "text", text: "aggregate completed successfully" },
          { type: "text", text: '{"documents":[{"_id":"1","text":"a"}]}' },
        ],
      });

    const service = new McpClientService({
      transport: "stdio",
      stdio: {
        command: process.execPath,
        args: ["/bundled/mongodb-mcp-server.js"],
        env: {
          MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
        },
      },
    });

    const docs = await service.aggregate("db", "memories", [{ $match: {} }]);
    expect(docs).toEqual([{ _id: "1", text: "a" }]);
  });

  test("prefers structuredContent over content text payloads", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    callTool
      .mockResolvedValueOnce({ content: [{ type: "text", text: "connected" }] })
      .mockResolvedValueOnce({
        structuredContent: {
          documents: [{ _id: "preferred", text: "structured" }],
        },
        content: [{ type: "text", text: '{"documents":[{"_id":"ignored","text":"text"}]}' }],
      });

    const service = new McpClientService({
      transport: "stdio",
      stdio: {
        command: process.execPath,
        args: ["/bundled/mongodb-mcp-server.js"],
        env: {
          MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
        },
      },
    });

    const docs = await service.aggregate("db", "memories", [{ $match: {} }]);
    expect(docs).toEqual([{ _id: "preferred", text: "structured" }]);
  });

  test("returns empty aggregate array after scanning text blocks with no structured payload", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    callTool
      .mockResolvedValueOnce({ content: [{ type: "text", text: "connected" }] })
      .mockResolvedValueOnce({
        content: [
          { type: "text", text: "aggregate completed" },
          { type: "text", text: "{not-valid-json}" },
        ],
      });

    const service = new McpClientService({
      transport: "stdio",
      stdio: {
        command: process.execPath,
        args: ["/bundled/mongodb-mcp-server.js"],
        env: {
          MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
        },
      },
    });

    const docs = await service.aggregate("db", "memories", [{ $match: {} }]);
    expect(docs).toEqual([]);
  });

  test("insert-many fails closed when insertedCount metadata is missing", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    callTool.mockResolvedValue({});

    const service = new McpClientService({
      transport: "sse",
      url: "https://example.com/sse",
    });

    await expect(service.insertMany("db", "memories", [{ text: "hello" }])).rejects.toThrow(
      "insert-many response did not confirm insertedCount",
    );
  });

  test("insert-many fails when confirmed inserted count is below requested documents", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    callTool.mockResolvedValue({ structuredContent: { insertedCount: 1 } });

    const service = new McpClientService({
      transport: "sse",
      url: "https://example.com/sse",
    });

    await expect(
      service.insertMany("db", "memories", [{ text: "a" }, { text: "b" }]),
    ).rejects.toThrow("confirmed 1 inserts for 2 requested document(s)");
  });

  test("supports sse transport", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    callTool.mockResolvedValue({ structuredContent: { deletedCount: 1 } });

    const service = new McpClientService({
      transport: "sse",
      url: "https://example.com/sse",
    });

    const deleted = await service.deleteOne("db", "memories", { _id: "abc" });
    expect(deleted).toBe(true);
    expect(SSEClientTransport).toHaveBeenCalledTimes(1);
    expect(callTool).toHaveBeenCalledWith({
      name: "delete-many",
      arguments: {
        database: "db",
        collection: "memories",
        filter: { _id: "abc" },
      },
    });
  });

  test("reports MCP unavailable with sanitized message", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    connect.mockRejectedValue(
      new Error(
        "failed mongodb+srv://user:pass@cluster.example.com/test because server is unavailable",
      ),
    );

    const service = new McpClientService({
      transport: "stdio",
      stdio: {
        command: process.execPath,
        args: ["/bundled/mongodb-mcp-server.js"],
        env: {
          MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
        },
      },
    });

    await expect(service.insertMany("db", "memories", [{ text: "a" }])).rejects.toThrow(
      "MongoDB MCP connection failed",
    );
    await expect(service.insertMany("db", "memories", [{ text: "a" }])).rejects.not.toThrow(
      "mongodb+srv://user:pass@cluster.example.com/test",
    );
  });

  test("reports EACCES startup failures without leaking command details", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    connect.mockRejectedValue(
      Object.assign(new Error("spawn /private/bin/mcp-runner EACCES"), {
        code: "EACCES",
      }),
    );

    const service = new McpClientService({
      transport: "stdio",
      stdio: {
        command: "/private/bin/mcp-runner",
        args: ["--stdio"],
        env: {
          MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
        },
      },
    });

    await expect(service.insertMany("db", "memories", [{ text: "a" }])).rejects.toThrow(
      "unable to execute the configured MongoDB MCP stdio command (EACCES)",
    );
    await expect(service.insertMany("db", "memories", [{ text: "a" }])).rejects.not.toThrow(
      "/private/bin/mcp-runner",
    );
  });

  test("reports ENOENT startup failures with actionable guidance", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    connect.mockRejectedValue(
      Object.assign(new Error("spawn missing-mcp ENOENT"), {
        code: "ENOENT",
      }),
    );

    const service = new McpClientService({
      transport: "stdio",
      stdio: {
        command: "missing-mcp",
        args: ["--stdio"],
        env: {
          MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
        },
      },
    });

    await expect(service.insertMany("db", "memories", [{ text: "a" }])).rejects.toThrow(
      "unable to locate the configured MongoDB MCP stdio command (ENOENT)",
    );
  });
});
