import { LogService } from "@vector-im/matrix-bot-sdk";
<<<<<<< HEAD
import type { MatrixClient } from "@vector-im/matrix-bot-sdk";

import type { CoreConfig } from "../types.js";
=======
import { normalizeAccountId } from "openclaw/plugin-sdk";
import type { CoreConfig } from "../../types.js";
import type { MatrixAuth } from "./types.js";
import { resolveMatrixAuth } from "./config.js";
>>>>>>> 2b685b08c (fix: harden matrix multi-account routing (#7286) (thanks @emonty))
import { createMatrixClient } from "./create-client.js";
import { resolveMatrixAuth } from "./config.js";
import { DEFAULT_ACCOUNT_KEY } from "./storage.js";
import type { MatrixAuth } from "./types.js";

type SharedMatrixClientState = {
  client: MatrixClient;
  key: string;
  started: boolean;
  cryptoReady: boolean;
};

let sharedClientState: SharedMatrixClientState | null = null;
let sharedClientPromise: Promise<SharedMatrixClientState> | null = null;
let sharedClientStartPromise: Promise<void> | null = null;

function buildSharedClientKey(auth: MatrixAuth, accountId?: string | null): string {
  const normalizedAccountId = normalizeAccountId(accountId);
  return [
    auth.homeserver,
    auth.userId,
    auth.accessToken,
    auth.encryption ? "e2ee" : "plain",
    normalizedAccountId || DEFAULT_ACCOUNT_KEY,
  ].join("|");
}

async function createSharedMatrixClient(params: {
  auth: MatrixAuth;
  timeoutMs?: number;
  accountId?: string | null;
}): Promise<SharedMatrixClientState> {
  const client = await createMatrixClient({
    homeserver: params.auth.homeserver,
    userId: params.auth.userId,
    accessToken: params.auth.accessToken,
    encryption: params.auth.encryption,
    localTimeoutMs: params.timeoutMs,
    accountId: params.accountId,
  });
  return {
    client,
    key: buildSharedClientKey(params.auth, params.accountId),
    started: false,
    cryptoReady: false,
  };
}

async function ensureSharedClientStarted(params: {
  state: SharedMatrixClientState;
  timeoutMs?: number;
  initialSyncLimit?: number;
  encryption?: boolean;
}): Promise<void> {
  if (params.state.started) return;
  if (sharedClientStartPromise) {
    await sharedClientStartPromise;
    return;
  }
  sharedClientStartPromise = (async () => {
    const client = params.state.client;

    // Initialize crypto if enabled
    if (params.encryption && !params.state.cryptoReady) {
      try {
        const joinedRooms = await client.getJoinedRooms();
        if (client.crypto) {
          await client.crypto.prepare(joinedRooms);
          params.state.cryptoReady = true;
        }
      } catch (err) {
        LogService.warn("MatrixClientLite", "Failed to prepare crypto:", err);
      }
    }

<<<<<<< HEAD
<<<<<<< HEAD
    await client.start();
    params.state.started = true;
=======
    // bot-sdk start() returns a promise that never resolves (infinite sync loop).
    // Fire-and-forget: the sync loop runs and events fire on the client,
    // but we must not await or the entire provider startup hangs forever.
    // If start() rejects during the grace window (e.g. bad token, unreachable
    // homeserver), we propagate the error so the caller knows startup failed.
    let startError: unknown = undefined;
    client.start().catch((err: unknown) => {
      startError = err;
=======
    // bot-sdk start() returns a promise that never resolves on success
    // (infinite sync loop), so we must not await it or startup hangs forever.
    // However, it DOES reject on errors (bad token, unreachable homeserver).
    // Strategy: race client.start() against a grace timer. If start() rejects
    // during or after the window, mark the client as failed so subsequent
    // resolveSharedMatrixClient() calls know to retry.
    const startPromiseInner = client.start();
    let settled = false;
    startPromiseInner.catch((err: unknown) => {
      settled = true;
      params.state.started = false;
>>>>>>> 235ed71e9 (fix: handle late client.start() failures via single catch handler)
      LogService.error("MatrixClientLite", "client.start() error:", err);
    });
    // Give the sync loop a moment to initialize before marking ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (settled) {
      throw new Error("Matrix client.start() failed during initialization");
    }
<<<<<<< HEAD
>>>>>>> 8884f99c9 (fix: address review feedback — handle start failure, remove placeholder URL)
=======
    params.state.started = true;
<<<<<<< HEAD
>>>>>>> 4f9daf982 (fix: propagate client.start() errors to caller instead of swallowing)
=======

>>>>>>> 235ed71e9 (fix: handle late client.start() failures via single catch handler)
  })();
  try {
    await sharedClientStartPromise;
  } finally {
    sharedClientStartPromise = null;
  }
}

export async function resolveSharedMatrixClient(
  params: {
    cfg?: CoreConfig;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    auth?: MatrixAuth;
    startClient?: boolean;
    accountId?: string | null;
  } = {},
): Promise<MatrixClient> {
<<<<<<< HEAD
  const auth = params.auth ?? (await resolveMatrixAuth({ cfg: params.cfg, env: params.env }));
  const key = buildSharedClientKey(auth, params.accountId);
=======
  const accountId = normalizeAccountId(params.accountId);
  const auth =
    params.auth ?? (await resolveMatrixAuth({ cfg: params.cfg, env: params.env, accountId }));
  const key = buildSharedClientKey(auth, accountId);
>>>>>>> 2b685b08c (fix: harden matrix multi-account routing (#7286) (thanks @emonty))
  const shouldStart = params.startClient !== false;

  if (sharedClientState?.key === key) {
    if (shouldStart) {
      await ensureSharedClientStarted({
        state: sharedClientState,
        timeoutMs: params.timeoutMs,
        initialSyncLimit: auth.initialSyncLimit,
        encryption: auth.encryption,
      });
    }
    return sharedClientState.client;
  }

  if (sharedClientPromise) {
    const pending = await sharedClientPromise;
    if (pending.key === key) {
      if (shouldStart) {
        await ensureSharedClientStarted({
          state: pending,
          timeoutMs: params.timeoutMs,
          initialSyncLimit: auth.initialSyncLimit,
          encryption: auth.encryption,
        });
      }
      return pending.client;
    }
    pending.client.stop();
    sharedClientState = null;
    sharedClientPromise = null;
  }

  sharedClientPromise = createSharedMatrixClient({
    auth,
    timeoutMs: params.timeoutMs,
    accountId,
  });
  try {
    const created = await sharedClientPromise;
    sharedClientState = created;
    if (shouldStart) {
      await ensureSharedClientStarted({
        state: created,
        timeoutMs: params.timeoutMs,
        initialSyncLimit: auth.initialSyncLimit,
        encryption: auth.encryption,
      });
    }
    return created.client;
  } finally {
    sharedClientPromise = null;
  }
}

export async function waitForMatrixSync(_params: {
  client: MatrixClient;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}): Promise<void> {
  // @vector-im/matrix-bot-sdk handles sync internally in start()
  // This is kept for API compatibility but is essentially a no-op now
}

export function stopSharedClient(): void {
  if (sharedClientState) {
    sharedClientState.client.stop();
    sharedClientState = null;
  }
}
<<<<<<< HEAD
=======

/**
 * Stop the shared client for a specific account.
 * Use this instead of stopSharedClient() when shutting down a single account
 * to avoid stopping all accounts.
 */
export function stopSharedClientForAccount(auth: MatrixAuth, accountId?: string | null): void {
  const key = buildSharedClientKey(auth, normalizeAccountId(accountId));
  stopSharedClient(key);
}
>>>>>>> 2b685b08c (fix: harden matrix multi-account routing (#7286) (thanks @emonty))
