<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { OpenClawConfig } from "../config/config.js";
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { ChatType } from "../channels/chat-type.js";
import { normalizeChatType } from "../channels/chat-type.js";
>>>>>>> 223eee0a2 (refactor: unify peer kind to ChatType, rename dm to direct (#11881))
import type { OpenClawConfig } from "../config/config.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { ChatType } from "../channels/chat-type.js";
import type { OpenClawConfig } from "../config/config.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { ChatType } from "../channels/chat-type.js";
import { normalizeChatType } from "../channels/chat-type.js";
import type { OpenClawConfig } from "../config/config.js";
import { shouldLogVerbose } from "../globals.js";
import { logDebug } from "../logger.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { listBindings } from "./bindings.js";
import {
  buildAgentMainSessionKey,
  buildAgentPeerSessionKey,
  DEFAULT_ACCOUNT_ID,
  DEFAULT_MAIN_KEY,
  normalizeAccountId,
  normalizeAgentId,
  sanitizeAgentId,
} from "./session-key.js";

/** @deprecated Use ChatType from channels/chat-type.js */
export type RoutePeerKind = ChatType;

export type RoutePeer = {
  kind: ChatType;
  id: string;
};

export type ResolveAgentRouteInput = {
  cfg: OpenClawConfig;
  channel: string;
  accountId?: string | null;
  peer?: RoutePeer | null;
  /** Parent peer for threads — used for binding inheritance when peer doesn't match directly. */
  parentPeer?: RoutePeer | null;
  guildId?: string | null;
  teamId?: string | null;
};

export type ResolvedAgentRoute = {
  agentId: string;
  channel: string;
  accountId: string;
  /** Internal session key used for persistence + concurrency. */
  sessionKey: string;
  /** Convenience alias for direct-chat collapse. */
  mainSessionKey: string;
  /** Match description for debugging/logging. */
  matchedBy:
    | "binding.peer"
    | "binding.peer.parent"
    | "binding.guild+roles"
    | "binding.guild"
    | "binding.team"
    | "binding.account"
    | "binding.channel"
    | "default";
};

export { DEFAULT_ACCOUNT_ID, DEFAULT_AGENT_ID } from "./session-key.js";

function normalizeToken(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeId(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value).trim();
  }
  return "";
}

function matchesAccountId(match: string | undefined, actual: string): boolean {
  const trimmed = (match ?? "").trim();
  if (!trimmed) return actual === DEFAULT_ACCOUNT_ID;
  if (trimmed === "*") return true;
  return trimmed === actual;
}

export function buildAgentSessionKey(params: {
  agentId: string;
  channel: string;
  accountId?: string | null;
  peer?: RoutePeer | null;
  /** DM session scope. */
  dmScope?: "main" | "per-peer" | "per-channel-peer" | "per-account-channel-peer";
  identityLinks?: Record<string, string[]>;
}): string {
  const channel = normalizeToken(params.channel) || "unknown";
  const peer = params.peer;
  return buildAgentPeerSessionKey({
    agentId: params.agentId,
    mainKey: DEFAULT_MAIN_KEY,
    channel,
    accountId: params.accountId,
    peerKind: peer?.kind ?? "direct",
    peerId: peer ? normalizeId(peer.id) || "unknown" : null,
    dmScope: params.dmScope,
    identityLinks: params.identityLinks,
  });
}

function listAgents(cfg: OpenClawConfig) {
  const agents = cfg.agents?.list;
  return Array.isArray(agents) ? agents : [];
}

function pickFirstExistingAgentId(cfg: OpenClawConfig, agentId: string): string {
  const trimmed = (agentId ?? "").trim();
  if (!trimmed) return sanitizeAgentId(resolveDefaultAgentId(cfg));
  const normalized = normalizeAgentId(trimmed);
  const agents = listAgents(cfg);
  if (agents.length === 0) return sanitizeAgentId(trimmed);
  const match = agents.find((agent) => normalizeAgentId(agent.id) === normalized);
  if (match?.id?.trim()) return sanitizeAgentId(match.id.trim());
  return sanitizeAgentId(resolveDefaultAgentId(cfg));
}

function matchesChannel(
  match: { channel?: string | undefined } | undefined,
  channel: string,
): boolean {
  const key = normalizeToken(match?.channel);
  if (!key) return false;
  return key === channel;
}

function matchesPeer(
  match: { peer?: { kind?: string; id?: string } | undefined } | undefined,
  peer: RoutePeer,
): boolean {
  const m = match?.peer;
  if (!m) {
    return false;
  }
  // Backward compat: normalize "dm" to "direct" in config match rules
  const kind = normalizeChatType(m.kind);
  const id = normalizeId(m.id);
  if (!kind || !id) return false;
  return kind === peer.kind && id === peer.id;
}

<<<<<<< HEAD
function matchesGuild(
  match: { guildId?: string | undefined } | undefined,
  guildId: string,
): boolean {
  const id = normalizeId(match?.guildId);
  if (!id) return false;
  return id === guildId;
}

function matchesTeam(match: { teamId?: string | undefined } | undefined, teamId: string): boolean {
  const id = normalizeId(match?.teamId);
  if (!id) return false;
  return id === teamId;

type EvaluatedBinding = {
  binding: ReturnType<typeof listBindings>[number];
  match: NormalizedBindingMatch;
};

type BindingScope = {
  peer: RoutePeer | null;
  guildId: string;
  teamId: string;
  memberRoleIds: Set<string>;
};

type EvaluatedBindingsCache = {
  bindingsRef: OpenClawConfig["bindings"];
  byChannelAccount: Map<string, EvaluatedBinding[]>;
};

const evaluatedBindingsCacheByCfg = new WeakMap<OpenClawConfig, EvaluatedBindingsCache>();
const MAX_EVALUATED_BINDINGS_CACHE_KEYS = 2000;

function getEvaluatedBindingsForChannelAccount(
  cfg: OpenClawConfig,
  channel: string,
  accountId: string,
): EvaluatedBinding[] {
  const bindingsRef = cfg.bindings;
  const existing = evaluatedBindingsCacheByCfg.get(cfg);
  const cache =
    existing && existing.bindingsRef === bindingsRef
      ? existing
      : { bindingsRef, byChannelAccount: new Map<string, EvaluatedBinding[]>() };
  if (cache !== existing) {
    evaluatedBindingsCacheByCfg.set(cfg, cache);
  }

  const cacheKey = `${channel}\t${accountId}`;
  const hit = cache.byChannelAccount.get(cacheKey);
  if (hit) {
    return hit;
  }

  const evaluated: EvaluatedBinding[] = listBindings(cfg).flatMap((binding) => {
    if (!binding || typeof binding !== "object") {
      return [];
    }
    if (!matchesChannel(binding.match, channel)) {
      return [];
    }
    if (!matchesAccountId(binding.match?.accountId, accountId)) {
      return [];
    }
    return [{ binding, match: normalizeBindingMatch(binding.match) }];
  });

  cache.byChannelAccount.set(cacheKey, evaluated);
  if (cache.byChannelAccount.size > MAX_EVALUATED_BINDINGS_CACHE_KEYS) {
    cache.byChannelAccount.clear();
    cache.byChannelAccount.set(cacheKey, evaluated);
  }

  return evaluated;
}

function normalizePeerConstraint(
  peer: { kind?: string; id?: string } | undefined,
): NormalizedPeerConstraint {
  if (!peer) {
    return { state: "none" };
  }
  const kind = normalizeChatType(peer.kind);
  const id = normalizeId(peer.id);
  if (!kind || !id) {
    return { state: "invalid" };
  }
  return { state: "valid", kind, id };
}

function normalizeBindingMatch(
  match:
    | {
        accountId?: string | undefined;
        peer?: { kind?: string; id?: string } | undefined;
        guildId?: string | undefined;
        teamId?: string | undefined;
        roles?: string[] | undefined;
      }
    | undefined;
  peer: RoutePeer | null;
  guildId: string;
  teamId: string;
  memberRoleIds: string[];
}): boolean {
  return (
    matchesOptionalPeer(params.match, params.peer) &&
    matchesOptionalGuild(params.match, params.guildId) &&
    matchesOptionalTeam(params.match, params.teamId) &&
    matchesOptionalRoles(params.match, params.memberRoleIds)
  );
>>>>>>> dbe026214 (fix(routing): exclude peer-specific bindings from guild-wide matching (#15274))
}

export function resolveAgentRoute(input: ResolveAgentRouteInput): ResolvedAgentRoute {
  const channel = normalizeToken(input.channel);
  const accountId = normalizeAccountId(input.accountId);
  const peer = input.peer ? { kind: input.peer.kind, id: normalizeId(input.peer.id) } : null;
  const guildId = normalizeId(input.guildId);
  const teamId = normalizeId(input.teamId);

  const bindings = listBindings(input.cfg).filter((binding) => {
    if (!binding || typeof binding !== "object") return false;
    if (!matchesChannel(binding.match, channel)) return false;
    return matchesAccountId(binding.match?.accountId, accountId);
  });
=======
  const bindings = getEvaluatedBindingsForChannelAccount(input.cfg, channel, accountId);
>>>>>>> 586176730 (perf(gateway): optimize sessions/ws/routing)

  const dmScope = input.cfg.session?.dmScope ?? "main";
  const identityLinks = input.cfg.session?.identityLinks;

  const choose = (agentId: string, matchedBy: ResolvedAgentRoute["matchedBy"]) => {
    const resolvedAgentId = pickFirstExistingAgentId(input.cfg, agentId);
    const sessionKey = buildAgentSessionKey({
      agentId: resolvedAgentId,
      channel,
      accountId,
      peer,
      dmScope,
      identityLinks,
    }).toLowerCase();
    const mainSessionKey = buildAgentMainSessionKey({
      agentId: resolvedAgentId,
      mainKey: DEFAULT_MAIN_KEY,
    }).toLowerCase();
    return {
      agentId: resolvedAgentId,
      channel,
      accountId,
      sessionKey,
      mainSessionKey,
      matchedBy,
    };
  };

  if (peer) {
<<<<<<< HEAD
    const peerMatch = bindings.find((b) => matchesPeer(b.match, peer));
    if (peerMatch) return choose(peerMatch.agentId, "binding.peer");
  }

  if (guildId && memberRoleIds.length > 0) {
    const guildRolesMatch = bindings.find(
      (b) => matchesGuild(b.match, guildId) && matchesRoles(b.match, memberRoleIds),
    );
    if (guildRolesMatch) return choose(guildRolesMatch.agentId, "binding.guild+roles");
  }

=======
>>>>>>> 2583de530 (refactor(routing): normalize binding matching and harden qmd boot-update tests)
  // Thread parent inheritance: if peer (thread) didn't match, check parent peer binding
  const parentPeer = input.parentPeer
    ? { kind: input.parentPeer.kind, id: normalizeId(input.parentPeer.id) }
    : null;
  const baseScope = {
    guildId,
    teamId,
    memberRoleIds: memberRoleIdSet,
  };

  const tiers: Array<{
    matchedBy: Exclude<ResolvedAgentRoute["matchedBy"], "default">;
    enabled: boolean;
    scopePeer: RoutePeer | null;
    predicate: (candidate: EvaluatedBinding) => boolean;
  }> = [
    {
      matchedBy: "binding.peer",
      enabled: Boolean(peer),
      scopePeer: peer,
      predicate: (candidate) => candidate.match.peer.state === "valid",
    },
    {
      matchedBy: "binding.peer.parent",
      enabled: Boolean(parentPeer && parentPeer.id),
      scopePeer: parentPeer && parentPeer.id ? parentPeer : null,
      predicate: (candidate) => candidate.match.peer.state === "valid",
    },
    {
      matchedBy: "binding.guild+roles",
      enabled: Boolean(guildId && memberRoleIds.length > 0),
      scopePeer: peer,
      predicate: (candidate) =>
        hasGuildConstraint(candidate.match) && hasRolesConstraint(candidate.match),
    },
    {
      matchedBy: "binding.guild",
      enabled: Boolean(guildId),
      scopePeer: peer,
      predicate: (candidate) =>
        hasGuildConstraint(candidate.match) && !hasRolesConstraint(candidate.match),
    },
    {
      matchedBy: "binding.team",
      enabled: Boolean(teamId),
      scopePeer: peer,
      predicate: (candidate) => hasTeamConstraint(candidate.match),
    },
    {
      matchedBy: "binding.account",
      enabled: true,
      scopePeer: peer,
      predicate: (candidate) => candidate.match.accountPattern !== "*",
    },
    {
      matchedBy: "binding.channel",
      enabled: true,
      scopePeer: peer,
      predicate: (candidate) => candidate.match.accountPattern === "*",
    },
  ];

  for (const tier of tiers) {
    if (!tier.enabled) {
      continue;
    }
    const matched = bindings.find(
      (candidate) =>
        tier.predicate(candidate) &&
        matchesBindingScope(candidate.match, {
          ...baseScope,
          peer: tier.scopePeer,
        }),
    );
    if (matched) {
      return choose(matched.binding.agentId, tier.matchedBy);
    }
  }

<<<<<<< HEAD
  if (guildId) {
    const guildMatch = bindings.find((b) => matchesGuild(b.match, guildId));
    if (guildMatch) {
      return choose(guildMatch.agentId, "binding.guild");
    }
  }

  if (teamId) {
    const teamMatch = bindings.find((b) => matchesTeam(b.match, teamId));
    if (teamMatch) return choose(teamMatch.agentId, "binding.team");
  }

  const accountMatch = bindings.find(
    (b) =>
      b.match?.accountId?.trim() !== "*" &&
      matchesBindingScope({
        match: b.match,
        peer,
        guildId,
        teamId,
        memberRoleIds,
      }),
  );
  if (accountMatch) return choose(accountMatch.agentId, "binding.account");

  const anyAccountMatch = bindings.find(
    (b) =>
      b.match?.accountId?.trim() === "*" &&
      matchesBindingScope({
        match: b.match,
        peer,
        guildId,
        teamId,
        memberRoleIds,
      }),
  );
  if (anyAccountMatch) return choose(anyAccountMatch.agentId, "binding.channel");

=======
>>>>>>> 2583de530 (refactor(routing): normalize binding matching and harden qmd boot-update tests)
  return choose(resolveDefaultAgentId(input.cfg), "default");
}
