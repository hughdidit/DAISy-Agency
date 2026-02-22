import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { ensureAuthProfileStore, listProfilesForProvider } from "./auth-profiles.js";
=======
import { ensureAuthProfileStore } from "./auth-profiles.js";
<<<<<<< HEAD
import type { AuthProfileCredential } from "./auth-profiles/types.js";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
=======
import type { AuthProfileCredential } from "./auth-profiles/types.js";
import { ensureAuthProfileStore } from "./auth-profiles.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { ensureAuthProfileStore } from "./auth-profiles.js";
import type { AuthProfileCredential } from "./auth-profiles/types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { AuthProfileCredential } from "./auth-profiles/types.js";
import { ensureAuthProfileStore } from "./auth-profiles.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { ensureAuthProfileStore } from "./auth-profiles.js";
import type { AuthProfileCredential } from "./auth-profiles/types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { normalizeProviderId } from "./model-selection.js";
>>>>>>> 4ca75bed5 (fix(models): sync auth-profiles before availability checks)
=======
import {
  piCredentialsEqual,
  resolvePiCredentialMapFromStore,
  type PiCredential,
} from "./pi-auth-credentials.js";
>>>>>>> cec404225 (Auth labels: handle token refs and share Pi credential conversion)

/**
 * @deprecated Legacy bridge for older flows that still expect `agentDir/auth.json`.
 * Runtime auth resolution uses auth-profiles directly and should not depend on this module.
 */
type AuthJsonCredential = PiCredential;

type AuthJsonShape = Record<string, AuthJsonCredential>;

async function readAuthJson(filePath: string): Promise<AuthJsonShape> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as AuthJsonShape;
  } catch {
    return {};
  }
}

/**
<<<<<<< HEAD
<<<<<<< HEAD
 * pi-coding-agent's ModelRegistry/AuthStorage expects OAuth credentials in auth.json.
=======
 * Convert an OpenClaw auth-profiles credential to pi-coding-agent auth.json format.
 * Returns null if the credential cannot be converted.
 */
function convertCredential(cred: AuthProfileCredential): AuthJsonCredential | null {
  if (cred.type === "api_key") {
    const key = typeof cred.key === "string" ? cred.key.trim() : "";
    if (!key) {
      return null;
    }
    return { type: "api_key", key };
  }

  if (cred.type === "token") {
    // pi-coding-agent treats static tokens as api_key type
    const token = typeof cred.token === "string" ? cred.token.trim() : "";
    if (!token) {
      return null;
    }
    const expires =
      typeof (cred as { expires?: unknown }).expires === "number"
        ? (cred as { expires: number }).expires
        : Number.NaN;
    if (Number.isFinite(expires) && expires > 0 && Date.now() >= expires) {
      return null;
    }
    return { type: "api_key", key: token };
  }

  if (cred.type === "oauth") {
    const accessRaw = (cred as { access?: unknown }).access;
    const refreshRaw = (cred as { refresh?: unknown }).refresh;
    const expiresRaw = (cred as { expires?: unknown }).expires;

    const access = typeof accessRaw === "string" ? accessRaw.trim() : "";
    const refresh = typeof refreshRaw === "string" ? refreshRaw.trim() : "";
    const expires = typeof expiresRaw === "number" ? expiresRaw : Number.NaN;

    if (!access || !refresh || !Number.isFinite(expires) || expires <= 0) {
      return null;
    }
    return { type: "oauth", access, refresh, expires };
  }

  return null;
}

/**
 * Check if two auth.json credentials are equivalent.
 */
function credentialsEqual(a: AuthJsonCredential | undefined, b: AuthJsonCredential): boolean {
  if (!a || typeof a !== "object") {
    return false;
  }
  if (a.type !== b.type) {
    return false;
  }

  if (a.type === "api_key" && b.type === "api_key") {
    return a.key === b.key;
  }

  if (a.type === "oauth" && b.type === "oauth") {
    return a.access === b.access && a.refresh === b.refresh && a.expires === b.expires;
  }

  return false;
}

/**
=======
>>>>>>> cec404225 (Auth labels: handle token refs and share Pi credential conversion)
 * pi-coding-agent's ModelRegistry/AuthStorage expects credentials in auth.json.
>>>>>>> 4ca75bed5 (fix(models): sync auth-profiles before availability checks)
 *
 * OpenClaw stores OAuth credentials in auth-profiles.json instead. This helper
 * bridges a subset of credentials into agentDir/auth.json so pi-coding-agent can
 * (a) consider the provider authenticated and (b) include built-in models in its
 * registry/catalog output.
 *
<<<<<<< HEAD
 * Currently used for openai-codex.
=======
 * Syncs all credential types: api_key, token (as api_key), and oauth.
 *
 * @deprecated Runtime auth now comes from OpenClaw auth-profiles snapshots.
>>>>>>> e1301c31e (Auth profiles: never persist plaintext when refs are present)
 */
export async function ensurePiAuthJsonFromAuthProfiles(agentDir: string): Promise<{
  wrote: boolean;
  authPath: string;
}> {
  const store = ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false });
  const codexProfiles = listProfilesForProvider(store, "openai-codex");
  if (codexProfiles.length === 0) {
    return { wrote: false, authPath: path.join(agentDir, "auth.json") };
  }

  const profileId = codexProfiles[0];
  const cred = profileId ? store.profiles[profileId] : undefined;
  if (!cred || cred.type !== "oauth") {
    return { wrote: false, authPath: path.join(agentDir, "auth.json") };
  }

  const accessRaw = (cred as { access?: unknown }).access;
  const refreshRaw = (cred as { refresh?: unknown }).refresh;
  const expiresRaw = (cred as { expires?: unknown }).expires;

  const access = typeof accessRaw === "string" ? accessRaw.trim() : "";
  const refresh = typeof refreshRaw === "string" ? refreshRaw.trim() : "";
  const expires = typeof expiresRaw === "number" ? expiresRaw : Number.NaN;

  if (!access || !refresh || !Number.isFinite(expires) || expires <= 0) {
    return { wrote: false, authPath: path.join(agentDir, "auth.json") };
  }

  const authPath = path.join(agentDir, "auth.json");
<<<<<<< HEAD
  const next = await readAuthJson(authPath);

  const existing = next["openai-codex"];
  const desired: AuthJsonCredential = {
    type: "oauth",
    access,
    refresh,
    expires,
  };

<<<<<<< HEAD
  const isSame =
    existing &&
    typeof existing === "object" &&
    (existing as { type?: unknown }).type === "oauth" &&
    (existing as { access?: unknown }).access === access &&
    (existing as { refresh?: unknown }).refresh === refresh &&
    (existing as { expires?: unknown }).expires === expires;
=======
  for (const [, cred] of Object.entries(store.profiles)) {
    const provider = normalizeProviderId(String(cred.provider ?? "")).trim();
    if (!provider || providerCredentials.has(provider)) {
      continue;
    }
>>>>>>> 4ca75bed5 (fix(models): sync auth-profiles before availability checks)

  if (isSame) {
    return { wrote: false, authPath };
  }

  next["openai-codex"] = desired;
=======
  const providerCredentials = resolvePiCredentialMapFromStore(store);
  if (Object.keys(providerCredentials).length === 0) {
    return { wrote: false, authPath };
  }

  const existing = await readAuthJson(authPath);
  let changed = false;

  for (const [provider, cred] of Object.entries(providerCredentials)) {
    if (!piCredentialsEqual(existing[provider], cred)) {
      existing[provider] = cred;
      changed = true;
    }
  }

  if (!changed) {
    return { wrote: false, authPath };
  }
>>>>>>> cec404225 (Auth labels: handle token refs and share Pi credential conversion)

  await fs.mkdir(agentDir, { recursive: true, mode: 0o700 });
  await fs.writeFile(authPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });

  return { wrote: true, authPath };
}
