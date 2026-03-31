import { isSubagentSessionKey } from "../../../src/routing/session-key.js";
import { PluginError } from "./errors.js";
import type {
  GwsToolkitConfig,
  InvocationContext,
  ResolvedRoute,
  RouteResolution,
} from "./types.js";

function normalizeAgentId(agentId: string | undefined): string {
  const trimmed = agentId?.trim().toLowerCase();
  return trimmed || "main";
}

export function resolveBindingSubject(ctx: InvocationContext): string {
  const agentId = normalizeAgentId(ctx.agentId);
  if (isSubagentSessionKey(ctx.sessionKey)) {
    return `subagent:${agentId}`;
  }
  return `agent:${agentId}`;
}

export function resolveCredentialRoute(
  config: GwsToolkitConfig,
  ctx: InvocationContext,
): RouteResolution {
  const bindingSubject = resolveBindingSubject(ctx);
  const boundRouteName = config.agentCredentialBindings[bindingSubject];

  if (boundRouteName) {
    const route = config.credentialRoutes[boundRouteName];
    if (!route) {
      throw new PluginError(
        "CONFIG_ERROR",
        `Credential route not found for binding ${bindingSubject}`,
        {
          bindingSubject,
          routeName: boundRouteName,
        },
      );
    }
    return {
      bindingSubject,
      route: {
        ...route,
        name: boundRouteName,
      } satisfies ResolvedRoute,
      inherited: false,
    };
  }

  if (config.allowUnboundAgents && config.defaultCredentialRoute) {
    const route = config.credentialRoutes[config.defaultCredentialRoute];
    if (!route) {
      throw new PluginError("CONFIG_ERROR", "defaultCredentialRoute is not configured correctly", {
        bindingSubject,
        routeName: config.defaultCredentialRoute,
      });
    }
    return {
      bindingSubject,
      route: {
        ...route,
        name: config.defaultCredentialRoute,
      } satisfies ResolvedRoute,
      inherited: false,
    };
  }

  throw new PluginError("DENY_POLICY", `No credential route bound for ${bindingSubject}`, {
    bindingSubject,
  });
}

export function summarizeCredentialRoutes(config: GwsToolkitConfig) {
  return Object.entries(config.credentialRoutes).map(([name, route]) => ({
    name,
    mode: route.mode,
    label: route.label,
    allowedServices: route.allowedServices,
    allowedTools: route.allowedTools,
    allowedActions: route.allowedActions ?? [],
  }));
}
