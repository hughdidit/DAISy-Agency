import { parseSetUnsetCommand } from "./commands-setunset.js";
import { parseSlashCommandOrNull } from "./commands-slash-parse.js";

export type DebugCommand =
  | { action: "show" }
  | { action: "reset" }
  | { action: "set"; path: string; value: unknown }
  | { action: "unset"; path: string }
  | { action: "error"; message: string };

export function parseDebugCommand(raw: string): DebugCommand | null {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("/debug")) return null;
  const rest = trimmed.slice("/debug".length).trim();
  if (!rest) return { action: "show" };

  const match = rest.match(/^(\S+)(?:\s+([\s\S]+))?$/);
  if (!match) return { action: "error", message: "Invalid /debug syntax." };
  const action = match[1].toLowerCase();
  const args = (match[2] ?? "").trim();

  switch (action) {
    case "show":
      return { action: "show" };
    case "reset":
      return { action: "reset" };
    case "unset": {
      if (!args) return { action: "error", message: "Usage: /debug unset path" };
      return { action: "unset", path: args };
    }
    case "set": {
      const parsed = parseSetUnsetCommand({ slash: "/debug", action, args });
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
        message: "Usage: /debug show|set|unset|reset",
      };
  }
}
