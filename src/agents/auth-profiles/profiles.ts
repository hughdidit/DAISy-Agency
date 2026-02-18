<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
import type { AuthProfileCredential, AuthProfileStore } from "./types.js";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { AuthProfileCredential, AuthProfileStore } from "./types.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { AuthProfileCredential, AuthProfileStore } from "./types.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { normalizeSecretInput } from "../../utils/normalize-secret-input.js";
>>>>>>> 42a07791c (fix(auth): strip line breaks from pasted keys)
import { normalizeProviderId } from "../model-selection.js";
import {
  ensureAuthProfileStore,
  saveAuthProfileStore,
  updateAuthProfileStoreWithLock,
} from "./store.js";
import type { AuthProfileCredential, AuthProfileStore } from "./types.js";

export function dedupeProfileIds(profileIds: string[]): string[] {
  return [...new Set(profileIds)];
}

export async function setAuthProfileOrder(params: {
  agentDir?: string;
  provider: string;
  order?: string[] | null;
}): Promise<AuthProfileStore | null> {
  const providerKey = normalizeProviderId(params.provider);
  const sanitized =
    params.order && Array.isArray(params.order)
      ? params.order.map((entry) => String(entry).trim()).filter(Boolean)
      : [];
  const deduped = dedupeProfileIds(sanitized);

  return await updateAuthProfileStoreWithLock({
    agentDir: params.agentDir,
    updater: (store) => {
      store.order = store.order ?? {};
      if (deduped.length === 0) {
        if (!store.order[providerKey]) {
          return false;
        }
        delete store.order[providerKey];
        if (Object.keys(store.order).length === 0) {
          store.order = undefined;
        }
        return true;
      }
      store.order[providerKey] = deduped;
      return true;
    },
  });
}

export function upsertAuthProfile(params: {
  profileId: string;
  credential: AuthProfileCredential;
  agentDir?: string;
}): void {
  const credential =
    params.credential.type === "api_key"
      ? {
          ...params.credential,
          ...(typeof params.credential.key === "string"
            ? { key: normalizeSecretInput(params.credential.key) }
            : {}),
        }
      : params.credential.type === "token"
        ? { ...params.credential, token: normalizeSecretInput(params.credential.token) }
        : params.credential;
  const store = ensureAuthProfileStore(params.agentDir);
  store.profiles[params.profileId] = credential;
  saveAuthProfileStore(store, params.agentDir);
}

export async function upsertAuthProfileWithLock(params: {
  profileId: string;
  credential: AuthProfileCredential;
  agentDir?: string;
}): Promise<AuthProfileStore | null> {
  return await updateAuthProfileStoreWithLock({
    agentDir: params.agentDir,
    updater: (store) => {
      store.profiles[params.profileId] = params.credential;
      return true;
    },
  });
}

export function listProfilesForProvider(store: AuthProfileStore, provider: string): string[] {
  const providerKey = normalizeProviderId(provider);
  return Object.entries(store.profiles)
    .filter(([, cred]) => normalizeProviderId(cred.provider) === providerKey)
    .map(([id]) => id);
}

export async function markAuthProfileGood(params: {
  store: AuthProfileStore;
  provider: string;
  profileId: string;
  agentDir?: string;
}): Promise<void> {
  const { store, provider, profileId, agentDir } = params;
  const updated = await updateAuthProfileStoreWithLock({
    agentDir,
    updater: (freshStore) => {
      const profile = freshStore.profiles[profileId];
      if (!profile || profile.provider !== provider) {
        return false;
      }
      freshStore.lastGood = { ...freshStore.lastGood, [provider]: profileId };
      return true;
    },
  });
  if (updated) {
    store.lastGood = updated.lastGood;
    return;
  }
  const profile = store.profiles[profileId];
  if (!profile || profile.provider !== provider) {
    return;
  }
  store.lastGood = { ...store.lastGood, [provider]: profileId };
  saveAuthProfileStore(store, agentDir);
}
