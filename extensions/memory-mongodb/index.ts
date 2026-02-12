/**
 * Moltbot Memory (MongoDB Atlas) Plugin
 *
 * Long-term memory with vector search for AI conversations.
 * Uses MongoDB Atlas for storage, Atlas Vector Search for retrieval,
 * and OpenAI for embeddings.
 * Provides seamless auto-recall and auto-capture via lifecycle hooks.
 */

import { Type } from "@sinclair/typebox";
import OpenAI from "openai";
import type { MoltbotPluginApi } from "clawdbot/plugin-sdk";
import { stringEnum } from "clawdbot/plugin-sdk";

import {
  MEMORY_CATEGORIES,
  DEFAULT_CAPTURE_TRIGGERS,
  type MemoryCategory,
  memoryConfigSchema,
  vectorDimsForModel,
} from "./config.js";

import {
  MongoMemoryDB,
  buildVectorIndexDefinition,
  type MemoryEntry,
} from "./mongodb-provider.js";

// ============================================================================
// OpenAI Embeddings
// ============================================================================

class Embeddings {
  private client: OpenAI;

  constructor(
    apiKey: string,
    private model: string,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });
    return response.data[0].embedding;
  }
}

// ============================================================================
// Rule-based capture filter
// ============================================================================

/**
 * Compile an array of trigger pattern strings into RegExp objects.
 */
function compileTriggers(patterns: string[]): RegExp[] {
  return patterns.map((p) => new RegExp(p, "i"));
}

function shouldCapture(text: string, triggers: RegExp[]): boolean {
  if (text.length < 10 || text.length > 500) return false;
  // Skip injected context from memory recall
  if (text.includes("<relevant-memories>")) return false;
  // Skip system-generated content
  if (text.startsWith("<") && text.includes("</")) return false;
  // Skip agent summary responses (contain markdown formatting)
  if (text.includes("**") && text.includes("\n-")) return false;
  // Skip emoji-heavy responses (likely agent output)
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount > 3) return false;
  return triggers.some((r) => r.test(text));
}

function detectCategory(text: string): MemoryCategory {
  const lower = text.toLowerCase();
  if (/prefer|like|love|hate|want/i.test(lower)) return "preference";
  if (/decided|will use/i.test(lower)) return "decision";
  if (/\+\d{10,}|@[\w.-]+\.\w+|is called/i.test(lower))
    return "entity";
  if (/is|are|has|have/i.test(lower)) return "fact";
  return "other";
}

// ============================================================================
// Plugin Definition
// ============================================================================

const memoryPlugin = {
  id: "memory-mongodb",
  name: "Memory (MongoDB Atlas)",
  description: "MongoDB Atlas-backed long-term memory with auto-recall/capture",
  kind: "memory" as const,
  configSchema: memoryConfigSchema,

  register(api: MoltbotPluginApi) {
    const cfg = memoryConfigSchema.parse(api.pluginConfig);
    const vectorDim = vectorDimsForModel(cfg.embedding.model ?? "text-embedding-3-small");
    const db = new MongoMemoryDB(
      cfg.connectionUri,
      cfg.databaseName,
      cfg.collectionName,
      cfg.vectorSearchIndexName,
    );
    const embeddings = new Embeddings(cfg.embedding.apiKey, cfg.embedding.model!);
    const triggers = compileTriggers(cfg.captureTriggers);

    // Log safe startup info (never log the connection URI)
    api.logger.info(
      `memory-mongodb: plugin registered (db: ${cfg.databaseName}/${cfg.collectionName}, lazy init)`,
    );

    // Log the Atlas Vector Search index definition at startup
    const indexDef = buildVectorIndexDefinition(cfg.vectorSearchIndexName, vectorDim);
    api.logger.info(
      `memory-mongodb: ensure Atlas Vector Search index exists:\n${JSON.stringify(indexDef, null, 2)}`,
    );

    // ========================================================================
    // Tools
    // ========================================================================

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

          const vector = await embeddings.embed(query);
          const results = await db.search(vector, limit, 0.1);

          if (results.length === 0) {
            return {
              content: [{ type: "text", text: "No relevant memories found." }],
              details: { count: 0 },
            };
          }

          const text = results
            .map(
              (r, i) =>
                `${i + 1}. [${r.entry.category}] ${r.entry.text} (${(r.score * 100).toFixed(0)}%)`,
            )
            .join("\n");

          // Strip vector data for serialization
          const sanitizedResults = results.map((r) => ({
            id: r.entry.id,
            text: r.entry.text,
            category: r.entry.category,
            importance: r.entry.importance,
            score: r.score,
          }));

          return {
            content: [
              { type: "text", text: `Found ${results.length} memories:\n\n${text}` },
            ],
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
          "Save important information in long-term memory. Use for preferences, facts, decisions.",
        parameters: Type.Object({
          text: Type.String({ description: "Information to remember" }),
          importance: Type.Optional(
            Type.Number({ description: "Importance 0-1 (default: 0.7)" }),
          ),
          category: Type.Optional(stringEnum(MEMORY_CATEGORIES)),
        }),
        async execute(_toolCallId, params) {
          const {
            text,
            importance = 0.7,
            category = "other",
          } = params as {
            text: string;
            importance?: number;
            category?: MemoryEntry["category"];
          };

          const vector = await embeddings.embed(text);

          // Check for duplicates
          const existing = await db.search(vector, 1, 0.95);
          if (existing.length > 0) {
            return {
              content: [
                { type: "text", text: `Similar memory already exists: "${existing[0].entry.text}"` },
              ],
              details: { action: "duplicate", existingId: existing[0].entry.id, existingText: existing[0].entry.text },
            };
          }

          const entry = await db.store({
            text,
            vector,
            importance,
            category,
          });

          return {
            content: [{ type: "text", text: `Stored: "${text.slice(0, 100)}..."` }],
            details: { action: "created", id: entry.id },
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
            await db.delete(memoryId);
            return {
              content: [{ type: "text", text: `Memory ${memoryId} forgotten.` }],
              details: { action: "deleted", id: memoryId },
            };
          }

          if (query) {
            const vector = await embeddings.embed(query);
            const results = await db.search(vector, 5, 0.7);

            if (results.length === 0) {
              return {
                content: [{ type: "text", text: "No matching memories found." }],
                details: { found: 0 },
              };
            }

            if (results.length === 1 && results[0].score > 0.9) {
              await db.delete(results[0].entry.id);
              return {
                content: [
                  { type: "text", text: `Forgotten: "${results[0].entry.text}"` },
                ],
                details: { action: "deleted", id: results[0].entry.id },
              };
            }

            const list = results
              .map((r) => `- [${r.entry.id.slice(0, 8)}] ${r.entry.text.slice(0, 60)}...`)
              .join("\n");

            // Strip vector data for serialization
            const sanitizedCandidates = results.map((r) => ({
              id: r.entry.id,
              text: r.entry.text,
              category: r.entry.category,
              score: r.score,
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

    // ========================================================================
    // CLI Commands
    // ========================================================================

    api.registerCli(
      ({ program }) => {
        const memory = program
          .command("ltm")
          .description("MongoDB Atlas memory plugin commands");

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
            const vector = await embeddings.embed(query);
            const results = await db.search(vector, parseInt(opts.limit), 0.3);
            // Strip vectors for output
            const output = results.map((r) => ({
              id: r.entry.id,
              text: r.entry.text,
              category: r.entry.category,
              importance: r.entry.importance,
              score: r.score,
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

    // ========================================================================
    // Lifecycle Hooks
    // ========================================================================

    // Auto-recall: inject relevant memories before agent starts
    if (cfg.autoRecall) {
      api.on("before_agent_start", async (event) => {
        if (!event.prompt || event.prompt.length < 5) return;

        try {
          const vector = await embeddings.embed(event.prompt);
          const results = await db.search(vector, 3, 0.3);

          if (results.length === 0) return;

          const memoryContext = results
            .map((r) => `- [${r.entry.category}] ${r.entry.text}`)
            .join("\n");

          api.logger.info?.(
            `memory-mongodb: injecting ${results.length} memories into context`,
          );

          return {
            prependContext: `<relevant-memories>\nThe following memories may be relevant to this conversation:\n${memoryContext}\n</relevant-memories>`,
          };
        } catch (err) {
          api.logger.warn(`memory-mongodb: recall failed: ${String(err)}`);
        }
      });
    }

    // Auto-capture: analyze and store important information after agent ends
    if (cfg.autoCapture) {
      api.on("agent_end", async (event) => {
        if (!event.success || !event.messages || event.messages.length === 0) {
          return;
        }

        try {
          // Extract text content from messages (handling unknown[] type)
          const texts: string[] = [];
          for (const msg of event.messages) {
            // Type guard for message object
            if (!msg || typeof msg !== "object") continue;
            const msgObj = msg as Record<string, unknown>;

            // Only process user and assistant messages
            const role = msgObj.role;
            if (role !== "user" && role !== "assistant") continue;

            const content = msgObj.content;

            // Handle string content directly
            if (typeof content === "string") {
              texts.push(content);
              continue;
            }

            // Handle array content (content blocks)
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

          // Filter for capturable content
          const toCapture = texts.filter(
            (text) => text && shouldCapture(text, triggers),
          );
          if (toCapture.length === 0) return;

          // Store each capturable piece (limit to 3 per conversation)
          let stored = 0;
          for (const text of toCapture.slice(0, 3)) {
            const category = detectCategory(text);
            const vector = await embeddings.embed(text);

            // Check for duplicates (high similarity threshold)
            const existing = await db.search(vector, 1, 0.95);
            if (existing.length > 0) continue;

            await db.store({
              text,
              vector,
              importance: 0.7,
              category,
            });
            stored++;
          }

          if (stored > 0) {
            api.logger.info(`memory-mongodb: auto-captured ${stored} memories`);
          }
        } catch (err) {
          api.logger.warn(`memory-mongodb: capture failed: ${String(err)}`);
        }
      });
    }

    // ========================================================================
    // Service
    // ========================================================================

    api.registerService({
      id: "memory-mongodb",
      start: () => {
        api.logger.info(
          `memory-mongodb: initialized (db: ${cfg.databaseName}/${cfg.collectionName}, model: ${cfg.embedding.model})`,
        );
      },
      stop: async () => {
        await db.close();
        api.logger.info("memory-mongodb: stopped (connection closed)");
      },
    });
  },
};

export default memoryPlugin;

// Re-export for tests
export { shouldCapture, detectCategory, compileTriggers };
