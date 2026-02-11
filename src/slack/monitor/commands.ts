import type { SlackSlashCommandConfig } from "../../config/config.js";

/**
 * Strip Slack mentions (<@U123>, <@U123|name>) so command detection works on
 * normalized text. Use in both prepare and debounce gate for consistency.
 */
export function stripSlackMentionsForCommandDetection(text: string): string {
  return (text ?? "")
    .replace(/<@[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSlackSlashCommandName(raw: string) {
  return raw.replace(/^\/+/, "");
}

export function resolveSlackSlashCommandConfig(
  raw?: SlackSlashCommandConfig,
): Required<SlackSlashCommandConfig> {
  const normalizedName = normalizeSlackSlashCommandName(raw?.name?.trim() || "clawd");
  const name = normalizedName || "clawd";
  return {
    enabled: raw?.enabled === true,
    name,
    sessionPrefix: raw?.sessionPrefix?.trim() || "slack:slash",
    ephemeral: raw?.ephemeral !== false,
  };
}

export function buildSlackSlashCommandMatcher(name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^/?${escaped}$`);
}
