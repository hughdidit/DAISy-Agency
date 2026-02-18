import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { isPidAlive } from "../shared/pid-alive.js";
import { resolveProcessScopedMap } from "../shared/process-scoped-map.js";

type LockFilePayload = {
  pid: number;
  createdAt: string;
};

type HeldLock = {
  count: number;
  handle: fs.FileHandle;
  lockPath: string;
};

const CLEANUP_SIGNALS = ["SIGINT", "SIGTERM", "SIGQUIT", "SIGABRT"] as const;
type CleanupSignal = (typeof CLEANUP_SIGNALS)[number];
const CLEANUP_STATE_KEY = Symbol.for("openclaw.sessionWriteLockCleanupState");
const HELD_LOCKS_KEY = Symbol.for("openclaw.sessionWriteLockHeldLocks");
<<<<<<< HEAD
=======
const WATCHDOG_STATE_KEY = Symbol.for("openclaw.sessionWriteLockWatchdogState");

const DEFAULT_STALE_MS = 30 * 60 * 1000;
const DEFAULT_MAX_HOLD_MS = 5 * 60 * 1000;
const DEFAULT_WATCHDOG_INTERVAL_MS = 60_000;
const DEFAULT_TIMEOUT_GRACE_MS = 2 * 60 * 1000;
const MAX_LOCK_HOLD_MS = 2_147_000_000;
>>>>>>> fb6e415d0 (fix(agents): align session lock hold budget with run timeouts)

type CleanupState = {
  registered: boolean;
  cleanupHandlers: Map<CleanupSignal, () => void>;
};

<<<<<<< HEAD
function resolveHeldLocks(): Map<string, HeldLock> {
  const proc = process as NodeJS.Process & {
    [HELD_LOCKS_KEY]?: Map<string, HeldLock>;
  };
  if (!proc[HELD_LOCKS_KEY]) {
    proc[HELD_LOCKS_KEY] = new Map<string, HeldLock>();
  }
  return proc[HELD_LOCKS_KEY];
}

const HELD_LOCKS = resolveHeldLocks();
=======
type WatchdogState = {
  started: boolean;
  intervalMs: number;
  timer?: NodeJS.Timeout;
};

const HELD_LOCKS = resolveProcessScopedMap<HeldLock>(HELD_LOCKS_KEY);
>>>>>>> 7147cd9cc (refactor: dedupe process-scoped lock maps)

function resolveCleanupState(): CleanupState {
  const proc = process as NodeJS.Process & {
    [CLEANUP_STATE_KEY]?: CleanupState;
  };
  if (!proc[CLEANUP_STATE_KEY]) {
    proc[CLEANUP_STATE_KEY] = {
      registered: false,
      cleanupHandlers: new Map<CleanupSignal, () => void>(),
    };
  }
  return proc[CLEANUP_STATE_KEY];
}

<<<<<<< HEAD
=======
function resolveWatchdogState(): WatchdogState {
  const proc = process as NodeJS.Process & {
    [WATCHDOG_STATE_KEY]?: WatchdogState;
  };
  if (!proc[WATCHDOG_STATE_KEY]) {
    proc[WATCHDOG_STATE_KEY] = {
      started: false,
      intervalMs: DEFAULT_WATCHDOG_INTERVAL_MS,
    };
  }
  return proc[WATCHDOG_STATE_KEY];
}

function resolvePositiveMs(
  value: number | undefined,
  fallback: number,
  opts: { allowInfinity?: boolean } = {},
): number {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return fallback;
  }
  if (value === Number.POSITIVE_INFINITY) {
    return opts.allowInfinity ? value : fallback;
  }
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

export function resolveSessionLockMaxHoldFromTimeout(params: {
  timeoutMs: number;
  graceMs?: number;
  minMs?: number;
}): number {
  const minMs = resolvePositiveMs(params.minMs, DEFAULT_MAX_HOLD_MS);
  const timeoutMs = resolvePositiveMs(params.timeoutMs, minMs, { allowInfinity: true });
  if (timeoutMs === Number.POSITIVE_INFINITY) {
    return MAX_LOCK_HOLD_MS;
  }
  const graceMs = resolvePositiveMs(params.graceMs, DEFAULT_TIMEOUT_GRACE_MS);
  return Math.min(MAX_LOCK_HOLD_MS, Math.max(minMs, timeoutMs + graceMs));
}

async function releaseHeldLock(
  normalizedSessionFile: string,
  held: HeldLock,
  opts: { force?: boolean } = {},
): Promise<boolean> {
  const current = HELD_LOCKS.get(normalizedSessionFile);
  if (current !== held) {
    return false;
  }

  if (opts.force) {
    held.count = 0;
  } else {
    held.count -= 1;
    if (held.count > 0) {
      return false;
    }
  }

  if (held.releasePromise) {
    await held.releasePromise.catch(() => undefined);
    return true;
  }

  HELD_LOCKS.delete(normalizedSessionFile);
  held.releasePromise = (async () => {
    try {
      await held.handle.close();
    } catch {
      // Ignore errors during cleanup - best effort.
    }
    try {
      await fs.rm(held.lockPath, { force: true });
    } catch {
      // Ignore errors during cleanup - best effort.
    }
  })();

  try {
    await held.releasePromise;
    return true;
  } finally {
    held.releasePromise = undefined;
  }
}

>>>>>>> fb6e415d0 (fix(agents): align session lock hold budget with run timeouts)
/**
 * Synchronously release all held locks.
 * Used during process exit when async operations aren't reliable.
 */
function releaseAllLocksSync(): void {
  for (const [sessionFile, held] of HELD_LOCKS) {
    try {
      if (typeof held.handle.close === "function") {
        void held.handle.close().catch(() => {});
      }
    } catch {
      // Ignore errors during cleanup - best effort
    }
    try {
      fsSync.rmSync(held.lockPath, { force: true });
    } catch {
      // Ignore errors during cleanup - best effort
    }
    HELD_LOCKS.delete(sessionFile);
  }
}

function handleTerminationSignal(signal: CleanupSignal): void {
  releaseAllLocksSync();
  const cleanupState = resolveCleanupState();
  const shouldReraise = process.listenerCount(signal) === 1;
  if (shouldReraise) {
    const handler = cleanupState.cleanupHandlers.get(signal);
    if (handler) {
      process.off(signal, handler);
      cleanupState.cleanupHandlers.delete(signal);
    }
    try {
      process.kill(process.pid, signal);
    } catch {
      // Ignore errors during shutdown
    }
  }
}

function registerCleanupHandlers(): void {
  const cleanupState = resolveCleanupState();
  if (!cleanupState.registered) {
    cleanupState.registered = true;
    // Cleanup on normal exit and process.exit() calls
    process.on("exit", () => {
      releaseAllLocksSync();
    });
  }

  // Handle termination signals
  for (const signal of CLEANUP_SIGNALS) {
    if (cleanupState.cleanupHandlers.has(signal)) {
      continue;
    }
    try {
      const handler = () => handleTerminationSignal(signal);
      cleanupState.cleanupHandlers.set(signal, handler);
      process.on(signal, handler);
    } catch {
      // Ignore unsupported signals on this platform.
    }
  }
}

async function readLockPayload(lockPath: string): Promise<LockFilePayload | null> {
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LockFilePayload>;
    if (typeof parsed.pid !== "number") {
      return null;
    }
    if (typeof parsed.createdAt !== "string") {
      return null;
    }
    return { pid: parsed.pid, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export async function acquireSessionWriteLock(params: {
  sessionFile: string;
  timeoutMs?: number;
  staleMs?: number;
<<<<<<< HEAD
=======
  maxHoldMs?: number;
  allowReentrant?: boolean;
>>>>>>> 35016a380 (fix(sandbox): serialize registry mutations and lock usage)
}): Promise<{
  release: () => Promise<void>;
}> {
  registerCleanupHandlers();
  const timeoutMs = params.timeoutMs ?? 10_000;
  const staleMs = params.staleMs ?? 30 * 60 * 1000;
  const sessionFile = path.resolve(params.sessionFile);
  const sessionDir = path.dirname(sessionFile);
  await fs.mkdir(sessionDir, { recursive: true });
  let normalizedDir = sessionDir;
  try {
    normalizedDir = await fs.realpath(sessionDir);
  } catch {
    // Fall back to the resolved path if realpath fails (permissions, transient FS).
  }
  const normalizedSessionFile = path.join(normalizedDir, path.basename(sessionFile));
  const lockPath = `${normalizedSessionFile}.lock`;
  const release = async () => {
    const current = HELD_LOCKS.get(normalizedSessionFile);
    if (!current) {
      return;
    }
    current.count -= 1;
    if (current.count > 0) {
      return;
    }
    HELD_LOCKS.delete(normalizedSessionFile);
    await current.handle.close();
    await fs.rm(current.lockPath, { force: true });
  };

  const allowReentrant = params.allowReentrant ?? true;
  const held = HELD_LOCKS.get(normalizedSessionFile);
  if (allowReentrant && held) {
    held.count += 1;
    return {
      release,
    };
  }

  const startedAt = Date.now();
  let attempt = 0;
  while (Date.now() - startedAt < timeoutMs) {
    attempt += 1;
    try {
      const handle = await fs.open(lockPath, "wx");
      await handle.writeFile(
        JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }, null, 2),
        "utf8",
      );
      HELD_LOCKS.set(normalizedSessionFile, { count: 1, handle, lockPath });
      return {
        release,
      };
    } catch (err) {
      const code = (err as { code?: unknown }).code;
      if (code !== "EEXIST") {
        throw err;
      }
      const payload = await readLockPayload(lockPath);
      const createdAt = payload?.createdAt ? Date.parse(payload.createdAt) : NaN;
      const stale = !Number.isFinite(createdAt) || Date.now() - createdAt > staleMs;
      const alive = payload?.pid ? isPidAlive(payload.pid) : false;
      if (stale || !alive) {
        await fs.rm(lockPath, { force: true });
        continue;
      }

      const delay = Math.min(1000, 50 * attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  const payload = await readLockPayload(lockPath);
  const owner = payload?.pid ? `pid=${payload.pid}` : "unknown";
  throw new Error(`session file locked (timeout ${timeoutMs}ms): ${owner} ${lockPath}`);
}

export const __testing = {
  cleanupSignals: [...CLEANUP_SIGNALS],
  handleTerminationSignal,
  releaseAllLocksSync,
};
