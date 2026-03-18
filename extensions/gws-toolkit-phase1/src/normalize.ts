import { PluginError } from "./errors.js";
import type { ExecutionResult } from "./types.js";

export type NormalizedExecution = {
  payload: unknown;
  exitCode: number | null;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
};

function parseJsonLoose(input: string): unknown {
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
        // continue to throw below
      }
    }
  }
  throw new PluginError("NON_JSON_OUTPUT", "gws returned non-JSON stdout", {
    sample: trimmed.slice(0, 160),
  });
}

export function normalizeExecution(result: ExecutionResult): NormalizedExecution {
  if (result.timedOut) {
    throw new PluginError("EXEC_TIMEOUT", "gws command timed out", {
      durationMs: result.durationMs,
    });
  }

  const parsed = parseJsonLoose(result.stdout);

  if (result.exitCode !== 0) {
    throw new PluginError("CLI_ERROR", "gws command returned non-zero exit code", {
      exitCode: result.exitCode,
      stderr: result.stderr.slice(0, 240),
      payload: parsed,
    });
  }

  return {
    payload: parsed,
    exitCode: result.exitCode,
    stderr: result.stderr,
    stdoutTruncated: result.stdoutTruncated,
    stderrTruncated: result.stderrTruncated,
  };
}
