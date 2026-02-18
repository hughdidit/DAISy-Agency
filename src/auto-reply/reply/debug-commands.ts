<<<<<<< HEAD
<<<<<<< HEAD
import { parseConfigValue } from "./config-value.js";
=======
import { parseSetUnsetCommandAction } from "./commands-setunset.js";
import { parseSlashCommandOrNull } from "./commands-slash-parse.js";
>>>>>>> 818419b4c (refactor(auto-reply): share set/unset command action parsing)
=======
import { parseSlashCommandWithSetUnset } from "./commands-setunset.js";
>>>>>>> f46bcbe16 (refactor(auto-reply): share slash set/unset command parsing)

export type DebugCommand =
  | { action: "show" }
  | { action: "reset" }
  | { action: "set"; path: string; value: unknown }
  | { action: "unset"; path: string }
  | { action: "error"; message: string };

export function parseDebugCommand(raw: string): DebugCommand | null {
<<<<<<< HEAD
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("/debug")) {
    return null;
  }
  const rest = trimmed.slice("/debug".length).trim();
  if (!rest) {
    return { action: "show" };
  }
<<<<<<< HEAD

  const match = rest.match(/^(\S+)(?:\s+([\s\S]+))?$/);
  if (!match) {
    return { action: "error", message: "Invalid /debug syntax." };
  }
  const action = match[1].toLowerCase();
  const args = (match[2] ?? "").trim();
=======
  const { action, args } = parsed;
  const setUnset = parseSetUnsetCommandAction<DebugCommand>({
=======
  return parseSlashCommandWithSetUnset<DebugCommand>({
    raw,
>>>>>>> f46bcbe16 (refactor(auto-reply): share slash set/unset command parsing)
    slash: "/debug",
    invalidMessage: "Invalid /debug syntax.",
    usageMessage: "Usage: /debug show|set|unset|reset",
    onKnownAction: (action) => {
      if (action === "show") {
        return { action: "show" };
      }
      if (action === "reset") {
        return { action: "reset" };
      }
      return undefined;
    },
    onSet: (path, value) => ({ action: "set", path, value }),
    onUnset: (path) => ({ action: "unset", path }),
    onError: (message) => ({ action: "error", message }),
  });
<<<<<<< HEAD
  if (setUnset) {
    return setUnset;
  }
>>>>>>> 818419b4c (refactor(auto-reply): share set/unset command action parsing)

  switch (action) {
    case "show":
      return { action: "show" };
    case "reset":
      return { action: "reset" };
<<<<<<< HEAD
    case "unset": {
      if (!args) {
        return { action: "error", message: "Usage: /debug unset path" };
      }
      return { action: "unset", path: args };
    }
    case "set": {
      if (!args) {
        return {
          action: "error",
          message: "Usage: /debug set path=value",
        };
      }
      const eqIndex = args.indexOf("=");
      if (eqIndex <= 0) {
        return {
          action: "error",
          message: "Usage: /debug set path=value",
        };
      }
      const path = args.slice(0, eqIndex).trim();
      const rawValue = args.slice(eqIndex + 1);
      if (!path) {
        return {
          action: "error",
          message: "Usage: /debug set path=value",
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
        message: "Usage: /debug show|set|unset|reset",
      };
  }
=======
>>>>>>> f46bcbe16 (refactor(auto-reply): share slash set/unset command parsing)
}
