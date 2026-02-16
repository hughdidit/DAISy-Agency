import { describe, expect, it } from "vitest";
<<<<<<< HEAD

import { runCommandWithTimeout } from "./exec.js";
=======
import { captureEnv } from "../test-utils/env.js";
import { runCommandWithTimeout, shouldSpawnWithShell } from "./exec.js";
>>>>>>> ee2fa5f41 (refactor(test): reuse env snapshots in unit suites)

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
});
