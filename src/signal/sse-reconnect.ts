import { logVerbose, shouldLogVerbose } from "../globals.js";
import type { BackoffPolicy } from "../infra/backoff.js";
import { computeBackoff, sleepWithAbort } from "../infra/backoff.js";
import type { RuntimeEnv } from "../runtime.js";
import { type SignalSseEvent, streamSignalEvents } from "./client.js";

const DEFAULT_RECONNECT_POLICY: BackoffPolicy = {
  initialMs: 1_000,
  maxMs: 10_000,
  factor: 2,
  jitter: 0.2,
};

/**
 * After this many consecutive connection failures without ever receiving an
 * event, the loop gives up.  This prevents infinite retries when the Signal
 * server is simply not running (e.g. in test / CI environments or
 * misconfigured deployments).  Once a single event is received the counter
 * resets, so a temporary network blip won't hit the limit.
 */
const MAX_CONSECUTIVE_FAILURES = 5;

type RunSignalSseLoopParams = {
  baseUrl: string;
  account?: string;
  abortSignal?: AbortSignal;
  runtime: RuntimeEnv;
  onEvent: (event: SignalSseEvent) => void;
  policy?: Partial<BackoffPolicy>;
  maxConsecutiveFailures?: number;
};

export async function runSignalSseLoop({
  baseUrl,
  account,
  abortSignal,
  runtime,
  onEvent,
  policy,
  maxConsecutiveFailures = MAX_CONSECUTIVE_FAILURES,
}: RunSignalSseLoopParams) {
  const reconnectPolicy = {
    ...DEFAULT_RECONNECT_POLICY,
    ...policy,
  };
  let reconnectAttempts = 0;
  let consecutiveFailures = 0;

  const logReconnectVerbose = (message: string) => {
    if (!shouldLogVerbose()) {
      return;
    }
    logVerbose(message);
  };

  while (!abortSignal?.aborted) {
    try {
      await streamSignalEvents({
        baseUrl,
        account,
        abortSignal,
        onEvent: (event) => {
          reconnectAttempts = 0;
          consecutiveFailures = 0;
          onEvent(event);
        },
      });
      if (abortSignal?.aborted) {
        return;
      }
      reconnectAttempts += 1;
      const delayMs = computeBackoff(reconnectPolicy, reconnectAttempts);
      logReconnectVerbose(`Signal SSE stream ended, reconnecting in ${delayMs / 1000}s...`);
      await sleepWithAbort(delayMs, abortSignal);
    } catch (err) {
      if (abortSignal?.aborted) {
        return;
      }
      consecutiveFailures += 1;
      runtime.error?.(`Signal SSE stream error: ${String(err)}`);
      if (consecutiveFailures >= maxConsecutiveFailures) {
        runtime.error?.(
          `Signal SSE: ${consecutiveFailures} consecutive failures — server appears unavailable at ${baseUrl}. Giving up.`,
        );
        return;
      }
      reconnectAttempts += 1;
      const delayMs = computeBackoff(reconnectPolicy, reconnectAttempts);
      runtime.log?.(`Signal SSE connection lost, reconnecting in ${delayMs / 1000}s...`);
      try {
        await sleepWithAbort(delayMs, abortSignal);
      } catch (sleepErr) {
        if (abortSignal?.aborted) {
          return;
        }
        throw sleepErr;
      }
    }
  }
}
