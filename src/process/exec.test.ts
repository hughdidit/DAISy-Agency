import { describe, expect, it } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD

import { runCommandWithTimeout } from "./exec.js";
=======
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { afterEach, describe, expect, it } from "vitest";
import { withEnvAsync } from "../test-utils/env.js";
import { attachChildProcessBridge } from "./child-process-bridge.js";
>>>>>>> 86a8b65e9 (test: consolidate redundant suites and speed up timers)
import { runCommandWithTimeout, shouldSpawnWithShell } from "./exec.js";
>>>>>>> ee2fa5f41 (refactor(test): reuse env snapshots in unit suites)

const CHILD_READY_TIMEOUT_MS = 4_000;
const CHILD_EXIT_TIMEOUT_MS = 4_000;

function waitForLine(
  stream: NodeJS.ReadableStream,
  timeoutMs = CHILD_READY_TIMEOUT_MS,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("timeout waiting for line"));
    }, timeoutMs);

    const onData = (chunk: Buffer | string): void => {
      buffer += chunk.toString();
      const idx = buffer.indexOf("\n");
      if (idx >= 0) {
        const line = buffer.slice(0, idx).trim();
        cleanup();
        resolve(line);
      }
    };

    const onError = (err: unknown): void => {
      cleanup();
      reject(err);
    };

    const cleanup = (): void => {
      clearTimeout(timeout);
      stream.off("data", onData);
      stream.off("error", onError);
    };

    stream.on("data", onData);
    stream.on("error", onError);
  });
}

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
<<<<<<< HEAD
    const previous = process.env.OPENCLAW_BASE_ENV;
    process.env.OPENCLAW_BASE_ENV = "base";
    try {
=======
    await withEnvAsync({ OPENCLAW_BASE_ENV: "base" }, async () => {
>>>>>>> ae70bf4dc (refactor(test): simplify env scoping in exec and usage tests)
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
<<<<<<< HEAD
      if (previous === undefined) {
        delete process.env.OPENCLAW_BASE_ENV;
      } else {
        process.env.OPENCLAW_BASE_ENV = previous;
      }
    }
=======
      expect(result.termination).toBe("exit");
    });
>>>>>>> ae70bf4dc (refactor(test): simplify env scoping in exec and usage tests)
  });

  it("kills command when no output timeout elapses", async () => {
    const result = await runCommandWithTimeout(
<<<<<<< HEAD
<<<<<<< HEAD
      [
        process.execPath,
        "-e",
        `setTimeout(() => {}, ${PROCESS_TEST_SCRIPT_DELAY_MS.silentProcess})`,
      ],
=======
      [process.execPath, "-e", "setTimeout(() => {}, 60)"],
      {
        timeoutMs: 1_000,
        noOutputTimeoutMs: 35,
=======
      [process.execPath, "-e", "setTimeout(() => {}, 40)"],
      {
        timeoutMs: 500,
        noOutputTimeoutMs: 20,
>>>>>>> d01cc69ef (test: tighten process timeout fixtures)
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
<<<<<<< HEAD
        'process.stdout.write("."); setTimeout(() => process.stdout.write("."), 30); setTimeout(() => process.exit(0), 60);',
      ],
      {
        timeoutMs: 1_000,
        noOutputTimeoutMs: 500,
=======
        'process.stdout.write("."); setTimeout(() => process.stdout.write("."), 20); setTimeout(() => process.exit(0), 40);',
      ],
      {
        timeoutMs: 500,
        noOutputTimeoutMs: 250,
>>>>>>> d01cc69ef (test: tighten process timeout fixtures)
=======
        [
          'process.stdout.write(".");',
          "let count = 0;",
          'const ticker = setInterval(() => { process.stdout.write(".");',
          "count += 1;",
          "if (count === 10) {",
          "clearInterval(ticker);",
          "process.exit(0);",
          "}",
<<<<<<< HEAD
          "}, 40);",
        ].join(" "),
      ],
      {
        timeoutMs: 5_000,
<<<<<<< HEAD
<<<<<<< HEAD
        noOutputTimeoutMs: 250,
>>>>>>> a6a2a9276 (test: reduce exec timer test runtime)
=======
        noOutputTimeoutMs: 1_500,
>>>>>>> fe6271134 (test(gate): stabilize env- and timing-sensitive process/web-search checks)
=======
          "}, 200);",
        ].join(" "),
      ],
      {
        timeoutMs: 7_000,
        noOutputTimeoutMs: 450,
>>>>>>> df9a47489 (test: stabilize no-output timeout exec test)
=======
          "}, 100);",
        ].join(" "),
      ],
      {
        timeoutMs: 10_000,
        // Extra headroom for busy CI workers while still validating timer resets.
        noOutputTimeoutMs: 2_500,
>>>>>>> c89836a25 (test: harden flaky timeout and resolver specs)
      },
    );

    expect(result.code ?? 0).toBe(0);
    expect(result.termination).toBe("exit");
    expect(result.noOutputTimedOut).toBe(false);
<<<<<<< HEAD
<<<<<<< HEAD
    expect(result.stdout.length).toBeGreaterThanOrEqual(2);
=======
    expect(result.stdout.length).toBeGreaterThanOrEqual(7);
>>>>>>> df9a47489 (test: stabilize no-output timeout exec test)
=======
    expect(result.stdout.length).toBeGreaterThanOrEqual(11);
>>>>>>> c89836a25 (test: harden flaky timeout and resolver specs)
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
      [process.execPath, "-e", "setTimeout(() => {}, 40)"],
>>>>>>> d01cc69ef (test: tighten process timeout fixtures)
      {
        timeoutMs: 15,
      },
    );

    expect(result.termination).toBe("timeout");
    expect(result.noOutputTimedOut).toBe(false);
    expect(result.code).not.toBe(0);
  });
>>>>>>> 31939397a (test: optimize hot-path test runtime)
});

describe("attachChildProcessBridge", () => {
  const children: Array<{ kill: (signal?: NodeJS.Signals) => boolean }> = [];
  const detachments: Array<() => void> = [];

  afterEach(() => {
    for (const detach of detachments) {
      try {
        detach();
      } catch {
        // ignore
      }
    }
    detachments.length = 0;
    for (const child of children) {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }
    children.length = 0;
  });

  it("forwards SIGTERM to the wrapped child", async () => {
    const childPath = path.resolve(process.cwd(), "test/fixtures/child-process-bridge/child.js");

    const beforeSigterm = new Set(process.listeners("SIGTERM"));
    const child = spawn(process.execPath, [childPath], {
      stdio: ["ignore", "pipe", "inherit"],
      env: process.env,
    });
    const { detach } = attachChildProcessBridge(child);
    detachments.push(detach);
    children.push(child);
    const afterSigterm = process.listeners("SIGTERM");
    const addedSigterm = afterSigterm.find((listener) => !beforeSigterm.has(listener));

    if (!child.stdout) {
      throw new Error("expected stdout");
    }
    const ready = await waitForLine(child.stdout);
    expect(ready).toBe("ready");

    if (!addedSigterm) {
      throw new Error("expected SIGTERM listener");
    }
    addedSigterm("SIGTERM");

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("timeout waiting for child exit")),
        CHILD_EXIT_TIMEOUT_MS,
      );
      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  });
});
