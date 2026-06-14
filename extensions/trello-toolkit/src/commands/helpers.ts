import { TrelloClientError, createTrelloClient } from "../client.js";
import { errorEnvelope } from "../errors.js";
import type {
  PolicyDecision,
  StructuredEnvelope,
  TrelloAction,
  TrelloToolkitConfig,
  TrelloToolName,
} from "../types.js";

export function nowMs() {
  return Date.now();
}

export function readStringParam(
  params: Record<string, unknown>,
  key: string,
  options: { required: true; label?: string },
): string;
export function readStringParam(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; label?: string },
): string | undefined;
export function readStringParam(
  params: Record<string, unknown>,
  key: string,
  options: { required?: boolean; label?: string } = {},
): string | undefined {
  const raw = params[key];
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  if (options.required) {
    throw new Error(`${options.label ?? key} required`);
  }
  return undefined;
}

export function readBooleanParam(params: Record<string, unknown>, key: string) {
  return params[key] === true;
}

export function successEnvelope<T>(params: {
  tool: TrelloToolName;
  action: TrelloAction;
  data: T;
  startedAt: number;
  routeName?: string;
}): StructuredEnvelope<T> {
  return {
    ok: true,
    data: params.data,
    meta: {
      tool: params.tool,
      action: params.action,
      resultCode: "OK",
      latencyMs: Date.now() - params.startedAt,
      ...(params.routeName ? { routeName: params.routeName } : {}),
    },
  };
}

export function deniedEnvelope(params: {
  tool: TrelloToolName;
  action: TrelloAction;
  decision: PolicyDecision;
  startedAt: number;
}) {
  return errorEnvelope({
    tool: params.tool,
    action: params.action,
    code: "DENY_POLICY",
    message: params.decision.reason,
    routeName: params.decision.routeName,
    latencyMs: Date.now() - params.startedAt,
  });
}

export function exceptionEnvelope(params: {
  tool: TrelloToolName;
  action: TrelloAction;
  error: unknown;
  startedAt: number;
  routeName?: string;
}) {
  if (params.error instanceof TrelloClientError) {
    return errorEnvelope({
      tool: params.tool,
      action: params.action,
      code: params.error.code,
      message: params.error.message,
      details: params.error.details,
      routeName: params.routeName,
      latencyMs: Date.now() - params.startedAt,
    });
  }
  return errorEnvelope({
    tool: params.tool,
    action: params.action,
    code:
      params.error instanceof Error &&
      params.error.message.startsWith("missing Trello credential env")
        ? "CONFIG_ERROR"
        : params.error instanceof Error &&
            (params.error.message.endsWith(" required") ||
              params.error.message.startsWith("unsupported Trello "))
          ? "VALIDATION_ERROR"
          : "INTERNAL_ERROR",
    message: params.error instanceof Error ? params.error.message : String(params.error),
    routeName: params.routeName,
    latencyMs: Date.now() - params.startedAt,
  });
}

export function resolveCredentials(config: TrelloToolkitConfig, env = process.env) {
  const apiKey = env[config.apiKeyEnvVar]?.trim();
  const token = env[config.tokenEnvVar]?.trim();
  if (!apiKey || !token) {
    return {
      ok: false as const,
      missing: [...(!apiKey ? [config.apiKeyEnvVar] : []), ...(!token ? [config.tokenEnvVar] : [])],
    };
  }
  return {
    ok: true as const,
    client: createTrelloClient({
      apiKey,
      token,
      timeoutMs: config.timeoutMs,
      maxResponseBytes: config.maxResponseBytes,
    }),
  };
}
