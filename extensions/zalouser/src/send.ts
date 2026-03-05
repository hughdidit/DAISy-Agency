import type { ZaloEventMessage, ZaloSendOptions, ZaloSendResult } from "./types.js";
import {
  sendZaloDeliveredEvent,
  sendZaloLink,
  sendZaloReaction,
  sendZaloSeenEvent,
  sendZaloTextMessage,
  sendZaloTypingEvent,
} from "./zalo-js.js";

export type ZalouserSendOptions = ZaloSendOptions;
export type ZalouserSendResult = ZaloSendResult;

function resolveProfile(options: ZalouserSendOptions): string {
  return options.profile || process.env.ZCA_PROFILE || "default";
}

function appendCaptionAndGroupFlags(args: string[], options: ZalouserSendOptions): void {
  if (options.caption) {
    args.push("-m", options.caption.slice(0, 2000));
  }
  if (options.isGroup) {
    args.push("-g");
  }
}

async function runSendCommand(
  args: string[],
  profile: string,
  fallbackError: string,
): Promise<ZalouserSendResult> {
  try {
    const result = await runZca(args, { profile });
    if (result.ok) {
      return { ok: true, messageId: extractMessageId(result.stdout) };
    }
    return { ok: false, error: result.stderr || fallbackError };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendMessageZalouser(
  threadId: string,
  text: string,
  options: ZalouserSendOptions = {},
): Promise<ZalouserSendResult> {
  return await sendZaloTextMessage(threadId, text, options);
}

export async function sendImageZalouser(
  threadId: string,
  imageUrl: string,
  options: ZalouserSendOptions = {},
): Promise<ZalouserSendResult> {
  return await sendZaloTextMessage(threadId, options.caption ?? "", {
    ...options,
    mediaUrl: imageUrl,
  });
}

export async function sendLinkZalouser(
  threadId: string,
  url: string,
  options: ZalouserSendOptions = {},
): Promise<ZalouserSendResult> {
  return await sendZaloLink(threadId, url, options);
}

export async function sendTypingZalouser(
  threadId: string,
  options: Pick<ZalouserSendOptions, "profile" | "isGroup"> = {},
): Promise<void> {
  await sendZaloTypingEvent(threadId, options);
}

export async function sendReactionZalouser(params: {
  threadId: string;
  msgId: string;
  cliMsgId: string;
  emoji: string;
  remove?: boolean;
  profile?: string;
  isGroup?: boolean;
}): Promise<ZalouserSendResult> {
  const result = await sendZaloReaction({
    profile: params.profile,
    threadId: params.threadId,
    isGroup: params.isGroup,
    msgId: params.msgId,
    cliMsgId: params.cliMsgId,
    emoji: params.emoji,
    remove: params.remove,
  });
  return {
    ok: result.ok,
    error: result.error,
  };
}

export async function sendDeliveredZalouser(params: {
  profile?: string;
  isGroup?: boolean;
  message: ZaloEventMessage;
  isSeen?: boolean;
}): Promise<void> {
  await sendZaloDeliveredEvent(params);
}

export async function sendSeenZalouser(params: {
  profile?: string;
  isGroup?: boolean;
  message: ZaloEventMessage;
}): Promise<void> {
  await sendZaloSeenEvent(params);
}
