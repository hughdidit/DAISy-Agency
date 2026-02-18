<<<<<<< HEAD
import { parseConfigValue } from "./config-value.js";
=======
import { parseSetUnsetCommandAction } from "./commands-setunset.js";
import { parseSlashCommandOrNull } from "./commands-slash-parse.js";
>>>>>>> 818419b4c (refactor(auto-reply): share set/unset command action parsing)

export type ConfigCommand =
  | { action: "show"; path?: string }
  | { action: "set"; path: string; value: unknown }
  | { action: "unset"; path: string }
  | { action: "error"; message: string };

export function parseConfigCommand(raw: string): ConfigCommand | null {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("/config")) {
    return null;
  }
  const rest = trimmed.slice("/config".length).trim();
  if (!rest) {
    return { action: "show" };
  }
<<<<<<< HEAD

  const match = rest.match(/^(\S+)(?:\s+([\s\S]+))?$/);
  if (!match) {
    return { action: "error", message: "Invalid /config syntax." };
  }
  const action = match[1].toLowerCase();
  const args = (match[2] ?? "").trim();
=======
  const { action, args } = parsed;
  const setUnset = parseSetUnsetCommandAction<ConfigCommand>({
    slash: "/config",
    action,
    args,
    onSet: (path, value) => ({ action: "set", path, value }),
    onUnset: (path) => ({ action: "unset", path }),
    onError: (message) => ({ action: "error", message }),
  });
  if (setUnset) {
    return setUnset;
  }
>>>>>>> 818419b4c (refactor(auto-reply): share set/unset command action parsing)

  switch (action) {
    case "show":
      return { action: "show", path: args || undefined };
    case "get":
      return { action: "show", path: args || undefined };
<<<<<<< HEAD
    case "unset": {
      if (!args) {
        return { action: "error", message: "Usage: /config unset path" };
      }
      return { action: "unset", path: args };
    }
    case "set": {
      if (!args) {
        return {
          action: "error",
          message: "Usage: /config set path=value",
        };
      }
      const eqIndex = args.indexOf("=");
      if (eqIndex <= 0) {
        return {
          action: "error",
          message: "Usage: /config set path=value",
        };
      }
      const path = args.slice(0, eqIndex).trim();
      const rawValue = args.slice(eqIndex + 1);
      if (!path) {
        return {
          action: "error",
          message: "Usage: /config set path=value",
        };
      }
      const parsed = parseConfigValue(rawValue);
      if (parsed.error) {
        return { action: "error", message: parsed.error };
      }
      return { action: "set", path, value: parsed.value };
    }
=======
>>>>>>> 818419b4c (refactor(auto-reply): share set/unset command action parsing)
    default:
      return {
        action: "error",
        message: "Usage: /config show|set|unset",
      };
  }
}
