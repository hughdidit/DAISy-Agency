import { describe, expect, test, vi } from "vitest";
import { MongoMemoryDB } from "./mongodb-provider.js";

const baseRetrieval = {
  minScore: 0.1,
  vectorLimit: 8,
  numCandidatesMultiplier: 10,
};

describe("mongodb provider via MCP", () => {
  test("store persists records via MCP insert-many", async () => {
    const insertMany = vi.fn().mockResolvedValue(1);
    const mcp = {
      insertMany,
      aggregate: vi.fn(),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const embeddings = {
      embed: vi.fn().mockResolvedValue([0.1, 0.2]),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      embeddings as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    const record = await provider.store({
      text: "remember this",
      parts: [{ text: "remember this" }],
      importance: 0.7,
      category: "fact",
      type: "semantic",
    });

    expect(embeddings.embed).toHaveBeenCalledWith([{ text: "remember this" }]);
    expect(insertMany).toHaveBeenCalledTimes(1);
    expect(insertMany).toHaveBeenCalledWith("memdb", "memories", [
      expect.objectContaining({
        _id: record.id,
        text: "remember this",
        vector: [0.1, 0.2],
        importance: 0.7,
        category: "fact",
        type: "semantic",
      }),
    ]);
  });

  test("store derives fallback text for media-only entries", async () => {
    const mcp = {
      insertMany: vi.fn().mockResolvedValue(1),
      aggregate: vi.fn(),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const embeddings = {
      embed: vi.fn().mockResolvedValue([0.1, 0.2]),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      embeddings as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    const record = await provider.store({
      parts: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: "ZmFrZS1wZGY=",
          },
        },
      ],
      importance: 0.5,
      category: "other",
      type: "episodic",
    });

    expect(record.text).toBe("[attachment:application/pdf]");
  });

  test("store propagates insert confirmation failures", async () => {
    const mcp = {
      insertMany: vi
        .fn()
        .mockRejectedValue(new Error("insert-many response did not confirm insertedCount")),
      aggregate: vi.fn(),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const embeddings = {
      embed: vi.fn().mockResolvedValue([0.1, 0.2]),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      embeddings as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    await expect(
      provider.store({
        text: "remember this",
        parts: [{ text: "remember this" }],
        importance: 0.7,
        category: "fact",
        type: "semantic",
      }),
    ).rejects.toThrow("insert-many response did not confirm insertedCount");
  });

  test("searchByVector uses $vectorSearch aggregation pipeline", async () => {
    const aggregate = vi.fn().mockResolvedValue([
      {
        _id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        text: "result",
        vector: [0.9, 0.1],
        importance: 1,
        category: "fact",
        type: "semantic",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        score: 0.88,
      },
    ]);

    const mcp = {
      insertMany: vi.fn(),
      aggregate,
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    const results = await provider.searchByVector([0.9, 0.1], 4, 0.2);

    expect(aggregate).toHaveBeenCalledWith("memdb", "memories", [
      {
        $vectorSearch: {
          index: "vector_idx",
          path: "vector",
          queryVector: [0.9, 0.1],
          numCandidates: 40,
          limit: 40,
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
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].entry.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(results[0].score).toBe(0.88);
  });

  test("searchByQuery embeds text query as multimodal text part", async () => {
    const mcp = {
      insertMany: vi.fn(),
      aggregate: vi.fn().mockResolvedValue([]),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const embeddings = {
      embed: vi.fn().mockResolvedValue([0.5, 0.5]),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      embeddings as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    await provider.searchByQuery("query text", 5, 0.1);

    expect(embeddings.embed).toHaveBeenCalledWith([{ text: "query text" }]);
  });

  test("searchByVector skips malformed memory documents", async () => {
    const mcp = {
      insertMany: vi.fn(),
      aggregate: vi.fn().mockResolvedValue([
        { _id: "x", score: 0.9 },
        {
          _id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          text: "valid",
          vector: [0.2, 0.3],
          category: "fact",
          type: "semantic",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          score: 0.4,
        },
      ]),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    const results = await provider.searchByVector([0.2, 0.3], 5, 0.1);
    expect(results).toHaveLength(1);
    expect(results[0].entry.text).toBe("valid");
  });

  test("searchByVector returns fewer results than requested when MCP returns fewer", async () => {
    const mcp = {
      insertMany: vi.fn(),
      aggregate: vi.fn().mockResolvedValue([
        {
          _id: "e1111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          text: "only",
          vector: [0.4],
          category: "fact",
          type: "semantic",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          score: 0.6,
        },
      ]),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    const results = await provider.searchByVector([0.4], 5, 0.1);
    expect(results).toHaveLength(1);
  });

  test("delete validates UUID format", async () => {
    const deleteOne = vi.fn().mockResolvedValue(true);
    const mcp = {
      insertMany: vi.fn(),
      aggregate: vi.fn(),
      deleteOne,
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    await expect(provider.delete("not-a-uuid")).rejects.toThrow("Invalid memory ID format");
    await expect(provider.delete("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).resolves.toBe(true);
    expect(deleteOne).toHaveBeenCalledWith("memdb", "memories", {
      _id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
  });

  test("delete returns false when MCP delete count is zero", async () => {
    const mcp = {
      insertMany: vi.fn(),
      aggregate: vi.fn(),
      deleteOne: vi.fn().mockResolvedValue(false),
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    await expect(provider.delete("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).resolves.toBe(false);
  });

  test("searchByQuery supports scope and kind filters", async () => {
    const now = Date.now();
    const mcp = {
      insertMany: vi.fn(),
      aggregate: vi.fn().mockResolvedValue([
        {
          _id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          text: "prefers concise",
          vector: [0.1, 0.2],
          category: "preference",
          type: "associative",
          metadata: {
            source: "memory_capture",
            ops: {
              scopeSubject: "agent:main",
              kind: "preference",
              status: "observed",
            },
          },
          createdAt: now,
          updatedAt: now,
          score: 0.9,
        },
        {
          _id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          text: "other scope",
          vector: [0.1, 0.2],
          category: "fact",
          type: "semantic",
          metadata: {
            source: "memory_capture",
            ops: {
              scopeSubject: "agent:other",
              kind: "fact",
            },
          },
          createdAt: now,
          updatedAt: now,
          score: 0.95,
        },
      ]),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      { embed: vi.fn().mockResolvedValue([0.1, 0.2]) } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    const results = await provider.searchByQuery("concise", 5, 0.1, {
      scopeSubject: "agent:main",
      kinds: ["preference"],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.entry.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  test("searchByQuery excludes secret entries unless explicitly requested", async () => {
    const now = Date.now();
    const mcp = {
      insertMany: vi.fn(),
      aggregate: vi.fn().mockResolvedValue([
        {
          _id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          text: "apiKey=super-secret",
          vector: [0.1, 0.2],
          category: "fact",
          type: "semantic",
          metadata: {
            source: "memory_capture",
            ops: {
              scopeSubject: "agent:main",
              kind: "fact",
              sensitivity: "secret",
            },
          },
          createdAt: now,
          updatedAt: now,
          score: 0.9,
        },
      ]),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
      close: vi.fn(),
    };

    const provider = new MongoMemoryDB(
      mcp as any,
      { embed: vi.fn().mockResolvedValue([0.1, 0.2]) } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    const excluded = await provider.searchByQuery("api key", 5, 0.1, {
      scopeSubject: "agent:main",
    });
    expect(excluded).toHaveLength(0);

    const included = await provider.searchByQuery("api key", 5, 0.1, {
      scopeSubject: "agent:main",
      includeSecrets: true,
    });
    expect(included).toHaveLength(1);
    expect(included[0]?.entry.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  test("listByScope returns scoped entries sorted by recency", async () => {
    const now = Date.now();
    const aggregate = vi.fn().mockResolvedValue([
      {
        _id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        text: "newer",
        vector: [0.1, 0.2],
        category: "fact",
        type: "semantic",
        metadata: { source: "memory_store", ops: { scopeSubject: "agent:main", kind: "fact" } },
        createdAt: now - 1000,
        updatedAt: now,
      },
      {
        _id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        text: "older",
        vector: [0.1, 0.2],
        category: "fact",
        type: "semantic",
        metadata: { source: "memory_store", ops: { scopeSubject: "agent:main", kind: "fact" } },
        createdAt: now - 5000,
        updatedAt: now - 2000,
      },
    ]);
    const provider = new MongoMemoryDB(
      {
        insertMany: vi.fn(),
        aggregate,
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    const results = await provider.listByScope("agent:main", 10);
    expect(results).toHaveLength(2);
    expect(aggregate).toHaveBeenCalledWith(
      "memdb",
      "memories",
      expect.arrayContaining([
        {
          $match: {
            "metadata.ops.scopeSubject": "agent:main",
          },
        },
      ]),
    );
  });

  test("listByScope excludes secret entries unless explicitly requested", async () => {
    const now = Date.now();
    const aggregate = vi.fn().mockResolvedValue([
      {
        _id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        text: "apiKey=super-secret",
        vector: [0.1, 0.2],
        category: "fact",
        type: "semantic",
        metadata: {
          source: "memory_store",
          ops: {
            scopeSubject: "agent:main",
            kind: "fact",
            sensitivity: "secret",
          },
        },
        createdAt: now - 1000,
        updatedAt: now,
      },
      {
        _id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        text: "safe",
        vector: [0.1, 0.2],
        category: "fact",
        type: "semantic",
        metadata: {
          source: "memory_store",
          ops: {
            scopeSubject: "agent:main",
            kind: "fact",
          },
        },
        createdAt: now - 2000,
        updatedAt: now - 500,
      },
    ]);
    const provider = new MongoMemoryDB(
      {
        insertMany: vi.fn(),
        aggregate,
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    const excluded = await provider.listByScope("agent:main", 10);
    expect(excluded).toHaveLength(1);
    expect(excluded[0]?.text).toBe("safe");

    const included = await provider.listByScope("agent:main", 10, { includeSecrets: true });
    expect(included).toHaveLength(2);
  });

  test("listByScope over-fetches to preserve non-secret results", async () => {
    const now = Date.now();
    const aggregate = vi.fn().mockImplementation(async (_db, _collection, pipeline) => {
      const fetchLimit = pipeline.find((stage: any) => stage.$limit)?.$limit ?? 0;
      const docs = [
        {
          _id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          text: "apiKey=super-secret",
          vector: [0.1, 0.2],
          category: "fact",
          type: "semantic",
          metadata: {
            source: "memory_store",
            ops: {
              scopeSubject: "agent:main",
              kind: "fact",
              sensitivity: "secret",
            },
          },
          createdAt: now - 1000,
          updatedAt: now,
        },
        {
          _id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          text: "safe 1",
          vector: [0.1, 0.2],
          category: "fact",
          type: "semantic",
          metadata: {
            source: "memory_store",
            ops: {
              scopeSubject: "agent:main",
              kind: "fact",
            },
          },
          createdAt: now - 2000,
          updatedAt: now - 500,
        },
        {
          _id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          text: "safe 2",
          vector: [0.1, 0.2],
          category: "fact",
          type: "semantic",
          metadata: {
            source: "memory_store",
            ops: {
              scopeSubject: "agent:main",
              kind: "fact",
            },
          },
          createdAt: now - 3000,
          updatedAt: now - 1000,
        },
      ];
      return docs.slice(0, fetchLimit);
    });
    const provider = new MongoMemoryDB(
      {
        insertMany: vi.fn(),
        aggregate,
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    const results = await provider.listByScope("agent:main", 2);
    expect(results).toHaveLength(2);
    expect(results.map((entry) => entry.text)).toEqual(["safe 1", "safe 2"]);
  });

  test("getById returns null when no matching record exists", async () => {
    const provider = new MongoMemoryDB(
      {
        insertMany: vi.fn(),
        aggregate: vi.fn().mockResolvedValue([]),
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "vector_idx",
      baseRetrieval,
    );

    await expect(provider.getById("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).resolves.toBeNull();
  });
});
