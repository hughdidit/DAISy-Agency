import { chunkText } from "../../../auto-reply/chunk.js";
import { sendMessageIMessage } from "../../../imessage/send.js";
import { resolveChannelMediaMaxBytes } from "../media-limits.js";
import type { ChannelOutboundAdapter } from "../types.js";

function resolveIMessageMaxBytes(params: {
  cfg: Parameters<typeof resolveChannelMediaMaxBytes>[0]["cfg"];
  accountId?: string | null;
}) {
  return resolveChannelMediaMaxBytes({
    cfg: params.cfg,
    resolveChannelLimitMb: ({ cfg, accountId }) =>
      cfg.channels?.imessage?.accounts?.[accountId]?.mediaMaxMb ??
      cfg.channels?.imessage?.mediaMaxMb,
    accountId: params.accountId,
  });
}

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
