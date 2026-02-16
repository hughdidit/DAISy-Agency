import { describe, expect, it } from "vitest";
<<<<<<< HEAD

import { runCommandWithTimeout } from "./exec.js";
=======
import { captureEnv } from "../test-utils/env.js";
import { runCommandWithTimeout, shouldSpawnWithShell } from "./exec.js";
>>>>>>> ee2fa5f41 (refactor(test): reuse env snapshots in unit suites)

describe("runCommandWithTimeout", () => {
<<<<<<< HEAD
  it("passes env overrides to child", async () => {
    const result = await runCommandWithTimeout(
      [process.execPath, "-e", 'process.stdout.write(process.env.CLAWDBOT_TEST_ENV ?? "")'],
      {
        timeoutMs: 5_000,
        env: { CLAWDBOT_TEST_ENV: "ok" },
      },
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("ok");
=======
  it("never enables shell execution (Windows cmd.exe injection hardening)", () => {
    expect(
      shouldSpawnWithShell({
        resolvedCommand: "npm.cmd",
        platform: "win32",
      }),
    ).toBe(false);
>>>>>>> 31939397a (test: optimize hot-path test runtime)
  });

  it("merges custom env with process.env", async () => {
<<<<<<< HEAD
    const previous = process.env.CLAWDBOT_BASE_ENV;
    process.env.CLAWDBOT_BASE_ENV = "base";
=======
    const envSnapshot = captureEnv(["OPENCLAW_BASE_ENV"]);
    process.env.OPENCLAW_BASE_ENV = "base";
>>>>>>> ee2fa5f41 (refactor(test): reuse env snapshots in unit suites)
    try {
      const result = await runCommandWithTimeout(
        [
          process.execPath,
          "-e",
          'process.stdout.write((process.env.CLAWDBOT_BASE_ENV ?? "") + "|" + (process.env.CLAWDBOT_TEST_ENV ?? ""))',
        ],
        {
          timeoutMs: 5_000,
          env: { CLAWDBOT_TEST_ENV: "ok" },
        },
      );

      expect(result.code).toBe(0);
      expect(result.stdout).toBe("base|ok");
    } finally {
<<<<<<< HEAD
      if (previous === undefined) {
        delete process.env.CLAWDBOT_BASE_ENV;
      } else {
        process.env.CLAWDBOT_BASE_ENV = previous;
      }
=======
      envSnapshot.restore();
>>>>>>> ee2fa5f41 (refactor(test): reuse env snapshots in unit suites)
    }
  });
<<<<<<< HEAD
=======

  it("kills command when no output timeout elapses", async () => {
    const startedAt = Date.now();
    const result = await runCommandWithTimeout(
      [process.execPath, "-e", "setTimeout(() => {}, 10_000)"],
      {
        timeoutMs: 5_000,
        noOutputTimeoutMs: 200,
      },
    );

    const durationMs = Date.now() - startedAt;
    expect(durationMs).toBeLessThan(1_500);
    expect(result.termination).toBe("no-output-timeout");
    expect(result.noOutputTimedOut).toBe(true);
    expect(result.code).not.toBe(0);
  });

  it("resets no output timer when command keeps emitting output", async () => {
    const result = await runCommandWithTimeout(
      [
        process.execPath,
        "-e",
        'let i=0; const t=setInterval(() => { process.stdout.write("."); i += 1; if (i >= 4) { clearInterval(t); process.exit(0); } }, 30);',
      ],
      {
        timeoutMs: 5_000,
        noOutputTimeoutMs: 200,
      },
    );

    expect(result.code).toBe(0);
    expect(result.termination).toBe("exit");
    expect(result.noOutputTimedOut).toBe(false);
    expect(result.stdout.length).toBeGreaterThanOrEqual(4);
  });

  it("reports global timeout termination when overall timeout elapses", async () => {
    const result = await runCommandWithTimeout(
      [process.execPath, "-e", "setTimeout(() => {}, 10_000)"],
      {
        timeoutMs: 120,
      },
    );

    expect(result.termination).toBe("timeout");
    expect(result.noOutputTimedOut).toBe(false);
    expect(result.code).not.toBe(0);
  });
>>>>>>> 31939397a (test: optimize hot-path test runtime)
});
