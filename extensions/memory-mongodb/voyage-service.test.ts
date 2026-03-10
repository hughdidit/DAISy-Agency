import { beforeEach, describe, expect, test, vi } from "vitest";

const embed = vi.fn();
const rerank = vi.fn();

vi.mock(
  "voyageai",
  () => ({
    default: vi.fn().mockImplementation(() => ({
      embed,
      rerank,
    })),
  }),
  { virtual: true },
);

describe("voyage service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns embedding vector", async () => {
    const { VoyageService } = await import("./voyage-service.js");
    embed.mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });

    const service = new VoyageService("api-key", "voyage-3-large", "rerank-2");
    const vector = await service.embed("hello");

    expect(vector).toEqual([0.1, 0.2, 0.3]);
  });

  test("throws on missing embedding response", async () => {
    const { VoyageService } = await import("./voyage-service.js");
    embed.mockResolvedValue({ data: [] });

    const service = new VoyageService("api-key", "voyage-3-large", "rerank-2");
    await expect(service.embed("hello")).rejects.toThrow("did not return an embedding");
  });

  test("maps rerank response rows", async () => {
    const { VoyageService } = await import("./voyage-service.js");

    rerank.mockResolvedValue({
      data: [
        { index: 1, relevanceScore: 0.9 },
        { document_index: 0, relevance_score: 0.7 },
      ],
    });

    const service = new VoyageService("api-key", "voyage-3-large", "rerank-2");

    const rows = await service.rerank("query", ["a", "b"], 2);
    expect(rows).toEqual([
      { index: 1, score: 0.9 },
      { index: 0, score: 0.7 },
    ]);
  });
});
