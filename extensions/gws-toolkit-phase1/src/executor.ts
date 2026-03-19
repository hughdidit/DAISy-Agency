import { spawn } from "node:child_process";
import {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "openclaw/plugin-sdk";
import { PluginError } from "./errors.js";
import type { ExecutionResult, GwsToolkitConfig } from "./types.js";

type BufferedCapture = {
  chunks: Buffer[];
  bytes: number;
  truncated: boolean;
};

function createCapture(): BufferedCapture {
  return {
    chunks: [],
    bytes: 0,
    truncated: false,
  };
}

function appendChunk(capture: BufferedCapture, chunk: Buffer, maxBytes: number): void {
  if (chunk.length === 0) {
    return;
  }

  const remaining = maxBytes - capture.bytes;
  if (remaining <= 0) {
    capture.truncated = true;
    return;
  }

  if (chunk.length <= remaining) {
    capture.chunks.push(chunk);
    capture.bytes += chunk.length;
    return;
  }

  capture.chunks.push(chunk.subarray(0, remaining));
  capture.bytes += remaining;
  capture.truncated = true;
}

function captureToText(capture: BufferedCapture): string {
  if (capture.chunks.length === 0) {
    return "";
  }
  return Buffer.concat(capture.chunks, capture.bytes).toString("utf8");
}

function buildChildEnv(overrides?: Record<string, string>): NodeJS.ProcessEnv {
  const baseKeys =
    process.platform === "win32"
      ? [
          "SYSTEMROOT",
          "ComSpec",
          "PATHEXT",
          "PATH",
          "TEMP",
          "TMP",
          "USERPROFILE",
          "HOME",
          "APPDATA",
          "LOCALAPPDATA",
          "ProgramData",
          "WINDIR",
        ]
      : ["PATH", "HOME", "LANG", "LC_ALL", "LC_CTYPE", "TMPDIR", "TEMP", "TMP", "TERM"];

  const env: NodeJS.ProcessEnv = {};
  for (const key of baseKeys) {
    const value = process.env[key];
    if (value !== undefined) {
      env[key] = value;
    }
  }

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      env[key] = value;
    }
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key.startsWith("MOCK_GWS_")) {
      env[key] = value;
    }
  }

  return env;
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
      env: buildChildEnv(params.env),
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutCapture = createCapture();
    const stderrCapture = createCapture();
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

    child.stdout.on("data", (chunk: Buffer | string) => {
      const data = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
      appendChunk(stdoutCapture, data, params.config.maxStdoutBytes);
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      const data = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
      appendChunk(stderrCapture, data, params.config.maxStderrBytes);
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
        stdout: captureToText(stdoutCapture),
        stderr: captureToText(stderrCapture),
        exitCode: code,
        signal,
        timedOut,
        stdoutTruncated: stdoutCapture.truncated,
        stderrTruncated: stderrCapture.truncated,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}