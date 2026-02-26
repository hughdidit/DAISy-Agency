<<<<<<< HEAD
import { readChannelAllowFromStore } from "../../pairing/pairing-store.js";

import { allowListMatches, normalizeAllowList, normalizeAllowListLower } from "./allow-list.js";
import type { SlackMonitorContext } from "./context.js";

export async function resolveSlackEffectiveAllowFrom(ctx: SlackMonitorContext) {
  const storeAllowFrom = await readChannelAllowFromStore("slack").catch(() => []);
=======
import { readStoreAllowFromForDmPolicy } from "../../security/dm-policy-shared.js";
import {
  allowListMatches,
  normalizeAllowList,
  normalizeAllowListLower,
  resolveSlackUserAllowed,
} from "./allow-list.js";
import { resolveSlackChannelConfig } from "./channel-config.js";
import { normalizeSlackChannelType, type SlackMonitorContext } from "./context.js";

export async function resolveSlackEffectiveAllowFrom(
  ctx: SlackMonitorContext,
  options?: { includePairingStore?: boolean },
) {
  const includePairingStore = options?.includePairingStore === true;
  const storeAllowFrom = includePairingStore
    ? await readStoreAllowFromForDmPolicy({
        provider: "slack",
        accountId: ctx.accountId,
        dmPolicy: ctx.dmPolicy,
      })
    : [];
>>>>>>> bce643a0b (refactor(security): enforce account-scoped pairing APIs)
  const allowFrom = normalizeAllowList([...ctx.allowFrom, ...storeAllowFrom]);
  const allowFromLower = normalizeAllowListLower(allowFrom);
  return { allowFrom, allowFromLower };
}

export function isSlackSenderAllowListed(params: {
  allowListLower: string[];
  senderId: string;
  senderName?: string;
  allowNameMatching?: boolean;
}) {
  const { allowListLower, senderId, senderName, allowNameMatching } = params;
  return (
    allowListLower.length === 0 ||
    allowListMatches({
      allowList: allowListLower,
      id: senderId,
      name: senderName,
      allowNameMatching,
    })
  );
}
