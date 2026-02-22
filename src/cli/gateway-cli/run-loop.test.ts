import { describe, expect, it, vi } from "vitest";

const acquireGatewayLock = vi.fn(async () => ({
  release: vi.fn(async () => {}),
}));
const consumeGatewaySigusr1RestartAuthorization = vi.fn(() => true);
const isGatewaySigusr1RestartExternallyAllowed = vi.fn(() => false);
const getActiveTaskCount = vi.fn(() => 0);
const waitForActiveTasks = vi.fn(async () => ({ drained: true }));
const resetAllLanes = vi.fn();
const restartGatewayProcessWithFreshPid = vi.fn<
  () => { mode: "spawned" | "supervised" | "disabled" | "failed"; pid?: number; detail?: string }
>(() => ({ mode: "disabled" }));
const DRAIN_TIMEOUT_LOG = "drain timeout reached; proceeding with restart";
const gatewayLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock("../../infra/gateway-lock.js", () => ({
  acquireGatewayLock: () => acquireGatewayLock(),
}));

vi.mock("../../infra/restart.js", () => ({
  consumeGatewaySigusr1RestartAuthorization: () => consumeGatewaySigusr1RestartAuthorization(),
  isGatewaySigusr1RestartExternallyAllowed: () => isGatewaySigusr1RestartExternallyAllowed(),
<<<<<<< HEAD
=======
  markGatewaySigusr1RestartHandled: () => markGatewaySigusr1RestartHandled(),
}));

vi.mock("../../infra/process-respawn.js", () => ({
<<<<<<< HEAD
  restartGatewayProcessWithFreshPid: (...args: unknown[]) =>
    restartGatewayProcessWithFreshPid(...args),
>>>>>>> 01bd83d64 (fix: release gateway lock before process.exit in run-loop)
=======
  restartGatewayProcessWithFreshPid: () => restartGatewayProcessWithFreshPid(),
>>>>>>> dd07c06d0 (fix: tighten gateway restart loop handling (#23416) (thanks @jeffwnli))
}));

vi.mock("../../process/command-queue.js", () => ({
  getActiveTaskCount: () => getActiveTaskCount(),
  waitForActiveTasks: (timeoutMs: number) => waitForActiveTasks(timeoutMs),
  resetAllLanes: () => resetAllLanes(),
}));

vi.mock("../../logging/subsystem.js", () => ({
  createSubsystemLogger: () => gatewayLog,
}));

function removeNewSignalListeners(
  signal: NodeJS.Signals,
  existing: Set<(...args: unknown[]) => void>,
) {
  for (const listener of process.listeners(signal)) {
    const fn = listener as (...args: unknown[]) => void;
    if (!existing.has(fn)) {
      process.removeListener(signal, fn);
    }
  }
}

describe("runGatewayLoop", () => {
  it("restarts after SIGUSR1 even when drain times out, and resets lanes for the new iteration", async () => {
    vi.clearAllMocks();
    getActiveTaskCount.mockReturnValueOnce(2).mockReturnValueOnce(0);
    waitForActiveTasks.mockResolvedValueOnce({ drained: false });

    type StartServer = () => Promise<{
      close: (opts: { reason: string; restartExpectedMs: number | null }) => Promise<void>;
    }>;

    const closeFirst = vi.fn(async () => {});
    const closeSecond = vi.fn(async () => {});
    const start = vi
      .fn<StartServer>()
      .mockResolvedValueOnce({ close: closeFirst })
      .mockResolvedValueOnce({ close: closeSecond })
      .mockRejectedValueOnce(new Error("stop-loop"));

    const beforeSigterm = new Set(
      process.listeners("SIGTERM") as Array<(...args: unknown[]) => void>,
    );
    const beforeSigint = new Set(
      process.listeners("SIGINT") as Array<(...args: unknown[]) => void>,
    );
    const beforeSigusr1 = new Set(
      process.listeners("SIGUSR1") as Array<(...args: unknown[]) => void>,
    );

    const loopPromise = import("./run-loop.js").then(({ runGatewayLoop }) =>
      runGatewayLoop({
        start,
        runtime: {
          exit: vi.fn(),
        } as { exit: (code: number) => never },
      }),
    );

    try {
      await vi.waitFor(() => {
        expect(start).toHaveBeenCalledTimes(1);
      });

      process.emit("SIGUSR1");

      await vi.waitFor(() => {
        expect(start).toHaveBeenCalledTimes(2);
      });

      expect(waitForActiveTasks).toHaveBeenCalledWith(30_000);
      expect(gatewayLog.warn).toHaveBeenCalledWith(DRAIN_TIMEOUT_LOG);
      expect(closeFirst).toHaveBeenCalledWith({
        reason: "gateway restarting",
        restartExpectedMs: 1500,
      });
      expect(resetAllLanes).toHaveBeenCalledTimes(1);

      process.emit("SIGUSR1");

      await expect(loopPromise).rejects.toThrow("stop-loop");
      expect(closeSecond).toHaveBeenCalledWith({
        reason: "gateway restarting",
        restartExpectedMs: 1500,
      });
      expect(resetAllLanes).toHaveBeenCalledTimes(2);
      expect(acquireGatewayLock).toHaveBeenCalledTimes(3);
    } finally {
      removeNewSignalListeners("SIGTERM", beforeSigterm);
      removeNewSignalListeners("SIGINT", beforeSigint);
      removeNewSignalListeners("SIGUSR1", beforeSigusr1);
    }
  });

  it("releases the lock before exiting on spawned restart", async () => {
    vi.clearAllMocks();

    const lockRelease = vi.fn(async () => {});
    acquireGatewayLock.mockResolvedValueOnce({
      release: lockRelease,
    });

    // Override process-respawn to return "spawned" mode
    restartGatewayProcessWithFreshPid.mockReturnValueOnce({
      mode: "spawned",
      pid: 9999,
    });

    const close = vi.fn(async () => {});
    let resolveStarted: (() => void) | null = null;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });

    const start = vi.fn(async () => {
      resolveStarted?.();
      return { close };
    });

    const exitCallOrder: string[] = [];
    const runtime = {
      log: vi.fn(),
      error: vi.fn(),
      exit: vi.fn(() => {
        exitCallOrder.push("exit");
      }),
    };

    lockRelease.mockImplementation(async () => {
      exitCallOrder.push("lockRelease");
    });

    const beforeSigterm = new Set(
      process.listeners("SIGTERM") as Array<(...args: unknown[]) => void>,
    );
    const beforeSigint = new Set(
      process.listeners("SIGINT") as Array<(...args: unknown[]) => void>,
    );
    const beforeSigusr1 = new Set(
      process.listeners("SIGUSR1") as Array<(...args: unknown[]) => void>,
    );

    vi.resetModules();
    const { runGatewayLoop } = await import("./run-loop.js");
    const _loopPromise = runGatewayLoop({
      start: start as unknown as Parameters<typeof runGatewayLoop>[0]["start"],
      runtime: runtime as unknown as Parameters<typeof runGatewayLoop>[0]["runtime"],
    });

    try {
      await started;
      await new Promise<void>((resolve) => setImmediate(resolve));

      process.emit("SIGUSR1");

      // Wait for the shutdown path to complete
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      expect(lockRelease).toHaveBeenCalled();
      expect(runtime.exit).toHaveBeenCalledWith(0);
      // Lock must be released BEFORE exit
      expect(exitCallOrder).toEqual(["lockRelease", "exit"]);
    } finally {
      removeNewSignalListeners("SIGTERM", beforeSigterm);
      removeNewSignalListeners("SIGINT", beforeSigint);
      removeNewSignalListeners("SIGUSR1", beforeSigusr1);
    }
  });
});
