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
          limit: 4,
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
    const mcp = {
      insertMany: vi.fn(),
      aggregate: vi.fn(),
      deleteOne: vi.fn().mockResolvedValue(true),
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
  });
});