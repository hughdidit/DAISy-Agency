import { createTypingKeepaliveLoop } from "./typing-lifecycle.js";
import { createTypingStartGuard } from "./typing-start-guard.js";

export type TypingCallbacks = {
  onReplyStart: () => Promise<void>;
  onIdle?: () => void;
  /** Called when the typing controller is cleaned up (e.g. on NO_REPLY). */
  onCleanup?: () => void;
};

export type CreateTypingCallbacksParams = {
  start: () => Promise<void>;
  stop?: () => Promise<void>;
  onStartError: (err: unknown) => void;
  onStopError?: (err: unknown) => void;
}): TypingCallbacks {
  const stop = params.stop;
  const onReplyStart = async () => {
=======
    if (closed) return;
>>>>>>> 97eb5542e (fix(typing): guard fireStart against post-close invocation)
=======
    if (closed) { return; }
>>>>>>> ae658aa84 (style: add curly braces to satisfy eslint(curly))
=======
    if (closed) {
      return;
    }
>>>>>>> a182afcf9 (style: expand curly braces per oxfmt)
    try {
      await params.start();
    } catch (err) {
      params.onStartError(err);
    }
=======
  const startGuard = createTypingStartGuard({
    isSealed: () => closed,
    onStartError: params.onStartError,
    maxConsecutiveFailures,
    onTrip: () => {
      keepaliveLoop.stop();
    },
  });

  const fireStart = async (): Promise<void> => {
    await startGuard.run(() => params.start());
>>>>>>> 273973d37 (refactor: unify typing dispatch lifecycle and policy boundaries)
  };

  const onIdle = stop
    ? () => {
        void stop().catch((err) => (params.onStopError ?? params.onStartError)(err));
      }
    : undefined;

  return { onReplyStart, onIdle };
    keepaliveLoop.start();
    startTtlTimer(); // Start TTL safety timer
  };

  const fireStop = () => {
    closed = true;
    keepaliveLoop.stop();
    clearTtlTimer(); // Clear TTL timer on normal stop
    if (!stop || stopSent) {
      return;
    }
    stopSent = true;
    void stop().catch((err) => (params.onStopError ?? params.onStartError)(err));
  };

  return { onReplyStart, onIdle: fireStop, onCleanup: fireStop };
>>>>>>> d42ef2ac6 (refactor: consolidate typing lifecycle and queue policy)
}
