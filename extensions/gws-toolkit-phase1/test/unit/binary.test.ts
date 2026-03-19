import { describe, expect, it } from "vitest";
import { __testing, clearBinaryCacheForTests, discoverBinary } from "../../src/binary.js";

describe("binary discovery", () => {
  it("parses semver from version text", () => {
    expect(__testing.parseVersionText("gws 1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it("rejects unsupported versions", () => {
    expect(__testing.isVersionSupported({ major: 0, minor: 0, patch: 0 })).toBe(false);
  });

  it("maps missing binary errors", async () => {
    clearBinaryCacheForTests();
    await expect(
      discoverBinary({
        configuredPath: "gws",
        runVersion: async () => ({
          stdout: "",
          stderr: "not found",
          exitCode: 1,
          signal: null,
          timedOut: false,
          stdoutTruncated: false,
          stderrTruncated: false,
          durationMs: 1,
        }),
      }),
    ).rejects.toMatchObject({ code: "BINARY_NOT_FOUND" });
  });

  it("maps executable failures to EXEC_ERROR when binary exists", async () => {
    clearBinaryCacheForTests();
    await expect(
      discoverBinary({
        configuredPath: "gws",
        runVersion: async () => ({
          stdout: "",
          stderr: "permission denied",
          exitCode: 126,
          signal: null,
          timedOut: false,
          stdoutTruncated: false,
          stderrTruncated: false,
          durationMs: 1,
        }),
      }),
    ).rejects.toMatchObject({ code: "EXEC_ERROR" });
  });
});
