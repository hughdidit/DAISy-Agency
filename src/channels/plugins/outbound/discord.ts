import type { ChannelOutboundAdapter } from "../types.js";
import { sendMessageDiscord, sendPollDiscord } from "../../../discord/send.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { ChannelOutboundAdapter } from "../types.js";
=======
import { normalizeDiscordOutboundTarget } from "../normalize/discord.js";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 3238bd78d (fix(discord): normalize bare numeric IDs in outbound target resolution)
=======
import type { ChannelOutboundAdapter } from "../types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { normalizeDiscordOutboundTarget } from "../normalize/discord.js";
>>>>>>> ed11e93cf (chore(format))
=======
import type { ChannelOutboundAdapter } from "../types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { normalizeDiscordOutboundTarget } from "../normalize/discord.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)

export const discordOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: null,
  textChunkLimit: 2000,
  pollMaxOptions: 10,
  resolveTarget: ({ to }) => normalizeDiscordOutboundTarget(to),
  sendText: async ({ to, text, accountId, deps, replyToId, silent }) => {
    const send = deps?.sendDiscord ?? sendMessageDiscord;
    const result = await send(to, text, {
      verbose: false,
      replyTo: replyToId ?? undefined,
      accountId: accountId ?? undefined,
      silent: silent ?? undefined,
    });
    return { channel: "discord", ...result };
  },
  sendMedia: async ({ to, text, mediaUrl, accountId, deps, replyToId, silent }) => {
    const send = deps?.sendDiscord ?? sendMessageDiscord;
    const result = await send(to, text, {
      verbose: false,
      mediaUrl,
      replyTo: replyToId ?? undefined,
      accountId: accountId ?? undefined,
      silent: silent ?? undefined,
    });
    return { channel: "discord", ...result };
  },
  sendPoll: async ({ to, poll, accountId, silent }) =>
    await sendPollDiscord(to, poll, {
      accountId: accountId ?? undefined,
      silent: silent ?? undefined,
    }),
};
