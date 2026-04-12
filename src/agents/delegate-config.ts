import path from "node:path";
import { loadConfig, type OpenClawConfig } from "../config/config.js";
import type { AgentSandboxConfig } from "../config/types.agents-shared.js";
import type {
  AgentConfig,
  DelegateAuthIsolation,
  DelegateConfig,
  DelegateTier,
} from "../config/types.agents.js";
import type { AgentToolsConfig } from "../config/types.tools.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { listAgentIds, resolveAgentConfig, resolveAgentDir } from "./agent-scope.js";

export const DELEGATE_TIERS = ["tier1", "tier2", "tier3"] as const;
const DELEGATE_WRITE_TOOLS = [
  "gws_drive_write",
  "gws_gmail_write",
  "gws_calendar_write",
  "gws_docs_write",
  "gws_sheets_write",
] as const;
const DELEGATE_READ_TOOLS = [
  "gws_status",
  "gws_drive_read",
  "gws_gmail_read",
  "gws_calendar_read",
  "gws_docs_read",
  "gws_sheets_read",
] as const;
const DELEGATE_SESSION_TOOLS = [
  "session_status",
  "sessions_history",
  "sessions_list",
  "sessions_send",
  "sessions_spawn",
] as const;
const DELEGATE_COMMON_ALLOW = ["read", "web_fetch", "web_search"] as const;
const DELEGATE_COMMON_DENY = [
  "apply_patch",
  "browser",
  "canvas",
  "edit",
  "exec",
  "gateway",
  "nodes",
  "write",
] as const;

export type ResolvedDelegateConfig = {
  enabled: true;
  tier: DelegateTier;
  authIsolation: DelegateAuthIsolation;
  gwsRouting: {
    requireExplicitBindings: true;
  };
  cron: {
    allowed: boolean;
  };
};

function dedupe(items: readonly string[]): string[] {
  return Array.from(new Set(items));
}

function normalizeComparablePath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function buildTierAllowList(tier: DelegateTier): string[] {
  if (tier === "tier1") {
    return dedupe([
      ...DELEGATE_COMMON_ALLOW,
      ...DELEGATE_SESSION_TOOLS,
      ...DELEGATE_READ_TOOLS,
      "gws_gmail_write",
    ]);
  }
  if (tier === "tier2") {
    return dedupe([
      ...DELEGATE_COMMON_ALLOW,
      ...DELEGATE_SESSION_TOOLS,
      ...DELEGATE_READ_TOOLS,
      ...DELEGATE_WRITE_TOOLS,
    ]);
  }
  return dedupe([
    ...DELEGATE_COMMON_ALLOW,
    ...DELEGATE_SESSION_TOOLS,
    ...DELEGATE_READ_TOOLS,
    ...DELEGATE_WRITE_TOOLS,
    "cron",
  ]);
}

export function isDelegateTier(value: string | undefined | null): value is DelegateTier {
  return DELEGATE_TIERS.includes((value ?? "").trim().toLowerCase() as DelegateTier);
}

export function resolveDelegateConfig(
  cfg: OpenClawConfig,
  agentId: string,
): ResolvedDelegateConfig | null {
  const delegate = resolveAgentConfig(cfg, agentId)?.delegate;
  if (!delegate || delegate.enabled !== true) {
    return null;
  }

  const tier = isDelegateTier(delegate.tier) ? delegate.tier : "tier1";
  return {
    enabled: true,
    tier,
    authIsolation: delegate.authIsolation === "legacy" ? "legacy" : "strict",
    gwsRouting: {
      requireExplicitBindings: delegate.gwsRouting?.requireExplicitBindings !== false,
    },
    cron: {
      allowed: delegate.cron?.allowed ?? tier === "tier3",
    },
  };
}

export function isDelegateAgent(cfg: OpenClawConfig, agentId: string): boolean {
  return resolveDelegateConfig(cfg, agentId) !== null;
}

export function resolveAgentAuthIsolation(
  cfg: OpenClawConfig,
  agentId: string,
): DelegateAuthIsolation {
  const delegate = resolveDelegateConfig(cfg, agentId);
  if (!delegate) {
    return "legacy";
  }
  return delegate.authIsolation;
}

export function resolveAgentAuthIsolationByDir(
  agentDir?: string,
  cfg: OpenClawConfig = loadConfig(),
): DelegateAuthIsolation {
  if (!agentDir?.trim()) {
    return "legacy";
  }

  const normalizedDir = normalizeComparablePath(agentDir);
  for (const agentId of listAgentIds(cfg)) {
    if (normalizeComparablePath(resolveAgentDir(cfg, agentId)) !== normalizedDir) {
      continue;
    }
    return resolveAgentAuthIsolation(cfg, agentId);
  }
  return "legacy";
}

export function buildDelegatePreset(agentId: string, tier: DelegateTier): {
  delegate: DelegateConfig;
  sandbox: AgentSandboxConfig;
  subagents: NonNullable<AgentConfig["subagents"]>;
  tools: AgentToolsConfig;
} {
  const normalizedAgentId = normalizeAgentId(agentId);
  return {
    delegate: {
      enabled: true,
      tier,
      authIsolation: "strict",
      gwsRouting: {
        requireExplicitBindings: true,
      },
      cron: {
        allowed: tier === "tier3",
      },
    },
    sandbox: {
      mode: "all",
      scope: "agent",
      workspaceAccess: "rw",
      sessionToolsVisibility: "spawned",
    },
    subagents: {
      allowAgents: [normalizedAgentId],
    },
    tools: {
      allow: buildTierAllowList(tier),
      deny: dedupe([
        ...DELEGATE_COMMON_DENY,
        ...(tier === "tier3" ? [] : ["cron"]),
      ]),
    },
  };
}

export function buildDelegateGwsBindingSubjects(agentId: string): {
  agent: string;
  subagent: string;
} {
  const normalizedAgentId = normalizeAgentId(agentId);
  return {
    agent: `agent:${normalizedAgentId}`,
    subagent: `subagent:${normalizedAgentId}`,
  };
}
