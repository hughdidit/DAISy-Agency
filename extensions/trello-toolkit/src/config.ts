import type {
  ConfigPosture,
  StructuredError,
  TrelloAction,
  TrelloRouteConfig,
  TrelloToolkitConfig,
  TrelloToolName,
} from "./types.js";

const ALLOWED_CONFIG_KEYS = new Set([
  "apiKeyEnvVar",
  "tokenEnvVar",
  "timeoutMs",
  "maxResponseBytes",
  "allowWriteOperations",
  "allowUnboundAgents",
  "defaultRoute",
  "routes",
  "agentRouteBindings",
]);

const VALID_TOOLS = new Set<TrelloToolName>(["trello_status", "trello_read", "trello_write"]);
const VALID_ACTIONS = new Set<TrelloAction>([
  "status",
  "list_boards",
  "list_lists",
  "list_cards",
  "get_card",
  "create_card",
  "move_card",
  "add_comment",
  "archive_card",
]);

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return Array.from(
    new Set(
      input
        .filter((entry) => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeNumber(input: unknown, fallback: number, min: number, max: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(input)));
}

function isValidEnvVarName(value: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/.test(value);
}

function normalizeEnvVar(input: unknown, fallback: string): string | { error: string } {
  if (input === undefined) {
    return fallback;
  }
  if (typeof input !== "string" || !input.trim()) {
    return { error: `${fallback} env var setting must be a non-empty string` };
  }
  const value = input.trim();
  if (!isValidEnvVarName(value)) {
    return { error: `invalid environment variable name: ${value}` };
  }
  return value;
}

function normalizeRoute(routeName: string, raw: unknown): TrelloRouteConfig | { error: string } {
  const obj = asObject(raw);
  if (!obj) {
    return { error: `route ${routeName} must be an object` };
  }
  const allowedTools = normalizeStringArray(obj.allowedTools).filter((value): value is TrelloToolName =>
    VALID_TOOLS.has(value as TrelloToolName),
  );
  const allowedActions = normalizeStringArray(obj.allowedActions).filter((value): value is TrelloAction =>
    VALID_ACTIONS.has(value as TrelloAction),
  );
  if (allowedTools.length === 0) {
    return { error: `route ${routeName} must allow at least one Trello tool` };
  }
  if (allowedActions.length === 0) {
    return { error: `route ${routeName} must allow at least one Trello action` };
  }
  return {
    allowedTools,
    allowedActions,
    allowedBoardIds: normalizeStringArray(obj.allowedBoardIds),
    allowedListIds: normalizeStringArray(obj.allowedListIds),
  };
}

function buildConfigError(message: string): StructuredError {
  return {
    ok: false,
    error: {
      code: "CONFIG_ERROR",
      message,
    },
    meta: {
      tool: "trello_status",
      action: "status",
      resultCode: "CONFIG_ERROR",
      latencyMs: 0,
    },
  };
}

export function defaultConfig(): TrelloToolkitConfig {
  return {
    apiKeyEnvVar: "TRELLO_API_KEY",
    tokenEnvVar: "TRELLO_TOKEN",
    timeoutMs: 15000,
    maxResponseBytes: 262144,
    allowWriteOperations: false,
    allowUnboundAgents: false,
    defaultRoute: null,
    routes: {},
    agentRouteBindings: {},
  };
}

export function resolveConfig(
  rawPluginConfig: unknown,
):
  | { ok: true; value: { config: TrelloToolkitConfig; posture: ConfigPosture } }
  | { ok: false; error: StructuredError; posture: ConfigPosture } {
  const postureBase: ConfigPosture = {
    pluginConfigProvided: rawPluginConfig !== undefined,
    valid: false,
    message: "plugin config missing",
  };
  const raw = asObject(rawPluginConfig) ?? {};
  const unknownKeys = Object.keys(raw).filter((key) => !ALLOWED_CONFIG_KEYS.has(key));
  if (unknownKeys.length > 0) {
    return {
      ok: false,
      error: buildConfigError(`Unknown plugin config keys: ${unknownKeys.join(", ")}`),
      posture: {
        ...postureBase,
        pluginConfigProvided: true,
        message: "plugin config contains unknown keys",
      },
    };
  }

  const apiKeyEnvVar = normalizeEnvVar(raw.apiKeyEnvVar, "TRELLO_API_KEY");
  if (typeof apiKeyEnvVar !== "string") {
    return { ok: false, error: buildConfigError(apiKeyEnvVar.error), posture: postureBase };
  }
  const tokenEnvVar = normalizeEnvVar(raw.tokenEnvVar, "TRELLO_TOKEN");
  if (typeof tokenEnvVar !== "string") {
    return { ok: false, error: buildConfigError(tokenEnvVar.error), posture: postureBase };
  }

  const routesRaw = asObject(raw.routes) ?? {};
  const routes: Record<string, TrelloRouteConfig> = {};
  for (const [routeName, routeRaw] of Object.entries(routesRaw)) {
    const route = normalizeRoute(routeName, routeRaw);
    if ("error" in route) {
      return { ok: false, error: buildConfigError(route.error), posture: postureBase };
    }
    routes[routeName] = route;
  }

  const agentRouteBindingsRaw = asObject(raw.agentRouteBindings) ?? {};
  const agentRouteBindings = Object.fromEntries(
    Object.entries(agentRouteBindingsRaw)
      .filter(([, value]) => typeof value === "string" && value.trim())
      .map(([key, value]) => [key.trim(), String(value).trim()]),
  );

  const defaultRoute =
    typeof raw.defaultRoute === "string" && raw.defaultRoute.trim()
      ? raw.defaultRoute.trim()
      : raw.defaultRoute === null
        ? null
        : defaultConfig().defaultRoute;

  if (defaultRoute && !routes[defaultRoute]) {
    return {
      ok: false,
      error: buildConfigError(`defaultRoute ${defaultRoute} is not present in routes`),
      posture: postureBase,
    };
  }

  return {
    ok: true,
    value: {
      config: {
        apiKeyEnvVar,
        tokenEnvVar,
        timeoutMs: normalizeNumber(raw.timeoutMs, 15000, 1000, 120000),
        maxResponseBytes: normalizeNumber(raw.maxResponseBytes, 262144, 1024, 1048576),
        allowWriteOperations: raw.allowWriteOperations === true,
        allowUnboundAgents: raw.allowUnboundAgents === true,
        defaultRoute,
        routes,
        agentRouteBindings,
      },
      posture: {
        pluginConfigProvided: rawPluginConfig !== undefined,
        valid: true,
        message: "plugin config valid",
      },
    },
  };
}
