import { Cron } from "croner";
import type { CronSchedule } from "./types.js";
import { parseAbsoluteTimeMs } from "./parse.js";

export function computeNextRunAtMs(schedule: CronSchedule, nowMs: number): number | undefined {
  if (schedule.kind === "at") {
    // Handle both canonical `at` (string) and legacy `atMs` (number) fields.
    // The store migration should convert atMs→at, but be defensive in case
    // the migration hasn't run yet or was bypassed.
    const sched = schedule as { at?: string; atMs?: number | string };
    const atMs =
      typeof sched.atMs === "number" && Number.isFinite(sched.atMs) && sched.atMs > 0
        ? sched.atMs
        : typeof sched.atMs === "string"
          ? parseAbsoluteTimeMs(sched.atMs)
          : typeof sched.at === "string"
            ? parseAbsoluteTimeMs(sched.at)
            : null;
    if (atMs === null) {
      return undefined;
    }
    return atMs > nowMs ? atMs : undefined;
  }

  if (schedule.kind === "every") {
    const everyMs = Math.max(1, Math.floor(schedule.everyMs));
    const anchor = Math.max(0, Math.floor(schedule.anchorMs ?? nowMs));
    if (nowMs < anchor) {
      return anchor;
    }
    const elapsed = nowMs - anchor;
    const steps = Math.max(1, Math.floor((elapsed + everyMs - 1) / everyMs));
    return anchor + steps * everyMs;
  }

  const expr = schedule.expr.trim();
  if (!expr) {
    return undefined;
  }
  const cron = new Cron(expr, {
    timezone: schedule.tz?.trim() || undefined,
    catch: false,
  });
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  const next = cron.nextRun(new Date(nowMs));
  return next ? next.getTime() : undefined;
=======
  // Use a tiny lookback (1ms) so croner doesn't skip the current second
  // boundary. Without this, a job updated at exactly its cron time would
  // be scheduled for the *next* matching time (e.g. 24h later for daily).
  const next = cron.nextRun(new Date(nowMs - 1));
=======
  // Cron operates at second granularity, so floor nowMs to the start of the
  // current second.  We ask croner for the next occurrence strictly *after*
  // nowSecondMs so that a job whose schedule matches the current second is
  // never re-scheduled into the same (already-elapsed) second.
  //
  // Previous code used `nowSecondMs - 1` which caused croner to return the
  // current second as a valid next-run, leading to rapid duplicate fires when
  // multiple jobs triggered simultaneously (see #14164).
  const nowSecondMs = Math.floor(nowMs / 1000) * 1000;
<<<<<<< HEAD
  const next = cron.nextRun(new Date(nowSecondMs - 1));
>>>>>>> 07375a65d (fix(cron): recover flat params when LLM omits job wrapper (#12124))
=======
  const next = cron.nextRun(new Date(nowSecondMs));
>>>>>>> dd6047d99 (fix(cron): prevent duplicate fires when multiple jobs trigger simultaneously (#14256))
=======
  // Ask croner for the next occurrence starting from the NEXT second.
  // This prevents re-scheduling into the current second when a job fires
  // at 13:00:00.014 and completes at 13:00:00.021 — without this fix,
  // croner could return 13:00:00.000 (same second) causing a spin loop
  // where the job fires hundreds of times per second (see #17821).
  //
  // By asking from the next second (e.g., 13:00:01.000), we ensure croner
  // returns the following day's occurrence (e.g., 13:00:00.000 tomorrow).
  //
  // This also correctly handles the "before match" case: if nowMs is
  // 11:59:59.500, we ask from 12:00:00.000, and croner returns 12:00:00.000
  // (today's match) since it uses >= semantics for the start time.
  const askFromNextSecondMs = Math.floor(nowMs / 1000) * 1000 + 1000;
  const next = cron.nextRun(new Date(askFromNextSecondMs));
>>>>>>> de6cc05e7 (fix(cron): prevent spin loop when job completes within firing second (#17821))
  if (!next) {
    return undefined;
  }
  const nextMs = next.getTime();
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  return Number.isFinite(nextMs) && nextMs >= nowMs ? nextMs : undefined;
>>>>>>> 8fae55e8e (fix(cron): share isolated announce flow + harden cron scheduling/delivery (#11641))
=======
  return Number.isFinite(nextMs) && nextMs >= nowSecondMs ? nextMs : undefined;
>>>>>>> 07375a65d (fix(cron): recover flat params when LLM omits job wrapper (#12124))
=======
  return Number.isFinite(nextMs) && nextMs > nowSecondMs ? nextMs : undefined;
>>>>>>> dd6047d99 (fix(cron): prevent duplicate fires when multiple jobs trigger simultaneously (#14256))
=======
  return Number.isFinite(nextMs) ? nextMs : undefined;
>>>>>>> de6cc05e7 (fix(cron): prevent spin loop when job completes within firing second (#17821))
}
