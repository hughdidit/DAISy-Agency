import { describe, expect, it } from "vitest";
import {
  PROCESS_TEST_NO_OUTPUT_TIMEOUT_MS,
  PROCESS_TEST_SCRIPT_DELAY_MS,
  PROCESS_TEST_TIMEOUT_MS,
} from "../test-timeouts.js";
import { createProcessSupervisor } from "./supervisor.js";

describe("process supervisor", () => {
  it("spawns child runs and captures output", async () => {
    const supervisor = createProcessSupervisor();
    const run = await supervisor.spawn({
      sessionId: "s1",
      backendId: "test",
      mode: "child",
      argv: [process.execPath, "-e", 'process.stdout.write("ok")'],
<<<<<<< HEAD
      timeoutMs: 800,
=======
      timeoutMs: PROCESS_TEST_TIMEOUT_MS.long,
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
      stdinMode: "pipe-closed",
    });
    const exit = await run.wait();
    expect(exit.reason).toBe("exit");
    expect(exit.exitCode).toBe(0);
    expect(exit.stdout).toBe("ok");
  });

  it("enforces no-output timeout for silent processes", async () => {
    const supervisor = createProcessSupervisor();
    const run = await supervisor.spawn({
      sessionId: "s1",
      backendId: "test",
      mode: "child",
<<<<<<< HEAD
<<<<<<< HEAD
      argv: [process.execPath, "-e", "setTimeout(() => {}, 120)"],
=======
      argv: [process.execPath, "-e", "setTimeout(() => {}, 60)"],
>>>>>>> 00eb2541d (test: shorten idle child timers in timeout assertions)
      timeoutMs: 1_000,
      noOutputTimeoutMs: 20,
=======
      argv: [
        process.execPath,
        "-e",
        `setTimeout(() => {}, ${PROCESS_TEST_SCRIPT_DELAY_MS.silentProcess})`,
      ],
      timeoutMs: PROCESS_TEST_TIMEOUT_MS.standard,
      noOutputTimeoutMs: PROCESS_TEST_NO_OUTPUT_TIMEOUT_MS.supervisor,
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
      stdinMode: "pipe-closed",
    });
    const exit = await run.wait();
    expect(exit.reason).toBe("no-output-timeout");
    expect(exit.noOutputTimedOut).toBe(true);
    expect(exit.timedOut).toBe(true);
  });

  it("cancels prior scoped run when replaceExistingScope is enabled", async () => {
    const supervisor = createProcessSupervisor();
    const first = await supervisor.spawn({
      sessionId: "s1",
      backendId: "test",
      scopeKey: "scope:a",
      mode: "child",
<<<<<<< HEAD
<<<<<<< HEAD
      argv: [process.execPath, "-e", "setTimeout(() => {}, 120)"],
=======
      argv: [process.execPath, "-e", "setTimeout(() => {}, 60)"],
>>>>>>> 00eb2541d (test: shorten idle child timers in timeout assertions)
      timeoutMs: 1_000,
=======
      argv: [
        process.execPath,
        "-e",
        `setTimeout(() => {}, ${PROCESS_TEST_SCRIPT_DELAY_MS.silentProcess})`,
      ],
      timeoutMs: PROCESS_TEST_TIMEOUT_MS.standard,
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
      stdinMode: "pipe-open",
    });

    const second = await supervisor.spawn({
      sessionId: "s1",
      backendId: "test",
      scopeKey: "scope:a",
      replaceExistingScope: true,
      mode: "child",
      argv: [process.execPath, "-e", 'process.stdout.write("new")'],
<<<<<<< HEAD
      timeoutMs: 800,
=======
      timeoutMs: PROCESS_TEST_TIMEOUT_MS.long,
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
      stdinMode: "pipe-closed",
    });

    const firstExit = await first.wait();
    const secondExit = await second.wait();
    expect(firstExit.reason === "manual-cancel" || firstExit.reason === "signal").toBe(true);
    expect(secondExit.reason).toBe("exit");
    expect(secondExit.stdout).toBe("new");
  });

  it("applies overall timeout even for near-immediate timer firing", async () => {
    const supervisor = createProcessSupervisor();
    const run = await supervisor.spawn({
      sessionId: "s-timeout",
      backendId: "test",
      mode: "child",
<<<<<<< HEAD
<<<<<<< HEAD
      argv: [process.execPath, "-e", "setTimeout(() => {}, 120)"],
=======
      argv: [process.execPath, "-e", "setTimeout(() => {}, 60)"],
>>>>>>> 00eb2541d (test: shorten idle child timers in timeout assertions)
      timeoutMs: 1,
=======
      argv: [
        process.execPath,
        "-e",
        `setTimeout(() => {}, ${PROCESS_TEST_SCRIPT_DELAY_MS.silentProcess})`,
      ],
      timeoutMs: PROCESS_TEST_TIMEOUT_MS.tiny,
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
      stdinMode: "pipe-closed",
    });
    const exit = await run.wait();
    expect(exit.reason).toBe("overall-timeout");
    expect(exit.timedOut).toBe(true);
  });

  it("can stream output without retaining it in RunExit payload", async () => {
    const supervisor = createProcessSupervisor();
    let streamed = "";
    const run = await supervisor.spawn({
      sessionId: "s-capture",
      backendId: "test",
      mode: "child",
      argv: [process.execPath, "-e", 'process.stdout.write("streamed")'],
<<<<<<< HEAD
      timeoutMs: 800,
=======
      timeoutMs: PROCESS_TEST_TIMEOUT_MS.long,
>>>>>>> a4607277a (test: consolidate sessions_spawn and guardrail helpers)
      stdinMode: "pipe-closed",
      captureOutput: false,
      onStdout: (chunk) => {
        streamed += chunk;
      },
    });
    const exit = await run.wait();
    expect(streamed).toBe("streamed");
    expect(exit.stdout).toBe("");
  });
});
