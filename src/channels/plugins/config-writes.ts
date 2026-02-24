import type { OpenClawConfig } from "../../config/config.js";
<<<<<<< HEAD
=======
import { resolveAccountEntry } from "../../routing/account-lookup.js";
import { normalizeAccountId } from "../../routing/session-key.js";
>>>>>>> f97c0922e (fix(security): harden account-key handling against prototype pollution)
import type { ChannelId } from "./types.js";
import { normalizeAccountId } from "../../routing/session-key.js";

type ChannelConfigWithAccounts = {
  configWrites?: boolean;
  accounts?: Record<string, { configWrites?: boolean }>;
};

function resolveAccountConfig(accounts: ChannelConfigWithAccounts["accounts"], accountId: string) {
<<<<<<< HEAD
  if (!accounts || typeof accounts !== "object") return undefined;
  if (accountId in accounts) return accounts[accountId];
  const matchKey = Object.keys(accounts).find(
    (key) => key.toLowerCase() === accountId.toLowerCase(),
  );
  return matchKey ? accounts[matchKey] : undefined;
=======
  return resolveAccountEntry(accounts, accountId);
>>>>>>> f97c0922e (fix(security): harden account-key handling against prototype pollution)
}

export function resolveChannelConfigWrites(params: {
  cfg: OpenClawConfig;
  channelId?: ChannelId | null;
  accountId?: string | null;
}): boolean {
  if (!params.channelId) return true;
  const channels = params.cfg.channels as Record<string, ChannelConfigWithAccounts> | undefined;
  const channelConfig = channels?.[params.channelId];
  if (!channelConfig) return true;
  const accountId = normalizeAccountId(params.accountId);
  const accountConfig = resolveAccountConfig(channelConfig.accounts, accountId);
  const value = accountConfig?.configWrites ?? channelConfig.configWrites;
  return value !== false;
}
