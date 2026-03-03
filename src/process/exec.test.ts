import { describe, expect, it } from "vitest";

import { runCommandWithTimeout } from "./exec.js";

describe("runCommandWithTimeout", () => {
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
  });

  it("merges custom env with process.env", async () => {
    const previous = process.env.OPENCLAW_BASE_ENV;
    process.env.OPENCLAW_BASE_ENV = "base";
    try {
      const result = await runCommandWithTimeout(
        [
          process.execPath,
          "-e",
          'process.stdout.write((process.env.OPENCLAW_BASE_ENV ?? "") + "|" + (process.env.OPENCLAW_TEST_ENV ?? ""))',
        ],
        {
          timeoutMs: 5_000,
          env: { OPENCLAW_TEST_ENV: "ok" },
        },
      );

      expect(result.code).toBe(0);
      expect(result.stdout).toBe("base|ok");
    } finally {
      if (previous === undefined) {
        delete process.env.OPENCLAW_BASE_ENV;
      } else {
        process.env.OPENCLAW_BASE_ENV = previous;
      }
    }
=======
        timeoutMs: 7_000,
        // Keep a generous idle budget; CI event-loop stalls can exceed 450ms.
        noOutputTimeoutMs: 900,
>>>>>>> 262bca9bd (fix: restore dm command and self-chat auth behavior)
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
