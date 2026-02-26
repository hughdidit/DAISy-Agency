import type { ChannelId } from "../../channels/plugins/types.js";
import { DEFAULT_CHAT_CHANNEL } from "../../channels/registry.js";
import type { OpenClawConfig } from "../../config/config.js";
import {
  loadSessionStore,
  resolveAgentMainSessionKey,
  resolveStorePath,
} from "../../config/sessions.js";
import { resolveMessageChannelSelection } from "../../infra/outbound/channel-selection.js";
import type { OutboundChannel } from "../../infra/outbound/targets.js";
import {
  resolveOutboundTarget,
  resolveSessionDeliveryTarget,
} from "../../infra/outbound/targets.js";
<<<<<<< HEAD
=======
import { readChannelAllowFromStoreSync } from "../../pairing/pairing-store.js";
import { buildChannelAccountBindings } from "../../routing/bindings.js";
import { normalizeAccountId, normalizeAgentId } from "../../routing/session-key.js";
import { resolveWhatsAppAccount } from "../../web/accounts.js";
import { normalizeWhatsAppTarget } from "../../whatsapp/normalize.js";

export type DeliveryTargetResolution =
  | {
      ok: true;
      channel: Exclude<OutboundChannel, "none">;
      to: string;
      accountId?: string;
      threadId?: string | number;
      mode: "explicit" | "implicit";
    }
  | {
      ok: false;
      channel?: Exclude<OutboundChannel, "none">;
      to?: string;
      accountId?: string;
      threadId?: string | number;
      mode: "explicit" | "implicit";
      error: Error;
    };
>>>>>>> bce643a0b (refactor(security): enforce account-scoped pairing APIs)

export async function resolveDeliveryTarget(
  cfg: OpenClawConfig,
  agentId: string,
  jobPayload: {
    channel?: "last" | ChannelId;
    to?: string;
  },
): Promise<{
  channel: Exclude<OutboundChannel, "none">;
  to?: string;
  accountId?: string;
  mode: "explicit" | "implicit";
  error?: Error;
}> {
  const requestedChannel = typeof jobPayload.channel === "string" ? jobPayload.channel : "last";
  const explicitTo = typeof jobPayload.to === "string" ? jobPayload.to : undefined;

  const sessionCfg = cfg.session;
  const mainSessionKey = resolveAgentMainSessionKey({ cfg, agentId });
  const storePath = resolveStorePath(sessionCfg?.store, { agentId });
  const store = loadSessionStore(storePath);
  const main = store[mainSessionKey];

  const preliminary = resolveSessionDeliveryTarget({
    entry: main,
    requestedChannel,
    explicitTo,
    allowMismatchedLastTo: true,
  });

  let fallbackChannel: Exclude<OutboundChannel, "none"> | undefined;
  if (!preliminary.channel) {
    try {
      const selection = await resolveMessageChannelSelection({ cfg });
      fallbackChannel = selection.channel;
    } catch {
      fallbackChannel = preliminary.lastChannel ?? DEFAULT_CHAT_CHANNEL;
    }
  }

  const resolved = fallbackChannel
    ? resolveSessionDeliveryTarget({
        entry: main,
        requestedChannel,
        explicitTo,
        fallbackChannel,
        allowMismatchedLastTo: true,
        mode: preliminary.mode,
      })
    : preliminary;

  const channel = resolved.channel ?? fallbackChannel ?? DEFAULT_CHAT_CHANNEL;
  const mode = resolved.mode as "explicit" | "implicit";
  const toCandidate = resolved.to;

  if (!toCandidate) {
<<<<<<< HEAD
    return { channel, to: undefined, accountId: resolved.accountId, mode };
=======
    return {
      ok: false,
      channel,
      to: undefined,
      accountId,
      threadId,
      mode,
      error:
        channelResolutionError ??
        new Error(`No delivery target resolved for channel "${channel}". Set delivery.to.`),
    };
  }

  let allowFromOverride: string[] | undefined;
  if (channel === "whatsapp") {
    const resolvedAccountId = normalizeAccountId(accountId);
    const configuredAllowFromRaw =
      resolveWhatsAppAccount({ cfg, accountId: resolvedAccountId }).allowFrom ?? [];
    const configuredAllowFrom = configuredAllowFromRaw
      .map((entry) => String(entry).trim())
      .filter((entry) => entry && entry !== "*")
      .map((entry) => normalizeWhatsAppTarget(entry))
      .filter((entry): entry is string => Boolean(entry));
    const storeAllowFrom = readChannelAllowFromStoreSync("whatsapp", process.env, resolvedAccountId)
      .map((entry) => normalizeWhatsAppTarget(entry))
      .filter((entry): entry is string => Boolean(entry));
    allowFromOverride = [...new Set([...configuredAllowFrom, ...storeAllowFrom])];

    if (mode === "implicit" && allowFromOverride.length > 0) {
      const normalizedCurrentTarget = normalizeWhatsAppTarget(toCandidate);
      if (!normalizedCurrentTarget || !allowFromOverride.includes(normalizedCurrentTarget)) {
        toCandidate = allowFromOverride[0];
      }
    }
>>>>>>> bce643a0b (refactor(security): enforce account-scoped pairing APIs)
  }

  const docked = resolveOutboundTarget({
    channel,
    to: toCandidate,
    cfg,
    accountId: resolved.accountId,
    mode,
  });
  return {
    channel,
    to: docked.ok ? docked.to : undefined,
    accountId: resolved.accountId,
    mode,
    error: docked.ok ? undefined : docked.error,
  };
}
