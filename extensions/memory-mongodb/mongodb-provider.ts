import { randomUUID } from "node:crypto";
import type { MemoryCategory } from "./config.js";
import { MongoMcpClient, type AggregateArgs } from "./src/services/mcp-client.js";

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
type MemorySearchDocument = MemoryDocument & { score: number };

export class MongoMemoryDB {
  constructor(
    private readonly mcpClient: MongoMcpClient,
    private readonly databaseName: string,
    private readonly collectionName: string,
    private readonly vectorSearchIndexName: string,
  ) {}

  async start(): Promise<void> {
    await this.mcpClient.start();
  }

  async store(entry: Omit<MemoryEntry, "id" | "createdAt">): Promise<MemoryEntry> {
    const record: MemoryEntry = { ...entry, id: randomUUID(), createdAt: Date.now() };
    const doc: MemoryDocument = { _id: record.id, ...omitId(record) };

    await this.mcpClient.insertMany({
      database: this.databaseName,
      collection: this.collectionName,
      documents: [doc],
    });

    return record;
  }

  async search(vector: number[], limit = 5, minScore = 0.5): Promise<MemorySearchResult[]> {
    const pipeline: AggregateArgs["pipeline"] = [
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

    const docs = await this.mcpClient.aggregate<MemorySearchDocument>({
      database: this.databaseName,
      collection: this.collectionName,
      pipeline,
    });

    return docs.map((doc) => {
      const { score, ...document } = doc;
      return {
        entry: documentToEntry(document),
        score,
      };
    });
  }

  async get(id: string): Promise<MemoryEntry | null> {
    validateUUID(id);

    const docs = await this.mcpClient.find<MemoryDocument>({
      database: this.databaseName,
      collection: this.collectionName,
      filter: { _id: id },
      limit: 1,
    });

    return docs[0] ? documentToEntry(docs[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    validateUUID(id);

    const result = await this.mcpClient.deleteOne({
      database: this.databaseName,
      collection: this.collectionName,
      filter: { _id: id },
    });

    return result.deletedCount === 1;
  }

  async clear(): Promise<void> {
    await this.mcpClient.deleteMany({
      database: this.databaseName,
      collection: this.collectionName,
      filter: {},
    });
  }

  async count(): Promise<number> {
    const docs = await this.mcpClient.aggregate<{ total: number }>(
      {
        database: this.databaseName,
        collection: this.collectionName,
        pipeline: [{ $count: "total" }],
      },
    );

    return docs[0]?.total ?? 0;
  }

  async close(): Promise<void> {
    await this.mcpClient.stop();
  }
}

function omitId({ id: _id, ...rest }: MemoryEntry): Omit<MemoryEntry, "id"> {
  return rest;
}

function documentToEntry(doc: MemoryDocument): MemoryEntry {
  const { _id, ...rest } = doc;
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
