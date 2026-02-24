import { TerminalStates, type CallId } from "../types.js";
import type { CallManagerContext } from "./context.js";
import { persistCallRecord } from "./store.js";

export function clearMaxDurationTimer(ctx: CallManagerContext, callId: CallId): void {
  const timer = ctx.maxDurationTimers.get(callId);
  if (timer) {
    clearTimeout(timer);
    ctx.maxDurationTimers.delete(callId);
  }
}

export function startMaxDurationTimer(params: {
  ctx: CallManagerContext;
  callId: CallId;
  onTimeout: (callId: CallId) => Promise<void>;
}): void {
  clearMaxDurationTimer(params.ctx, params.callId);

  const maxDurationMs = params.ctx.config.maxDurationSeconds * 1000;
  params.ctx.logger.info(
    `[voice-call] Starting max duration timer (${params.ctx.config.maxDurationSeconds}s) for call ${params.callId}`,
  );

  const timer = setTimeout(async () => {
    params.ctx.maxDurationTimers.delete(params.callId);
    const call = params.ctx.activeCalls.get(params.callId);
    if (call && !TerminalStates.has(call.state)) {
      params.ctx.logger.info(
        `[voice-call] Max duration reached (${params.ctx.config.maxDurationSeconds}s), ending call ${params.callId}`,
      );
      call.endReason = "timeout";
      persistCallRecord(params.ctx.storePath, call);
      await params.onTimeout(params.callId);
    }
  }, maxDurationMs);

  params.ctx.maxDurationTimers.set(params.callId, timer);
}

export function clearTranscriptWaiter(ctx: CallManagerContext, callId: CallId): void {
  const waiter = ctx.transcriptWaiters.get(callId);
  if (!waiter) return;
  clearTimeout(waiter.timeout);
  ctx.transcriptWaiters.delete(callId);
}

export function rejectTranscriptWaiter(
  ctx: CallManagerContext,
  callId: CallId,
  reason: string,
): void {
  const waiter = ctx.transcriptWaiters.get(callId);
  if (!waiter) return;
  clearTranscriptWaiter(ctx, callId);
  waiter.reject(new Error(reason));
}

export function resolveTranscriptWaiter(
  ctx: CallManagerContext,
  callId: CallId,
  transcript: string,
  turnToken?: string,
): boolean {
  const waiter = ctx.transcriptWaiters.get(callId);
<<<<<<< HEAD
  if (!waiter) return;
=======
  if (!waiter) {
    return false;
  }
  if (waiter.turnToken && waiter.turnToken !== turnToken) {
    return false;
  }
>>>>>>> 1d28da55a (fix(voice-call): block Twilio webhook replay and stale transitions)
  clearTranscriptWaiter(ctx, callId);
  waiter.resolve(transcript);
  return true;
}

export function waitForFinalTranscript(
<<<<<<< HEAD
  ctx: CallManagerContext,
  callId: CallId,
): Promise<string> {
  // Only allow one in-flight waiter per call.
  rejectTranscriptWaiter(ctx, callId, "Transcript waiter replaced");
=======
  ctx: TimerContext,
  callId: CallId,
  turnToken?: string,
): Promise<string> {
  if (ctx.transcriptWaiters.has(callId)) {
    return Promise.reject(new Error("Already waiting for transcript"));
  }
>>>>>>> 1d28da55a (fix(voice-call): block Twilio webhook replay and stale transitions)

  const timeoutMs = ctx.config.transcriptTimeoutMs;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ctx.transcriptWaiters.delete(callId);
      reject(new Error(`Timed out waiting for transcript after ${timeoutMs}ms`));
    }, timeoutMs);

    ctx.transcriptWaiters.set(callId, { resolve, reject, timeout, turnToken });
  });
}
