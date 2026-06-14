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
  const allowedTools = normalizeStringArray(obj.allowedTools).filter(
    (value): value is TrelloToolName => VALID_TOOLS.has(value as TrelloToolName),
  );
  const allowedActions = normalizeStringArray(obj.allowedActions).filter(
    (value): value is TrelloAction => VALID_ACTIONS.has(value as TrelloAction),
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
  const raw = asObject(rawPluginConfig);
  if (rawPluginConfig !== undefined && raw === null) {
    return {
      ok: false,
      error: buildConfigError("plugin config must be an object"),
      posture: {
        pluginConfigProvided: true,
        valid: false,
        message: "plugin config must be an object",
      },
    };
  }

  const postureBase: ConfigPosture = {
    pluginConfigProvided: rawPluginConfig !== undefined,
    valid: false,
    message: rawPluginConfig === undefined ? "plugin config missing" : "plugin config invalid",
  };
  const rawConfig = raw ?? {};
  const unknownKeys = Object.keys(rawConfig).filter((key) => !ALLOWED_CONFIG_KEYS.has(key));
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

  const apiKeyEnvVar = normalizeEnvVar(rawConfig.apiKeyEnvVar, "TRELLO_API_KEY");
  if (typeof apiKeyEnvVar !== "string") {
    return {
      ok: false,
      error: buildConfigError(apiKeyEnvVar.error),
      posture: { ...postureBase, message: apiKeyEnvVar.error },
    };
  }
  const tokenEnvVar = normalizeEnvVar(rawConfig.tokenEnvVar, "TRELLO_TOKEN");
  if (typeof tokenEnvVar !== "string") {
    return {
      ok: false,
      error: buildConfigError(tokenEnvVar.error),
      posture: { ...postureBase, message: tokenEnvVar.error },
    };
  }

  const routesRaw = asObject(rawConfig.routes) ?? {};
  const routes: Record<string, TrelloRouteConfig> = {};
  for (const [routeName, routeRaw] of Object.entries(routesRaw)) {
    const route = normalizeRoute(routeName, routeRaw);
    if ("error" in route) {
      return {
        ok: false,
        error: buildConfigError(route.error),
        posture: { ...postureBase, message: route.error },
      };
    }
    routes[routeName] = route;
  }

  const agentRouteBindingsRaw = asObject(rawConfig.agentRouteBindings) ?? {};
  const agentRouteBindings = Object.fromEntries(
    Object.entries(agentRouteBindingsRaw)
      .filter(([, value]) => typeof value === "string" && value.trim())
      .map(([key, value]) => [key.trim(), String(value).trim()]),
  );

  const defaultRoute =
    typeof rawConfig.defaultRoute === "string" && rawConfig.defaultRoute.trim()
      ? rawConfig.defaultRoute.trim()
      : rawConfig.defaultRoute === null
        ? null
        : defaultConfig().defaultRoute;

  if (defaultRoute && !routes[defaultRoute]) {
    return {
      ok: false,
      error: buildConfigError(`defaultRoute ${defaultRoute} is not present in routes`),
      posture: {
        ...postureBase,
        message: `defaultRoute ${defaultRoute} is not present in routes`,
      },
    };
  }

  return {
    ok: true,
    value: {
      config: {
        apiKeyEnvVar,
        tokenEnvVar,
        timeoutMs: normalizeNumber(rawConfig.timeoutMs, 15000, 1000, 120000),
        maxResponseBytes: normalizeNumber(rawConfig.maxResponseBytes, 262144, 1024, 1048576),
        allowWriteOperations: rawConfig.allowWriteOperations === true,
        allowUnboundAgents: rawConfig.allowUnboundAgents === true,
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
