import crypto from "node:crypto";
<<<<<<< HEAD

import { computeNextRunAtMs } from "../schedule.js";
=======
import { parseAbsoluteTimeMs } from "../parse.js";
import { computeNextRunAtMs } from "../schedule.js";
import {
  normalizeCronStaggerMs,
  resolveCronStaggerMs,
  resolveDefaultCronStaggerMs,
} from "../stagger.js";
>>>>>>> 6dcc052bb (fix: stabilize model catalog and pi discovery auth storage compatibility)
import type {
  CronJob,
  CronJobCreate,
  CronJobPatch,
  CronPayload,
  CronPayloadPatch,
} from "../types.js";
<<<<<<< HEAD
=======
import { normalizeHttpWebhookUrl } from "../webhook-url.js";
>>>>>>> 6dcc052bb (fix: stabilize model catalog and pi discovery auth storage compatibility)
import {
  normalizeOptionalAgentId,
  normalizeOptionalText,
  normalizePayloadToSystemText,
  normalizeRequiredName,
} from "./normalize.js";
import type { CronServiceState } from "./state.js";

const STUCK_RUN_MS = 2 * 60 * 60 * 1000;

<<<<<<< HEAD
=======
function resolveStableCronOffsetMs(jobId: string, staggerMs: number) {
  if (staggerMs <= 1) {
    return 0;
  }
  const digest = crypto.createHash("sha256").update(jobId).digest();
  return digest.readUInt32BE(0) % staggerMs;
}

function computeStaggeredCronNextRunAtMs(job: CronJob, nowMs: number) {
  if (job.schedule.kind !== "cron") {
    return computeNextRunAtMs(job.schedule, nowMs);
  }

  const staggerMs = resolveCronStaggerMs(job.schedule);
  const offsetMs = resolveStableCronOffsetMs(job.id, staggerMs);
  if (offsetMs <= 0) {
    return computeNextRunAtMs(job.schedule, nowMs);
  }

  // Shift the schedule cursor backwards by the per-job offset so we can still
  // target the current schedule window if its staggered slot has not passed yet.
  let cursorMs = Math.max(0, nowMs - offsetMs);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const baseNext = computeNextRunAtMs(job.schedule, cursorMs);
    if (baseNext === undefined) {
      return undefined;
    }
    const shifted = baseNext + offsetMs;
    if (shifted > nowMs) {
      return shifted;
    }
    cursorMs = Math.max(cursorMs + 1, baseNext + 1_000);
  }
  return undefined;
}

function isFiniteTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

>>>>>>> e1c8094ad (fix: schedule nextWakeAtMs for isolated sessionTarget cron jobs (#19541))
function resolveEveryAnchorMs(params: {
  schedule: { everyMs: number; anchorMs?: number };
  fallbackAnchorMs: number;
}) {
  const raw = params.schedule.anchorMs;
  if (isFiniteTimestamp(raw)) {
    return Math.max(0, Math.floor(raw));
  }
  if (isFiniteTimestamp(params.fallbackAnchorMs)) {
    return Math.max(0, Math.floor(params.fallbackAnchorMs));
  }
  return 0;
}

export function assertSupportedJobSpec(job: Pick<CronJob, "sessionTarget" | "payload">) {
  if (job.sessionTarget === "main" && job.payload.kind !== "systemEvent") {
    throw new Error('main cron jobs require payload.kind="systemEvent"');
  }
  if (job.sessionTarget === "isolated" && job.payload.kind !== "agentTurn") {
    throw new Error('isolated cron jobs require payload.kind="agentTurn"');
  }
}

export function findJobOrThrow(state: CronServiceState, id: string) {
  const job = state.store?.jobs.find((j) => j.id === id);
  if (!job) throw new Error(`unknown cron job id: ${id}`);
  return job;
}

export function computeJobNextRunAtMs(job: CronJob, nowMs: number): number | undefined {
<<<<<<< HEAD
  if (!job.enabled) return undefined;
=======
  if (!job.enabled) {
    return undefined;
  }
  if (job.schedule.kind === "every") {
<<<<<<< HEAD
=======
    const everyMs = Math.max(1, Math.floor(job.schedule.everyMs));
    const lastRunAtMs = job.state.lastRunAtMs;
    if (typeof lastRunAtMs === "number" && Number.isFinite(lastRunAtMs)) {
      const nextFromLastRun = Math.floor(lastRunAtMs) + everyMs;
      if (nextFromLastRun > nowMs) {
        return nextFromLastRun;
      }
    }
    const fallbackAnchorMs = isFiniteTimestamp(job.createdAtMs) ? job.createdAtMs : nowMs;
>>>>>>> e1c8094ad (fix: schedule nextWakeAtMs for isolated sessionTarget cron jobs (#19541))
    const anchorMs = resolveEveryAnchorMs({
      schedule: job.schedule,
      fallbackAnchorMs,
    });
<<<<<<< HEAD
    return computeNextRunAtMs({ ...job.schedule, anchorMs }, nowMs);
=======
    const next = computeNextRunAtMs({ ...job.schedule, everyMs, anchorMs }, nowMs);
    return isFiniteTimestamp(next) ? next : undefined;
>>>>>>> e1c8094ad (fix: schedule nextWakeAtMs for isolated sessionTarget cron jobs (#19541))
  }
>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
  if (job.schedule.kind === "at") {
    // One-shot jobs stay due until they successfully finish.
<<<<<<< HEAD
    if (job.state.lastStatus === "ok" && job.state.lastRunAtMs) return undefined;
    return job.schedule.atMs;
  }
  return computeNextRunAtMs(job.schedule, nowMs);
}

<<<<<<< HEAD
export function recomputeNextRuns(state: CronServiceState) {
  if (!state.store) return;
  const now = state.deps.nowMs();
  for (const job of state.store.jobs) {
    if (!job.state) job.state = {};
=======
export function recomputeNextRuns(state: CronServiceState): boolean {
=======
    if (job.state.lastStatus === "ok" && job.state.lastRunAtMs) {
      return undefined;
    }
    // Handle both canonical `at` (string) and legacy `atMs` (number) fields.
    // The store migration should convert atMs→at, but be defensive in case
    // the migration hasn't run yet or was bypassed.
    const schedule = job.schedule as { at?: string; atMs?: number | string };
    const atMs =
      typeof schedule.atMs === "number" && Number.isFinite(schedule.atMs) && schedule.atMs > 0
        ? schedule.atMs
        : typeof schedule.atMs === "string"
          ? parseAbsoluteTimeMs(schedule.atMs)
          : typeof schedule.at === "string"
            ? parseAbsoluteTimeMs(schedule.at)
            : null;
    return atMs !== null && Number.isFinite(atMs) ? atMs : undefined;
  }
  const next = computeStaggeredCronNextRunAtMs(job, nowMs);
  if (next === undefined && job.schedule.kind === "cron") {
    const nextSecondMs = Math.floor(nowMs / 1000) * 1000 + 1000;
    return computeStaggeredCronNextRunAtMs(job, nextSecondMs);
  }
  return isFiniteTimestamp(next) ? next : undefined;
}

/** Maximum consecutive schedule errors before auto-disabling a job. */
const MAX_SCHEDULE_ERRORS = 3;

function recordScheduleComputeError(params: {
  state: CronServiceState;
  job: CronJob;
  err: unknown;
}): boolean {
  const { state, job, err } = params;
  const errorCount = (job.state.scheduleErrorCount ?? 0) + 1;
  const errText = String(err);

  job.state.scheduleErrorCount = errorCount;
  job.state.nextRunAtMs = undefined;
  job.state.lastError = `schedule error: ${errText}`;

  if (errorCount >= MAX_SCHEDULE_ERRORS) {
    job.enabled = false;
    state.deps.log.error(
      { jobId: job.id, name: job.name, errorCount, err: errText },
      "cron: auto-disabled job after repeated schedule errors",
    );
  } else {
    state.deps.log.warn(
      { jobId: job.id, name: job.name, errorCount, err: errText },
      "cron: failed to compute next run for job (skipping)",
    );
  }

  return true;
}

function normalizeJobTickState(params: { state: CronServiceState; job: CronJob; nowMs: number }): {
  changed: boolean;
  skip: boolean;
} {
  const { state, job, nowMs } = params;
  let changed = false;

  if (!job.state) {
    job.state = {};
    changed = true;
  }

  if (!job.enabled) {
    if (job.state.nextRunAtMs !== undefined) {
      job.state.nextRunAtMs = undefined;
      changed = true;
    }
    if (job.state.runningAtMs !== undefined) {
      job.state.runningAtMs = undefined;
      changed = true;
    }
    return { changed, skip: true };
  }

  if (!isFiniteTimestamp(job.state.nextRunAtMs) && job.state.nextRunAtMs !== undefined) {
    job.state.nextRunAtMs = undefined;
    changed = true;
  }

  const runningAt = job.state.runningAtMs;
  if (typeof runningAt === "number" && nowMs - runningAt > STUCK_RUN_MS) {
    state.deps.log.warn(
      { jobId: job.id, runningAtMs: runningAt },
      "cron: clearing stuck running marker",
    );
    job.state.runningAtMs = undefined;
    changed = true;
  }

  return { changed, skip: false };
}

function walkSchedulableJobs(
  state: CronServiceState,
  fn: (params: { job: CronJob; nowMs: number }) => boolean,
): boolean {
>>>>>>> e1c8094ad (fix: schedule nextWakeAtMs for isolated sessionTarget cron jobs (#19541))
  if (!state.store) {
    return false;
  }
  let changed = false;
  const now = state.deps.nowMs();
  for (const job of state.store.jobs) {
    if (!job.state) {
      job.state = {};
      changed = true;
    }
<<<<<<< HEAD
>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
    if (!job.enabled) {
      if (job.state.nextRunAtMs !== undefined) {
        job.state.nextRunAtMs = undefined;
=======
    if (tick.skip) {
      continue;
    }
    if (fn({ job, nowMs: now })) {
      changed = true;
    }
  }
  return changed;
}

function recomputeJobNextRunAtMs(params: { state: CronServiceState; job: CronJob; nowMs: number }) {
  let changed = false;
  try {
    const newNext = computeJobNextRunAtMs(params.job, params.nowMs);
    if (params.job.state.nextRunAtMs !== newNext) {
      params.job.state.nextRunAtMs = newNext;
      changed = true;
    }
    // Clear schedule error count on successful computation.
    if (params.job.state.scheduleErrorCount) {
      params.job.state.scheduleErrorCount = undefined;
      changed = true;
    }
  } catch (err) {
    if (recordScheduleComputeError({ state: params.state, job: params.job, err })) {
      changed = true;
    }
  }
  return changed;
}

export function recomputeNextRuns(state: CronServiceState): boolean {
  return walkSchedulableJobs(state, ({ job, nowMs: now }) => {
    let changed = false;
    // Only recompute if nextRunAtMs is missing or already past-due.
    // Preserving a still-future nextRunAtMs avoids accidentally advancing
    // a job that hasn't fired yet (e.g. during restart recovery).
    const nextRun = job.state.nextRunAtMs;
    const isDueOrMissing = !isFiniteTimestamp(nextRun) || now >= nextRun;
    if (isDueOrMissing) {
      if (recomputeJobNextRunAtMs({ state, job, nowMs: now })) {
>>>>>>> e1c8094ad (fix: schedule nextWakeAtMs for isolated sessionTarget cron jobs (#19541))
        changed = true;
      }
      if (job.state.runningAtMs !== undefined) {
        job.state.runningAtMs = undefined;
        changed = true;
      }
      continue;
    }
    const runningAt = job.state.runningAtMs;
    if (typeof runningAt === "number" && now - runningAt > STUCK_RUN_MS) {
      state.deps.log.warn(
        { jobId: job.id, runningAtMs: runningAt },
        "cron: clearing stuck running marker",
      );
      job.state.runningAtMs = undefined;
      changed = true;
    }
    const newNext = computeJobNextRunAtMs(job, now);
    if (job.state.nextRunAtMs !== newNext) {
      job.state.nextRunAtMs = newNext;
      changed = true;
    }
  }
  return changed;
}

/**
 * Maintenance-only version of recomputeNextRuns that handles disabled jobs
 * and stuck markers, but does NOT recompute nextRunAtMs for enabled jobs
 * with existing values. Used during timer ticks when no due jobs were found
 * to prevent silently advancing past-due nextRunAtMs values without execution
 * (see #13992).
 */
export function recomputeNextRunsForMaintenance(state: CronServiceState): boolean {
  if (!state.store) {
    return false;
  }
  let changed = false;
  const now = state.deps.nowMs();
  for (const job of state.store.jobs) {
    if (!job.state) {
      job.state = {};
      changed = true;
    }
    if (!job.enabled) {
      if (job.state.nextRunAtMs !== undefined) {
        job.state.nextRunAtMs = undefined;
        changed = true;
      }
      if (job.state.runningAtMs !== undefined) {
        job.state.runningAtMs = undefined;
        changed = true;
      }
      continue;
    }
    const runningAt = job.state.runningAtMs;
    if (typeof runningAt === "number" && now - runningAt > STUCK_RUN_MS) {
      state.deps.log.warn(
        { jobId: job.id, runningAtMs: runningAt },
        "cron: clearing stuck running marker",
      );
      job.state.runningAtMs = undefined;
      changed = true;
    }
    // Only compute missing nextRunAtMs, do NOT recompute existing ones.
    // If a job was past-due but not found by findDueJobs, recomputing would
    // cause it to be silently skipped.
<<<<<<< HEAD
    if (job.state.nextRunAtMs === undefined) {
      const newNext = computeJobNextRunAtMs(job, now);
      if (newNext !== undefined) {
        job.state.nextRunAtMs = newNext;
=======
    if (!isFiniteTimestamp(job.state.nextRunAtMs)) {
      if (recomputeJobNextRunAtMs({ state, job, nowMs: now })) {
>>>>>>> e1c8094ad (fix: schedule nextWakeAtMs for isolated sessionTarget cron jobs (#19541))
        changed = true;
      }
    }
  }
  return changed;
}

export function nextWakeAtMs(state: CronServiceState) {
  const jobs = state.store?.jobs ?? [];
<<<<<<< HEAD
  const enabled = jobs.filter((j) => j.enabled && typeof j.state.nextRunAtMs === "number");
  if (enabled.length === 0) return undefined;
  return enabled.reduce(
    (min, j) => Math.min(min, j.state.nextRunAtMs as number),
    enabled[0].state.nextRunAtMs as number,
  );
=======
  const enabled = jobs.filter((j) => j.enabled && isFiniteTimestamp(j.state.nextRunAtMs));
  if (enabled.length === 0) {
    return undefined;
  }
  const first = enabled[0]?.state.nextRunAtMs;
  if (!isFiniteTimestamp(first)) {
    return undefined;
  }
  return enabled.reduce((min, j) => {
    const next = j.state.nextRunAtMs;
    return isFiniteTimestamp(next) ? Math.min(min, next) : min;
  }, first);
>>>>>>> e1c8094ad (fix: schedule nextWakeAtMs for isolated sessionTarget cron jobs (#19541))
}

export function createJob(state: CronServiceState, input: CronJobCreate): CronJob {
  const now = state.deps.nowMs();
  const id = crypto.randomUUID();
<<<<<<< HEAD
=======
  const schedule =
    input.schedule.kind === "every"
      ? {
          ...input.schedule,
          anchorMs: resolveEveryAnchorMs({
            schedule: input.schedule,
            fallbackAnchorMs: now,
          }),
        }
      : input.schedule;
  const deleteAfterRun =
    typeof input.deleteAfterRun === "boolean"
      ? input.deleteAfterRun
      : schedule.kind === "at"
        ? true
        : undefined;
  const enabled = typeof input.enabled === "boolean" ? input.enabled : true;
>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
  const job: CronJob = {
    id,
    agentId: normalizeOptionalAgentId(input.agentId),
    name: normalizeRequiredName(input.name),
    description: normalizeOptionalText(input.description),
    enabled: input.enabled !== false,
    deleteAfterRun: input.deleteAfterRun,
    createdAtMs: now,
    updatedAtMs: now,
    schedule,
    sessionTarget: input.sessionTarget,
    wakeMode: input.wakeMode,
    payload: input.payload,
    isolation: input.isolation,
    state: {
      ...input.state,
    },
  };
  assertSupportedJobSpec(job);
  job.state.nextRunAtMs = computeJobNextRunAtMs(job, now);
  return job;
}

export function applyJobPatch(job: CronJob, patch: CronJobPatch) {
  if ("name" in patch) job.name = normalizeRequiredName(patch.name);
  if ("description" in patch) job.description = normalizeOptionalText(patch.description);
  if (typeof patch.enabled === "boolean") job.enabled = patch.enabled;
  if (typeof patch.deleteAfterRun === "boolean") job.deleteAfterRun = patch.deleteAfterRun;
  if (patch.schedule) job.schedule = patch.schedule;
  if (patch.sessionTarget) job.sessionTarget = patch.sessionTarget;
  if (patch.wakeMode) job.wakeMode = patch.wakeMode;
  if (patch.payload) job.payload = mergeCronPayload(job.payload, patch.payload);
  if (patch.isolation) job.isolation = patch.isolation;
  if (patch.state) job.state = { ...job.state, ...patch.state };
  if ("agentId" in patch) {
    job.agentId = normalizeOptionalAgentId((patch as { agentId?: unknown }).agentId);
  }
  assertSupportedJobSpec(job);
}

function mergeCronPayload(existing: CronPayload, patch: CronPayloadPatch): CronPayload {
  if (patch.kind !== existing.kind) {
    return buildPayloadFromPatch(patch);
  }

  if (patch.kind === "systemEvent") {
    if (existing.kind !== "systemEvent") {
      return buildPayloadFromPatch(patch);
    }
    const text = typeof patch.text === "string" ? patch.text : existing.text;
    return { kind: "systemEvent", text };
  }

  if (existing.kind !== "agentTurn") {
    return buildPayloadFromPatch(patch);
  }

  const next: Extract<CronPayload, { kind: "agentTurn" }> = { ...existing };
<<<<<<< HEAD
  if (typeof patch.message === "string") next.message = patch.message;
  if (typeof patch.model === "string") next.model = patch.model;
  if (typeof patch.thinking === "string") next.thinking = patch.thinking;
  if (typeof patch.timeoutSeconds === "number") next.timeoutSeconds = patch.timeoutSeconds;
  if (typeof patch.deliver === "boolean") next.deliver = patch.deliver;
  if (typeof patch.channel === "string") next.channel = patch.channel;
  if (typeof patch.to === "string") next.to = patch.to;
=======
  if (typeof patch.message === "string") {
    next.message = patch.message;
  }
  if (typeof patch.model === "string") {
    next.model = patch.model;
  }
  if (typeof patch.thinking === "string") {
    next.thinking = patch.thinking;
  }
  if (typeof patch.timeoutSeconds === "number") {
    next.timeoutSeconds = patch.timeoutSeconds;
  }
  if (typeof patch.allowUnsafeExternalContent === "boolean") {
    next.allowUnsafeExternalContent = patch.allowUnsafeExternalContent;
  }
  if (typeof patch.deliver === "boolean") {
    next.deliver = patch.deliver;
  }
  if (typeof patch.channel === "string") {
    next.channel = patch.channel;
  }
  if (typeof patch.to === "string") {
    next.to = patch.to;
  }
>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
  if (typeof patch.bestEffortDeliver === "boolean") {
    next.bestEffortDeliver = patch.bestEffortDeliver;
  }
  return next;
}

function buildPayloadFromPatch(patch: CronPayloadPatch): CronPayload {
  if (patch.kind === "systemEvent") {
    if (typeof patch.text !== "string" || patch.text.length === 0) {
      throw new Error('cron.update payload.kind="systemEvent" requires text');
    }
    return { kind: "systemEvent", text: patch.text };
  }

  if (typeof patch.message !== "string" || patch.message.length === 0) {
    throw new Error('cron.update payload.kind="agentTurn" requires message');
  }

  return {
    kind: "agentTurn",
    message: patch.message,
    model: patch.model,
    thinking: patch.thinking,
    timeoutSeconds: patch.timeoutSeconds,
    allowUnsafeExternalContent: patch.allowUnsafeExternalContent,
    deliver: patch.deliver,
    channel: patch.channel,
    to: patch.to,
    bestEffortDeliver: patch.bestEffortDeliver,
  };
}

export function isJobDue(job: CronJob, nowMs: number, opts: { forced: boolean }) {
<<<<<<< HEAD
  if (opts.forced) return true;
=======
  if (typeof job.state.runningAtMs === "number") {
    return false;
  }
  if (opts.forced) {
    return true;
  }
>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
  return job.enabled && typeof job.state.nextRunAtMs === "number" && nowMs >= job.state.nextRunAtMs;
}

export function resolveJobPayloadTextForMain(job: CronJob): string | undefined {
  if (job.payload.kind !== "systemEvent") return undefined;
  const text = normalizePayloadToSystemText(job.payload);
  return text.trim() ? text : undefined;
}
