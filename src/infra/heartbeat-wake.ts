export type HeartbeatRunResult =
  | { status: "ran"; durationMs: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export type HeartbeatWakeHandler = (opts: {
  reason?: string;
  agentId?: string;
  sessionKey?: string;
}) => Promise<HeartbeatRunResult>;

<<<<<<< HEAD
=======
type WakeTimerKind = "normal" | "retry";
type PendingWakeReason = {
  reason: string;
  priority: number;
  requestedAt: number;
  agentId?: string;
  sessionKey?: string;
};

>>>>>>> f988abf20 (Cron: route reminders by session namespace)
let handler: HeartbeatWakeHandler | null = null;
<<<<<<< HEAD
let pendingReason: string | null = null;
=======
let handlerGeneration = 0;
const pendingWakes = new Map<string, PendingWakeReason>();
>>>>>>> 064a3079c (Heartbeat: queue pending wakes per target)
let scheduled = false;
let running = false;
let timer: NodeJS.Timeout | null = null;

const DEFAULT_COALESCE_MS = 250;
const DEFAULT_RETRY_MS = 1_000;

<<<<<<< HEAD
function schedule(coalesceMs: number) {
=======
function isActionWakeReason(reason: string): boolean {
  return reason === "manual" || reason === "exec-event" || reason.startsWith(HOOK_REASON_PREFIX);
}

function resolveReasonPriority(reason: string): number {
  if (reason === "retry") {
    return REASON_PRIORITY.RETRY;
  }
  if (reason === "interval") {
    return REASON_PRIORITY.INTERVAL;
  }
  if (isActionWakeReason(reason)) {
    return REASON_PRIORITY.ACTION;
  }
  return REASON_PRIORITY.DEFAULT;
}

function normalizeWakeReason(reason?: string): string {
  if (typeof reason !== "string") {
    return "requested";
  }
  const trimmed = reason.trim();
  return trimmed.length > 0 ? trimmed : "requested";
}

function normalizeWakeTarget(value?: string): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

function getWakeTargetKey(params: { agentId?: string; sessionKey?: string }) {
  const agentId = normalizeWakeTarget(params.agentId);
  const sessionKey = normalizeWakeTarget(params.sessionKey);
  return `${agentId ?? ""}::${sessionKey ?? ""}`;
}

function queuePendingWakeReason(params?: {
  reason?: string;
  requestedAt?: number;
  agentId?: string;
  sessionKey?: string;
}) {
  const requestedAt = params?.requestedAt ?? Date.now();
  const normalizedReason = normalizeWakeReason(params?.reason);
  const normalizedAgentId = normalizeWakeTarget(params?.agentId);
  const normalizedSessionKey = normalizeWakeTarget(params?.sessionKey);
  const wakeTargetKey = getWakeTargetKey({
    agentId: normalizedAgentId,
    sessionKey: normalizedSessionKey,
  });
  const next: PendingWakeReason = {
    reason: normalizedReason,
    priority: resolveReasonPriority(normalizedReason),
    requestedAt,
    agentId: normalizedAgentId,
    sessionKey: normalizedSessionKey,
  };
  const previous = pendingWakes.get(wakeTargetKey);
  if (!previous) {
    pendingWakes.set(wakeTargetKey, next);
    return;
  }
  if (next.priority > previous.priority) {
    pendingWakes.set(wakeTargetKey, next);
    return;
  }
  if (next.priority === previous.priority && next.requestedAt >= previous.requestedAt) {
    pendingWakes.set(wakeTargetKey, next);
  }
}

function schedule(coalesceMs: number, kind: WakeTimerKind = "normal") {
  const delay = Number.isFinite(coalesceMs) ? Math.max(0, coalesceMs) : DEFAULT_COALESCE_MS;
  const dueAt = Date.now() + delay;
>>>>>>> f988abf20 (Cron: route reminders by session namespace)
  if (timer) {
    return;
  }
  timer = setTimeout(async () => {
    timer = null;
    scheduled = false;
    const active = handler;
    if (!active) {
      return;
    }
    if (running) {
      scheduled = true;
      schedule(coalesceMs);
      return;
    }

<<<<<<< HEAD
<<<<<<< HEAD
    const reason = pendingReason;
    pendingReason = null;
=======
    const reason = pendingWake?.reason;
    const agentId = pendingWake?.agentId;
    const sessionKey = pendingWake?.sessionKey;
    pendingWake = null;
>>>>>>> f988abf20 (Cron: route reminders by session namespace)
    running = true;
    try {
      const wakeOpts = {
        reason: reason ?? undefined,
        ...(agentId ? { agentId } : {}),
        ...(sessionKey ? { sessionKey } : {}),
      };
      const res = await active(wakeOpts);
      if (res.status === "skipped" && res.reason === "requests-in-flight") {
        // The main lane is busy; retry soon.
<<<<<<< HEAD
        pendingReason = reason ?? "retry";
        schedule(DEFAULT_RETRY_MS);
      }
    } catch {
      // Error is already logged by the heartbeat runner; schedule a retry.
      pendingReason = reason ?? "retry";
      schedule(DEFAULT_RETRY_MS);
=======
        queuePendingWakeReason({
          reason: reason ?? "retry",
          agentId,
          sessionKey,
        });
        schedule(DEFAULT_RETRY_MS, "retry");
=======
    const pendingBatch = Array.from(pendingWakes.values());
    pendingWakes.clear();
    running = true;
    try {
      for (const pendingWake of pendingBatch) {
        const wakeOpts = {
          reason: pendingWake.reason ?? undefined,
          ...(pendingWake.agentId ? { agentId: pendingWake.agentId } : {}),
          ...(pendingWake.sessionKey ? { sessionKey: pendingWake.sessionKey } : {}),
        };
        const res = await active(wakeOpts);
        if (res.status === "skipped" && res.reason === "requests-in-flight") {
          // The main lane is busy; retry this wake target soon.
          queuePendingWakeReason({
            reason: pendingWake.reason ?? "retry",
            agentId: pendingWake.agentId,
            sessionKey: pendingWake.sessionKey,
          });
          schedule(DEFAULT_RETRY_MS, "retry");
        }
>>>>>>> 064a3079c (Heartbeat: queue pending wakes per target)
      }
    } catch {
      // Error is already logged by the heartbeat runner; schedule a retry.
      for (const pendingWake of pendingBatch) {
        queuePendingWakeReason({
          reason: pendingWake.reason ?? "retry",
          agentId: pendingWake.agentId,
          sessionKey: pendingWake.sessionKey,
        });
      }
      schedule(DEFAULT_RETRY_MS, "retry");
>>>>>>> f988abf20 (Cron: route reminders by session namespace)
    } finally {
      running = false;
<<<<<<< HEAD
      if (pendingReason || scheduled) {
        schedule(coalesceMs);
=======
      if (pendingWakes.size > 0 || scheduled) {
        schedule(delay, "normal");
>>>>>>> 064a3079c (Heartbeat: queue pending wakes per target)
      }
    }
  }, coalesceMs);
  timer.unref?.();
}

export function setHeartbeatWakeHandler(next: HeartbeatWakeHandler | null) {
  handler = next;
  if (handler && pendingReason) {
    schedule(DEFAULT_COALESCE_MS);
  }
<<<<<<< HEAD
=======
  if (handler && pendingWakes.size > 0) {
    schedule(DEFAULT_COALESCE_MS, "normal");
  }
  return () => {
    if (handlerGeneration !== generation) {
      return;
    }
    if (handler !== next) {
      return;
    }
    handlerGeneration += 1;
    handler = null;
  };
>>>>>>> 064a3079c (Heartbeat: queue pending wakes per target)
}

<<<<<<< HEAD
export function requestHeartbeatNow(opts?: { reason?: string; coalesceMs?: number }) {
  pendingReason = opts?.reason ?? pendingReason ?? "requested";
  schedule(opts?.coalesceMs ?? DEFAULT_COALESCE_MS);
=======
export function requestHeartbeatNow(opts?: {
  reason?: string;
  coalesceMs?: number;
  agentId?: string;
  sessionKey?: string;
}) {
  queuePendingWakeReason({
    reason: opts?.reason,
    agentId: opts?.agentId,
    sessionKey: opts?.sessionKey,
  });
  schedule(opts?.coalesceMs ?? DEFAULT_COALESCE_MS, "normal");
>>>>>>> f988abf20 (Cron: route reminders by session namespace)
}

export function hasHeartbeatWakeHandler() {
  return handler !== null;
}

export function hasPendingHeartbeatWake() {
<<<<<<< HEAD
  return pendingReason !== null || Boolean(timer) || scheduled;
=======
  return pendingWakes.size > 0 || Boolean(timer) || scheduled;
>>>>>>> 064a3079c (Heartbeat: queue pending wakes per target)
}

export function resetHeartbeatWakeStateForTests() {
  if (timer) {
    clearTimeout(timer);
  }
  timer = null;
  timerDueAt = null;
  timerKind = null;
  pendingWakes.clear();
  scheduled = false;
  running = false;
  handlerGeneration += 1;
  handler = null;
}
