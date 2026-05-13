import { createHash, randomUUID } from "node:crypto";
import type { MemoryCategory } from "./config.js";
import type { GeminiService } from "./gemini-service.js";
import type { McpClientService } from "./mcp-client-service.js";
import { MEMORY_OPS_KINDS } from "./memory-ops-types.js";
import { multimodalPartsToFallbackText, type MultimodalPart } from "./payload-chunker.js";

export type MemoryType =
  | "working"
  | "cache"
  | "episodic"
  | "semantic"
  | "procedural"
  | "associative";

export type MemoryEntry = {
  id: string;
  text: string;
  vector: number[];
  importance: number;
  category: MemoryCategory;
  subCategory?: string;
  type: MemoryType;
  tenantId?: string;
  workspaceId?: string;
  scopeSubject?: string;
  subjectType?: string;
  visibility?: MemoryVisibility;
  kind?: string;
  status?: string;
  sensitivity?: MemorySensitivity;
  modalities?: string[];
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
};

export type MemoryStoreInput = Omit<
  MemoryEntry,
  "id" | "createdAt" | "updatedAt" | "vector" | "text"
> & {
  text?: string;
  parts: MultimodalPart[];
};

export type MemorySearchResult = {
  entry: MemoryEntry;
  score: number;
  vectorScore: number;
};

export type MemoryQueryFilters = {
  scopeSubject?: string;
  visibility?: MemoryVisibility;
  kinds?: string[];
  modalities?: string[];
  openCommitmentsOnly?: boolean;
  preferencesOnly?: boolean;
  includeSecrets?: boolean;
};

export type MemoryRoutingOptions = {
  tenantId: string;
  workspaceId: string;
  defaultVisibility: MemoryVisibility;
  vectorIndexNameV2: string;
  legacyFallback: boolean;
};

export type MemoryVisibility = "private" | "workspace" | "project";
export type MemorySensitivity = "normal" | "secret";

export type RetrievalOptions = {
  minScore: number;
  vectorLimit: number;
  numCandidatesMultiplier: number;
};

type Logger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string) => void;
};

type MemoryDocument = {
  _id: string;
  text: string;
  vector: number[];
  importance: number;
  category: MemoryCategory;
  subCategory?: string;
  type: MemoryType;
  tenantId?: string;
  workspaceId?: string;
  scopeSubject?: string;
  subjectType?: string;
  visibility?: MemoryVisibility;
  kind?: string;
  status?: string;
  sensitivity?: MemorySensitivity;
  modalities?: string[];
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  score?: number;
};

type MemoryEventDocument = {
  _id: string;
  tenantId: string;
  workspaceId: string;
  scopeSubject: string;
  subjectType: string;
  actor: string;
  operation: string;
  status: string;
  memoryIds?: string[];
  summary?: string;
  details?: Record<string, unknown>;
  createdAt: number;
};

export type MemoryEventInput = {
  scopeSubject: string;
  actor: string;
  operation: string;
  status: string;
  memoryIds?: string[];
  summary?: string;
  details?: Record<string, unknown>;
};

export type MemoryOpsBackfillOptions = {
  dryRun: boolean;
  scopeSubject: string;
  batchSize?: number;
  limit?: number;
};

export type MemoryOpsBackfillResult = {
  dryRun: boolean;
  scopeSubject: string;
  tenantId: string;
  workspaceId: string;
  scanned: number;
  eligible: number;
  updated: number;
  skipped: number;
  failed: number;
  sampleIds: string[];
  errors: string[];
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MongoMemoryDB {
  constructor(
    private readonly mcp: McpClientService,
    private readonly gemini: GeminiService,
    private readonly databaseName: string,
    private readonly collectionName: string,
    private readonly eventCollectionName: string,
    private readonly vectorSearchIndexName: string,
    private readonly routing: MemoryRoutingOptions,
    private readonly retrieval: RetrievalOptions,
    private readonly logger?: Logger,
  ) {}

  async store(entry: MemoryStoreInput): Promise<MemoryEntry> {
    if (!Array.isArray(entry.parts) || entry.parts.length === 0) {
      throw new Error("Memory store requires at least one multimodal part");
    }

    const fallbackText =
      typeof entry.text === "string" && entry.text.trim().length > 0
        ? entry.text.trim()
        : multimodalPartsToFallbackText(entry.parts, 2_000);

    const vector = await this.gemini.embed(entry.parts);

    const now = Date.now();
    const record: MemoryEntry = {
      id: randomUUID(),
      text: fallbackText,
      vector,
      importance: entry.importance,
      category: entry.category,
      subCategory: entry.subCategory,
      type: entry.type,
      metadata: entry.metadata,
      tags: entry.tags,
      createdAt: now,
      updatedAt: now,
    };
    Object.assign(record, this.resolveRoutingFields(record));

    const document = this.entryToDocument(record);
    await this.mcp.insertMany(this.databaseName, this.collectionName, [document]);

    return record;
  }

  async searchByQuery(
    query: string,
    limit = 5,
    minScore = this.retrieval.minScore,
    filters?: MemoryQueryFilters,
  ): Promise<MemorySearchResult[]> {
    const vector = await this.gemini.embed([{ text: query }]);
    return this.searchByVector(vector, limit, minScore, filters);
  }

  async searchByVector(
    vector: number[],
    limit = 5,
    minScore = this.retrieval.minScore,
    filters?: MemoryQueryFilters,
  ): Promise<MemorySearchResult[]> {
    const boundedLimit = Math.max(1, Math.min(limit, this.retrieval.vectorLimit));
    const numCandidates = Math.max(
      boundedLimit,
      boundedLimit * Math.max(1, this.retrieval.numCandidatesMultiplier),
    );
    const results: MemorySearchResult[] = [];
    const seen = new Set<string>();

    try {
      const pushdownResults = await this.aggregateVectorSearch(
        this.routing.vectorIndexNameV2,
        vector,
        numCandidates,
        minScore,
        filters,
        this.buildVectorFilter(filters),
      );
      appendUniqueResults(results, seen, pushdownResults);
    } catch (error) {
      if (!this.routing.legacyFallback) {
        throw error;
      }
      this.logger?.warn?.(
        `memory-mongodb: v2 vector search failed; falling back to legacy post-filtered search: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (this.routing.legacyFallback && results.length < boundedLimit) {
      const legacyResults = await this.aggregateVectorSearch(
        this.vectorSearchIndexName,
        vector,
        numCandidates,
        minScore,
        filters,
      );
      appendUniqueResults(results, seen, legacyResults);
    }

    return results.slice(0, boundedLimit);
  }

  private async aggregateVectorSearch(
    indexName: string,
    vector: number[],
    numCandidates: number,
    minScore: number,
    filters: MemoryQueryFilters | undefined,
    vectorFilter?: Record<string, unknown>,
  ): Promise<MemorySearchResult[]> {
    const vectorSearch: Record<string, unknown> = {
      index: indexName,
      path: "vector",
      queryVector: vector,
      numCandidates,
      limit: numCandidates,
    };
    if (vectorFilter && Object.keys(vectorFilter).length > 0) {
      vectorSearch.filter = vectorFilter;
    }

    const pipeline = [
      {
        $vectorSearch: vectorSearch,
      },
      {
        $project: {
          _id: 1,
          text: 1,
          vector: 1,
          importance: 1,
          category: 1,
          subCategory: 1,
          type: 1,
          tenantId: 1,
          workspaceId: 1,
          scopeSubject: 1,
          subjectType: 1,
          visibility: 1,
          kind: 1,
          status: 1,
          sensitivity: 1,
          modalities: 1,
          metadata: 1,
          tags: 1,
          createdAt: 1,
          updatedAt: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const documents = await this.mcp.aggregate(this.databaseName, this.collectionName, pipeline);
    const results: MemorySearchResult[] = [];

    for (const document of documents) {
      const parsed = this.documentToEntry(document);
      if (!parsed) {
        this.logger?.warn?.(
          "memory-mongodb: skipped malformed memory document from aggregate response",
        );
        continue;
      }

      if (parsed.score < minScore) {
        continue;
      }
      if (!this.matchesRouting(parsed.entry, filters)) {
        continue;
      }
      if (!matchesFilters(parsed.entry, filters)) {
        continue;
      }

      results.push({
        entry: parsed.entry,
        score: parsed.score,
        vectorScore: parsed.score,
      });
    }

    return results;
  }

  async delete(id: string): Promise<boolean> {
    if (!UUID_REGEX.test(id)) {
      throw new Error(`Invalid memory ID format: ${id}`);
    }
    return this.mcp.deleteOne(this.databaseName, this.collectionName, { _id: id });
  }

  async count(): Promise<number> {
    return this.mcp.countDocuments(this.databaseName, this.collectionName);
  }

  async recordEvent(input: MemoryEventInput): Promise<MemoryEventDocument> {
    const now = Date.now();
    const subjectType = subjectTypeFromScope(input.scopeSubject);
    const event: MemoryEventDocument = {
      _id: randomUUID(),
      tenantId: this.routing.tenantId,
      workspaceId: this.routing.workspaceId,
      scopeSubject: input.scopeSubject,
      subjectType,
      actor: input.actor,
      operation: input.operation,
      status: input.status,
      memoryIds: input.memoryIds,
      summary: input.summary,
      details: input.details,
      createdAt: now,
    };
    await this.mcp.insertMany(this.databaseName, this.eventCollectionName, [event]);
    return event;
  }

  async patchMemoryOpsMetadata(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    if (!UUID_REGEX.test(id)) {
      throw new Error(`Invalid memory ID format: ${id}`);
    }
    const set: Record<string, unknown> = {
      updatedAt: Date.now(),
    };
    for (const [key, value] of Object.entries(patch)) {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
        throw new Error(`Invalid metadata.ops patch key: ${key}`);
      }
      set[`metadata.ops.${key}`] = value;
    }
    return this.mcp.updateMany(
      this.databaseName,
      this.collectionName,
      {
        _id: id,
        tenantId: this.routing.tenantId,
        workspaceId: this.routing.workspaceId,
      },
      {
        $set: set,
      },
    );
  }

  async backfillOps(options: MemoryOpsBackfillOptions): Promise<MemoryOpsBackfillResult> {
    const scopeSubject = readString(options.scopeSubject) ?? "agent:daisy";
    const batchSize = clampInteger(options.batchSize, 50, 1, 200);
    const limit =
      options.limit === undefined ? undefined : clampInteger(options.limit, 0, 0, 10_000);
    const result: MemoryOpsBackfillResult = {
      dryRun: options.dryRun,
      scopeSubject,
      tenantId: this.routing.tenantId,
      workspaceId: this.routing.workspaceId,
      scanned: 0,
      eligible: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      sampleIds: [],
      errors: [],
    };

    const excludedIds: unknown[] = [];
    while (limit === undefined || result.scanned < limit) {
      const remaining =
        limit === undefined ? batchSize : Math.min(batchSize, limit - result.scanned);
      if (remaining <= 0) {
        break;
      }

      const match: Record<string, unknown> = {
        "metadata.ops": { $exists: false },
      };
      if (excludedIds.length > 0) {
        match._id = { $nin: excludedIds };
      }

      const pipeline: Array<Record<string, unknown>> = [
        {
          $match: match,
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
      ];
      if (options.dryRun && result.scanned > 0) {
        pipeline.push({
          $skip: result.scanned,
        });
      }
      pipeline.push(
        {
          $limit: remaining,
        },
        {
          $project: {
            _id: 1,
            text: 1,
            category: 1,
            type: 1,
            tenantId: 1,
            workspaceId: 1,
            scopeSubject: 1,
            subjectType: 1,
            visibility: 1,
            kind: 1,
            status: 1,
            sensitivity: 1,
            modalities: 1,
            metadata: 1,
            tags: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      );

      const documents = await this.mcp.aggregate(this.databaseName, this.collectionName, pipeline);

      if (documents.length === 0) {
        break;
      }

      result.scanned += documents.length;
      for (const document of documents) {
        const patch = this.buildBackfillOpsPatch(document, scopeSubject);
        if (!patch) {
          result.skipped += 1;
          if (!options.dryRun && document._id !== undefined) {
            excludedIds.push(document._id);
          }
          continue;
        }

        result.eligible += 1;
        pushSampleId(result.sampleIds, patch.sampleId);

        if (options.dryRun) {
          continue;
        }

        try {
          const updateResult = await this.mcp.updateMany(
            this.databaseName,
            this.collectionName,
            {
              _id: patch.id,
              "metadata.ops": { $exists: false },
            },
            {
              $set: patch.set,
            },
          );
          if (updateResult.modifiedCount > 0) {
            result.updated += updateResult.modifiedCount;
          } else {
            result.skipped += 1;
            excludedIds.push(patch.id);
          }
        } catch (error) {
          result.failed += 1;
          excludedIds.push(patch.id);
          pushError(result.errors, `record ${patch.sampleId}: ${formatUnknownError(error)}`);
        }
      }

      if (documents.length < remaining) {
        break;
      }
    }

    if (!options.dryRun) {
      try {
        await this.recordEvent({
          scopeSubject,
          actor: "memory-mongodb-cli",
          operation: "backfill_ops",
          status: result.failed > 0 ? "partial" : "applied",
          memoryIds: result.sampleIds,
          summary: `Backfilled metadata.ops for ${result.updated} legacy memory record(s).`,
          details: {
            scanned: result.scanned,
            eligible: result.eligible,
            updated: result.updated,
            skipped: result.skipped,
            failed: result.failed,
            dryRun: result.dryRun,
            tenantId: result.tenantId,
            workspaceId: result.workspaceId,
          },
        });
      } catch (error) {
        pushError(result.errors, `memory_events: ${formatUnknownError(error)}`);
      }
    }

    return result;
  }

  async getById(id: string): Promise<MemoryEntry | null> {
    if (!UUID_REGEX.test(id)) {
      throw new Error(`Invalid memory ID format: ${id}`);
    }

    const documents = await this.mcp.aggregate(this.databaseName, this.collectionName, [
      {
        $match: {
          _id: id,
        },
      },
      {
        $limit: 1,
      },
      {
        $project: {
          _id: 1,
          text: 1,
          vector: 1,
          importance: 1,
          category: 1,
          subCategory: 1,
          type: 1,
          tenantId: 1,
          workspaceId: 1,
          scopeSubject: 1,
          subjectType: 1,
          visibility: 1,
          kind: 1,
          status: 1,
          sensitivity: 1,
          modalities: 1,
          metadata: 1,
          tags: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    const first = documents[0];
    if (!first) {
      return null;
    }

    const parsed = this.documentToEntry(first);
    return parsed?.entry ?? null;
  }

  async findByIdPrefix(prefix: string, scopeSubject: string, limit = 10): Promise<MemoryEntry[]> {
    const normalizedPrefix = prefix.trim();
    if (!/^[0-9a-f-]{8,35}$/i.test(normalizedPrefix)) {
      throw new Error(`Invalid memory ID prefix format: ${prefix}`);
    }
    if (!scopeSubject.trim()) {
      throw new Error("scopeSubject required");
    }
    const boundedLimit = Math.max(1, Math.min(limit, 25));

    const documents = await this.mcp.aggregate(this.databaseName, this.collectionName, [
      {
        $match: {
          $and: [
            {
              _id: {
                $regex: `^${escapeRegex(normalizedPrefix)}`,
                $options: "i",
              },
            },
            this.buildScopeMatch(scopeSubject),
          ],
        },
      },
      {
        $sort: {
          updatedAt: -1,
        },
      },
      {
        $limit: boundedLimit,
      },
      {
        $project: {
          _id: 1,
          text: 1,
          vector: 1,
          importance: 1,
          category: 1,
          subCategory: 1,
          type: 1,
          tenantId: 1,
          workspaceId: 1,
          scopeSubject: 1,
          subjectType: 1,
          visibility: 1,
          kind: 1,
          status: 1,
          sensitivity: 1,
          modalities: 1,
          metadata: 1,
          tags: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    const entries: MemoryEntry[] = [];
    for (const document of documents) {
      const parsed = this.documentToEntry(document);
      if (!parsed?.entry) {
        continue;
      }
      if (!matchesFilters(parsed.entry, { scopeSubject, includeSecrets: true })) {
        continue;
      }
      entries.push(parsed.entry);
    }
    return entries;
  }

  async listByScope(
    scopeSubject: string,
    limit = 50,
    options: { includeSecrets?: boolean } = {},
  ): Promise<MemoryEntry[]> {
    if (!scopeSubject.trim()) {
      throw new Error("scopeSubject required");
    }
    const boundedLimit = Math.max(1, Math.min(limit, 200));

    const fetchLimit =
      options.includeSecrets === true ? boundedLimit : Math.min(boundedLimit * 5, 200);

    const documents = await this.mcp.aggregate(this.databaseName, this.collectionName, [
      {
        $match: this.buildScopeMatch(scopeSubject),
      },
      {
        $sort: {
          updatedAt: -1,
        },
      },
      {
        $limit: fetchLimit,
      },
      {
        $project: {
          _id: 1,
          text: 1,
          vector: 1,
          importance: 1,
          category: 1,
          subCategory: 1,
          type: 1,
          tenantId: 1,
          workspaceId: 1,
          scopeSubject: 1,
          subjectType: 1,
          visibility: 1,
          kind: 1,
          status: 1,
          sensitivity: 1,
          modalities: 1,
          metadata: 1,
          tags: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    const entries: MemoryEntry[] = [];
    for (const doc of documents) {
      const parsed = this.documentToEntry(doc);
      if (!parsed?.entry) {
        continue;
      }
      if (!matchesFilters(parsed.entry, { includeSecrets: options.includeSecrets })) {
        continue;
      }
      entries.push(parsed.entry);
    }
    return entries.slice(0, boundedLimit);
  }

  async close(): Promise<void> {
    await this.mcp.close();
  }

  private entryToDocument(entry: MemoryEntry): MemoryDocument {
    return {
      _id: entry.id,
      text: entry.text,
      vector: entry.vector,
      importance: entry.importance,
      category: entry.category,
      subCategory: entry.subCategory,
      type: entry.type,
      tenantId: entry.tenantId,
      workspaceId: entry.workspaceId,
      scopeSubject: entry.scopeSubject,
      subjectType: entry.subjectType,
      visibility: entry.visibility,
      kind: entry.kind,
      status: entry.status,
      sensitivity: entry.sensitivity,
      modalities: entry.modalities,
      metadata: entry.metadata,
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private documentToEntry(
    raw: Record<string, unknown>,
  ): { entry: MemoryEntry; score: number } | null {
    if (typeof raw._id !== "string") {
      return null;
    }
    if (typeof raw.text !== "string") {
      return null;
    }
    if (!Array.isArray(raw.vector) || !raw.vector.every((value) => typeof value === "number")) {
      return null;
    }

    const score = typeof raw.score === "number" ? raw.score : 0;

    const entry: MemoryEntry = {
      id: raw._id,
      text: raw.text,
      vector: raw.vector,
      importance: typeof raw.importance === "number" ? raw.importance : 0.7,
      category: isMemoryCategory(raw.category) ? raw.category : "other",
      subCategory: typeof raw.subCategory === "string" ? raw.subCategory : undefined,
      type: isMemoryType(raw.type) ? raw.type : "semantic",
      tenantId: typeof raw.tenantId === "string" ? raw.tenantId : undefined,
      workspaceId: typeof raw.workspaceId === "string" ? raw.workspaceId : undefined,
      scopeSubject: typeof raw.scopeSubject === "string" ? raw.scopeSubject : undefined,
      subjectType: typeof raw.subjectType === "string" ? raw.subjectType : undefined,
      visibility: isMemoryVisibility(raw.visibility) ? raw.visibility : undefined,
      kind: typeof raw.kind === "string" ? raw.kind : undefined,
      status: typeof raw.status === "string" ? raw.status : undefined,
      sensitivity: isMemorySensitivity(raw.sensitivity) ? raw.sensitivity : undefined,
      modalities: Array.isArray(raw.modalities)
        ? raw.modalities.filter((item): item is string => typeof item === "string")
        : undefined,
      metadata: isObject(raw.metadata) ? raw.metadata : undefined,
      tags: Array.isArray(raw.tags)
        ? raw.tags.filter((tag): tag is string => typeof tag === "string")
        : undefined,
      createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
      updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
    };

    return { entry, score };
  }

  private resolveRoutingFields(
    entry: MemoryEntry,
  ): Pick<
    MemoryEntry,
    | "tenantId"
    | "workspaceId"
    | "scopeSubject"
    | "subjectType"
    | "visibility"
    | "kind"
    | "status"
    | "sensitivity"
    | "modalities"
  > {
    const ops = extractOpsMetadata(entry);
    const scopeSubject = readString(ops?.scopeSubject) ?? entry.scopeSubject;
    return {
      tenantId: readString(ops?.tenantId) ?? entry.tenantId ?? this.routing.tenantId,
      workspaceId: readString(ops?.workspaceId) ?? entry.workspaceId ?? this.routing.workspaceId,
      scopeSubject,
      subjectType:
        readString(ops?.subjectType) ?? entry.subjectType ?? subjectTypeFromScope(scopeSubject),
      visibility:
        readVisibility(ops?.visibility) ?? entry.visibility ?? this.routing.defaultVisibility,
      kind: readString(ops?.kind) ?? entry.kind,
      status: readString(ops?.status) ?? entry.status,
      sensitivity: readSensitivity(ops?.sensitivity) ?? entry.sensitivity ?? "normal",
      modalities: extractEntryModalities(entry),
    };
  }

  private buildBackfillOpsPatch(
    raw: Record<string, unknown>,
    defaultScopeSubject: string,
  ): { id: unknown; sampleId: string; set: Record<string, unknown> } | null {
    if (raw._id === undefined || raw._id === null) {
      return null;
    }

    const metadata = isObject(raw.metadata) ? raw.metadata : undefined;
    if (isObject(metadata?.ops)) {
      return null;
    }

    const scopeSubject = readString(raw.scopeSubject) ?? defaultScopeSubject;
    const tenantId = readString(raw.tenantId) ?? this.routing.tenantId;
    const workspaceId = readString(raw.workspaceId) ?? this.routing.workspaceId;
    const subjectType = readString(raw.subjectType) ?? subjectTypeFromScope(scopeSubject);
    const visibility = readVisibility(raw.visibility) ?? "private";
    const sensitivity = readSensitivity(raw.sensitivity) ?? "normal";
    const kind = readBackfillKind(raw.kind) ?? inferBackfillKind(raw.category);
    const status = readString(raw.status) ?? inferBackfillStatus(kind);
    const modalities = readStringArray(raw.modalities) ?? ["text"];
    const text = typeof raw.text === "string" ? raw.text : "";
    const contentHash = createContentHash(text, extractAttachmentSummary(metadata));

    const ops = {
      tenantId,
      workspaceId,
      scopeSubject,
      subjectType,
      visibility,
      kind,
      status,
      sensitivity,
      modalities,
      confidence: 1,
      contentHash,
    };

    const set: Record<string, unknown> = {
      "metadata.ops": ops,
    };

    if (!metadata || readString(metadata.source) === undefined) {
      set["metadata.source"] = "legacy_backfill";
    }
    if (readString(raw.tenantId) === undefined) {
      set.tenantId = tenantId;
    }
    if (readString(raw.workspaceId) === undefined) {
      set.workspaceId = workspaceId;
    }
    if (readString(raw.scopeSubject) === undefined) {
      set.scopeSubject = scopeSubject;
    }
    if (readString(raw.subjectType) === undefined) {
      set.subjectType = subjectType;
    }
    if (readVisibility(raw.visibility) === undefined) {
      set.visibility = visibility;
    }
    if (readString(raw.kind) === undefined) {
      set.kind = kind;
    }
    if (readString(raw.status) === undefined) {
      set.status = status;
    }
    if (readSensitivity(raw.sensitivity) === undefined) {
      set.sensitivity = sensitivity;
    }
    if (readStringArray(raw.modalities) === undefined) {
      set.modalities = modalities;
    }

    return {
      id: raw._id,
      sampleId: String(raw._id),
      set,
    };
  }

  private buildVectorFilter(filters: MemoryQueryFilters | undefined): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      tenantId: this.routing.tenantId,
      workspaceId: this.routing.workspaceId,
      visibility: filters?.visibility ?? this.routing.defaultVisibility,
    };
    if (filters?.scopeSubject) {
      filter.scopeSubject = filters.scopeSubject;
    }
    if (filters?.includeSecrets !== true) {
      filter.sensitivity = "normal";
    }
    if (filters?.preferencesOnly) {
      filter.kind = "preference";
    } else if (filters?.openCommitmentsOnly) {
      filter.kind = "commitment";
      filter.status = "open";
    } else if (Array.isArray(filters?.kinds) && filters.kinds.length > 0) {
      filter.kind = filters.kinds.length === 1 ? filters.kinds[0] : { $in: filters.kinds };
    }
    if (Array.isArray(filters?.modalities) && filters.modalities.length > 0) {
      filter.modalities =
        filters.modalities.length === 1 ? filters.modalities[0] : { $in: filters.modalities };
    }
    return filter;
  }

  private buildScopeMatch(scopeSubject: string): Record<string, unknown> {
    const routedMatch = {
      tenantId: this.routing.tenantId,
      workspaceId: this.routing.workspaceId,
      scopeSubject,
    };
    if (!this.routing.legacyFallback) {
      return routedMatch;
    }
    return {
      $or: [
        routedMatch,
        {
          "metadata.ops.scopeSubject": scopeSubject,
          $and: [
            {
              $or: [{ tenantId: this.routing.tenantId }, { tenantId: { $exists: false } }],
            },
            {
              $or: [{ workspaceId: this.routing.workspaceId }, { workspaceId: { $exists: false } }],
            },
            {
              $or: [
                { "metadata.ops.tenantId": this.routing.tenantId },
                { "metadata.ops.tenantId": { $exists: false } },
              ],
            },
            {
              $or: [
                { "metadata.ops.workspaceId": this.routing.workspaceId },
                { "metadata.ops.workspaceId": { $exists: false } },
              ],
            },
          ],
        },
      ],
    };
  }

  private matchesRouting(entry: MemoryEntry, filters: MemoryQueryFilters | undefined): boolean {
    const ops = extractOpsMetadata(entry);
    const entryTenantId = entry.tenantId ?? readString(ops?.tenantId);
    if (entryTenantId && entryTenantId !== this.routing.tenantId) {
      return false;
    }
    const entryWorkspaceId = entry.workspaceId ?? readString(ops?.workspaceId);
    if (entryWorkspaceId && entryWorkspaceId !== this.routing.workspaceId) {
      return false;
    }
    const entryVisibility = entry.visibility ?? readVisibility(ops?.visibility);
    const expectedVisibility = filters?.visibility ?? this.routing.defaultVisibility;
    return !entryVisibility || entryVisibility === expectedVisibility;
  }
}

function isMemoryCategory(value: unknown): value is MemoryCategory {
  return (
    value === "preference" ||
    value === "fact" ||
    value === "decision" ||
    value === "entity" ||
    value === "other"
  );
}

function isMemoryType(value: unknown): value is MemoryType {
  return (
    value === "working" ||
    value === "cache" ||
    value === "episodic" ||
    value === "semantic" ||
    value === "procedural" ||
    value === "associative"
  );
}

function isMemoryVisibility(value: unknown): value is MemoryVisibility {
  return value === "private" || value === "workspace" || value === "project";
}

function isMemorySensitivity(value: unknown): value is MemorySensitivity {
  return value === "normal" || value === "secret";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesFilters(entry: MemoryEntry, filters: MemoryQueryFilters | undefined): boolean {
  const ops = extractOpsMetadata(entry);
  const entryScope = entry.scopeSubject ?? readString(ops?.scopeSubject);
  const entryVisibility = entry.visibility ?? readVisibility(ops?.visibility);
  const entryKind = entry.kind ?? readString(ops?.kind);
  const entryStatus = entry.status ?? readString(ops?.status);
  const entrySensitivity = entry.sensitivity ?? readSensitivity(ops?.sensitivity);
  if (entrySensitivity === "secret" && filters?.includeSecrets !== true) {
    return false;
  }
  if (!filters) {
    return true;
  }
  if (filters.scopeSubject) {
    if (entryScope !== filters.scopeSubject) {
      return false;
    }
  }
  if (filters.visibility) {
    if (entryVisibility !== filters.visibility) {
      return false;
    }
  }
  if (filters.preferencesOnly && entryKind !== "preference") {
    return false;
  }
  if (filters.openCommitmentsOnly) {
    if (entryKind !== "commitment" || entryStatus !== "open") {
      return false;
    }
  }
  if (Array.isArray(filters.kinds) && filters.kinds.length > 0) {
    if (!entryKind || !filters.kinds.includes(entryKind)) {
      return false;
    }
  }
  if (Array.isArray(filters.modalities) && filters.modalities.length > 0) {
    const entryModalities = extractEntryModalities(entry);
    if (!entryModalities.some((modality) => filters.modalities?.includes(modality))) {
      return false;
    }
  }
  return true;
}

function extractOpsMetadata(entry: MemoryEntry): Record<string, unknown> | null {
  if (!isObject(entry.metadata)) {
    return null;
  }
  const rawOps = entry.metadata.ops;
  if (!isObject(rawOps)) {
    return null;
  }
  return rawOps;
}

function extractEntryModalities(entry: MemoryEntry): string[] {
  if (Array.isArray(entry.modalities) && entry.modalities.length > 0) {
    return Array.from(new Set(entry.modalities.filter((item) => typeof item === "string")));
  }
  if (!isObject(entry.metadata)) {
    return ["text"];
  }
  const rawOps = entry.metadata.ops;
  if (!isObject(rawOps)) {
    return ["text"];
  }
  const rawAttachments = rawOps.attachments;
  if (!Array.isArray(rawAttachments) || rawAttachments.length === 0) {
    return ["text"];
  }

  const modalities = rawAttachments
    .map((attachment) => {
      if (!isObject(attachment)) {
        return null;
      }
      return typeof attachment.modality === "string" ? attachment.modality : null;
    })
    .filter((value): value is string => typeof value === "string");

  return modalities.length > 0 ? modalities : ["text"];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readVisibility(value: unknown): MemoryVisibility | undefined {
  return isMemoryVisibility(value) ? value : undefined;
}

function readSensitivity(value: unknown): MemorySensitivity | undefined {
  return isMemorySensitivity(value) ? value : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value
    .map((item) => readString(item))
    .filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? Array.from(new Set(strings)) : undefined;
}

function subjectTypeFromScope(scopeSubject: string | undefined): string {
  if (!scopeSubject) {
    return "unknown";
  }
  const prefix = scopeSubject.split(":")[0]?.trim();
  return prefix || "unknown";
}

function inferBackfillKind(category: unknown): string {
  if (category === "preference" || category === "fact" || category === "decision") {
    return category;
  }
  return "note";
}

function readBackfillKind(value: unknown): string | undefined {
  const kind = readString(value);
  if (!kind) {
    return undefined;
  }
  return MEMORY_OPS_KINDS.includes(kind as (typeof MEMORY_OPS_KINDS)[number]) ? kind : undefined;
}

function inferBackfillStatus(kind: string): string {
  if (kind === "preference") {
    return "observed";
  }
  if (kind === "commitment") {
    return "open";
  }
  return "recorded";
}

function clampInteger(
  value: number | undefined,
  defaultValue: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function createContentHash(text: string, attachmentSummary: unknown): string {
  return createHash("sha256").update(stableStringify({ text, attachmentSummary })).digest("hex");
}

function extractAttachmentSummary(metadata: Record<string, unknown> | undefined): unknown {
  if (!metadata) {
    return undefined;
  }
  return (
    metadata.attachmentSummary ??
    metadata.attachment_summary ??
    metadata.attachmentsSummary ??
    metadata.attachments
  );
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

function pushSampleId(sampleIds: string[], sampleId: string): void {
  if (sampleIds.length >= 20 || sampleIds.includes(sampleId)) {
    return;
  }
  sampleIds.push(sampleId);
}

function pushError(errors: string[], message: string): void {
  if (errors.length >= 20) {
    return;
  }
  errors.push(message);
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function appendUniqueResults(
  target: MemorySearchResult[],
  seen: Set<string>,
  candidates: MemorySearchResult[],
): void {
  for (const candidate of candidates) {
    if (seen.has(candidate.entry.id)) {
      continue;
    }
    seen.add(candidate.entry.id);
    target.push(candidate);
  }
  target.sort((a, b) => b.score - a.score);
}

export function buildVectorIndexDefinition(
  indexName: string,
  numDimensions: number,
  options: { routingFilters?: boolean } = {},
): object {
  const filterPaths = options.routingFilters
    ? [
        "tenantId",
        "workspaceId",
        "scopeSubject",
        "subjectType",
        "visibility",
        "category",
        "kind",
        "type",
        "sensitivity",
        "status",
        "modalities",
        "importance",
        "createdAt",
        "updatedAt",
      ]
    : ["category", "importance", "createdAt"];
  return {
    name: indexName,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "vector",
          numDimensions,
          similarity: "cosine",
        },
        ...filterPaths.map((filterPath) => ({
          type: "filter",
          path: filterPath,
        })),
      ],
    },
  };
}
