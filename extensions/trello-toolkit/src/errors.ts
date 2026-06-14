import type { StructuredError, TrelloAction, TrelloResultCode, TrelloToolName } from "./types.js";

export class TrelloToolkitError extends Error {
  readonly code: TrelloResultCode;
  readonly details?: Record<string, unknown>;

  constructor(code: TrelloResultCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "TrelloToolkitError";
    this.code = code;
    this.details = details;
  }
}

export function errorEnvelope(params: {
  tool: TrelloToolName;
  action: TrelloAction;
  code: TrelloResultCode;
  message: string;
  latencyMs: number;
  routeName?: string;
  details?: Record<string, unknown>;
}): StructuredError {
  return {
    ok: false,
    error: {
      code: params.code,
      message: params.message,
      ...(params.details ? { details: params.details } : {}),
    },
    meta: {
      tool: params.tool,
      action: params.action,
      resultCode: params.code,
      latencyMs: params.latencyMs,
      ...(params.routeName ? { routeName: params.routeName } : {}),
    },
  };
}
