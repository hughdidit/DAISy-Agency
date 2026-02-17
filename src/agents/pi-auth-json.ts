import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD
import { ensureAuthProfileStore, listProfilesForProvider } from "./auth-profiles.js";
=======
import { ensureAuthProfileStore } from "./auth-profiles.js";
import type { AuthProfileCredential } from "./auth-profiles/types.js";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { normalizeProviderId } from "./model-selection.js";
>>>>>>> 4ca75bed5 (fix(models): sync auth-profiles before availability checks)

type AuthJsonCredential =
  | {
      type: "api_key";
      key: string;
    }
  | {
      type: "oauth";
      access: string;
      refresh: string;
      expires: number;
      [key: string]: unknown;
    };

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
 * pi-coding-agent's ModelRegistry/AuthStorage expects credentials in auth.json.
>>>>>>> 4ca75bed5 (fix(models): sync auth-profiles before availability checks)
 *
 * OpenClaw stores OAuth credentials in auth-profiles.json instead. This helper
 * bridges a subset of credentials into agentDir/auth.json so pi-coding-agent can
 * (a) consider the provider authenticated and (b) include built-in models in its
 * registry/catalog output.
 *
 * Currently used for openai-codex.
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

  await fs.mkdir(agentDir, { recursive: true, mode: 0o700 });
  await fs.writeFile(authPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });

  return { wrote: true, authPath };
}
