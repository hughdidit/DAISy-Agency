import { randomUUID } from "node:crypto";
import type { MemoryCategory } from "./config.js";
import type { McpClientService } from "./mcp-client-service.js";
import {
  multimodalPartsToFallbackText,
  type MultimodalPart,
} from "./payload-chunker.js";

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
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
};

export type StoreMemoryInput = Omit<MemoryEntry, "id" | "createdAt" | "updatedAt" | "vector" | "text"> & {
  parts: MultimodalPart[];
  text?: string;
};

export type MemorySearchResult = {
  entry: MemoryEntry;
  score: number;
  vectorScore: number;
};

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

type EmbeddingProvider = {
  embed: (parts: MultimodalPart[]) => Promise<number[]>;
};

type MemoryDocument = {
  _id: string;
  text: string;
  vector: number[];
  importance: number;
  category: MemoryCategory;
  subCategory?: string;
  type: MemoryType;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  score?: number;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MongoMemoryDB {
  constructor(
    private readonly mcp: McpClientService,
    private readonly embeddings: EmbeddingProvider,
    private readonly databaseName: string,
    private readonly collectionName: string,
    private readonly vectorSearchIndexName: string,
    private readonly retrieval: RetrievalOptions,
    private readonly logger?: Logger,
  ) {}

  async store(entry: StoreMemoryInput): Promise<MemoryEntry> {
    const { parts, text, ...rest } = entry;
    const vector = await this.embeddings.embed(parts);

    const now = Date.now();
    const record: MemoryEntry = {
      ...rest,
      text: text?.trim() || multimodalPartsToFallbackText(parts),
      id: randomUUID(),
      vector,
      createdAt: now,
      updatedAt: now,
    };

    const document = this.entryToDocument(record);
    await this.mcp.insertMany(this.databaseName, this.collectionName, [document]);

    return record;
  }

  async searchByQuery(
    query: string,
    limit = 5,
    minScore = this.retrieval.minScore,
  ): Promise<MemorySearchResult[]> {
    const vector = await this.embeddings.embed([{ text: query }]);
    return this.searchByVector(vector, limit, minScore);
  }

  async searchByVector(
    vector: number[],
    limit = 5,
    minScore = this.retrieval.minScore,
  ): Promise<MemorySearchResult[]> {
    const boundedLimit = Math.max(1, Math.min(limit, this.retrieval.vectorLimit));
    const numCandidates = Math.max(
      boundedLimit,
      boundedLimit * Math.max(1, this.retrieval.numCandidatesMultiplier),
    );

    const pipeline = [
      {
        $vectorSearch: {
          index: this.vectorSearchIndexName,
          path: "vector",
          queryVector: vector,
          numCandidates,
          limit: boundedLimit,
        },
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

      results.push({
        entry: parsed.entry,
        score: parsed.score,
        vectorScore: parsed.score,
      });
    }

    return results.slice(0, boundedLimit);
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
      metadata: isObject(raw.metadata) ? raw.metadata : undefined,
      tags: Array.isArray(raw.tags)
        ? raw.tags.filter((tag): tag is string => typeof tag === "string")
        : undefined,
      createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
      updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
    };

    return { entry, score };
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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function buildVectorIndexDefinition(indexName: string, numDimensions: number): object {
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
        {
          type: "filter",
          path: "category",
        },
        {
          type: "filter",
          path: "importance",
        },
        {
          type: "filter",
          path: "createdAt",
        },
      ],
    },
  };
}
