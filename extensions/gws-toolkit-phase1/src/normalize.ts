import { PluginError } from "./errors.js";
import type { ExecutionResult } from "./types.js";

export type NormalizedExecution = {
  payload: unknown;
  exitCode: number | null;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
};

function parseJson(input: string): unknown {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new PluginError("NON_JSON_OUTPUT", "gws returned empty stdout");
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const suffix = trimmed.match(/({[\s\S]*}|\[[\s\S]*\])\s*$/);
    if (suffix?.[1]) {
      try {
        return JSON.parse(suffix[1]);
      } catch {
        // fall through to throw below
      }
    }
  }

  throw new PluginError("NON_JSON_OUTPUT", "gws returned non-JSON stdout");
}

function parseJsonBestEffort(input: string): unknown | undefined {
  try {
    return parseJson(input);
  } catch {
    return undefined;
  }
}

export function normalizeExecution(result: ExecutionResult): NormalizedExecution {
  if (result.timedOut) {
    throw new PluginError("EXEC_TIMEOUT", "gws command timed out", {
      durationMs: result.durationMs,
    });
  }

  if (result.exitCode !== 0) {
    const parsed = parseJsonBestEffort(result.stdout);
    throw new PluginError("CLI_ERROR", "gws command returned non-zero exit code", {
      exitCode: result.exitCode,
      stderr: result.stderr.slice(0, 240),
      payload: parsed,
    });
  }

  const parsed = parseJson(result.stdout);

  return {
    payload: parsed,
    exitCode: result.exitCode,
    stderr: result.stderr,
    stdoutTruncated: result.stdoutTruncated,
    stderrTruncated: result.stderrTruncated,
  };
}
