import fs from "node:fs";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { AuthProfileStore } from "./types.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { AuthProfileStore } from "./types.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { saveJsonFile } from "../../infra/json-file.js";
import { resolveUserPath } from "../../utils.js";
import { resolveMoltbotAgentDir } from "../agent-paths.js";
import { AUTH_PROFILE_FILENAME, AUTH_STORE_VERSION, LEGACY_AUTH_FILENAME } from "./constants.js";

export function resolveAuthStorePath(agentDir?: string): string {
  const resolved = resolveUserPath(agentDir ?? resolveMoltbotAgentDir());
  return path.join(resolved, AUTH_PROFILE_FILENAME);
}

export function resolveLegacyAuthStorePath(agentDir?: string): string {
  const resolved = resolveUserPath(agentDir ?? resolveMoltbotAgentDir());
  return path.join(resolved, LEGACY_AUTH_FILENAME);
}

export function resolveAuthStorePathForDisplay(agentDir?: string): string {
  const pathname = resolveAuthStorePath(agentDir);
  return pathname.startsWith("~") ? pathname : resolveUserPath(pathname);
}

export function ensureAuthStoreFile(pathname: string) {
  if (fs.existsSync(pathname)) {
    return;
  }
  const payload: AuthProfileStore = {
    version: AUTH_STORE_VERSION,
    profiles: {},
  };
  saveJsonFile(pathname, payload);
}
