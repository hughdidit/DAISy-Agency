import { sendMessageSlack } from "../../../slack/send.js";
import type { ChannelOutboundAdapter } from "../types.js";

export const slackOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: null,
  textChunkLimit: 4000,
  sendText: async ({ to, text, accountId, deps, replyToId, threadId }) => {
    const send = deps?.sendSlack ?? sendMessageSlack;
    // Use threadId fallback so routed tool notifications stay in the Slack thread.
    const threadTs = replyToId ?? (threadId != null ? String(threadId) : undefined);
    const result = await send(to, text, {
      threadTs,
      accountId: accountId ?? undefined,
    });
    return { channel: "slack", ...result };
  },
<<<<<<< HEAD
  sendMedia: async ({ to, text, mediaUrl, accountId, deps, replyToId, threadId }) => {
=======
  sendMedia: async ({
    to,
    text,
    mediaUrl,
    mediaLocalRoots,
    accountId,
    deps,
    replyToId,
    threadId,
    identity,
  }) => {
>>>>>>> e927fd1e3 (fix: allow agent workspace directories in media local roots (#17136))
    const send = deps?.sendSlack ?? sendMessageSlack;
    // Use threadId fallback so routed tool notifications stay in the Slack thread.
    const threadTs = replyToId ?? (threadId != null ? String(threadId) : undefined);
    const result = await send(to, text, {
      mediaUrl,
      mediaLocalRoots,
      threadTs,
      accountId: accountId ?? undefined,
    });
    return { channel: "slack", ...result };
  },
};
