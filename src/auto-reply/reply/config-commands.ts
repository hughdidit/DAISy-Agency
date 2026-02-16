import { parseSetUnsetCommand } from "./commands-setunset.js";
import { parseSlashCommandOrNull } from "./commands-slash-parse.js";

export type ConfigCommand =
  | { action: "show"; path?: string }
  | { action: "set"; path: string; value: unknown }
  | { action: "unset"; path: string }
  | { action: "error"; message: string };

export function parseConfigCommand(raw: string): ConfigCommand | null {
<<<<<<< HEAD
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("/config")) return null;
  const rest = trimmed.slice("/config".length).trim();
  if (!rest) return { action: "show" };

  const match = rest.match(/^(\S+)(?:\s+([\s\S]+))?$/);
  if (!match) return { action: "error", message: "Invalid /config syntax." };
  const action = match[1].toLowerCase();
  const args = (match[2] ?? "").trim();
=======
  const parsed = parseSlashCommandOrNull(raw, "/config", {
    invalidMessage: "Invalid /config syntax.",
  });
  if (!parsed) {
    return null;
  }
  if (!parsed.ok) {
    return { action: "error", message: parsed.message };
  }
  const { action, args } = parsed;
>>>>>>> d9ca051a1 (refactor(auto-reply): share slash parsing for config/debug)

  switch (action) {
    case "show":
      return { action: "show", path: args || undefined };
    case "get":
      return { action: "show", path: args || undefined };
<<<<<<< HEAD
    case "unset": {
      if (!args) return { action: "error", message: "Usage: /config unset path" };
      return { action: "unset", path: args };
    }
=======
    case "unset":
>>>>>>> d9ca051a1 (refactor(auto-reply): share slash parsing for config/debug)
    case "set": {
      const parsed = parseSetUnsetCommand({ slash: "/config", action, args });
      if (parsed.kind === "error") {
        return { action: "error", message: parsed.message };
      }
      return parsed.kind === "set"
        ? { action: "set", path: parsed.path, value: parsed.value }
        : { action: "unset", path: parsed.path };
    }
    default:
      return {
        action: "error",
        message: "Usage: /config show|set|unset",
      };
  }
}
