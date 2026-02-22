import path from "node:path";
import {
  AuthStorage,
  InMemoryAuthStorageBackend,
  ModelRegistry,
} from "@mariozechner/pi-coding-agent";
import { ensureAuthProfileStore } from "./auth-profiles.js";
import { resolvePiCredentialMapFromStore, type PiCredentialMap } from "./pi-auth-credentials.js";

export { AuthStorage, ModelRegistry } from "@mariozechner/pi-coding-agent";

<<<<<<< HEAD
<<<<<<< HEAD
// Compatibility helpers for pi-coding-agent 0.50+ (discover* helpers removed).
export function discoverAuthStorage(agentDir: string): AuthStorage {
  return new AuthStorage(path.join(agentDir, "auth.json"));
=======
type PiApiKeyCredential = { type: "api_key"; key: string };
type PiOAuthCredential = {
  type: "oauth";
  access: string;
  refresh: string;
  expires: number;
};

type PiCredential = PiApiKeyCredential | PiOAuthCredential;
type PiCredentialMap = Record<string, PiCredential>;

=======
>>>>>>> cec404225 (Auth labels: handle token refs and share Pi credential conversion)
function createAuthStorage(AuthStorageLike: unknown, path: string, creds: PiCredentialMap) {
  const withInMemory = AuthStorageLike as { inMemory?: (data?: unknown) => unknown };
  if (typeof withInMemory.inMemory === "function") {
    return withInMemory.inMemory(creds) as AuthStorage;
  }

  const withFromStorage = AuthStorageLike as {
    fromStorage?: (storage: unknown) => unknown;
  };
  if (typeof withFromStorage.fromStorage === "function") {
    const backend = new InMemoryAuthStorageBackend();
    backend.withLock(() => ({
      result: undefined,
      next: JSON.stringify(creds, null, 2),
    }));
    return withFromStorage.fromStorage(backend) as AuthStorage;
  }

  const withFactory = AuthStorageLike as { create?: (path: string) => unknown };
  const withRuntimeOverride = (
    typeof withFactory.create === "function"
      ? withFactory.create(path)
      : new (AuthStorageLike as { new (path: string): unknown })(path)
  ) as AuthStorage & {
    setRuntimeApiKey?: (provider: string, apiKey: string) => void;
  };
  if (typeof withRuntimeOverride.setRuntimeApiKey === "function") {
    for (const [provider, credential] of Object.entries(creds)) {
      if (credential.type === "api_key") {
        withRuntimeOverride.setRuntimeApiKey(provider, credential.key);
        continue;
      }
      withRuntimeOverride.setRuntimeApiKey(provider, credential.access);
    }
  }
  return withRuntimeOverride;
}

function resolvePiCredentials(agentDir: string): PiCredentialMap {
  const store = ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false });
  return resolvePiCredentialMapFromStore(store);
}

// Compatibility helpers for pi-coding-agent 0.50+ (discover* helpers removed).
export function discoverAuthStorage(agentDir: string): AuthStorage {
  const credentials = resolvePiCredentials(agentDir);
  return createAuthStorage(AuthStorage, path.join(agentDir, "auth.json"), credentials);
>>>>>>> 4c5a2c3c6 (Agents: inject pi auth storage from runtime profiles)
}

export function discoverModels(authStorage: AuthStorage, agentDir: string): ModelRegistry {
  return new ModelRegistry(authStorage, path.join(agentDir, "models.json"));
}
