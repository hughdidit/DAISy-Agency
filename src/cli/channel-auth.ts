import { resolveChannelDefaultAccountId } from "../channels/plugins/helpers.js";
import { getChannelPlugin, normalizeChannelId } from "../channels/plugins/index.js";
import { DEFAULT_CHAT_CHANNEL } from "../channels/registry.js";
import { loadConfig } from "../config/config.js";
import { setVerbose } from "../globals.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";

type ChannelAuthOptions = {
  channel?: string;
  account?: string;
  verbose?: boolean;
};

export async function runChannelLogin(
  opts: ChannelAuthOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const channelInput = opts.channel ?? DEFAULT_CHAT_CHANNEL;
  const channelId = normalizeChannelId(channelInput);
  if (!channelId) {
    throw new Error(`Unsupported channel: ${channelInput}`);
  }
  const plugin = getChannelPlugin(channelId);
  if (!plugin?.auth?.login) {
    throw new Error(`Channel ${channelId} does not support login`);
  }
<<<<<<< HEAD
  // Auth-only flow: do not mutate channel config here.
  setVerbose(Boolean(opts.verbose));
  const cfg = loadConfig();
  const accountId = opts.account?.trim() || resolveChannelDefaultAccountId({ plugin, cfg });
  await plugin.auth.login({
=======
  return { channelInput, channelId, plugin: plugin as ChannelPlugin };
}

function resolveAccountContext(plugin: ChannelPlugin, opts: ChannelAuthOptions) {
  const cfg = loadConfig();
  const accountId = opts.account?.trim() || resolveChannelDefaultAccountId({ plugin, cfg });
  return { cfg, accountId };
}

export async function runChannelLogin(
  opts: ChannelAuthOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const { channelInput, plugin } = resolveChannelPluginForMode(opts, "login");
  const login = plugin.auth?.login;
  if (!login) {
    throw new Error(`Channel ${channelInput} does not support login`);
  }
  // Auth-only flow: do not mutate channel config here.
  setVerbose(Boolean(opts.verbose));
  const { cfg, accountId } = resolveAccountContext(plugin, opts);
  await login({
>>>>>>> 0c1a52307 (fix: align draft/outbound typings and tests)
    cfg,
    accountId,
    runtime,
    verbose: Boolean(opts.verbose),
    channelInput,
  });
}

export async function runChannelLogout(
  opts: ChannelAuthOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
<<<<<<< HEAD
  const channelInput = opts.channel ?? DEFAULT_CHAT_CHANNEL;
  const channelId = normalizeChannelId(channelInput);
  if (!channelId) {
    throw new Error(`Unsupported channel: ${channelInput}`);
  }
  const plugin = getChannelPlugin(channelId);
  if (!plugin?.gateway?.logoutAccount) {
    throw new Error(`Channel ${channelId} does not support logout`);
=======
  const { channelInput, plugin } = resolveChannelPluginForMode(opts, "logout");
  const logoutAccount = plugin.gateway?.logoutAccount;
  if (!logoutAccount) {
    throw new Error(`Channel ${channelInput} does not support logout`);
>>>>>>> 0c1a52307 (fix: align draft/outbound typings and tests)
  }
  // Auth-only flow: resolve account + clear session state only.
  const cfg = loadConfig();
  const accountId = opts.account?.trim() || resolveChannelDefaultAccountId({ plugin, cfg });
  const account = plugin.config.resolveAccount(cfg, accountId);
<<<<<<< HEAD
  await plugin.gateway.logoutAccount({
=======
  await logoutAccount({
>>>>>>> 0c1a52307 (fix: align draft/outbound typings and tests)
    cfg,
    accountId,
    account,
    runtime,
  });
}
