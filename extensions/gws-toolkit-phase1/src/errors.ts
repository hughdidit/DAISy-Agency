import { redactForOutput } from "./logger.js";
import type { ResultCode, StructuredError, ToolName } from "./types.js";

export class PluginError extends Error {
  readonly code: ResultCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ResultCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "PluginError";
  }
}

export function toStructuredError(params: {
  error: unknown;
  tool: ToolName;
  action: string;
  service: StructuredError["meta"]["service"];
  latencyMs: number;
}): StructuredError {
  const err = params.error instanceof PluginError ? params.error : null;
  const code: ResultCode = err?.code ?? "INTERNAL_ERROR";
  const message = err?.message ?? "Unexpected plugin error";
  return {
    ok: false,
    error: {
      code,
      message,
      details: err?.details ? (redactForOutput(err.details) as Record<string, unknown>) : undefined,
    },
    meta: {
      tool: params.tool,
      action: params.action,
      service: params.service,
      latencyMs: params.latencyMs,
    },
  };
}

export function throwPluginError(
  code: ResultCode,
  message: string,
  details?: Record<string, unknown>,
): never {
  throw new PluginError(code, message, details);
}
