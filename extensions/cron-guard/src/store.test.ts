import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CronGuardStore,
  type CronGuardApprovalRecord,
  type CronGuardRetentionPolicy,
} from "./store.js";

function createRecord(overrides: Partial<CronGuardApprovalRecord> = {}): CronGuardApprovalRecord {
  return {
    requestId: "req-1",
    action: "add",
    status: "pending",
    requester: {
      toolName: "cron_guard_add_request",
    },
    createdAtMs: 1_000,
    expiresAtMs: 2_000,
    originalPayload: {
      name: "job",
      schedule: { kind: "cron", expr: "* * * * *" },
      payload: { kind: "systemEvent", text: "hi" },
    },
    currentPayload: {
      name: "job",
      schedule: { kind: "cron", expr: "* * * * *" },
      payload: { kind: "systemEvent", text: "hi" },
    },
    auditHistory: [],
    ...overrides,
  };
}

describe("CronGuardStore", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cron-guard-store-"));

  afterEach(() => {
    fs.rmSync(tempRoot, { force: true, recursive: true });
    fs.mkdirSync(tempRoot, { recursive: true });
  });

  it("persists records and reloads them from the plugin state path", async () => {
    const retention: CronGuardRetentionPolicy = {
      maxAgeMs: 60_000,
      maxResolved: 10,
    };
    const store = await CronGuardStore.open({
      stateDir: tempRoot,
      retention,
      now: () => 1_500,
    });

    await store.put(createRecord());
    await store.close();

    const reopened = await CronGuardStore.open({
      stateDir: tempRoot,
      retention,
      now: () => 1_500,
    });
    expect(reopened.list()).toHaveLength(1);
    expect(reopened.get("req-1")?.requestId).toBe("req-1");
  });

  it("expires pending requests and prunes resolved records beyond retention", async () => {
    let nowMs = 1_500;
    const retention: CronGuardRetentionPolicy = {
      maxAgeMs: 5_000,
      maxResolved: 2,
    };
    const store = await CronGuardStore.open({
      stateDir: tempRoot,
      retention,
      now: () => nowMs,
    });

    await store.put(
      createRecord({
        requestId: "expired-pending",
        status: "pending",
        createdAtMs: 1_000,
        expiresAtMs: 2_000,
      }),
    );
    await store.put(
      createRecord({
        requestId: "resolved-old",
        status: "denied",
        createdAtMs: 1_000,
        expiresAtMs: 2_000,
        resolvedAtMs: 2_500,
      }),
    );
    await store.put(
      createRecord({
        requestId: "resolved-new",
        status: "applied",
        createdAtMs: 9_000,
        expiresAtMs: 12_000,
        resolvedAtMs: 9_500,
      }),
    );

    nowMs = 10_000;
    const pruneResult = await store.prune();
    expect(pruneResult.expiredRequestIds).toEqual(["expired-pending"]);
    expect(pruneResult.prunedResolvedRequestIds).toEqual(["resolved-old"]);

    expect(store.get("expired-pending")?.status).toBe("expired");
    expect(store.get("resolved-old")).toBeUndefined();
    expect(store.get("resolved-new")?.status).toBe("applied");
  });
});
