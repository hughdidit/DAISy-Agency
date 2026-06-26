import {
  listAgentEntries,
  resolveAgentDir,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
} from "../agents/agent-scope.js";
import type { AgentIdentityFile } from "../agents/identity-file.js";
import {
  identityHasValues,
  loadAgentIdentityFromWorkspace,
  parseIdentityMarkdown as parseIdentityMarkdownFile,
} from "../agents/identity-file.js";
import type { OpenClawConfig } from "../config/config.js";
import { normalizeAgentId } from "../routing/session-key.js";

export type AgentSummary = {
  id: string;
  name?: string;
  identityName?: string;
  identityEmoji?: string;
  identitySource?: "identity" | "config";
  googleWorkspaceEmail?: string;
  workspace: string;
  agentDir: string;
  model?: string;
  bindings: number;
  bindingDetails?: string[];
  routes?: string[];
  providers?: string[];
  isDefault: boolean;
};

type AgentEntry = NonNullable<NonNullable<OpenClawConfig["agents"]>["list"]>[number];

export type AgentIdentity = AgentIdentityFile;
export { listAgentEntries };

export function findAgentEntryIndex(list: AgentEntry[], agentId: string): number {
  const id = normalizeAgentId(agentId);
  return list.findIndex((entry) => normalizeAgentId(entry.id) === id);
}

function resolveAgentName(cfg: OpenClawConfig, agentId: string) {
  const entry = listAgentEntries(cfg).find(
    (agent) => normalizeAgentId(agent.id) === normalizeAgentId(agentId),
  );
  return entry?.name?.trim() || undefined;
}

function resolveAgentModel(cfg: OpenClawConfig, agentId: string) {
  const entry = listAgentEntries(cfg).find(
    (agent) => normalizeAgentId(agent.id) === normalizeAgentId(agentId),
  );
  if (entry?.model) {
    if (typeof entry.model === "string" && entry.model.trim()) {
      return entry.model.trim();
    }
    if (typeof entry.model === "object") {
      const primary = entry.model.primary?.trim();
      if (primary) {
        return primary;
      }
    }
  }
  const raw = cfg.agents?.defaults?.model;
  if (typeof raw === "string") {
    return raw;
  }
  return raw?.primary?.trim() || undefined;
}

export function parseIdentityMarkdown(content: string): AgentIdentity {
  return parseIdentityMarkdownFile(content);
}

export function loadAgentIdentity(workspace: string): AgentIdentity | null {
  const parsed = loadAgentIdentityFromWorkspace(workspace);
  if (!parsed) {
    return null;
  }
  return identityHasValues(parsed) ? parsed : null;
}

export function buildAgentSummaries(cfg: OpenClawConfig): AgentSummary[] {
  const defaultAgentId = normalizeAgentId(resolveDefaultAgentId(cfg));
  const configuredAgents = listAgentEntries(cfg);
  const orderedIds =
    configuredAgents.length > 0
      ? configuredAgents.map((agent) => normalizeAgentId(agent.id))
      : [defaultAgentId];
  const bindingCounts = new Map<string, number>();
  for (const binding of cfg.bindings ?? []) {
    const agentId = normalizeAgentId(binding.agentId);
    bindingCounts.set(agentId, (bindingCounts.get(agentId) ?? 0) + 1);
  }

  const ordered = orderedIds.filter((id, index) => orderedIds.indexOf(id) === index);

  return ordered.map((id) => {
    const workspace = resolveAgentWorkspaceDir(cfg, id);
    const identity = loadAgentIdentity(workspace);
    const configIdentity = configuredAgents.find(
      (agent) => normalizeAgentId(agent.id) === id,
    )?.identity;
    const identityName = identity?.name ?? configIdentity?.name?.trim();
    const identityEmoji = identity?.emoji ?? configIdentity?.emoji?.trim();
    const identitySource = identity
      ? "identity"
      : configIdentity && (identityName || identityEmoji)
        ? "config"
        : undefined;
    const googleWorkspaceEmail = configuredAgents
      .find((agent) => normalizeAgentId(agent.id) === id)
      ?.googleWorkspace?.email?.trim();
    return {
      id,
      name: resolveAgentName(cfg, id),
      identityName,
      identityEmoji,
      identitySource,
      ...(googleWorkspaceEmail ? { googleWorkspaceEmail } : {}),
      workspace,
      agentDir: resolveAgentDir(cfg, id),
      model: resolveAgentModel(cfg, id),
      bindings: bindingCounts.get(id) ?? 0,
      isDefault: id === defaultAgentId,
    };
  });
}

export function applyAgentConfig(
  cfg: OpenClawConfig,
  params: {
    agentId: string;
    name?: string;
    workspace?: string;
    agentDir?: string;
    model?: string;
    delegate?: AgentEntry["delegate"];
    googleWorkspace?: AgentEntry["googleWorkspace"];
    identity?: AgentEntry["identity"];
    subagents?: AgentEntry["subagents"];
    sandbox?: AgentEntry["sandbox"];
    tools?: AgentEntry["tools"];
  },
): OpenClawConfig {
  const agentId = normalizeAgentId(params.agentId);
  const name = params.name?.trim();
  const list = listAgentEntries(cfg);
  const index = findAgentEntryIndex(list, agentId);
  const base = index >= 0 ? list[index] : { id: agentId };
  const nextEntry: AgentEntry = {
    ...base,
    ...(name ? { name } : {}),
    ...(params.workspace ? { workspace: params.workspace } : {}),
    ...(params.agentDir ? { agentDir: params.agentDir } : {}),
    ...(params.model ? { model: params.model } : {}),
    ...(params.delegate ? { delegate: params.delegate } : {}),
    ...(params.googleWorkspace ? { googleWorkspace: params.googleWorkspace } : {}),
    ...(params.identity ? { identity: params.identity } : {}),
    ...(params.subagents ? { subagents: params.subagents } : {}),
    ...(params.sandbox ? { sandbox: params.sandbox } : {}),
    ...(params.tools ? { tools: params.tools } : {}),
  };
  const nextList = [...list];
  if (index >= 0) {
    nextList[index] = nextEntry;
  } else {
    if (nextList.length === 0 && agentId !== normalizeAgentId(resolveDefaultAgentId(cfg))) {
      nextList.push({ id: resolveDefaultAgentId(cfg) });
    }
    nextList.push(nextEntry);
  }
  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      list: nextList,
    },
  };
}

export function pruneAgentConfig(
  cfg: OpenClawConfig,
  agentId: string,
): {
  config: OpenClawConfig;
  removedBindings: number;
  removedAllow: number;
  removedCredentialBindings: number;
  removedDiscordAccounts: number;
} {
  const id = normalizeAgentId(agentId);
  const agents = listAgentEntries(cfg);
  const nextAgentsList = agents.filter((entry) => normalizeAgentId(entry.id) !== id);
  const nextAgents = nextAgentsList.length > 0 ? nextAgentsList : undefined;

  const bindings = cfg.bindings ?? [];
  const filteredBindings = bindings.filter((binding) => normalizeAgentId(binding.agentId) !== id);

  const allow = cfg.tools?.agentToAgent?.allow ?? [];
  const filteredAllow = allow.filter((entry) => {
    const raw = String(entry).trim().toLowerCase();
    return normalizeAgentId(raw) !== id && raw !== `agent:${id}` && raw !== `subagent:${id}`;
  });

  const gwsSubjectsToRemove = new Set([`agent:${id}`, `subagent:${id}`]);
  let removedCredentialBindings = 0;
  let pluginEntriesChanged = false;
  const nextPluginEntries = cfg.plugins?.entries
    ? Object.fromEntries(
        Object.entries(cfg.plugins.entries).map(([pluginId, entry]) => {
          const rawConfig = entry.config;
          const rawBindings =
            rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig)
              ? (rawConfig.agentCredentialBindings as unknown)
              : undefined;
          if (!rawBindings || typeof rawBindings !== "object" || Array.isArray(rawBindings)) {
            return [pluginId, entry];
          }
          const nextBindings = { ...(rawBindings as Record<string, unknown>) };
          for (const subject of gwsSubjectsToRemove) {
            if (Object.hasOwn(nextBindings, subject)) {
              delete nextBindings[subject];
              removedCredentialBindings += 1;
              pluginEntriesChanged = true;
            }
          }
          if (Object.keys(nextBindings).length === Object.keys(rawBindings).length) {
            return [pluginId, entry];
          }
          return [
            pluginId,
            {
              ...entry,
              config: {
                ...rawConfig,
                agentCredentialBindings:
                  Object.keys(nextBindings).length > 0 ? nextBindings : undefined,
              },
            },
          ];
        }),
      )
    : cfg.plugins?.entries;

  let removedDiscordAccounts = 0;
  const discordAccounts = cfg.channels?.discord?.accounts;
  const nextDiscordAccounts = discordAccounts ? { ...discordAccounts } : undefined;
  if (nextDiscordAccounts && Object.hasOwn(nextDiscordAccounts, id)) {
    delete nextDiscordAccounts[id];
    removedDiscordAccounts = 1;
  }

  const nextAgentsConfig = cfg.agents
    ? { ...cfg.agents, list: nextAgents }
    : nextAgents
      ? { list: nextAgents }
      : undefined;
  const nextTools = cfg.tools?.agentToAgent
    ? {
        ...cfg.tools,
        agentToAgent: {
          ...cfg.tools.agentToAgent,
          allow: filteredAllow.length > 0 ? filteredAllow : undefined,
        },
      }
    : cfg.tools;
  const nextPlugins =
    cfg.plugins && pluginEntriesChanged
      ? {
          ...cfg.plugins,
          entries: nextPluginEntries,
        }
      : cfg.plugins;
  const nextChannels =
    cfg.channels && nextDiscordAccounts !== discordAccounts
      ? {
          ...cfg.channels,
          discord: {
            ...cfg.channels.discord,
            accounts:
              Object.keys(nextDiscordAccounts ?? {}).length > 0 ? nextDiscordAccounts : undefined,
          },
        }
      : cfg.channels;

  return {
    config: {
      ...cfg,
      agents: nextAgentsConfig,
      bindings: filteredBindings.length > 0 ? filteredBindings : undefined,
      tools: nextTools,
      plugins: nextPlugins,
      channels: nextChannels,
    },
    removedBindings: bindings.length - filteredBindings.length,
    removedAllow: allow.length - filteredAllow.length,
    removedCredentialBindings,
    removedDiscordAccounts,
  };
}
