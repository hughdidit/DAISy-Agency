import { describe, expect, it } from "vitest";
import { PluginError } from "../../src/errors.js";
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

  it("classifies non-zero exits as CLI_ERROR even when stdout is non-JSON", () => {
    try {
      normalizeExecution({
        stdout: "not-json",
        stderr: "boom",
        exitCode: 9,
        signal: null,
        timedOut: false,
        stdoutTruncated: false,
        stderrTruncated: false,
        durationMs: 10,
      });
      throw new Error("expected normalizeExecution to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PluginError);
      const pluginError = error as PluginError;
      expect(pluginError.code).toBe("CLI_ERROR");
      expect(pluginError.details).not.toHaveProperty("sample");
    }
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