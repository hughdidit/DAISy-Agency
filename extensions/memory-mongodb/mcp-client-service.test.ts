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
    expect(stdioArgs.env.PATH).toBe(process.env.PATH);
    expect(stdioArgs.env.MCP_TEST_INHERITED_ENV).toBeUndefined();

    delete process.env.MCP_TEST_INHERITED_ENV;

    expect(callTool).toHaveBeenCalledWith({
      name: "insert-many",
      arguments: {
        database: "db",
        collection: "memories",
        documents: [{ text: "hello" }],
      },
    });
  });

  test("preserves explicit custom command and args overrides", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    const service = new McpClientService({
      transport: "stdio",
      stdio: {
        command: "npx",
        args: ["-y", "mongodb-mcp-server@1.2.0"],
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
    expect(stdioArgs.command).toBe("npx");
    expect(stdioArgs.args).toEqual(["-y", "mongodb-mcp-server@1.2.0"]);
  });

  test("parses aggregate response from text payload", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    callTool
      .mockResolvedValueOnce({ content: [{ type: "text", text: "connected" }] })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: '{"documents":[{"_id":"1","text":"a"}]}' }],
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
