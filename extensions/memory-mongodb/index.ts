/**
 * DAISy Memory (MongoDB via MCP) Plugin
 *
 * Long-term memory with vector search for AI conversations.
 * Uses MongoDB MCP server for data operations and Gemini embeddings.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { stringEnum } from "openclaw/plugin-sdk";
import { resolveStateDir } from "../../src/config/paths.js";
import type { OpenClawPluginToolContext, PluginHookAgentContext } from "../../src/plugins/types.js";
import { isSubagentSessionKey } from "../../src/routing/session-key.js";
import {
  MEMORY_CATEGORIES,
  type MemoryCategory,
  memoryConfigSchema,
  vectorDimsForModel,
} from "./config.js";
import { GeminiService } from "./gemini-service.js";
import { McpClientService } from "./mcp-client-service.js";
import { MemoryAutonomyService } from "./memory-autonomy-service.js";
import { ingestDocumentToMemory } from "./document-ingest.js";
import { MemoryOpsService, resolveScopeSubjectFromContext } from "./memory-ops-service.js";
import {
  MEMORY_OPS_KINDS,
  MEMORY_OPS_MODALITIES,
  MEMORY_OPS_SENSITIVITIES,
  type CommitmentTrackerMode,
  type MemoryCaptureCandidate,
  type MemoryHygieneAction,
  type MemoryHygienePlan,
  type MemoryHygieneStrategy,
  type PreferenceMinerMode,
} from "./memory-ops-types.js";
import { buildVectorIndexDefinition, type MemoryEntry, MongoMemoryDB } from "./mongodb-provider.js";
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

function deriveAutoPreferenceKey(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s:_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const withoutLeadIn = normalized.replace(
    /^(i|we)\s+(prefer|like|love|hate|want|need)\s+(to\s+|that\s+)?/,
    "",
  );
  const topic = withoutLeadIn
    .split(" ")
    .filter((word) => word.length > 2)
    .slice(0, 6)
    .join("_");
  return topic ? `auto_preference:${topic}` : "auto_preference:general";
}

function isSecretEntry(entry: MemoryEntry | null | undefined): boolean {
  if (!entry) {
    return false;
  }
  if (entry.sensitivity === "secret") {
    return true;
  }
  if (!entry.metadata || typeof entry.metadata !== "object") {
    return false;
  }
  const ops = (entry.metadata as Record<string, unknown>).ops;
  return Boolean(
    ops && typeof ops === "object" && (ops as Record<string, unknown>).sensitivity === "secret",
  );
}

function resolveScopeSubject(ctx: OpenClawPluginToolContext): string | null {
  return resolveScopeSubjectFromContext(ctx);
}

function resolveScopeSubjectFromHook(
  event: unknown,
  ctx: PluginHookAgentContext | undefined,
): string | null {
  const eventRecord = event && typeof event === "object" ? (event as Record<string, unknown>) : {};
  const contextAgentId = typeof ctx?.agentId === "string" ? ctx.agentId.trim().toLowerCase() : "";
  const eventAgentId =
    typeof eventRecord.agentId === "string" ? eventRecord.agentId.trim().toLowerCase() : "";
  const agentId = contextAgentId || eventAgentId;
  if (!agentId) {
    return null;
  }

  const contextSessionKey =
    typeof ctx?.sessionKey === "string" && ctx.sessionKey.trim().length > 0
      ? ctx.sessionKey
      : undefined;
  const eventSessionKey =
    typeof eventRecord.sessionKey === "string" && eventRecord.sessionKey.trim().length > 0
      ? eventRecord.sessionKey
      : undefined;
  const sessionKey = contextSessionKey ?? eventSessionKey;
  if (sessionKey && isSubagentSessionKey(sessionKey)) {
    const subagentId = resolveSubagentIdFromSessionKey(sessionKey);
    return `subagent:${subagentId ?? agentId}`;
  }
  return `agent:${agentId}`;
}

function resolveSubagentIdFromSessionKey(sessionKey: string): string | null {
  const tokens = sessionKey
    .trim()
    .toLowerCase()
    .split(":")
    .filter((token) => token.length > 0);
  const subagentIndex = tokens.lastIndexOf("subagent");
  const candidate = subagentIndex >= 0 ? tokens[subagentIndex + 1] : undefined;
  if (!candidate) {
    return null;
  }
  return candidate.trim().length > 0 ? candidate.trim() : null;
}

function scopeErrorResult() {
  return {
    content: [{ type: "text" as const, text: "Memory scope unavailable for this context." }],
    details: { error: "missing_scope_subject" },
  };
}

function clampPositiveInt(value: number | undefined, fallback: number, max: number): number {
  const raw = Number.isFinite(value) ? (value as number) : fallback;
  const normalized = Math.trunc(raw);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }
  return Math.max(1, Math.min(normalized, max));
}

const FULL_MEMORY_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEMORY_ID_PREFIX_REGEX = /^[0-9a-f-]{8,35}$/i;

function readEntryScopeSubject(entry: MemoryEntry | null): string | undefined {
  if (!entry) {
    return undefined;
  }
  if (typeof entry.scopeSubject === "string" && entry.scopeSubject.trim().length > 0) {
    return entry.scopeSubject;
  }
  if (!entry.metadata || typeof entry.metadata !== "object" || Array.isArray(entry.metadata)) {
    return undefined;
  }
  const ops = (entry.metadata as Record<string, unknown>).ops;
  if (!ops || typeof ops !== "object" || Array.isArray(ops)) {
    return undefined;
  }
  const scopeSubject = (ops as Record<string, unknown>).scopeSubject;
  return typeof scopeSubject === "string" && scopeSubject.trim().length > 0
    ? scopeSubject
    : undefined;
}

function isEntryDeletableInScope(
  entry: MemoryEntry | null,
  scopeSubject: string,
  allowLegacyUnscopedDelete: boolean,
): boolean {
  const entryScope = readEntryScopeSubject(entry);
  return entryScope ? entryScope === scopeSubject : allowLegacyUnscopedDelete;
}

function formatForgetCandidate(entry: MemoryEntry): string {
  const rawText = isSecretEntry(entry) ? "[secret redacted]" : entry.text;
  const text = rawText.length > 60 ? `${rawText.slice(0, 60)}...` : rawText;
  return `- memoryId: ${entry.id} (short: ${entry.id.slice(0, 8)}) ${text}`;
}

const HYGIENE_PREVIEW_MAX_CHARS = 140;
const HYGIENE_PREVIEW_SUFFIX = "...";

function truncateHygienePreview(text: string): string {
  const chars = Array.from(text);
  if (chars.length <= HYGIENE_PREVIEW_MAX_CHARS) {
    return text;
  }
  return `${chars
    .slice(0, HYGIENE_PREVIEW_MAX_CHARS - HYGIENE_PREVIEW_SUFFIX.length)
    .join("")}${HYGIENE_PREVIEW_SUFFIX}`;
}

function formatHygienePreview(text: string | null | undefined): string | undefined {
  if (text === null || text === undefined) {
    return undefined;
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }
  return truncateHygienePreview(normalized);
}

function formatHygieneAction(action: MemoryHygieneAction, index: number): string {
  const lines = [
    `${index + 1}. actionId: ${action.id}`,
    `   strategy: ${action.strategy}`,
    `   action: ${action.action}`,
    `   memoryIds: ${action.memoryIds.join(", ") || "(none)"}`,
    `   reason: ${action.reason}`,
  ];
  const candidateText = formatHygienePreview(action.candidateText);
  if (candidateText) {
    lines.push(`   candidateText: ${candidateText}`);
  }
  const candidateValue = formatHygienePreview(action.candidateValue);
  if (candidateValue) {
    lines.push(`   candidateValue: ${candidateValue}`);
  }
  return lines.join("\n");
}

function formatMemoryHygienePlan(plan: MemoryHygienePlan): string {
  const header = `Generated hygiene plan with ${plan.actions.length} actions.`;
  const planInfo = [`planId: ${plan.planId}`, `planHash: ${plan.planHash}`];
  if (plan.actions.length === 0) {
    return [header, ...planInfo, "No hygiene actions are pending for this scope."].join("\n");
  }
  const actions = [...plan.actions].sort((a, b) => a.id.localeCompare(b.id));
  const planFields = [
    ...planInfo,
    "approvedActionIds:",
    ...actions.map((action) => `- ${action.id}`),
  ];
  return [
    header,
    "Use these exact apply fields after reviewing the actions:",
    ...planFields,
    "Actions:",
    ...actions.map(formatHygieneAction),
  ].join("\n");
}

function formatMemoryHygieneApply(input: {
  plan: MemoryHygienePlan;
  applied?: {
    deletedIds: string[];
    promotedIds: string[];
    reviewCount: number;
  };
}): string {
  const applied = input.applied;
  const lines = [
    `Applied hygiene plan with ${input.plan.actions.length} actions.`,
    `planId: ${input.plan.planId}`,
    `planHash: ${input.plan.planHash}`,
  ];
  if (applied) {
    lines.push(`deletedCount: ${applied.deletedIds.length}`);
    lines.push(`deletedIds: ${applied.deletedIds.join(", ") || "(none)"}`);
    lines.push(`promotedCount: ${applied.promotedIds.length}`);
    lines.push(`promotedIds: ${applied.promotedIds.join(", ") || "(none)"}`);
    lines.push(`reviewCount: ${applied.reviewCount}`);
  }
  return lines.join("\n");
}

type McpRuntimeDirs = {
  homeDir: string;
  tempDir: string;
};

async function ensurePrivateDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  try {
    await fs.chmod(dir, 0o700);
  } catch {
    // chmod may be a no-op or unsupported on some local dev filesystems.
  }
}

async function prepareMcpRuntimeDirs(stateDir: string): Promise<McpRuntimeDirs> {
  const rootDir = path.join(stateDir, "plugins", "memory-mongodb", "mcp-stdio");
  const homeDir = path.join(rootDir, "home");
  const tempDir = path.join(rootDir, "tmp");

  await ensurePrivateDir(rootDir);
  await ensurePrivateDir(homeDir);
  await ensurePrivateDir(tempDir);

  return { homeDir, tempDir };
}

const multimodalPartSchema = Type.Union([
  Type.Object(
    {
      text: Type.String({ description: "Text part" }),
      inlineData: Type.Optional(Type.Never()),
    },
    {
      additionalProperties: false,
    },
  ),
  Type.Object(
    {
      inlineData: Type.Object(
        {
          mimeType: Type.String({
            description: "MIME type (image/png, image/jpeg, video/mp4, etc.)",
          }),
          data: Type.String({ description: "Base64 encoded payload" }),
        },
        {
          additionalProperties: false,
        },
      ),
      text: Type.Optional(Type.Never()),
    },
    {
      additionalProperties: false,
    },
  ),
]);

const documentMetadataSchema = Type.Object(
  {
    title: Type.Optional(Type.String()),
    filename: Type.Optional(Type.String()),
    mimeType: Type.Optional(Type.String()),
    sha256: Type.Optional(Type.String()),
    documentSha256: Type.Optional(Type.String()),
    byteLength: Type.Optional(Type.Number({ minimum: 0 })),
    pageCount: Type.Optional(Type.Number({ minimum: 0 })),
    chunkId: Type.Optional(Type.String()),
    parentMemoryId: Type.Optional(Type.String()),
    sourceRange: Type.Optional(
      Type.Object(
        {
          pages: Type.Optional(Type.Tuple([Type.Number(), Type.Number()])),
          slides: Type.Optional(Type.Tuple([Type.Number(), Type.Number()])),
          sheetName: Type.Optional(Type.String()),
          rows: Type.Optional(Type.Tuple([Type.Number(), Type.Number()])),
          chars: Type.Optional(Type.Tuple([Type.Number(), Type.Number()])),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

const memoryCaptureEntrySchema = Type.Object(
  {
    text: Type.Optional(Type.String()),
    kind: stringEnum(MEMORY_OPS_KINDS),
    importance: Type.Number({ minimum: 0, maximum: 1 }),
    sensitivity: Type.Optional(stringEnum(MEMORY_OPS_SENSITIVITIES)),
    parts: Type.Optional(Type.Array(multimodalPartSchema)),
    attachments: Type.Optional(
      Type.Array(
        Type.Object(
          {
            modality: stringEnum(MEMORY_OPS_MODALITIES),
            mimeType: Type.String(),
            filename: Type.Optional(Type.String()),
            contentHash: Type.String(),
            byteLength: Type.Optional(Type.Number({ minimum: 0 })),
            durationMs: Type.Optional(Type.Number({ minimum: 0 })),
            pageCount: Type.Optional(Type.Number({ minimum: 0 })),
            transcriptStatus: Type.Optional(
              stringEnum(["available", "missing", "deferred"] as const),
            ),
            ocrStatus: Type.Optional(stringEnum(["available", "missing", "deferred"] as const)),
            storageMode: stringEnum(["inline", "external_ref"] as const),
            externalRef: Type.Optional(Type.String()),
          },
          { additionalProperties: false },
        ),
      ),
    ),
    confidence: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    category: Type.Optional(stringEnum(MEMORY_CATEGORIES)),
    subCategory: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    sourceMessageIds: Type.Optional(Type.Array(Type.String())),
    observedAt: Type.Optional(Type.Number()),
    status: Type.Optional(Type.String()),
    supersedesId: Type.Optional(Type.String()),
    expiresAt: Type.Optional(Type.Number()),
    auditRunId: Type.Optional(Type.String()),
    commitment: Type.Optional(
      Type.Object(
        {
          owner: Type.String(),
          dueAt: Type.Optional(Type.Number()),
          followUpAt: Type.Optional(Type.Number()),
          priority: Type.Optional(stringEnum(["low", "medium", "high"] as const)),
        },
        { additionalProperties: false },
      ),
    ),
    preference: Type.Optional(
      Type.Object(
        {
          key: Type.String(),
          value: Type.String(),
        },
        { additionalProperties: false },
      ),
    ),
    document: Type.Optional(documentMetadataSchema),
  },
  {
    additionalProperties: false,
  },
);

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
      cfg.database.eventCollection,
      cfg.database.indexName,
      {
        tenantId: cfg.routing.tenantId,
        workspaceId: cfg.routing.workspaceId,
        defaultVisibility: cfg.routing.defaultVisibility,
        vectorIndexNameV2: cfg.database.indexNameV2,
        legacyFallback: cfg.routing.legacyFallback,
      },
      cfg.retrieval,
      api.logger,
    );
    const opsService = new MemoryOpsService(db, cfg.ops, api.logger);
    const autonomyService = new MemoryAutonomyService(db, cfg.ops.autonomy, api.logger);

    const triggers = compileTriggers(cfg.captureTriggers);
    let runtimeDirs: McpRuntimeDirs | null = null;
    let runtimeDirsPromise: Promise<McpRuntimeDirs> | null = null;

    async function ensureMcpRuntimeDirs(stateDir?: string): Promise<void> {
      if (cfg.mcp.transport !== "stdio") {
        return;
      }
      if (runtimeDirs) {
        return;
      }
      if (!runtimeDirsPromise) {
        const resolvedStateDir = stateDir ?? resolveStateDir(process.env);
        runtimeDirsPromise = prepareMcpRuntimeDirs(resolvedStateDir)
          .then((dirs) => {
            runtimeDirs = dirs;
            mcpService.setRuntimeEnvOverrides({
              HOME: dirs.homeDir,
              TMPDIR: dirs.tempDir,
            });
            return dirs;
          })
          .catch((error) => {
            runtimeDirsPromise = null;
            throw error;
          });
      }
      await runtimeDirsPromise;
    }

    async function countMemories(stateDir?: string): Promise<number> {
      await ensureMcpRuntimeDirs(stateDir);
      return db.count();
    }

    async function searchMemories(
      query: string,
      scopeSubject: string,
      limit: number,
      minScore: number,
      filters?: {
        kinds?: string[];
        modalities?: string[];
        openCommitmentsOnly?: boolean;
        preferencesOnly?: boolean;
        includeSecrets?: boolean;
      },
    ) {
      await ensureMcpRuntimeDirs();
      return db.searchByQuery(query, limit, minScore, {
        scopeSubject,
        kinds: filters?.kinds,
        modalities: filters?.modalities,
        openCommitmentsOnly: filters?.openCommitmentsOnly,
        preferencesOnly: filters?.preferencesOnly,
        includeSecrets: filters?.includeSecrets,
      });
    }

    async function deleteMemory(memoryId: string): Promise<boolean> {
      await ensureMcpRuntimeDirs();
      return db.delete(memoryId);
    }

    api.logger.info(
      `memory-mongodb: plugin registered (db: ${cfg.database.name}/${cfg.database.collection}, transport: ${cfg.mcp.transport})`,
    );

    const indexDef = buildVectorIndexDefinition(cfg.database.indexName, vectorDim);
    const routingIndexDef = buildVectorIndexDefinition(cfg.database.indexNameV2, vectorDim, {
      routingFilters: true,
    });
    api.logger.info(
      `memory-mongodb: ensure Atlas Vector Search index exists:\n${JSON.stringify(indexDef, null, 2)}`,
    );
    api.logger.info(
      `memory-mongodb: ensure scoped Atlas Vector Search index exists:\n${JSON.stringify(routingIndexDef, null, 2)}`,
    );

    api.registerTool(
      (ctx) => {
        const scopeSubject = resolveScopeSubject(ctx);
        return {
          name: "memory_recall",
          label: "Memory Recall",
          description:
            "Basic memory recall using only query and limit. Returns simple results for downstream skill wrappers.",
          parameters: Type.Object(
            {
              query: Type.String({ description: "Search query" }),
              limit: Type.Optional(
                Type.Integer({ minimum: 1, description: "Max results (default: 5)" }),
              ),
            },
            { additionalProperties: false },
          ),
          async execute(_toolCallId, params) {
            if (!scopeSubject) {
              return scopeErrorResult();
            }
            await ensureMcpRuntimeDirs();

            const { query, limit: rawLimit } = params as {
              query: string;
              limit?: number;
            };
            const limit = clampPositiveInt(rawLimit, 5, cfg.retrieval.vectorLimit);

            const results = await searchMemories(
              query,
              scopeSubject,
              limit,
              cfg.retrieval.minScore,
            );
            if (results.length === 0) {
              return {
                content: [{ type: "text", text: "No relevant memories found." }],
                details: { count: 0, scopeSubject },
              };
            }

            const text = results
              .map((result, index) => {
                const category = result.entry.category ?? "memory";
                const label = result.entry.text || "(empty)";
                return `${index + 1}. [${category}] ${label} (${Math.round(result.score * 100)}%)`;
              })
              .join("\n");

            return {
              content: [{ type: "text", text: `Found ${results.length} memories:\n\n${text}` }],
              details: {
                count: results.length,
                scopeSubject,
                memories: results.map((result) => ({
                  id: result.entry.id,
                  text: result.entry.text,
                  category: result.entry.category,
                  type: result.entry.type,
                  importance: result.entry.importance,
                  score: result.score,
                })),
              },
            };
          },
        };
      },
      { name: "memory_recall" },
    );

    api.registerTool(
      (ctx) => {
        const scopeSubject = resolveScopeSubject(ctx);
        return {
          name: "memory_recallx",
          label: "Memory Recall X",
          description:
            "Advanced memory recall wrapper with typed filters, modality selection, and optional metadata in results.",
          parameters: Type.Object(
            {
              query: Type.String({ description: "Search query" }),
              limit: Type.Optional(
                Type.Integer({ minimum: 1, description: "Max results (default: 5)" }),
              ),
              kinds: Type.Optional(Type.Array(stringEnum(MEMORY_OPS_KINDS))),
              openCommitmentsOnly: Type.Optional(Type.Boolean()),
              preferencesOnly: Type.Optional(Type.Boolean()),
              modalities: Type.Optional(Type.Array(stringEnum(MEMORY_OPS_MODALITIES))),
              includeSecrets: Type.Optional(Type.Boolean()),
              includeMetadata: Type.Optional(Type.Boolean()),
            },
            { additionalProperties: false },
          ),
          async execute(_toolCallId, params) {
            if (!scopeSubject) {
              return scopeErrorResult();
            }
            await ensureMcpRuntimeDirs();

            const {
              query,
              limit: rawLimit,
              kinds,
              openCommitmentsOnly,
              preferencesOnly,
              modalities,
              includeSecrets,
              includeMetadata,
            } = params as {
              query: string;
              limit?: number;
              kinds?: string[];
              openCommitmentsOnly?: boolean;
              preferencesOnly?: boolean;
              modalities?: string[];
              includeSecrets?: boolean;
              includeMetadata?: boolean;
            };
            const limit = clampPositiveInt(rawLimit, 5, cfg.retrieval.vectorLimit);

            const recalled = await opsService.recall({
              query,
              scopeSubject,
              limit,
              maxLimit: cfg.retrieval.vectorLimit,
              minScore: cfg.retrieval.minScore,
              filters: {
                kinds: kinds as any,
                openCommitmentsOnly,
                preferencesOnly,
                modalities: modalities as any,
                includeSecrets,
                includeMetadata,
              },
            });

            if (recalled.noResult) {
              return {
                content: [{ type: "text", text: "No relevant memories found." }],
                details: { count: 0, scopeSubject },
              };
            }

            const text = recalled.memories
              .map((memory, index) => {
                const kind = typeof memory.kind === "string" ? memory.kind : "memory";
                const label =
                  memory.sensitivity === "secret"
                    ? "[secret redacted]"
                    : typeof memory.text === "string"
                      ? memory.text
                      : "(empty)";
                const score =
                  typeof memory.score === "number" ? ` ${(memory.score * 100).toFixed(0)}%` : "";
                return `${index + 1}. [${kind}] ${label}${score}`;
              })
              .join("\n");

            return {
              content: [{ type: "text", text: `Found ${recalled.count} memories:\n\n${text}` }],
              details: {
                count: recalled.count,
                scopeSubject,
                memories: recalled.memories,
              },
            };
          },
        };
      },
      { name: "memory_recallx" },
    );

    api.registerTool(
      (ctx) => {
        const scopeSubject = resolveScopeSubject(ctx);
        return {
          name: "memory_store",
          label: "Memory Store",
          description:
            "Save important information in long-term memory. Supports plain text or multimodal parts.",
          parameters: Type.Object(
            {
              text: Type.Optional(Type.String({ description: "Information to remember" })),
              parts: Type.Optional(
                Type.Array(multimodalPartSchema, {
                  description:
                    "Optional multimodal parts for embedding (text and/or inline base64 media)",
                }),
              ),
              importance: Type.Optional(
                Type.Number({ description: "Importance 0-1 (default: 0.7)" }),
              ),
              category: Type.Optional(stringEnum(MEMORY_CATEGORIES)),
              sensitivity: Type.Optional(stringEnum(MEMORY_OPS_SENSITIVITIES)),
            },
            { additionalProperties: false },
          ),
          async execute(_toolCallId, params) {
            if (!scopeSubject) {
              return scopeErrorResult();
            }
            await ensureMcpRuntimeDirs();

            const {
              text,
              parts,
              importance = 0.7,
              category,
              sensitivity,
            } = params as {
              text?: string;
              parts?: MultimodalPart[];
              importance?: number;
              category?: MemoryEntry["category"];
              sensitivity?: "normal" | "secret";
            };

            const normalizedText = typeof text === "string" ? text.trim() : "";
            const normalizedParts =
              Array.isArray(parts) && parts.length > 0
                ? normalizedText.length > 0
                  ? [{ text: normalizedText }, ...parts]
                  : parts
                : normalizedText.length > 0
                  ? [{ text: normalizedText }]
                  : [];

            if (normalizedParts.length === 0) {
              return {
                content: [{ type: "text", text: "Provide text or parts to store memory." }],
                details: { error: "missing_param" },
              };
            }

            const fallbackText =
              normalizedText.length > 0
                ? normalizedText
                : multimodalPartsToFallbackText(normalizedParts, 2_000);

            const inferredCategory = category ?? detectCategory(fallbackText);
            const inferredKind =
              inferredCategory === "preference"
                ? "preference"
                : inferredCategory === "fact"
                  ? "fact"
                  : inferredCategory === "decision"
                    ? "decision"
                    : "note";
            const capture = await opsService.capture({
              scopeSubject,
              source: "memory_store",
              entries: [
                {
                  text: normalizedText.length > 0 ? normalizedText : undefined,
                  parts: normalizedParts,
                  kind: inferredKind,
                  importance,
                  sensitivity,
                  confidence: 0.9,
                  category: inferredCategory,
                  subCategory: detectSubCategory(fallbackText),
                },
              ],
            });
            const outcome = capture.outcomes[0];
            if (!outcome) {
              return {
                content: [{ type: "text", text: "Memory capture produced no outcome." }],
                details: { error: "capture_failed", scopeSubject },
              };
            }
            if (outcome.status === "duplicate") {
              const existingEntry = outcome.existingId
                ? await db.getById(outcome.existingId).catch(() => null)
                : null;
              const existingText = existingEntry?.text;
              const duplicateIsSecret = sensitivity === "secret" || isSecretEntry(existingEntry);
              return {
                content: [
                  {
                    type: "text",
                    text: duplicateIsSecret
                      ? "Similar secret memory already exists."
                      : existingText
                        ? `Similar memory already exists: "${existingText}"`
                        : "Similar memory already exists.",
                  },
                ],
                details: {
                  action: "duplicate",
                  existingId: outcome.existingId,
                  existingText: duplicateIsSecret ? undefined : existingText,
                  reason: outcome.reason,
                  scopeSubject,
                },
              };
            }
            if (outcome.status !== "created" || !outcome.id) {
              return {
                content: [
                  {
                    type: "text",
                    text:
                      outcome.reason && outcome.reason.length > 0
                        ? `Memory was not stored: ${outcome.reason}`
                        : "Memory was not stored.",
                  },
                ],
                details: {
                  action: outcome.status,
                  reason: outcome.reason,
                  scopeSubject,
                },
              };
            }

            return {
              content: [
                {
                  type: "text",
                  text:
                    sensitivity === "secret"
                      ? "Stored secret memory."
                      : `Stored: "${fallbackText.slice(0, 100)}..."`,
                },
              ],
              details: {
                action: "created",
                id: outcome.id,
                category: inferredCategory,
                scopeSubject,
              },
            };
          },
        };
      },
      { name: "memory_store" },
    );

    api.registerTool(
      (ctx) => {
        const scopeSubject = resolveScopeSubject(ctx);
        return {
          name: "memory_forget",
          label: "Memory Forget",
          description: "Delete specific memories within the current agent scope.",
          parameters: Type.Object(
            {
              query: Type.Optional(Type.String({ description: "Search to find memory" })),
              memoryId: Type.Optional(Type.String({ description: "Specific memory ID" })),
            },
            { additionalProperties: false },
          ),
          async execute(_toolCallId, params) {
            if (!scopeSubject) {
              return scopeErrorResult();
            }
            await ensureMcpRuntimeDirs();
            const { query, memoryId } = params as { query?: string; memoryId?: string };

            if (memoryId) {
              const requestedMemoryId = memoryId.trim();
              const allowLegacyUnscopedDelete = cfg.ops.schemaMode === "additive";
              let resolvedMemoryId = requestedMemoryId;
              let entry: MemoryEntry | null = null;

              if (FULL_MEMORY_ID_REGEX.test(requestedMemoryId)) {
                entry = await db.getById(requestedMemoryId).catch(() => null);
              } else if (MEMORY_ID_PREFIX_REGEX.test(requestedMemoryId)) {
                const matches = await db.findByIdPrefix(requestedMemoryId, scopeSubject, 6);
                if (matches.length === 0) {
                  return {
                    content: [
                      {
                        type: "text",
                        text: `Memory ID prefix ${requestedMemoryId} not found in scope.`,
                      },
                    ],
                    details: {
                      action: "not_found",
                      id: requestedMemoryId,
                      scopeSubject,
                    },
                  };
                }
                if (matches.length > 1) {
                  return {
                    content: [
                      {
                        type: "text",
                        text: `Memory ID prefix ${requestedMemoryId} matched ${matches.length} memories. Specify the full memoryId:\n${matches
                          .map(formatForgetCandidate)
                          .join("\n")}`,
                      },
                    ],
                    details: {
                      action: "ambiguous",
                      id: requestedMemoryId,
                      candidates: matches.map((match) => ({
                        id: match.id,
                        text: isSecretEntry(match) ? "[secret redacted]" : match.text,
                        category: match.category,
                        type: match.type,
                      })),
                      scopeSubject,
                    },
                  };
                }
                entry = matches[0] ?? null;
                resolvedMemoryId = entry?.id ?? requestedMemoryId;
              }

              if (
                !entry ||
                !isEntryDeletableInScope(entry, scopeSubject, allowLegacyUnscopedDelete)
              ) {
                return {
                  content: [
                    { type: "text", text: `Memory ${requestedMemoryId} not found in scope.` },
                  ],
                  details: {
                    action: "not_found",
                    id: requestedMemoryId,
                    scopeSubject,
                    reason:
                      entry && !readEntryScopeSubject(entry) && !allowLegacyUnscopedDelete
                        ? "legacy_unscoped_delete_disallowed"
                        : undefined,
                  },
                };
              }

              const deleted = await deleteMemory(resolvedMemoryId);
              if (!deleted) {
                return {
                  content: [{ type: "text", text: `Memory ${resolvedMemoryId} not found.` }],
                  details: { action: "not_found", id: resolvedMemoryId, scopeSubject },
                };
              }
              await db
                .recordEvent({
                  scopeSubject,
                  actor: "memory_forget",
                  operation: "memory_forget",
                  status: "deleted",
                  memoryIds: [resolvedMemoryId],
                  summary: "Deleted memory by explicit ID.",
                })
                .catch((error) =>
                  api.logger.warn(
                    `memory-mongodb: failed to record memory_forget event: ${String(error)}`,
                  ),
                );
              return {
                content: [{ type: "text", text: `Memory ${resolvedMemoryId} forgotten.` }],
                details: { action: "deleted", id: resolvedMemoryId, scopeSubject },
              };
            }

            if (query) {
              const results = await searchMemories(query, scopeSubject, 5, 0.7);

              if (results.length === 0) {
                return {
                  content: [{ type: "text", text: "No matching memories found." }],
                  details: { found: 0, scopeSubject },
                };
              }

              if (results.length === 1 && results[0].score >= 0.95) {
                await deleteMemory(results[0].entry.id);
                await db
                  .recordEvent({
                    scopeSubject,
                    actor: "memory_forget",
                    operation: "memory_forget",
                    status: "deleted",
                    memoryIds: [results[0].entry.id],
                    summary: "Deleted memory by high-confidence query match.",
                  })
                  .catch((error) =>
                    api.logger.warn(
                      `memory-mongodb: failed to record memory_forget event: ${String(error)}`,
                    ),
                  );
                return {
                  content: [{ type: "text", text: `Forgotten: "${results[0].entry.text}"` }],
                  details: { action: "deleted", id: results[0].entry.id, scopeSubject },
                };
              }

              const list = results.map((result) => formatForgetCandidate(result.entry)).join("\n");

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
                details: { action: "candidates", candidates: sanitizedCandidates, scopeSubject },
              };
            }

            return {
              content: [{ type: "text", text: "Provide query or memoryId." }],
              details: { error: "missing_param" },
            };
          },
        };
      },
      { name: "memory_forget" },
    );

    api.registerTool(
      (ctx) => {
        const scopeSubject = resolveScopeSubject(ctx);
        return {
          name: "memory_capture",
          label: "Memory Capture",
          description:
            "Create durable, deduplicated memory records with typed metadata and multimodal manifests.",
          parameters: Type.Object(
            {
              entries: Type.Array(memoryCaptureEntrySchema, { minItems: 1 }),
              dedupeThreshold: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
              rejectSecrets: Type.Optional(
                Type.Boolean({
                  description:
                    'Deprecated compatibility field. Secret handling is controlled by `entries[].sensitivity`; use `sensitivity: "secret"` for intentional secret storage.',
                }),
              ),
            },
            { additionalProperties: false },
          ),
          async execute(_toolCallId, params) {
            if (!scopeSubject) {
              return scopeErrorResult();
            }
            await ensureMcpRuntimeDirs();
            const { entries, dedupeThreshold } = params as {
              entries: MemoryCaptureCandidate[];
              dedupeThreshold?: number;
            };

            const result = await opsService.capture({
              scopeSubject,
              entries,
              source: "memory_capture",
              dedupeThreshold,
            });

            return {
              content: [
                {
                  type: "text",
                  text: `Processed ${result.outcomes.length} capture entries.`,
                },
              ],
              details: {
                scopeSubject,
                outcomes: result.outcomes,
              },
            };
          },
        };
      },
      { name: "memory_capture" },
    );

    api.registerTool(
      (ctx) => {
        const scopeSubject = resolveScopeSubject(ctx);
        return {
          name: "memory_ingest_document",
          label: "Memory Ingest Document",
          description:
            "Extract a local document into manifest, summary, chunk, and table memory candidates, " +
            "then store through memory_capture-compatible memory-ops paths and verify recall.",
          parameters: Type.Object(
            {
              filePath: Type.String(),
              filename: Type.Optional(Type.String()),
              mimeType: Type.Optional(Type.String()),
              title: Type.Optional(Type.String()),
              mode: Type.Optional(
                stringEnum([
                  "manifest_only",
                  "summary",
                  "chunks",
                  "summary_and_chunks",
                ] as const),
              ),
              tags: Type.Optional(Type.Array(Type.String())),
              sourceMessageIds: Type.Optional(Type.Array(Type.String())),
              maxCharsPerChunk: Type.Optional(Type.Number({ minimum: 1 })),
              maxChunks: Type.Optional(Type.Number({ minimum: 1 })),
              enableOcr: Type.Optional(Type.Boolean()),
              enableTables: Type.Optional(Type.Boolean()),
              dryRun: Type.Optional(Type.Boolean()),
            },
            { additionalProperties: false },
          ),
          async execute(_toolCallId, params) {
            if (!scopeSubject) {
              return scopeErrorResult();
            }
            await ensureMcpRuntimeDirs();
            const result = await ingestDocumentToMemory({
              ...(params as {
                filePath: string;
                filename?: string;
                mimeType?: string;
                title?: string;
                mode?: "manifest_only" | "summary" | "chunks" | "summary_and_chunks";
                tags?: string[];
                sourceMessageIds?: string[];
                maxCharsPerChunk?: number;
                maxChunks?: number;
                enableOcr?: boolean;
                enableTables?: boolean;
                dryRun?: boolean;
              }),
              scopeSubject,
              opsService,
            }).catch((error) => ({
              ok: false as const,
              error: {
                code: "memory_capture_failed",
                message: error instanceof Error ? error.message : String(error),
              },
              warnings: [],
            }));
            return {
              content: [
                {
                  type: "text",
                  text: result.ok
                    ? `Document ingest ${result.document.filename}: ${result.document.chunkCount} chunk(s).`
                    : `Document ingest failed: ${result.error.code}`,
                },
              ],
              details: { scopeSubject, ...result },
            };
          },
        };
      },
      { name: "memory_ingest_document" },
    );

    api.registerTool(
      (ctx) => {
        const scopeSubject = resolveScopeSubject(ctx);
        return {
          name: "memory_hygiene",
          label: "Memory Hygiene",
          description:
            "Plan or apply safe memory hygiene actions (dedupe, stale prune, conflict review, preference promotion).",
          parameters: Type.Object(
            {
              mode: stringEnum(["plan", "apply"] as const),
              strategies: Type.Optional(
                Type.Array(
                  stringEnum(["dedupe", "stale-prune", "promote", "conflict-review"] as const),
                ),
              ),
              maxCandidates: Type.Optional(Type.Number({ minimum: 1 })),
              planId: Type.Optional(Type.String()),
              planHash: Type.Optional(Type.String()),
              approvedActionIds: Type.Optional(Type.Array(Type.String())),
            },
            { additionalProperties: false },
          ),
          async execute(_toolCallId, params) {
            if (!scopeSubject) {
              return scopeErrorResult();
            }
            await ensureMcpRuntimeDirs();
            const { mode, strategies, maxCandidates, planId, planHash, approvedActionIds } =
              params as {
                mode: "plan" | "apply";
                strategies?: MemoryHygieneStrategy[];
                maxCandidates?: number;
                planId?: string;
                planHash?: string;
                approvedActionIds?: string[];
              };

            const result = await opsService.memoryHygiene({
              mode,
              scopeSubject,
              strategies,
              maxCandidates,
              planId,
              planHash,
              approvedActionIds,
            });

            return {
              content: [
                {
                  type: "text",
                  text:
                    mode === "plan"
                      ? formatMemoryHygienePlan(result.plan)
                      : formatMemoryHygieneApply(result),
                },
              ],
              details: {
                scopeSubject,
                ...result,
              },
            };
          },
        };
      },
      { name: "memory_hygiene" },
    );

    api.registerTool(
      (ctx) => {
        const scopeSubject = resolveScopeSubject(ctx);
        return {
          name: "commitment_tracker",
          label: "Commitment Tracker",
          description:
            "Capture, list, resolve, or cancel commitments with durable status metadata. Secret commitments remain hidden from list/resolve/cancel flows and can only be removed with memory_forget.",
          parameters: Type.Object(
            {
              mode: stringEnum(["capture", "list_open", "resolve", "cancel"] as const),
              text: Type.Optional(Type.String()),
              owner: Type.Optional(Type.String()),
              dueAt: Type.Optional(Type.Number()),
              followUpAt: Type.Optional(Type.Number()),
              priority: Type.Optional(stringEnum(["low", "medium", "high"] as const)),
              commitmentId: Type.Optional(Type.String()),
              note: Type.Optional(Type.String()),
            },
            { additionalProperties: false },
          ),
          async execute(_toolCallId, params) {
            if (!scopeSubject) {
              return scopeErrorResult();
            }
            await ensureMcpRuntimeDirs();
            const result = await opsService.commitmentTracker({
              ...(params as {
                mode: CommitmentTrackerMode;
                text?: string;
                owner?: string;
                dueAt?: number;
                followUpAt?: number;
                priority?: "low" | "medium" | "high";
                commitmentId?: string;
                note?: string;
              }),
              scopeSubject,
            });
            return {
              content: [
                {
                  type: "text",
                  text: `commitment_tracker mode ${(params as { mode: string }).mode} completed.`,
                },
              ],
              details: {
                scopeSubject,
                ...result,
              },
            };
          },
        };
      },
      { name: "commitment_tracker" },
    );

    api.registerTool(
      (ctx) => {
        const scopeSubject = resolveScopeSubject(ctx);
        return {
          name: "preference_miner",
          label: "Preference Miner",
          description:
            "Observe preference evidence and promote stable preferences when evidence is repeated and consistent.",
          parameters: Type.Object(
            {
              mode: stringEnum(["observe", "plan_promotions", "apply_promotions", "list"] as const),
              key: Type.Optional(Type.String()),
              value: Type.Optional(Type.String()),
              confidence: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
            },
            { additionalProperties: false },
          ),
          async execute(_toolCallId, params) {
            if (!scopeSubject) {
              return scopeErrorResult();
            }
            await ensureMcpRuntimeDirs();
            const result = await opsService.preferenceMiner({
              ...(params as {
                mode: PreferenceMinerMode;
                key?: string;
                value?: string;
                confidence?: number;
              }),
              scopeSubject,
            });
            return {
              content: [
                {
                  type: "text",
                  text: `preference_miner mode ${(params as { mode: string }).mode} completed.`,
                },
              ],
              details: {
                scopeSubject,
                ...result,
              },
            };
          },
        };
      },
      { name: "preference_miner" },
    );

    api.registerTool(
      (ctx) => {
        const scopeSubject = resolveScopeSubject(ctx);
        return {
          name: "memory_audit",
          label: "Memory Audit",
          description:
            "Store and recall a throwaway probe token to validate memory reliability, then clean up.",
          parameters: Type.Object(
            {
              runId: Type.Optional(Type.String()),
              cleanupOnSuccess: Type.Optional(Type.Boolean()),
            },
            { additionalProperties: false },
          ),
          async execute(_toolCallId, params) {
            if (!scopeSubject) {
              return scopeErrorResult();
            }
            await ensureMcpRuntimeDirs();
            const result = await opsService.memoryAudit({
              scopeSubject,
              runId: (params as { runId?: string }).runId,
              cleanupOnSuccess: (params as { cleanupOnSuccess?: boolean }).cleanupOnSuccess,
            });
            return {
              content: [
                {
                  type: "text",
                  text: result.pass ? "Memory audit passed." : "Memory audit failed.",
                },
              ],
              details: {
                scopeSubject,
                ...result,
              },
            };
          },
        };
      },
      { name: "memory_audit" },
    );
    api.registerCli(
      ({ program }) => {
        const runCliAction = async (action: () => Promise<void>): Promise<void> => {
          try {
            await action();
          } finally {
            await db.close().catch((error) => {
              api.logger.warn?.(`memory-mongodb: failed to close CLI MCP client: ${String(error)}`);
            });
          }
        };

        const findCommand = (name: string) =>
          program.commands.find((command) => command.name() === name);
        const memory =
          findCommand("ltm") ??
          program.command("ltm").description("MongoDB MCP memory plugin commands");
        const memoryRoot =
          findCommand("memory") ??
          program.command("memory").description("Self-administering DAISy memory commands");

        memory
          .command("list")
          .description("List memories")
          .action(async () => {
            await runCliAction(async () => {
              const count = await countMemories();
              console.log(`Total memories: ${count}`);
            });
          });

        memory
          .command("search")
          .description("Search memories")
          .argument("<query>", "Search query")
          .option("--limit <n>", "Max results", "5")
          .action(async (query, opts) => {
            await runCliAction(async () => {
              await ensureMcpRuntimeDirs();
              const rawLimit = typeof opts.limit === "string" ? opts.limit.trim() : "";
              const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : 5;
              const limit = clampPositiveInt(parsedLimit, 5, cfg.retrieval.vectorLimit);
              const results = await db.searchByQuery(query, limit, 0.3);
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
          });

        memory
          .command("backfill-ops")
          .description("Backfill metadata.ops and top-level routing fields on legacy memories")
          .option("--dry-run", "Scan and report records without mutating memory data")
          .option("--apply", "Apply the backfill and append a memory_events summary")
          .option(
            "--scope <scope>",
            "Default scopeSubject for ambiguous legacy records",
            "agent:daisy",
          )
          .option("--batch-size <n>", "Records to process per MCP batch", "50")
          .option("--limit <n>", "Maximum records to scan")
          .action(async (opts) => {
            await runCliAction(async () => {
              if (opts.dryRun === true && opts.apply === true) {
                throw new Error("ltm backfill-ops accepts either --dry-run or --apply, not both");
              }
              if (opts.dryRun !== true && opts.apply !== true) {
                throw new Error("ltm backfill-ops requires --dry-run unless --apply is supplied");
              }

              await ensureMcpRuntimeDirs();
              const batchSize = clampPositiveInt(Number.parseInt(opts.batchSize, 10), 50, 200);
              const limit =
                typeof opts.limit === "string"
                  ? clampPositiveInt(Number.parseInt(opts.limit, 10), batchSize, 10_000)
                  : undefined;
              const result = await db.backfillOps({
                dryRun: opts.apply !== true,
                scopeSubject: opts.scope,
                batchSize,
                limit,
              });
              console.log(JSON.stringify(result, null, 2));
            });
          });

        memory
          .command("stats")
          .description("Show memory statistics")
          .action(async () => {
            await runCliAction(async () => {
              const count = await countMemories();
              console.log(`Total memories: ${count}`);
            });
          });

        const existingAutonomy = memoryRoot.commands.find(
          (command) => command.name() === "autonomy",
        );
        const autonomy =
          existingAutonomy ??
          memoryRoot
            .command("autonomy")
            .description("Autonomous scoring, dedupe, and compaction controls");

        if (!existingAutonomy) {
          autonomy
            .command("status")
            .description("Show memory autonomy policy and backfill version")
            .action(async () => {
              await runCliAction(async () => {
                console.log(JSON.stringify(autonomyService.status(), null, 2));
              });
            });

          autonomy
            .command("backfill-scores")
            .description("Initialize usefulness metadata on existing memory records")
            .option("--dry-run", "Report planned changes without writing records")
            .option("--scope <scope>", "Memory scope to scan", "agent:daisy")
            .option("--limit <n>", "Maximum records to scan", "100")
            .option("--resume-after <id>", "Resume after a memory ID")
            .action(async (opts) => {
              await runCliAction(async () => {
                await ensureMcpRuntimeDirs();
                const result = await autonomyService.backfillScores({
                  dryRun: opts.dryRun === true,
                  scopeSubject: opts.scope,
                  limit: clampPositiveInt(Number.parseInt(opts.limit, 10), 100, 500),
                  resumeAfter: typeof opts.resumeAfter === "string" ? opts.resumeAfter : undefined,
                });
                console.log(JSON.stringify(result, null, 2));
              });
            });

          autonomy
            .command("score")
            .description("Recompute usefulness scores for a scope")
            .requiredOption("--scope <scope>", "Memory scope to score")
            .option("--agent <agent-id>", "Agent-specific usefulness key")
            .option("--dry-run", "Report planned changes without writing records")
            .option("--limit <n>", "Maximum records to scan", "100")
            .action(async (opts) => {
              await runCliAction(async () => {
                await ensureMcpRuntimeDirs();
                const result = await autonomyService.score({
                  dryRun: opts.dryRun === true,
                  scopeSubject: opts.scope,
                  agentId: typeof opts.agent === "string" ? opts.agent : undefined,
                  limit: clampPositiveInt(Number.parseInt(opts.limit, 10), 100, 500),
                });
                console.log(JSON.stringify(result, null, 2));
              });
            });

          autonomy
            .command("explain")
            .description("Explain usefulness, dedupe, and compaction metadata for a memory")
            .requiredOption("--memory-id <id>", "Memory ID")
            .option("--agent <agent-id>", "Agent-specific usefulness key")
            .action(async (opts) => {
              await runCliAction(async () => {
                await ensureMcpRuntimeDirs();
                const result = await autonomyService.explain(
                  opts.memoryId,
                  typeof opts.agent === "string" ? opts.agent : undefined,
                );
                console.log(JSON.stringify(result, null, 2));
              });
            });

          autonomy
            .command("dedupe")
            .description("Mark duplicate memories and demote duplicate recall precedence")
            .requiredOption("--scope <scope>", "Memory scope to scan")
            .option("--dry-run", "Report planned changes without writing records")
            .option("--limit <n>", "Maximum records to scan", "100")
            .action(async (opts) => {
              await runCliAction(async () => {
                await ensureMcpRuntimeDirs();
                const result = await autonomyService.dedupe({
                  dryRun: opts.dryRun === true,
                  scopeSubject: opts.scope,
                  limit: clampPositiveInt(Number.parseInt(opts.limit, 10), 100, 500),
                });
                console.log(JSON.stringify(result, null, 2));
              });
            });

          autonomy
            .command("compact")
            .description("Compact stale low-usefulness memories into a summary record")
            .requiredOption("--scope <scope>", "Memory scope to scan")
            .option("--dry-run", "Report planned changes without writing records")
            .option("--limit <n>", "Maximum records to scan", "100")
            .action(async (opts) => {
              await runCliAction(async () => {
                await ensureMcpRuntimeDirs();
                const result = await autonomyService.compact({
                  dryRun: opts.dryRun === true,
                  scopeSubject: opts.scope,
                  limit: clampPositiveInt(Number.parseInt(opts.limit, 10), 100, 500),
                });
                console.log(JSON.stringify(result, null, 2));
              });
            });
        }
      },
      { commands: ["ltm", "memory"] },
    );

    if (cfg.autoRecall) {
      api.on("before_agent_start", async (event, ctx) => {
        if (!event.prompt || event.prompt.length < 5) {
          return;
        }
        const scopeSubject = resolveScopeSubjectFromHook(event, ctx);
        if (!scopeSubject) {
          api.logger.warn("memory-mongodb: auto-recall skipped due to missing scope");
          return;
        }

        try {
          const results = await searchMemories(event.prompt, scopeSubject, 3, 0.3);
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

    if (cfg.autoCapture && cfg.ops.autonomy?.autoCapture !== false) {
      api.on("agent_end", async (event, ctx) => {
        if (!event.success || !event.messages || event.messages.length === 0) {
          return;
        }
        const scopeSubject = resolveScopeSubjectFromHook(event, ctx);
        if (!scopeSubject) {
          api.logger.warn("memory-mongodb: auto-capture skipped due to missing scope");
          return;
        }

        try {
          await ensureMcpRuntimeDirs();
          const textItems: Array<{ text: string; sourceMessageId?: string }> = [];

          for (const message of event.messages) {
            if (!message || typeof message !== "object") {
              continue;
            }
            const messageRecord = message as Record<string, unknown>;
            const role = messageRecord.role;
            if (role !== "user") {
              continue;
            }
            const sourceMessageId =
              typeof messageRecord.id === "string" && messageRecord.id.trim().length > 0
                ? messageRecord.id
                : undefined;

            const content = messageRecord.content;
            if (typeof content === "string") {
              textItems.push({ text: content, sourceMessageId });
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
                  textItems.push({
                    text: (block as Record<string, unknown>).text as string,
                    sourceMessageId,
                  });
                }
              }
            }
          }

          const toCapture = textItems.filter((item) => shouldCapture(item.text, triggers));
          if (toCapture.length === 0) {
            return;
          }
          const preferenceItems: Array<{ text: string; sourceMessageId?: string }> = [];
          const entries: MemoryCaptureCandidate[] = [];
          for (const item of toCapture.slice(0, 3)) {
            const category = detectCategory(item.text);
            if (category === "preference") {
              preferenceItems.push(item);
              continue;
            }
            if (category !== "fact" && category !== "decision") {
              continue;
            }
            entries.push({
              text: item.text,
              kind: category === "fact" ? "fact" : "decision",
              importance: 0.7,
              category,
              subCategory: detectSubCategory(item.text),
              confidence: 0.8,
              sourceMessageIds: item.sourceMessageId ? [item.sourceMessageId] : undefined,
              observedAt: Date.now(),
            });
          }
          for (const item of preferenceItems) {
            await opsService.preferenceMiner({
              mode: "observe",
              scopeSubject,
              key: deriveAutoPreferenceKey(item.text),
              value: item.text,
              confidence: 0.75,
            });
          }
          if (entries.length === 0) {
            return;
          }
          const result = await opsService.capture({
            scopeSubject,
            entries,
            source: "auto_capture",
          });
          const created = result.outcomes.filter((item) => item.status === "created").length;
          if (created > 0) {
            const memoryIds = result.outcomes
              .map((item) => item.id)
              .filter((id): id is string => typeof id === "string");
            await db.recordEvent({
              scopeSubject,
              actor: "memory_autonomy",
              operation: "memory_auto_capture",
              status: "applied",
              memoryIds,
              summary: `Autonomously captured ${created} ordinary memory record(s).`,
              details: { source: "agent_end", created },
            });
            if (cfg.ops.autonomy?.autoScore !== false) {
              await autonomyService.score({
                dryRun: false,
                scopeSubject,
                limit: Math.max(created, 10),
              });
            }
            api.logger.info(`memory-mongodb: auto-captured ${created} memories`);
          }
        } catch (error) {
          api.logger.warn(`memory-mongodb: capture failed: ${String(error)}`);
        }
      });
    }

    api.registerService({
      id: "memory-mongodb",
      required: true,
      start: async (ctx) => {
        try {
          await countMemories(ctx.stateDir);
        } catch (error) {
          await db.close().catch(() => undefined);
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(`memory-mongodb startup readiness check failed: ${reason}`, {
            cause: error,
          });
        }

        api.logger.info(
          `memory-mongodb: initialized (db: ${cfg.database.name}/${cfg.database.collection}, embeddingModel: ${cfg.gemini.embeddingModel})`,
        );
      },
      stop: async () => {
        runtimeDirs = null;
        runtimeDirsPromise = null;
        await db.close();
        api.logger.info("memory-mongodb: stopped");
      },
    });
  },
};

export default memoryPlugin;
export { compileTriggers, detectCategory, shouldCapture };
