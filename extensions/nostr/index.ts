<<<<<<< HEAD
import type { MoltbotPluginApi, MoltbotConfig } from "clawdbot/plugin-sdk";
import { emptyPluginConfigSchema } from "clawdbot/plugin-sdk";
=======
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 230ca789e (chore: Lint extensions folder.)

import { nostrPlugin } from "./src/channel.js";
=======
import { nostrPlugin } from "./src/channel.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { NostrProfile } from "./src/config-schema.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { nostrPlugin } from "./src/channel.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { NostrProfile } from "./src/config-schema.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { nostrPlugin } from "./src/channel.js";
import type { NostrProfile } from "./src/config-schema.js";
import { createNostrProfileHttpHandler } from "./src/nostr-profile-http.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { setNostrRuntime, getNostrRuntime } from "./src/runtime.js";
import { createNostrProfileHttpHandler } from "./src/nostr-profile-http.js";
import { resolveNostrAccount } from "./src/types.js";
import type { NostrProfile } from "./src/config-schema.js";

const plugin = {
  id: "nostr",
  name: "Nostr",
  description: "Nostr DM channel plugin via NIP-04",
  configSchema: emptyPluginConfigSchema(),
  register(api: MoltbotPluginApi) {
    setNostrRuntime(api.runtime);
    api.registerChannel({ plugin: nostrPlugin });

    // Register HTTP handler for profile management
    const httpHandler = createNostrProfileHttpHandler({
      getConfigProfile: (accountId: string) => {
        const runtime = getNostrRuntime();
<<<<<<< HEAD
        const cfg = runtime.config.loadConfig() as MoltbotConfig;
=======
        const cfg = runtime.config.loadConfig();
>>>>>>> 230ca789e (chore: Lint extensions folder.)
        const account = resolveNostrAccount({ cfg, accountId });
        return account.profile;
      },
      updateConfigProfile: async (accountId: string, profile: NostrProfile) => {
        const runtime = getNostrRuntime();
<<<<<<< HEAD
        const cfg = runtime.config.loadConfig() as MoltbotConfig;
=======
        const cfg = runtime.config.loadConfig();
>>>>>>> 230ca789e (chore: Lint extensions folder.)

        // Build the config patch for channels.nostr.profile
        const channels = (cfg.channels ?? {}) as Record<string, unknown>;
        const nostrConfig = (channels.nostr ?? {}) as Record<string, unknown>;

        const updatedNostrConfig = {
          ...nostrConfig,
          profile,
        };

        const updatedChannels = {
          ...channels,
          nostr: updatedNostrConfig,
        };

        await runtime.config.writeConfigFile({
          ...cfg,
          channels: updatedChannels,
        });
      },
      getAccountInfo: (accountId: string) => {
        const runtime = getNostrRuntime();
<<<<<<< HEAD
        const cfg = runtime.config.loadConfig() as MoltbotConfig;
=======
        const cfg = runtime.config.loadConfig();
>>>>>>> 230ca789e (chore: Lint extensions folder.)
        const account = resolveNostrAccount({ cfg, accountId });
        if (!account.configured || !account.publicKey) {
          return null;
        }
        return {
          pubkey: account.publicKey,
          relays: account.relays,
        };
      },
      log: api.logger,
    });

    api.registerHttpHandler(httpHandler);
  },
};

export default plugin;
