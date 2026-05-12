import { randomUUID } from "node:crypto";
import { describe, expect, test, vi } from "vitest";
import { MemoryOpsService, resolveScopeSubjectFromContext } from "./memory-ops-service.js";

function createService(
  overrides?: Partial<Record<string, any>>,
  auditRecallRetryDelaysMs: readonly number[] = [],
) {
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
    findByIdPrefix: vi.fn().mockResolvedValue([]),
    listByScope: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    recordEvent: vi.fn().mockResolvedValue({}),
    ...overrides,
  };

  const service = new MemoryOpsService(
    db as any,
    {
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
    },
    undefined,
    auditRecallRetryDelaysMs,
  );

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
    expect(db.searchByQuery).toHaveBeenCalledWith("existing", 3, 0, {
      scopeSubject: "agent:main",
      includeSecrets: true,
    });
    expect(db.store).not.toHaveBeenCalled();
  });

  test("capture dedupe ignores same text from another agent scope", async () => {
    const outOfScope = {
      entry: {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        text: "same durable fact",
        vector: [0.1],
        importance: 0.8,
        category: "fact",
        type: "semantic",
        metadata: {
          source: "memory_capture",
          ops: {
            scopeSubject: "agent:other",
            kind: "fact",
            contentHash: "different-scope",
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      score: 0.99,
      vectorScore: 0.99,
    };
    const { service, db } = createService({
      searchByQuery: vi.fn().mockResolvedValue([outOfScope]),
    });

    const result = await service.capture({
      scopeSubject: "agent:main",
      source: "test",
      entries: [{ text: "same durable fact", kind: "fact", importance: 0.8 }],
    });

    expect(result.outcomes[0]?.status).toBe("created");
    expect(db.store).toHaveBeenCalled();
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
    expect(result.plan.planHash).toMatch(/^[a-f0-9]{64}$/);
    expect(Array.isArray(result.plan.actions)).toBe(true);
  });

  test("hygiene apply requires a matching approved plan", async () => {
    const now = Date.now();
    const { service, db } = createService({
      listByScope: vi.fn().mockResolvedValue([
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          text: "stale audit probe",
          vector: [0.1],
          importance: 0.1,
          category: "other",
          type: "episodic",
          metadata: {
            source: "memory_audit",
            ops: {
              scopeSubject: "agent:main",
              kind: "audit",
              status: "probe",
            },
          },
          createdAt: now - 1000 * 60 * 60 * 25,
          updatedAt: now - 1000 * 60 * 60 * 25,
        },
      ]),
    });

    await expect(
      service.memoryHygiene({
        mode: "apply",
        scopeSubject: "agent:main",
      }),
    ).rejects.toThrow("planId and planHash are required");
    expect(db.delete).not.toHaveBeenCalled();

    const planned = await service.memoryHygiene({
      mode: "plan",
      scopeSubject: "agent:main",
      strategies: ["stale-prune"],
    });

    await expect(
      service.memoryHygiene({
        mode: "apply",
        scopeSubject: "agent:main",
        planId: planned.plan.planId,
        planHash: "bad-hash",
        approvedActionIds: planned.plan.actions.map((action) => action.id),
      }),
    ).rejects.toThrow("planHash does not match");
    expect(db.delete).not.toHaveBeenCalled();

    await expect(
      service.memoryHygiene({
        mode: "apply",
        scopeSubject: "agent:other",
        planId: planned.plan.planId,
        planHash: planned.plan.planHash,
        approvedActionIds: planned.plan.actions.map((action) => action.id),
      }),
    ).rejects.toThrow("planId is not valid for the current scope");
    expect(db.delete).not.toHaveBeenCalled();

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(now + 1000 * 60 * 16));
      await expect(
        service.memoryHygiene({
          mode: "apply",
          scopeSubject: "agent:main",
          planId: planned.plan.planId,
          planHash: planned.plan.planHash,
          approvedActionIds: planned.plan.actions.map((action) => action.id),
        }),
      ).rejects.toThrow("planId not found or expired");
    } finally {
      vi.useRealTimers();
    }
    expect(db.delete).not.toHaveBeenCalled();

    const freshPlan = await service.memoryHygiene({
      mode: "plan",
      scopeSubject: "agent:main",
      strategies: ["stale-prune"],
    });

    const applied = await service.memoryHygiene({
      mode: "apply",
      scopeSubject: "agent:main",
      planId: freshPlan.plan.planId,
      planHash: freshPlan.plan.planHash,
      approvedActionIds: freshPlan.plan.actions.map((action) => action.id),
    });
    expect(applied.applied?.deletedIds).toEqual(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
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

  test("commitment tracker hides superseded commitments even when resolution record is secret", async () => {
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
          createdAt: now - 1000,
          updatedAt: now - 1000,
        },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          text: "Resolved with secret note",
          vector: [0.1],
          importance: 0.8,
          category: "decision",
          type: "procedural",
          metadata: {
            source: "commitment_tracker",
            ops: {
              scopeSubject: "agent:main",
              kind: "commitment",
              status: "resolved",
              supersedesId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              owner: "agent",
              sensitivity: "secret",
            },
          },
          createdAt: now,
          updatedAt: now,
        },
      ]),
    });

    const listed = await service.commitmentTracker({
      mode: "list_open",
      scopeSubject: "agent:main",
    });

    expect(db.listByScope).toHaveBeenCalledWith("agent:main", 100, { includeSecrets: true });
    expect(listed.count).toBe(0);
    expect(listed.commitments).toEqual([]);
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

  test("memory audit deletes successful probe records", async () => {
    const fixedId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const now = Date.now();
    const { service, db } = createService({
      store: vi.fn().mockImplementation(async (entry) => ({
        id: fixedId,
        text: entry.text ?? "",
        vector: [0.1, 0.2],
        importance: entry.importance,
        category: entry.category,
        type: entry.type,
        metadata: entry.metadata,
        createdAt: now,
        updatedAt: now,
      })),
      searchByQuery: vi.fn().mockResolvedValue([
        {
          entry: {
            id: fixedId,
            text: "memory-audit-probe-test-run-12345678",
            vector: [0.1, 0.2],
            importance: 0.1,
            category: "other",
            type: "episodic",
            metadata: {
              source: "memory_audit",
              ops: {
                scopeSubject: "agent:main",
                kind: "audit",
                status: "probe",
              },
            },
            createdAt: now,
            updatedAt: now,
          },
          score: 1,
          vectorScore: 1,
        },
      ]),
    });

    const result = await service.memoryAudit({
      scopeSubject: "agent:main",
      runId: "test-run",
      cleanupOnSuccess: true,
    });

    expect(result.pass).toBe(true);
    expect(result.cleanupResult).toBe("deleted");
    expect(db.delete).toHaveBeenCalledWith(fixedId);
    expect(db.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "memory_audit",
        status: "passed",
        memoryIds: [fixedId],
      }),
    );
  });

  test("memory audit retries recall before failing a stored probe", async () => {
    const fixedId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const now = Date.now();
    const { service, db } = createService(
      {
        store: vi.fn().mockImplementation(async (entry) => ({
          id: fixedId,
          text: entry.text ?? "",
          vector: [0.1, 0.2],
          importance: entry.importance,
          category: entry.category,
          type: entry.type,
          metadata: entry.metadata,
          createdAt: now,
          updatedAt: now,
        })),
        searchByQuery: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              entry: {
                id: fixedId,
                text: "memory-audit-probe-retry-run-12345678",
                vector: [0.1, 0.2],
                importance: 0.1,
                category: "other",
                type: "episodic",
                metadata: {
                  source: "memory_audit",
                  ops: {
                    scopeSubject: "agent:main",
                    kind: "audit",
                    status: "probe",
                  },
                },
                createdAt: now,
                updatedAt: now,
              },
              score: 1,
              vectorScore: 1,
            },
          ]),
      },
      [0],
    );

    const result = await service.memoryAudit({
      scopeSubject: "agent:main",
      runId: "retry-run",
      cleanupOnSuccess: true,
    });

    expect(result.pass).toBe(true);
    expect(result.recallAttempts).toBe(2);
    expect(result.cleanupResult).toBe("deleted");
    expect(db.delete).toHaveBeenCalledWith(fixedId);
  });

  test("memory audit stores a fresh probe instead of deduping stale audit probes", async () => {
    const fixedId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const staleId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const now = Date.now();
    const { service, db } = createService({
      store: vi.fn().mockImplementation(async (entry) => ({
        id: fixedId,
        text: entry.text ?? "",
        vector: [0.1, 0.2],
        importance: entry.importance,
        category: entry.category,
        type: entry.type,
        metadata: entry.metadata,
        createdAt: now,
        updatedAt: now,
      })),
      searchByQuery: vi.fn().mockResolvedValue([
        {
          entry: {
            id: fixedId,
            text: "memory-audit-probe-fresh-run-12345678",
            vector: [0.1, 0.2],
            importance: 0.1,
            category: "other",
            type: "episodic",
            metadata: {
              source: "memory_audit",
              ops: {
                scopeSubject: "agent:main",
                kind: "audit",
                status: "probe",
              },
            },
            createdAt: now,
            updatedAt: now,
          },
          score: 1,
          vectorScore: 1,
        },
        {
          entry: {
            id: staleId,
            text: "memory-audit-probe-old-run-87654321",
            vector: [0.1, 0.2],
            importance: 0.1,
            category: "other",
            type: "episodic",
            metadata: {
              source: "memory_audit",
              ops: {
                scopeSubject: "agent:main",
                kind: "audit",
                status: "probe",
              },
            },
            createdAt: now - 1000,
            updatedAt: now - 1000,
          },
          score: 0.99,
          vectorScore: 0.99,
        },
      ]),
    });

    const result = await service.memoryAudit({
      scopeSubject: "agent:main",
      runId: "fresh-run",
      cleanupOnSuccess: true,
    });

    expect(result.pass).toBe(true);
    expect(result.storedId).toBe(fixedId);
    expect(result.recallEvidenceIds).toContain(fixedId);
    expect(db.store).toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalledWith(fixedId);
  });

  test("memory audit resolves short stored ID prefixes against unique recall evidence", async () => {
    const shortId = "f9ed12f4";
    const fullId = "f9ed12f4-1111-4aaa-8aaa-aaaaaaaaaaaa";
    const now = Date.now();
    const { service, db } = createService({
      store: vi.fn().mockImplementation(async (entry) => ({
        id: shortId,
        text: entry.text ?? "",
        vector: [0.1, 0.2],
        importance: entry.importance,
        category: entry.category,
        type: entry.type,
        metadata: entry.metadata,
        createdAt: now,
        updatedAt: now,
      })),
      searchByQuery: vi.fn().mockResolvedValue([
        {
          entry: {
            id: fullId,
            text: "memory-audit-probe-short-id-run-12345678",
            vector: [0.1, 0.2],
            importance: 0.1,
            category: "other",
            type: "episodic",
            metadata: {
              source: "memory_audit",
              ops: {
                scopeSubject: "agent:main",
                kind: "audit",
                status: "probe",
              },
            },
            createdAt: now,
            updatedAt: now,
          },
          score: 1,
          vectorScore: 1,
        },
      ]),
    });

    const result = await service.memoryAudit({
      scopeSubject: "agent:main",
      runId: "short-id-run",
      cleanupOnSuccess: true,
    });

    expect(result.pass).toBe(true);
    expect(result.storedId).toBe(shortId);
    expect(result.resolvedStoredId).toBe(fullId);
    expect(result.cleanupResult).toBe("deleted");
    expect(db.delete).toHaveBeenCalledWith(fullId);
  });

  test("memory audit fails closed on ambiguous short stored ID evidence", async () => {
    const shortId = "f9ed12f4";
    const now = Date.now();
    const { service, db } = createService({
      store: vi.fn().mockImplementation(async (entry) => ({
        id: shortId,
        text: entry.text ?? "",
        vector: [0.1, 0.2],
        importance: entry.importance,
        category: entry.category,
        type: entry.type,
        metadata: entry.metadata,
        createdAt: now,
        updatedAt: now,
      })),
      searchByQuery: vi.fn().mockResolvedValue([
        {
          entry: {
            id: "f9ed12f4-1111-4aaa-8aaa-aaaaaaaaaaaa",
            text: "memory-audit-probe-ambiguous-id-run-12345678",
            vector: [0.1, 0.2],
            importance: 0.1,
            category: "other",
            type: "episodic",
            metadata: {
              source: "memory_audit",
              ops: { scopeSubject: "agent:main", kind: "audit" },
            },
            createdAt: now,
            updatedAt: now,
          },
          score: 1,
          vectorScore: 1,
        },
        {
          entry: {
            id: "f9ed12f4-2222-4bbb-8bbb-bbbbbbbbbbbb",
            text: "memory-audit-probe-ambiguous-id-run-87654321",
            vector: [0.1, 0.2],
            importance: 0.1,
            category: "other",
            type: "episodic",
            metadata: {
              source: "memory_audit",
              ops: { scopeSubject: "agent:main", kind: "audit" },
            },
            createdAt: now,
            updatedAt: now,
          },
          score: 1,
          vectorScore: 1,
        },
      ]),
    });

    const result = await service.memoryAudit({
      scopeSubject: "agent:main",
      runId: "ambiguous-id-run",
      cleanupOnSuccess: true,
    });

    expect(result.pass).toBe(false);
    expect(result.reason).toBe("ambiguous_stored_id_prefix");
    expect(db.delete).not.toHaveBeenCalled();
  });
});
