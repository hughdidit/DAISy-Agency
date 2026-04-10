import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import { resolveConfig } from "../../../extensions/gws-toolkit-phase1/src/config.js";
import { resolveCredentialRoute } from "../../../extensions/gws-toolkit-phase1/src/credential-routing.js";

const GWS_PLUGIN_ID = "gws-toolkit-phase1";

export type SandboxGwsCredentialProjection = {
  bindingSubject: string;
  routeName: string;
  credentialsFile: string;
  approvedCredentialDir: string;
  sourceContainerDir: string;
  targetContainerDir: string;
};

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

function findNarrowestApprovedCredentialDir(
  approvedDirs: readonly string[],
  credentialsFile: string,
): string | null {
  return approvedDirs
    .map((entry) => normalizePosixPath(entry))
    .filter((entry): entry is string => Boolean(entry))
    .filter((entry) => isPathInsidePosix(entry, credentialsFile))
    .sort((left, right) => right.length - left.length)[0] ?? null;
}

export function resolveSandboxGwsCredentialProjection(params: {
  config?: OpenClawConfig;
  agentId?: string;
  sessionKey: string;
}): SandboxGwsCredentialProjection | null {
  const pluginEntries = params.config?.plugins?.entries as
    | Record<string, { enabled?: boolean; config?: unknown }>
    | undefined;
  const pluginEntry = pluginEntries?.[GWS_PLUGIN_ID];
  if (!pluginEntry || pluginEntry.enabled === false) {
    return null;
  }

  const resolvedConfig = resolveConfig(pluginEntry.config);
  if (!resolvedConfig.ok) {
    return null;
  }

  let routeResolution;
  try {
    routeResolution = resolveCredentialRoute(resolvedConfig.value.config, {
      agentId: params.agentId,
      sessionKey: params.sessionKey,
    });
  } catch {
    return null;
  }

  if (routeResolution.route.mode !== "credentials_file") {
    return null;
  }

  const credentialsFile = normalizePosixPath(routeResolution.route.credentialsFile);
  if (!credentialsFile) {
    return null;
  }

  const approvedCredentialDir = findNarrowestApprovedCredentialDir(
    resolvedConfig.value.config.approvedCredentialDirs,
    credentialsFile,
  );
  if (!approvedCredentialDir) {
    return null;
  }

  const credentialDir = path.posix.dirname(credentialsFile);
  return {
    bindingSubject: routeResolution.bindingSubject,
    routeName: routeResolution.route.name,
    credentialsFile,
    approvedCredentialDir,
    sourceContainerDir: credentialDir,
    targetContainerDir: credentialDir,
  };
}
