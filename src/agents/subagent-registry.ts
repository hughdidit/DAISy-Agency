import { loadConfig } from "../config/config.js";
import { callGateway } from "../gateway/call.js";
import { onAgentEvent } from "../infra/agent-events.js";
import { type DeliveryContext, normalizeDeliveryContext } from "../utils/delivery-context.js";
import { runSubagentAnnounceFlow, type SubagentRunOutcome } from "./subagent-announce.js";
import {
  loadSubagentRegistryFromDisk,
  saveSubagentRegistryToDisk,
} from "./subagent-registry.store.js";
import { resolveAgentTimeoutMs } from "./timeout.js";

export type SubagentRunRecord = {
  runId: string;
  childSessionKey: string;
  requesterSessionKey: string;
  requesterOrigin?: DeliveryContext;
  requesterDisplayKey: string;
  task: string;
  cleanup: "delete" | "keep";
  label?: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  outcome?: SubagentRunOutcome;
  archiveAtMs?: number;
  cleanupCompletedAt?: number;
  cleanupHandled?: boolean;
};

const subagentRuns = new Map<string, SubagentRunRecord>();
let sweeper: NodeJS.Timeout | null = null;
let listenerStarted = false;
let listenerStop: (() => void) | null = null;
// Use var to avoid TDZ when init runs across circular imports during bootstrap.
var restoreAttempted = false;
<<<<<<< HEAD
=======
const SUBAGENT_ANNOUNCE_TIMEOUT_MS = 120_000;
const MIN_ANNOUNCE_RETRY_DELAY_MS = 1_000;
const MAX_ANNOUNCE_RETRY_DELAY_MS = 8_000;
/**
 * Maximum number of announce delivery attempts before giving up.
 * Prevents infinite retry loops when `runSubagentAnnounceFlow` repeatedly
 * returns `false` due to stale state or transient conditions (#18264).
 */
const MAX_ANNOUNCE_RETRY_COUNT = 3;
/**
 * Announce entries older than this are force-expired even if delivery never
 * succeeded. Guards against stale registry entries surviving gateway restarts.
 */
const ANNOUNCE_EXPIRY_MS = 5 * 60_000; // 5 minutes
type SubagentRunOrphanReason = "missing-session-entry" | "missing-session-id";
/**
 * Embedded runs can emit transient lifecycle `error` events while provider/model
 * retry is still in progress. Defer terminal error cleanup briefly so a
 * subsequent lifecycle `start` / `end` can cancel premature failure announces.
 */
const LIFECYCLE_ERROR_RETRY_GRACE_MS = 15_000;

function resolveAnnounceRetryDelayMs(retryCount: number) {
  const boundedRetryCount = Math.max(0, Math.min(retryCount, 10));
  // retryCount is "attempts already made", so retry #1 waits 1s, then 2s, 4s...
  const backoffExponent = Math.max(0, boundedRetryCount - 1);
  const baseDelay = MIN_ANNOUNCE_RETRY_DELAY_MS * 2 ** backoffExponent;
  return Math.min(baseDelay, MAX_ANNOUNCE_RETRY_DELAY_MS);
}

function logAnnounceGiveUp(entry: SubagentRunRecord, reason: "retry-limit" | "expiry") {
  const retryCount = entry.announceRetryCount ?? 0;
  const endedAgoMs =
    typeof entry.endedAt === "number" ? Math.max(0, Date.now() - entry.endedAt) : undefined;
  const endedAgoLabel = endedAgoMs != null ? `${Math.round(endedAgoMs / 1000)}s` : "n/a";
  defaultRuntime.log(
    `[warn] Subagent announce give up (${reason}) run=${entry.runId} child=${entry.childSessionKey} requester=${entry.requesterSessionKey} retries=${retryCount} endedAgo=${endedAgoLabel}`,
  );
}
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))

function persistSubagentRuns() {
  try {
    saveSubagentRegistryToDisk(subagentRuns);
  } catch {
    // ignore persistence failures
  }
}

const resumedRuns = new Set<string>();
<<<<<<< HEAD
=======
const endedHookInFlightRunIds = new Set<string>();
const pendingLifecycleErrorByRunId = new Map<
  string,
  {
    timer: NodeJS.Timeout;
    endedAt: number;
    error?: string;
  }
>();

function clearPendingLifecycleError(runId: string) {
  const pending = pendingLifecycleErrorByRunId.get(runId);
  if (!pending) {
    return;
  }
  clearTimeout(pending.timer);
  pendingLifecycleErrorByRunId.delete(runId);
}

function clearAllPendingLifecycleErrors() {
  for (const pending of pendingLifecycleErrorByRunId.values()) {
    clearTimeout(pending.timer);
  }
  pendingLifecycleErrorByRunId.clear();
}

function schedulePendingLifecycleError(params: { runId: string; endedAt: number; error?: string }) {
  clearPendingLifecycleError(params.runId);
  const timer = setTimeout(() => {
    const pending = pendingLifecycleErrorByRunId.get(params.runId);
    if (!pending || pending.timer !== timer) {
      return;
    }
    pendingLifecycleErrorByRunId.delete(params.runId);
    const entry = subagentRuns.get(params.runId);
    if (!entry) {
      return;
    }
    if (entry.endedReason === SUBAGENT_ENDED_REASON_COMPLETE || entry.outcome?.status === "ok") {
      return;
    }
    void completeSubagentRun({
      runId: params.runId,
      endedAt: pending.endedAt,
      outcome: {
        status: "error",
        error: pending.error,
      },
      reason: SUBAGENT_ENDED_REASON_ERROR,
      sendFarewell: true,
      accountId: entry.requesterOrigin?.accountId,
      triggerCleanup: true,
    });
  }, LIFECYCLE_ERROR_RETRY_GRACE_MS);
  timer.unref?.();
  pendingLifecycleErrorByRunId.set(params.runId, {
    timer,
    endedAt: params.endedAt,
    error: params.error,
  });
}

function suppressAnnounceForSteerRestart(entry?: SubagentRunRecord) {
  return entry?.suppressAnnounceReason === "steer-restart";
}

function shouldKeepThreadBindingAfterRun(params: {
  entry: SubagentRunRecord;
  reason: SubagentLifecycleEndedReason;
}) {
  if (params.reason === SUBAGENT_ENDED_REASON_KILLED) {
    return false;
  }
  return params.entry.spawnMode === "session";
}

function shouldEmitEndedHookForRun(params: {
  entry: SubagentRunRecord;
  reason: SubagentLifecycleEndedReason;
}) {
  return !shouldKeepThreadBindingAfterRun(params);
}

async function emitSubagentEndedHookForRun(params: {
  entry: SubagentRunRecord;
  reason?: SubagentLifecycleEndedReason;
  sendFarewell?: boolean;
  accountId?: string;
}) {
  const reason = params.reason ?? params.entry.endedReason ?? SUBAGENT_ENDED_REASON_COMPLETE;
  const outcome = resolveLifecycleOutcomeFromRunOutcome(params.entry.outcome);
  const error = params.entry.outcome?.status === "error" ? params.entry.outcome.error : undefined;
  await emitSubagentEndedHookOnce({
    entry: params.entry,
    reason,
    sendFarewell: params.sendFarewell,
    accountId: params.accountId ?? params.entry.requesterOrigin?.accountId,
    outcome,
    error,
    inFlightRunIds: endedHookInFlightRunIds,
    persist: persistSubagentRuns,
  });
}

async function completeSubagentRun(params: {
  runId: string;
  endedAt?: number;
  outcome: SubagentRunOutcome;
  reason: SubagentLifecycleEndedReason;
  sendFarewell?: boolean;
  accountId?: string;
  triggerCleanup: boolean;
}) {
  clearPendingLifecycleError(params.runId);
  const entry = subagentRuns.get(params.runId);
  if (!entry) {
    return;
  }

  let mutated = false;
  const endedAt = typeof params.endedAt === "number" ? params.endedAt : Date.now();
  if (entry.endedAt !== endedAt) {
    entry.endedAt = endedAt;
    mutated = true;
  }
  if (!runOutcomesEqual(entry.outcome, params.outcome)) {
    entry.outcome = params.outcome;
    mutated = true;
  }
  if (entry.endedReason !== params.reason) {
    entry.endedReason = params.reason;
    mutated = true;
  }

  if (mutated) {
    persistSubagentRuns();
  }

  const suppressedForSteerRestart = suppressAnnounceForSteerRestart(entry);
  const shouldEmitEndedHook =
    !suppressedForSteerRestart &&
    shouldEmitEndedHookForRun({
      entry,
      reason: params.reason,
    });
  const shouldDeferEndedHook =
    shouldEmitEndedHook &&
    params.triggerCleanup &&
    entry.expectsCompletionMessage === true &&
    !suppressedForSteerRestart;
  if (!shouldDeferEndedHook && shouldEmitEndedHook) {
    await emitSubagentEndedHookForRun({
      entry,
      reason: params.reason,
      sendFarewell: params.sendFarewell,
      accountId: params.accountId,
    });
  }

  if (!params.triggerCleanup) {
    return;
  }
  if (suppressedForSteerRestart) {
    return;
  }
  startSubagentAnnounceCleanupFlow(params.runId, entry);
}

function startSubagentAnnounceCleanupFlow(runId: string, entry: SubagentRunRecord): boolean {
  if (!beginSubagentCleanup(runId)) {
    return false;
  }
  const requesterOrigin = normalizeDeliveryContext(entry.requesterOrigin);
  void runSubagentAnnounceFlow({
    childSessionKey: entry.childSessionKey,
    childRunId: entry.runId,
    requesterSessionKey: entry.requesterSessionKey,
    requesterOrigin,
    requesterDisplayKey: entry.requesterDisplayKey,
    task: entry.task,
    timeoutMs: SUBAGENT_ANNOUNCE_TIMEOUT_MS,
    cleanup: entry.cleanup,
    waitForCompletion: false,
    startedAt: entry.startedAt,
    endedAt: entry.endedAt,
    label: entry.label,
    outcome: entry.outcome,
    spawnMode: entry.spawnMode,
    expectsCompletionMessage: entry.expectsCompletionMessage,
  })
    .then((didAnnounce) => {
      void finalizeSubagentCleanup(runId, entry.cleanup, didAnnounce);
    })
    .catch((error) => {
      defaultRuntime.log(
        `[warn] Subagent announce flow failed during cleanup for run ${runId}: ${String(error)}`,
      );
      void finalizeSubagentCleanup(runId, entry.cleanup, false);
    });
  return true;
}
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))

function resumeSubagentRun(runId: string) {
  if (!runId || resumedRuns.has(runId)) return;
  const entry = subagentRuns.get(runId);
  if (!entry) return;
  if (entry.cleanupCompletedAt) return;

  if (typeof entry.endedAt === "number" && entry.endedAt > 0) {
    if (!beginSubagentCleanup(runId)) return;
    const requesterOrigin = normalizeDeliveryContext(entry.requesterOrigin);
    void runSubagentAnnounceFlow({
      childSessionKey: entry.childSessionKey,
      childRunId: entry.runId,
      requesterSessionKey: entry.requesterSessionKey,
      requesterOrigin,
      requesterDisplayKey: entry.requesterDisplayKey,
      task: entry.task,
      timeoutMs: 30_000,
      cleanup: entry.cleanup,
      waitForCompletion: false,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      label: entry.label,
      outcome: entry.outcome,
    }).then((didAnnounce) => {
      finalizeSubagentCleanup(runId, entry.cleanup, didAnnounce);
    });
    resumedRuns.add(runId);
    return;
  }

  // Wait for completion again after restart.
  const cfg = loadConfig();
  const waitTimeoutMs = resolveSubagentWaitTimeoutMs(cfg, undefined);
  void waitForSubagentCompletion(runId, waitTimeoutMs);
  resumedRuns.add(runId);
}

function restoreSubagentRunsOnce() {
  if (restoreAttempted) return;
  restoreAttempted = true;
  try {
    const restored = loadSubagentRegistryFromDisk();
    if (restored.size === 0) return;
    for (const [runId, entry] of restored.entries()) {
      if (!runId || !entry) continue;
      // Keep any newer in-memory entries.
      if (!subagentRuns.has(runId)) {
        subagentRuns.set(runId, entry);
      }
    }

    // Resume pending work.
    ensureListener();
    if ([...subagentRuns.values()].some((entry) => entry.archiveAtMs)) {
      startSweeper();
    }
    for (const runId of subagentRuns.keys()) {
      resumeSubagentRun(runId);
    }
  } catch {
    // ignore restore failures
  }
}

function resolveArchiveAfterMs(cfg?: ReturnType<typeof loadConfig>) {
  const config = cfg ?? loadConfig();
  const minutes = config.agents?.defaults?.subagents?.archiveAfterMinutes ?? 60;
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;
  return Math.max(1, Math.floor(minutes)) * 60_000;
}

function resolveSubagentWaitTimeoutMs(
  cfg: ReturnType<typeof loadConfig>,
  runTimeoutSeconds?: number,
) {
  return resolveAgentTimeoutMs({ cfg, overrideSeconds: runTimeoutSeconds });
}

function startSweeper() {
  if (sweeper) return;
  sweeper = setInterval(() => {
    void sweepSubagentRuns();
  }, 60_000);
  sweeper.unref?.();
}

function stopSweeper() {
  if (!sweeper) return;
  clearInterval(sweeper);
  sweeper = null;
}

async function sweepSubagentRuns() {
  const now = Date.now();
  let mutated = false;
  for (const [runId, entry] of subagentRuns.entries()) {
<<<<<<< HEAD
    if (!entry.archiveAtMs || entry.archiveAtMs > now) continue;
=======
    if (!entry.archiveAtMs || entry.archiveAtMs > now) {
      continue;
    }
    clearPendingLifecycleError(runId);
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
    subagentRuns.delete(runId);
    mutated = true;
    try {
      await callGateway({
        method: "sessions.delete",
        params: { key: entry.childSessionKey, deleteTranscript: true },
        timeoutMs: 10_000,
      });
    } catch {
      // ignore
    }
  }
  if (mutated) persistSubagentRuns();
  if (subagentRuns.size === 0) stopSweeper();
}

function ensureListener() {
  if (listenerStarted) {
    return;
  }
  listenerStarted = true;
  listenerStop = onAgentEvent((evt) => {
    if (!evt || evt.stream !== "lifecycle") return;
    const entry = subagentRuns.get(evt.runId);
    if (!entry) {
      return;
    }
    const phase = evt.data?.phase;
    if (phase === "start") {
      const startedAt =
        typeof evt.data?.startedAt === "number" ? (evt.data.startedAt as number) : undefined;
      if (startedAt) {
        entry.startedAt = startedAt;
        persistSubagentRuns();
      }
<<<<<<< HEAD
      return;
    }
    if (phase !== "end" && phase !== "error") return;
    const endedAt =
      typeof evt.data?.endedAt === "number" ? (evt.data.endedAt as number) : Date.now();
    entry.endedAt = endedAt;
    if (phase === "error") {
      const error = typeof evt.data?.error === "string" ? (evt.data.error as string) : undefined;
      entry.outcome = { status: "error", error };
    } else {
      entry.outcome = { status: "ok" };
    }
    persistSubagentRuns();

    if (!beginSubagentCleanup(evt.runId)) {
      return;
    }
    const requesterOrigin = normalizeDeliveryContext(entry.requesterOrigin);
    void runSubagentAnnounceFlow({
      childSessionKey: entry.childSessionKey,
      childRunId: entry.runId,
      requesterSessionKey: entry.requesterSessionKey,
      requesterOrigin,
      requesterDisplayKey: entry.requesterDisplayKey,
      task: entry.task,
      timeoutMs: 30_000,
      cleanup: entry.cleanup,
      waitForCompletion: false,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      label: entry.label,
      outcome: entry.outcome,
    }).then((didAnnounce) => {
      finalizeSubagentCleanup(evt.runId, entry.cleanup, didAnnounce);
    });
=======
      const entry = subagentRuns.get(evt.runId);
      if (!entry) {
        return;
      }
      const phase = evt.data?.phase;
      if (phase === "start") {
        clearPendingLifecycleError(evt.runId);
        const startedAt = typeof evt.data?.startedAt === "number" ? evt.data.startedAt : undefined;
        if (startedAt) {
          entry.startedAt = startedAt;
          persistSubagentRuns();
        }
        return;
      }
      if (phase !== "end" && phase !== "error") {
        return;
      }
      const endedAt = typeof evt.data?.endedAt === "number" ? evt.data.endedAt : Date.now();
      const error = typeof evt.data?.error === "string" ? evt.data.error : undefined;
      if (phase === "error") {
        schedulePendingLifecycleError({
          runId: evt.runId,
          endedAt,
          error,
        });
        return;
      }
      clearPendingLifecycleError(evt.runId);
      const outcome: SubagentRunOutcome = evt.data?.aborted
        ? { status: "timeout" }
        : { status: "ok" };
      await completeSubagentRun({
        runId: evt.runId,
        endedAt,
        outcome,
        reason: SUBAGENT_ENDED_REASON_COMPLETE,
        sendFarewell: true,
        accountId: entry.requesterOrigin?.accountId,
        triggerCleanup: true,
      });
    })();
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
  });
}

function finalizeSubagentCleanup(runId: string, cleanup: "delete" | "keep", didAnnounce: boolean) {
  const entry = subagentRuns.get(runId);
  if (!entry) return;
  if (cleanup === "delete") {
    subagentRuns.delete(runId);
    persistSubagentRuns();
    return;
  }
  if (!didAnnounce) {
    // Allow retry on the next wake if the announce failed.
    entry.cleanupHandled = false;
    persistSubagentRuns();
    return;
  }
  entry.cleanupCompletedAt = Date.now();
  persistSubagentRuns();
<<<<<<< HEAD
=======
  if (deferredDecision.resumeDelayMs == null) {
    return;
  }
  setTimeout(() => {
    resumeSubagentRun(runId);
  }, deferredDecision.resumeDelayMs).unref?.();
}

async function emitCompletionEndedHookIfNeeded(
  entry: SubagentRunRecord,
  reason: SubagentLifecycleEndedReason,
) {
  if (
    entry.expectsCompletionMessage === true &&
    shouldEmitEndedHookForRun({
      entry,
      reason,
    })
  ) {
    await emitSubagentEndedHookForRun({
      entry,
      reason,
      sendFarewell: true,
    });
  }
}

function completeCleanupBookkeeping(params: {
  runId: string;
  entry: SubagentRunRecord;
  cleanup: "delete" | "keep";
  completedAt: number;
}) {
  if (params.cleanup === "delete") {
    clearPendingLifecycleError(params.runId);
    subagentRuns.delete(params.runId);
    persistSubagentRuns();
    retryDeferredCompletedAnnounces(params.runId);
    return;
  }
  params.entry.cleanupCompletedAt = params.completedAt;
  persistSubagentRuns();
  retryDeferredCompletedAnnounces(params.runId);
}

function retryDeferredCompletedAnnounces(excludeRunId?: string) {
  const now = Date.now();
  for (const [runId, entry] of subagentRuns.entries()) {
    if (excludeRunId && runId === excludeRunId) {
      continue;
    }
    if (typeof entry.endedAt !== "number") {
      continue;
    }
    if (entry.cleanupCompletedAt || entry.cleanupHandled) {
      continue;
    }
    if (suppressAnnounceForSteerRestart(entry)) {
      continue;
    }
    // Force-expire announces that have been pending too long (#18264).
    const endedAgo = now - (entry.endedAt ?? now);
    if (endedAgo > ANNOUNCE_EXPIRY_MS) {
      logAnnounceGiveUp(entry, "expiry");
      entry.cleanupCompletedAt = now;
      persistSubagentRuns();
      continue;
    }
    resumedRuns.delete(runId);
    resumeSubagentRun(runId);
  }
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
}

function beginSubagentCleanup(runId: string) {
  const entry = subagentRuns.get(runId);
  if (!entry) return false;
  if (entry.cleanupCompletedAt) return false;
  if (entry.cleanupHandled) return false;
  entry.cleanupHandled = true;
  persistSubagentRuns();
  return true;
}

<<<<<<< HEAD
=======
export function markSubagentRunForSteerRestart(runId: string) {
  const key = runId.trim();
  if (!key) {
    return false;
  }
  const entry = subagentRuns.get(key);
  if (!entry) {
    return false;
  }
  if (entry.suppressAnnounceReason === "steer-restart") {
    return true;
  }
  entry.suppressAnnounceReason = "steer-restart";
  persistSubagentRuns();
  return true;
}

export function clearSubagentRunSteerRestart(runId: string) {
  const key = runId.trim();
  if (!key) {
    return false;
  }
  const entry = subagentRuns.get(key);
  if (!entry) {
    return false;
  }
  if (entry.suppressAnnounceReason !== "steer-restart") {
    return true;
  }
  entry.suppressAnnounceReason = undefined;
  persistSubagentRuns();
  // If the interrupted run already finished while suppression was active, retry
  // cleanup now so completion output is not lost when restart dispatch fails.
  resumedRuns.delete(key);
  if (typeof entry.endedAt === "number" && !entry.cleanupCompletedAt) {
    resumeSubagentRun(key);
  }
  return true;
}

export function replaceSubagentRunAfterSteer(params: {
  previousRunId: string;
  nextRunId: string;
  fallback?: SubagentRunRecord;
  runTimeoutSeconds?: number;
}) {
  const previousRunId = params.previousRunId.trim();
  const nextRunId = params.nextRunId.trim();
  if (!previousRunId || !nextRunId) {
    return false;
  }

  const previous = subagentRuns.get(previousRunId);
  const source = previous ?? params.fallback;
  if (!source) {
    return false;
  }

  if (previousRunId !== nextRunId) {
    clearPendingLifecycleError(previousRunId);
    subagentRuns.delete(previousRunId);
    resumedRuns.delete(previousRunId);
  }

  const now = Date.now();
  const cfg = loadConfig();
  const archiveAfterMs = resolveArchiveAfterMs(cfg);
  const spawnMode = source.spawnMode === "session" ? "session" : "run";
  const archiveAtMs =
    spawnMode === "session" ? undefined : archiveAfterMs ? now + archiveAfterMs : undefined;
  const runTimeoutSeconds = params.runTimeoutSeconds ?? source.runTimeoutSeconds ?? 0;
  const waitTimeoutMs = resolveSubagentWaitTimeoutMs(cfg, runTimeoutSeconds);

  const next: SubagentRunRecord = {
    ...source,
    runId: nextRunId,
    startedAt: now,
    endedAt: undefined,
    endedReason: undefined,
    endedHookEmittedAt: undefined,
    outcome: undefined,
    cleanupCompletedAt: undefined,
    cleanupHandled: false,
    suppressAnnounceReason: undefined,
    announceRetryCount: undefined,
    lastAnnounceRetryAt: undefined,
    spawnMode,
    archiveAtMs,
    runTimeoutSeconds,
  };

  subagentRuns.set(nextRunId, next);
  ensureListener();
  persistSubagentRuns();
  if (archiveAtMs) {
    startSweeper();
  }
  void waitForSubagentCompletion(nextRunId, waitTimeoutMs);
  return true;
}

>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
export function registerSubagentRun(params: {
  runId: string;
  childSessionKey: string;
  requesterSessionKey: string;
  requesterOrigin?: DeliveryContext;
  requesterDisplayKey: string;
  task: string;
  cleanup: "delete" | "keep";
  label?: string;
  runTimeoutSeconds?: number;
}) {
  const now = Date.now();
  const cfg = loadConfig();
  const archiveAfterMs = resolveArchiveAfterMs(cfg);
  const archiveAtMs = archiveAfterMs ? now + archiveAfterMs : undefined;
  const waitTimeoutMs = resolveSubagentWaitTimeoutMs(cfg, params.runTimeoutSeconds);
  const requesterOrigin = normalizeDeliveryContext(params.requesterOrigin);
  subagentRuns.set(params.runId, {
    runId: params.runId,
    childSessionKey: params.childSessionKey,
    requesterSessionKey: params.requesterSessionKey,
    requesterOrigin,
    requesterDisplayKey: params.requesterDisplayKey,
    task: params.task,
    cleanup: params.cleanup,
    label: params.label,
    createdAt: now,
    startedAt: now,
    archiveAtMs,
    cleanupHandled: false,
  });
  ensureListener();
  persistSubagentRuns();
  if (archiveAfterMs) startSweeper();
  // Wait for subagent completion via gateway RPC (cross-process).
  // The in-process lifecycle listener is a fallback for embedded runs.
  void waitForSubagentCompletion(params.runId, waitTimeoutMs);
}

async function waitForSubagentCompletion(runId: string, waitTimeoutMs: number) {
  try {
    const timeoutMs = Math.max(1, Math.floor(waitTimeoutMs));
    const wait = (await callGateway({
      method: "agent.wait",
      params: {
        runId,
        timeoutMs,
      },
      timeoutMs: timeoutMs + 10_000,
    })) as { status?: string; startedAt?: number; endedAt?: number; error?: string };
    if (wait?.status !== "ok" && wait?.status !== "error") return;
    const entry = subagentRuns.get(runId);
    if (!entry) return;
    let mutated = false;
    if (typeof wait.startedAt === "number") {
      entry.startedAt = wait.startedAt;
      mutated = true;
    }
    if (typeof wait.endedAt === "number") {
      entry.endedAt = wait.endedAt;
      mutated = true;
    }
    if (!entry.endedAt) {
      entry.endedAt = Date.now();
      mutated = true;
    }
    entry.outcome =
      wait.status === "error" ? { status: "error", error: wait.error } : { status: "ok" };
    mutated = true;
    if (mutated) persistSubagentRuns();
    if (!beginSubagentCleanup(runId)) return;
    const requesterOrigin = normalizeDeliveryContext(entry.requesterOrigin);
    void runSubagentAnnounceFlow({
      childSessionKey: entry.childSessionKey,
      childRunId: entry.runId,
      requesterSessionKey: entry.requesterSessionKey,
      requesterOrigin,
      requesterDisplayKey: entry.requesterDisplayKey,
      task: entry.task,
      timeoutMs: 30_000,
      cleanup: entry.cleanup,
      waitForCompletion: false,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      label: entry.label,
      outcome: entry.outcome,
    }).then((didAnnounce) => {
      finalizeSubagentCleanup(runId, entry.cleanup, didAnnounce);
    });
  } catch {
    // ignore
  }
}

export function resetSubagentRegistryForTests() {
  subagentRuns.clear();
  resumedRuns.clear();
<<<<<<< HEAD
=======
  endedHookInFlightRunIds.clear();
  clearAllPendingLifecycleErrors();
  resetAnnounceQueuesForTests();
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
  stopSweeper();
  restoreAttempted = false;
  if (listenerStop) {
    listenerStop();
    listenerStop = null;
  }
  listenerStarted = false;
  persistSubagentRuns();
}

export function addSubagentRunForTests(entry: SubagentRunRecord) {
  subagentRuns.set(entry.runId, entry);
  persistSubagentRuns();
}

export function releaseSubagentRun(runId: string) {
  clearPendingLifecycleError(runId);
  const didDelete = subagentRuns.delete(runId);
<<<<<<< HEAD
  if (didDelete) persistSubagentRuns();
  if (subagentRuns.size === 0) stopSweeper();
=======
  if (didDelete) {
    persistSubagentRuns();
  }
  if (subagentRuns.size === 0) {
    stopSweeper();
  }
}

function findRunIdsByChildSessionKey(childSessionKey: string): string[] {
  return findRunIdsByChildSessionKeyFromRuns(subagentRuns, childSessionKey);
}

export function resolveRequesterForChildSession(childSessionKey: string): {
  requesterSessionKey: string;
  requesterOrigin?: DeliveryContext;
} | null {
  const resolved = resolveRequesterForChildSessionFromRuns(
    getSubagentRunsSnapshotForRead(subagentRuns),
    childSessionKey,
  );
  if (!resolved) {
    return null;
  }
  return {
    requesterSessionKey: resolved.requesterSessionKey,
    requesterOrigin: normalizeDeliveryContext(resolved.requesterOrigin),
  };
}

export function isSubagentSessionRunActive(childSessionKey: string): boolean {
  const runIds = findRunIdsByChildSessionKey(childSessionKey);
  for (const runId of runIds) {
    const entry = subagentRuns.get(runId);
    if (!entry) {
      continue;
    }
    if (typeof entry.endedAt !== "number") {
      return true;
    }
  }
  return false;
}

export function markSubagentRunTerminated(params: {
  runId?: string;
  childSessionKey?: string;
  reason?: string;
}): number {
  const runIds = new Set<string>();
  if (typeof params.runId === "string" && params.runId.trim()) {
    runIds.add(params.runId.trim());
  }
  if (typeof params.childSessionKey === "string" && params.childSessionKey.trim()) {
    for (const runId of findRunIdsByChildSessionKey(params.childSessionKey)) {
      runIds.add(runId);
    }
  }
  if (runIds.size === 0) {
    return 0;
  }

  const now = Date.now();
  const reason = params.reason?.trim() || "killed";
  let updated = 0;
  const entriesByChildSessionKey = new Map<string, SubagentRunRecord>();
  for (const runId of runIds) {
    clearPendingLifecycleError(runId);
    const entry = subagentRuns.get(runId);
    if (!entry) {
      continue;
    }
    if (typeof entry.endedAt === "number") {
      continue;
    }
    entry.endedAt = now;
    entry.outcome = { status: "error", error: reason };
    entry.endedReason = SUBAGENT_ENDED_REASON_KILLED;
    entry.cleanupHandled = true;
    entry.cleanupCompletedAt = now;
    entry.suppressAnnounceReason = "killed";
    if (!entriesByChildSessionKey.has(entry.childSessionKey)) {
      entriesByChildSessionKey.set(entry.childSessionKey, entry);
    }
    updated += 1;
  }
  if (updated > 0) {
    persistSubagentRuns();
    for (const entry of entriesByChildSessionKey.values()) {
      void emitSubagentEndedHookOnce({
        entry,
        reason: SUBAGENT_ENDED_REASON_KILLED,
        sendFarewell: true,
        outcome: SUBAGENT_ENDED_OUTCOME_KILLED,
        error: reason,
        inFlightRunIds: endedHookInFlightRunIds,
        persist: persistSubagentRuns,
      }).catch(() => {
        // Hook failures should not break termination flow.
      });
    }
  }
  return updated;
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
}

export function listSubagentRunsForRequester(requesterSessionKey: string): SubagentRunRecord[] {
  const key = requesterSessionKey.trim();
  if (!key) return [];
  return [...subagentRuns.values()].filter((entry) => entry.requesterSessionKey === key);
}

export function initSubagentRegistry() {
  restoreSubagentRunsOnce();
}
