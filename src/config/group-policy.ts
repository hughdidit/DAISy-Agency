import type { ChannelId } from "../channels/plugins/types.js";
import { normalizeAccountId } from "../routing/session-key.js";
import type { OpenClawConfig } from "./config.js";
import {
  parseToolsBySenderTypedKey,
  type GroupToolPolicyBySenderConfig,
  type GroupToolPolicyConfig,
  type ToolsBySenderKeyType,
} from "./types.tools.js";

export type GroupPolicyChannel = ChannelId;

export type ChannelGroupConfig = {
  requireMention?: boolean;
  tools?: GroupToolPolicyConfig;
  toolsBySender?: GroupToolPolicyBySenderConfig;
};

export type ChannelGroupPolicy = {
  allowlistEnabled: boolean;
  allowed: boolean;
  groupConfig?: ChannelGroupConfig;
  defaultConfig?: ChannelGroupConfig;
};

type ChannelGroups = Record<string, ChannelGroupConfig>;

export type GroupToolPolicySender = {
  senderId?: string | null;
  senderName?: string | null;
  senderUsername?: string | null;
  senderE164?: string | null;
};

<<<<<<< HEAD
function normalizeSenderKey(value: string): string {
=======
type SenderKeyType = "id" | "e164" | "username" | "name";
type CompiledSenderPolicy = {
  buckets: SenderPolicyBuckets;
  wildcard?: GroupToolPolicyConfig;
};

const warnedLegacyToolsBySenderKeys = new Set<string>();
const compiledToolsBySenderCache = new WeakMap<
  GroupToolPolicyBySenderConfig,
  CompiledSenderPolicy
>();

type ParsedSenderPolicyKey =
  | { kind: "wildcard" }
  | { kind: "typed"; type: SenderKeyType; key: string };

type SenderPolicyBuckets = Record<ToolsBySenderKeyType, Map<string, GroupToolPolicyConfig>>;

function normalizeSenderKey(
  value: string,
  options: {
    stripLeadingAt?: boolean;
  } = {},
): string {
>>>>>>> 3f64d4ad7 (refactor(config): compile toolsBySender policy and migrate legacy keys)
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return withoutAt.toLowerCase();
}

<<<<<<< HEAD
export function resolveToolsBySender(
  params: {
    toolsBySender?: GroupToolPolicyBySenderConfig;
  } & GroupToolPolicySender,
): GroupToolPolicyConfig | undefined {
  const toolsBySender = params.toolsBySender;
  if (!toolsBySender) {
    return undefined;
  }
=======
function normalizeTypedSenderKey(value: string, type: SenderKeyType): string {
  return normalizeSenderKey(value, {
    stripLeadingAt: type === "username",
  });
}

function normalizeLegacySenderKey(value: string): string {
  return normalizeSenderKey(value, {
    stripLeadingAt: true,
  });
}

function warnLegacyToolsBySenderKey(rawKey: string) {
  const trimmed = rawKey.trim();
  if (!trimmed || warnedLegacyToolsBySenderKeys.has(trimmed)) {
    return;
  }
  warnedLegacyToolsBySenderKeys.add(trimmed);
  process.emitWarning(
    `toolsBySender key "${trimmed}" is deprecated. Use explicit prefixes (id:, e164:, username:, name:). Legacy unprefixed keys are matched as id only.`,
    {
      type: "DeprecationWarning",
      code: "OPENCLAW_TOOLS_BY_SENDER_UNTYPED_KEY",
    },
  );
}

function parseSenderPolicyKey(rawKey: string): ParsedSenderPolicyKey | undefined {
  const trimmed = rawKey.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed === "*") {
    return { kind: "wildcard" };
  }
  const typed = parseToolsBySenderTypedKey(trimmed);
  if (typed) {
    const key = normalizeTypedSenderKey(typed.value, typed.type);
    if (!key) {
      return undefined;
    }
    return {
      kind: "typed",
      type: typed.type,
      key,
    };
  }

  // Backward-compatible fallback: untyped keys now map to immutable sender IDs only.
  warnLegacyToolsBySenderKey(trimmed);
  const key = normalizeLegacySenderKey(trimmed);
  if (!key) {
    return undefined;
  }
  return {
    kind: "typed",
    type: "id",
    key,
  };
}

function createSenderPolicyBuckets(): SenderPolicyBuckets {
  return {
    id: new Map<string, GroupToolPolicyConfig>(),
    e164: new Map<string, GroupToolPolicyConfig>(),
    username: new Map<string, GroupToolPolicyConfig>(),
    name: new Map<string, GroupToolPolicyConfig>(),
  };
}

function compileToolsBySenderPolicy(
  toolsBySender: GroupToolPolicyBySenderConfig,
): CompiledSenderPolicy | undefined {
>>>>>>> 3f64d4ad7 (refactor(config): compile toolsBySender policy and migrate legacy keys)
  const entries = Object.entries(toolsBySender);
  if (entries.length === 0) {
    return undefined;
  }

  const normalized = new Map<string, GroupToolPolicyConfig>();
  let wildcard: GroupToolPolicyConfig | undefined;
  for (const [rawKey, policy] of entries) {
    if (!policy) {
      continue;
    }
    const key = normalizeSenderKey(rawKey);
    if (!key) {
      continue;
    }
    if (key === "*") {
      wildcard = policy;
      continue;
    }
    if (!normalized.has(key)) {
      normalized.set(key, policy);
    }
  }

<<<<<<< HEAD
  const candidates: string[] = [];
  const pushCandidate = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) {
      return;
    }
    candidates.push(trimmed);
  };
  pushCandidate(params.senderId);
  pushCandidate(params.senderE164);
  pushCandidate(params.senderUsername);
  pushCandidate(params.senderName);

  for (const candidate of candidates) {
    const key = normalizeSenderKey(candidate);
    if (!key) {
      continue;
    }
    const match = normalized.get(key);
=======
  return { buckets, wildcard };
}

function resolveCompiledToolsBySenderPolicy(
  toolsBySender: GroupToolPolicyBySenderConfig,
): CompiledSenderPolicy | undefined {
  const cached = compiledToolsBySenderCache.get(toolsBySender);
  if (cached) {
    return cached;
  }
  const compiled = compileToolsBySenderPolicy(toolsBySender);
  if (!compiled) {
    return undefined;
  }
  // Config is loaded once and treated as immutable; cache compiled sender policy by object identity.
  compiledToolsBySenderCache.set(toolsBySender, compiled);
  return compiled;
}

function normalizeCandidate(value: string | null | undefined, type: SenderKeyType): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }
  return normalizeTypedSenderKey(trimmed, type);
}

function normalizeSenderIdCandidates(value: string | null | undefined): string[] {
  const trimmed = value?.trim();
  if (!trimmed) {
    return [];
  }
  const typed = normalizeTypedSenderKey(trimmed, "id");
  const legacy = normalizeLegacySenderKey(trimmed);
  if (!typed) {
    return legacy ? [legacy] : [];
  }
  if (!legacy || legacy === typed) {
    return [typed];
  }
  return [typed, legacy];
}

function matchToolsBySenderPolicy(
  compiled: CompiledSenderPolicy,
  params: GroupToolPolicySender,
): GroupToolPolicyConfig | undefined {
  for (const senderIdCandidate of normalizeSenderIdCandidates(params.senderId)) {
    const match = compiled.buckets.id.get(senderIdCandidate);
    if (match) {
      return match;
    }
  }
  const senderE164 = normalizeCandidate(params.senderE164, "e164");
  if (senderE164) {
    const match = compiled.buckets.e164.get(senderE164);
    if (match) {
      return match;
    }
  }
  const senderUsername = normalizeCandidate(params.senderUsername, "username");
  if (senderUsername) {
    const match = compiled.buckets.username.get(senderUsername);
    if (match) {
      return match;
    }
  }
  const senderName = normalizeCandidate(params.senderName, "name");
  if (senderName) {
    const match = compiled.buckets.name.get(senderName);
>>>>>>> 3f64d4ad7 (refactor(config): compile toolsBySender policy and migrate legacy keys)
    if (match) {
      return match;
    }
  }
  return compiled.wildcard;
}

export function resolveToolsBySender(
  params: {
    toolsBySender?: GroupToolPolicyBySenderConfig;
  } & GroupToolPolicySender,
): GroupToolPolicyConfig | undefined {
  const toolsBySender = params.toolsBySender;
  if (!toolsBySender) {
    return undefined;
  }
  const compiled = resolveCompiledToolsBySenderPolicy(toolsBySender);
  if (!compiled) {
    return undefined;
  }
  return matchToolsBySenderPolicy(compiled, params);
}

function resolveChannelGroups(
  cfg: OpenClawConfig,
  channel: GroupPolicyChannel,
  accountId?: string | null,
): ChannelGroups | undefined {
  const normalizedAccountId = normalizeAccountId(accountId);
  const channelConfig = cfg.channels?.[channel] as
    | {
        accounts?: Record<string, { groups?: ChannelGroups }>;
        groups?: ChannelGroups;
      }
    | undefined;
  if (!channelConfig) {
    return undefined;
  }
  const accountGroups =
    channelConfig.accounts?.[normalizedAccountId]?.groups ??
    channelConfig.accounts?.[
      Object.keys(channelConfig.accounts ?? {}).find(
        (key) => key.toLowerCase() === normalizedAccountId.toLowerCase(),
      ) ?? ""
    ]?.groups;
  return accountGroups ?? channelConfig.groups;
}

type ChannelGroupPolicyMode = "open" | "allowlist" | "disabled";

function resolveChannelGroupPolicyMode(
  cfg: OpenClawConfig,
  channel: GroupPolicyChannel,
  accountId?: string | null,
): ChannelGroupPolicyMode | undefined {
  const normalizedAccountId = normalizeAccountId(accountId);
  const channelConfig = cfg.channels?.[channel] as
    | {
        groupPolicy?: ChannelGroupPolicyMode;
        accounts?: Record<string, { groupPolicy?: ChannelGroupPolicyMode }>;
      }
    | undefined;
  if (!channelConfig) {
    return undefined;
  }
  const accountPolicy =
    channelConfig.accounts?.[normalizedAccountId]?.groupPolicy ??
    channelConfig.accounts?.[
      Object.keys(channelConfig.accounts ?? {}).find(
        (key) => key.toLowerCase() === normalizedAccountId.toLowerCase(),
      ) ?? ""
    ]?.groupPolicy;
  return accountPolicy ?? channelConfig.groupPolicy;
}

export function resolveChannelGroupPolicy(params: {
  cfg: OpenClawConfig;
  channel: GroupPolicyChannel;
  groupId?: string | null;
  accountId?: string | null;
<<<<<<< HEAD
=======
  groupIdCaseInsensitive?: boolean;
  /** When true, sender-level filtering (groupAllowFrom) is configured upstream. */
  hasGroupAllowFrom?: boolean;
>>>>>>> c6bb7b0c0 (fix(whatsapp): groupAllowFrom sender filter bypassed when groupPolicy is allowlist (#24670))
}): ChannelGroupPolicy {
  const { cfg, channel } = params;
  const groups = resolveChannelGroups(cfg, channel, params.accountId);
  const groupPolicy = resolveChannelGroupPolicyMode(cfg, channel, params.accountId);
  const hasGroups = Boolean(groups && Object.keys(groups).length > 0);
  const allowlistEnabled = groupPolicy === "allowlist" || hasGroups;
  const normalizedId = params.groupId?.trim();
  const groupConfig = normalizedId && groups ? groups[normalizedId] : undefined;
  const defaultConfig = groups?.["*"];
  const allowAll = allowlistEnabled && Boolean(groups && Object.hasOwn(groups, "*"));
  // When groupPolicy is "allowlist" with groupAllowFrom but no explicit groups,
  // allow the group through — sender-level filtering handles access control.
  const senderFilterBypass =
    groupPolicy === "allowlist" && !hasGroups && Boolean(params.hasGroupAllowFrom);
  const allowed =
<<<<<<< HEAD
<<<<<<< HEAD
    !allowlistEnabled ||
    allowAll ||
    (normalizedId ? Boolean(groups && Object.hasOwn(groups, normalizedId)) : false);
=======
    groupPolicy === "disabled" ? false : !allowlistEnabled || allowAll || Boolean(groupConfig);
>>>>>>> 0932adf36 (fix(config): fail closed allowlist-only group policy)
=======
    groupPolicy === "disabled"
      ? false
      : !allowlistEnabled || allowAll || Boolean(groupConfig) || senderFilterBypass;
>>>>>>> c6bb7b0c0 (fix(whatsapp): groupAllowFrom sender filter bypassed when groupPolicy is allowlist (#24670))
  return {
    allowlistEnabled,
    allowed,
    groupConfig,
    defaultConfig,
  };
}

export function resolveChannelGroupRequireMention(params: {
  cfg: OpenClawConfig;
  channel: GroupPolicyChannel;
  groupId?: string | null;
  accountId?: string | null;
  requireMentionOverride?: boolean;
  overrideOrder?: "before-config" | "after-config";
}): boolean {
  const { requireMentionOverride, overrideOrder = "after-config" } = params;
  const { groupConfig, defaultConfig } = resolveChannelGroupPolicy(params);
  const configMention =
    typeof groupConfig?.requireMention === "boolean"
      ? groupConfig.requireMention
      : typeof defaultConfig?.requireMention === "boolean"
        ? defaultConfig.requireMention
        : undefined;

  if (overrideOrder === "before-config" && typeof requireMentionOverride === "boolean") {
    return requireMentionOverride;
  }
  if (typeof configMention === "boolean") {
    return configMention;
  }
  if (overrideOrder !== "before-config" && typeof requireMentionOverride === "boolean") {
    return requireMentionOverride;
  }
  return true;
}

export function resolveChannelGroupToolsPolicy(
  params: {
    cfg: OpenClawConfig;
    channel: GroupPolicyChannel;
    groupId?: string | null;
    accountId?: string | null;
  } & GroupToolPolicySender,
): GroupToolPolicyConfig | undefined {
  const { groupConfig, defaultConfig } = resolveChannelGroupPolicy(params);
  const groupSenderPolicy = resolveToolsBySender({
    toolsBySender: groupConfig?.toolsBySender,
    senderId: params.senderId,
    senderName: params.senderName,
    senderUsername: params.senderUsername,
    senderE164: params.senderE164,
  });
  if (groupSenderPolicy) {
    return groupSenderPolicy;
  }
  if (groupConfig?.tools) {
    return groupConfig.tools;
  }
  const defaultSenderPolicy = resolveToolsBySender({
    toolsBySender: defaultConfig?.toolsBySender,
    senderId: params.senderId,
    senderName: params.senderName,
    senderUsername: params.senderUsername,
    senderE164: params.senderE164,
  });
  if (defaultSenderPolicy) {
    return defaultSenderPolicy;
  }
  if (defaultConfig?.tools) {
    return defaultConfig.tools;
  }
  return undefined;
}
