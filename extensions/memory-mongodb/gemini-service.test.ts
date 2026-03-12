import { afterEach, describe, expect, test, vi } from "vitest";
import { GeminiService } from "./gemini-service.js";

describe("gemini service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("normalizes a single embedding response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          embedding: {
            values: [3, 4, 0],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const service = new GeminiService("api-key", "gemini-embedding-2-preview", 3);
    const result = await service.embed([{ text: "hello" }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result[0]).toBeCloseTo(0.6, 6);
    expect(result[1]).toBeCloseTo(0.8, 6);
    expect(result[2]).toBeCloseTo(0, 6);
  });

  test("mean-pools chunked responses and normalizes final vector", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            embedding: {
              values: [1, 0, 0],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            embedding: {
              values: [0, 1, 0],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const parts = [
      {
        inlineData: {
          mimeType: "image/png" as const,
          data: "ZmFrZQ==",
        },
      },
      {
        inlineData: {
          mimeType: "image/png" as const,
          data: "ZmFrZQ==",
        },
      },
      {
        inlineData: {
          mimeType: "image/png" as const,
          data: "ZmFrZQ==",
        },
      },
      {
        inlineData: {
          mimeType: "image/png" as const,
          data: "ZmFrZQ==",
        },
      },
      {
        inlineData: {
          mimeType: "image/png" as const,
          data: "ZmFrZQ==",
        },
      },
      {
        inlineData: {
          mimeType: "image/png" as const,
          data: "ZmFrZQ==",
        },
      },
      {
        inlineData: {
          mimeType: "image/png" as const,
          data: "ZmFrZQ==",
        },
      },
    ];

    const service = new GeminiService("api-key", "gemini-embedding-2-preview", 3);
    const result = await service.embed(parts);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result[0]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(result[1]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(result[2]).toBeCloseTo(0, 6);
  });

  test("throws when dimensionality does not match requested output size", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          embedding: {
            values: [1, 2],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const service = new GeminiService("api-key", "gemini-embedding-2-preview", 3);

    await expect(service.embed([{ text: "hello" }])).rejects.toThrow("dimensionality mismatch");
  });
});
