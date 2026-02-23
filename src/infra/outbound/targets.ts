import { getChannelPlugin, normalizeChannelId } from "../../channels/plugins/index.js";
import { formatCliCommand } from "../../cli/command-format.js";
import type { ChannelId, ChannelOutboundTargetMode } from "../../channels/plugins/types.js";
import type { OpenClawConfig } from "../../config/config.js";
import type { SessionEntry } from "../../config/sessions.js";
import type { AgentDefaultsConfig } from "../../config/types.agent-defaults.js";
import { deliveryContextFromSession } from "../../utils/delivery-context.js";
import type {
  DeliverableMessageChannel,
  GatewayMessageChannel,
} from "../../utils/message-channel.js";
import {
  INTERNAL_MESSAGE_CHANNEL,
  isDeliverableMessageChannel,
  normalizeMessageChannel,
} from "../../utils/message-channel.js";
import { missingTargetError } from "./target-errors.js";

export type OutboundChannel = DeliverableMessageChannel | "none";

export type HeartbeatTarget = OutboundChannel | "last";

export type OutboundTarget = {
  channel: OutboundChannel;
  to?: string;
  reason?: string;
  accountId?: string;
  lastChannel?: DeliverableMessageChannel;
  lastAccountId?: string;
};

export type HeartbeatSenderContext = {
  sender: string;
  provider?: DeliverableMessageChannel;
  allowFrom: string[];
};

export type OutboundTargetResolution = { ok: true; to: string } | { ok: false; error: Error };

export type SessionDeliveryTarget = {
  channel?: DeliverableMessageChannel;
  to?: string;
  accountId?: string;
  threadId?: string | number;
  mode: ChannelOutboundTargetMode;
  lastChannel?: DeliverableMessageChannel;
  lastTo?: string;
  lastAccountId?: string;
  lastThreadId?: string | number;
};

export function resolveSessionDeliveryTarget(params: {
  entry?: SessionEntry;
  requestedChannel?: GatewayMessageChannel | "last";
  explicitTo?: string;
  explicitThreadId?: string | number;
  fallbackChannel?: DeliverableMessageChannel;
  allowMismatchedLastTo?: boolean;
  mode?: ChannelOutboundTargetMode;
  /**
   * When set, this overrides the session-level `lastChannel` for "last"
   * resolution.  This prevents cross-channel reply routing when multiple
   * channels share the same session (dmScope = "main") and an inbound
   * message from a different channel updates `lastChannel` while an agent
   * turn is still in flight.
   *
   * Callers should set this to the channel that originated the current
   * agent turn so the reply always routes back to the correct channel.
   *
   * @see https://github.com/openclaw/openclaw/issues/24152
   */
  turnSourceChannel?: DeliverableMessageChannel;
  /** Turn-source `to` — paired with `turnSourceChannel`. */
  turnSourceTo?: string;
  /** Turn-source `accountId` — paired with `turnSourceChannel`. */
  turnSourceAccountId?: string;
  /** Turn-source `threadId` — paired with `turnSourceChannel`. */
  turnSourceThreadId?: string | number;
}): SessionDeliveryTarget {
  const context = deliveryContextFromSession(params.entry);
  const sessionLastChannel =
    context?.channel && isDeliverableMessageChannel(context.channel) ? context.channel : undefined;

  // When a turn-source channel is provided, use it instead of the session's
  // mutable lastChannel.  This prevents a concurrent inbound from a different
  // channel from hijacking the reply target (cross-channel privacy leak).
  const lastChannel = params.turnSourceChannel ?? sessionLastChannel;
  const lastTo = params.turnSourceChannel ? (params.turnSourceTo ?? context?.to) : context?.to;
  const lastAccountId = params.turnSourceChannel
    ? (params.turnSourceAccountId ?? context?.accountId)
    : context?.accountId;
  const lastThreadId = params.turnSourceChannel
    ? (params.turnSourceThreadId ?? context?.threadId)
    : context?.threadId;

  const rawRequested = params.requestedChannel ?? "last";
  const requested = rawRequested === "last" ? "last" : normalizeMessageChannel(rawRequested);
  const requestedChannel =
    requested === "last"
      ? "last"
      : requested && isDeliverableMessageChannel(requested)
        ? requested
        : undefined;

  const explicitTo =
    typeof params.explicitTo === "string" && params.explicitTo.trim()
      ? params.explicitTo.trim()
      : undefined;
  const explicitThreadId =
    params.explicitThreadId != null && params.explicitThreadId !== ""
      ? params.explicitThreadId
      : undefined;

  let channel = requestedChannel === "last" ? lastChannel : requestedChannel;
  if (!channel && params.fallbackChannel && isDeliverableMessageChannel(params.fallbackChannel)) {
    channel = params.fallbackChannel;
  }

  let to = explicitTo;
  if (!to && lastTo) {
    if (channel && channel === lastChannel) {
      to = lastTo;
    } else if (params.allowMismatchedLastTo) {
      to = lastTo;
    }
  }

  const accountId = channel && channel === lastChannel ? lastAccountId : undefined;
  const threadId = channel && channel === lastChannel ? lastThreadId : undefined;
  const mode = params.mode ?? (explicitTo ? "explicit" : "implicit");

  return {
    channel,
    to,
    accountId,
    threadId: explicitThreadId ?? threadId,
    mode,
    lastChannel,
    lastTo,
    lastAccountId,
    lastThreadId,
  };
}

// Channel docking: prefer plugin.outbound.resolveTarget + allowFrom to normalize destinations.
export function resolveOutboundTarget(params: {
  channel: GatewayMessageChannel;
  to?: string;
  allowFrom?: string[];
  cfg?: OpenClawConfig;
  accountId?: string | null;
  mode?: ChannelOutboundTargetMode;
}): OutboundTargetResolution {
  if (params.channel === INTERNAL_MESSAGE_CHANNEL) {
    return {
      ok: false,
      error: new Error(
        `Delivering to WebChat is not supported via \`${formatCliCommand("openclaw agent")}\`; use WhatsApp/Telegram or run with --deliver=false.`,
      ),
    };
  }

  const plugin = getChannelPlugin(params.channel as ChannelId);
  if (!plugin) {
    return {
      ok: false,
      error: new Error(`Unsupported channel: ${params.channel}`),
    };
  }

  const allowFrom =
    params.allowFrom ??
    (params.cfg && plugin.config.resolveAllowFrom
      ? plugin.config.resolveAllowFrom({
          cfg: params.cfg,
          accountId: params.accountId ?? undefined,
        })
      : undefined);

  const resolveTarget = plugin.outbound?.resolveTarget;
  if (resolveTarget) {
    return resolveTarget({
      cfg: params.cfg,
      to: params.to,
      allowFrom,
      accountId: params.accountId ?? undefined,
      mode: params.mode ?? "explicit",
    });
  }

  const trimmed = params.to?.trim();
  if (trimmed) {
    return { ok: true, to: trimmed };
  }
  const hint = plugin.messaging?.targetResolver?.hint;
  return {
    ok: false,
    error: missingTargetError(plugin.meta.label ?? params.channel, hint),
  };
}

export function resolveHeartbeatDeliveryTarget(params: {
  cfg: OpenClawConfig;
  entry?: SessionEntry;
  heartbeat?: AgentDefaultsConfig["heartbeat"];
}): OutboundTarget {
  const { cfg, entry } = params;
  const heartbeat = params.heartbeat ?? cfg.agents?.defaults?.heartbeat;
  const rawTarget = heartbeat?.target;
  let target: HeartbeatTarget = "last";
  if (rawTarget === "none" || rawTarget === "last") {
    target = rawTarget;
  } else if (typeof rawTarget === "string") {
    const normalized = normalizeChannelId(rawTarget);
    if (normalized) target = normalized;
  }

  if (target === "none") {
    const base = resolveSessionDeliveryTarget({ entry });
    return {
      channel: "none",
      reason: "target-none",
      accountId: undefined,
      lastChannel: base.lastChannel,
      lastAccountId: base.lastAccountId,
    };
  }

  const resolvedTarget = resolveSessionDeliveryTarget({
    entry,
    requestedChannel: target === "last" ? "last" : target,
    explicitTo: heartbeat?.to,
    mode: "heartbeat",
  });

  if (!resolvedTarget.channel || !resolvedTarget.to) {
    return {
      channel: "none",
      reason: "no-target",
      accountId: resolvedTarget.accountId,
      lastChannel: resolvedTarget.lastChannel,
      lastAccountId: resolvedTarget.lastAccountId,
    };
  }

  const resolved = resolveOutboundTarget({
    channel: resolvedTarget.channel,
    to: resolvedTarget.to,
    cfg,
    accountId: resolvedTarget.accountId,
    mode: "heartbeat",
  });
  if (!resolved.ok) {
    return {
      channel: "none",
      reason: "no-target",
      accountId: resolvedTarget.accountId,
      lastChannel: resolvedTarget.lastChannel,
      lastAccountId: resolvedTarget.lastAccountId,
    };
  }

  let reason: string | undefined;
  const plugin = getChannelPlugin(resolvedTarget.channel as ChannelId);
  if (plugin?.config.resolveAllowFrom) {
    const explicit = resolveOutboundTarget({
      channel: resolvedTarget.channel,
      to: resolvedTarget.to,
      cfg,
      accountId: resolvedTarget.accountId,
      mode: "explicit",
    });
    if (explicit.ok && explicit.to !== resolved.to) {
      reason = "allowFrom-fallback";
    }
  }

  return {
    channel: resolvedTarget.channel,
    to: resolved.to,
    reason,
    accountId: resolvedTarget.accountId,
    lastChannel: resolvedTarget.lastChannel,
    lastAccountId: resolvedTarget.lastAccountId,
  };
}

function resolveHeartbeatSenderId(params: {
  allowFrom: Array<string | number>;
  deliveryTo?: string;
  lastTo?: string;
  provider?: string | null;
}) {
  const { allowFrom, deliveryTo, lastTo, provider } = params;
  const candidates = [
    deliveryTo?.trim(),
    provider && deliveryTo ? `${provider}:${deliveryTo}` : undefined,
    lastTo?.trim(),
    provider && lastTo ? `${provider}:${lastTo}` : undefined,
  ].filter((val): val is string => Boolean(val?.trim()));

  const allowList = allowFrom
    .map((entry) => String(entry))
    .filter((entry) => entry && entry !== "*");
  if (allowFrom.includes("*")) {
    return candidates[0] ?? "heartbeat";
  }
  if (candidates.length > 0 && allowList.length > 0) {
    const matched = candidates.find((candidate) => allowList.includes(candidate));
    if (matched) return matched;
  }
  if (candidates.length > 0 && allowList.length === 0) {
    return candidates[0];
  }
  if (allowList.length > 0) return allowList[0];
  return candidates[0] ?? "heartbeat";
}

export function resolveHeartbeatSenderContext(params: {
  cfg: OpenClawConfig;
  entry?: SessionEntry;
  delivery: OutboundTarget;
}): HeartbeatSenderContext {
  const provider =
    params.delivery.channel !== "none" ? params.delivery.channel : params.delivery.lastChannel;
  const allowFrom = provider
    ? (getChannelPlugin(provider)?.config.resolveAllowFrom?.({
        cfg: params.cfg,
        accountId:
          provider === params.delivery.lastChannel ? params.delivery.lastAccountId : undefined,
      }) ?? [])
    : [];

  const sender = resolveHeartbeatSenderId({
    allowFrom,
    deliveryTo: params.delivery.to,
    lastTo: params.entry?.lastTo,
    provider,
  });

  return { sender, provider, allowFrom };
}
