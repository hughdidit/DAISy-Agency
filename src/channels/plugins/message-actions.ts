import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { OpenClawConfig } from "../../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { ChannelMessageActionContext, ChannelMessageActionName } from "./types.js";
<<<<<<< HEAD
=======
import { getChannelPlugin, listChannelPlugins } from "./index.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { getChannelPlugin, listChannelPlugins } from "./index.js";
import type { ChannelMessageActionContext, ChannelMessageActionName } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)

import type { OpenClawConfig } from "../../config/config.js";
import { getChannelPlugin, listChannelPlugins } from "./index.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { ChannelMessageActionContext, ChannelMessageActionName } from "./types.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { getChannelPlugin, listChannelPlugins } from "./index.js";
import type { ChannelMessageActionContext, ChannelMessageActionName } from "./types.js";

export function listChannelMessageActions(cfg: OpenClawConfig): ChannelMessageActionName[] {
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

export function supportsChannelMessageButtons(cfg: OpenClawConfig): boolean {
  for (const plugin of listChannelPlugins()) {
    if (plugin.actions?.supportsButtons?.({ cfg })) {
      return true;
    }
  }
  return false;
}

export function supportsChannelMessageCards(cfg: OpenClawConfig): boolean {
  for (const plugin of listChannelPlugins()) {
    if (plugin.actions?.supportsCards?.({ cfg })) {
      return true;
    }
  }
  return false;
=======
  return supportsMessageFeature(cfg, (actions) => actions?.supportsCards?.({ cfg }) === true);
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
}

export function supportsChannelMessageCardsForChannel(params: {
  cfg: OpenClawConfig;
  channel?: string;
}): boolean {
  return supportsMessageFeatureForChannel(
    params,
    (actions) => actions.supportsCards?.(params) === true,
  );
}

function supportsMessageFeature(
  cfg: OpenClawConfig,
  check: (actions: ChannelActions) => boolean,
): boolean {
  for (const plugin of listChannelPlugins()) {
    if (plugin.actions && check(plugin.actions)) {
      return true;
    }
  }
  return false;
}

function supportsMessageFeatureForChannel(
  params: {
    cfg: OpenClawConfig;
    channel?: string;
  },
  check: (actions: ChannelActions) => boolean,
): boolean {
  if (!params.channel) {
    return false;
  }
  const plugin = getChannelPlugin(params.channel as Parameters<typeof getChannelPlugin>[0]);
  return plugin?.actions ? check(plugin.actions) : false;
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
