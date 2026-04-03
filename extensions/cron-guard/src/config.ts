import type { Static } from "@sinclair/typebox";
import { CronGuardPluginConfigSchema } from "./config-schema.js";

export type CronGuardPluginConfigInput = Static<typeof CronGuardPluginConfigSchema>;

export type CronGuardPluginConfig = {
  enabled: boolean;
  approvers: string[];
  approvalTtlMs: number;
  read: {
    redactWebhookTargets: boolean;
  };
  discord: {
    enabled: boolean;
    target: "dm" | "channel" | "both";
    cleanupAfterResolve: boolean;
    agentFilter: string[];
    sessionFilter: string[];
  };
  audit: {
    retention: {
      maxAgeMs: number;
      maxResolved: number;
    };
  };
};

export const DEFAULT_CRON_GUARD_CONFIG: CronGuardPluginConfig = {
  enabled: true,
  approvers: [],
  approvalTtlMs: 24 * 60 * 60 * 1000,
  read: {
    redactWebhookTargets: true,
  },
  discord: {
    enabled: false,
    target: "dm",
    cleanupAfterResolve: false,
    agentFilter: [],
    sessionFilter: [],
  },
  audit: {
    retention: {
      maxAgeMs: 30 * 24 * 60 * 60 * 1000,
      maxResolved: 250,
    },
  },
};

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function resolveCronGuardPluginConfig(raw: unknown): CronGuardPluginConfig {
  const input = (raw ?? {}) as Partial<CronGuardPluginConfigInput>;
  return {
    enabled: input.enabled !== false,
    approvers: normalizeStringList(input.approvers),
    approvalTtlMs:
      typeof input.approvalTtlMs === "number" && Number.isFinite(input.approvalTtlMs)
        ? Math.max(1, Math.floor(input.approvalTtlMs))
        : DEFAULT_CRON_GUARD_CONFIG.approvalTtlMs,
    read: {
      redactWebhookTargets:
        input.read?.redactWebhookTargets ?? DEFAULT_CRON_GUARD_CONFIG.read.redactWebhookTargets,
    },
    discord: {
      enabled: input.discord?.enabled === true,
      target:
        input.discord?.target === "channel" || input.discord?.target === "both"
          ? input.discord.target
          : DEFAULT_CRON_GUARD_CONFIG.discord.target,
      cleanupAfterResolve:
        input.discord?.cleanupAfterResolve ?? DEFAULT_CRON_GUARD_CONFIG.discord.cleanupAfterResolve,
      agentFilter: normalizeStringList(input.discord?.agentFilter),
      sessionFilter: normalizeStringList(input.discord?.sessionFilter),
    },
    audit: {
      retention: {
        maxAgeMs:
          typeof input.audit?.retention?.maxAgeMs === "number" &&
          Number.isFinite(input.audit.retention.maxAgeMs)
            ? Math.max(1, Math.floor(input.audit.retention.maxAgeMs))
            : DEFAULT_CRON_GUARD_CONFIG.audit.retention.maxAgeMs,
        maxResolved:
          typeof input.audit?.retention?.maxResolved === "number" &&
          Number.isFinite(input.audit.retention.maxResolved)
            ? Math.max(1, Math.floor(input.audit.retention.maxResolved))
            : DEFAULT_CRON_GUARD_CONFIG.audit.retention.maxResolved,
      },
    },
  };
}

export function buildCronGuardApproverPrincipals(params: {
  channel: string;
  senderId?: string;
  from?: string;
}): string[] {
  const out = new Set<string>();
  const channel = params.channel.trim();
  const senderId = params.senderId?.trim();
  const from = params.from?.trim();
  if (from) {
    out.add(from);
  }
  if (channel && senderId) {
    out.add(`${channel}:${senderId}`);
  }
  if (senderId) {
    out.add(senderId);
  }
  return [...out];
}

export function isCronGuardApproverAuthorized(params: {
  config: CronGuardPluginConfig;
  channel: string;
  senderId?: string;
  from?: string;
}): { ok: true; principal: string } | { ok: false } {
  const principals = buildCronGuardApproverPrincipals(params);
  for (const principal of principals) {
    if (params.config.approvers.includes(principal)) {
      return { ok: true, principal };
    }
  }
  return { ok: false };
}
