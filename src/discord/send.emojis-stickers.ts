import { Routes } from "discord-api-types/v10";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { DiscordEmojiUpload, DiscordReactOpts, DiscordStickerUpload } from "./send.types.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { DiscordEmojiUpload, DiscordReactOpts, DiscordStickerUpload } from "./send.types.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { loadWebMediaRaw } from "../web/media.js";
import { normalizeEmojiName, resolveDiscordRest } from "./send.shared.js";
import type { DiscordEmojiUpload, DiscordReactOpts, DiscordStickerUpload } from "./send.types.js";
import { DISCORD_MAX_EMOJI_BYTES, DISCORD_MAX_STICKER_BYTES } from "./send.types.js";

export async function listGuildEmojisDiscord(guildId: string, opts: DiscordReactOpts = {}) {
  const rest = resolveDiscordRest(opts);
  return await rest.get(Routes.guildEmojis(guildId));
}

export async function uploadEmojiDiscord(payload: DiscordEmojiUpload, opts: DiscordReactOpts = {}) {
  const rest = resolveDiscordRest(opts);
  const media = await loadWebMediaRaw(payload.mediaUrl, DISCORD_MAX_EMOJI_BYTES);
  const contentType = media.contentType?.toLowerCase();
  if (
    !contentType ||
    !["image/png", "image/jpeg", "image/jpg", "image/gif"].includes(contentType)
  ) {
    throw new Error("Discord emoji uploads require a PNG, JPG, or GIF image");
  }
  const image = `data:${contentType};base64,${media.buffer.toString("base64")}`;
  const roleIds = (payload.roleIds ?? []).map((id) => id.trim()).filter(Boolean);
  return await rest.post(Routes.guildEmojis(payload.guildId), {
    body: {
      name: normalizeEmojiName(payload.name, "Emoji name"),
      image,
      roles: roleIds.length ? roleIds : undefined,
    },
  });
}

export async function uploadStickerDiscord(
  payload: DiscordStickerUpload,
  opts: DiscordReactOpts = {},
) {
  const rest = resolveDiscordRest(opts);
  const media = await loadWebMediaRaw(payload.mediaUrl, DISCORD_MAX_STICKER_BYTES);
  const contentType = media.contentType?.toLowerCase();
  if (!contentType || !["image/png", "image/apng", "application/json"].includes(contentType)) {
    throw new Error("Discord sticker uploads require a PNG, APNG, or Lottie JSON file");
  }
  return await rest.post(Routes.guildStickers(payload.guildId), {
    body: {
      name: normalizeEmojiName(payload.name, "Sticker name"),
      description: normalizeEmojiName(payload.description, "Sticker description"),
      tags: normalizeEmojiName(payload.tags, "Sticker tags"),
      files: [
        {
          data: media.buffer,
          name: media.fileName ?? "sticker",
          contentType,
        },
      ],
    },
  });
}
