import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import { isSubagentSessionKey } from "../../routing/session-key.js";

const GWS_PLUGIN_ID = "gws-toolkit-phase1";
const LEGACY_ROUTE_NAME = "legacy-default";

type RawPluginEntry = {
  enabled?: boolean;
  config?: unknown;
};

type RawCredentialsFileRoute = {
  mode: "credentials_file";
  credentialsFile: string;
};

export type SandboxGwsCredentialProjection = {
  bindingSubject: string;
  routeName: string;
  credentialsFile: string;
  approvedCredentialDir: string;
  sourceContainerDir: string;
  targetContainerDir: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizePosixPath(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.startsWith("/")) {
    return null;
  }
  const normalized = path.posix.normalize(trimmed);
  if (!normalized.startsWith("/")) {
    return null;
  }
  return normalized === "/" ? normalized : normalized.replace(/\/+$/, "");
}

function isPathInsidePosix(parent: string, target: string): boolean {
  return target === parent || target.startsWith(`${parent}/`);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .filter((entry) => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function findNarrowestApprovedCredentialDir(
  approvedDirs: readonly string[],
  credentialsFile: string,
): string | null {
  return (
    approvedDirs
      .map((entry) => normalizePosixPath(entry))
      .filter((entry): entry is string => Boolean(entry))
      .filter((entry) => isPathInsidePosix(entry, credentialsFile))
      .sort((left, right) => right.length - left.length)[0] ?? null
  );
}

function normalizeCredentialsFileRoute(raw: unknown): RawCredentialsFileRoute | null {
  const route = asObject(raw);
  if (!route || route.mode !== "credentials_file") {
    return null;
  }
  const credentialsFile =
    typeof route.credentialsFile === "string" ? normalizePosixPath(route.credentialsFile) : null;
  if (!credentialsFile) {
    return null;
  }
  return {
    mode: "credentials_file",
    credentialsFile,
  };
}

function resolveCredentialRoutes(
  rawPluginConfig: Record<string, unknown>,
): Record<string, RawCredentialsFileRoute> {
  const routes: Record<string, RawCredentialsFileRoute> = {};
  const rawRoutes = asObject(rawPluginConfig.credentialRoutes);
  if (rawRoutes) {
    for (const [routeName, routeValue] of Object.entries(rawRoutes)) {
      const normalizedRoute = normalizeCredentialsFileRoute(routeValue);
      if (normalizedRoute) {
        routes[routeName.trim()] = normalizedRoute;
      }
    }
    return routes;
  }

  const legacyCredentialsFile =
    typeof rawPluginConfig.credentialsFile === "string"
      ? normalizePosixPath(rawPluginConfig.credentialsFile)
      : null;
  if (legacyCredentialsFile) {
    routes[LEGACY_ROUTE_NAME] = {
      mode: "credentials_file",
      credentialsFile: legacyCredentialsFile,
    };
  }
  return routes;
}

function resolveDefaultCredentialRouteName(params: {
  rawPluginConfig: Record<string, unknown>;
  routes: Record<string, RawCredentialsFileRoute>;
}): string | null {
  const explicitDefault =
    typeof params.rawPluginConfig.defaultCredentialRoute === "string"
      ? params.rawPluginConfig.defaultCredentialRoute.trim()
      : null;
  if (explicitDefault) {
    return explicitDefault;
  }
  return Object.hasOwn(params.routes, LEGACY_ROUTE_NAME) ? LEGACY_ROUTE_NAME : null;
}

function resolveAllowUnboundAgents(params: {
  rawPluginConfig: Record<string, unknown>;
  routes: Record<string, RawCredentialsFileRoute>;
}): boolean {
  if (params.rawPluginConfig.allowUnboundAgents === true) {
    return true;
  }
  return (
    params.rawPluginConfig.allowUnboundAgents === undefined &&
    Object.hasOwn(params.routes, LEGACY_ROUTE_NAME)
  );
}

function resolveBindingSubject(params: {
  agentId?: string;
  sessionKey: string;
}): string {
  const agentId = params.agentId?.trim().toLowerCase() || "main";
  return isSubagentSessionKey(params.sessionKey)
    ? `subagent:${agentId}`
    : `agent:${agentId}`;
}

export function resolveSandboxGwsCredentialProjection(params: {
  config?: OpenClawConfig;
  agentId?: string;
  sessionKey: string;
}): SandboxGwsCredentialProjection | null {
  const pluginEntries = params.config?.plugins?.entries as
    | Record<string, RawPluginEntry>
    | undefined;
  const pluginEntry = pluginEntries?.[GWS_PLUGIN_ID];
  if (!pluginEntry || pluginEntry.enabled === false) {
    return null;
  }

  const rawPluginConfig = asObject(pluginEntry.config);
  if (!rawPluginConfig) {
    return null;
  }

  const routes = resolveCredentialRoutes(rawPluginConfig);
  if (Object.keys(routes).length === 0) {
    return null;
  }

  const bindingSubject = resolveBindingSubject({
    agentId: params.agentId,
    sessionKey: params.sessionKey,
  });
  const rawBindings = asObject(rawPluginConfig.agentCredentialBindings);
  const boundRouteName =
    rawBindings && typeof rawBindings[bindingSubject] === "string"
      ? rawBindings[bindingSubject].trim()
      : null;

  const routeName =
    boundRouteName ||
    (resolveAllowUnboundAgents({ rawPluginConfig, routes })
      ? resolveDefaultCredentialRouteName({ rawPluginConfig, routes })
      : null);
  if (!routeName) {
    return null;
  }

  const route = routes[routeName];
  if (!route) {
    return null;
  }

  const credentialsFile = normalizePosixPath(route.credentialsFile);
  if (!credentialsFile) {
    return null;
  }

  const approvedCredentialDir = findNarrowestApprovedCredentialDir(
    normalizeStringArray(rawPluginConfig.approvedCredentialDirs),
    credentialsFile,
  );
  if (!approvedCredentialDir) {
    return null;
  }

  const credentialDir = path.posix.dirname(credentialsFile);
  return {
    bindingSubject,
    routeName,
    credentialsFile,
    approvedCredentialDir,
    sourceContainerDir: credentialDir,
    targetContainerDir: credentialDir,
  };
}
