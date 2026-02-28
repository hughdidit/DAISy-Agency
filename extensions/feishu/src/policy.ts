<<<<<<< HEAD
import type { ChannelGroupContext, GroupToolPolicyConfig } from "openclaw/plugin-sdk";
import type { FeishuConfig, FeishuGroupConfig } from "./types.js";

export type FeishuAllowlistMatch = {
  allowed: boolean;
  matchKey?: string;
  matchSource?: "wildcard" | "id" | "name";
};
=======
import type {
  AllowlistMatch,
  ChannelGroupContext,
  GroupToolPolicyConfig,
} from "openclaw/plugin-sdk";
import { normalizeFeishuTarget } from "./targets.js";
import type { FeishuConfig, FeishuGroupConfig } from "./types.js";

export type FeishuAllowlistMatch = AllowlistMatch<"wildcard" | "id">;

function normalizeFeishuAllowEntry(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "*") {
    return "*";
  }
  const withoutProviderPrefix = trimmed.replace(/^feishu:/i, "");
  const normalized = normalizeFeishuTarget(withoutProviderPrefix) ?? withoutProviderPrefix;
  return normalized.trim().toLowerCase();
}
>>>>>>> 4ed87a667 (fix(feishu): enforce id-only allowlist matching)

export function resolveFeishuAllowlistMatch(params: {
  allowFrom: Array<string | number>;
  senderId: string;
  senderIds?: Array<string | null | undefined>;
  senderName?: string | null;
}): FeishuAllowlistMatch {
  const allowFrom = params.allowFrom
<<<<<<< HEAD
    .map((entry) => String(entry).trim().toLowerCase())
    .filter(Boolean);

=======
    .map((entry) => normalizeFeishuAllowEntry(String(entry)))
    .filter(Boolean);
>>>>>>> 4ed87a667 (fix(feishu): enforce id-only allowlist matching)
  if (allowFrom.length === 0) {
    return { allowed: false };
  }
  if (allowFrom.includes("*")) {
    return { allowed: true, matchKey: "*", matchSource: "wildcard" };
  }

<<<<<<< HEAD
  const senderId = params.senderId.toLowerCase();
  if (allowFrom.includes(senderId)) {
    return { allowed: true, matchKey: senderId, matchSource: "id" };
  }

  const senderName = params.senderName?.toLowerCase();
  if (senderName && allowFrom.includes(senderName)) {
    return { allowed: true, matchKey: senderName, matchSource: "name" };
=======
  // Feishu allowlists are ID-based; mutable display names must never grant access.
  const senderCandidates = [params.senderId, ...(params.senderIds ?? [])]
    .map((entry) => normalizeFeishuAllowEntry(String(entry ?? "")))
    .filter(Boolean);

  for (const senderId of senderCandidates) {
    if (allowFrom.includes(senderId)) {
      return { allowed: true, matchKey: senderId, matchSource: "id" };
    }
>>>>>>> 4ed87a667 (fix(feishu): enforce id-only allowlist matching)
  }

  return { allowed: false };
}

export function resolveFeishuGroupConfig(params: {
  cfg?: FeishuConfig;
  groupId?: string | null;
}): FeishuGroupConfig | undefined {
  const groups = params.cfg?.groups ?? {};
  const wildcard = groups["*"];
  const groupId = params.groupId?.trim();
  if (!groupId) {
    return undefined;
  }

  const direct = groups[groupId];
  if (direct) {
    return direct;
  }

  const lowered = groupId.toLowerCase();
  const matchKey = Object.keys(groups).find((key) => key.toLowerCase() === lowered);
  if (matchKey) {
    return groups[matchKey];
  }
  return wildcard;
}

export function resolveFeishuGroupToolPolicy(
  params: ChannelGroupContext,
): GroupToolPolicyConfig | undefined {
  const cfg = params.cfg.channels?.feishu as FeishuConfig | undefined;
  if (!cfg) {
    return undefined;
  }

  const groupConfig = resolveFeishuGroupConfig({
    cfg,
    groupId: params.groupId,
  });

  return groupConfig?.tools;
}

export function isFeishuGroupAllowed(params: {
  groupPolicy: "open" | "allowlist" | "disabled";
  allowFrom: Array<string | number>;
  senderId: string;
  senderIds?: Array<string | null | undefined>;
  senderName?: string | null;
}): boolean {
  const { groupPolicy } = params;
  if (groupPolicy === "disabled") {
    return false;
  }
  if (groupPolicy === "open") {
    return true;
  }
  return resolveFeishuAllowlistMatch(params).allowed;
}

export function resolveFeishuReplyPolicy(params: {
  isDirectMessage: boolean;
  globalConfig?: FeishuConfig;
  groupConfig?: FeishuGroupConfig;
}): { requireMention: boolean } {
  if (params.isDirectMessage) {
    return { requireMention: false };
  }

  const requireMention =
    params.groupConfig?.requireMention ?? params.globalConfig?.requireMention ?? true;

  return { requireMention };
}
