import { sendMessageIMessage } from "../../../imessage/send.js";
import type { OutboundSendDeps } from "../../../infra/outbound/deliver.js";
import {
  createScopedChannelMediaMaxBytesResolver,
  createDirectTextMediaOutbound,
} from "./direct-text-media.js";

function resolveIMessageSender(deps: OutboundSendDeps | undefined) {
  return deps?.sendIMessage ?? sendMessageIMessage;
}

<<<<<<< HEAD
export const imessageOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: chunkText,
  chunkerMode: "text",
  textChunkLimit: 4000,
  sendText: async ({ cfg, to, text, accountId, deps, replyToId }) => {
    const send = deps?.sendIMessage ?? sendMessageIMessage;
    const maxBytes = resolveIMessageMaxBytes({ cfg, accountId });
    const result = await send(to, text, {
      maxBytes,
      accountId: accountId ?? undefined,
      replyToId: replyToId ?? undefined,
    });
    return { channel: "imessage", ...result };
  },
<<<<<<< HEAD
  sendMedia: async ({ cfg, to, text, mediaUrl, accountId, deps }) => {
=======
  sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, accountId, deps, replyToId }) => {
>>>>>>> 087dca8fa (fix(subagent): harden read-tool overflow guards and sticky reply threading (#19508))
    const send = deps?.sendIMessage ?? sendMessageIMessage;
    const maxBytes = resolveIMessageMaxBytes({ cfg, accountId });
    const result = await send(to, text, {
      mediaUrl,
      maxBytes,
      accountId: accountId ?? undefined,
<<<<<<< HEAD
=======
      replyToId: replyToId ?? undefined,
      mediaLocalRoots,
>>>>>>> 087dca8fa (fix(subagent): harden read-tool overflow guards and sticky reply threading (#19508))
    });
    return { channel: "imessage", ...result };
  },
};
=======
export const imessageOutbound = createDirectTextMediaOutbound({
  channel: "imessage",
  resolveSender: resolveIMessageSender,
  resolveMaxBytes: createScopedChannelMediaMaxBytesResolver("imessage"),
  buildTextOptions: ({ maxBytes, accountId, replyToId }) => ({
    maxBytes,
    accountId: accountId ?? undefined,
    replyToId: replyToId ?? undefined,
  }),
  buildMediaOptions: ({ mediaUrl, maxBytes, accountId, replyToId, mediaLocalRoots }) => ({
    mediaUrl,
    maxBytes,
    accountId: accountId ?? undefined,
    replyToId: replyToId ?? undefined,
    mediaLocalRoots,
  }),
});
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
