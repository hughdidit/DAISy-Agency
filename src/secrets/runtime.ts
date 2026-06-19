import { resolveOpenClawAgentDir } from "../agents/agent-paths.js";
import { listAgentIds, resolveAgentDir } from "../agents/agent-scope.js";
import type { AuthProfileStore } from "../agents/auth-profiles.js";
import {
  clearRuntimeAuthProfileStoreSnapshots,
  loadAuthProfileStoreForSecretsRuntime,
  replaceRuntimeAuthProfileStoreSnapshots,
} from "../agents/auth-profiles.js";
import {
  clearRuntimeConfigSnapshot,
  setRuntimeConfigSnapshot,
  type OpenClawConfig,
} from "../config/config.js";
import { resolveUserPath } from "../utils.js";
import {
  collectCommandSecretAssignmentsFromSnapshot,
  type CommandSecretAssignment,
} from "./command-config.js";
import { resolveSecretRefValues } from "./resolve.js";
import { collectAuthStoreAssignments } from "./runtime-auth-collectors.js";
import { collectConfigAssignments } from "./runtime-config-collectors.js";
import {
  applyResolvedAssignments,
  createResolverContext,
  type SecretResolverWarning,
} from "./runtime-shared.js";

export type { SecretResolverWarning } from "./runtime-shared.js";

export type PreparedSecretsRuntimeSnapshot = {
  sourceConfig: OpenClawConfig;
  config: OpenClawConfig;
  authStores: Array<{ agentDir: string; store: AuthProfileStore }>;
  warnings: SecretResolverWarning[];
};

let activeSnapshot: PreparedSecretsRuntimeSnapshot | null = null;

function cloneSnapshot(snapshot: PreparedSecretsRuntimeSnapshot): PreparedSecretsRuntimeSnapshot {
  return {
    sourceConfig: structuredClone(snapshot.sourceConfig),
    config: structuredClone(snapshot.config),
    authStores: snapshot.authStores.map((entry) => ({
      agentDir: entry.agentDir,
      store: structuredClone(entry.store),
    })),
    warnings: snapshot.warnings.map((warning) => ({ ...warning })),
  };
}

function collectCandidateAgentDirs(config: OpenClawConfig): string[] {
  const dirs = new Set<string>();
  dirs.add(resolveUserPath(resolveOpenClawAgentDir()));
  for (const agentId of listAgentIds(config)) {
    dirs.add(resolveUserPath(resolveAgentDir(config, agentId)));
  }
  return [...dirs];
}

export async function prepareSecretsRuntimeSnapshot(params: {
  config: OpenClawConfig;
  env?: NodeJS.ProcessEnv;
  agentDirs?: string[];
  loadAuthStore?: (agentDir?: string) => AuthProfileStore;
}): Promise<PreparedSecretsRuntimeSnapshot> {
  const collection = collectSecretsRuntimeAssignments(params);
  if (collection.context.assignments.length > 0) {
    const refs = collection.context.assignments.map((assignment) => assignment.ref);
    const resolved = await resolveSecretRefValues(refs, {
      config: collection.sourceConfig,
      env: collection.context.env,
      cache: collection.context.cache,
    });
    applyResolvedAssignments({
      assignments: collection.context.assignments,
      resolved,
    });
  }

  return {
    sourceConfig: collection.sourceConfig,
    config: collection.config,
    authStores: collection.authStores,
    warnings: collection.context.warnings,
  };
}

export function collectSecretsRuntimeAssignments(params: {
  config: OpenClawConfig;
  env?: NodeJS.ProcessEnv;
  agentDirs?: string[];
  loadAuthStore?: (agentDir?: string) => AuthProfileStore;
}): {
  sourceConfig: OpenClawConfig;
  config: OpenClawConfig;
  context: ReturnType<typeof createResolverContext>;
  authStores: Array<{ agentDir: string; store: AuthProfileStore }>;
} {
  const sourceConfig = structuredClone(params.config);
  const resolvedConfig = structuredClone(params.config);
  const context = createResolverContext({
    sourceConfig,
    env: params.env ?? process.env,
  });

  collectConfigAssignments({
    config: resolvedConfig,
    context,
  });

  const loadAuthStore = params.loadAuthStore ?? loadAuthProfileStoreForSecretsRuntime;
  const candidateDirs = params.agentDirs?.length
    ? [...new Set(params.agentDirs.map((entry) => resolveUserPath(entry)))]
    : collectCandidateAgentDirs(resolvedConfig);

  const authStores: Array<{ agentDir: string; store: AuthProfileStore }> = [];
  for (const agentDir of candidateDirs) {
    const store = structuredClone(loadAuthStore(agentDir));
    collectAuthStoreAssignments({
      store,
      context,
      agentDir,
    });
    authStores.push({ agentDir, store });
  }

  return {
    sourceConfig,
    config: resolvedConfig,
    authStores,
    context,
  };
}

export function activateSecretsRuntimeSnapshot(snapshot: PreparedSecretsRuntimeSnapshot): void {
  const next = cloneSnapshot(snapshot);
  setRuntimeConfigSnapshot(next.config, next.sourceConfig);
  replaceRuntimeAuthProfileStoreSnapshots(next.authStores);
  activeSnapshot = next;
}

export function getActiveSecretsRuntimeSnapshot(): PreparedSecretsRuntimeSnapshot | null {
  return activeSnapshot ? cloneSnapshot(activeSnapshot) : null;
}

export function resolveCommandSecretsFromActiveRuntimeSnapshot(params: {
  commandName: string;
  targetIds: ReadonlySet<string>;
}): { assignments: CommandSecretAssignment[]; diagnostics: string[]; inactiveRefPaths: string[] } {
  if (!activeSnapshot) {
    throw new Error("Secrets runtime snapshot is not active.");
  }
  if (params.targetIds.size === 0) {
    return { assignments: [], diagnostics: [], inactiveRefPaths: [] };
  }
  const inactiveRefPaths = [
    ...new Set(
      activeSnapshot.warnings
        .filter((warning) => warning.code === "SECRETS_REF_IGNORED_INACTIVE_SURFACE")
        .map((warning) => warning.path),
    ),
  ];
  const resolved = collectCommandSecretAssignmentsFromSnapshot({
    sourceConfig: activeSnapshot.sourceConfig,
    resolvedConfig: activeSnapshot.config,
    commandName: params.commandName,
    targetIds: params.targetIds,
    inactiveRefPaths: new Set(inactiveRefPaths),
  });
  return {
    assignments: resolved.assignments,
    diagnostics: resolved.diagnostics,
    inactiveRefPaths,
  };
}

export function clearSecretsRuntimeSnapshot(): void {
  activeSnapshot = null;
  clearRuntimeConfigSnapshot();
  clearRuntimeAuthProfileStoreSnapshots();
}
