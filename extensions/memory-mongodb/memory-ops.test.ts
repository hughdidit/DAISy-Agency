import { randomUUID } from "node:crypto";
import { describe, expect, test, vi } from "vitest";
import { MemoryOpsService, resolveScopeSubjectFromContext } from "./memory-ops-service.js";

function createService(overrides?: Partial<Record<string, any>>) {
  const db = {
    searchByQuery: vi.fn().mockResolvedValue([]),
    store: vi.fn().mockImplementation(async (entry) => ({
      id: randomUUID(),
      text: entry.text ?? "",
      vector: [0.1, 0.2],
      importance: entry.importance,
      category: entry.category,
      subCategory: entry.subCategory,
      type: entry.type,
      metadata: entry.metadata,
      tags: entry.tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })),
    delete: vi.fn().mockResolvedValue(true),
    listByScope: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    ...overrides,
  };

  const service = new MemoryOpsService(db as any, {
    enabled: true,
    preferenceMinObservations: 2,
    preferenceMinStabilityScore: 0.8,
    captureMinConfidence: 0.7,
    hygieneMaxCandidates: 25,
    auditCleanup: true,
    supportedDocumentMimeTypes: ["application/pdf", "text/markdown"],
    maxInlineDocumentBytesByMime: {
      "application/pdf": 2000000,
      "text/markdown": 2000000,
    },
    schemaMode: "additive",
  });

  return { db, service };
}

describe("memory ops service", () => {
  test("resolves agent and subagent scope subjects", () => {
    expect(
      resolveScopeSubjectFromContext({
        agentId: "main",
        sessionKey: "agent:main:main",
      } as any),
    ).toBe("agent:main");

    expect(
      resolveScopeSubjectFromContext({
        agentId: "ops",
        sessionKey: "agent:ops:subagent:investigate",
      } as any),
    ).toBe("subagent:investigate");
  });

  test("capture rejects low confidence and secret-like content", async () => {
    const { service } = createService();

    const result = await service.capture({
      scopeSubject: "agent:main",
      source: "test",
      entries: [
        {
          text: "apiKey=super-secret",
          kind: "fact",
          importance: 0.8,
          confidence: 0.9,
        },
        {
          text: "safe text",
          kind: "fact",
          importance: 0.8,
          confidence: 0.5,
        },
      ],
    });

    expect(result.outcomes[0]?.status).toBe("rejected_secret");
    expect(result.outcomes[1]?.status).toBe("rejected_low_confidence");
    expect(result.outcomes[0]?.reason).toContain("sensitivity=secret");
  });

  test("capture accepts explicitly classified secret entries and stores sensitivity metadata", async () => {
    const { service, db } = createService();

    const result = await service.capture({
      scopeSubject: "agent:main",
      source: "test",
      entries: [
        {
          text: "apiKey=super-secret",
          kind: "fact",
          importance: 0.8,
          confidence: 0.9,
          sensitivity: "secret",
        },
      ],
    });

    expect(result.outcomes[0]?.status).toBe("created");
    expect(db.store).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          source: "test",
          ops: expect.objectContaining({
            sensitivity: "secret",
          }),
        },
      }),
    );
  });

  test("capture marks duplicates from existing hash match", async () => {
    const existing = {
      entry: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        text: "existing",
        vector: [0.1],
        importance: 0.9,
        category: "fact",
        type: "semantic",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          source: "memory_capture",
          ops: {
            scopeSubject: "agent:main",
            contentHash: "abc",
          },
        },
      },
      score: 0.99,
      vectorScore: 0.99,
    };
    const { service, db } = createService({
      searchByQuery: vi.fn().mockResolvedValue([existing]),
    });

    const result = await service.capture({
      scopeSubject: "agent:main",
      source: "test",
      entries: [
        {
          text: "existing",
          kind: "fact",
          importance: 0.9,
          confidence: 1,
        },
      ],
    });

    expect(result.outcomes[0]?.status).toBe("duplicate");
    expect(db.store).not.toHaveBeenCalled();
  });

  test("hygiene plan mode returns deterministic plan envelope", async () => {
    const { service } = createService({
      listByScope: vi.fn().mockResolvedValue([]),
    });

    const result = await service.memoryHygiene({
      mode: "plan",
      scopeSubject: "agent:main",
    });

    expect(result.mode).toBe("plan");
    expect(result.plan.scopeSubject).toBe("agent:main");
    expect(Array.isArray(result.plan.actions)).toBe(true);
  });

  test("hygiene ignores secret entries", async () => {
    const now = Date.now();
    const { service } = createService({
      listByScope: vi.fn().mockResolvedValue([
        {
          id: "secret-pref",
          text: "apiKey=super-secret",
          vector: [0.1],
          importance: 0.9,
          category: "preference",
          type: "associative",
          metadata: {
            source: "memory_capture",
            ops: {
              scopeSubject: "agent:main",
              kind: "preference",
              sensitivity: "secret",
              status: "observed",
              preference: { key: "api_key", value: "super-secret" },
            },
          },
          createdAt: now,
          updatedAt: now,
        },
      ]),
    });

    const result = await service.memoryHygiene({
      mode: "plan",
      scopeSubject: "agent:main",
    });

    expect(result.plan.actions).toEqual([]);
  });

  test("commitment tracker supports capture and list_open", async () => {
    const now = Date.now();
    const { service, db } = createService({
      listByScope: vi.fn().mockResolvedValue([
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          text: "Follow up",
          vector: [0.1],
          importance: 0.9,
          category: "decision",
          type: "procedural",
          metadata: {
            source: "commitment_tracker",
            ops: {
              scopeSubject: "agent:main",
              kind: "commitment",
              status: "open",
              owner: "agent",
            },
          },
          createdAt: now,
          updatedAt: now,
        },
      ]),
    });

    const captured = await service.commitmentTracker({
      mode: "capture",
      scopeSubject: "agent:main",
      text: "Follow up",
      owner: "agent",
    });
    expect(captured.mode).toBe("capture");
    expect(db.store).toHaveBeenCalled();

    const listed = await service.commitmentTracker({
      mode: "list_open",
      scopeSubject: "agent:main",
    });
    expect(listed.count).toBe(1);
  });

  test("preference miner plans promotions from repeated observations", async () => {
    const now = Date.now();
    const { service } = createService({
      listByScope: vi.fn().mockResolvedValue([
        {
          id: "a",
          text: "response_style: concise",
          vector: [0.1],
          importance: 0.7,
          category: "preference",
          type: "associative",
          metadata: {
            source: "preference_miner",
            ops: {
              scopeSubject: "agent:main",
              kind: "preference",
              status: "observed",
              preference: { key: "response_style", value: "concise" },
            },
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "b",
          text: "response_style: concise",
          vector: [0.1],
          importance: 0.7,
          category: "preference",
          type: "associative",
          metadata: {
            source: "preference_miner",
            ops: {
              scopeSubject: "agent:main",
              kind: "preference",
              status: "observed",
              preference: { key: "response_style", value: "concise" },
            },
          },
          createdAt: now,
          updatedAt: now,
        },
      ]),
    });

    const plan = await service.preferenceMiner({
      mode: "plan_promotions",
      scopeSubject: "agent:main",
    });

    const promotions = (plan as { promotions?: unknown }).promotions;
    expect(Array.isArray(promotions)).toBe(true);
    expect(promotions).toHaveLength(1);
  });

  test("preference miner ignores secret-bearing preference records", async () => {
    const now = Date.now();
    const { service } = createService({
      listByScope: vi.fn().mockResolvedValue([
        {
          id: "secret-pref",
          text: "apiKey: super-secret",
          vector: [0.1],
          importance: 0.7,
          category: "preference",
          type: "associative",
          metadata: {
            source: "memory_capture",
            ops: {
              scopeSubject: "agent:main",
              kind: "preference",
              sensitivity: "secret",
              status: "observed",
              preference: { key: "api_key", value: "super-secret" },
            },
          },
          createdAt: now,
          updatedAt: now,
        },
      ]),
    });

    const plan = await service.preferenceMiner({
      mode: "plan_promotions",
      scopeSubject: "agent:main",
    });

    expect((plan as { promotions?: unknown[] }).promotions ?? []).toHaveLength(0);

    const list = await service.preferenceMiner({
      mode: "list",
      scopeSubject: "agent:main",
    });

    expect(list.count).toBe(0);
  });

  test("recall excludes secrets by default and includes them only when requested", async () => {
    const now = Date.now();
    const { service } = createService({
      searchByQuery: vi.fn().mockImplementation(async (_query, _limit, _minScore, filters) => {
        if (filters?.includeSecrets) {
          return [
            {
              entry: {
                id: "secret-memory",
                text: "apiKey=super-secret",
                vector: [0.1],
                importance: 0.9,
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
              },
              score: 0.9,
              vectorScore: 0.9,
            },
          ];
        }
        return [];
      }),
    });

    const excluded = await service.recall({
      query: "api key",
      scopeSubject: "agent:main",
      filters: {},
    });
    expect(excluded.count).toBe(0);

    const included = await service.recall({
      query: "api key",
      scopeSubject: "agent:main",
      filters: { includeSecrets: true },
    });
    expect(included.count).toBe(1);
    expect(included.memories[0]?.sensitivity).toBe("secret");
    expect(included.memories[0]?.text).toBe("apiKey=super-secret");
  });

  test("memory audit reports failure when recall misses probe", async () => {
    const { service, db } = createService({
      searchByQuery: vi.fn().mockResolvedValue([]),
    });

    const result = await service.memoryAudit({
      scopeSubject: "agent:main",
      runId: "test-run",
      cleanupOnSuccess: true,
    });

    expect(result.pass).toBe(false);
    expect(db.store).toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });
});
