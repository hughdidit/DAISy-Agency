import type { startGatewayServer } from "../../gateway/server.js";
import { acquireGatewayLock } from "../../infra/gateway-lock.js";
import {
  consumeGatewaySigusr1RestartAuthorization,
  isGatewaySigusr1RestartExternallyAllowed,
} from "../../infra/restart.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
<<<<<<< HEAD
import type { defaultRuntime } from "../../runtime.js";
=======
import {
  getActiveTaskCount,
  resetAllLanes,
  waitForActiveTasks,
} from "../../process/command-queue.js";
import { createRestartIterationHook } from "../../process/restart-recovery.js";
>>>>>>> 4e9f933e8 (fix: reset stale execution state after SIGUSR1 in-process restart (#15195))

const gatewayLog = createSubsystemLogger("gateway");

type GatewayRunSignalAction = "stop" | "restart";

export async function runGatewayLoop(params: {
  start: () => Promise<Awaited<ReturnType<typeof startGatewayServer>>>;
  runtime: typeof defaultRuntime;
}) {
  let lock = await acquireGatewayLock();
  let server: Awaited<ReturnType<typeof startGatewayServer>> | null = null;
  let shuttingDown = false;
  let restartResolver: (() => void) | null = null;

  const cleanupSignals = () => {
    process.removeListener("SIGTERM", onSigterm);
    process.removeListener("SIGINT", onSigint);
    process.removeListener("SIGUSR1", onSigusr1);
  };

  const request = (action: GatewayRunSignalAction, signal: string) => {
    if (shuttingDown) {
      gatewayLog.info(`received ${signal} during shutdown; ignoring`);
      return;
    }
    shuttingDown = true;
    const isRestart = action === "restart";
    gatewayLog.info(`received ${signal}; ${isRestart ? "restarting" : "shutting down"}`);

    const forceExitTimer = setTimeout(() => {
      gatewayLog.error("shutdown timed out; exiting without full cleanup");
      cleanupSignals();
      params.runtime.exit(0);
    }, 5000);

    void (async () => {
      try {
        await server?.close({
          reason: isRestart ? "gateway restarting" : "gateway stopping",
          restartExpectedMs: isRestart ? 1500 : null,
        });
      } catch (err) {
        gatewayLog.error(`shutdown error: ${String(err)}`);
      } finally {
        clearTimeout(forceExitTimer);
        server = null;
        if (isRestart) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
          shuttingDown = false;
          restartResolver?.();
=======
=======
          // Release the lock BEFORE spawning so the child can acquire it immediately.
          await lock?.release();
>>>>>>> 9c30243c8 (fix: release gateway lock before spawning restart child)
=======
          const hadLock = lock != null;
          // Release the lock BEFORE spawning so the child can acquire it immediately.
          if (lock) {
            await lock.release();
            lock = null;
          }
>>>>>>> dd07c06d0 (fix: tighten gateway restart loop handling (#23416) (thanks @jeffwnli))
          const respawn = restartGatewayProcessWithFreshPid();
          if (respawn.mode === "spawned" || respawn.mode === "supervised") {
            const modeLabel =
              respawn.mode === "spawned"
                ? `spawned pid ${respawn.pid ?? "unknown"}`
                : "supervisor restart";
            gatewayLog.info(`restart mode: full process restart (${modeLabel})`);
            cleanupSignals();
            params.runtime.exit(0);
          } else {
            if (respawn.mode === "failed") {
              gatewayLog.warn(
                `full process restart failed (${respawn.detail ?? "unknown error"}); falling back to in-process restart`,
              );
            } else {
              gatewayLog.info("restart mode: in-process restart (OPENCLAW_NO_RESPAWN)");
            }
            let canContinueInProcessRestart = true;
            if (hadLock) {
              try {
                lock = await acquireGatewayLock();
              } catch (err) {
                gatewayLog.error(
                  `failed to reacquire gateway lock for in-process restart: ${String(err)}`,
                );
                cleanupSignals();
                params.runtime.exit(1);
                canContinueInProcessRestart = false;
              }
            }
            if (canContinueInProcessRestart) {
              shuttingDown = false;
              restartResolver?.();
            }
          }
>>>>>>> 01bd83d64 (fix: release gateway lock before process.exit in run-loop)
        } else {
          if (lock) {
            await lock.release();
            lock = null;
          }
          cleanupSignals();
          params.runtime.exit(0);
        }
      }
    })();
  };

  const onSigterm = () => {
    gatewayLog.info("signal SIGTERM received");
    request("stop", "SIGTERM");
  };
  const onSigint = () => {
    gatewayLog.info("signal SIGINT received");
    request("stop", "SIGINT");
  };
  const onSigusr1 = () => {
    gatewayLog.info("signal SIGUSR1 received");
    const authorized = consumeGatewaySigusr1RestartAuthorization();
    if (!authorized && !isGatewaySigusr1RestartExternallyAllowed()) {
      gatewayLog.warn(
        "SIGUSR1 restart ignored (not authorized; enable commands.restart or use gateway tool).",
      );
      return;
    }
    request("restart", "SIGUSR1");
  };

  process.on("SIGTERM", onSigterm);
  process.on("SIGINT", onSigint);
  process.on("SIGUSR1", onSigusr1);

  try {
    const onIteration = createRestartIterationHook(() => {
      // After an in-process restart (SIGUSR1), reset command-queue lane state.
      // Interrupted tasks from the previous lifecycle may have left `active`
      // counts elevated (their finally blocks never ran), permanently blocking
      // new work from draining. This must happen here — at the restart
      // coordinator level — rather than inside individual subsystem init
      // functions, to avoid surprising cross-cutting side effects.
      resetAllLanes();
    });

    // Keep process alive; SIGUSR1 triggers an in-process restart (no supervisor required).
    // SIGTERM/SIGINT still exit after a graceful shutdown.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      onIteration();
      server = await params.start();
      await new Promise<void>((resolve) => {
        restartResolver = resolve;
      });
    }
  } finally {
    if (lock) {
      await lock.release();
      lock = null;
    }
    cleanupSignals();
  }
}
