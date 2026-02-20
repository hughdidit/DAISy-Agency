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
<<<<<<< HEAD
=======
  suppressAnnounceReason?: "steer-restart" | "killed";
  expectsCompletionMessage?: boolean;
  /** Number of times announce delivery has been attempted and returned false (deferred). */
  announceRetryCount?: number;
  /** Timestamp of the last announce retry attempt (for backoff). */
  lastAnnounceRetryAt?: number;
>>>>>>> e2dd827ca (fix: guarantee manual subagent spawn sends completion message)
};

const subagentRuns = new Map<string, SubagentRunRecord>();
let sweeper: NodeJS.Timeout | null = null;
let listenerStarted = false;
let listenerStop: (() => void) | null = null;
// Use var to avoid TDZ when init runs across circular imports during bootstrap.
var restoreAttempted = false;
const SUBAGENT_ANNOUNCE_TIMEOUT_MS = 120_000;
<<<<<<< HEAD
=======
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

function resolveAnnounceRetryDelayMs(retryCount: number) {
  const boundedRetryCount = Math.max(0, Math.min(retryCount, 10));
<<<<<<< HEAD
  const baseDelay = MIN_ANNOUNCE_RETRY_DELAY_MS * 2 ** boundedRetryCount;
=======
  // retryCount is "attempts already made", so retry #1 waits 1s, then 2s, 4s...
  const backoffExponent = Math.max(0, boundedRetryCount - 1);
  const baseDelay = MIN_ANNOUNCE_RETRY_DELAY_MS * 2 ** backoffExponent;
>>>>>>> 50e555353 (fix: align retry backoff semantics and test mock signatures)
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
>>>>>>> edf7d6af6 (fix: harden subagent completion announce retries)

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
function suppressAnnounceForSteerRestart(entry?: SubagentRunRecord) {
  return entry?.suppressAnnounceReason === "steer-restart";
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
  }).then((didAnnounce) => {
    finalizeSubagentCleanup(runId, entry.cleanup, didAnnounce);
  });
  return true;
}

>>>>>>> e2dd827ca (fix: guarantee manual subagent spawn sends completion message)
function resumeSubagentRun(runId: string) {
  if (!runId || resumedRuns.has(runId)) return;
  const entry = subagentRuns.get(runId);
  if (!entry) return;
  if (entry.cleanupCompletedAt) return;

  const now = Date.now();
  const delayMs = resolveAnnounceRetryDelayMs(entry.announceRetryCount ?? 0);
  const earliestRetryAt = (entry.lastAnnounceRetryAt ?? 0) + delayMs;
  if (
    entry.expectsCompletionMessage === true &&
    entry.lastAnnounceRetryAt &&
    now < earliestRetryAt
  ) {
    const waitMs = Math.max(1, earliestRetryAt - now);
    setTimeout(() => {
      resumeSubagentRun(runId);
    }, waitMs).unref?.();
    resumedRuns.add(runId);
    return;
  }

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
      timeoutMs: SUBAGENT_ANNOUNCE_TIMEOUT_MS,
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
    if (!entry.archiveAtMs || entry.archiveAtMs > now) continue;
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
      return;
    }
    if (phase !== "end" && phase !== "error") return;
    const endedAt =
      typeof evt.data?.endedAt === "number" ? (evt.data.endedAt as number) : Date.now();
    entry.endedAt = endedAt;
    if (phase === "error") {
      const error = typeof evt.data?.error === "string" ? (evt.data.error as string) : undefined;
      entry.outcome = { status: "error", error };
    } else if (evt.data?.aborted) {
      entry.outcome = { status: "timeout" };
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
      timeoutMs: SUBAGENT_ANNOUNCE_TIMEOUT_MS,
      cleanup: entry.cleanup,
      waitForCompletion: false,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      label: entry.label,
      outcome: entry.outcome,
    }).then((didAnnounce) => {
      finalizeSubagentCleanup(evt.runId, entry.cleanup, didAnnounce);
    });
  });
}

function finalizeSubagentCleanup(runId: string, cleanup: "delete" | "keep", didAnnounce: boolean) {
  const entry = subagentRuns.get(runId);
<<<<<<< HEAD
  if (!entry) return;
  if (cleanup === "delete") {
    subagentRuns.delete(runId);
=======
  if (!entry) {
    return;
  }
  if (!didAnnounce) {
<<<<<<< HEAD
=======
    const now = Date.now();
    const endedAgo = typeof entry.endedAt === "number" ? now - entry.endedAt : 0;
    // Normal defer: the run ended, but descendant runs are still active.
    // Don't consume retry budget in this state or we can give up before
    // descendants finish and before the parent synthesizes the final reply.
    const activeDescendantRuns = Math.max(0, countActiveDescendantRuns(entry.childSessionKey));
    if (entry.expectsCompletionMessage === true && activeDescendantRuns > 0) {
      if (endedAgo > ANNOUNCE_EXPIRY_MS) {
        logAnnounceGiveUp(entry, "expiry");
        entry.cleanupCompletedAt = now;
        persistSubagentRuns();
        retryDeferredCompletedAnnounces(runId);
        return;
      }
      entry.lastAnnounceRetryAt = now;
      entry.cleanupHandled = false;
      resumedRuns.delete(runId);
      persistSubagentRuns();
      setTimeout(() => {
        resumeSubagentRun(runId);
      }, MIN_ANNOUNCE_RETRY_DELAY_MS).unref?.();
      return;
    }

    const retryCount = (entry.announceRetryCount ?? 0) + 1;
    entry.announceRetryCount = retryCount;
    entry.lastAnnounceRetryAt = now;

    // Check if the announce has exceeded retry limits or expired (#18264).
    if (retryCount >= MAX_ANNOUNCE_RETRY_COUNT || endedAgo > ANNOUNCE_EXPIRY_MS) {
      // Give up: mark as completed to break the infinite retry loop.
      logAnnounceGiveUp(entry, retryCount >= MAX_ANNOUNCE_RETRY_COUNT ? "retry-limit" : "expiry");
      entry.cleanupCompletedAt = now;
      persistSubagentRuns();
      retryDeferredCompletedAnnounces(runId);
      return;
    }

>>>>>>> fe57bea08 (Subagents: restore announce chain + fix nested retry/drop regressions (#22223))
    // Allow retry on the next wake if announce was deferred or failed.
    entry.cleanupHandled = false;
>>>>>>> 191da1feb (fix: context overflow compaction and subagent announce improvements (#11664) (thanks @tyler6204))
    persistSubagentRuns();
    if (entry.expectsCompletionMessage !== true) {
      return;
    }
    setTimeout(
      () => {
        resumeSubagentRun(runId);
      },
      resolveAnnounceRetryDelayMs(entry.announceRetryCount ?? 0),
    ).unref?.();
    return;
  }
  if (cleanup === "delete") {
    subagentRuns.delete(runId);
    persistSubagentRuns();
    return;
  }
  entry.cleanupCompletedAt = Date.now();
  persistSubagentRuns();
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
    subagentRuns.delete(previousRunId);
    resumedRuns.delete(previousRunId);
  }

  const now = Date.now();
  const cfg = loadConfig();
  const archiveAfterMs = resolveArchiveAfterMs(cfg);
  const archiveAtMs = archiveAfterMs ? now + archiveAfterMs : undefined;
  const runTimeoutSeconds = params.runTimeoutSeconds ?? source.runTimeoutSeconds ?? 0;
  const waitTimeoutMs = resolveSubagentWaitTimeoutMs(cfg, runTimeoutSeconds);

  const next: SubagentRunRecord = {
    ...source,
    runId: nextRunId,
    startedAt: now,
    endedAt: undefined,
    outcome: undefined,
    cleanupCompletedAt: undefined,
    cleanupHandled: false,
    suppressAnnounceReason: undefined,
    announceRetryCount: undefined,
    lastAnnounceRetryAt: undefined,
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

>>>>>>> de900bace (fix: reset announceRetryCount in replaceSubagentRunAfterSteer)
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
  expectsCompletionMessage?: boolean;
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
    expectsCompletionMessage: params.expectsCompletionMessage,
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
<<<<<<< HEAD
    })) as { status?: string; startedAt?: number; endedAt?: number; error?: string };
    if (wait?.status !== "ok" && wait?.status !== "error") return;
=======
    });
    if (wait?.status !== "ok" && wait?.status !== "error" && wait?.status !== "timeout") {
      return;
    }
>>>>>>> e85bbe01f (fix: report subagent timeout as 'timed out' instead of 'completed successfully' (#13996))
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
    const waitError = typeof wait.error === "string" ? wait.error : undefined;
    entry.outcome =
      wait.status === "error"
        ? { status: "error", error: waitError }
        : wait.status === "timeout"
          ? { status: "timeout" }
          : { status: "ok" };
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
      timeoutMs: SUBAGENT_ANNOUNCE_TIMEOUT_MS,
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
  const didDelete = subagentRuns.delete(runId);
  if (didDelete) persistSubagentRuns();
  if (subagentRuns.size === 0) stopSweeper();
}

export function listSubagentRunsForRequester(requesterSessionKey: string): SubagentRunRecord[] {
  const key = requesterSessionKey.trim();
  if (!key) return [];
  return [...subagentRuns.values()].filter((entry) => entry.requesterSessionKey === key);
}

export function initSubagentRegistry() {
  restoreSubagentRunsOnce();
}
