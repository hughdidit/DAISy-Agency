import { randomUUID } from "node:crypto";
import type { MemoryCategory } from "./config.js";

export type MemoryEntry = {
  id: string;
  text: string;
  vector: number[];
  importance: number;
  category: MemoryCategory;
  createdAt: number;
};

export type MemorySearchResult = {
  entry: MemoryEntry;
  score: number;
};

export class MongoMemoryDB {
  private readonly storeById = new Map<string, MemoryEntry>();

  constructor(
    private readonly _connectionUri: string,
    private readonly _databaseName: string,
    private readonly _collectionName: string,
    private readonly _vectorSearchIndexName: string,
  ) {}

  async store(entry: Omit<MemoryEntry, "id" | "createdAt">): Promise<MemoryEntry> {
    const record: MemoryEntry = { ...entry, id: randomUUID(), createdAt: Date.now() };
    this.storeById.set(record.id, record);
    return record;
  }

  async search(vector: number[], limit = 5, minScore = 0.5): Promise<MemorySearchResult[]> {
    const ranked = [...this.storeById.values()]
      .map((entry) => ({ entry, score: cosineSimilarity(vector, entry.vector) }))
      .filter((result) => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked;
  }

  async get(id: string): Promise<MemoryEntry | null> {
    validateUUID(id);
    return this.storeById.get(id) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    validateUUID(id);
    return this.storeById.delete(id);
  }

  async clear(): Promise<void> {
    this.storeById.clear();
  }

  async count(): Promise<number> {
    return this.storeById.size;
  }

  async close(): Promise<void> {
    this.storeById.clear();
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new Error(`Invalid memory ID format: ${id}`);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aNorm += a[i] * a[i];
    bNorm += b[i] * b[i];
  }

  if (aNorm === 0 || bNorm === 0) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
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
