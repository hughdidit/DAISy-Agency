import type { ChannelOutboundAdapter } from "../types.js";
import { chunkText } from "../../../auto-reply/chunk.js";
import { shouldLogVerbose } from "../../../globals.js";
import { sendPollWhatsApp } from "../../../web/outbound.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { isWhatsAppGroupJid, normalizeWhatsAppTarget } from "../../../whatsapp/normalize.js";
import type { ChannelOutboundAdapter } from "../types.js";
import { missingTargetError } from "../../../infra/outbound/target-errors.js";
=======
import { resolveWhatsAppOutboundTarget } from "../../../whatsapp/resolve-outbound-target.js";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> eccd4d8c3 (refactor(whatsapp): share target resolver)
=======
import type { ChannelOutboundAdapter } from "../types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { resolveWhatsAppOutboundTarget } from "../../../whatsapp/resolve-outbound-target.js";
>>>>>>> ed11e93cf (chore(format))
=======
import type { ChannelOutboundAdapter } from "../types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { resolveWhatsAppOutboundTarget } from "../../../whatsapp/resolve-outbound-target.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)

export const whatsappOutbound: ChannelOutboundAdapter = {
  deliveryMode: "gateway",
  chunker: chunkText,
  chunkerMode: "text",
  textChunkLimit: 4000,
  pollMaxOptions: 12,
  resolveTarget: ({ to, allowFrom, mode }) =>
    resolveWhatsAppOutboundTarget({ to, allowFrom, mode }),
  sendText: async ({ to, text, accountId, deps, gifPlayback }) => {
    const send =
      deps?.sendWhatsApp ?? (await import("../../../web/outbound.js")).sendMessageWhatsApp;
    const result = await send(to, text, {
      verbose: false,
      accountId: accountId ?? undefined,
      gifPlayback,
    });
    return { channel: "whatsapp", ...result };
  },
  sendMedia: async ({ to, text, mediaUrl, accountId, deps, gifPlayback }) => {
    const send =
      deps?.sendWhatsApp ?? (await import("../../../web/outbound.js")).sendMessageWhatsApp;
    const result = await send(to, text, {
      verbose: false,
      mediaUrl,
      accountId: accountId ?? undefined,
      gifPlayback,
    });
    return { channel: "whatsapp", ...result };
  },
  sendPoll: async ({ to, poll, accountId }) =>
    await sendPollWhatsApp(to, poll, {
      verbose: shouldLogVerbose(),
      accountId: accountId ?? undefined,
    }),
};
