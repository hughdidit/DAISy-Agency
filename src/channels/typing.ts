export type TypingCallbacks = {
  onReplyStart: () => Promise<void>;
  onIdle?: () => void;
  /** Called when the typing controller is cleaned up (e.g., on NO_REPLY). */
  onCleanup?: () => void;
};

export function createTypingCallbacks(params: {
  start: () => Promise<void>;
  stop?: () => Promise<void>;
  onStartError: (err: unknown) => void;
  onStopError?: (err: unknown) => void;
  keepaliveIntervalMs?: number;
<<<<<<< HEAD
}): TypingCallbacks {
  const stop = params.stop;
  const keepaliveIntervalMs = params.keepaliveIntervalMs ?? 3_000;
  let keepaliveTimer: ReturnType<typeof setInterval> | undefined;
  let keepaliveStartInFlight = false;
  let stopSent = false;

  const fireStart = async () => {
=======
  /** Stop keepalive after this many consecutive start() failures. Default: 2 */
  maxConsecutiveFailures?: number;
  /** Maximum duration for typing indicator before auto-cleanup (safety TTL). Default: 60s */
  maxDurationMs?: number;
};

export function createTypingCallbacks(params: CreateTypingCallbacksParams): TypingCallbacks {
  const stop = params.stop;
  const keepaliveIntervalMs = params.keepaliveIntervalMs ?? 3_000;
  const maxConsecutiveFailures = Math.max(1, params.maxConsecutiveFailures ?? 2);
  const maxDurationMs = params.maxDurationMs ?? 60_000; // Default 60s TTL
  let stopSent = false;
  let closed = false;
  let consecutiveFailures = 0;
  let breakerTripped = false;
  let ttlTimer: ReturnType<typeof setTimeout> | undefined;

  const fireStart = async (): Promise<void> => {
    if (closed) {
      return;
    }
    if (breakerTripped) {
      return;
    }
>>>>>>> 37a138c55 (fix: harden typing lifecycle and cross-channel suppression)
    try {
      await params.start();
      consecutiveFailures = 0;
    } catch (err) {
      consecutiveFailures += 1;
      params.onStartError(err);
      if (consecutiveFailures >= maxConsecutiveFailures) {
        breakerTripped = true;
        keepaliveLoop.stop();
      }
    }
  };

  const clearKeepalive = () => {
    if (!keepaliveTimer) {
      return;
    }
    clearInterval(keepaliveTimer);
    keepaliveTimer = undefined;
    keepaliveStartInFlight = false;
  };

  const onReplyStart = async () => {
    stopSent = false;
    clearKeepalive();
    await fireStart();
    if (keepaliveIntervalMs <= 0) {
      return;
    }
<<<<<<< HEAD
    keepaliveTimer = setInterval(() => {
      if (keepaliveStartInFlight) {
        return;
      }
      keepaliveStartInFlight = true;
      void fireStart().finally(() => {
        keepaliveStartInFlight = false;
      });
    }, keepaliveIntervalMs);
=======
    stopSent = false;
    breakerTripped = false;
    consecutiveFailures = 0;
    keepaliveLoop.stop();
    clearTtlTimer();
    await fireStart();
    if (breakerTripped) {
      return;
    }
    keepaliveLoop.start();
    startTtlTimer(); // Start TTL safety timer
>>>>>>> 37a138c55 (fix: harden typing lifecycle and cross-channel suppression)
  };

  const fireStop = () => {
    clearKeepalive();
    if (!stop || stopSent) {
      return;
    }
    stopSent = true;
    void stop().catch((err) => (params.onStopError ?? params.onStartError)(err));
  };

  return { onReplyStart, onIdle: fireStop, onCleanup: fireStop };
}
