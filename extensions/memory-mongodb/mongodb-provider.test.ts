import { beforeEach, describe, expect, test, vi } from "vitest";

const insertMany = vi.fn();
const aggregate = vi.fn();
const find = vi.fn();
const deleteOne = vi.fn();
const deleteMany = vi.fn();
const start = vi.fn();
const stop = vi.fn();

class MockMongoMcpClient {
  insertMany = insertMany;
  aggregate = aggregate;
  find = find;
  deleteOne = deleteOne;
  deleteMany = deleteMany;
  start = start;
  stop = stop;
}

describe("mongodb provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteMany.mockResolvedValue({ deletedCount: 0 });
    aggregate.mockResolvedValue([]);
  });

  test("store persists records via MCP insertMany", async () => {
    const { MongoMemoryDB } = await import("./mongodb-provider.js");
    const provider = new MongoMemoryDB(
      new MockMongoMcpClient() as never,
      "memdb",
      "memories",
      "vector_idx",
    );

    const record = await provider.store({
      text: "remember this",
      vector: [0.1, 0.2],
      importance: 0.7,
      category: "fact",
    });

    expect(insertMany).toHaveBeenCalledTimes(1);
    expect(insertMany).toHaveBeenCalledWith({
      database: "memdb",
      collection: "memories",
      documents: [
        {
          _id: record.id,
          text: "remember this",
          vector: [0.1, 0.2],
          importance: 0.7,
          category: "fact",
          createdAt: expect.any(Number),
        },
      ],
    });
  });

  test("search uses Atlas vector search pipeline via aggregate", async () => {
    const { MongoMemoryDB } = await import("./mongodb-provider.js");
    aggregate.mockResolvedValue([
      {
        _id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        text: "result",
        vector: [0.9, 0.1],
        importance: 1,
        category: "fact",
        createdAt: Date.now(),
        score: 0.88,
      },
    ]);

    const provider = new MongoMemoryDB(
      new MockMongoMcpClient() as never,
      "memdb",
      "memories",
      "vector_idx",
    );

    const results = await provider.search([0.9, 0.1], 4, 0.2);

    expect(aggregate).toHaveBeenCalledWith({
      database: "memdb",
      collection: "memories",
      pipeline: [
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
          $addFields: { score: { $meta: "vectorSearchScore" } },
        },
        {
          $match: { score: { $gte: 0.2 } },
        },
      ],
    });
    expect(results).toHaveLength(1);
    expect(results[0].entry.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(results[0].score).toBe(0.88);
  });

  test("get/delete validate UUID format", async () => {
    const { MongoMemoryDB } = await import("./mongodb-provider.js");
    const provider = new MongoMemoryDB(
      new MockMongoMcpClient() as never,
      "memdb",
      "memories",
      "vector_idx",
    );

    await expect(provider.get("not-a-uuid")).rejects.toThrow("Invalid memory ID format");
    await expect(provider.delete("not-a-uuid")).rejects.toThrow("Invalid memory ID format");

    find.mockResolvedValue([]);
    deleteOne.mockResolvedValue({ deletedCount: 1 });

    await expect(provider.get("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).resolves.toBeNull();
    await expect(provider.delete("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).resolves.toBe(true);
  });
});
