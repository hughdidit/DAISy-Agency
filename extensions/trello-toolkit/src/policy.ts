import type {
  PolicyDecision,
  ResolvedRoute,
  TrelloAction,
  TrelloToolkitConfig,
  TrelloToolName,
} from "./types.js";

export function resolveSubject(agentId: string | undefined): string {
  const normalized = agentId?.trim();
  return normalized ? `agent:${normalized}` : "agent:cli";
}

function resolveRoute(params: { config: TrelloToolkitConfig; subject: string }): ResolvedRoute | null {
  const explicitRouteName = params.config.agentRouteBindings[params.subject];
  const fallbackRouteName =
    explicitRouteName ??
    (params.config.allowUnboundAgents && params.config.defaultRoute ? params.config.defaultRoute : undefined);
  if (!fallbackRouteName) {
    return null;
  }
  const route = params.config.routes[fallbackRouteName];
  return route ? { ...route, name: fallbackRouteName } : null;
}

function isAllowedByOptionalList(allowed: string[], value: string | undefined): boolean {
  return allowed.length === 0 || value === undefined || allowed.includes(value);
}

export function evaluatePolicy(params: {
  config: TrelloToolkitConfig;
  subject: string;
  tool: TrelloToolName;
  action: TrelloAction;
  isWrite?: boolean;
  confirm?: boolean;
  boardId?: string;
  listId?: string;
}): PolicyDecision {
  if (params.isWrite && !params.config.allowWriteOperations) {
    return { allowed: false, reason: "write operations disabled by config" };
  }
  if (params.isWrite && params.confirm !== true) {
    return { allowed: false, reason: "write operations require confirm=true" };
  }
  const route = resolveRoute({ config: params.config, subject: params.subject });
  if (!route) {
    return { allowed: false, reason: `no Trello route bound for ${params.subject}` };
  }
  if (!route.allowedTools.includes(params.tool)) {
    return {
      allowed: false,
      reason: `route ${route.name} does not allow ${params.tool}`,
      routeName: route.name,
    };
  }
  if (!route.allowedActions.includes(params.action)) {
    return {
      allowed: false,
      reason: `route ${route.name} does not allow ${params.action}`,
      routeName: route.name,
    };
  }
  if (!isAllowedByOptionalList(route.allowedBoardIds, params.boardId)) {
    return {
      allowed: false,
      reason: `route ${route.name} does not allow board ${params.boardId ?? "unknown"}`,
      routeName: route.name,
    };
  }
  if (!isAllowedByOptionalList(route.allowedListIds, params.listId)) {
    return {
      allowed: false,
      reason: `route ${route.name} does not allow list ${params.listId ?? "unknown"}`,
      routeName: route.name,
    };
  }
  return { allowed: true, routeName: route.name, route };
}
