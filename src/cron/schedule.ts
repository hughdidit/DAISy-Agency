import { Cron } from "croner";
import type { CronSchedule } from "./types.js";

function resolveCronTimezone(tz?: string) {
  const trimmed = typeof tz === "string" ? tz.trim() : "";
  if (trimmed) {
    return trimmed;
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function computeNextRunAtMs(schedule: CronSchedule, nowMs: number): number | undefined {
  if (schedule.kind === "at") {
    return schedule.atMs > nowMs ? schedule.atMs : undefined;
  }

  if (schedule.kind === "every") {
    const everyMs = Math.max(1, Math.floor(schedule.everyMs));
    const anchor = Math.max(0, Math.floor(schedule.anchorMs ?? nowMs));
    if (nowMs < anchor) return anchor;
    const elapsed = nowMs - anchor;
    const steps = Math.max(1, Math.floor((elapsed + everyMs - 1) / everyMs));
    return anchor + steps * everyMs;
  }

  const expr = schedule.expr.trim();
  if (!expr) return undefined;
  const cron = new Cron(expr, {
    timezone: resolveCronTimezone(schedule.tz),
    catch: false,
  });
  let cursor = nowMs;
  for (let attempt = 0; attempt < 3; attempt++) {
    const next = cron.nextRun(new Date(cursor));
    if (!next) {
      return undefined;
    }
    const nextMs = next.getTime();
    if (Number.isFinite(nextMs) && nextMs > nowMs) {
      return nextMs;
    }
    cursor += 1_000;
  }
  return undefined;
}
