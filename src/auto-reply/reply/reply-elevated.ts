import { resolveAgentConfig } from "../../agents/agent-scope.js";
import { getChannelDock } from "../../channels/dock.js";
import { normalizeChannelId } from "../../channels/plugins/index.js";
import type { AgentElevatedAllowFromConfig, OpenClawConfig } from "../../config/config.js";
<<<<<<< HEAD
import { INTERNAL_MESSAGE_CHANNEL } from "../../utils/message-channel.js";
import { formatCliCommand } from "../../cli/command-format.js";
import type { MsgContext } from "../templating.js";

type ExplicitElevatedAllowField = "id" | "from" | "e164" | "name" | "username" | "tag";

const EXPLICIT_ELEVATED_ALLOW_FIELDS = new Set<ExplicitElevatedAllowField>([
  "id",
  "from",
  "e164",
  "name",
  "username",
  "tag",
]);

function normalizeAllowToken(value?: string) {
  if (!value) return "";
  return value.trim().toLowerCase();
}

function slugAllowToken(value?: string) {
  if (!value) return "";
  let text = value.trim().toLowerCase();
  if (!text) return "";
  text = text.replace(/^[@#]+/, "");
  text = text.replace(/[\s_]+/g, "-");
  text = text.replace(/[^a-z0-9-]+/g, "-");
  return text.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
}

const SENDER_PREFIXES = [
  ...CHAT_CHANNEL_ORDER,
  INTERNAL_MESSAGE_CHANNEL,
  "user",
  "group",
  "channel",
];
const SENDER_PREFIX_RE = new RegExp(`^(${SENDER_PREFIXES.join("|")}):`, "i");

function stripSenderPrefix(value?: string) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.replace(SENDER_PREFIX_RE, "");
}

=======
import type { MsgContext } from "../templating.js";
import {
  type AllowFromFormatter,
  type ExplicitElevatedAllowField,
  addFormattedTokens,
  buildMutableTokens,
  matchesFormattedTokens,
  matchesMutableTokens,
  parseExplicitElevatedAllowEntry,
  stripSenderPrefix,
} from "./elevated-allowlist-matcher.js";
export { formatElevatedUnavailableMessage } from "./elevated-unavailable.js";

>>>>>>> 33a43a151 (refactor(security): split elevated allowFrom matcher internals)
function resolveElevatedAllowList(
  allowFrom: AgentElevatedAllowFromConfig | undefined,
  provider: string,
  fallbackAllowFrom?: Array<string | number>,
): Array<string | number> | undefined {
  if (!allowFrom) return fallbackAllowFrom;
  const value = allowFrom[provider];
  return Array.isArray(value) ? value : fallbackAllowFrom;
}

function resolveAllowFromFormatter(params: {
  cfg: OpenClawConfig;
  provider: string;
  accountId?: string;
}): AllowFromFormatter {
  const normalizedProvider = normalizeChannelId(params.provider);
  const dock = normalizedProvider ? getChannelDock(normalizedProvider) : undefined;
  const formatAllowFrom = dock?.config?.formatAllowFrom;
  if (!formatAllowFrom) {
    return (values) => values.map((entry) => String(entry).trim()).filter(Boolean);
  }
  return (values) =>
    formatAllowFrom({
      cfg: params.cfg,
      accountId: params.accountId,
      allowFrom: values,
    })
      .map((entry) => String(entry).trim())
      .filter(Boolean);
}

function isApprovedElevatedSender(params: {
  provider: string;
  ctx: MsgContext;
  formatAllowFrom: AllowFromFormatter;
  allowFrom?: AgentElevatedAllowFromConfig;
  fallbackAllowFrom?: Array<string | number>;
}): boolean {
  const rawAllow = resolveElevatedAllowList(
    params.allowFrom,
    params.provider,
    params.fallbackAllowFrom,
  );
  if (!rawAllow || rawAllow.length === 0) return false;

  const allowTokens = rawAllow.map((entry) => String(entry).trim()).filter(Boolean);
  if (allowTokens.length === 0) return false;
  if (allowTokens.some((entry) => entry === "*")) return true;

<<<<<<< HEAD
  const tokens = new Set<string>();
  const addToken = (value?: string) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    tokens.add(trimmed);
    const normalized = normalizeAllowToken(trimmed);
    if (normalized) tokens.add(normalized);
    const slugged = slugAllowToken(trimmed);
    if (slugged) tokens.add(slugged);
  };
=======
  const senderIdTokens = new Set<string>();
  const senderFromTokens = new Set<string>();
  const senderE164Tokens = new Set<string>();
>>>>>>> 6817c0ec7 (fix(security): tighten elevated allowFrom sender matching)

  if (params.ctx.SenderId?.trim()) {
    addFormattedTokens({
      formatAllowFrom: params.formatAllowFrom,
      values: [params.ctx.SenderId, stripSenderPrefix(params.ctx.SenderId)].filter(Boolean),
      tokens: senderIdTokens,
    });
  }
  if (params.ctx.From?.trim()) {
    addFormattedTokens({
      formatAllowFrom: params.formatAllowFrom,
      values: [params.ctx.From, stripSenderPrefix(params.ctx.From)].filter(Boolean),
      tokens: senderFromTokens,
    });
  }
  if (params.ctx.SenderE164?.trim()) {
    addFormattedTokens({
      formatAllowFrom: params.formatAllowFrom,
      values: [params.ctx.SenderE164],
      tokens: senderE164Tokens,
    });
  }
  const senderIdentityTokens = new Set<string>([
    ...senderIdTokens,
    ...senderFromTokens,
    ...senderE164Tokens,
  ]);

<<<<<<< HEAD
  for (const rawEntry of allowTokens) {
    const entry = rawEntry.trim();
    if (!entry) continue;
    const stripped = stripSenderPrefix(entry);
    if (tokens.has(entry) || tokens.has(stripped)) return true;
    const normalized = normalizeAllowToken(stripped);
    if (normalized && tokens.has(normalized)) return true;
    const slugged = slugAllowToken(stripped);
    if (slugged && tokens.has(slugged)) return true;
=======
  const senderNameTokens = buildMutableTokens(params.ctx.SenderName);
  const senderUsernameTokens = buildMutableTokens(params.ctx.SenderUsername);
  const senderTagTokens = buildMutableTokens(params.ctx.SenderTag);

  const explicitFieldMatchers: Record<ExplicitElevatedAllowField, (value: string) => boolean> = {
    id: (value) =>
      matchesFormattedTokens({
        formatAllowFrom: params.formatAllowFrom,
        value,
        includeStripped: true,
        tokens: senderIdTokens,
      }),
    from: (value) =>
      matchesFormattedTokens({
        formatAllowFrom: params.formatAllowFrom,
        value,
        includeStripped: true,
        tokens: senderFromTokens,
      }),
    e164: (value) =>
      matchesFormattedTokens({
        formatAllowFrom: params.formatAllowFrom,
        value,
        tokens: senderE164Tokens,
      }),
    name: (value) => matchesMutableTokens(value, senderNameTokens),
    username: (value) => matchesMutableTokens(value, senderUsernameTokens),
    tag: (value) => matchesMutableTokens(value, senderTagTokens),
  };

  for (const entry of allowTokens) {
    const explicitEntry = parseExplicitElevatedAllowEntry(entry);
    if (!explicitEntry) {
      if (
        matchesFormattedTokens({
          formatAllowFrom: params.formatAllowFrom,
          value: entry,
          includeStripped: true,
          tokens: senderIdentityTokens,
        })
      ) {
        return true;
      }
      continue;
    }
    const matchesExplicitField = explicitFieldMatchers[explicitEntry.field];
    if (matchesExplicitField(explicitEntry.value)) {
      return true;
    }
>>>>>>> 6817c0ec7 (fix(security): tighten elevated allowFrom sender matching)
  }

  return false;
}

export function resolveElevatedPermissions(params: {
  cfg: OpenClawConfig;
  agentId: string;
  ctx: MsgContext;
  provider: string;
}): {
  enabled: boolean;
  allowed: boolean;
  failures: Array<{ gate: string; key: string }>;
} {
  const globalConfig = params.cfg.tools?.elevated;
  const agentConfig = resolveAgentConfig(params.cfg, params.agentId)?.tools?.elevated;
  const globalEnabled = globalConfig?.enabled !== false;
  const agentEnabled = agentConfig?.enabled !== false;
  const enabled = globalEnabled && agentEnabled;
  const failures: Array<{ gate: string; key: string }> = [];
  if (!globalEnabled) failures.push({ gate: "enabled", key: "tools.elevated.enabled" });
  if (!agentEnabled)
    failures.push({
      gate: "enabled",
      key: "agents.list[].tools.elevated.enabled",
    });
  if (!enabled) return { enabled, allowed: false, failures };
  if (!params.provider) {
    failures.push({ gate: "provider", key: "ctx.Provider" });
    return { enabled, allowed: false, failures };
  }

  const normalizedProvider = normalizeChannelId(params.provider);
  const dock = normalizedProvider ? getChannelDock(normalizedProvider) : undefined;
  const fallbackAllowFrom = dock?.elevated?.allowFromFallback?.({
    cfg: params.cfg,
    accountId: params.ctx.AccountId,
  });
  const formatAllowFrom = resolveAllowFromFormatter({
    cfg: params.cfg,
    provider: params.provider,
    accountId: params.ctx.AccountId,
  });
  const globalAllowed = isApprovedElevatedSender({
    provider: params.provider,
    ctx: params.ctx,
    formatAllowFrom,
    allowFrom: globalConfig?.allowFrom,
    fallbackAllowFrom,
  });
  if (!globalAllowed) {
    failures.push({
      gate: "allowFrom",
      key: `tools.elevated.allowFrom.${params.provider}`,
    });
    return { enabled, allowed: false, failures };
  }

  const agentAllowed = agentConfig?.allowFrom
    ? isApprovedElevatedSender({
        provider: params.provider,
        ctx: params.ctx,
        formatAllowFrom,
        allowFrom: agentConfig.allowFrom,
        fallbackAllowFrom,
      })
    : true;
  if (!agentAllowed) {
    failures.push({
      gate: "allowFrom",
      key: `agents.list[].tools.elevated.allowFrom.${params.provider}`,
    });
  }
  return { enabled, allowed: globalAllowed && agentAllowed, failures };
}

export function formatElevatedUnavailableMessage(params: {
  runtimeSandboxed: boolean;
  failures: Array<{ gate: string; key: string }>;
  sessionKey?: string;
}): string {
  const lines: string[] = [];
  lines.push(
    `elevated is not available right now (runtime=${params.runtimeSandboxed ? "sandboxed" : "direct"}).`,
  );
  if (params.failures.length > 0) {
    lines.push(`Failing gates: ${params.failures.map((f) => `${f.gate} (${f.key})`).join(", ")}`);
  } else {
    lines.push(
      "Failing gates: enabled (tools.elevated.enabled / agents.list[].tools.elevated.enabled), allowFrom (tools.elevated.allowFrom.<provider>).",
    );
  }
  lines.push("Fix-it keys:");
  lines.push("- tools.elevated.enabled");
  lines.push("- tools.elevated.allowFrom.<provider>");
  lines.push("- agents.list[].tools.elevated.enabled");
  lines.push("- agents.list[].tools.elevated.allowFrom.<provider>");
  if (params.sessionKey) {
    lines.push(
      `See: ${formatCliCommand(`openclaw sandbox explain --session ${params.sessionKey}`)}`,
    );
  }
  return lines.join("\n");
}
