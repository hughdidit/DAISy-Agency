import type { ChannelGroupContext, GroupToolPolicyConfig } from "clawdbot/plugin-sdk";

import { resolveMatrixRoomConfig } from "./matrix/monitor/rooms.js";
import type { CoreConfig } from "./types.js";

function stripLeadingPrefixCaseInsensitive(value: string, prefix: string): string {
  return value.toLowerCase().startsWith(prefix.toLowerCase())
    ? value.slice(prefix.length).trim()
    : value;
}

function resolveMatrixRoomConfigForGroup(params: ChannelGroupContext) {
  const rawGroupId = params.groupId?.trim() ?? "";
  let roomId = rawGroupId;
  roomId = stripLeadingPrefixCaseInsensitive(roomId, "matrix:");
  roomId = stripLeadingPrefixCaseInsensitive(roomId, "channel:");
  roomId = stripLeadingPrefixCaseInsensitive(roomId, "room:");

  const groupChannel = params.groupChannel?.trim() ?? "";
  const aliases = groupChannel ? [groupChannel] : [];
  const cfg = params.cfg as CoreConfig;
<<<<<<< HEAD
  const resolved = resolveMatrixRoomConfig({
    rooms: cfg.channels?.matrix?.groups ?? cfg.channels?.matrix?.rooms,
=======
  const matrixConfig = resolveMatrixAccountConfig({ cfg, accountId: params.accountId });
  return resolveMatrixRoomConfig({
    rooms: matrixConfig.groups ?? matrixConfig.rooms,
>>>>>>> 0653e8d2e (refactor(matrix): dedupe group config resolution)
    roomId,
    aliases,
    name: groupChannel || undefined,
  }).config;
}

export function resolveMatrixGroupRequireMention(params: ChannelGroupContext): boolean {
  const resolved = resolveMatrixRoomConfigForGroup(params);
  if (resolved) {
    if (resolved.autoReply === true) {
      return false;
    }
    if (resolved.autoReply === false) {
      return true;
    }
    if (typeof resolved.requireMention === "boolean") {
      return resolved.requireMention;
    }
  }
  return true;
}

export function resolveMatrixGroupToolPolicy(
  params: ChannelGroupContext,
): GroupToolPolicyConfig | undefined {
<<<<<<< HEAD
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
  const resolved = resolveMatrixRoomConfig({
    rooms: cfg.channels?.matrix?.groups ?? cfg.channels?.matrix?.rooms,
    roomId,
    aliases,
    name: groupChannel || undefined,
  }).config;
=======
  const resolved = resolveMatrixRoomConfigForGroup(params);
>>>>>>> 0653e8d2e (refactor(matrix): dedupe group config resolution)
  return resolved?.tools;
}
