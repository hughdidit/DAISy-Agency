import { loadConfig } from "../../config/config.js";
import { resolveRuntimeGroupPolicy } from "../../config/runtime-group-policy.js";
import { logVerbose } from "../../globals.js";
import { buildPairingReply } from "../../pairing/pairing-messages.js";
import {
  readChannelAllowFromStore,
  upsertChannelPairingRequest,
} from "../../pairing/pairing-store.js";
<<<<<<< HEAD
=======
import {
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
} from "../../security/dm-policy-shared.js";
>>>>>>> 64de4b6d6 (fix: enforce explicit group auth boundaries across channels)
import { isSelfChatMode, normalizeE164 } from "../../utils.js";
import { resolveWhatsAppAccount } from "../accounts.js";

export type InboundAccessControlResult = {
  allowed: boolean;
  shouldMarkRead: boolean;
  isSelfChat: boolean;
  resolvedAccountId: string;
};

const PAIRING_REPLY_HISTORY_GRACE_MS = 30_000;

function resolveWhatsAppRuntimeGroupPolicy(params: {
  providerConfigPresent: boolean;
  groupPolicy?: "open" | "allowlist" | "disabled";
  defaultGroupPolicy?: "open" | "allowlist" | "disabled";
}): {
  groupPolicy: "open" | "allowlist" | "disabled";
  providerMissingFallbackApplied: boolean;
} {
  return resolveRuntimeGroupPolicy({
    providerConfigPresent: params.providerConfigPresent,
    groupPolicy: params.groupPolicy,
    defaultGroupPolicy: params.defaultGroupPolicy,
    configuredFallbackPolicy: "open",
    missingProviderFallbackPolicy: "allowlist",
  });
}

export async function checkInboundAccessControl(params: {
  accountId: string;
  from: string;
  selfE164: string | null;
  senderE164: string | null;
  group: boolean;
  pushName?: string;
  isFromMe: boolean;
  messageTimestampMs?: number;
  connectedAtMs?: number;
  pairingGraceMs?: number;
  sock: {
    sendMessage: (jid: string, content: { text: string }) => Promise<unknown>;
  };
  remoteJid: string;
}): Promise<InboundAccessControlResult> {
  const cfg = loadConfig();
  const account = resolveWhatsAppAccount({
    cfg,
    accountId: params.accountId,
  });
<<<<<<< HEAD
  const dmPolicy = cfg.channels?.whatsapp?.dmPolicy ?? "pairing";
  const configuredAllowFrom = account.allowFrom;
<<<<<<< HEAD
  const storeAllowFrom = await readChannelAllowFromStore("whatsapp").catch(() => []);
=======
  const storeAllowFrom =
    dmPolicy === "allowlist"
      ? []
      : await readChannelAllowFromStore("whatsapp", process.env, account.accountId).catch(() => []);
>>>>>>> 0bd9f0d4a (fix: enforce strict allowlist across pairing stores (#23017))
=======
  const dmPolicy = account.dmPolicy ?? "pairing";
  const configuredAllowFrom = account.allowFrom ?? [];
  const storeAllowFrom = await readStoreAllowFromForDmPolicy({
    provider: "whatsapp",
    dmPolicy,
    readStore: (provider) => readChannelAllowFromStore(provider, process.env, account.accountId),
  });
>>>>>>> 64de4b6d6 (fix: enforce explicit group auth boundaries across channels)
  // Without user config, default to self-only DM access so the owner can talk to themselves.
  const defaultAllowFrom =
    configuredAllowFrom.length === 0 && params.selfE164 ? [params.selfE164] : [];
  const dmAllowFrom = configuredAllowFrom.length > 0 ? configuredAllowFrom : defaultAllowFrom;
  const groupAllowFrom =
    account.groupAllowFrom ?? (configuredAllowFrom.length > 0 ? configuredAllowFrom : undefined);
  const isSamePhone = params.from === params.selfE164;
  const isSelfChat = isSelfChatMode(params.selfE164, configuredAllowFrom);
  const pairingGraceMs =
    typeof params.pairingGraceMs === "number" && params.pairingGraceMs > 0
      ? params.pairingGraceMs
      : PAIRING_REPLY_HISTORY_GRACE_MS;
  const suppressPairingReply =
    typeof params.connectedAtMs === "number" &&
    typeof params.messageTimestampMs === "number" &&
    params.messageTimestampMs < params.connectedAtMs - pairingGraceMs;

  // Group policy filtering:
  // - "open": groups bypass allowFrom, only mention-gating applies
  // - "disabled": block all group messages entirely
  // - "allowlist": only allow group messages from senders in groupAllowFrom/allowFrom
  const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
  const { groupPolicy, providerMissingFallbackApplied } = resolveWhatsAppRuntimeGroupPolicy({
    providerConfigPresent: cfg.channels?.whatsapp !== undefined,
    groupPolicy: account.groupPolicy,
    defaultGroupPolicy,
  });
<<<<<<< HEAD
  if (providerMissingFallbackApplied) {
    logVerbose(
      'whatsapp: channels.whatsapp is missing; defaulting groupPolicy to "allowlist" (group messages blocked until explicitly configured).',
    );
  }
  if (params.group && groupPolicy === "disabled") {
    logVerbose("Blocked group message (groupPolicy: disabled)");
=======
  warnMissingProviderGroupPolicyFallbackOnce({
    providerMissingFallbackApplied,
    providerKey: "whatsapp",
    accountId: account.accountId,
    log: (message) => logVerbose(message),
  });
  const normalizedDmSender = normalizeE164(params.from);
  const normalizedGroupSender =
    typeof params.senderE164 === "string" ? normalizeE164(params.senderE164) : null;
  const access = resolveDmGroupAccessWithLists({
    isGroup: params.group,
    dmPolicy,
    groupPolicy,
    // Groups intentionally fall back to configured allowFrom only (not DM self-chat fallback).
    allowFrom: params.group ? configuredAllowFrom : dmAllowFrom,
    groupAllowFrom,
    storeAllowFrom,
    isSenderAllowed: (allowEntries) => {
      const hasWildcard = allowEntries.includes("*");
      if (hasWildcard) {
        return true;
      }
      const normalizedEntrySet = new Set(
        allowEntries
          .map((entry) => normalizeE164(String(entry)))
          .filter((entry): entry is string => Boolean(entry)),
      );
      if (!params.group && isSamePhone) {
        return true;
      }
      return params.group
        ? Boolean(normalizedGroupSender && normalizedEntrySet.has(normalizedGroupSender))
        : normalizedEntrySet.has(normalizedDmSender);
    },
  });
  if (params.group && access.decision !== "allow") {
    if (access.reason === "groupPolicy=disabled") {
      logVerbose("Blocked group message (groupPolicy: disabled)");
    } else if (access.reason === "groupPolicy=allowlist (empty allowlist)") {
      logVerbose("Blocked group message (groupPolicy: allowlist, no groupAllowFrom)");
    } else {
      logVerbose(
        `Blocked group message from ${params.senderE164 ?? "unknown sender"} (groupPolicy: allowlist)`,
      );
    }
>>>>>>> 64de4b6d6 (fix: enforce explicit group auth boundaries across channels)
    return {
      allowed: false,
      shouldMarkRead: false,
      isSelfChat,
      resolvedAccountId: account.accountId,
    };
  }

  // DM access control (secure defaults): "pairing" (default) / "allowlist" / "open" / "disabled".
  if (!params.group) {
    if (params.isFromMe && !isSamePhone) {
      logVerbose("Skipping outbound DM (fromMe); no pairing reply needed.");
      return {
        allowed: false,
        shouldMarkRead: false,
        isSelfChat,
        resolvedAccountId: account.accountId,
      };
    }
    if (access.decision === "block" && access.reason === "dmPolicy=disabled") {
      logVerbose("Blocked dm (dmPolicy: disabled)");
      return {
        allowed: false,
        shouldMarkRead: false,
        isSelfChat,
        resolvedAccountId: account.accountId,
      };
    }
    if (access.decision === "pairing" && !isSamePhone) {
      const candidate = params.from;
<<<<<<< HEAD
      const allowed =
        dmHasWildcard ||
        (normalizedAllowFrom.length > 0 && normalizedAllowFrom.includes(candidate));
      if (!allowed) {
        if (dmPolicy === "pairing") {
          if (suppressPairingReply) {
            logVerbose(`Skipping pairing reply for historical DM from ${candidate}.`);
          } else {
            const { code, created } = await upsertChannelPairingRequest({
              channel: "whatsapp",
              id: candidate,
              meta: { name: (params.pushName ?? "").trim() || undefined },
=======
      if (suppressPairingReply) {
        logVerbose(`Skipping pairing reply for historical DM from ${candidate}.`);
      } else {
        const { code, created } = await upsertChannelPairingRequest({
          channel: "whatsapp",
          id: candidate,
          accountId: account.accountId,
          meta: { name: (params.pushName ?? "").trim() || undefined },
        });
        if (created) {
          logVerbose(
            `whatsapp pairing request sender=${candidate} name=${params.pushName ?? "unknown"}`,
          );
          try {
            await params.sock.sendMessage(params.remoteJid, {
              text: buildPairingReply({
                channel: "whatsapp",
                idLine: `Your WhatsApp phone number: ${candidate}`,
                code,
              }),
>>>>>>> 64de4b6d6 (fix: enforce explicit group auth boundaries across channels)
            });
          } catch (err) {
            logVerbose(`whatsapp pairing reply failed for ${candidate}: ${String(err)}`);
          }
        }
      }
      return {
        allowed: false,
        shouldMarkRead: false,
        isSelfChat,
        resolvedAccountId: account.accountId,
      };
    }
    if (access.decision !== "allow") {
      logVerbose(`Blocked unauthorized sender ${params.from} (dmPolicy=${dmPolicy})`);
      return {
        allowed: false,
        shouldMarkRead: false,
        isSelfChat,
        resolvedAccountId: account.accountId,
      };
    }
  }

  return {
    allowed: true,
    shouldMarkRead: true,
    isSelfChat,
    resolvedAccountId: account.accountId,
  };
}

export const __testing = {
  resolveWhatsAppRuntimeGroupPolicy,
};
