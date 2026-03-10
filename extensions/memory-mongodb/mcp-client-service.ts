import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { MemoryConfig } from "./config.js";

type Logger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string) => void;
};

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export class McpClientService {
  private client: Client;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly config: MemoryConfig["mcp"],
    private readonly logger?: Logger,
  ) {
    this.client = new Client({
      name: "memory-mongodb",
      version: "1.0.0",
    });
  }

  async insertMany(database: string, collection: string, documents: JsonObject[]): Promise<number> {
    const response = await this.callMongoTool("insert-many", {
      database,
      collection,
      documents,
    });

    const insertedCount = this.firstNumber(response, ["insertedCount", "inserted_count", "count"]);
    return insertedCount ?? documents.length;
  }

  async aggregate(database: string, collection: string, pipeline: unknown[]): Promise<JsonObject[]> {
    const response = await this.callMongoTool("aggregate", {
      database,
      collection,
      pipeline,
    });

    if (Array.isArray(response)) {
      return response.filter(isObject);
    }

    if (isObject(response)) {
      const docs = this.firstArray(response, ["documents", "results", "items", "result"]);
      if (docs) {
        return docs.filter(isObject);
      }
    }

    return [];
  }

  async deleteOne(database: string, collection: string, filter: JsonObject): Promise<boolean> {
    const response = await this.callMongoTool("delete-one", {
      database,
      collection,
      filter,
    });

    const deletedCount = this.firstNumber(response, ["deletedCount", "deleted_count", "count"]);
    return Boolean(deletedCount && deletedCount > 0);
  }

  async countDocuments(database: string, collection: string): Promise<number> {
    const docs = await this.aggregate(database, collection, [{ $count: "count" }]);
    const first = docs[0];
    if (!first) {
      return 0;
    }
    const count = first.count;
    return typeof count === "number" ? count : 0;
  }

  async close(): Promise<void> {
    try {
      await (this.client as { close?: () => Promise<void> }).close?.();
    } catch (error) {
      this.logger?.warn?.(`memory-mongodb: MCP close failed: ${this.sanitizeError(error)}`);
    } finally {
      this.connectPromise = null;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      try {
        if (this.config.transport === "stdio") {
          const transport = new StdioClientTransport({
            command: this.config.stdio.command,
            args: this.config.stdio.args,
            env: this.config.stdio.env,
          });
          await this.client.connect(transport);
          await this.tryConnectTool(this.config.stdio.env.MDB_MCP_CONNECTION_STRING);
          return;
        }

        const transport = new SSEClientTransport(new URL(this.config.url));
        await this.client.connect(transport);
      } catch (error) {
        this.connectPromise = null;
        throw new Error(`MongoDB MCP connection failed: ${this.sanitizeError(error)}`);
      }
    })();

    return this.connectPromise;
  }

  private async tryConnectTool(connectionString: string): Promise<void> {
    try {
      await this.client.callTool({
        name: "connect",
        arguments: {
          connectionString,
        },
      });
    } catch {
      // Best effort: server may already be connected through env configuration.
    }
  }

  private async callMongoTool(name: string, args: JsonObject): Promise<unknown> {
    await this.ensureConnected();

    try {
      const response = await this.client.callTool({
        name,
        arguments: args,
      });
      return this.extractResponsePayload(response);
    } catch (error) {
      throw new Error(`MongoDB MCP tool ${name} failed: ${this.sanitizeError(error)}`);
    }
  }

  private extractResponsePayload(response: unknown): unknown {
    if (isObject(response)) {
      if (response.structuredContent !== undefined) {
        return response.structuredContent;
      }

      const content = response.content;
      if (Array.isArray(content)) {
        for (const item of content) {
          if (!isObject(item) || typeof item.text !== "string") {
            continue;
          }
          const text = item.text.trim();
          if (!text) {
            continue;
          }
          try {
            return JSON.parse(text);
          } catch {
            return { message: text };
          }
        }
      }
    }

    return response;
  }

  private firstNumber(source: unknown, keys: string[]): number | null {
    if (!isObject(source)) {
      return null;
    }

    for (const key of keys) {
      const value = source[key];
      if (typeof value === "number") {
        return value;
      }
    }

    return null;
  }

  private firstArray(source: unknown, keys: string[]): unknown[] | null {
    if (!isObject(source)) {
      return null;
    }

    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value;
      }
    }

    return null;
  }

  private sanitizeError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (this.config.transport !== "stdio") {
      return message;
    }

    const uri = this.config.stdio.env.MDB_MCP_CONNECTION_STRING;
    if (!uri) {
      return message;
    }

    let sanitized = message.replaceAll(uri, "[redacted]");
    const queryIdx = uri.indexOf("?");
    if (queryIdx > 0) {
      sanitized = sanitized.replaceAll(uri.slice(0, queryIdx), "[redacted]");
    }

    return sanitized;
  }
}
