import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { loadConfig } from "../../config/config.js";
import { resolveOpenClawPackageRoot } from "../../infra/openclaw-root.js";
import { trimLogTail } from "../../infra/restart-sentinel.js";
import { getMemorySearchManager } from "../../memory/index.js";
import { runCommandWithTimeout } from "../../process/exec.js";
import { formatControlPlaneActor, resolveControlPlaneActor } from "../control-plane-audit.js";
import { type DoctorRunParams, validateDoctorRunParams } from "../protocol/index.js";
import { formatError } from "../server-utils.js";
import type { GatewayRequestHandlers } from "./types.js";
import { assertValidParams } from "./validation.js";

export type DoctorMemoryStatusPayload = {
  agentId: string;
  provider?: string;
  embedding: {
    ok: boolean;
    error?: string;
  };
};

const DEFAULT_DOCTOR_RUN_TIMEOUT_MS = 10 * 60_000;
const MAX_DOCTOR_RUN_TIMEOUT_MS = 30 * 60_000;
const MAX_DOCTOR_LOG_CHARS = 8_000;

type DoctorRunMode = DoctorRunParams["mode"];

type DoctorRunResultPayload = {
  ok: boolean;
  mode: DoctorRunMode;
  command: string;
  cwd: string;
  timeoutMs?: number;
  started: boolean;
  background: boolean;
  pid?: number;
  exitCode?: number | null;
  timedOut?: boolean;
  stdoutTail?: string | null;
  stderrTail?: string | null;
  durationMs?: number;
};

async function resolveDoctorCliCommand(mode: DoctorRunMode): Promise<{
  argv: string[];
  command: string;
  cwd: string;
}> {
  const root =
    (await resolveOpenClawPackageRoot({
      moduleUrl: import.meta.url,
      argv1: process.argv[1],
      cwd: process.cwd(),
    })) ?? process.cwd();
  const entryPath = path.join(root, "openclaw.mjs");
  await fs.access(entryPath);

  const argv =
    mode === "dry-run"
      ? [process.execPath, entryPath, "doctor", "--dry-run", "--non-interactive"]
      : [process.execPath, entryPath, "doctor", "--repair", "--yes", "--non-interactive"];
  return {
    argv,
    command: formatCommandForDisplay(argv),
    cwd: root,
  };
}

function formatCommandArg(arg: string): string {
  if (arg.length === 0) {
    return '""';
  }
  if (/^[A-Za-z0-9_./:=+-]+$/.test(arg)) {
    return arg;
  }
  return JSON.stringify(arg);
}

function formatCommandForDisplay(argv: string[]): string {
  return argv.map((arg) => formatCommandArg(arg)).join(" ");
}

function normalizeDoctorRunTimeout(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DOCTOR_RUN_TIMEOUT_MS;
  }
  return Math.max(1_000, Math.min(Math.floor(value), MAX_DOCTOR_RUN_TIMEOUT_MS));
}

async function runDoctorPreview(
  command: Awaited<ReturnType<typeof resolveDoctorCliCommand>>,
  timeoutMs: number,
): Promise<DoctorRunResultPayload> {
  const startedAt = Date.now();
  const result = await runCommandWithTimeout(command.argv, {
    cwd: command.cwd,
    timeoutMs,
  });
  return {
    ok:
      result.code === 0 &&
      result.termination !== "timeout" &&
      result.termination !== "no-output-timeout",
    mode: "dry-run",
    command: command.command,
    cwd: command.cwd,
    timeoutMs,
    started: true,
    background: false,
    exitCode: result.code,
    timedOut: result.termination === "timeout" || result.termination === "no-output-timeout",
    stdoutTail: trimLogTail(result.stdout, MAX_DOCTOR_LOG_CHARS),
    stderrTail: trimLogTail(result.stderr, MAX_DOCTOR_LOG_CHARS),
    durationMs: Date.now() - startedAt,
  };
}

function startDoctorApply(
  command: Awaited<ReturnType<typeof resolveDoctorCliCommand>>,
  logGateway?: { warn: (message: string) => void },
): DoctorRunResultPayload {
  const child = spawn(command.argv[0] ?? process.execPath, command.argv.slice(1), {
    cwd: command.cwd,
    env: Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => value !== undefined),
    ) as NodeJS.ProcessEnv,
    detached: true,
    stdio: "ignore",
  });
  child.on("error", (err) => {
    logGateway?.warn(`doctor.run apply spawn failed: ${formatError(err)}`);
  });
  child.unref();
  return {
    ok: true,
    mode: "apply",
    command: command.command,
    cwd: command.cwd,
    started: true,
    background: true,
    pid: child.pid ?? undefined,
  };
}

export const doctorHandlers: GatewayRequestHandlers = {
  "doctor.memory.status": async ({ respond }) => {
    const cfg = loadConfig();
    const agentId = resolveDefaultAgentId(cfg);
    const { manager, error } = await getMemorySearchManager({
      cfg,
      agentId,
      purpose: "status",
    });
    if (!manager) {
      const payload: DoctorMemoryStatusPayload = {
        agentId,
        embedding: {
          ok: false,
          error: error ?? "memory search unavailable",
        },
      };
      respond(true, payload, undefined);
      return;
    }

    try {
      const status = manager.status();
      let embedding = await manager.probeEmbeddingAvailability();
      if (!embedding.ok && !embedding.error) {
        embedding = { ok: false, error: "memory embeddings unavailable" };
      }
      const payload: DoctorMemoryStatusPayload = {
        agentId,
        provider: status.provider,
        embedding,
      };
      respond(true, payload, undefined);
    } catch (err) {
      const payload: DoctorMemoryStatusPayload = {
        agentId,
        embedding: {
          ok: false,
          error: `gateway memory probe failed: ${formatError(err)}`,
        },
      };
      respond(true, payload, undefined);
    } finally {
      await manager.close?.().catch(() => {});
    }
  },
  "doctor.run": async ({ params, respond, client, context }) => {
    if (!assertValidParams(params, validateDoctorRunParams, "doctor.run", respond)) {
      return;
    }

    const mode = params.mode;
    const timeoutMs = normalizeDoctorRunTimeout(params.timeoutMs);
    const actor = resolveControlPlaneActor(client);
    try {
      const command = await resolveDoctorCliCommand(mode);
      const payload =
        mode === "dry-run"
          ? await runDoctorPreview(command, timeoutMs)
          : startDoctorApply(command, context?.logGateway);
      context?.logGateway?.info(
        `doctor.run completed ${formatControlPlaneActor(actor)} mode=${mode} background=${payload.background} ok=${payload.ok}`,
      );
      respond(true, payload, undefined);
    } catch (err) {
      const message = formatError(err);
      context?.logGateway?.warn(
        `doctor.run failed ${formatControlPlaneActor(actor)} mode=${mode} error=${message}`,
      );
      const payload: DoctorRunResultPayload = {
        ok: false,
        mode,
        command: "",
        cwd: process.cwd(),
        timeoutMs: mode === "dry-run" ? timeoutMs : undefined,
        started: false,
        background: mode === "apply",
        stderrTail: message,
      };
      respond(true, payload, undefined);
    }
  },
};
