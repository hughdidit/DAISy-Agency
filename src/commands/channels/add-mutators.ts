import type { ChannelId, ChannelSetupInput } from "../../channels/plugins/types.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "../../config/config.js";
=======
import type { OpenClawConfig } from "../../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { getChannelPlugin } from "../../channels/plugins/index.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { getChannelPlugin } from "../../channels/plugins/index.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { normalizeAccountId } from "../../routing/session-key.js";

type ChatChannel = ChannelId;

export function applyAccountName(params: {
  cfg: MoltbotConfig;
  channel: ChatChannel;
  accountId: string;
  name?: string;
}): MoltbotConfig {
  const accountId = normalizeAccountId(params.accountId);
  const plugin = getChannelPlugin(params.channel);
  const apply = plugin?.setup?.applyAccountName;
  return apply ? apply({ cfg: params.cfg, accountId, name: params.name }) : params.cfg;
}

export function applyChannelAccountConfig(params: {
  cfg: MoltbotConfig;
  channel: ChatChannel;
  accountId: string;
<<<<<<< HEAD
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
}): MoltbotConfig {
=======
  input: ChannelSetupInput;
}): OpenClawConfig {
>>>>>>> 3150ece95 (refactor(channels): pass setup input to mutator)
  const accountId = normalizeAccountId(params.accountId);
  const plugin = getChannelPlugin(params.channel);
  const apply = plugin?.setup?.applyAccountConfig;
  if (!apply) {
    return params.cfg;
  }
  return apply({ cfg: params.cfg, accountId, input: params.input });
}
