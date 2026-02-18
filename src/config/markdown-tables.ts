<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { normalizeChannelId } from "../channels/plugins/index.js";
import { normalizeAccountId } from "../routing/session-key.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "./config.js";
=======
=======
>>>>>>> ed11e93cf (chore(format))
import type { OpenClawConfig } from "./config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import type { MarkdownTableMode } from "./types.base.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { normalizeChannelId } from "../channels/plugins/index.js";
import { normalizeAccountId } from "../routing/session-key.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { OpenClawConfig } from "./config.js";
import type { MarkdownTableMode } from "./types.base.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { normalizeChannelId } from "../channels/plugins/index.js";
import { normalizeAccountId } from "../routing/session-key.js";
import type { OpenClawConfig } from "./config.js";
import type { MarkdownTableMode } from "./types.base.js";

type MarkdownConfigEntry = {
  markdown?: {
    tables?: MarkdownTableMode;
  };
};

type MarkdownConfigSection = MarkdownConfigEntry & {
  accounts?: Record<string, MarkdownConfigEntry>;
};

const DEFAULT_TABLE_MODES = new Map<string, MarkdownTableMode>([
  ["signal", "bullets"],
  ["whatsapp", "bullets"],
]);

const isMarkdownTableMode = (value: unknown): value is MarkdownTableMode =>
  value === "off" || value === "bullets" || value === "code";

function resolveMarkdownModeFromSection(
  section: MarkdownConfigSection | undefined,
  accountId?: string | null,
): MarkdownTableMode | undefined {
  if (!section) {
    return undefined;
  }
  const normalizedAccountId = normalizeAccountId(accountId);
  const accounts = section.accounts;
  if (accounts && typeof accounts === "object") {
    const direct = accounts[normalizedAccountId];
    const directMode = direct?.markdown?.tables;
    if (isMarkdownTableMode(directMode)) {
      return directMode;
    }
    const matchKey = Object.keys(accounts).find(
      (key) => key.toLowerCase() === normalizedAccountId.toLowerCase(),
    );
    const match = matchKey ? accounts[matchKey] : undefined;
    const matchMode = match?.markdown?.tables;
    if (isMarkdownTableMode(matchMode)) {
      return matchMode;
    }
  }
  const sectionMode = section.markdown?.tables;
  return isMarkdownTableMode(sectionMode) ? sectionMode : undefined;
}

export function resolveMarkdownTableMode(params: {
  cfg?: Partial<MoltbotConfig>;
  channel?: string | null;
  accountId?: string | null;
}): MarkdownTableMode {
  const channel = normalizeChannelId(params.channel);
  const defaultMode = channel ? (DEFAULT_TABLE_MODES.get(channel) ?? "code") : "code";
  if (!channel || !params.cfg) {
    return defaultMode;
  }
  const channelsConfig = params.cfg.channels as Record<string, unknown> | undefined;
  const section = (channelsConfig?.[channel] ??
    (params.cfg as Record<string, unknown> | undefined)?.[channel]) as
    | MarkdownConfigSection
    | undefined;
  return resolveMarkdownModeFromSection(section, params.accountId) ?? defaultMode;
}
