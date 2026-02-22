import { describe, expect, it } from "vitest";

import { runCommandWithTimeout } from "./exec.js";

describe("runCommandWithTimeout", () => {
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
  });

  it("merges custom env with process.env", async () => {
    const previous = process.env.CLAWDBOT_BASE_ENV;
    process.env.CLAWDBOT_BASE_ENV = "base";
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
<<<<<<< HEAD
    } finally {
      if (previous === undefined) {
        delete process.env.CLAWDBOT_BASE_ENV;
      } else {
        process.env.CLAWDBOT_BASE_ENV = previous;
      }
    }
=======
      expect(result.termination).toBe("exit");
    });
  });

  it("kills command when no output timeout elapses", async () => {
    const result = await runCommandWithTimeout(
      [process.execPath, "-e", "setTimeout(() => {}, 120)"],
      {
        timeoutMs: 3_000,
        noOutputTimeoutMs: 120,
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
        'process.stdout.write(".\\n"); const interval = setInterval(() => process.stdout.write(".\\n"), 1800); setTimeout(() => { clearInterval(interval); process.exit(0); }, 9000);',
      ],
      {
        timeoutMs: 15_000,
        noOutputTimeoutMs: 6_000,
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
      [process.execPath, "-e", "setTimeout(() => {}, 120)"],
      {
        timeoutMs: 100,
      },
    );

    expect(result.termination).toBe("timeout");
    expect(result.noOutputTimedOut).toBe(false);
    expect(result.code).not.toBe(0);
>>>>>>> 78c3c2a54 (fix: stabilize flaky tests and sanitize directive-only chat tags)
  });
});
