import { describe, expect, it } from "vitest";
import { fetchDiscordApplicationId, parseApplicationIdFromToken } from "./probe.js";

describe("parseApplicationIdFromToken", () => {
  it("extracts application ID from a valid token", () => {
    // "1234567890" base64-encoded is "MTIzNDU2Nzg5MA=="
    const token = `${Buffer.from("1234567890").toString("base64")}.timestamp.hmac`;
    expect(parseApplicationIdFromToken(token)).toBe("1234567890");
  });

  it("extracts large snowflake IDs without precision loss", () => {
    // ID that exceeds Number.MAX_SAFE_INTEGER (2^53 - 1 = 9007199254740991)
    const largeId = "1477179610322964541";
    const token = `${Buffer.from(largeId).toString("base64")}.GhIiP9.vU1xEpJ6NjFm`;
    expect(parseApplicationIdFromToken(token)).toBe(largeId);
  });

  it("handles tokens with Bot prefix", () => {
    const token = `Bot ${Buffer.from("9876543210").toString("base64")}.ts.hmac`;
    expect(parseApplicationIdFromToken(token)).toBe("9876543210");
  });

  it("returns undefined for empty string", () => {
    expect(parseApplicationIdFromToken("")).toBeUndefined();
  });

  it("returns undefined for token without dots", () => {
    expect(parseApplicationIdFromToken("nodots")).toBeUndefined();
  });

  it("returns undefined when decoded segment is not numeric", () => {
    const token = `${Buffer.from("not-a-number").toString("base64")}.ts.hmac`;
    expect(parseApplicationIdFromToken(token)).toBeUndefined();
  });

  it("returns undefined for whitespace-only input", () => {
    expect(parseApplicationIdFromToken("   ")).toBeUndefined();
  });

  it("returns undefined when first segment is empty (starts with dot)", () => {
    expect(parseApplicationIdFromToken(".ts.hmac")).toBeUndefined();
  });
});

describe("fetchDiscordApplicationId", () => {
  const tokenId = "1477179610322964541";
  const token = `${Buffer.from(tokenId).toString("base64")}.GhIiP9.vU1xEpJ6NjFm`;

  it("falls back to the token-derived application ID on request timeout responses", async () => {
    const fetcher = async () => new Response("Request Timeout", { status: 408 });

    await expect(fetchDiscordApplicationId(token, 1000, fetcher as typeof fetch)).resolves.toBe(
      tokenId,
    );
  });

  it("returns application ID from Discord when the application probe succeeds", async () => {
    const fetcher = async () => new Response(JSON.stringify({ id: "app-from-api" }));

    await expect(fetchDiscordApplicationId(token, 1000, fetcher as typeof fetch)).resolves.toBe(
      "app-from-api",
    );
  });

  it("falls back to the token-derived application ID when Discord responds without an id", async () => {
    const fetcher = async () => new Response(JSON.stringify({}));

    await expect(fetchDiscordApplicationId(token, 1000, fetcher as typeof fetch)).resolves.toBe(
      tokenId,
    );
  });

  it("falls back to the token-derived application ID on transient Discord responses", async () => {
    const fetcher = async () => new Response("Gateway time-out", { status: 504 });

    await expect(fetchDiscordApplicationId(token, 1000, fetcher as typeof fetch)).resolves.toBe(
      tokenId,
    );
  });

  it("falls back to the token-derived application ID on rate limit responses", async () => {
    const fetcher = async () => new Response("rate limited", { status: 429 });

    await expect(fetchDiscordApplicationId(token, 1000, fetcher as typeof fetch)).resolves.toBe(
      tokenId,
    );
  });

  it("falls back to the token-derived application ID on transport errors", async () => {
    const fetcher = async () => {
      throw new Error("network timeout");
    };

    await expect(fetchDiscordApplicationId(token, 1000, fetcher as typeof fetch)).resolves.toBe(
      tokenId,
    );
  });

  it("does not mask credential failures with a token-derived application ID", async () => {
    const fetcher = async () => new Response("Unauthorized", { status: 401 });

    await expect(
      fetchDiscordApplicationId(token, 1000, fetcher as typeof fetch),
    ).resolves.toBeUndefined();
  });
});
