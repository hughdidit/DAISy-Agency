<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
import { normalizeAccountId } from "openclaw/plugin-sdk/account-id";
>>>>>>> 6543ce717 (perf(test): avoid plugin-sdk barrel imports)
import type { CoreConfig } from "../../types.js";
import type { MatrixActionClient, MatrixActionClientOpts } from "./types.js";
>>>>>>> 40b11db80 (TypeScript: add extensions to tsconfig and fix type errors (#12781))
import { getMatrixRuntime } from "../../runtime.js";
import type { CoreConfig } from "../types.js";
import { getActiveMatrixClient } from "../active-client.js";
<<<<<<< HEAD
import {
  createMatrixClient,
  isBunRuntime,
  resolveMatrixAuth,
  resolveSharedMatrixClient,
} from "../client.js";
import type { MatrixActionClient, MatrixActionClientOpts } from "./types.js";
=======
import { createPreparedMatrixClient } from "../client-bootstrap.js";
import { isBunRuntime, resolveMatrixAuth, resolveSharedMatrixClient } from "../client.js";
>>>>>>> 544ffbcf7 (refactor(extensions): dedupe connector helper usage)

export function ensureNodeRuntime() {
  if (isBunRuntime()) {
    throw new Error("Matrix support requires Node (bun runtime not supported)");
  }
}

export async function resolveActionClient(
  opts: MatrixActionClientOpts = {},
): Promise<MatrixActionClient> {
  ensureNodeRuntime();
  if (opts.client) {
    return { client: opts.client, stopOnDone: false };
  }
  const active = getActiveMatrixClient();
<<<<<<< HEAD
  if (active) return { client: active, stopOnDone: false };
  const shouldShareClient = Boolean(process.env.CLAWDBOT_GATEWAY_PORT);
=======
  if (active) {
    return { client: active, stopOnDone: false };
  }
  const shouldShareClient = Boolean(process.env.OPENCLAW_GATEWAY_PORT);
>>>>>>> 230ca789e (chore: Lint extensions folder.)
  if (shouldShareClient) {
    const client = await resolveSharedMatrixClient({
      cfg: getMatrixRuntime().config.loadConfig() as CoreConfig,
      timeoutMs: opts.timeoutMs,
    });
    return { client, stopOnDone: false };
  }
  const auth = await resolveMatrixAuth({
    cfg: getMatrixRuntime().config.loadConfig() as CoreConfig,
  });
<<<<<<< HEAD
  const client = await createMatrixClient({
    homeserver: auth.homeserver,
    userId: auth.userId,
    accessToken: auth.accessToken,
    encryption: auth.encryption,
    localTimeoutMs: opts.timeoutMs,
=======
  const client = await createPreparedMatrixClient({
    auth,
    timeoutMs: opts.timeoutMs,
    accountId,
>>>>>>> 544ffbcf7 (refactor(extensions): dedupe connector helper usage)
  });
  return { client, stopOnDone: true };
}
