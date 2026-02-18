<<<<<<< HEAD
import { describe, expect, it } from "vitest";
=======
import { describe, expect, it, vi } from "vitest";
import { bindAbortRelay } from "../utils/fetch-timeout.js";
>>>>>>> 7648f6bb0 (perf(test): fake abort timer and dedupe slack thread cases)

/**
 * Regression test for #7174: Memory leak from closure-wrapped controller.abort().
 *
 * Using `() => controller.abort()` creates a closure that captures the
 * surrounding lexical scope (controller, timer, locals).  In long-running
 * processes these closures accumulate and prevent GC.
 *
 * The fix is `controller.abort.bind(controller)` which creates a minimal
 * bound function with no scope capture.
 *
 * This test verifies the behavioral equivalence of .bind() for both the
 * setTimeout and addEventListener use-cases.
 */
describe("abort pattern: .bind() vs arrow closure (#7174)", () => {
  it("controller.abort.bind(controller) aborts the signal", () => {
    const controller = new AbortController();
    const boundAbort = controller.abort.bind(controller);
    expect(controller.signal.aborted).toBe(false);
    boundAbort();
    expect(controller.signal.aborted).toBe(true);
  });

  it("bound abort works with setTimeout", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const timer = setTimeout(controller.abort.bind(controller), 10);
      expect(controller.signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(10);
      expect(controller.signal.aborted).toBe(true);
      clearTimeout(timer);
    } finally {
      vi.useRealTimers();
    }
  });

  it("bound abort works as addEventListener callback and can be removed", () => {
    const parent = new AbortController();
    const child = new AbortController();
    const onAbort = child.abort.bind(child);

    parent.signal.addEventListener("abort", onAbort, { once: true });
    expect(child.signal.aborted).toBe(false);

    parent.abort();
    expect(child.signal.aborted).toBe(true);
  });

  it("removeEventListener works with saved .bind() reference", () => {
    const parent = new AbortController();
    const child = new AbortController();
    const onAbort = child.abort.bind(child);

    parent.signal.addEventListener("abort", onAbort);
    // Remove before parent aborts — child should NOT be aborted
    parent.signal.removeEventListener("abort", onAbort);
    parent.abort();
    expect(child.signal.aborted).toBe(false);
  });

  it("bound abort forwards abort through combined signals", () => {
    // Simulates the combineAbortSignals pattern from pi-tools.abort.ts
    const signalA = new AbortController();
    const signalB = new AbortController();
    const combined = new AbortController();

    const onAbort = combined.abort.bind(combined);
    signalA.signal.addEventListener("abort", onAbort, { once: true });
    signalB.signal.addEventListener("abort", onAbort, { once: true });

    expect(combined.signal.aborted).toBe(false);
    signalA.abort();
    expect(combined.signal.aborted).toBe(true);
  });
});
