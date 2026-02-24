import type { OpenClawConfig } from "../config/config.js";
import type { SignalAccountConfig } from "../config/types.js";
<<<<<<< HEAD
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key.js";
=======
import { resolveAccountEntry } from "../routing/account-lookup.js";
import { normalizeAccountId } from "../routing/session-key.js";
>>>>>>> f97c0922e (fix(security): harden account-key handling against prototype pollution)

export type ResolvedSignalAccount = {
  accountId: string;
  enabled: boolean;
  name?: string;
  baseUrl: string;
  configured: boolean;
  config: SignalAccountConfig;
};

function listConfiguredAccountIds(cfg: OpenClawConfig): string[] {
  const accounts = cfg.channels?.signal?.accounts;
  if (!accounts || typeof accounts !== "object") return [];
  return Object.keys(accounts).filter(Boolean);
}

export function listSignalAccountIds(cfg: OpenClawConfig): string[] {
  const ids = listConfiguredAccountIds(cfg);
  if (ids.length === 0) return [DEFAULT_ACCOUNT_ID];
  return ids.sort((a, b) => a.localeCompare(b));
}

export function resolveDefaultSignalAccountId(cfg: OpenClawConfig): string {
  const ids = listSignalAccountIds(cfg);
  if (ids.includes(DEFAULT_ACCOUNT_ID)) return DEFAULT_ACCOUNT_ID;
  return ids[0] ?? DEFAULT_ACCOUNT_ID;
}

function resolveAccountConfig(
  cfg: OpenClawConfig,
  accountId: string,
): SignalAccountConfig | undefined {
<<<<<<< HEAD
  const accounts = cfg.channels?.signal?.accounts;
  if (!accounts || typeof accounts !== "object") return undefined;
  return accounts[accountId] as SignalAccountConfig | undefined;
=======
  return resolveAccountEntry(cfg.channels?.signal?.accounts, accountId);
>>>>>>> f97c0922e (fix(security): harden account-key handling against prototype pollution)
}

function mergeSignalAccountConfig(cfg: OpenClawConfig, accountId: string): SignalAccountConfig {
  const { accounts: _ignored, ...base } = (cfg.channels?.signal ?? {}) as SignalAccountConfig & {
    accounts?: unknown;
  };
  const account = resolveAccountConfig(cfg, accountId) ?? {};
  return { ...base, ...account };
}

export function resolveSignalAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): ResolvedSignalAccount {
  const accountId = normalizeAccountId(params.accountId);
  const baseEnabled = params.cfg.channels?.signal?.enabled !== false;
  const merged = mergeSignalAccountConfig(params.cfg, accountId);
  const accountEnabled = merged.enabled !== false;
  const enabled = baseEnabled && accountEnabled;
  const host = merged.httpHost?.trim() || "127.0.0.1";
  const port = merged.httpPort ?? 8080;
  const baseUrl = merged.httpUrl?.trim() || `http://${host}:${port}`;
  const configured = Boolean(
    merged.account?.trim() ||
    merged.httpUrl?.trim() ||
    merged.cliPath?.trim() ||
    merged.httpHost?.trim() ||
    typeof merged.httpPort === "number" ||
    typeof merged.autoStart === "boolean",
  );
  return {
    accountId,
    enabled,
    name: merged.name?.trim() || undefined,
    baseUrl,
    configured,
    config: merged,
  };
}

export function listEnabledSignalAccounts(cfg: OpenClawConfig): ResolvedSignalAccount[] {
  return listSignalAccountIds(cfg)
    .map((accountId) => resolveSignalAccount({ cfg, accountId }))
    .filter((account) => account.enabled);
}
