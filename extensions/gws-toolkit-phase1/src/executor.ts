import { spawn } from "node:child_process";
import {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "../../../src/plugin-sdk/windows-spawn.js";
import { PluginError } from "./errors.js";
import type { ExecutionResult, GwsToolkitConfig } from "./types.js";

function capText(input: string, maxBytes: number): { text: string; truncated: boolean } {
  const bytes = Buffer.byteLength(input, "utf8");
  if (bytes <= maxBytes) {
    return { text: input, truncated: false };
  }
  const buffer = Buffer.from(input, "utf8").subarray(0, maxBytes);
  return { text: buffer.toString("utf8"), truncated: true };
}

function resolveInvocation(binaryPath: string, argv: string[]) {
  const candidate = resolveWindowsSpawnProgramCandidate({
    command: binaryPath,
    platform: process.platform,
    env: process.env,
    execPath: process.execPath,
    packageName: "@googleworkspace/cli",
  });
  const program = applyWindowsSpawnProgramPolicy({
    candidate,
    allowShellFallback: false,
  });
  return materializeWindowsSpawnProgram(program, argv);
}

export async function executeCommand(params: {
  config: GwsToolkitConfig;
  binaryPath: string;
  argv: string[];
  env?: Record<string, string>;
}): Promise<ExecutionResult> {
  const startedAt = Date.now();
  const invocation = resolveInvocation(params.binaryPath, params.argv);

  return await new Promise<ExecutionResult>((resolve, reject) => {
    const child = spawn(invocation.command, invocation.argv, {
      shell: invocation.shell,
      windowsHide: invocation.windowsHide,
      env: {
        ...process.env,
        ...(params.env ?? {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let settled = false;

    const settle = (result: ExecutionResult) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const fail = (err: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(err);
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      const next = stdout + chunk;
      const capped = capText(next, params.config.maxStdoutBytes);
      stdout = capped.text;
      if (capped.truncated) {
        stdoutTruncated = true;
      }
    });

    child.stderr.on("data", (chunk: string) => {
      const next = stderr + chunk;
      const capped = capText(next, params.config.maxStderrBytes);
      stderr = capped.text;
      if (capped.truncated) {
        stderrTruncated = true;
      }
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }, params.config.timeoutMs);

    child.once("error", (err) => {
      fail(new PluginError("EXEC_ERROR", `failed to execute gws command: ${String(err)}`));
    });

    child.once("close", (code, signal) => {
      settle({
        stdout,
        stderr,
        exitCode: code,
        signal,
        timedOut,
        stdoutTruncated,
        stderrTruncated,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}
