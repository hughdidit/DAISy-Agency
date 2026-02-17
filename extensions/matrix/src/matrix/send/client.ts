import type { MatrixClient } from "@vector-im/matrix-bot-sdk";
<<<<<<< HEAD
=======
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk/account-id";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 6543ce717 (perf(test): avoid plugin-sdk barrel imports)
import type { CoreConfig } from "../../types.js";
import { getMatrixRuntime } from "../../runtime.js";
<<<<<<< HEAD
import { getActiveMatrixClient } from "../active-client.js";
import {
  createMatrixClient,
  isBunRuntime,
  resolveMatrixAuth,
  resolveSharedMatrixClient,
} from "../client.js";
=======
=======
import { getMatrixRuntime } from "../../runtime.js";
import type { CoreConfig } from "../../types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { CoreConfig } from "../../types.js";
import { getMatrixRuntime } from "../../runtime.js";
>>>>>>> ed11e93cf (chore(format))
import { getActiveMatrixClient, getAnyActiveMatrixClient } from "../active-client.js";
import { createPreparedMatrixClient } from "../client-bootstrap.js";
import { isBunRuntime, resolveMatrixAuth, resolveSharedMatrixClient } from "../client.js";
>>>>>>> 544ffbcf7 (refactor(extensions): dedupe connector helper usage)

const getCore = () => getMatrixRuntime();

export function ensureNodeRuntime() {
  if (isBunRuntime()) {
    throw new Error("Matrix support requires Node (bun runtime not supported)");
  }
}

export function resolveMediaMaxBytes(): number | undefined {
  const cfg = getCore().config.loadConfig() as CoreConfig;
  if (typeof cfg.channels?.matrix?.mediaMaxMb === "number") {
    return cfg.channels.matrix.mediaMaxMb * 1024 * 1024;
  }
  return undefined;
}

export async function resolveMatrixClient(opts: {
  client?: MatrixClient;
  timeoutMs?: number;
}): Promise<{ client: MatrixClient; stopOnDone: boolean }> {
  ensureNodeRuntime();
  if (opts.client) {
    return { client: opts.client, stopOnDone: false };
  }
  const active = getActiveMatrixClient();
  if (active) {
    return { client: active, stopOnDone: false };
  }
  const shouldShareClient = Boolean(process.env.OPENCLAW_GATEWAY_PORT);
  if (shouldShareClient) {
    const client = await resolveSharedMatrixClient({
      timeoutMs: opts.timeoutMs,
    });
    return { client, stopOnDone: false };
  }
<<<<<<< HEAD
  const auth = await resolveMatrixAuth();
  const client = await createMatrixClient({
    homeserver: auth.homeserver,
    userId: auth.userId,
    accessToken: auth.accessToken,
    encryption: auth.encryption,
    localTimeoutMs: opts.timeoutMs,
=======
  const auth = await resolveMatrixAuth({ accountId });
  const client = await createPreparedMatrixClient({
    auth,
    timeoutMs: opts.timeoutMs,
    accountId,
>>>>>>> 544ffbcf7 (refactor(extensions): dedupe connector helper usage)
  });
  return { client, stopOnDone: true };
}
