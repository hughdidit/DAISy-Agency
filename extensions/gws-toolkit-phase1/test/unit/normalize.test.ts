import { describe, expect, it } from "vitest";
import { normalizeExecution } from "../../src/normalize.js";

describe("normalize", () => {
  it("returns parsed JSON payload", () => {
    const normalized = normalizeExecution({
      stdout: JSON.stringify({ ok: true }),
      stderr: "",
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdoutTruncated: false,
      stderrTruncated: false,
      durationMs: 10,
    });
    expect(normalized.payload).toEqual({ ok: true });
  });

  it("fails closed for non-JSON stdout", () => {
    expect(() =>
      normalizeExecution({
        stdout: "not json",
        stderr: "",
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdoutTruncated: false,
        stderrTruncated: false,
        durationMs: 10,
      }),
    ).toThrow(/non-JSON/);
  });

  it("maps timed out process", () => {
    expect(() =>
      normalizeExecution({
        stdout: "{}",
        stderr: "",
        exitCode: null,
        signal: "SIGKILL",
        timedOut: true,
        stdoutTruncated: false,
        stderrTruncated: false,
        durationMs: 100,
      }),
    ).toThrow(/timed out/);
  });
});
