import { chunkTextWithMode, resolveChunkMode } from "../../auto-reply/chunk.js";
import { loadConfig } from "../../config/config.js";
import { resolveMarkdownTableMode } from "../../config/markdown-tables.js";
import { convertMarkdownTables } from "../../markdown/tables.js";
import type { ReplyPayload } from "../../auto-reply/types.js";
import type { RuntimeEnv } from "../../runtime.js";
import type { createIMessageRpcClient } from "../client.js";
import { sendMessageIMessage } from "../send.js";

<<<<<<< HEAD
=======
type SentMessageCache = {
  remember: (scope: string, lookup: { text?: string; messageId?: string }) => void;
};

>>>>>>> 2a11c09a8 (fix: harden iMessage echo dedupe and reasoning suppression (#25897))
export async function deliverReplies(params: {
  replies: ReplyPayload[];
  target: string;
  client: Awaited<ReturnType<typeof createIMessageRpcClient>>;
  accountId?: string;
  runtime: RuntimeEnv;
  maxBytes: number;
  textLimit: number;
}) {
  const { replies, target, client, runtime, maxBytes, textLimit, accountId } = params;
  const cfg = loadConfig();
  const tableMode = resolveMarkdownTableMode({
    cfg,
    channel: "imessage",
    accountId,
  });
  const chunkMode = resolveChunkMode(cfg, "imessage", accountId);
  for (const payload of replies) {
    const mediaList = payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : []);
    const rawText = payload.text ?? "";
    const text = convertMarkdownTables(rawText, tableMode);
    if (!text && mediaList.length === 0) continue;
    if (mediaList.length === 0) {
<<<<<<< HEAD
=======
      sentMessageCache?.remember(scope, { text });
>>>>>>> 2a11c09a8 (fix: harden iMessage echo dedupe and reasoning suppression (#25897))
      for (const chunk of chunkTextWithMode(text, textLimit, chunkMode)) {
        const sent = await sendMessageIMessage(target, chunk, {
          maxBytes,
          client,
          accountId,
        });
<<<<<<< HEAD
=======
        sentMessageCache?.remember(scope, { text: chunk, messageId: sent.messageId });
>>>>>>> 2a11c09a8 (fix: harden iMessage echo dedupe and reasoning suppression (#25897))
      }
    } else {
      let first = true;
      for (const url of mediaList) {
        const caption = first ? text : "";
        first = false;
        const sent = await sendMessageIMessage(target, caption, {
          mediaUrl: url,
          maxBytes,
          client,
          accountId,
        });
<<<<<<< HEAD
=======
        sentMessageCache?.remember(scope, {
          text: caption || undefined,
          messageId: sent.messageId,
        });
>>>>>>> 2a11c09a8 (fix: harden iMessage echo dedupe and reasoning suppression (#25897))
      }
    }
    runtime.log?.(`imessage: delivered reply to ${target}`);
  }
}
