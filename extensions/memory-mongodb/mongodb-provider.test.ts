import { beforeEach, describe, expect, test, vi } from "vitest";

const connect = vi.fn();
const close = vi.fn();
const insertOne = vi.fn();
const findOne = vi.fn();
const deleteOne = vi.fn();
const deleteMany = vi.fn();
const countDocuments = vi.fn();
const aggregateToArray = vi.fn();
const aggregate = vi.fn(() => ({ toArray: aggregateToArray }));
const collection = vi.fn(() => ({
  insertOne,
  findOne,
  deleteOne,
  deleteMany,
  countDocuments,
  aggregate,
}));
const db = vi.fn(() => ({ collection }));

const MongoClient = vi.fn(function MongoClientMock(this: unknown) {
  return { connect, close, db };
});

vi.mock("mongodb", () => ({
  MongoClient,
}));

describe("mongodb provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteMany.mockResolvedValue({});
    countDocuments.mockResolvedValue(0);
  });

  test("store persists records via MongoDB collection", async () => {
    const { MongoMemoryDB } = await import("./mongodb-provider.js");
    const provider = new MongoMemoryDB("mongodb://localhost:27017", "memdb", "memories", "vector_idx");

    const record = await provider.store({
      text: "remember this",
      vector: [0.1, 0.2],
      importance: 0.7,
      category: "fact",
    });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(insertOne).toHaveBeenCalledTimes(1);
    expect(insertOne).toHaveBeenCalledWith({
      _id: record.id,
      text: "remember this",
      vector: [0.1, 0.2],
      importance: 0.7,
      category: "fact",
      createdAt: expect.any(Number),
    });
  });

  test("search uses Atlas vector search pipeline", async () => {
    const { MongoMemoryDB } = await import("./mongodb-provider.js");
    aggregateToArray.mockResolvedValue([
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
    const provider = new MongoMemoryDB("mongodb://localhost:27017", "memdb", "memories", "vector_idx");

    const results = await provider.search([0.9, 0.1], 4, 0.2);

    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(aggregate).toHaveBeenCalledWith([
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
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].entry.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(results[0].score).toBe(0.88);
  });

  test("get/delete validate UUID format", async () => {
    const { MongoMemoryDB } = await import("./mongodb-provider.js");
    const provider = new MongoMemoryDB("mongodb://localhost:27017", "memdb", "memories", "vector_idx");

    await expect(provider.get("not-a-uuid")).rejects.toThrow("Invalid memory ID format");
    await expect(provider.delete("not-a-uuid")).rejects.toThrow("Invalid memory ID format");

    findOne.mockResolvedValue(null);
    deleteOne.mockResolvedValue({ deletedCount: 1 });

    await expect(provider.get("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).resolves.toBeNull();
    await expect(provider.delete("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).resolves.toBe(true);
  });
});
