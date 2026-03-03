import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

=======
import { afterEach, describe, expect, it, vi } from "vitest";
>>>>>>> a6cd7ef49 (refactor(test): share cron service fixtures)
=======
import { describe, expect, it, vi } from "vitest";
>>>>>>> c000847dc (fix(test): remove unused cron import)
=======
import { beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
import type { HeartbeatRunResult } from "../infra/heartbeat-wake.js";
<<<<<<< HEAD
=======
import type { CronEvent, CronServiceDeps } from "./service.js";
>>>>>>> 058eb8576 (chore: Fix types in tests 10/N.)
import { CronService } from "./service.js";
import { createDeferred, createNoopLogger, installCronTestHooks } from "./service.test-harness.js";

const noopLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

let fixtureRoot = "";
let caseId = 0;

beforeAll(async () => {
  fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cron-"));
});

afterAll(async () => {
  if (fixtureRoot) {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
});

async function makeStorePath() {
<<<<<<< HEAD
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cron-"));
  return {
    storePath: path.join(dir, "cron", "jobs.json"),
    cleanup: async () => {},
  };
}
=======
const noopLogger = createNoopLogger();
installCronTestHooks({ logger: noopLogger });
>>>>>>> a6cd7ef49 (refactor(test): share cron service fixtures)

type CronHarnessOptions = {
  runIsolatedAgentJob?: CronServiceDeps["runIsolatedAgentJob"];
  runHeartbeatOnce?: NonNullable<CronServiceDeps["runHeartbeatOnce"]>;
  nowMs?: () => number;
  wakeNowHeartbeatBusyMaxWaitMs?: number;
  wakeNowHeartbeatBusyRetryDelayMs?: number;
  withEvents?: boolean;
};

async function createCronHarness(options: CronHarnessOptions = {}) {
  ensureDir(fixturesRoot);
  const store = await makeStorePath();
  const enqueueSystemEvent = vi.fn();
  const requestHeartbeatNow = vi.fn();
  const events = options.withEvents === false ? undefined : createCronEventHarness();

  const cron = new CronService({
    storePath: store.storePath,
    cronEnabled: true,
    log: noopLogger,
    ...(options.nowMs ? { nowMs: options.nowMs } : {}),
    ...(options.wakeNowHeartbeatBusyMaxWaitMs !== undefined
      ? { wakeNowHeartbeatBusyMaxWaitMs: options.wakeNowHeartbeatBusyMaxWaitMs }
      : {}),
    ...(options.wakeNowHeartbeatBusyRetryDelayMs !== undefined
      ? { wakeNowHeartbeatBusyRetryDelayMs: options.wakeNowHeartbeatBusyRetryDelayMs }
      : {}),
    enqueueSystemEvent,
    requestHeartbeatNow,
    ...(options.runHeartbeatOnce ? { runHeartbeatOnce: options.runHeartbeatOnce } : {}),
    runIsolatedAgentJob:
      options.runIsolatedAgentJob ??
      (vi.fn(async (_params: { job: unknown; message: string }) => ({
        status: "ok",
      })) as unknown as CronServiceDeps["runIsolatedAgentJob"]),
    ...(events ? { onEvent: events.onEvent } : {}),
  });
  await cron.start();
  return { store, cron, enqueueSystemEvent, requestHeartbeatNow, events };
}

async function createMainOneShotHarness() {
  const harness = await createCronHarness();
  if (!harness.events) {
    throw new Error("missing event harness");
  }
  return { ...harness, events: harness.events };
}

async function createIsolatedAnnounceHarness(
  runIsolatedAgentJob: CronServiceDeps["runIsolatedAgentJob"],
) {
  const harness = await createCronHarness({
    runIsolatedAgentJob,
  });
  if (!harness.events) {
    throw new Error("missing event harness");
  }
  return { ...harness, events: harness.events };
}

async function createWakeModeNowMainHarness(options: {
  nowMs?: () => number;
  runHeartbeatOnce: NonNullable<CronServiceDeps["runHeartbeatOnce"]>;
  wakeNowHeartbeatBusyMaxWaitMs?: number;
  wakeNowHeartbeatBusyRetryDelayMs?: number;
}) {
  return createCronHarness({
    runHeartbeatOnce: options.runHeartbeatOnce,
    nowMs: options.nowMs,
    wakeNowHeartbeatBusyMaxWaitMs: options.wakeNowHeartbeatBusyMaxWaitMs,
    wakeNowHeartbeatBusyRetryDelayMs: options.wakeNowHeartbeatBusyRetryDelayMs,
    withEvents: false,
  });
}

async function addDefaultIsolatedAnnounceJob(cron: CronService, name: string) {
  const runAt = new Date("2025-12-13T00:00:01.000Z");
  const job = await cron.add({
    enabled: true,
    name,
    schedule: { kind: "at", at: runAt.toISOString() },
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: { kind: "agentTurn", message: "do it" },
    delivery: { mode: "announce" },
  });
  return { job, runAt };
}

async function runIsolatedAnnounceJobAndWait(params: {
  cron: CronService;
  events: ReturnType<typeof createCronEventHarness>;
  name: string;
  status: "ok" | "error";
}) {
  const { job, runAt } = await addDefaultIsolatedAnnounceJob(params.cron, params.name);
  vi.setSystemTime(runAt);
  await vi.runOnlyPendingTimersAsync();
  await params.events.waitFor(
    (evt) => evt.jobId === job.id && evt.action === "finished" && evt.status === params.status,
  );
  return job;
}

async function addWakeModeNowMainSystemEventJob(
  cron: CronService,
  options?: { name?: string; agentId?: string; sessionKey?: string },
) {
  return cron.add({
    name: options?.name ?? "wakeMode now",
    ...(options?.agentId ? { agentId: options.agentId } : {}),
    ...(options?.sessionKey ? { sessionKey: options.sessionKey } : {}),
    enabled: true,
    schedule: { kind: "at", at: new Date(1).toISOString() },
    sessionTarget: "main",
    wakeMode: "now",
    payload: { kind: "systemEvent", text: "hello" },
  });
}

function createLegacyDeliveryMigrationJob(options: {
  id: string;
  payload: { provider?: string; channel?: string };
}) {
  return {
    id: options.id,
    name: "legacy",
    enabled: true,
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
    schedule: { kind: "cron", expr: "* * * * *" },
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: {
      kind: "agentTurn",
      message: "hi",
      deliver: true,
      ...options.payload,
      to: "7200373102",
    },
    state: {},
  };
}

async function loadLegacyDeliveryMigration(rawJob: Record<string, unknown>) {
  ensureDir(fixturesRoot);
  const store = await makeStorePath();
  writeStoreFile(store.storePath, { version: 1, jobs: [rawJob] });

  const cron = new CronService({
    storePath: store.storePath,
    cronEnabled: true,
    log: noopLogger,
    enqueueSystemEvent: vi.fn(),
    requestHeartbeatNow: vi.fn(),
    runIsolatedAgentJob: vi.fn(async () => ({ status: "ok" as const })),
  });
  await cron.start();
  const jobs = await cron.list({ includeDisabled: true });
  const job = jobs.find((j) => j.id === rawJob.id);
  return { store, cron, job };
}

describe("CronService", () => {
  it("runs a one-shot main job and disables it after success when requested", async () => {
    const { store, cron, enqueueSystemEvent, requestHeartbeatNow, events } =
      await createMainOneShotHarness();
    const atMs = Date.parse("2025-12-13T00:00:02.000Z");
    const job = await cron.add({
      name: "one-shot hello",
      enabled: true,
      deleteAfterRun: false,
      schedule: { kind: "at", at: new Date(atMs).toISOString() },
      sessionTarget: "main",
      wakeMode: "now",
      payload: { kind: "systemEvent", text: "hello" },
    });

    expect(job.state.nextRunAtMs).toBe(atMs);

    vi.setSystemTime(new Date("2025-12-13T00:00:02.000Z"));
    await vi.runOnlyPendingTimersAsync();
    await events.waitFor((evt) => evt.jobId === job.id && evt.action === "finished");

    const jobs = await cron.list({ includeDisabled: true });
    const updated = jobs.find((j) => j.id === job.id);
    expect(updated?.enabled).toBe(false);
    expect(enqueueSystemEvent).toHaveBeenCalledWith(
      "hello",
      expect.objectContaining({ agentId: undefined }),
    );
    expect(requestHeartbeatNow).toHaveBeenCalled();

    await cron.list({ includeDisabled: true });
    cron.stop();
    await store.cleanup();
  });

  it("runs a one-shot job and deletes it after success by default", async () => {
    const { store, cron, enqueueSystemEvent, requestHeartbeatNow, events } =
      await createMainOneShotHarness();
    const atMs = Date.parse("2025-12-13T00:00:02.000Z");
    const job = await cron.add({
      name: "one-shot delete",
      enabled: true,
      schedule: { kind: "at", at: new Date(atMs).toISOString() },
      sessionTarget: "main",
      wakeMode: "now",
      payload: { kind: "systemEvent", text: "hello" },
    });

    vi.setSystemTime(new Date("2025-12-13T00:00:02.000Z"));
    await vi.runOnlyPendingTimersAsync();
    await events.waitFor((evt) => evt.jobId === job.id && evt.action === "removed");

    const jobs = await cron.list({ includeDisabled: true });
    expect(jobs.find((j) => j.id === job.id)).toBeUndefined();
    expect(enqueueSystemEvent).toHaveBeenCalledWith(
      "hello",
      expect.objectContaining({ agentId: undefined }),
    );
    expect(requestHeartbeatNow).toHaveBeenCalled();

    cron.stop();
    await store.cleanup();
  });

  it("wakeMode now waits for heartbeat completion when available", async () => {
    let now = 0;
    const nowMs = () => {
      now += 10;
      return now;
    };

    let resolveHeartbeat: ((res: HeartbeatRunResult) => void) | null = null;
    const runHeartbeatOnce = vi.fn(
      async () =>
        await new Promise<HeartbeatRunResult>((resolve) => {
          resolveHeartbeat = resolve;
        }),
    );

    const { store, cron, enqueueSystemEvent, requestHeartbeatNow } =
      await createWakeModeNowMainHarness({
        runHeartbeatOnce,
        nowMs,
      });
    const job = await addWakeModeNowMainSystemEventJob(cron, { name: "wakeMode now waits" });

    const runPromise = cron.run(job.id, "force");
    // `cron.run()` now persists the running marker before executing the job.
    // Allow more microtask turns so the post-lock execution can start.
    for (let i = 0; i < 500; i++) {
      if (runHeartbeatOnce.mock.calls.length > 0) {
        break;
      }
      // Let the locked() chain progress.
      await Promise.resolve();
    }

    expect(runHeartbeatOnce).toHaveBeenCalledTimes(1);
    expect(requestHeartbeatNow).not.toHaveBeenCalled();
    expect(enqueueSystemEvent).toHaveBeenCalledWith(
      "hello",
      expect.objectContaining({ agentId: undefined }),
    );
    expect(job.state.runningAtMs).toBeTypeOf("number");

    if (typeof resolveHeartbeat === "function") {
      (resolveHeartbeat as (res: HeartbeatRunResult) => void)({ status: "ran", durationMs: 123 });
    }
    await runPromise;

    expect(job.state.lastStatus).toBe("ok");
    expect(job.state.lastDurationMs).toBeGreaterThan(0);

    cron.stop();
    await store.cleanup();
  });

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
  it("passes agentId and resolves main session for wakeMode now main jobs", async () => {
>>>>>>> fe9a7c408 (fix(cron): force main-target system events onto main session (#28898))
=======
  it("passes agentId and preserves scoped session for wakeMode now main jobs", async () => {
>>>>>>> 2050fd753 (Cron: preserve session scope for main-target reminders)
=======
  it("rejects sessionTarget main for non-default agents at creation time", async () => {
>>>>>>> 313a655d1 (fix(cron): reject sessionTarget "main" for non-default agents at creation time (openclaw#30217) thanks @liaosvcaf)
    const runHeartbeatOnce = vi.fn(async () => ({ status: "ran" as const, durationMs: 1 }));

    const { store, cron } = await createWakeModeNowMainHarness({
      runHeartbeatOnce,
      wakeNowHeartbeatBusyMaxWaitMs: 1,
      wakeNowHeartbeatBusyRetryDelayMs: 2,
    });

    await expect(
      addWakeModeNowMainSystemEventJob(cron, {
        name: "wakeMode now with agent",
        agentId: "ops",
      }),
    ).rejects.toThrow('cron: sessionTarget "main" is only valid for the default agent');

    cron.stop();
    await store.cleanup();
  });

  it("wakeMode now falls back to queued heartbeat when main lane stays busy", async () => {
    const runHeartbeatOnce = vi.fn(async () => ({
      status: "skipped" as const,
      reason: "requests-in-flight",
    }));
    let now = 0;
    const nowMs = () => {
      now += 10;
      return now;
    };

    const { store, cron, requestHeartbeatNow } = await createWakeModeNowMainHarness({
      runHeartbeatOnce,
      nowMs,
      // Perf: avoid advancing fake timers by 2+ minutes for the busy-heartbeat fallback.
      wakeNowHeartbeatBusyMaxWaitMs: 1,
      wakeNowHeartbeatBusyRetryDelayMs: 2,
    });

    const sessionKey = "agent:main:discord:channel:ops";
    const job = await addWakeModeNowMainSystemEventJob(cron, {
      name: "wakeMode now fallback",
      sessionKey,
    });

    await cron.run(job.id, "force");

    expect(runHeartbeatOnce).toHaveBeenCalled();
    expect(requestHeartbeatNow).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: `cron:${job.id}`,
        sessionKey,
      }),
    );
    expect(job.state.lastStatus).toBe("ok");
    expect(job.state.lastError).toBeUndefined();

    await cron.list({ includeDisabled: true });
    cron.stop();
    await store.cleanup();
  });

>>>>>>> 04e3a66f9 (fix(cron): pass agentId to runHeartbeatOnce for main-session jobs (#14140))
  it("runs an isolated job and posts summary to main", async () => {
    const runIsolatedAgentJob = vi.fn(async () => ({ status: "ok" as const, summary: "done" }));
    const { store, cron, enqueueSystemEvent, requestHeartbeatNow, events } =
      await createIsolatedAnnounceHarness(runIsolatedAgentJob);
    const { job, runAt } = await addDefaultIsolatedAnnounceJob(cron, "weekly");

<<<<<<< HEAD
    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent,
      requestHeartbeatNow,
      runIsolatedAgentJob,
      onEvent: events.onEvent,
    });

    await cron.start();
    const atMs = Date.parse("2025-12-13T00:00:01.000Z");
    const job = await cron.add({
      enabled: true,
      name: "weekly",
      schedule: { kind: "at", at: new Date(atMs).toISOString() },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: { kind: "agentTurn", message: "do it", deliver: false },
    });

    vi.setSystemTime(new Date("2025-12-13T00:00:01.000Z"));
    await vi.runOnlyPendingTimersAsync();

    await cron.list({ includeDisabled: true });
=======
    await runIsolatedAnnounceJobAndWait({ cron, events, name: "weekly", status: "ok" });
>>>>>>> 11f3da766 (refactor(test): dedupe cron service test harness setup)
    expect(runIsolatedAgentJob).toHaveBeenCalledTimes(1);
    expect(enqueueSystemEvent).toHaveBeenCalledWith(
      "Cron: done",
      expect.objectContaining({ agentId: undefined }),
    );
    expect(requestHeartbeatNow).toHaveBeenCalled();
    cron.stop();
    await store.cleanup();
  });

  it("does not post isolated summary to main when run already delivered output", async () => {
    const runIsolatedAgentJob = vi.fn(async () => ({
      status: "ok" as const,
      summary: "done",
      delivered: true,
    }));
    const { store, cron, enqueueSystemEvent, requestHeartbeatNow, events } =
      await createIsolatedAnnounceHarness(runIsolatedAgentJob);
    await runIsolatedAnnounceJobAndWait({
      cron,
      events,
      name: "weekly delivered",
      status: "ok",
    });
    expect(runIsolatedAgentJob).toHaveBeenCalledTimes(1);
    expect(enqueueSystemEvent).not.toHaveBeenCalled();
    expect(requestHeartbeatNow).not.toHaveBeenCalled();
    cron.stop();
    await store.cleanup();
  });

<<<<<<< HEAD
=======
  it("does not post isolated summary to main when announce delivery was attempted", async () => {
    const runIsolatedAgentJob = vi.fn(async () => ({
      status: "ok" as const,
      summary: "done",
      delivered: false,
      deliveryAttempted: true,
    }));
    const { store, cron, enqueueSystemEvent, requestHeartbeatNow, events } =
      await createIsolatedAnnounceHarness(runIsolatedAgentJob);
    await runIsolatedAnnounceJobAndWait({
      cron,
      events,
      name: "weekly attempted",
      status: "ok",
    });
    expect(runIsolatedAgentJob).toHaveBeenCalledTimes(1);
    expect(enqueueSystemEvent).not.toHaveBeenCalled();
    expect(requestHeartbeatNow).not.toHaveBeenCalled();
    cron.stop();
    await store.cleanup();
  });

>>>>>>> b37dc4224 (fix(cron): suppress fallback summary after attempted announce delivery)
  it("migrates legacy payload.provider to payload.channel on load", async () => {
    const rawJob = createLegacyDeliveryMigrationJob({
      id: "legacy-1",
      payload: { provider: " TeLeGrAm " },
    });
    const { store, cron, job } = await loadLegacyDeliveryMigration(rawJob);
    // Legacy delivery fields are migrated to the top-level delivery object
    const delivery = job?.delivery as unknown as Record<string, unknown>;
    expect(delivery?.channel).toBe("telegram");
    const payload = job?.payload as unknown as Record<string, unknown>;
    expect("provider" in payload).toBe(false);
    expect("channel" in payload).toBe(false);

    cron.stop();
    await store.cleanup();
  });

  it("canonicalizes payload.channel casing on load", async () => {
    const rawJob = createLegacyDeliveryMigrationJob({
      id: "legacy-2",
      payload: { channel: "Telegram" },
    });
    const { store, cron, job } = await loadLegacyDeliveryMigration(rawJob);
    // Legacy delivery fields are migrated to the top-level delivery object
    const delivery = job?.delivery as unknown as Record<string, unknown>;
    expect(delivery?.channel).toBe("telegram");

    cron.stop();
    await store.cleanup();
  });

  it("posts last output to main even when isolated job errors", async () => {
    const runIsolatedAgentJob = vi.fn(async () => ({
      status: "error" as const,
      summary: "last output",
      error: "boom",
    }));
    const { store, cron, enqueueSystemEvent, requestHeartbeatNow, events } =
      await createIsolatedAnnounceHarness(runIsolatedAgentJob);
    const { job, runAt } = await addDefaultIsolatedAnnounceJob(cron, "isolated error test");

<<<<<<< HEAD
    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent,
      requestHeartbeatNow,
      runIsolatedAgentJob,
      onEvent: events.onEvent,
    });

    await cron.start();
    const atMs = Date.parse("2025-12-13T00:00:01.000Z");
    const job = await cron.add({
      name: "isolated error test",
      enabled: true,
      schedule: { kind: "at", at: new Date(atMs).toISOString() },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: { kind: "agentTurn", message: "do it", deliver: false },
    });

    vi.setSystemTime(new Date("2025-12-13T00:00:01.000Z"));
    await vi.runOnlyPendingTimersAsync();
    await cron.list({ includeDisabled: true });
=======
    await runIsolatedAnnounceJobAndWait({
      cron,
      events,
      name: "isolated error test",
      status: "error",
    });
>>>>>>> 11f3da766 (refactor(test): dedupe cron service test harness setup)

    expect(enqueueSystemEvent).toHaveBeenCalledWith(
      "Cron (error): last output",
      expect.objectContaining({ agentId: undefined }),
    );
    expect(requestHeartbeatNow).toHaveBeenCalled();
    cron.stop();
    await store.cleanup();
  });

  it("does not post fallback main summary for isolated delivery-target errors", async () => {
    const runIsolatedAgentJob = vi.fn(async () => ({
      status: "error" as const,
      summary: "last output",
      error: "Channel is required when multiple channels are configured: telegram, discord",
      errorKind: "delivery-target" as const,
    }));
    const { store, cron, enqueueSystemEvent, requestHeartbeatNow, events } =
      await createIsolatedAnnounceHarness(runIsolatedAgentJob);
    await runIsolatedAnnounceJobAndWait({
      cron,
      events,
      name: "isolated delivery target error test",
      status: "error",
    });

    expect(enqueueSystemEvent).not.toHaveBeenCalled();
    expect(requestHeartbeatNow).not.toHaveBeenCalled();
    cron.stop();
    await store.cleanup();
  });

  it("rejects unsupported session/payload combinations", async () => {
    ensureDir(fixturesRoot);
    const store = await makeStorePath();

    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async (_params: { job: unknown; message: string }) => ({
        status: "ok",
      })) as unknown as CronServiceDeps["runIsolatedAgentJob"],
    });

    await cron.start();

    await expect(
      cron.add({
        name: "bad combo (main/agentTurn)",
        enabled: true,
        schedule: { kind: "every", everyMs: 1000 },
        sessionTarget: "main",
        wakeMode: "next-heartbeat",
        payload: { kind: "agentTurn", message: "nope" },
      }),
    ).rejects.toThrow(/main cron jobs require/);

    await expect(
      cron.add({
        name: "bad combo (isolated/systemEvent)",
        enabled: true,
        schedule: { kind: "every", everyMs: 1000 },
        sessionTarget: "isolated",
        wakeMode: "next-heartbeat",
        payload: { kind: "systemEvent", text: "nope" },
      }),
    ).rejects.toThrow(/isolated cron jobs require/);

    cron.stop();
    await store.cleanup();
  });

  it("skips invalid main jobs with agentTurn payloads from disk", async () => {
    ensureDir(fixturesRoot);
    const store = await makeStorePath();
    const enqueueSystemEvent = vi.fn();
    const requestHeartbeatNow = vi.fn();
    const events = createCronEventHarness();

    const atMs = Date.parse("2025-12-13T00:00:01.000Z");
    writeStoreFile(store.storePath, {
      version: 1,
      jobs: [
        {
          id: "job-1",
          enabled: true,
          createdAtMs: Date.parse("2025-12-13T00:00:00.000Z"),
          updatedAtMs: Date.parse("2025-12-13T00:00:00.000Z"),
          schedule: { kind: "at", at: new Date(atMs).toISOString() },
          sessionTarget: "main",
          wakeMode: "now",
          payload: { kind: "agentTurn", message: "bad" },
          state: {},
        },
      ],
    });

    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent,
      requestHeartbeatNow,
      runIsolatedAgentJob: vi.fn(async (_params: { job: unknown; message: string }) => ({
        status: "ok",
      })) as unknown as CronServiceDeps["runIsolatedAgentJob"],
      onEvent: events.onEvent,
    });

    await cron.start();

    vi.setSystemTime(new Date("2025-12-13T00:00:01.000Z"));
    await vi.runOnlyPendingTimersAsync();
    await events.waitFor(
      (evt) => evt.jobId === "job-1" && evt.action === "finished" && evt.status === "skipped",
    );

    expect(enqueueSystemEvent).not.toHaveBeenCalled();
    expect(requestHeartbeatNow).not.toHaveBeenCalled();

    const jobs = await cron.list({ includeDisabled: true });
    expect(jobs[0]?.state.lastStatus).toBe("skipped");
    expect(jobs[0]?.state.lastError).toMatch(/main job requires/i);

    cron.stop();
    await store.cleanup();
  });
});
