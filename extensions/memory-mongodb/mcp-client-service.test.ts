import { beforeEach, describe, expect, test, vi } from "vitest";

const connect = vi.fn();
const callTool = vi.fn();
const close = vi.fn();
const StdioClientTransport = vi.fn();
const SSEClientTransport = vi.fn();

vi.mock(
  "@modelcontextprotocol/sdk/client/index.js",
  () => ({
    Client: vi.fn().mockImplementation(() => ({
      connect,
      callTool,
      close,
    })),
  }),
  { virtual: true },
);

vi.mock(
  "@modelcontextprotocol/sdk/client/stdio.js",
  () => ({
    StdioClientTransport: vi.fn().mockImplementation((args) => {
      StdioClientTransport(args);
      return { kind: "stdio", args };
    }),
  }),
  { virtual: true },
);

vi.mock(
  "@modelcontextprotocol/sdk/client/sse.js",
  () => ({
    SSEClientTransport: vi.fn().mockImplementation((url) => {
      SSEClientTransport(url);
      return { kind: "sse", url };
    }),
  }),
  { virtual: true },
);

describe("mcp client service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connect.mockResolvedValue(undefined);
    callTool.mockResolvedValue({ structuredContent: { insertedCount: 1 } });
    close.mockResolvedValue(undefined);
  });

  test("uses stdio transport and parses structured content", async () => {
    const { McpClientService } = await import("./mcp-client-service.js");

    const service = new McpClientService({
      transport: "stdio",
      stdio: {
        command: "npx",
        args: ["-y", "mongodb-mcp-server"],
        env: {
          MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.example.com/test",
        },
      },
    });

    const inserted = await service.insertMany("db", "memories", [{ text: "hello" }]);

    expect(inserted).toBe(1);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(StdioClientTransport).toHaveBeenCalledTimes(1);
    expect(callTool).toHaveBeenCalledWith({
      name: "insert-many",
      arguments: {
        database: "db",
        collection: "memories",
        documents: [{ text: "hello" }],
      },
    });
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
        command: "npx",
        args: ["-y", "mongodb-mcp-server"],
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
        command: "npx",
        args: ["-y", "mongodb-mcp-server"],
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
});
