import type { OutboundSendDeps } from "../../../infra/outbound/deliver.js";
import { sendMessageSignal } from "../../../signal/send.js";
import {
  createScopedChannelMediaMaxBytesResolver,
  createDirectTextMediaOutbound,
} from "./direct-text-media.js";

function resolveSignalSender(deps: OutboundSendDeps | undefined) {
  return deps?.sendSignal ?? sendMessageSignal;
}

<<<<<<< HEAD
export const signalOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: chunkText,
  chunkerMode: "text",
  textChunkLimit: 4000,
  sendText: async ({ cfg, to, text, accountId, deps }) => {
    const send = deps?.sendSignal ?? sendMessageSignal;
    const maxBytes = resolveSignalMaxBytes({ cfg, accountId });
    const result = await send(to, text, {
      maxBytes,
      accountId: accountId ?? undefined,
    });
    return { channel: "signal", ...result };
  },
  sendMedia: async ({ cfg, to, text, mediaUrl, accountId, deps }) => {
    const send = deps?.sendSignal ?? sendMessageSignal;
    const maxBytes = resolveSignalMaxBytes({ cfg, accountId });
    const result = await send(to, text, {
      mediaUrl,
      maxBytes,
      accountId: accountId ?? undefined,
    });
    return { channel: "signal", ...result };
  },
};
=======
export const signalOutbound = createDirectTextMediaOutbound({
  channel: "signal",
  resolveSender: resolveSignalSender,
  resolveMaxBytes: createScopedChannelMediaMaxBytesResolver("signal"),
  buildTextOptions: ({ maxBytes, accountId }) => ({
    maxBytes,
    accountId: accountId ?? undefined,
  }),
  buildMediaOptions: ({ mediaUrl, maxBytes, accountId, mediaLocalRoots }) => ({
    mediaUrl,
    maxBytes,
    accountId: accountId ?? undefined,
    mediaLocalRoots,
  }),
});
>>>>>>> 66f814a0a (refactor(channels): dedupe plugin routing and channel helpers)
