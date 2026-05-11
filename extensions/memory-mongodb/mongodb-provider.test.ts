import { describe, expect, test, vi } from "vitest";
import { MongoMemoryDB } from "./mongodb-provider.js";

const baseRetrieval = {
  minScore: 0.1,
  vectorLimit: 8,
  numCandidatesMultiplier: 10,
};

const baseRouting = {
  tenantId: "default",
  workspaceId: "default",
  defaultVisibility: "private" as const,
  vectorIndexNameV2: "vector_idx_v2",
  legacyFallback: true,
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
      "memory_events",
      "vector_idx",
      baseRouting,
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
      "memory_events",
      "vector_idx",
      baseRouting,
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

  test("store denormalizes routing fields for scoped records", async () => {
    const insertMany = vi.fn().mockResolvedValue(1);
    const provider = new MongoMemoryDB(
      {
        insertMany,
        aggregate: vi.fn(),
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn().mockResolvedValue([0.1, 0.2]) } as any,
      "memdb",
      "memories",
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    await provider.store({
      text: "prefers concise",
      parts: [{ text: "prefers concise" }],
      importance: 0.7,
      category: "preference",
      type: "associative",
      metadata: {
        source: "memory_capture",
        ops: {
          scopeSubject: "agent:main",
          kind: "preference",
          status: "promoted",
          sensitivity: "normal",
        },
      },
    });

    expect(insertMany).toHaveBeenCalledWith("memdb", "memories", [
      expect.objectContaining({
        tenantId: "default",
        workspaceId: "default",
        scopeSubject: "agent:main",
        subjectType: "agent",
        visibility: "private",
        kind: "preference",
        status: "promoted",
        sensitivity: "normal",
        modalities: ["text"],
      }),
    ]);
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
      "memory_events",
      "vector_idx",
      baseRouting,
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
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    const results = await provider.searchByVector([0.9, 0.1], 4, 0.2);

    expect(aggregate).toHaveBeenCalledWith("memdb", "memories", [
      {
        $vectorSearch: {
          index: "vector_idx_v2",
          path: "vector",
          queryVector: [0.9, 0.1],
          numCandidates: 40,
          limit: 40,
          filter: {
            tenantId: "default",
            workspaceId: "default",
            visibility: "private",
            sensitivity: "normal",
          },
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
      "memory_events",
      "vector_idx",
      baseRouting,
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
      "memory_events",
      "vector_idx",
      baseRouting,
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
      "memory_events",
      "vector_idx",
      baseRouting,
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
      "memory_events",
      "vector_idx",
      baseRouting,
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
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    await expect(provider.delete("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).resolves.toBe(false);
  });

  test("findByIdPrefix resolves candidate tokens inside the requested scope", async () => {
    const now = Date.now();
    const aggregate = vi.fn().mockResolvedValue([
      {
        _id: "f9ed12f4-1111-4111-8111-111111111111",
        text: "prefix scoped memory",
        vector: [0.1, 0.2],
        importance: 0.7,
        category: "fact",
        type: "semantic",
        tenantId: "default",
        workspaceId: "default",
        scopeSubject: "agent:main",
        visibility: "private",
        metadata: {
          ops: {
            scopeSubject: "agent:main",
          },
        },
        createdAt: now,
        updatedAt: now,
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
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    const matches = await provider.findByIdPrefix("f9ed12f4", "agent:main", 2);

    expect(matches.map((entry) => entry.id)).toEqual([
      "f9ed12f4-1111-4111-8111-111111111111",
    ]);
    const pipeline = aggregate.mock.calls[0]?.[2] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toMatchObject({
      $match: {
        $and: [
          expect.any(Object),
          {
            _id: {
              $regex: "^f9ed12f4",
            },
          },
        ],
      },
    });
    expect(JSON.stringify(pipeline[0])).toContain("agent:main");
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
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    const results = await provider.searchByQuery("concise", 5, 0.1, {
      scopeSubject: "agent:main",
      kinds: ["preference"],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.entry.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  test("searchByQuery pushes routing filters into Atlas vector search", async () => {
    const now = Date.now();
    const aggregate = vi.fn().mockResolvedValue([
      {
        _id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        text: "main preference",
        vector: [0.1, 0.2],
        tenantId: "default",
        workspaceId: "default",
        scopeSubject: "agent:main",
        visibility: "private",
        kind: "preference",
        sensitivity: "normal",
        modalities: ["text"],
        category: "preference",
        type: "associative",
        metadata: {
          source: "memory_capture",
          ops: {
            scopeSubject: "agent:main",
            kind: "preference",
          },
        },
        createdAt: now,
        updatedAt: now,
        score: 0.8,
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
      { embed: vi.fn().mockResolvedValue([0.1, 0.2]) } as any,
      "memdb",
      "memories",
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    const results = await provider.searchByQuery("preference", 1, 0.1, {
      scopeSubject: "agent:main",
      kinds: ["preference"],
      modalities: ["text"],
    });

    expect(results).toHaveLength(1);
    const pipeline = aggregate.mock.calls[0]?.[2] as Array<Record<string, any>>;
    expect(pipeline[0]?.$vectorSearch).toEqual(
      expect.objectContaining({
        index: "vector_idx_v2",
        filter: {
          tenantId: "default",
          workspaceId: "default",
          visibility: "private",
          scopeSubject: "agent:main",
          sensitivity: "normal",
          kind: "preference",
          modalities: "text",
        },
      }),
    );
  });

  test("searchByQuery fallback filters out more similar memories from another scope", async () => {
    const now = Date.now();
    const aggregate = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          _id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          text: "other scope but closer",
          vector: [0.1, 0.2],
          scopeSubject: "agent:other",
          visibility: "private",
          kind: "fact",
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
          score: 0.99,
        },
        {
          _id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          text: "main scope but lower score",
          vector: [0.1, 0.2],
          scopeSubject: "agent:main",
          visibility: "private",
          kind: "fact",
          category: "fact",
          type: "semantic",
          metadata: {
            source: "memory_capture",
            ops: {
              scopeSubject: "agent:main",
              kind: "fact",
            },
          },
          createdAt: now,
          updatedAt: now,
          score: 0.7,
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
      { embed: vi.fn().mockResolvedValue([0.1, 0.2]) } as any,
      "memdb",
      "memories",
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    const results = await provider.searchByQuery("same meaning", 5, 0.1, {
      scopeSubject: "agent:main",
      kinds: ["fact"],
    });

    expect(results.map((result) => result.entry.id)).toEqual([
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
    expect(aggregate).toHaveBeenCalledTimes(2);
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
      "memory_events",
      "vector_idx",
      baseRouting,
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
      "memory_events",
      "vector_idx",
      baseRouting,
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
            $or: [
              {
                tenantId: "default",
                workspaceId: "default",
                scopeSubject: "agent:main",
              },
              {
                "metadata.ops.scopeSubject": "agent:main",
                $and: [
                  {
                    $or: [{ tenantId: "default" }, { tenantId: { $exists: false } }],
                  },
                  {
                    $or: [{ workspaceId: "default" }, { workspaceId: { $exists: false } }],
                  },
                  {
                    $or: [
                      { "metadata.ops.tenantId": "default" },
                      { "metadata.ops.tenantId": { $exists: false } },
                    ],
                  },
                  {
                    $or: [
                      { "metadata.ops.workspaceId": "default" },
                      { "metadata.ops.workspaceId": { $exists: false } },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ]),
    );
  });

  test("listByScope includes tenant and workspace constraints for routed records", async () => {
    const aggregate = vi.fn().mockResolvedValue([]);
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
      "memory_events",
      "vector_idx",
      {
        ...baseRouting,
        tenantId: "tenant-a",
        workspaceId: "workspace-a",
      },
      baseRetrieval,
    );

    await provider.listByScope("agent:main", 10);
    const pipeline = aggregate.mock.calls[0]?.[2] as Array<Record<string, any>>;
    expect(pipeline[0]?.$match.$or[0]).toEqual({
      tenantId: "tenant-a",
      workspaceId: "workspace-a",
      scopeSubject: "agent:main",
    });
    expect(pipeline[0]?.$match.$or[1].$and).toEqual(
      expect.arrayContaining([
        { $or: [{ tenantId: "tenant-a" }, { tenantId: { $exists: false } }] },
        { $or: [{ workspaceId: "workspace-a" }, { workspaceId: { $exists: false } }] },
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
      "memory_events",
      "vector_idx",
      baseRouting,
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
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    const results = await provider.listByScope("agent:main", 2);
    expect(results).toHaveLength(2);
    expect(results.map((entry) => entry.text)).toEqual(["safe 1", "safe 2"]);
  });

  test("backfillOps dry-run reports eligible missing-ops records without mutating", async () => {
    const aggregate = vi
      .fn()
      .mockResolvedValueOnce([
        {
          _id: "legacy-1",
          text: "The user prefers concise closeouts.",
          category: "preference",
          type: "semantic",
          metadata: {
            source: "manual_legacy",
          },
        },
      ])
      .mockResolvedValueOnce([]);
    const updateMany = vi.fn();
    const insertMany = vi.fn();
    const provider = new MongoMemoryDB(
      {
        insertMany,
        aggregate,
        updateMany,
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    const result = await provider.backfillOps({
      dryRun: true,
      scopeSubject: "agent:daisy",
      batchSize: 50,
    });

    expect(result).toEqual(
      expect.objectContaining({
        dryRun: true,
        scopeSubject: "agent:daisy",
        tenantId: "default",
        workspaceId: "default",
        scanned: 1,
        eligible: 1,
        updated: 0,
        skipped: 0,
        failed: 0,
        sampleIds: ["legacy-1"],
        errors: [],
      }),
    );
    expect(aggregate).toHaveBeenCalledWith(
      "memdb",
      "memories",
      expect.arrayContaining([
        {
          $match: {
            "metadata.ops": { $exists: false },
          },
        },
      ]),
    );
    expect(updateMany).not.toHaveBeenCalled();
    expect(insertMany).not.toHaveBeenCalled();
  });

  test("backfillOps applies ops and top-level routing fields to ambiguous legacy records", async () => {
    const aggregate = vi
      .fn()
      .mockResolvedValueOnce([
        {
          _id: "legacy-ambiguous",
          text: "DAISy uses concise closeouts.",
          category: "fact",
          type: "semantic",
          metadata: {
            attachmentSummary: "one PDF summary",
          },
        },
      ])
      .mockResolvedValueOnce([]);
    const updateMany = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const insertMany = vi.fn().mockResolvedValue(1);
    const provider = new MongoMemoryDB(
      {
        insertMany,
        aggregate,
        updateMany,
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    const result = await provider.backfillOps({
      dryRun: false,
      scopeSubject: "agent:daisy",
    });

    expect(result.updated).toBe(1);
    expect(updateMany).toHaveBeenCalledWith(
      "memdb",
      "memories",
      {
        _id: "legacy-ambiguous",
        "metadata.ops": { $exists: false },
      },
      {
        $set: expect.objectContaining({
          tenantId: "default",
          workspaceId: "default",
          scopeSubject: "agent:daisy",
          subjectType: "agent",
          visibility: "private",
          kind: "fact",
          status: "recorded",
          sensitivity: "normal",
          modalities: ["text"],
          "metadata.source": "legacy_backfill",
          "metadata.ops": expect.objectContaining({
            tenantId: "default",
            workspaceId: "default",
            scopeSubject: "agent:daisy",
            subjectType: "agent",
            visibility: "private",
            kind: "fact",
            status: "recorded",
            sensitivity: "normal",
            modalities: ["text"],
            confidence: 1,
            contentHash: expect.any(String),
          }),
        }),
      },
    );
    expect(insertMany).toHaveBeenCalledWith("memdb", "memory_events", [
      expect.objectContaining({
        tenantId: "default",
        workspaceId: "default",
        scopeSubject: "agent:daisy",
        subjectType: "agent",
        actor: "memory-mongodb-cli",
        operation: "backfill_ops",
        status: "applied",
        memoryIds: ["legacy-ambiguous"],
        details: expect.objectContaining({
          scanned: 1,
          eligible: 1,
          updated: 1,
        }),
      }),
    ]);
  });

  test("backfillOps preserves existing top-level subagent routing and metadata source", async () => {
    const aggregate = vi
      .fn()
      .mockResolvedValueOnce([
        {
          _id: "legacy-finn",
          text: "Finn prefers compact issue summaries.",
          category: "preference",
          type: "semantic",
          tenantId: "tenant-finn",
          workspaceId: "workspace-finn",
          scopeSubject: "agent:finn",
          subjectType: "agent",
          visibility: "project",
          kind: "preference",
          status: "observed",
          sensitivity: "normal",
          modalities: ["text"],
          metadata: {
            source: "legacy_manual",
            author: "user",
          },
        },
      ])
      .mockResolvedValueOnce([]);
    const updateMany = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const provider = new MongoMemoryDB(
      {
        insertMany: vi.fn().mockResolvedValue(1),
        aggregate,
        updateMany,
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    await provider.backfillOps({
      dryRun: false,
      scopeSubject: "agent:daisy",
    });

    const update = updateMany.mock.calls[0]?.[3] as { $set: Record<string, unknown> };
    expect(update.$set["metadata.source"]).toBeUndefined();
    expect(update.$set.scopeSubject).toBeUndefined();
    expect(update.$set.tenantId).toBeUndefined();
    expect(update.$set.workspaceId).toBeUndefined();
    expect(update.$set["metadata.ops"]).toEqual(
      expect.objectContaining({
        tenantId: "tenant-finn",
        workspaceId: "workspace-finn",
        scopeSubject: "agent:finn",
        subjectType: "agent",
        visibility: "project",
        kind: "preference",
        status: "observed",
        sensitivity: "normal",
      }),
    );
  });

  test("backfillOps keeps existing ops records out of the scan", async () => {
    const aggregate = vi.fn().mockResolvedValue([]);
    const provider = new MongoMemoryDB(
      {
        insertMany: vi.fn(),
        aggregate,
        updateMany: vi.fn(),
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    await provider.backfillOps({
      dryRun: true,
      scopeSubject: "agent:daisy",
    });

    const pipeline = aggregate.mock.calls[0]?.[2] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: {
        "metadata.ops": { $exists: false },
      },
    });
  });

  test("backfillOps dry-run paginates all eligible records without update mutations", async () => {
    const aggregate = vi
      .fn()
      .mockResolvedValueOnce([
        {
          _id: "legacy-page-1",
          text: "first legacy fact",
          category: "fact",
          type: "semantic",
        },
      ])
      .mockResolvedValueOnce([
        {
          _id: "legacy-page-2",
          text: "second legacy fact",
          category: "fact",
          type: "semantic",
        },
      ])
      .mockResolvedValueOnce([]);
    const updateMany = vi.fn();
    const provider = new MongoMemoryDB(
      {
        insertMany: vi.fn(),
        aggregate,
        updateMany,
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    const result = await provider.backfillOps({
      dryRun: true,
      scopeSubject: "agent:daisy",
      batchSize: 1,
    });

    expect(result.scanned).toBe(2);
    expect(result.eligible).toBe(2);
    expect(result.sampleIds).toEqual(["legacy-page-1", "legacy-page-2"]);
    expect(updateMany).not.toHaveBeenCalled();
    expect(aggregate).toHaveBeenCalledTimes(3);
    expect(aggregate.mock.calls[1]?.[2]).toEqual(
      expect.arrayContaining([
        {
          $skip: 1,
        },
      ]),
    );
  });

  test("backfillOps normalizes unsupported legacy kind values in metadata.ops", async () => {
    const aggregate = vi
      .fn()
      .mockResolvedValueOnce([
        {
          _id: "legacy-invalid-kind",
          text: "legacy record with odd kind",
          category: "decision",
          type: "semantic",
          kind: "miscellaneous",
        },
      ])
      .mockResolvedValueOnce([]);
    const updateMany = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const provider = new MongoMemoryDB(
      {
        insertMany: vi.fn().mockResolvedValue(1),
        aggregate,
        updateMany,
        deleteOne: vi.fn(),
        countDocuments: vi.fn(),
        close: vi.fn(),
      } as any,
      { embed: vi.fn() } as any,
      "memdb",
      "memories",
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    await provider.backfillOps({
      dryRun: false,
      scopeSubject: "agent:daisy",
    });

    const update = updateMany.mock.calls[0]?.[3] as { $set: Record<string, unknown> };
    expect(update.$set.kind).toBeUndefined();
    expect(update.$set["metadata.ops"]).toEqual(
      expect.objectContaining({
        kind: "decision",
        status: "recorded",
      }),
    );
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
      "memory_events",
      "vector_idx",
      baseRouting,
      baseRetrieval,
    );

    await expect(provider.getById("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).resolves.toBeNull();
  });
});
