<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { normalizeChatChannelId } from "../channels/registry.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
=======
=======
>>>>>>> ed11e93cf (chore(format))
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import type { AgentBinding } from "../config/types.agents.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { normalizeChatChannelId } from "../channels/registry.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { OpenClawConfig } from "../config/config.js";
import type { AgentBinding } from "../config/types.agents.js";
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { normalizeChatChannelId } from "../channels/registry.js";
import { normalizeAccountId, normalizeAgentId } from "./session-key.js";

function normalizeBindingChannelId(raw?: string | null): string | null {
  const normalized = normalizeChatChannelId(raw);
  if (normalized) {
    return normalized;
  }
  const fallback = (raw ?? "").trim().toLowerCase();
  return fallback || null;
}

export function listBindings(cfg: MoltbotConfig): AgentBinding[] {
  return Array.isArray(cfg.bindings) ? cfg.bindings : [];
}

<<<<<<< HEAD
export function listBoundAccountIds(cfg: MoltbotConfig, channelId: string): string[] {
=======
function resolveNormalizedBindingMatch(binding: AgentBinding): {
  agentId: string;
  accountId: string;
  channelId: string;
} | null {
  if (!binding || typeof binding !== "object") {
    return null;
  }
  const match = binding.match;
  if (!match || typeof match !== "object") {
    return null;
  }
  const channelId = normalizeBindingChannelId(match.channel);
  if (!channelId) {
    return null;
  }
  const accountId = typeof match.accountId === "string" ? match.accountId.trim() : "";
  if (!accountId || accountId === "*") {
    return null;
  }
  return {
    agentId: normalizeAgentId(binding.agentId),
    accountId: normalizeAccountId(accountId),
    channelId,
  };
}

export function listBoundAccountIds(cfg: OpenClawConfig, channelId: string): string[] {
>>>>>>> 8da99247f (refactor(routing): dedupe binding match parsing)
  const normalizedChannel = normalizeBindingChannelId(channelId);
  if (!normalizedChannel) {
    return [];
  }
  const ids = new Set<string>();
  for (const binding of listBindings(cfg)) {
    const resolved = resolveNormalizedBindingMatch(binding);
    if (!resolved || resolved.channelId !== normalizedChannel) {
      continue;
    }
    ids.add(resolved.accountId);
  }
  return Array.from(ids).toSorted((a, b) => a.localeCompare(b));
}

export function resolveDefaultAgentBoundAccountId(
  cfg: MoltbotConfig,
  channelId: string,
): string | null {
  const normalizedChannel = normalizeBindingChannelId(channelId);
  if (!normalizedChannel) {
    return null;
  }
  const defaultAgentId = normalizeAgentId(resolveDefaultAgentId(cfg));
  for (const binding of listBindings(cfg)) {
    const resolved = resolveNormalizedBindingMatch(binding);
    if (
      !resolved ||
      resolved.channelId !== normalizedChannel ||
      resolved.agentId !== defaultAgentId
    ) {
      continue;
    }
    return resolved.accountId;
  }
  return null;
}

export function buildChannelAccountBindings(cfg: MoltbotConfig) {
  const map = new Map<string, Map<string, string[]>>();
  for (const binding of listBindings(cfg)) {
    const resolved = resolveNormalizedBindingMatch(binding);
    if (!resolved) {
      continue;
    }
    const byAgent = map.get(resolved.channelId) ?? new Map<string, string[]>();
    const list = byAgent.get(resolved.agentId) ?? [];
    if (!list.includes(resolved.accountId)) {
      list.push(resolved.accountId);
    }
    byAgent.set(resolved.agentId, list);
    map.set(resolved.channelId, byAgent);
  }
  return map;
}

export function resolvePreferredAccountId(params: {
  accountIds: string[];
  defaultAccountId: string;
  boundAccounts: string[];
}): string {
  if (params.boundAccounts.length > 0) {
    return params.boundAccounts[0];
  }
  return params.defaultAccountId;
}
