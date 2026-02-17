<<<<<<< HEAD
import type { MoltbotConfig } from "clawdbot/plugin-sdk";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "clawdbot/plugin-sdk";
=======
import type { OpenClawConfig } from "openclaw/plugin-sdk";
<<<<<<< HEAD
<<<<<<< HEAD
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk/account-id";
>>>>>>> 6543ce717 (perf(test): avoid plugin-sdk barrel imports)
=======
import { createAccountListHelpers } from "openclaw/plugin-sdk";
import { normalizeAccountId } from "openclaw/plugin-sdk/account-id";
>>>>>>> d24340d75 (channels: migrate extension account listing to factory)
=======
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk/account-id";
>>>>>>> ca19745fa (Revert "channels: migrate extension account listing to factory")
import { normalizeBlueBubblesServerUrl, type BlueBubblesAccountConfig } from "./types.js";

export type ResolvedBlueBubblesAccount = {
  accountId: string;
  enabled: boolean;
  name?: string;
  config: BlueBubblesAccountConfig;
  configured: boolean;
  baseUrl?: string;
};

<<<<<<< HEAD
<<<<<<< HEAD
function listConfiguredAccountIds(cfg: MoltbotConfig): string[] {
=======
function listConfiguredAccountIds(cfg: OpenClawConfig): string[] {
>>>>>>> ca19745fa (Revert "channels: migrate extension account listing to factory")
  const accounts = cfg.channels?.bluebubbles?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return [];
  }
  return Object.keys(accounts).filter(Boolean);
}

<<<<<<< HEAD
export function listBlueBubblesAccountIds(cfg: MoltbotConfig): string[] {
=======
export function listBlueBubblesAccountIds(cfg: OpenClawConfig): string[] {
>>>>>>> ca19745fa (Revert "channels: migrate extension account listing to factory")
  const ids = listConfiguredAccountIds(cfg);
  if (ids.length === 0) {
    return [DEFAULT_ACCOUNT_ID];
  }
  return ids.toSorted((a, b) => a.localeCompare(b));
}

<<<<<<< HEAD
export function resolveDefaultBlueBubblesAccountId(cfg: MoltbotConfig): string {
=======
export function resolveDefaultBlueBubblesAccountId(cfg: OpenClawConfig): string {
>>>>>>> ca19745fa (Revert "channels: migrate extension account listing to factory")
  const ids = listBlueBubblesAccountIds(cfg);
  if (ids.includes(DEFAULT_ACCOUNT_ID)) {
    return DEFAULT_ACCOUNT_ID;
  }
  return ids[0] ?? DEFAULT_ACCOUNT_ID;
}
<<<<<<< HEAD
=======
const { listAccountIds, resolveDefaultAccountId } = createAccountListHelpers("bluebubbles");
export const listBlueBubblesAccountIds = listAccountIds;
export const resolveDefaultBlueBubblesAccountId = resolveDefaultAccountId;
>>>>>>> d24340d75 (channels: migrate extension account listing to factory)
=======
>>>>>>> ca19745fa (Revert "channels: migrate extension account listing to factory")

function resolveAccountConfig(
  cfg: MoltbotConfig,
  accountId: string,
): BlueBubblesAccountConfig | undefined {
  const accounts = cfg.channels?.bluebubbles?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return undefined;
  }
  return accounts[accountId] as BlueBubblesAccountConfig | undefined;
}

function mergeBlueBubblesAccountConfig(
  cfg: MoltbotConfig,
  accountId: string,
): BlueBubblesAccountConfig {
  const base = (cfg.channels?.bluebubbles ?? {}) as BlueBubblesAccountConfig & {
    accounts?: unknown;
  };
  const { accounts: _ignored, ...rest } = base;
  const account = resolveAccountConfig(cfg, accountId) ?? {};
  const chunkMode = account.chunkMode ?? rest.chunkMode ?? "length";
  return { ...rest, ...account, chunkMode };
}

export function resolveBlueBubblesAccount(params: {
  cfg: MoltbotConfig;
  accountId?: string | null;
}): ResolvedBlueBubblesAccount {
  const accountId = normalizeAccountId(params.accountId);
  const baseEnabled = params.cfg.channels?.bluebubbles?.enabled;
  const merged = mergeBlueBubblesAccountConfig(params.cfg, accountId);
  const accountEnabled = merged.enabled !== false;
  const serverUrl = merged.serverUrl?.trim();
  const password = merged.password?.trim();
  const configured = Boolean(serverUrl && password);
  const baseUrl = serverUrl ? normalizeBlueBubblesServerUrl(serverUrl) : undefined;
  return {
    accountId,
    enabled: baseEnabled !== false && accountEnabled,
    name: merged.name?.trim() || undefined,
    config: merged,
    configured,
    baseUrl,
  };
}

export function listEnabledBlueBubblesAccounts(cfg: MoltbotConfig): ResolvedBlueBubblesAccount[] {
  return listBlueBubblesAccountIds(cfg)
    .map((accountId) => resolveBlueBubblesAccount({ cfg, accountId }))
    .filter((account) => account.enabled);
}
