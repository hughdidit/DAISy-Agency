<<<<<<< HEAD
import type { ChannelGroupContext, GroupToolPolicyConfig } from "clawdbot/plugin-sdk";

=======
import type { ChannelGroupContext, GroupToolPolicyConfig } from "openclaw/plugin-sdk";
import type { CoreConfig } from "./types.js";
import { resolveMatrixAccountConfig } from "./matrix/accounts.js";
>>>>>>> 2b685b08c (fix: harden matrix multi-account routing (#7286) (thanks @emonty))
import { resolveMatrixRoomConfig } from "./matrix/monitor/rooms.js";
import type { CoreConfig } from "./types.js";

export function resolveMatrixGroupRequireMention(params: ChannelGroupContext): boolean {
  const rawGroupId = params.groupId?.trim() ?? "";
  let roomId = rawGroupId;
  const lower = roomId.toLowerCase();
  if (lower.startsWith("matrix:")) {
    roomId = roomId.slice("matrix:".length).trim();
  }
  if (roomId.toLowerCase().startsWith("channel:")) {
    roomId = roomId.slice("channel:".length).trim();
  }
  if (roomId.toLowerCase().startsWith("room:")) {
    roomId = roomId.slice("room:".length).trim();
  }
  const groupChannel = params.groupChannel?.trim() ?? "";
  const aliases = groupChannel ? [groupChannel] : [];
  const cfg = params.cfg as CoreConfig;
  const matrixConfig = resolveMatrixAccountConfig({ cfg, accountId: params.accountId });
  const resolved = resolveMatrixRoomConfig({
    rooms: matrixConfig.groups ?? matrixConfig.rooms,
    roomId,
    aliases,
    name: groupChannel || undefined,
  }).config;
  if (resolved) {
    if (resolved.autoReply === true) return false;
    if (resolved.autoReply === false) return true;
    if (typeof resolved.requireMention === "boolean") return resolved.requireMention;
  }
  return true;
}

export function resolveMatrixGroupToolPolicy(
  params: ChannelGroupContext,
): GroupToolPolicyConfig | undefined {
  const rawGroupId = params.groupId?.trim() ?? "";
  let roomId = rawGroupId;
  const lower = roomId.toLowerCase();
  if (lower.startsWith("matrix:")) {
    roomId = roomId.slice("matrix:".length).trim();
  }
  if (roomId.toLowerCase().startsWith("channel:")) {
    roomId = roomId.slice("channel:".length).trim();
  }
  if (roomId.toLowerCase().startsWith("room:")) {
    roomId = roomId.slice("room:".length).trim();
  }
  const groupChannel = params.groupChannel?.trim() ?? "";
  const aliases = groupChannel ? [groupChannel] : [];
  const cfg = params.cfg as CoreConfig;
  const matrixConfig = resolveMatrixAccountConfig({ cfg, accountId: params.accountId });
  const resolved = resolveMatrixRoomConfig({
    rooms: matrixConfig.groups ?? matrixConfig.rooms,
    roomId,
    aliases,
    name: groupChannel || undefined,
  }).config;
  return resolved?.tools;
}
