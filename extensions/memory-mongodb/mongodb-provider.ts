import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import { randomUUID } from "node:crypto";
import type { MemoryCategory } from "./config.js";

// ============================================================================
// Types
// ============================================================================

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

type MemoryDocument = {
  _id: string;
  text: string;
  vector: number[];
  importance: number;
  category: string;
  createdAt: number;
};

// ============================================================================
// MongoMemoryDB
// ============================================================================

export class MongoMemoryDB {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<MemoryDocument> | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly connectionUri: string,
    private readonly databaseName: string,
    private readonly collectionName: string,
    private readonly vectorSearchIndexName: string,
  ) {}

  private async ensureInitialized(): Promise<void> {
    if (this.collection) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      this.client = new MongoClient(this.connectionUri);
      await this.client.connect();
      await this.client.db("admin").command({ ping: 1 });
      this.db = this.client.db(this.databaseName);
      this.collection = this.db.collection<MemoryDocument>(this.collectionName);
    } catch (err) {
      // Strip connection URI from error messages to avoid leaking credentials
      this.client = null;
      this.db = null;
      this.collection = null;
      this.initPromise = null;
      const message =
        err instanceof Error ? err.message : String(err);
      const sanitized = sanitizeErrorMessage(message, this.connectionUri);
      throw new Error(`MongoDB connection failed: ${sanitized}`);
    }
  }

  async store(
    entry: Omit<MemoryEntry, "id" | "createdAt">,
  ): Promise<MemoryEntry> {
    await this.ensureInitialized();

    const id = randomUUID();
    const createdAt = Date.now();

    const doc: MemoryDocument = {
      _id: id,
      text: entry.text,
      vector: entry.vector,
      importance: entry.importance,
      category: entry.category,
      createdAt,
    };

    await this.collection!.insertOne(doc as Document & MemoryDocument);

    return { ...entry, id, createdAt };
  }

  async search(
    vector: number[],
    limit = 5,
    minScore = 0.5,
  ): Promise<MemorySearchResult[]> {
    await this.ensureInitialized();

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
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const results = await this.collection!.aggregate(pipeline).toArray();

    return results
      .filter((doc) => (doc.score as number) >= minScore)
      .map((doc) => ({
        entry: {
          id: doc._id as string,
          text: doc.text as string,
          vector: doc.vector as number[],
          importance: doc.importance as number,
          category: doc.category as MemoryCategory,
          createdAt: doc.createdAt as number,
        },
        score: doc.score as number,
      }));
  }

  async get(id: string): Promise<MemoryEntry | null> {
    await this.ensureInitialized();
    validateUUID(id);

    const doc = await this.collection!.findOne({ _id: id } as Document);
    if (!doc) return null;

    return {
      id: doc._id as string,
      text: doc.text as string,
      vector: doc.vector as number[],
      importance: doc.importance as number,
      category: doc.category as MemoryCategory,
      createdAt: doc.createdAt as number,
    };
  }

  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();
    validateUUID(id);

    const result = await this.collection!.deleteOne({ _id: id } as Document);
    return result.deletedCount > 0;
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    await this.collection!.deleteMany({});
  }

  async count(): Promise<number> {
    await this.ensureInitialized();
    return this.collection!.countDocuments();
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collection = null;
      this.initPromise = null;
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new Error(`Invalid memory ID format: ${id}`);
  }
}

/**
 * Strip the connection URI and credential fragments from error messages
 * to prevent credential leakage. Handles exact URI matches, URI variants
 * (with/without query params), and userinfo patterns the driver may log.
 */
function sanitizeErrorMessage(message: string, uri: string): string {
  if (!uri) return message;
  let sanitized = message;

  // Replace the full URI
  sanitized = sanitized.replaceAll(uri, "[redacted]");

  // Replace URI without query params (driver may log a variant)
  const qIdx = uri.indexOf("?");
  if (qIdx > 0) {
    sanitized = sanitized.replaceAll(uri.slice(0, qIdx), "[redacted]");
  }

  // Extract and scrub userinfo (user:pass) if present
  try {
    const schemeEnd = uri.indexOf("://");
    if (schemeEnd > 0) {
      const afterScheme = uri.slice(schemeEnd + 3);
      const atIdx = afterScheme.indexOf("@");
      if (atIdx > 0) {
        const userinfo = afterScheme.slice(0, atIdx);
        sanitized = sanitized.replaceAll(userinfo, "[credentials]");
        // Also scrub URL-decoded variants
        try {
          const decoded = decodeURIComponent(userinfo);
          if (decoded !== userinfo) {
            sanitized = sanitized.replaceAll(decoded, "[credentials]");
          }
        } catch {
          // Ignore decode errors
        }
      }
    }
  } catch {
    // Ignore parse errors — best-effort sanitization
  }

  return sanitized;
}

/**
 * Build the Atlas Vector Search index definition JSON.
 * Users must create this index manually in the Atlas UI or via the Atlas CLI.
 */
export function buildVectorIndexDefinition(
  indexName: string,
  numDimensions: number,
): object {
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
