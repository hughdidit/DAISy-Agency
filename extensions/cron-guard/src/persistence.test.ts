import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CronGuardStore } from "./store.js";
import type { CronGuardApprovalRecord } from "./types.js";

function createRecord(overrides: Partial<CronGuardApprovalRecord> = {}): CronGuardApprovalRecord {
  return {
    requestId: "req-1",
    action: "add",
    status: "pending",
    requester: {
      agentId: "agent-1",
      sessionKey: "agent:agent-1:discord:channel:123",
      toolName: "cron_guard_add_request",
    },
    createdAtMs: 1_000,
    expiresAtMs: 2_000,
    originalPayload: { name: "nightly", schedule: "0 * * * *" },
    currentPayload: { name: "nightly", schedule: "0 * * * *" },
    auditHistory: [
      {
        type: "requested",
        actor: "cron_guard_add_request",
        atMs: 1_000,
        status: "pending",
      },
    ],
    ...overrides,
  };
}

const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

describe("cron-guard persistence", () => {
  it("reopens pending requests from disk", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cron-guard-persist-"));
    tempRoots.push(root);

    const first = await CronGuardStore.open({
      stateDir: root,
      retention: { maxAgeMs: 60_000, maxResolved: 10 },
      now: () => 1_500,
    });
    await first.put(createRecord());

    const reopened = await CronGuardStore.open({
      stateDir: root,
      retention: { maxAgeMs: 60_000, maxResolved: 10 },
      now: () => 1_500,
    });

    expect(reopened.get("req-1")).toMatchObject({
      requestId: "req-1",
      status: "pending",
      requester: { agentId: "agent-1" },
    });
  });

  it("expires unresolved requests on reopen after ttl", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cron-guard-expire-"));
    tempRoots.push(root);

    const first = await CronGuardStore.open({
      stateDir: root,
      retention: { maxAgeMs: 60_000, maxResolved: 10 },
      now: () => 1_500,
    });
    await first.put(createRecord());

    const reopened = await CronGuardStore.open({
      stateDir: root,
      retention: { maxAgeMs: 60_000, maxResolved: 10 },
      now: () => 5_000,
    });

    expect(reopened.get("req-1")).toMatchObject({
      requestId: "req-1",
      status: "expired",
      resolvedAtMs: 5_000,
    });
  });
});
