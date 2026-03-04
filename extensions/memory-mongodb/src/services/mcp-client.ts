import { setTimeout as delay } from "node:timers/promises";
import type { MemoryConfig } from "../../config.js";

type MongoMcpConfig = MemoryConfig["mcp"];

type Logger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
};

type ToolResponse<T> = { content?: unknown; structuredContent?: T };

type McpClientInstance = {
  connect: (transport: unknown) => Promise<void>;
  callTool: (params: { name: string; arguments: Record<string, unknown> }) => Promise<unknown>;
};

type McpTransportInstance = {
  close: () => Promise<void>;
  onclose?: () => void;
  onerror?: (error: unknown) => void;
};

export type InsertManyArgs = {
  database: string;
  collection: string;
  documents: Record<string, unknown>[];
};

export type AggregateArgs = {
  database: string;
  collection: string;
  pipeline: Record<string, unknown>[];
};

export type FindArgs = {
  database: string;
  collection: string;
  filter?: Record<string, unknown>;
  limit?: number;
};

export type CreateCollectionArgs = {
  database: string;
  collection: string;
};

export type CreateIndexArgs = {
  database: string;
  collection: string;
  keys: Record<string, 1 | -1>;
  name?: string;
};

export type DeleteManyArgs = {
  database: string;
  collection: string;
  filter: Record<string, unknown>;
};

export type DeleteOneArgs = DeleteManyArgs;

export class MongoMcpClient {
  private client: McpClientInstance | null = null;
  private transport: McpTransportInstance | null = null;
  private started = false;
  private connectInFlight: Promise<void> | null = null;

  constructor(
    private readonly config: MongoMcpConfig,
    private readonly logger: Logger = {},
  ) {}

  async start(): Promise<void> {
    this.started = true;
    await this.ensureConnected();
  }

  async stop(): Promise<void> {
    this.started = false;
    this.connectInFlight = null;
    await this.transport?.close();
    this.transport = null;
    this.client = null;
  }

  async insertMany(args: InsertManyArgs): Promise<{ insertedCount: number }> {
    return this.callTool("insertMany", args);
  }

  async aggregate<TDocument = Record<string, unknown>>(
    args: AggregateArgs,
  ): Promise<TDocument[]> {
    return this.callTool("aggregate", args);
  }

  async find<TDocument = Record<string, unknown>>(args: FindArgs): Promise<TDocument[]> {
    return this.callTool("find", args);
  }

  async createCollection(args: CreateCollectionArgs): Promise<{ ok: number }> {
    return this.callTool("createCollection", args);
  }

  async createIndex(args: CreateIndexArgs): Promise<{ name?: string }> {
    return this.callTool("createIndex", args);
  }

  async deleteMany(args: DeleteManyArgs): Promise<{ deletedCount: number }> {
    return this.callTool("deleteMany", args);
  }

  async deleteOne(args: DeleteOneArgs): Promise<{ deletedCount: number }> {
    return this.callTool("deleteOne", args);
  }

  private async callTool<TResult>(
    name: string,
    args: Record<string, unknown>,
    attempt = 0,
  ): Promise<TResult> {
    try {
      await this.ensureConnected();
      if (!this.client) {
        throw new Error("MCP client is not connected");
      }

      const response = (await this.client.callTool({
        name,
        arguments: args,
      })) as ToolResponse<TResult>;

      if (response.structuredContent !== undefined) {
        return response.structuredContent;
      }

      throw new Error(`MCP tool \"${name}\" returned no structured content`);
    } catch (error) {
      if (attempt < 1 && this.isRetryableError(error)) {
        this.logger.warn?.(
          `memory-mongodb: MCP tool ${name} failed (${this.errorMessage(error)}), reconnecting once`,
        );
        await this.resetConnection();
        return this.callTool(name, args, attempt + 1);
      }

      throw this.wrapMcpError(name, error);
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.client && this.transport) {
      return;
    }

    if (!this.started) {
      this.started = true;
    }

    if (this.connectInFlight) {
      return this.connectInFlight;
    }

    this.connectInFlight = this.connectWithRetry();

    try {
      await this.connectInFlight;
    } finally {
      this.connectInFlight = null;
    }
  }

  private async connectWithRetry(): Promise<void> {
    const maxAttempts = this.config.transport === "sse" ? 5 : 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.connectOnce();
        this.logger.info?.(
          `memory-mongodb: MCP connected via ${this.config.transport} transport`,
        );
        return;
      } catch (error) {
        const canRetry = attempt < maxAttempts;
        this.logger.warn?.(
          `memory-mongodb: MCP connection attempt ${attempt}/${maxAttempts} failed: ${this.errorMessage(error)}`,
        );

        if (!canRetry) {
          throw this.wrapMcpError("connect", error);
        }

        await delay(200 * attempt);
      }
    }
  }

  private async connectOnce(): Promise<void> {
    await this.resetConnection();

    this.transport = await this.createTransport();

    this.transport.onclose = () => {
      this.logger.warn?.("memory-mongodb: MCP transport closed, will reconnect on next call");
      this.client = null;
      this.transport = null;
    };

    this.transport.onerror = (error: unknown) => {
      this.logger.warn?.(
        `memory-mongodb: MCP transport error: ${this.errorMessage(error)}`,
      );
      this.client = null;
      this.transport = null;
    };

    this.client = await this.createClient();
    await this.client.connect(this.transport);
  }

  private async createClient(): Promise<McpClientInstance> {
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    return new Client({
      name: "memory-mongodb",
      version: "1.0.0",
    }) as unknown as McpClientInstance;
  }

  private async createTransport(): Promise<McpTransportInstance> {
    if (this.config.transport === "stdio") {
      const { StdioClientTransport } = await import(
        "@modelcontextprotocol/sdk/client/stdio.js"
      );
      return new StdioClientTransport({
        command: this.config.stdio.command,
        args: this.config.stdio.args,
        env: this.config.stdio.env,
        stderr: "pipe",
      }) as unknown as McpTransportInstance;
    }

    const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
    return new SSEClientTransport(new URL(this.config.url)) as unknown as McpTransportInstance;
  }

  private async resetConnection(): Promise<void> {
    try {
      await this.transport?.close();
    } catch {
      // ignore shutdown errors
    }
    this.transport = null;
    this.client = null;
  }

  private isRetryableError(error: unknown): boolean {
    const text = this.errorMessage(error).toLowerCase();
    return (
      text.includes("econn") ||
      text.includes("timeout") ||
      text.includes("closed") ||
      text.includes("not connected")
    );
  }

  private wrapMcpError(toolName: string, error: unknown): Error {
    const detail = this.errorMessage(error);
    return new Error(`MongoDB MCP ${toolName} failed: ${detail}`);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
