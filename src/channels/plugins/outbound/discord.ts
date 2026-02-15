import { sendMessageDiscord, sendPollDiscord } from "../../../discord/send.js";
import type { ChannelOutboundAdapter } from "../types.js";

export const discordOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: null,
  textChunkLimit: 2000,
  pollMaxOptions: 10,
  sendText: async ({ to, text, accountId, deps, replyToId }) => {
    const send = deps?.sendDiscord ?? sendMessageDiscord;
    const result = await send(to, text, {
      verbose: false,
      replyTo: replyToId ?? undefined,
      accountId: accountId ?? undefined,
    });
    return { channel: "discord", ...result };
  },
<<<<<<< HEAD
  sendMedia: async ({ to, text, mediaUrl, accountId, deps, replyToId }) => {
=======
  sendMedia: async ({
    to,
    text,
    mediaUrl,
    mediaLocalRoots,
    accountId,
    deps,
    replyToId,
    silent,
  }) => {
>>>>>>> e927fd1e3 (fix: allow agent workspace directories in media local roots (#17136))
    const send = deps?.sendDiscord ?? sendMessageDiscord;
    const result = await send(to, text, {
      verbose: false,
      mediaUrl,
      mediaLocalRoots,
      replyTo: replyToId ?? undefined,
      accountId: accountId ?? undefined,
    });
    return { channel: "discord", ...result };
  },
  sendPoll: async ({ to, poll, accountId }) =>
    await sendPollDiscord(to, poll, {
      accountId: accountId ?? undefined,
    }),
};
