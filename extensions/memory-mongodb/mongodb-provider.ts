import { randomUUID } from "node:crypto";
import { MongoClient, type Collection } from "mongodb";
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

type MemoryDocument = Omit<MemoryEntry, "id"> & { _id: string };

export class MongoMemoryDB {
  private client: MongoClient;
  private collection: Collection<MemoryDocument> | null = null;

  constructor(
    private readonly connectionUri: string,
    private readonly databaseName: string,
    private readonly collectionName: string,
    private readonly vectorSearchIndexName: string,
  ) {
    this.client = new MongoClient(connectionUri);
  }

  private async getCollection(): Promise<Collection<MemoryDocument>> {
    if (!this.collection) {
      await this.client.connect();
      this.collection = this.client
        .db(this.databaseName)
        .collection<MemoryDocument>(this.collectionName);
    }
    return this.collection;
  }

  async store(entry: Omit<MemoryEntry, "id" | "createdAt">): Promise<MemoryEntry> {
    const record: MemoryEntry = { ...entry, id: randomUUID(), createdAt: Date.now() };
    const col = await this.getCollection();
    const doc: MemoryDocument = { _id: record.id, ...omitId(record) };
    await col.insertOne(doc);
    return record;
  }

  async search(vector: number[], limit = 5, minScore = 0.5): Promise<MemorySearchResult[]> {
    if (!["1", "true"].includes(process.env.MEMORY_ALLOW_IN_MEMORY_SEARCH ?? "")) {
      throw new Error(
        "In-memory vector search is disabled. " +
          "This O(N·D) full-scan path is not suitable for production use. " +
          "Set MEMORY_ALLOW_IN_MEMORY_SEARCH=1 to enable (development/testing only).",
      );
    }

    const ranked = [...this.storeById.values()]
      .map((entry) => ({ entry, score: cosineSimilarity(vector, entry.vector) }))
      .filter((result) => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked;
    const col = await this.getCollection();
    const pipeline = [
      {
        $vectorSearch: {
          index: this.vectorSearchIndexName,
          path: "vector",
          queryVector: vector,
          numCandidates: limit * 10,
          limit,
        },
      },
      {
        $addFields: { score: { $meta: "vectorSearchScore" } },
      },
      {
        $match: { score: { $gte: minScore } },
      },
    ];

    const docs = await col.aggregate<MemoryDocument & { score: number }>(pipeline).toArray();
    return docs.map((doc) => ({
      entry: documentToEntry(doc),
      score: doc.score,
    }));
  }

  async get(id: string): Promise<MemoryEntry | null> {
    validateUUID(id);
    const col = await this.getCollection();
    const doc = await col.findOne({ _id: id });
    return doc ? documentToEntry(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    validateUUID(id);
    const col = await this.getCollection();
    const result = await col.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    await col.deleteMany({});
  }

  async count(): Promise<number> {
    const col = await this.getCollection();
    return col.countDocuments();
  }

  async close(): Promise<void> {
    this.collection = null;
    await this.client.close();
  }
}

function omitId({ id: _id, ...rest }: MemoryEntry): Omit<MemoryEntry, "id"> {
  return rest;
}

function documentToEntry(doc: MemoryDocument): MemoryEntry {
  // Exclude the aggregation-only `score` field that $vectorSearch adds.
  const { _id, score: _score, ...rest } = doc as MemoryDocument & { score?: number };
  return { id: _id, ...rest };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new Error(`Invalid memory ID format: ${id}`);
  }
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
