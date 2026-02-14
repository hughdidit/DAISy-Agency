import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
=======
=======
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> badde6e29 (perf(test): speed up cron schedule suite)
=======
import { describe, expect, it, vi } from "vitest";
>>>>>>> a6cd7ef49 (refactor(test): share cron service fixtures)
import type { CronEvent } from "./service.js";
<<<<<<< HEAD
import type { CronJob } from "./types.js";
>>>>>>> e6d5b5fb1 (perf(test): remove slow port inspection and reconnect sleeps)
=======
>>>>>>> 4335668d2 (chore(test): fix cron every-jobs-fire unused import)
import { CronService } from "./service.js";
import {
  createCronStoreHarness,
  createNoopLogger,
  installCronTestHooks,
} from "./service.test-harness.js";

const noopLogger = createNoopLogger();
const { makeStorePath } = createCronStoreHarness();
installCronTestHooks({ logger: noopLogger });

<<<<<<< HEAD
=======
function createFinishedBarrier() {
  const resolvers = new Map<string, (evt: CronEvent) => void>();
  return {
    waitForOk: (jobId: string) =>
      new Promise<CronEvent>((resolve) => {
        resolvers.set(jobId, resolve);
      }),
    onEvent: (evt: CronEvent) => {
      if (evt.action !== "finished" || evt.status !== "ok") {
        return;
      }
      const resolve = resolvers.get(evt.jobId);
      if (!resolve) {
        return;
      }
      resolvers.delete(evt.jobId);
      resolve(evt);
    },
  };
}

>>>>>>> e6d5b5fb1 (perf(test): remove slow port inspection and reconnect sleeps)
describe("CronService interval/cron jobs fire on time", () => {
  it("fires an every-type main job when the timer fires a few ms late", async () => {
    const store = await makeStorePath();
    const enqueueSystemEvent = vi.fn();
    const requestHeartbeatNow = vi.fn();
    const finished = createFinishedBarrier();

    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent,
      requestHeartbeatNow,
      runIsolatedAgentJob: vi.fn(async () => ({ status: "ok" })),
      onEvent: finished.onEvent,
    });

    await cron.start();
    const job = await cron.add({
      name: "every 10s check",
      enabled: true,
      schedule: { kind: "every", everyMs: 10_000 },
      sessionTarget: "main",
      wakeMode: "next-heartbeat",
      payload: { kind: "systemEvent", text: "tick" },
    });

    const firstDueAt = job.state.nextRunAtMs!;
    expect(firstDueAt).toBe(Date.parse("2025-12-13T00:00:00.000Z") + 10_000);

    // Simulate setTimeout firing 5ms late (the race condition).
    vi.setSystemTime(new Date(firstDueAt + 5));
    await vi.runOnlyPendingTimersAsync();

<<<<<<< HEAD
    // Wait for the async onTimer to complete via the lock queue.
    const jobs = await cron.list();
    const updated = jobs.find((j) => j.id === job.id);
=======
    await finished.waitForOk(job.id);
    const jobs = await cron.list({ includeDisabled: true });
    const updated = jobs.find((current) => current.id === job.id);
>>>>>>> e6d5b5fb1 (perf(test): remove slow port inspection and reconnect sleeps)

    expect(enqueueSystemEvent).toHaveBeenCalledWith("tick", { agentId: undefined });
    expect(updated?.state.lastStatus).toBe("ok");
    // nextRunAtMs must advance by at least one full interval past the due time.
    expect(updated?.state.nextRunAtMs).toBeGreaterThanOrEqual(firstDueAt + 10_000);

    cron.stop();
    await store.cleanup();
  });

  it("fires a cron-expression job when the timer fires a few ms late", async () => {
    const store = await makeStorePath();
    const enqueueSystemEvent = vi.fn();
    const requestHeartbeatNow = vi.fn();
    const finished = createFinishedBarrier();

    // Set time to just before a minute boundary.
    vi.setSystemTime(new Date("2025-12-13T00:00:59.000Z"));

    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent,
      requestHeartbeatNow,
      runIsolatedAgentJob: vi.fn(async () => ({ status: "ok" })),
      onEvent: finished.onEvent,
    });

    await cron.start();
    const job = await cron.add({
      name: "every minute check",
      enabled: true,
      schedule: { kind: "cron", expr: "* * * * *" },
      sessionTarget: "main",
      wakeMode: "next-heartbeat",
      payload: { kind: "systemEvent", text: "cron-tick" },
    });

    const firstDueAt = job.state.nextRunAtMs!;

    // Simulate setTimeout firing 5ms late.
    vi.setSystemTime(new Date(firstDueAt + 5));
    await vi.runOnlyPendingTimersAsync();

<<<<<<< HEAD
    // Wait for the async onTimer to complete via the lock queue.
    const jobs = await cron.list();
    const updated = jobs.find((j) => j.id === job.id);
=======
    await finished.waitForOk(job.id);
    const jobs = await cron.list({ includeDisabled: true });
    const updated = jobs.find((current) => current.id === job.id);
>>>>>>> e6d5b5fb1 (perf(test): remove slow port inspection and reconnect sleeps)

    expect(enqueueSystemEvent).toHaveBeenCalledWith("cron-tick", { agentId: undefined });
    expect(updated?.state.lastStatus).toBe("ok");
    // nextRunAtMs should be the next whole-minute boundary (60s later).
    expect(updated?.state.nextRunAtMs).toBe(firstDueAt + 60_000);

    cron.stop();
    await store.cleanup();
  });
});
