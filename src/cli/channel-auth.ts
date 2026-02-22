import { resolveChannelDefaultAccountId } from "../channels/plugins/helpers.js";
import { getChannelPlugin, normalizeChannelId } from "../channels/plugins/index.js";
import { loadConfig, type OpenClawConfig } from "../config/config.js";
import { setVerbose } from "../globals.js";
import { resolveMessageChannelSelection } from "../infra/outbound/channel-selection.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";

type ChannelAuthOptions = {
  channel?: string;
  account?: string;
  verbose?: boolean;
};

<<<<<<< HEAD
export async function runChannelLogin(
  opts: ChannelAuthOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const channelInput = opts.channel ?? DEFAULT_CHAT_CHANNEL;
=======
type ChannelPlugin = NonNullable<ReturnType<typeof getChannelPlugin>>;
type ChannelAuthMode = "login" | "logout";

async function resolveChannelPluginForMode(
  opts: ChannelAuthOptions,
  mode: ChannelAuthMode,
  cfg: OpenClawConfig,
): Promise<{ channelInput: string; channelId: string; plugin: ChannelPlugin }> {
  const explicitChannel = opts.channel?.trim();
  const channelInput = explicitChannel
    ? explicitChannel
    : (await resolveMessageChannelSelection({ cfg })).channel;
>>>>>>> 1cd3b3090 (fix: stop hardcoded channel fallback and auto-pick sole configured channel (#23357) (thanks @lbo728))
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

function resolveAccountContext(
  plugin: ChannelPlugin,
  opts: ChannelAuthOptions,
  cfg: OpenClawConfig,
) {
  const accountId = opts.account?.trim() || resolveChannelDefaultAccountId({ plugin, cfg });
  return { accountId };
}

export async function runChannelLogin(
  opts: ChannelAuthOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const cfg = loadConfig();
  const { channelInput, plugin } = await resolveChannelPluginForMode(opts, "login", cfg);
  const login = plugin.auth?.login;
  if (!login) {
    throw new Error(`Channel ${channelInput} does not support login`);
  }
  // Auth-only flow: do not mutate channel config here.
  setVerbose(Boolean(opts.verbose));
  const { accountId } = resolveAccountContext(plugin, opts, cfg);
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
=======
  const cfg = loadConfig();
  const { channelInput, plugin } = await resolveChannelPluginForMode(opts, "logout", cfg);
>>>>>>> 1cd3b3090 (fix: stop hardcoded channel fallback and auto-pick sole configured channel (#23357) (thanks @lbo728))
  const logoutAccount = plugin.gateway?.logoutAccount;
  if (!logoutAccount) {
    throw new Error(`Channel ${channelInput} does not support logout`);
>>>>>>> 0c1a52307 (fix: align draft/outbound typings and tests)
  }
  // Auth-only flow: resolve account + clear session state only.
<<<<<<< HEAD
  const cfg = loadConfig();
  const accountId = opts.account?.trim() || resolveChannelDefaultAccountId({ plugin, cfg });
=======
  const { accountId } = resolveAccountContext(plugin, opts, cfg);
>>>>>>> 1cd3b3090 (fix: stop hardcoded channel fallback and auto-pick sole configured channel (#23357) (thanks @lbo728))
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
