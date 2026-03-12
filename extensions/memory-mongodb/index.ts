/**
 * DAISy Memory (MongoDB via MCP) Plugin
 *
 * Long-term memory with vector search for AI conversations.
 * Uses MongoDB MCP server for data operations and Gemini embeddings.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { stringEnum } from "openclaw/plugin-sdk";
import {
  MEMORY_CATEGORIES,
  type MemoryCategory,
  memoryConfigSchema,
  vectorDimsForModel,
} from "./config.js";
import { GeminiService } from "./gemini-service.js";
import { McpClientService } from "./mcp-client-service.js";
import {
  buildVectorIndexDefinition,
  type MemoryEntry,
  type MemoryType,
  MongoMemoryDB,
} from "./mongodb-provider.js";
import { multimodalPartsToFallbackText, type MultimodalPart } from "./payload-chunker.js";

function compileTriggers(patterns: string[]): RegExp[] {
  return patterns.map((pattern) => new RegExp(pattern, "i"));
}

function shouldCapture(text: string, triggers: RegExp[]): boolean {
  if (text.length < 10 || text.length > 500) {
    return false;
  }
  if (text.includes("<relevant-memories>")) {
    return false;
  }
  if (text.startsWith("<") && text.includes("</")) {
    return false;
  }
  if (text.includes("**") && text.includes("\n-")) {
    return false;
  }
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount > 3) {
    return false;
  }

  return triggers.some((trigger) => trigger.test(text));
}

function detectCategory(text: string): MemoryCategory {
  const lower = text.toLowerCase();
  if (/prefer|like|love|hate|want/i.test(lower)) {
    return "preference";
  }
  if (/decided|will use|plan to/i.test(lower)) {
    return "decision";
  }
  if (/\+\d{10,}|@[\w.-]+\.\w+|is called|my name is/i.test(lower)) {
    return "entity";
  }
  if (/is|are|has|have|works with/i.test(lower)) {
    return "fact";
  }
  return "other";
}

function detectMemoryType(category: MemoryCategory, text: string): MemoryType {
  const lower = text.toLowerCase();
  if (/(current|this session|for now)/i.test(lower)) {
    return "working";
  }
  if (/(cache|temporary|ttl)/i.test(lower)) {
    return "cache";
  }
  if (category === "decision") {
    return "procedural";
  }
  if (category === "fact") {
    return "semantic";
  }
  if (category === "entity") {
    return "associative";
  }
  return "episodic";
}

function detectSubCategory(text: string): string | undefined {
  if (/email|@/i.test(text)) {
    return "contact";
  }
  if (/phone|\+\d{10,}/i.test(text)) {
    return "contact";
  }
  if (/prefer|like|love|hate/i.test(text)) {
    return "preference";
  }
  if (/decided|will use|plan/i.test(text)) {
    return "decision";
  }
  return undefined;
}

const multimodalPartSchema = Type.Union([
  Type.Object({
    text: Type.String({ description: "Text part" }),
  }),
  Type.Object({
    inlineData: Type.Object({
      mimeType: Type.String({ description: "MIME type (image/png, image/jpeg, video/mp4, etc.)" }),
      data: Type.String({ description: "Base64 encoded payload" }),
    }),
  }),
]);

const memoryPlugin = {
  id: "memory-mongodb",
  name: "Memory (MongoDB MCP + Gemini)",
  description: "MongoDB MCP + Gemini-backed long-term memory with auto-recall/capture",
  kind: "memory" as const,
  configSchema: memoryConfigSchema,

  register(api: OpenClawPluginApi) {
    const cfg = memoryConfigSchema.parse(api.pluginConfig);
    const vectorDim = vectorDimsForModel(cfg.gemini.embeddingModel);

    const mcpService = new McpClientService(cfg.mcp, api.logger);
    const geminiService = new GeminiService(cfg.gemini.apiKey, cfg.gemini.embeddingModel);

    const db = new MongoMemoryDB(
      mcpService,
      geminiService,
      cfg.database.name,
      cfg.database.collection,
      cfg.database.indexName,
      cfg.retrieval,
      api.logger,
    );

    const triggers = compileTriggers(cfg.captureTriggers);

    api.logger.info(
      `memory-mongodb: plugin registered (db: ${cfg.database.name}/${cfg.database.collection}, transport: ${cfg.mcp.transport})`,
    );

    const indexDef = buildVectorIndexDefinition(cfg.database.indexName, vectorDim);
    api.logger.info(
      `memory-mongodb: ensure Atlas Vector Search index exists:\n${JSON.stringify(indexDef, null, 2)}`,
    );

    api.registerTool(
      {
        name: "memory_recall",
        label: "Memory Recall",
        description:
          "Search through long-term memories. Use when you need context about user preferences, past decisions, or previously discussed topics.",
        parameters: Type.Object({
          query: Type.String({ description: "Search query" }),
          limit: Type.Optional(Type.Number({ description: "Max results (default: 5)" })),
        }),
        async execute(_toolCallId, params) {
          const { query, limit = 5 } = params as { query: string; limit?: number };

          const results = await db.searchByQuery(query, limit, cfg.retrieval.minScore);

          if (results.length === 0) {
            return {
              content: [{ type: "text", text: "No relevant memories found." }],
              details: { count: 0 },
            };
          }

          const text = results
            .map(
              (result, index) =>
                `${index + 1}. [${result.entry.category}] ${result.entry.text} (${(result.score * 100).toFixed(0)}%)`,
            )
            .join("\n");

          const sanitizedResults = results.map((result) => ({
            id: result.entry.id,
            text: result.entry.text,
            category: result.entry.category,
            subCategory: result.entry.subCategory,
            type: result.entry.type,
            importance: result.entry.importance,
            score: result.score,
            vectorScore: result.vectorScore,
          }));

          return {
            content: [{ type: "text", text: `Found ${results.length} memories:\n\n${text}` }],
            details: { count: results.length, memories: sanitizedResults },
          };
        },
      },
      { name: "memory_recall" },
    );

    api.registerTool(
      {
        name: "memory_store",
        label: "Memory Store",
        description:
          "Save important information in long-term memory. Supports plain text or Gemini-compatible multimodal parts.",
        parameters: Type.Object({
          text: Type.Optional(Type.String({ description: "Information to remember" })),
          parts: Type.Optional(
            Type.Array(multimodalPartSchema, {
              description: "Optional multimodal parts for embedding (text and/or inline base64 media)",
            }),
          ),
          importance: Type.Optional(Type.Number({ description: "Importance 0-1 (default: 0.7)" })),
          category: Type.Optional(stringEnum(MEMORY_CATEGORIES)),
        }),
        async execute(_toolCallId, params) {
          const {
            text,
            parts,
            importance = 0.7,
            category,
          } = params as {
            text?: string;
            parts?: MultimodalPart[];
            importance?: number;
            category?: MemoryEntry["category"];
          };

          const normalizedParts =
            Array.isArray(parts) && parts.length > 0
              ? parts
              : typeof text === "string" && text.trim().length > 0
                ? [{ text }]
                : [];

          if (normalizedParts.length === 0) {
            return {
              content: [{ type: "text", text: "Provide text or parts to store memory." }],
              details: { error: "missing_param" },
            };
          }

          const fallbackText =
            typeof text === "string" && text.trim().length > 0
              ? text.trim()
              : multimodalPartsToFallbackText(normalizedParts, 2_000);

          const inferredCategory = category ?? detectCategory(fallbackText);
          const existing = await db.searchByQuery(fallbackText, 1, 0.95);

          if (existing.length > 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `Similar memory already exists: "${existing[0].entry.text}"`,
                },
              ],
              details: {
                action: "duplicate",
                existingId: existing[0].entry.id,
                existingText: existing[0].entry.text,
              },
            };
          }

          const entry = await db.store({
            text: fallbackText,
            parts: normalizedParts,
            importance,
            category: inferredCategory,
            subCategory: detectSubCategory(fallbackText),
            type: detectMemoryType(inferredCategory, fallbackText),
            metadata: {
              source: "memory_store",
            },
          });

          return {
            content: [{ type: "text", text: `Stored: "${fallbackText.slice(0, 100)}..."` }],
            details: {
              action: "created",
              id: entry.id,
              category: inferredCategory,
              type: entry.type,
            },
          };
        },
      },
      { name: "memory_store" },
    );

    api.registerTool(
      {
        name: "memory_forget",
        label: "Memory Forget",
        description: "Delete specific memories. GDPR-compliant.",
        parameters: Type.Object({
          query: Type.Optional(Type.String({ description: "Search to find memory" })),
          memoryId: Type.Optional(Type.String({ description: "Specific memory ID" })),
        }),
        async execute(_toolCallId, params) {
          const { query, memoryId } = params as { query?: string; memoryId?: string };

          if (memoryId) {
            const deleted = await db.delete(memoryId);
            if (!deleted) {
              return {
                content: [{ type: "text", text: `Memory ${memoryId} not found.` }],
                details: { action: "not_found", id: memoryId },
              };
            }
            return {
              content: [{ type: "text", text: `Memory ${memoryId} forgotten.` }],
              details: { action: "deleted", id: memoryId },
            };
          }

          if (query) {
            const results = await db.searchByQuery(query, 5, 0.7);

            if (results.length === 0) {
              return {
                content: [{ type: "text", text: "No matching memories found." }],
                details: { found: 0 },
              };
            }

            if (results.length === 1 && results[0].score > 0.9) {
              await db.delete(results[0].entry.id);
              return {
                content: [{ type: "text", text: `Forgotten: "${results[0].entry.text}"` }],
                details: { action: "deleted", id: results[0].entry.id },
              };
            }

            const list = results
              .map(
                (result) =>
                  `- [${result.entry.id.slice(0, 8)}] ${result.entry.text.slice(0, 60)}...`,
              )
              .join("\n");

            const sanitizedCandidates = results.map((result) => ({
              id: result.entry.id,
              text: result.entry.text,
              category: result.entry.category,
              type: result.entry.type,
              score: result.score,
            }));

            return {
              content: [
                {
                  type: "text",
                  text: `Found ${results.length} candidates. Specify memoryId:\n${list}`,
                },
              ],
              details: { action: "candidates", candidates: sanitizedCandidates },
            };
          }

          return {
            content: [{ type: "text", text: "Provide query or memoryId." }],
            details: { error: "missing_param" },
          };
        },
      },
      { name: "memory_forget" },
    );

    api.registerCli(
      ({ program }) => {
        const memory = program.command("ltm").description("MongoDB MCP memory plugin commands");

        memory
          .command("list")
          .description("List memories")
          .action(async () => {
            const count = await db.count();
            console.log(`Total memories: ${count}`);
          });

        memory
          .command("search")
          .description("Search memories")
          .argument("<query>", "Search query")
          .option("--limit <n>", "Max results", "5")
          .action(async (query, opts) => {
            const results = await db.searchByQuery(query, Number.parseInt(opts.limit, 10), 0.3);
            const output = results.map((result) => ({
              id: result.entry.id,
              text: result.entry.text,
              category: result.entry.category,
              type: result.entry.type,
              importance: result.entry.importance,
              score: result.score,
            }));
            console.log(JSON.stringify(output, null, 2));
          });

        memory
          .command("stats")
          .description("Show memory statistics")
          .action(async () => {
            const count = await db.count();
            console.log(`Total memories: ${count}`);
          });
      },
      { commands: ["ltm"] },
    );

    if (cfg.autoRecall) {
      api.on("before_agent_start", async (event) => {
        if (!event.prompt || event.prompt.length < 5) {
          return;
        }

        try {
          const results = await db.searchByQuery(event.prompt, 3, 0.3);
          if (results.length === 0) {
            return;
          }

          const memoryContext = results
            .map((result) => `- [${result.entry.category}] ${result.entry.text}`)
            .join("\n");

          api.logger.info?.(`memory-mongodb: injecting ${results.length} memories into context`);

          return {
            prependContext: `<relevant-memories>\nThe following memories may be relevant to this conversation:\n${memoryContext}\n</relevant-memories>`,
          };
        } catch (error) {
          api.logger.warn(`memory-mongodb: recall failed: ${String(error)}`);
        }
      });
    }

    if (cfg.autoCapture) {
      api.on("agent_end", async (event) => {
        if (!event.success || !event.messages || event.messages.length === 0) {
          return;
        }

        try {
          const texts: string[] = [];

          for (const message of event.messages) {
            if (!message || typeof message !== "object") {
              continue;
            }
            const messageRecord = message as Record<string, unknown>;
            const role = messageRecord.role;
            if (role !== "user" && role !== "assistant") {
              continue;
            }

            const content = messageRecord.content;
            if (typeof content === "string") {
              texts.push(content);
              continue;
            }

            if (Array.isArray(content)) {
              for (const block of content) {
                if (
                  block &&
                  typeof block === "object" &&
                  "type" in block &&
                  (block as Record<string, unknown>).type === "text" &&
                  "text" in block &&
                  typeof (block as Record<string, unknown>).text === "string"
                ) {
                  texts.push((block as Record<string, unknown>).text as string);
                }
              }
            }
          }

          const toCapture = texts.filter((text) => shouldCapture(text, triggers));
          if (toCapture.length === 0) {
            return;
          }

          let stored = 0;

          for (const text of toCapture.slice(0, 3)) {
            const category = detectCategory(text);
            const existing = await db.searchByQuery(text, 1, 0.95);
            if (existing.length > 0) {
              continue;
            }

            await db.store({
              text,
              parts: [{ text }],
              importance: 0.7,
              category,
              subCategory: detectSubCategory(text),
              type: detectMemoryType(category, text),
              metadata: {
                source: "auto_capture",
              },
            });

            stored += 1;
          }

          if (stored > 0) {
            api.logger.info(`memory-mongodb: auto-captured ${stored} memories`);
          }
        } catch (error) {
          api.logger.warn(`memory-mongodb: capture failed: ${String(error)}`);
        }
      });
    }

    api.registerService({
      id: "memory-mongodb",
      start: () => {
        api.logger.info(
          `memory-mongodb: initialized (db: ${cfg.database.name}/${cfg.database.collection}, embeddingModel: ${cfg.gemini.embeddingModel})`,
        );
      },
      stop: async () => {
        await db.close();
        api.logger.info("memory-mongodb: stopped");
      },
    });
  },
};

export default memoryPlugin;
export { compileTriggers, detectCategory, shouldCapture };