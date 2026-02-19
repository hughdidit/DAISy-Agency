<<<<<<< HEAD
=======
import type { Message } from "@grammyjs/types";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { TelegramContext } from "./bot/types.js";
>>>>>>> da6de4981 (Telegram: use Grammy types directly, add typed Probe/Audit to plugin interface (#8403))
import { createDedupeCache } from "../infra/dedupe.js";
import type { TelegramContext, TelegramMessage } from "./bot/types.js";
=======
import { createDedupeCache } from "../infra/dedupe.js";
import type { TelegramContext } from "./bot/types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { TelegramContext } from "./bot/types.js";
import { createDedupeCache } from "../infra/dedupe.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { createDedupeCache } from "../infra/dedupe.js";
import type { TelegramContext } from "./bot/types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { TelegramContext } from "./bot/types.js";
import { createDedupeCache } from "../infra/dedupe.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { createDedupeCache } from "../infra/dedupe.js";
import type { TelegramContext } from "./bot/types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

const MEDIA_GROUP_TIMEOUT_MS = 500;
const RECENT_TELEGRAM_UPDATE_TTL_MS = 5 * 60_000;
const RECENT_TELEGRAM_UPDATE_MAX = 2000;

export type MediaGroupEntry = {
  messages: Array<{
    msg: Message;
    ctx: TelegramContext;
  }>;
  timer: ReturnType<typeof setTimeout>;
};

export type TelegramUpdateKeyContext = {
  update?: {
    update_id?: number;
    message?: Message;
    edited_message?: Message;
    channel_post?: Message;
    edited_channel_post?: Message;
  };
  update_id?: number;
  message?: Message;
  channelPost?: Message;
  editedChannelPost?: Message;
  callbackQuery?: { id?: string; message?: Message };
};

export const resolveTelegramUpdateId = (ctx: TelegramUpdateKeyContext) =>
  ctx.update?.update_id ?? ctx.update_id;

export const buildTelegramUpdateKey = (ctx: TelegramUpdateKeyContext) => {
  const updateId = resolveTelegramUpdateId(ctx);
  if (typeof updateId === "number") {
    return `update:${updateId}`;
  }
  const callbackId = ctx.callbackQuery?.id;
  if (callbackId) {
    return `callback:${callbackId}`;
  }
  const msg =
    ctx.message ??
    ctx.channelPost ??
    ctx.editedChannelPost ??
    ctx.update?.message ??
    ctx.update?.edited_message ??
    ctx.update?.channel_post ??
    ctx.update?.edited_channel_post ??
    ctx.callbackQuery?.message;
  const chatId = msg?.chat?.id;
  const messageId = msg?.message_id;
  if (typeof chatId !== "undefined" && typeof messageId === "number") {
    return `message:${chatId}:${messageId}`;
  }
  return undefined;
};

export const createTelegramUpdateDedupe = () =>
  createDedupeCache({
    ttlMs: RECENT_TELEGRAM_UPDATE_TTL_MS,
    maxSize: RECENT_TELEGRAM_UPDATE_MAX,
  });

export { MEDIA_GROUP_TIMEOUT_MS };
