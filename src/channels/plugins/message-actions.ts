import type { AgentToolResult } from "@mariozechner/pi-agent-core";
<<<<<<< HEAD
=======
import type { OpenClawConfig } from "../../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
import type { ChannelMessageActionContext, ChannelMessageActionName } from "./types.js";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { getChannelPlugin, listChannelPlugins } from "./index.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { getChannelPlugin, listChannelPlugins } from "./index.js";
import type { ChannelMessageActionContext, ChannelMessageActionName } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)

import type { MoltbotConfig } from "../../config/config.js";
import { getChannelPlugin, listChannelPlugins } from "./index.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { ChannelMessageActionContext, ChannelMessageActionName } from "./types.js";
import { getChannelPlugin, listChannelPlugins } from "./index.js";

export function listChannelMessageActions(cfg: MoltbotConfig): ChannelMessageActionName[] {
  const actions = new Set<ChannelMessageActionName>(["send", "broadcast"]);
  for (const plugin of listChannelPlugins()) {
    const list = plugin.actions?.listActions?.({ cfg });
    if (!list) {
      continue;
    }
    for (const action of list) {
      actions.add(action);
    }
  }
  return Array.from(actions);
}

export function supportsChannelMessageButtons(cfg: MoltbotConfig): boolean {
  for (const plugin of listChannelPlugins()) {
    if (plugin.actions?.supportsButtons?.({ cfg })) {
      return true;
    }
  }
  return false;
}

<<<<<<< HEAD
export function supportsChannelMessageCards(cfg: MoltbotConfig): boolean {
=======
export function supportsChannelMessageButtonsForChannel(params: {
  cfg: OpenClawConfig;
  channel?: string;
}): boolean {
  if (!params.channel) {
    return false;
  }
  const plugin = getChannelPlugin(params.channel as Parameters<typeof getChannelPlugin>[0]);
  return plugin?.actions?.supportsButtons?.({ cfg: params.cfg }) === true;
}

export function supportsChannelMessageCards(cfg: OpenClawConfig): boolean {
>>>>>>> c8a536e30 (fix(agents): scope message tool schema by channel (#18215))
  for (const plugin of listChannelPlugins()) {
    if (plugin.actions?.supportsCards?.({ cfg })) {
      return true;
    }
  }
  return false;
}

export function supportsChannelMessageCardsForChannel(params: {
  cfg: OpenClawConfig;
  channel?: string;
}): boolean {
  if (!params.channel) {
    return false;
  }
  const plugin = getChannelPlugin(params.channel as Parameters<typeof getChannelPlugin>[0]);
  return plugin?.actions?.supportsCards?.({ cfg: params.cfg }) === true;
}

export async function dispatchChannelMessageAction(
  ctx: ChannelMessageActionContext,
): Promise<AgentToolResult<unknown> | null> {
  const plugin = getChannelPlugin(ctx.channel);
  if (!plugin?.actions?.handleAction) {
    return null;
  }
  if (plugin.actions.supportsAction && !plugin.actions.supportsAction({ action: ctx.action })) {
    return null;
  }
  return await plugin.actions.handleAction(ctx);
}
