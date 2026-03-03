<<<<<<< HEAD
import type { ChannelId, ChannelPlugin } from "./types.js";
import type { PluginRegistry } from "../../plugins/registry.js";
import { getActivePluginRegistry } from "../../plugins/runtime.js";
=======
import { createChannelRegistryLoader } from "./registry-loader.js";
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
import type { ChannelId, ChannelPlugin } from "./types.js";

const loadPluginFromRegistry = createChannelRegistryLoader<ChannelPlugin>((entry) => entry.plugin);

export async function loadChannelPlugin(id: ChannelId): Promise<ChannelPlugin | undefined> {
  return loadPluginFromRegistry(id);
}
