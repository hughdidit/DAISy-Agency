import { createTypingKeepaliveLoop } from "./typing-lifecycle.js";

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
}): TypingCallbacks {
  const stop = params.stop;
<<<<<<< HEAD
  const onReplyStart = async () => {
=======
  const keepaliveIntervalMs = params.keepaliveIntervalMs ?? 3_000;
  let stopSent = false;
  let closed = false;

  const fireStart = async () => {
>>>>>>> d42ef2ac6 (refactor: consolidate typing lifecycle and queue policy)
    try {
      await params.start();
    } catch (err) {
      params.onStartError(err);
    }
  };

<<<<<<< HEAD
  const fireStop = stop
    ? () => {
        void stop().catch((err) => (params.onStopError ?? params.onStartError)(err));
      }
    : undefined;
=======
  const keepaliveLoop = createTypingKeepaliveLoop({
    intervalMs: keepaliveIntervalMs,
    onTick: fireStart,
  });

  const onReplyStart = async () => {
    if (closed) {
      return;
    }
    stopSent = false;
    keepaliveLoop.stop();
    await fireStart();
    keepaliveLoop.start();
  };

  const fireStop = () => {
    closed = true;
    keepaliveLoop.stop();
    if (!stop || stopSent) {
      return;
    }
    stopSent = true;
    void stop().catch((err) => (params.onStopError ?? params.onStartError)(err));
  };
>>>>>>> d42ef2ac6 (refactor: consolidate typing lifecycle and queue policy)

  return { onReplyStart, onIdle: fireStop, onCleanup: fireStop };
}
