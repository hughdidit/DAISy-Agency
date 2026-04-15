import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { EJSON } from "bson";
import type { MemoryConfig } from "./config.js";

type Logger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string) => void;
};

type JsonObject = Record<string, unknown>;
type RuntimeEnvOverrides = {
  HOME?: string;
  TMPDIR?: string;
};

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const AGGREGATE_DOCUMENT_KEYS = ["documents", "results", "items", "result"] as const;
const INSERTED_COUNT_TEXT_PATTERNS = [/\bInserted\s+`?(\d+)`?\s+document\(s\)\b/i];
const DELETED_COUNT_TEXT_PATTERNS = [/\bDeleted\s+`?(\d+)`?\s+document\(s\)\b/i];
const UNTRUSTED_DATA_BLOCK_REGEX = /<untrusted-user-data-[^>]+>([\s\S]*?)<\/untrusted-user-data-[^>]+>/gi;
const MARKDOWN_CODE_FENCE_REGEX = /```(?:json|javascript|js|ejson|mongodb)?\s*([\s\S]*?)```/gi;

const STDIO_ENV_ALLOWLIST = [
  "APPDATA",
  "COMSPEC",
  "ComSpec",
  "HOME",
  "LOCALAPPDATA",
  "NODE_EXTRA_CA_CERTS",
  "NODE_USE_SYSTEM_CA",
  "PATH",
  "PATHEXT",
  "Path",
  "Pathext",
  "SSL_CERT_DIR",
  "SSL_CERT_FILE",
  "SYSTEMROOT",
  "SystemRoot",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
] as const;

function toStringEnv(
  source: Record<string, string | undefined>,
  keys?: readonly string[],
): Record<string, string> {
  const env: Record<string, string> = {};
  const entries = keys ? keys.map((key) => [key, source[key]] as const) : Object.entries(source);
  for (const [key, value] of entries) {
    if (typeof value === "string" && value.length > 0) {
      env[key] = value;
    }
  }
  return env;
}

function buildStdioEnv(overrides: Record<string, string | undefined>): Record<string, string> {
  return {
    // Launch the MCP child with a minimal trusted environment.
    ...toStringEnv(process.env, STDIO_ENV_ALLOWLIST),
    ...toStringEnv(overrides),
  };
}

export class McpClientService {
  private client: Client;
  private connectPromise: Promise<void> | null = null;
  private runtimeEnvOverrides: RuntimeEnvOverrides = {};

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

    const insertedCount = this.firstNumber(
      response,
      ["insertedCount", "inserted_count", "count"],
      INSERTED_COUNT_TEXT_PATTERNS,
    );
    if (insertedCount === null) {
      throw new Error("MongoDB MCP insert-many response did not confirm insertedCount");
    }
    if (insertedCount < documents.length) {
      throw new Error(
        `MongoDB MCP insert-many confirmed ${insertedCount} inserts for ${documents.length} requested document(s)`,
      );
    }
    return insertedCount;
  }

  async aggregate(
    database: string,
    collection: string,
    pipeline: unknown[],
  ): Promise<JsonObject[]> {
    const response = await this.callMongoTool("aggregate", {
      database,
      collection,
      pipeline,
    });

    return this.extractAggregateDocuments(response);
  }

  async deleteOne(database: string, collection: string, filter: JsonObject): Promise<boolean> {
    const response = await this.callMongoTool("delete-many", {
      database,
      collection,
      filter,
    });

    const deletedCount = this.firstNumber(
      response,
      ["deletedCount", "deleted_count", "count"],
      DELETED_COUNT_TEXT_PATTERNS,
    );
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

  setRuntimeEnvOverrides(overrides: RuntimeEnvOverrides): void {
    this.runtimeEnvOverrides = {
      ...this.runtimeEnvOverrides,
      ...toStringEnv(overrides),
    };
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
            env: buildStdioEnv({
              ...this.runtimeEnvOverrides,
              ...this.config.stdio.env,
            }),
          });
          await this.client.connect(transport);
          await this.tryConnectTool(this.config.stdio.env.MDB_MCP_CONNECTION_STRING);
          return;
        }

        const transport = new SSEClientTransport(new URL(this.config.url));
        await this.client.connect(transport);
      } catch (error) {
        this.connectPromise = null;
        throw new Error(`MongoDB MCP connection failed: ${this.formatConnectionError(error)}`);
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
        let fallbackMessage: string | null = null;
        const textBlocks: string[] = [];
        for (const item of content) {
          if (!isObject(item) || typeof item.text !== "string") {
            continue;
          }
          const text = item.text.trim();
          if (!text) {
            continue;
          }
          textBlocks.push(text);

          for (const candidate of this.payloadCandidatesFromText(text)) {
            const parsed = this.tryParseTextPayload(candidate);
            if (parsed !== null) {
              return parsed.value;
            }
          }
          if (fallbackMessage === null) {
            fallbackMessage = text;
          }
        }
        if (fallbackMessage !== null) {
          return { message: fallbackMessage, textBlocks };
        }
      }
    }

    return response;
  }

  private tryParseTextPayload(text: string): { ok: true; value: unknown } | null {
    const candidate = text.trim();
    if (!candidate) {
      return null;
    }

    try {
      return { ok: true, value: JSON.parse(candidate) };
    } catch {
      // Fall through and try EJSON.
    }

    try {
      return { ok: true, value: EJSON.parse(candidate) };
    } catch {
      return null;
    }
  }

  private payloadCandidatesFromText(text: string): string[] {
    const candidates: string[] = [];
    const pushCandidate = (value: string): void => {
      const trimmed = value.trim();
      if (!trimmed || candidates.includes(trimmed)) {
        return;
      }
      candidates.push(trimmed);
    };

    pushCandidate(text);

    MARKDOWN_CODE_FENCE_REGEX.lastIndex = 0;
    for (const match of text.matchAll(MARKDOWN_CODE_FENCE_REGEX)) {
      const block = match[1];
      if (typeof block !== "string") {
        continue;
      }
      pushCandidate(block);
      this.pushLineCandidates(block, pushCandidate);
    }

    UNTRUSTED_DATA_BLOCK_REGEX.lastIndex = 0;
    for (const match of text.matchAll(UNTRUSTED_DATA_BLOCK_REGEX)) {
      const block = match[1];
      if (typeof block !== "string") {
        continue;
      }
      pushCandidate(block);
      this.pushLineCandidates(block, pushCandidate);
    }

    return candidates;
  }

  private pushLineCandidates(block: string, pushCandidate: (value: string) => void): void {
    for (const line of block.split(/\r?\n/)) {
      pushCandidate(line);
    }
  }

  private extractAggregateDocuments(payload: unknown): JsonObject[] {
    if (Array.isArray(payload)) {
      return payload.filter(isObject);
    }

    if (!isObject(payload)) {
      return [];
    }

    for (const key of AGGREGATE_DOCUMENT_KEYS) {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value.filter(isObject);
      }
      if (isObject(value)) {
        return [value];
      }
    }

    return [];
  }

  private firstNumber(source: unknown, keys: string[], textPatterns: RegExp[] = []): number | null {
    const queue: unknown[] = [source];
    const seen = new Set<object>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined || current === null) {
        continue;
      }

      if (typeof current === "string") {
        const match = this.firstPatternNumber(current, textPatterns);
        if (match !== null) {
          return match;
        }
        continue;
      }

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      if (!isObject(current)) {
        continue;
      }

      if (seen.has(current)) {
        continue;
      }
      seen.add(current);

      for (const key of keys) {
        const value = current[key];
        if (typeof value === "number") {
          return value;
        }
        if (typeof value === "string") {
          const maybeNumber = Number(value);
          if (Number.isFinite(maybeNumber)) {
            return maybeNumber;
          }
        }
      }

      for (const value of Object.values(current)) {
        queue.push(value);
      }
    }

    return null;
  }

  private firstPatternNumber(text: string, patterns: RegExp[]): number | null {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (!match || match[1] === undefined) {
        continue;
      }
      const value = Number(match[1]);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  }

  private formatConnectionError(error: unknown): string {
    if (this.config.transport === "stdio") {
      const startupFailure = this.describeStdioStartupFailure(error);
      if (startupFailure) {
        return startupFailure;
      }
    }

    return this.sanitizeError(error);
  }

  private describeStdioStartupFailure(error: unknown): string | null {
    const message = error instanceof Error ? error.message : String(error);
    const errno = this.extractErrnoCode(error, message);

    if (errno === "EACCES") {
      return (
        "unable to execute the configured MongoDB MCP stdio command (EACCES). " +
        "Check mcp.stdio.command and mcp.stdio.args permissions, or leave them unset to use the bundled MongoDB MCP server."
      );
    }

    if (errno === "ENOENT") {
      return (
        "unable to locate the configured MongoDB MCP stdio command (ENOENT). " +
        "Check mcp.stdio.command and mcp.stdio.args, or leave them unset to use the bundled MongoDB MCP server."
      );
    }

    return null;
  }

  private extractErrnoCode(error: unknown, message: string): string | null {
    if (isObject(error) && typeof error.code === "string") {
      return error.code;
    }

    const match = message.match(/\b(EACCES|ENOENT)\b/);
    return match?.[1] ?? null;
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
