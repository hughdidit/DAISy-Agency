import { createHash } from "node:crypto";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const body = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",");
  return `{${body}}`;
}

export function stableHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

export function stableId(prefix: string, value: unknown): string {
  return `${prefix}_${stableHash(value)}`;
}

export function isoFromSeed(seed: number, offset = 0): string {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0);
  const seconds = Math.abs(Math.trunc(seed + offset)) % 31_536_000;
  return new Date(base + seconds * 1000).toISOString();
}
