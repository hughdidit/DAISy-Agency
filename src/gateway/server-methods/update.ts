<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { resolveMoltbotPackageRoot } from "../../infra/moltbot-root.js";
import { scheduleGatewaySigusr1Restart } from "../../infra/restart.js";
=======
import type { GatewayRequestHandlers } from "./types.js";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { GatewayRequestHandlers } from "./types.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { GatewayRequestHandlers } from "./types.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { loadConfig } from "../../config/config.js";
import { extractDeliveryInfo } from "../../config/sessions.js";
import { resolveOpenClawPackageRoot } from "../../infra/openclaw-root.js";
>>>>>>> bbe9cb302 (fix(update): honor update.channel for update.run)
import {
  formatDoctorNonInteractiveHint,
  type RestartSentinelPayload,
  writeRestartSentinel,
} from "../../infra/restart-sentinel.js";
<<<<<<< HEAD
=======
import { scheduleGatewaySigusr1Restart } from "../../infra/restart.js";
import { normalizeUpdateChannel } from "../../infra/update-channels.js";
>>>>>>> bbe9cb302 (fix(update): honor update.channel for update.run)
import { runGatewayUpdate } from "../../infra/update-runner.js";
<<<<<<< HEAD
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateUpdateRunParams,
} from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";
=======
import { validateUpdateRunParams } from "../protocol/index.js";
import { parseRestartRequestParams } from "./restart-request.js";
import { assertValidParams } from "./validation.js";
>>>>>>> b743e652c (refactor(gateway): reuse shared validators + baseHash)

export const updateHandlers: GatewayRequestHandlers = {
  "update.run": async ({ params, respond }) => {
    if (!assertValidParams(params, validateUpdateRunParams, "update.run", respond)) {
      return;
    }
    const { sessionKey, note, restartDelayMs } = parseRestartRequestParams(params);
    const { deliveryContext, threadId } = extractDeliveryInfo(sessionKey);
    const timeoutMsRaw = (params as { timeoutMs?: unknown }).timeoutMs;
    const timeoutMs =
      typeof timeoutMsRaw === "number" && Number.isFinite(timeoutMsRaw)
        ? Math.max(1000, Math.floor(timeoutMsRaw))
        : undefined;

    let result: Awaited<ReturnType<typeof runGatewayUpdate>>;
    try {
      const config = loadConfig();
      const configChannel = normalizeUpdateChannel(config.update?.channel);
      const root =
        (await resolveMoltbotPackageRoot({
          moduleUrl: import.meta.url,
          argv1: process.argv[1],
          cwd: process.cwd(),
        })) ?? process.cwd();
      result = await runGatewayUpdate({
        timeoutMs,
        cwd: root,
        argv1: process.argv[1],
        channel: configChannel ?? undefined,
      });
    } catch (err) {
      result = {
        status: "error",
        mode: "unknown",
        reason: String(err),
        steps: [],
        durationMs: 0,
      };
    }

    const payload: RestartSentinelPayload = {
      kind: "update",
      status: result.status,
      ts: Date.now(),
      sessionKey,
      deliveryContext,
      threadId,
      message: note ?? null,
      doctorHint: formatDoctorNonInteractiveHint(),
      stats: {
        mode: result.mode,
        root: result.root ?? undefined,
        before: result.before ?? null,
        after: result.after ?? null,
        steps: result.steps.map((step) => ({
          name: step.name,
          command: step.command,
          cwd: step.cwd,
          durationMs: step.durationMs,
          log: {
            stdoutTail: step.stdoutTail ?? null,
            stderrTail: step.stderrTail ?? null,
            exitCode: step.exitCode ?? null,
          },
        })),
        reason: result.reason ?? null,
        durationMs: result.durationMs,
      },
    };

    let sentinelPath: string | null = null;
    try {
      sentinelPath = await writeRestartSentinel(payload);
    } catch {
      sentinelPath = null;
    }

    const restart = scheduleGatewaySigusr1Restart({
      delayMs: restartDelayMs,
      reason: "update.run",
    });

    respond(
      true,
      {
        ok: true,
        result,
        restart,
        sentinel: {
          path: sentinelPath,
          payload,
        },
      },
      undefined,
    );
  },
};
