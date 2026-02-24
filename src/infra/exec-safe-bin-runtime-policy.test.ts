<<<<<<< HEAD
import { describe, expect, it } from "vitest";
=======
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
>>>>>>> 4355e0826 (refactor: harden safe-bin trusted dir diagnostics)
import {
  isInterpreterLikeSafeBin,
  listInterpreterLikeSafeBins,
  resolveExecSafeBinRuntimePolicy,
  resolveMergedSafeBinProfileFixtures,
} from "./exec-safe-bin-runtime-policy.js";

describe("exec safe-bin runtime policy", () => {
  const interpreterCases: Array<{ bin: string; expected: boolean }> = [
    { bin: "python3", expected: true },
    { bin: "python3.12", expected: true },
    { bin: "node", expected: true },
    { bin: "node20", expected: true },
    { bin: "ruby3.2", expected: true },
    { bin: "bash", expected: true },
    { bin: "myfilter", expected: false },
    { bin: "jq", expected: false },
  ];

  for (const testCase of interpreterCases) {
    it(`classifies interpreter-like safe bin '${testCase.bin}'`, () => {
      expect(isInterpreterLikeSafeBin(testCase.bin)).toBe(testCase.expected);
    });
  }

  it("lists interpreter-like bins from a mixed set", () => {
    expect(listInterpreterLikeSafeBins(["jq", "python3", "myfilter", "node"])).toEqual([
      "node",
      "python3",
    ]);
  });

  it("merges and normalizes safe-bin profile fixtures", () => {
    const merged = resolveMergedSafeBinProfileFixtures({
      global: {
        safeBinProfiles: {
          " MyFilter ": {
            deniedFlags: ["--file", " --file ", ""],
          },
        },
      },
      local: {
        safeBinProfiles: {
          myfilter: {
            maxPositional: 0,
          },
        },
      },
    });
    expect(merged).toEqual({
      myfilter: {
        maxPositional: 0,
      },
    });
  });

  it("computes unprofiled interpreter entries separately from custom profiled bins", () => {
    const policy = resolveExecSafeBinRuntimePolicy({
      local: {
        safeBins: ["python3", "myfilter"],
        safeBinProfiles: {
          myfilter: { maxPositional: 0 },
        },
      },
    });

    expect(policy.safeBins.has("python3")).toBe(true);
    expect(policy.safeBins.has("myfilter")).toBe(true);
    expect(policy.unprofiledSafeBins).toEqual(["python3"]);
    expect(policy.unprofiledInterpreterSafeBins).toEqual(["python3"]);
  });

  it("merges explicit safe-bin trusted dirs from global and local config", () => {
    const policy = resolveExecSafeBinRuntimePolicy({
      global: {
        safeBinTrustedDirs: [" /custom/bin ", "/custom/bin"],
      },
      local: {
        safeBinTrustedDirs: ["/agent/bin"],
      },
    });

    expect(policy.trustedSafeBinDirs.has("/custom/bin")).toBe(true);
    expect(policy.trustedSafeBinDirs.has("/agent/bin")).toBe(true);
  });

  it("emits runtime warning when explicitly trusted dir is writable", async () => {
    if (process.platform === "win32") {
      return;
    }
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-safe-bin-runtime-"));
    try {
      await fs.chmod(dir, 0o777);
      const onWarning = vi.fn();
      const policy = resolveExecSafeBinRuntimePolicy({
        global: {
          safeBinTrustedDirs: [dir],
        },
        onWarning,
      });

      expect(policy.writableTrustedSafeBinDirs).toEqual([
        {
          dir: path.resolve(dir),
          groupWritable: true,
          worldWritable: true,
        },
      ]);
      expect(onWarning).toHaveBeenCalledWith(expect.stringContaining(path.resolve(dir)));
      expect(onWarning).toHaveBeenCalledWith(expect.stringContaining("world-writable"));
    } finally {
      await fs.chmod(dir, 0o755).catch(() => undefined);
      await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
});
