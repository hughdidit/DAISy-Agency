import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import { MemoryAutonomyService, rankMemorySearchResults } from "./memory-autonomy-service.js";
import type { MemoryStoreInput } from "./mongodb-provider.js";

function entry(overrides: Partial<FixtureMemoryEntry> = {}): FixtureMemoryEntry {
  const now = Date.now();
  return {
    id: randomUUID(),
    text: "durable lesson",
    vector: [0.1],
    importance: 0.7,
    category: "fact",
    type: "semantic",
    scopeSubject: "agent:main",
    sensitivity: "normal",
    metadata: {
      source: "fixture",
      ops: {
        kind: "fact",
        source: "fixture",
        scopeSubject: "agent:main",
        sensitivity: "normal",
        confidence: 0.8,
        contentHash: randomUUID(),
      },
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type FixtureMemoryEntry = {
  id: string;
  text: string;
  vector: number[];
  importance: number;
  category: "fact" | "preference" | "decision" | "entity" | "other";
  type: "semantic" | "episodic" | "procedural" | "working" | "cache" | "associative";
  scopeSubject?: string;
  sensitivity?: "normal" | "secret";
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
};

class FixtureMemoryDb {
  readonly events: Array<Record<string, unknown>> = [];

  constructor(readonly records: FixtureMemoryEntry[]) {}

  async listByScope(scopeSubject: string): Promise<FixtureMemoryEntry[]> {
    return this.records.filter((record) => record.scopeSubject === scopeSubject);
  }

  async getById(id: string): Promise<FixtureMemoryEntry | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async store(input: MemoryStoreInput): Promise<FixtureMemoryEntry> {
    const stored = entry({
      text: input.text ?? "",
      importance: input.importance,
      category: input.category,
      type: input.type,
      metadata: input.metadata,
      tags: input.tags,
    });
    this.records.push(stored);
    return stored;
  }

  async patchMemoryOpsMetadata(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    const found = this.records.find((record) => record.id === id);
    if (!found) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    const metadata = found.metadata ?? {};
    const ops =
      metadata.ops && typeof metadata.ops === "object" && !Array.isArray(metadata.ops)
        ? metadata.ops
        : {};
    found.metadata = {
      ...metadata,
      ops: {
        ...ops,
        ...patch,
      },
    };
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async recordEvent(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.events.push(input);
    return input;
  }
}

describe("memory autonomy service", () => {
  test("backfills usefulness metadata on existing records without changing memory kind", async () => {
    const db = new FixtureMemoryDb([entry({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" })]);
    const service = new MemoryAutonomyService(db);

    const result = await service.backfillScores({
      dryRun: false,
      scopeSubject: "agent:main",
      agentId: "main",
    });

    expect(result.updated).toBe(1);
    expect(db.records[0]?.metadata?.ops).toMatchObject({
      kind: "fact",
      usefulness: {
        backfillVersion: "2026-05-phase2-v1",
      },
      agentUsefulness: {
        main: {
          recallCount: expect.any(Number),
        },
      },
    });
    expect(db.events.at(-1)?.operation).toBe("memory_usefulness_backfilled");
  });

  test("dry-run reports usefulness backfill without writing", async () => {
    const db = new FixtureMemoryDb([entry()]);
    const service = new MemoryAutonomyService(db);

    const result = await service.backfillScores({ dryRun: true, scopeSubject: "agent:main" });

    expect(result.planned).toBe(1);
    expect(result.updated).toBe(0);
    expect(db.records[0]?.metadata?.ops).not.toHaveProperty("usefulness");
    expect(db.events).toHaveLength(0);
  });

  test("secret records are skipped for broad usefulness promotion", async () => {
    const db = new FixtureMemoryDb([
      entry({
        sensitivity: "secret",
        metadata: {
          source: "fixture",
          ops: {
            kind: "fact",
            source: "fixture",
            scopeSubject: "agent:main",
            sensitivity: "secret",
          },
        },
      }),
    ]);
    const service = new MemoryAutonomyService(db);

    const result = await service.backfillScores({ dryRun: false, scopeSubject: "agent:main" });

    expect(result.skipped).toBe(1);
    expect(result.updated).toBe(0);
  });

  test("per-agent precedence changes recall ranking without changing unrelated agents", () => {
    const mainUseful = entry({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      text: "main useful",
      metadata: {
        ops: {
          kind: "fact",
          scopeSubject: "agent:main",
          agentUsefulness: {
            main: {
              precedence: 1,
              components: {},
              recallCount: 4,
              positiveOutcomeCount: 2,
              correctionCount: 0,
            },
          },
        },
      },
    });
    const otherUseful = entry({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      text: "other useful",
      metadata: {
        ops: {
          kind: "fact",
          scopeSubject: "agent:main",
          agentUsefulness: {
            other: {
              precedence: 1,
              components: {},
              recallCount: 4,
              positiveOutcomeCount: 2,
              correctionCount: 0,
            },
          },
        },
      },
    });

    const ranked = rankMemorySearchResults(
      [
        { entry: otherUseful, score: 0.8, vectorScore: 0.8 },
        { entry: mainUseful, score: 0.8, vectorScore: 0.8 },
      ],
      "main",
    );

    expect(ranked[0]?.entry.id).toBe(mainUseful.id);
  });

  test("dedupe marks duplicates and keeps a retained memory", async () => {
    const duplicateHash = "same-hash";
    const retained = entry({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      importance: 0.9,
      metadata: { ops: { kind: "fact", scopeSubject: "agent:main", contentHash: duplicateHash } },
    });
    const duplicate = entry({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      importance: 0.4,
      metadata: { ops: { kind: "fact", scopeSubject: "agent:main", contentHash: duplicateHash } },
    });
    const db = new FixtureMemoryDb([retained, duplicate]);
    const service = new MemoryAutonomyService(db);

    const result = await service.dedupe({ dryRun: false, scopeSubject: "agent:main" });

    expect(result.updated).toBe(1);
    expect(duplicate.metadata?.ops).toMatchObject({
      dedupe: {
        retainedMemoryId: retained.id,
      },
    });
    expect(db.events.at(-1)?.operation).toBe("memory_dedupe_applied");
  });

  test("compaction creates a summary and marks sources without hard deleting", async () => {
    const old = Date.now() - 1000 * 60 * 60 * 24 * 200;
    const first = entry({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", updatedAt: old });
    const second = entry({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", updatedAt: old });
    const db = new FixtureMemoryDb([first, second]);
    const service = new MemoryAutonomyService(db);

    const result = await service.compact({ dryRun: false, scopeSubject: "agent:main" });

    expect(result.summaryMemoryId).toBeDefined();
    expect(db.records).toHaveLength(3);
    expect(first.metadata?.ops).toMatchObject({
      compaction: {
        status: "source",
        compactedInto: result.summaryMemoryId,
      },
    });
    expect(db.events.at(-1)?.operation).toBe("memory_compaction_applied");
  });
});
