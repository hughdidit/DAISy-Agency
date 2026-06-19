import type { BaseTokenResolution } from "../channels/plugins/types.js";
import type { OpenClawConfig } from "../config/config.js";
import { coerceSecretRef, normalizeResolvedSecretInputString } from "../config/types.secrets.js";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key.js";

export type DiscordTokenSource = "env" | "config" | "none";

export type DiscordTokenResolution = BaseTokenResolution & {
  source: DiscordTokenSource;
};

export function normalizeDiscordToken(raw: unknown, path: string): string | undefined {
  const trimmed = normalizeResolvedSecretInputString({ value: raw, path });
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace(/^Bot\s+/i, "");
}

function hasUnresolvedSecretRefToken(cfg: OpenClawConfig | undefined, raw: unknown): boolean {
  return coerceSecretRef(raw, cfg?.secrets?.defaults) !== null;
}

export function resolveDiscordToken(
  cfg?: OpenClawConfig,
  opts: { accountId?: string | null; envToken?: string | null } = {},
): DiscordTokenResolution {
  const accountId = normalizeAccountId(opts.accountId);
  const discordCfg = cfg?.channels?.discord;
  const resolveAccountCfg = (id: string) => {
    const accounts = discordCfg?.accounts;
    if (!accounts || typeof accounts !== "object" || Array.isArray(accounts)) {
      return undefined;
    }
    const direct = accounts[id];
    if (direct) {
      return direct;
    }
    const matchKey = Object.keys(accounts).find((key) => normalizeAccountId(key) === id);
    return matchKey ? accounts[matchKey] : undefined;
  };
  const accountCfg = resolveAccountCfg(accountId);
  const hasAccountToken = Boolean(
    accountCfg &&
    Object.prototype.hasOwnProperty.call(accountCfg as Record<string, unknown>, "token"),
  );
  const accountTokenRaw = (accountCfg as { token?: unknown } | undefined)?.token ?? undefined;
  const isAccountTokenUnresolved = hasUnresolvedSecretRefToken(cfg, accountTokenRaw);
  const accountToken = isAccountTokenUnresolved
    ? undefined
    : normalizeDiscordToken(accountTokenRaw, `channels.discord.accounts.${accountId}.token`);
  if (accountToken) {
    return { token: accountToken, source: "config" };
  }
  if (isAccountTokenUnresolved) {
    return { token: "", source: "config" };
  }
  if (hasAccountToken) {
    return { token: "", source: "none" };
  }

  const configTokenRaw = discordCfg?.token ?? undefined;
  const isConfigTokenUnresolved = hasUnresolvedSecretRefToken(cfg, configTokenRaw);
  const configToken = isConfigTokenUnresolved
    ? undefined
    : normalizeDiscordToken(configTokenRaw, "channels.discord.token");
  if (configToken) {
    return { token: configToken, source: "config" };
  }
  if (isConfigTokenUnresolved) {
    return { token: "", source: "config" };
  }

  const allowEnv = accountId === DEFAULT_ACCOUNT_ID;
  const envToken = allowEnv
    ? normalizeDiscordToken(opts.envToken ?? process.env.DISCORD_BOT_TOKEN, "DISCORD_BOT_TOKEN")
    : undefined;
  if (envToken) {
    return { token: envToken, source: "env" };
  }

  return { token: "", source: "none" };
}
