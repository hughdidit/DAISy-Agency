import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDiagnosticSessionStateCountForTest,
  getDiagnosticSessionState,
  resetDiagnosticSessionStateForTest,
} from "./diagnostic-session-state.js";

describe("diagnostic session state pruning", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDiagnosticSessionStateForTest();
  });

  afterEach(() => {
    resetDiagnosticSessionStateForTest();
    vi.useRealTimers();
  });

  it("evicts stale idle session states", () => {
    getDiagnosticSessionState({ sessionId: "stale-1" });
    expect(getDiagnosticSessionStateCountForTest()).toBe(1);

    vi.advanceTimersByTime(31 * 60 * 1000);
    getDiagnosticSessionState({ sessionId: "fresh-1" });

    expect(getDiagnosticSessionStateCountForTest()).toBe(1);
  });

  it("caps tracked session states to a bounded max", () => {
<<<<<<< HEAD
    for (let i = 0; i < 2105; i += 1) {
      logSessionStateChange({ sessionId: `session-${i}`, state: "idle" });
=======
    for (let i = 0; i < 2001; i += 1) {
      getDiagnosticSessionState({ sessionId: `session-${i}` });
>>>>>>> 0dec23450 (perf(logging): split diagnostic session state module)
    }

    expect(getDiagnosticSessionStateCountForTest()).toBe(2000);
  });
});

describe("logger import side effects", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("does not mkdir at import time", async () => {
    vi.useRealTimers();
    vi.resetModules();

    const mkdirSpy = vi.spyOn(fs, "mkdirSync");

    await import("./logger.js");

    expect(mkdirSpy).not.toHaveBeenCalled();
  });
});
