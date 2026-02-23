import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
=======
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 912693036 (test(cron): remove flaky real-timer polling)
import type { CronJob } from "./types.js";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { CronJob, CronJobState } from "./types.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { CronJob, CronJobState } from "./types.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
=======
import type { HeartbeatRunResult } from "../infra/heartbeat-wake.js";
>>>>>>> 3efe63d1a (Cron: respect aborts in main wake-now retries (#23967))
import * as schedule from "./schedule.js";
>>>>>>> c26cf6aa8 (feat(cron): add default stagger controls for scheduled jobs)
import { CronService } from "./service.js";
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { createRunningCronServiceState } from "./service.test-harness.js";
=======
import { createDeferred, createRunningCronServiceState } from "./service.test-harness.js";
>>>>>>> 5e8b1f5ac (refactor(test): centralize trigger and cron test helpers)
import { computeJobNextRunAtMs } from "./service/jobs.js";
>>>>>>> 50e5413c1 (refactor(cron-test): share running-state fixture)
import { createCronServiceState, type CronEvent } from "./service/state.js";
import { executeJobCore, onTimer, runMissedJobs } from "./service/timer.js";
import type { CronJob, CronJobState } from "./types.js";

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};
const TOP_OF_HOUR_STAGGER_MS = 5 * 60 * 1_000;
type CronServiceOptions = ConstructorParameters<typeof CronService>[0];

function topOfHourOffsetMs(jobId: string) {
  const digest = crypto.createHash("sha256").update(jobId).digest();
  return digest.readUInt32BE(0) % TOP_OF_HOUR_STAGGER_MS;
}

async function makeStorePath() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cron-issues-"));
  const storePath = path.join(dir, "jobs.json");
  return {
    storePath,
  };
}

function createDueIsolatedJob(params: {
  id: string;
  nowMs: number;
  nextRunAtMs: number;
  deleteAfterRun?: boolean;
}): CronJob {
  return {
    id: params.id,
    name: params.id,
    enabled: true,
    deleteAfterRun: params.deleteAfterRun ?? false,
    createdAtMs: params.nowMs,
    updatedAtMs: params.nowMs,
    schedule: { kind: "at", at: new Date(params.nextRunAtMs).toISOString() },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: { kind: "agentTurn", message: params.id },
    delivery: { mode: "none" },
    state: { nextRunAtMs: params.nextRunAtMs },
  };
}

function createDefaultIsolatedRunner(): CronServiceOptions["runIsolatedAgentJob"] {
  return vi.fn().mockResolvedValue({
    status: "ok",
    summary: "ok",
  }) as CronServiceOptions["runIsolatedAgentJob"];
}

<<<<<<< HEAD
=======
function createAbortAwareIsolatedRunner(summary = "late") {
  let observedAbortSignal: AbortSignal | undefined;
  const runIsolatedAgentJob = vi.fn(async ({ abortSignal }) => {
    observedAbortSignal = abortSignal;
    await new Promise<void>((resolve) => {
      if (!abortSignal) {
        return;
      }
      if (abortSignal.aborted) {
        resolve();
        return;
      }
      abortSignal.addEventListener("abort", () => resolve(), { once: true });
    });
    return { status: "ok" as const, summary };
  }) as CronServiceOptions["runIsolatedAgentJob"];

  return {
    runIsolatedAgentJob,
    getObservedAbortSignal: () => observedAbortSignal,
  };
}

function createIsolatedRegressionJob(params: {
  id: string;
  name: string;
  scheduledAt: number;
  schedule: CronJob["schedule"];
  payload: CronJob["payload"];
  state?: CronJobState;
}): CronJob {
  return {
    id: params.id,
    name: params.name,
    enabled: true,
    createdAtMs: params.scheduledAt - 86_400_000,
    updatedAtMs: params.scheduledAt - 86_400_000,
    schedule: params.schedule,
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: params.payload,
    delivery: { mode: "announce" },
    state: params.state ?? {},
  };
}

async function writeCronJobs(storePath: string, jobs: CronJob[]) {
  await fs.writeFile(storePath, JSON.stringify({ version: 1, jobs }, null, 2), "utf-8");
}

>>>>>>> 5d90e3180 (refactor(cron): share timed job-execution helper)
async function startCronForStore(params: {
  storePath: string;
  cronEnabled?: boolean;
  enqueueSystemEvent?: CronServiceOptions["enqueueSystemEvent"];
  requestHeartbeatNow?: CronServiceOptions["requestHeartbeatNow"];
  runIsolatedAgentJob?: CronServiceOptions["runIsolatedAgentJob"];
  onEvent?: CronServiceOptions["onEvent"];
}) {
  const enqueueSystemEvent =
    params.enqueueSystemEvent ?? (vi.fn() as unknown as CronServiceOptions["enqueueSystemEvent"]);
  const requestHeartbeatNow =
    params.requestHeartbeatNow ?? (vi.fn() as unknown as CronServiceOptions["requestHeartbeatNow"]);
  const runIsolatedAgentJob = params.runIsolatedAgentJob ?? createDefaultIsolatedRunner();

  const cron = new CronService({
    cronEnabled: params.cronEnabled ?? true,
    storePath: params.storePath,
    log: noopLogger,
    enqueueSystemEvent,
    requestHeartbeatNow,
    runIsolatedAgentJob,
    ...(params.onEvent ? { onEvent: params.onEvent } : {}),
  });
  await cron.start();
  return cron;
}

describe("Cron issue regressions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-06T10:05:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("recalculates nextRunAtMs when schedule changes", async () => {
    const store = await makeStorePath();
<<<<<<< HEAD
    const cron = new CronService({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn().mockResolvedValue({ status: "ok", summary: "ok" }),
=======
    const enqueueSystemEvent = vi.fn();
    const cron = await startCronForStore({
      storePath: store.storePath,
      enqueueSystemEvent,
>>>>>>> adac9cb67 (refactor: dedupe gateway and scheduler test scaffolding)
    });

    const created = await cron.add({
      name: "hourly",
      enabled: true,
      schedule: { kind: "cron", expr: "0 * * * *", tz: "UTC" },
      sessionTarget: "main",
      wakeMode: "next-heartbeat",
      payload: { kind: "systemEvent", text: "tick" },
    });
    const offsetMs = topOfHourOffsetMs(created.id);
    expect(created.state.nextRunAtMs).toBe(Date.parse("2026-02-06T11:00:00.000Z") + offsetMs);

    const updated = await cron.update(created.id, {
      schedule: { kind: "cron", expr: "0 */2 * * *", tz: "UTC" },
    });

    expect(updated.state.nextRunAtMs).toBe(Date.parse("2026-02-06T12:00:00.000Z") + offsetMs);

    cron.stop();
    await store.cleanup();
  });

  it("runs immediately with force mode even when not due", async () => {
    const store = await makeStorePath();
    const enqueueSystemEvent = vi.fn();
    const cron = new CronService({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      enqueueSystemEvent,
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn().mockResolvedValue({ status: "ok", summary: "ok" }),
    });
    await cron.start();

    const created = await cron.add({
      name: "force-now",
      enabled: true,
      schedule: { kind: "every", everyMs: 60_000, anchorMs: Date.now() },
      sessionTarget: "main",
      wakeMode: "next-heartbeat",
      payload: { kind: "systemEvent", text: "force" },
    });

    const result = await cron.run(created.id, "force");

    expect(result).toEqual({ ok: true, ran: true });
    expect(enqueueSystemEvent).toHaveBeenCalledWith(
      "force",
      expect.objectContaining({ agentId: undefined }),
    );

    cron.stop();
    await store.cleanup();
  });

  it("schedules isolated jobs with next wake time", async () => {
    const store = await makeStorePath();
    const cron = new CronService({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn().mockResolvedValue({ status: "ok", summary: "ok" }),
    });
    await cron.start();

    const job = await cron.add({
      name: "isolated",
      enabled: true,
      schedule: { kind: "every", everyMs: 60_000, anchorMs: Date.now() },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "hi" },
    });
    const status = await cron.status();

    expect(typeof job.state.nextRunAtMs).toBe("number");
    expect(typeof status.nextWakeAtMs).toBe("number");

<<<<<<< HEAD
=======
    const unsafeToggle = await cron.add({
      name: "unsafe toggle",
      enabled: true,
      schedule: { kind: "every", everyMs: 60_000, anchorMs: Date.now() },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "hi" },
    });

    const patched = await cron.update(unsafeToggle.id, {
      payload: { kind: "agentTurn", allowUnsafeExternalContent: true },
    });

    expect(patched.payload.kind).toBe("agentTurn");
    if (patched.payload.kind === "agentTurn") {
      expect(patched.payload.allowUnsafeExternalContent).toBe(true);
      expect(patched.payload.message).toBe("hi");
    }

>>>>>>> a76a9c375 (chore: Fix types in tests 15/N.)
    cron.stop();
  });

  it("persists allowUnsafeExternalContent on agentTurn payload patches", async () => {
    const store = await makeStorePath();
    const cron = await startCronForStore({ storePath: store.storePath });

    const created = await cron.add({
<<<<<<< HEAD
      name: "unsafe toggle",
      schedule: { kind: "every", everyMs: 60_000, anchorMs: Date.now() },
      sessionTarget: "isolated",
      payload: { kind: "agentTurn", message: "hi" },
=======
      name: "repair-target",
      enabled: true,
      schedule: { kind: "cron", expr: "0 * * * *", tz: "UTC" },
      sessionTarget: "main",
      wakeMode: "next-heartbeat",
      payload: { kind: "systemEvent", text: "tick" },
    });
    const updated = await cron.update(created.id, {
      payload: { kind: "systemEvent", text: "tick-2" },
      state: { nextRunAtMs: undefined },
>>>>>>> a76a9c375 (chore: Fix types in tests 15/N.)
    });

    const updated = await cron.update(created.id, {
      payload: { kind: "agentTurn", allowUnsafeExternalContent: true },
    });

<<<<<<< HEAD
    expect(updated.payload.kind).toBe("agentTurn");
    if (updated.payload.kind === "agentTurn") {
      expect(updated.payload.allowUnsafeExternalContent).toBe(true);
      expect(updated.payload.message).toBe("hi");
    }
=======
    expect(updated.payload.kind).toBe("systemEvent");
    expect(typeof updated.state.nextRunAtMs).toBe("number");
    expect(updated.state.nextRunAtMs).toBe(created.state.nextRunAtMs);

    cron.stop();
  });

  it("does not advance unrelated due jobs when updating another job", async () => {
    const store = await makeStorePath();
    const now = Date.parse("2026-02-06T10:05:00.000Z");
    vi.setSystemTime(now);
    const cron = await startCronForStore({ storePath: store.storePath, cronEnabled: false });

    const dueJob = await cron.add({
      name: "due-preserved",
      enabled: true,
      schedule: { kind: "every", everyMs: 60_000, anchorMs: now },
      sessionTarget: "main",
      wakeMode: "next-heartbeat",
      payload: { kind: "systemEvent", text: "due-preserved" },
    });
    const otherJob = await cron.add({
      name: "other-job",
      enabled: true,
      schedule: { kind: "cron", expr: "0 * * * *", tz: "UTC" },
      sessionTarget: "main",
      wakeMode: "next-heartbeat",
      payload: { kind: "systemEvent", text: "other" },
    });

    const originalDueNextRunAtMs = dueJob.state.nextRunAtMs;
    expect(typeof originalDueNextRunAtMs).toBe("number");

    // Make dueJob past-due without running timer callbacks.
    vi.setSystemTime(now + 5 * 60_000);

    await cron.update(otherJob.id, {
      payload: { kind: "systemEvent", text: "other-updated" },
    });

    const storeData = JSON.parse(await fs.readFile(store.storePath, "utf8")) as {
      jobs: Array<{ id: string; state?: { nextRunAtMs?: number } }>;
    };
    const persistedDueJob = storeData.jobs.find((job) => job.id === dueJob.id);
    expect(persistedDueJob?.state?.nextRunAtMs).toBe(originalDueNextRunAtMs);
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)

    cron.stop();
  });

  it("treats persisted jobs with missing enabled as enabled during update()", async () => {
    const store = await makeStorePath();
    const now = Date.parse("2026-02-06T10:05:00.000Z");
    await fs.writeFile(
      store.storePath,
      JSON.stringify(
        {
          version: 1,
          jobs: [
            {
              id: "missing-enabled-update",
              name: "legacy missing enabled",
              createdAtMs: now - 60_000,
              updatedAtMs: now - 60_000,
              schedule: { kind: "cron", expr: "0 */2 * * *", tz: "UTC" },
              sessionTarget: "main",
              wakeMode: "next-heartbeat",
              payload: { kind: "systemEvent", text: "legacy" },
              state: {},
            },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );

    const cron = await startCronForStore({ storePath: store.storePath });

    const listed = await cron.list();
    expect(listed.some((job) => job.id === "missing-enabled-update")).toBe(true);

    const updated = await cron.update("missing-enabled-update", {
      schedule: { kind: "cron", expr: "0 */3 * * *", tz: "UTC" },
    });

    expect(updated.state.nextRunAtMs).toBeTypeOf("number");
    expect(updated.state.nextRunAtMs).toBeGreaterThan(now);

    cron.stop();
    await store.cleanup();
  });

  it("treats persisted due jobs with missing enabled as runnable", async () => {
    const store = await makeStorePath();
    const now = Date.parse("2026-02-06T10:05:00.000Z");
    const dueAt = now - 30_000;
    await fs.writeFile(
      store.storePath,
      JSON.stringify(
        {
          version: 1,
          jobs: [
            {
              id: "missing-enabled-due",
              name: "legacy due job",
              createdAtMs: dueAt - 60_000,
              updatedAtMs: dueAt,
              schedule: { kind: "at", at: new Date(dueAt).toISOString() },
              sessionTarget: "main",
              wakeMode: "now",
              payload: { kind: "systemEvent", text: "missing-enabled-due" },
              state: { nextRunAtMs: dueAt },
            },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );

    const enqueueSystemEvent = vi.fn();
    const cron = await startCronForStore({
      storePath: store.storePath,
      cronEnabled: false,
      enqueueSystemEvent,
    });

    const result = await cron.run("missing-enabled-due", "due");
    expect(result).toEqual({ ok: true, ran: true });
    expect(enqueueSystemEvent).toHaveBeenCalledWith(
      "missing-enabled-due",
      expect.objectContaining({ agentId: undefined }),
    );

    cron.stop();
    await store.cleanup();
  });

  it("caps timer delay to 60s for far-future schedules", async () => {
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const store = await makeStorePath();
    const cron = await startCronForStore({ storePath: store.storePath });

    const callsBeforeAdd = timeoutSpy.mock.calls.length;
    await cron.add({
      name: "far-future",
      enabled: true,
      schedule: { kind: "at", at: "2035-01-01T00:00:00.000Z" },
      sessionTarget: "main",
      wakeMode: "next-heartbeat",
      payload: { kind: "systemEvent", text: "future" },
    });

    const delaysAfterAdd = timeoutSpy.mock.calls
      .slice(callsBeforeAdd)
      .map(([, delay]) => delay)
      .filter((delay): delay is number => typeof delay === "number");
    expect(delaysAfterAdd.some((delay) => delay === 60_000)).toBe(true);

    cron.stop();
    timeoutSpy.mockRestore();
  });

  it("re-arms timer without hot-looping when a run is already in progress", async () => {
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const store = await makeStorePath();
    const now = Date.parse("2026-02-06T10:05:00.000Z");
    const state = createRunningCronServiceState({
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      jobs: [createDueIsolatedJob({ id: "due", nowMs: now, nextRunAtMs: now - 1 })],
    });

    await onTimer(state);

    // The timer should be re-armed (not null) so the scheduler stays alive,
    // with a fixed MAX_TIMER_DELAY_MS (60s) delay to avoid a hot-loop when
    // past-due jobs are waiting.  See #12025.
    expect(timeoutSpy).toHaveBeenCalled();
    expect(state.timer).not.toBeNull();
    const delays = timeoutSpy.mock.calls
      .map(([, delay]) => delay)
      .filter((d): d is number => typeof d === "number");
    expect(delays).toContain(60_000);
    timeoutSpy.mockRestore();
  });

  it("skips forced manual runs while a timer-triggered run is in progress", async () => {
    const store = await makeStorePath();
    let resolveRun:
      | ((value: { status: "ok" | "error" | "skipped"; summary?: string; error?: string }) => void)
      | undefined;
    const runIsolatedAgentJob = vi.fn(
      async () =>
        await new Promise<{ status: "ok" | "error" | "skipped"; summary?: string; error?: string }>(
          (resolve) => {
            resolveRun = resolve;
          },
        ),
    );

    const started = createDeferred<void>();
    const finished = createDeferred<void>();
    let targetJobId = "";

    const cron = await startCronForStore({
      storePath: store.storePath,
      runIsolatedAgentJob,
      onEvent: (evt: CronEvent) => {
        if (evt.jobId !== targetJobId) {
          return;
        }
        if (evt.action === "started") {
          started.resolve();
        } else if (evt.action === "finished" && evt.status === "ok") {
          finished.resolve();
        }
      },
    });

    const runAt = Date.now() + 1;
    const job = await cron.add({
      name: "timer-overlap",
      enabled: true,
      schedule: { kind: "at", at: new Date(runAt).toISOString() },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "long task" },
      delivery: { mode: "none" },
    });

    targetJobId = job.id;
    await vi.advanceTimersByTimeAsync(2);
    await started.promise;
    expect(runIsolatedAgentJob).toHaveBeenCalledTimes(1);

    const manualResult = await cron.run(job.id, "force");
    expect(manualResult).toEqual({ ok: true, ran: false, reason: "already-running" });
    expect(runIsolatedAgentJob).toHaveBeenCalledTimes(1);

    resolveRun?.({ status: "ok", summary: "done" });
    await finished.promise;
    // Barrier: ensure timer tick finished persisting state before cleanup.
    await cron.list({ includeDisabled: true });

    cron.stop();
  });

<<<<<<< HEAD
  it("#13845: one-shot job with lastStatus=skipped does not re-fire on restart", async () => {
=======
  it("does not double-run a job when cron.run overlaps a due timer tick", async () => {
    const store = await makeStorePath();
    const runStarted = createDeferred<void>();
    const runFinished = createDeferred<void>();
    const runResolvers: Array<
      (value: { status: "ok" | "error" | "skipped"; summary?: string; error?: string }) => void
    > = [];
    const runIsolatedAgentJob = vi.fn(async () => {
      if (runIsolatedAgentJob.mock.calls.length === 1) {
        runStarted.resolve();
      }
      return await new Promise<{ status: "ok" | "error" | "skipped"; summary?: string }>(
        (resolve) => {
          runResolvers.push(resolve);
        },
      );
    });

    let targetJobId = "";
    const cron = await startCronForStore({
      storePath: store.storePath,
      runIsolatedAgentJob,
      onEvent: (evt: CronEvent) => {
        if (evt.jobId === targetJobId && evt.action === "finished") {
          runFinished.resolve();
        }
      },
    });

    const dueAt = Date.now() + 100;
    const job = await cron.add({
      name: "manual-overlap-no-double-run",
      enabled: true,
      schedule: { kind: "at", at: new Date(dueAt).toISOString() },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "overlap" },
      delivery: { mode: "none" },
    });
    targetJobId = job.id;

    const manualRun = cron.run(job.id, "force");
    await runStarted.promise;
    expect(runIsolatedAgentJob).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(120);
    await Promise.resolve();
    expect(runIsolatedAgentJob).toHaveBeenCalledTimes(1);

    runResolvers[0]?.({ status: "ok", summary: "done" });
    await manualRun;
    await runFinished.promise;
    // Barrier for final persistence before cleanup.
    await cron.list({ includeDisabled: true });

    cron.stop();
  });

  it("#13845: one-shot jobs with terminal statuses do not re-fire on restart", async () => {
>>>>>>> 211ab9e4f (Cron: persist manual run marker before unlock (#23993))
    const store = await makeStorePath();
    const pastAt = Date.parse("2026-02-06T09:00:00.000Z");
    // Simulate a one-shot job that was previously skipped (e.g. main session busy).
    // On the old code, runMissedJobs only checked lastStatus === "ok", so a
    // skipped job would pass through and fire again on every restart.
    const skippedJob: CronJob = {
      id: "oneshot-skipped",
      name: "reminder",
      enabled: true,
      deleteAfterRun: true,
      createdAtMs: pastAt - 60_000,
      updatedAtMs: pastAt,
      schedule: { kind: "at", at: new Date(pastAt).toISOString() },
      sessionTarget: "main",
      wakeMode: "now",
      payload: { kind: "systemEvent", text: "⏰ Reminder" },
<<<<<<< HEAD
      state: {
        nextRunAtMs: pastAt,
        lastStatus: "skipped",
        lastRunAtMs: pastAt,
      },
    };
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [skippedJob] }, null, 2),
      "utf-8",
    );
=======
    } as const;
    const terminalStates: Array<{ id: string; state: CronJobState }> = [
      {
        id: "oneshot-skipped",
        state: {
          nextRunAtMs: pastAt,
          lastStatus: "skipped",
          lastRunAtMs: pastAt,
        },
      },
      {
        id: "oneshot-errored",
        state: {
          nextRunAtMs: pastAt,
          lastStatus: "error",
          lastRunAtMs: pastAt,
          lastError: "heartbeat failed",
        },
      },
    ];
    for (const { id, state } of terminalStates) {
      const job: CronJob = { id, ...baseJob, state };
      await fs.writeFile(
        store.storePath,
        JSON.stringify({ version: 1, jobs: [job] }, null, 2),
        "utf-8",
      );
      const enqueueSystemEvent = vi.fn();
      const cron = await startCronForStore({
        storePath: store.storePath,
        enqueueSystemEvent,
        runIsolatedAgentJob: vi.fn().mockResolvedValue({ status: "ok" }),
      });
<<<<<<< HEAD
>>>>>>> a76a9c375 (chore: Fix types in tests 15/N.)

<<<<<<< HEAD
    const enqueueSystemEvent = vi.fn();
    const cron = new CronService({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      enqueueSystemEvent,
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn().mockResolvedValue({ status: "ok" }),
    });

    // start() calls runMissedJobs internally
    await cron.start();

    // The skipped one-shot job must NOT be re-enqueued
    expect(enqueueSystemEvent).not.toHaveBeenCalled();

    cron.stop();
    await store.cleanup();
  });

  it("#13845: one-shot job with lastStatus=error does not re-fire on restart", async () => {
    const store = await makeStorePath();
    const pastAt = Date.parse("2026-02-06T09:00:00.000Z");
    const errorJob: CronJob = {
      id: "oneshot-errored",
      name: "reminder",
      enabled: true,
      deleteAfterRun: true,
      createdAtMs: pastAt - 60_000,
      updatedAtMs: pastAt,
      schedule: { kind: "at", at: new Date(pastAt).toISOString() },
      sessionTarget: "main",
      wakeMode: "now",
      payload: { kind: "systemEvent", text: "⏰ Reminder" },
      state: {
        nextRunAtMs: pastAt,
        lastStatus: "error",
        lastRunAtMs: pastAt,
        lastError: "heartbeat failed",
      },
    };
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [errorJob] }, null, 2),
      "utf-8",
    );

    const enqueueSystemEvent = vi.fn();
    const cron = new CronService({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      enqueueSystemEvent,
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn().mockResolvedValue({ status: "ok" }),
    });

    await cron.start();
    expect(enqueueSystemEvent).not.toHaveBeenCalled();

    cron.stop();
    await store.cleanup();
=======
      await cron.start();
=======
>>>>>>> adac9cb67 (refactor: dedupe gateway and scheduler test scaffolding)
      expect(enqueueSystemEvent).not.toHaveBeenCalled();
      cron.stop();
    }
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
  });

  it("prevents spin loop when cron job completes within the scheduled second (#17821)", async () => {
    const store = await makeStorePath();
    // Simulate a cron job "0 13 * * *" (daily 13:00 UTC) that fires exactly
    // at 13:00:00.000 and completes 7ms later (still in the same second).
    const scheduledAt = Date.parse("2026-02-15T13:00:00.000Z");
    const nextDay = scheduledAt + 86_400_000;

    const cronJob: CronJob = {
      id: "spin-loop-17821",
      name: "daily noon",
      enabled: true,
      createdAtMs: scheduledAt - 86_400_000,
      updatedAtMs: scheduledAt - 86_400_000,
      schedule: { kind: "cron", expr: "0 13 * * *", tz: "UTC" },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "briefing" },
      delivery: { mode: "announce" },
      state: { nextRunAtMs: scheduledAt },
    };
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [cronJob] }, null, 2),
      "utf-8",
    );

    let now = scheduledAt;
    let fireCount = 0;
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async () => {
        // Job completes very quickly (7ms) — still within the same second
        now += 7;
        fireCount++;
        return { status: "ok" as const, summary: "done" };
      }),
    });

    // First timer tick — should fire the job exactly once
    await onTimer(state);

    expect(fireCount).toBe(1);

    const job = state.store?.jobs.find((j) => j.id === "spin-loop-17821");
    expect(job).toBeDefined();
    // nextRunAtMs MUST be in the future (next day), not the same second
    expect(job!.state.nextRunAtMs).toBeDefined();
    expect(job!.state.nextRunAtMs).toBeGreaterThanOrEqual(nextDay);

    // Second timer tick (simulating the timer re-arm) — should NOT fire again
    await onTimer(state);
    expect(fireCount).toBe(1);
  });

<<<<<<< HEAD
=======
  it("enforces a minimum refire gap for second-granularity cron schedules (#17821)", async () => {
    const store = await makeStorePath();
    const scheduledAt = Date.parse("2026-02-15T13:00:00.000Z");

    const cronJob: CronJob = {
      id: "spin-gap-17821",
      name: "second-granularity",
      enabled: true,
      createdAtMs: scheduledAt - 86_400_000,
      updatedAtMs: scheduledAt - 86_400_000,
      schedule: { kind: "cron", expr: "* * * * * *", tz: "UTC" },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "pulse" },
      delivery: { mode: "announce" },
      state: { nextRunAtMs: scheduledAt },
    };
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [cronJob] }, null, 2),
      "utf-8",
    );

    let now = scheduledAt;
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async () => {
        now += 100;
        return { status: "ok" as const, summary: "done" };
      }),
    });

    await onTimer(state);

    const job = state.store?.jobs.find((j) => j.id === "spin-gap-17821");
    expect(job).toBeDefined();
    const endedAt = now;
    const minNext = endedAt + 2_000;
    expect(job!.state.nextRunAtMs).toBeDefined();
    expect(job!.state.nextRunAtMs).toBeGreaterThanOrEqual(minNext);
  });

  it("treats timeoutSeconds=0 as no timeout for isolated agentTurn jobs", async () => {
    const store = await makeStorePath();
    const scheduledAt = Date.parse("2026-02-15T13:00:00.000Z");

    const cronJob: CronJob = {
      id: "no-timeout-0",
      name: "no-timeout",
      enabled: true,
      createdAtMs: scheduledAt - 86_400_000,
      updatedAtMs: scheduledAt - 86_400_000,
      schedule: { kind: "at", at: new Date(scheduledAt).toISOString() },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "work", timeoutSeconds: 0 },
      delivery: { mode: "announce" },
      state: { nextRunAtMs: scheduledAt },
    };
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [cronJob] }, null, 2),
      "utf-8",
    );

    let now = scheduledAt;
    const deferredRun = createDeferred<{ status: "ok"; summary: string }>();
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async () => {
        const result = await deferredRun.promise;
        now += 5;
        return result;
      }),
    });

    const timerPromise = onTimer(state);
    let settled = false;
    void timerPromise.finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    expect(settled).toBe(false);

    deferredRun.resolve({ status: "ok", summary: "done" });
    await timerPromise;

    const job = state.store?.jobs.find((j) => j.id === "no-timeout-0");
    expect(job?.state.lastStatus).toBe("ok");
  });

  it("aborts isolated runs when cron timeout fires", async () => {
    vi.useRealTimers();
    const store = await makeStorePath();
    const scheduledAt = Date.parse("2026-02-15T13:00:00.000Z");
    const cronJob = createIsolatedRegressionJob({
      id: "abort-on-timeout",
      name: "abort timeout",
      scheduledAt,
      schedule: { kind: "at", at: new Date(scheduledAt).toISOString() },
      payload: { kind: "agentTurn", message: "work", timeoutSeconds: 0.01 },
      state: { nextRunAtMs: scheduledAt },
    });
    await writeCronJobs(store.storePath, [cronJob]);

    let now = scheduledAt;
    const abortAwareRunner = createAbortAwareIsolatedRunner();
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async (params) => {
        const result = await abortAwareRunner.runIsolatedAgentJob(params);
        now += 5;
        return result;
      }),
    });

    await onTimer(state);

    expect(abortAwareRunner.getObservedAbortSignal()).toBeDefined();
    expect(abortAwareRunner.getObservedAbortSignal()?.aborted).toBe(true);
    const job = state.store?.jobs.find((entry) => entry.id === "abort-on-timeout");
    expect(job?.state.lastStatus).toBe("error");
    expect(job?.state.lastError).toContain("timed out");
  });

  it("suppresses isolated follow-up side effects after timeout", async () => {
    vi.useRealTimers();
    const store = await makeStorePath();
    const scheduledAt = Date.parse("2026-02-15T13:00:00.000Z");
    const enqueueSystemEvent = vi.fn();

    const cronJob = createIsolatedRegressionJob({
      id: "timeout-side-effects",
      name: "timeout side effects",
      scheduledAt,
      schedule: { kind: "every", everyMs: 60_000, anchorMs: scheduledAt },
      payload: { kind: "agentTurn", message: "work", timeoutSeconds: 0.01 },
      state: { nextRunAtMs: scheduledAt },
    });
    await writeCronJobs(store.storePath, [cronJob]);

    let now = scheduledAt;
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent,
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async (params) => {
        const abortSignal = params.abortSignal;
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => {
            abortSignal?.removeEventListener("abort", onAbort);
            now += 100;
            reject(new Error("aborted"));
          };
          abortSignal?.addEventListener("abort", onAbort, { once: true });
        });
        return {
          status: "ok" as const,
          summary: "late-summary",
          delivered: false,
          error:
            abortSignal?.aborted && typeof abortSignal.reason === "string"
              ? abortSignal.reason
              : undefined,
        };
      }),
    });

    await onTimer(state);

    const jobAfterTimeout = state.store?.jobs.find((j) => j.id === "timeout-side-effects");
    expect(jobAfterTimeout?.state.lastStatus).toBe("error");
    expect(jobAfterTimeout?.state.lastError).toContain("timed out");
    expect(enqueueSystemEvent).not.toHaveBeenCalled();
  });

  it("applies timeoutSeconds to manual cron.run isolated executions", async () => {
    vi.useRealTimers();
    const store = await makeStorePath();
    const abortAwareRunner = createAbortAwareIsolatedRunner();

    const cron = await startCronForStore({
      storePath: store.storePath,
      runIsolatedAgentJob: abortAwareRunner.runIsolatedAgentJob,
    });

    const job = await cron.add({
      name: "manual timeout",
      enabled: true,
      schedule: { kind: "every", everyMs: 60_000, anchorMs: Date.now() },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "work", timeoutSeconds: 0.01 },
      delivery: { mode: "none" },
    });

    const result = await cron.run(job.id, "force");
    expect(result).toEqual({ ok: true, ran: true });
    expect(abortAwareRunner.getObservedAbortSignal()).toBeDefined();
    expect(abortAwareRunner.getObservedAbortSignal()?.aborted).toBe(true);

    const updated = (await cron.list({ includeDisabled: true })).find(
      (entry) => entry.id === job.id,
    );
    expect(updated?.state.lastStatus).toBe("error");
    expect(updated?.state.lastError).toContain("timed out");
    expect(updated?.state.runningAtMs).toBeUndefined();

    cron.stop();
  });

  it("applies timeoutSeconds to startup catch-up isolated executions", async () => {
    vi.useRealTimers();
    const store = await makeStorePath();
    const scheduledAt = Date.parse("2026-02-15T13:00:00.000Z");
    const cronJob = createIsolatedRegressionJob({
      id: "startup-timeout",
      name: "startup timeout",
      scheduledAt,
      schedule: { kind: "at", at: new Date(scheduledAt).toISOString() },
      payload: { kind: "agentTurn", message: "work", timeoutSeconds: 0.01 },
      state: { nextRunAtMs: scheduledAt },
    });
    await writeCronJobs(store.storePath, [cronJob]);

    let now = scheduledAt;
    const abortAwareRunner = createAbortAwareIsolatedRunner();
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async (params) => {
        const result = await abortAwareRunner.runIsolatedAgentJob(params);
        now += 5;
        return result;
      }),
    });

    await runMissedJobs(state);

    expect(abortAwareRunner.getObservedAbortSignal()).toBeDefined();
    expect(abortAwareRunner.getObservedAbortSignal()?.aborted).toBe(true);
    const job = state.store?.jobs.find((entry) => entry.id === "startup-timeout");
    expect(job?.state.lastStatus).toBe("error");
    expect(job?.state.lastError).toContain("timed out");
  });

  it("respects abort signals while retrying main-session wake-now heartbeat runs", async () => {
    vi.useRealTimers();
    const abortController = new AbortController();
    const runHeartbeatOnce = vi.fn(
      async (): Promise<HeartbeatRunResult> => ({
        status: "skipped",
        reason: "requests-in-flight",
      }),
    );
    const enqueueSystemEvent = vi.fn();
    const requestHeartbeatNow = vi.fn();
    const mainJob: CronJob = {
      id: "main-abort",
      name: "main abort",
      enabled: true,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      schedule: { kind: "every", everyMs: 60_000, anchorMs: Date.now() },
      sessionTarget: "main",
      wakeMode: "now",
      payload: { kind: "systemEvent", text: "tick" },
      state: {},
    };
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: "/tmp/openclaw-cron-abort-test/jobs.json",
      log: noopLogger,
      nowMs: () => Date.now(),
      enqueueSystemEvent,
      requestHeartbeatNow,
      runHeartbeatOnce,
      wakeNowHeartbeatBusyMaxWaitMs: 30,
      wakeNowHeartbeatBusyRetryDelayMs: 5,
      runIsolatedAgentJob: createDefaultIsolatedRunner(),
    });

    setTimeout(() => {
      abortController.abort();
    }, 10);

    const result = await executeJobCore(state, mainJob, abortController.signal);

    expect(result.status).toBe("error");
    expect(result.error).toContain("timed out");
    expect(enqueueSystemEvent).toHaveBeenCalledTimes(1);
    expect(runHeartbeatOnce).toHaveBeenCalled();
    expect(requestHeartbeatNow).not.toHaveBeenCalled();
  });

  it("retries cron schedule computation from the next second when the first attempt returns undefined (#17821)", () => {
    const scheduledAt = Date.parse("2026-02-15T13:00:00.000Z");
    const cronJob: CronJob = {
      id: "retry-next-second-17821",
      name: "retry",
      enabled: true,
      createdAtMs: scheduledAt - 86_400_000,
      updatedAtMs: scheduledAt - 86_400_000,
      schedule: { kind: "cron", expr: "0 13 * * *", tz: "UTC" },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "briefing" },
      delivery: { mode: "announce" },
      state: {},
    };

    const original = schedule.computeNextRunAtMs;
    const spy = vi.spyOn(schedule, "computeNextRunAtMs");
    try {
      spy
        .mockImplementationOnce(() => undefined)
        .mockImplementation((sched, nowMs) => original(sched, nowMs));

      const expected = original(cronJob.schedule, scheduledAt + 1_000);
      expect(expected).toBeDefined();

      const next = computeJobNextRunAtMs(cronJob, scheduledAt);
      expect(next).toBe(expected);
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
  });

>>>>>>> 75001a049 (fix cron announce routing and timeout handling)
  it("records per-job start time and duration for batched due jobs", async () => {
    const store = await makeStorePath();
    const dueAt = Date.parse("2026-02-06T10:05:01.000Z");
    const first = createDueIsolatedJob({ id: "batch-first", nowMs: dueAt, nextRunAtMs: dueAt });
    const second = createDueIsolatedJob({ id: "batch-second", nowMs: dueAt, nextRunAtMs: dueAt });
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [first, second] }, null, 2),
      "utf-8",
    );

    let now = dueAt;
    const events: CronEvent[] = [];
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      onEvent: (evt) => {
        events.push(evt);
      },
      runIsolatedAgentJob: vi.fn(async (params: { job: { id: string } }) => {
        now += params.job.id === first.id ? 50 : 20;
        return { status: "ok" as const, summary: "ok" };
      }),
    });

    await onTimer(state);

    const jobs = state.store?.jobs ?? [];
    const firstDone = jobs.find((job) => job.id === first.id);
    const secondDone = jobs.find((job) => job.id === second.id);
    const startedAtEvents = events
      .filter((evt) => evt.action === "started")
      .map((evt) => evt.runAtMs);

    expect(firstDone?.state.lastRunAtMs).toBe(dueAt);
    expect(firstDone?.state.lastDurationMs).toBe(50);
    expect(secondDone?.state.lastRunAtMs).toBe(dueAt + 50);
    expect(secondDone?.state.lastDurationMs).toBe(20);
    expect(startedAtEvents).toEqual([dueAt, dueAt + 50]);
  });

  it("honors cron maxConcurrentRuns for due jobs", async () => {
    vi.useRealTimers();
    const store = await makeStorePath();
    const dueAt = Date.parse("2026-02-06T10:05:01.000Z");
    const first = createDueIsolatedJob({ id: "parallel-first", nowMs: dueAt, nextRunAtMs: dueAt });
    const second = createDueIsolatedJob({
      id: "parallel-second",
      nowMs: dueAt,
      nextRunAtMs: dueAt,
    });
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [first, second] }, null, 2),
      "utf-8",
    );

    let now = dueAt;
    let activeRuns = 0;
    let peakActiveRuns = 0;
    const bothRunsStarted = createDeferred<void>();
    const firstRun = createDeferred<{ status: "ok"; summary: string }>();
    const secondRun = createDeferred<{ status: "ok"; summary: string }>();
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      cronConfig: { maxConcurrentRuns: 2 },
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async (params: { job: { id: string } }) => {
        activeRuns += 1;
        peakActiveRuns = Math.max(peakActiveRuns, activeRuns);
        if (peakActiveRuns >= 2) {
          bothRunsStarted.resolve();
        }
        try {
          const result =
            params.job.id === first.id ? await firstRun.promise : await secondRun.promise;
          now += 10;
          return result;
        } finally {
          activeRuns -= 1;
        }
      }),
    });

    const timerPromise = onTimer(state);
    await Promise.race([
      bothRunsStarted.promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timed out waiting for concurrent job starts")), 1_000),
      ),
    ]);

    expect(peakActiveRuns).toBe(2);

    firstRun.resolve({ status: "ok", summary: "first done" });
    secondRun.resolve({ status: "ok", summary: "second done" });
    await timerPromise;

    const jobs = state.store?.jobs ?? [];
    expect(jobs.find((job) => job.id === first.id)?.state.lastStatus).toBe("ok");
    expect(jobs.find((job) => job.id === second.id)?.state.lastStatus).toBe("ok");
  });
});
