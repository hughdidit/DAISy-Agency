import { describe, expect, it } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
import { runCommandWithTimeout } from "./exec.js";
=======
import { captureEnv } from "../test-utils/env.js";
=======
import { withEnvAsync } from "../test-utils/env.js";
>>>>>>> ae70bf4dc (refactor(test): simplify env scoping in exec and usage tests)
import { runCommandWithTimeout, shouldSpawnWithShell } from "./exec.js";
<<<<<<< HEAD
>>>>>>> ee2fa5f41 (refactor(test): reuse env snapshots in unit suites)
=======
import {
  PROCESS_TEST_NO_OUTPUT_TIMEOUT_MS,
  PROCESS_TEST_SCRIPT_DELAY_MS,
  PROCESS_TEST_TIMEOUT_MS,
} from "./test-timeouts.js";
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)

describe("runCommandWithTimeout", () => {
<<<<<<< HEAD
  it("passes env overrides to child", async () => {
    const result = await runCommandWithTimeout(
      [process.execPath, "-e", 'process.stdout.write(process.env.OPENCLAW_TEST_ENV ?? "")'],
      {
        timeoutMs: 5_000,
        env: { OPENCLAW_TEST_ENV: "ok" },
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
    await withEnvAsync({ OPENCLAW_BASE_ENV: "base" }, async () => {
      const result = await runCommandWithTimeout(
        [
          process.execPath,
          "-e",
          'process.stdout.write((process.env.OPENCLAW_BASE_ENV ?? "") + "|" + (process.env.OPENCLAW_TEST_ENV ?? ""))',
        ],
        {
          timeoutMs: PROCESS_TEST_TIMEOUT_MS.medium,
          env: { OPENCLAW_TEST_ENV: "ok" },
        },
      );

      expect(result.code).toBe(0);
      expect(result.stdout).toBe("base|ok");
<<<<<<< HEAD
    } finally {
      envSnapshot.restore();
    }
=======
      expect(result.termination).toBe("exit");
    });
>>>>>>> ae70bf4dc (refactor(test): simplify env scoping in exec and usage tests)
  });
<<<<<<< HEAD
=======

  it("kills command when no output timeout elapses", async () => {
    const result = await runCommandWithTimeout(
<<<<<<< HEAD
      [
        process.execPath,
        "-e",
        `setTimeout(() => {}, ${PROCESS_TEST_SCRIPT_DELAY_MS.silentProcess})`,
      ],
=======
      [process.execPath, "-e", "setTimeout(() => {}, 60)"],
>>>>>>> 00eb2541d (test: shorten idle child timers in timeout assertions)
      {
<<<<<<< HEAD
        timeoutMs: 1_000,
        noOutputTimeoutMs: 35,
=======
        timeoutMs: PROCESS_TEST_TIMEOUT_MS.standard,
        noOutputTimeoutMs: PROCESS_TEST_NO_OUTPUT_TIMEOUT_MS.exec,
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
      },
    );

    expect(result.termination).toBe("no-output-timeout");
    expect(result.noOutputTimedOut).toBe(true);
    expect(result.code).not.toBe(0);
  });

  it("resets no output timer when command keeps emitting output", async () => {
    const result = await runCommandWithTimeout(
      [
        process.execPath,
        "-e",
<<<<<<< HEAD
        'process.stdout.write("."); setTimeout(() => process.stdout.write("."), 30); setTimeout(() => process.exit(0), 60);',
      ],
      {
        timeoutMs: 1_000,
        noOutputTimeoutMs: 500,
=======
        `process.stdout.write(".\\n"); const interval = setInterval(() => process.stdout.write(".\\n"), ${PROCESS_TEST_SCRIPT_DELAY_MS.streamingInterval}); setTimeout(() => { clearInterval(interval); process.exit(0); }, ${PROCESS_TEST_SCRIPT_DELAY_MS.streamingDuration});`,
      ],
      {
        timeoutMs: PROCESS_TEST_TIMEOUT_MS.extraLong,
        noOutputTimeoutMs: PROCESS_TEST_NO_OUTPUT_TIMEOUT_MS.streamingAllowance,
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
      },
    );

    expect(result.signal).toBeNull();
    expect(result.code ?? 0).toBe(0);
    expect(result.termination).toBe("exit");
    expect(result.noOutputTimedOut).toBe(false);
    expect(result.stdout.length).toBeGreaterThanOrEqual(2);
  });

  it("reports global timeout termination when overall timeout elapses", async () => {
    const result = await runCommandWithTimeout(
<<<<<<< HEAD
      [
        process.execPath,
        "-e",
        `setTimeout(() => {}, ${PROCESS_TEST_SCRIPT_DELAY_MS.silentProcess})`,
      ],
=======
      [process.execPath, "-e", "setTimeout(() => {}, 60)"],
>>>>>>> 00eb2541d (test: shorten idle child timers in timeout assertions)
      {
<<<<<<< HEAD
        timeoutMs: 15,
=======
        timeoutMs: PROCESS_TEST_TIMEOUT_MS.short,
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
      },
    );

    expect(result.termination).toBe("timeout");
    expect(result.noOutputTimedOut).toBe(false);
    expect(result.code).not.toBe(0);
  });
>>>>>>> 31939397a (test: optimize hot-path test runtime)
});
