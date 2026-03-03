import { getChannelPlugin } from "../../channels/plugins/index.js";
import type { ChannelId, ChannelSetupInput } from "../../channels/plugins/types.js";
import type { OpenClawConfig } from "../../config/config.js";
=======
import { getChannelPlugin } from "../../channels/plugins/index.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { getChannelPlugin } from "../../channels/plugins/index.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { normalizeAccountId } from "../../routing/session-key.js";

type ChatChannel = ChannelId;

export function applyAccountName(params: {
  cfg: OpenClawConfig;
  channel: ChatChannel;
  accountId: string;
  name?: string;
}): OpenClawConfig {
  const accountId = normalizeAccountId(params.accountId);
  const plugin = getChannelPlugin(params.channel);
  const apply = plugin?.setup?.applyAccountName;
  return apply ? apply({ cfg: params.cfg, accountId, name: params.name }) : params.cfg;
}

export function applyChannelAccountConfig(params: {
  cfg: OpenClawConfig;
  channel: ChatChannel;
  accountId: string;
  name?: string;
  token?: string;
  tokenFile?: string;
  botToken?: string;
  appToken?: string;
  signalNumber?: string;
  cliPath?: string;
  dbPath?: string;
  service?: "imessage" | "sms" | "auto";
  region?: string;
  authDir?: string;
  httpUrl?: string;
  httpHost?: string;
  httpPort?: string;
  webhookPath?: string;
  webhookUrl?: string;
  audienceType?: string;
  audience?: string;
  useEnv?: boolean;
  homeserver?: string;
  userId?: string;
  accessToken?: string;
  password?: string;
  deviceName?: string;
  initialSyncLimit?: number;
  ship?: string;
  url?: string;
  code?: string;
  groupChannels?: string[];
  dmAllowlist?: string[];
  autoDiscoverChannels?: boolean;
}): OpenClawConfig {
  const accountId = normalizeAccountId(params.accountId);
  const plugin = getChannelPlugin(params.channel);
  const apply = plugin?.setup?.applyAccountConfig;
  if (!apply) {
    return params.cfg;
  }
  return apply({ cfg: params.cfg, accountId, input: params.input });
}
