<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { type ChannelId, getChannelPlugin } from "../../channels/plugins/index.js";
<<<<<<< HEAD
<<<<<<< HEAD
import { formatCliCommand } from "../../cli/command-format.js";
import { type MoltbotConfig, readConfigFileSnapshot } from "../../config/config.js";
=======
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
=======
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { OpenClawConfig } from "../../config/config.js";
import { type ChannelId, getChannelPlugin } from "../../channels/plugins/index.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { type ChannelId, getChannelPlugin } from "../../channels/plugins/index.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { OpenClawConfig } from "../../config/config.js";
import { type ChannelId, getChannelPlugin } from "../../channels/plugins/index.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { type ChannelId, getChannelPlugin } from "../../channels/plugins/index.js";
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { DEFAULT_ACCOUNT_ID } from "../../routing/session-key.js";
import { defaultRuntime, type RuntimeEnv } from "../../runtime.js";
import { requireValidConfigSnapshot } from "../config-validation.js";

export type ChatChannel = ChannelId;

export async function requireValidConfig(
  runtime: RuntimeEnv = defaultRuntime,
<<<<<<< HEAD
): Promise<MoltbotConfig | null> {
  const snapshot = await readConfigFileSnapshot();
  if (snapshot.exists && !snapshot.valid) {
    const issues =
      snapshot.issues.length > 0
        ? snapshot.issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n")
        : "Unknown validation issue.";
    runtime.error(`Config invalid:\n${issues}`);
    runtime.error(`Fix the config or run ${formatCliCommand("moltbot doctor")}.`);
    runtime.exit(1);
    return null;
  }
  return snapshot.config;
=======
): Promise<OpenClawConfig | null> {
  return await requireValidConfigSnapshot(runtime);
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
}

export function formatAccountLabel(params: { accountId: string; name?: string }) {
  const base = params.accountId || DEFAULT_ACCOUNT_ID;
  if (params.name?.trim()) {
    return `${base} (${params.name.trim()})`;
  }
  return base;
}

export const channelLabel = (channel: ChatChannel) => {
  const plugin = getChannelPlugin(channel);
  return plugin?.meta.label ?? channel;
};

export function formatChannelAccountLabel(params: {
  channel: ChatChannel;
  accountId: string;
  name?: string;
  channelStyle?: (value: string) => string;
  accountStyle?: (value: string) => string;
}): string {
  const channelText = channelLabel(params.channel);
  const accountText = formatAccountLabel({
    accountId: params.accountId,
    name: params.name,
  });
  const styledChannel = params.channelStyle ? params.channelStyle(channelText) : channelText;
  const styledAccount = params.accountStyle ? params.accountStyle(accountText) : accountText;
  return `${styledChannel} ${styledAccount}`;
}

export function shouldUseWizard(params?: { hasFlags?: boolean }) {
  return params?.hasFlags === false;
}
