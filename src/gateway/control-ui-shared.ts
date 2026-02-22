import {
  isAvatarHttpUrl,
  isAvatarImageDataUrl,
  looksLikeAvatarPath,
} from "../shared/avatar-policy.js";

const CONTROL_UI_AVATAR_PREFIX = "/avatar";

export function normalizeControlUiBasePath(basePath?: string): string {
  if (!basePath) return "";
  let normalized = basePath.trim();
  if (!normalized) return "";
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized === "/") return "";
  if (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
  return normalized;
}

export function buildControlUiAvatarUrl(basePath: string, agentId: string): string {
  return basePath
    ? `${basePath}${CONTROL_UI_AVATAR_PREFIX}/${agentId}`
    : `${CONTROL_UI_AVATAR_PREFIX}/${agentId}`;
}

<<<<<<< HEAD
function looksLikeLocalAvatarPath(value: string): boolean {
  if (/[\\/]/.test(value)) return true;
  return /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(value);
}

=======
>>>>>>> e0db04a50 (fix(security): harden avatar validation and size limits)
export function resolveAssistantAvatarUrl(params: {
  avatar?: string | null;
  agentId?: string | null;
  basePath?: string;
}): string | undefined {
  const avatar = params.avatar?.trim();
<<<<<<< HEAD
  if (!avatar) return undefined;
  if (/^https?:\/\//i.test(avatar) || /^data:image\//i.test(avatar)) return avatar;
=======
  if (!avatar) {
    return undefined;
  }
  if (isAvatarHttpUrl(avatar) || isAvatarImageDataUrl(avatar)) {
    return avatar;
  }
>>>>>>> e0db04a50 (fix(security): harden avatar validation and size limits)

  const basePath = normalizeControlUiBasePath(params.basePath);
  const baseAvatarPrefix = basePath
    ? `${basePath}${CONTROL_UI_AVATAR_PREFIX}/`
    : `${CONTROL_UI_AVATAR_PREFIX}/`;
  if (basePath && avatar.startsWith(`${CONTROL_UI_AVATAR_PREFIX}/`)) {
    return `${basePath}${avatar}`;
  }
  if (avatar.startsWith(baseAvatarPrefix)) return avatar;

<<<<<<< HEAD
  if (!params.agentId) return avatar;
  if (looksLikeLocalAvatarPath(avatar)) {
=======
  if (!params.agentId) {
    return avatar;
  }
  if (looksLikeAvatarPath(avatar)) {
>>>>>>> e0db04a50 (fix(security): harden avatar validation and size limits)
    return buildControlUiAvatarUrl(basePath, params.agentId);
  }
  return avatar;
}

export { CONTROL_UI_AVATAR_PREFIX };
