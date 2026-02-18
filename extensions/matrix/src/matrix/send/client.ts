import type { MatrixClient } from "@vector-im/matrix-bot-sdk";
<<<<<<< HEAD
<<<<<<< HEAD

=======
=======
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk/account-id";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 6543ce717 (perf(test): avoid plugin-sdk barrel imports)
import type { CoreConfig } from "../../types.js";
>>>>>>> 40b11db80 (TypeScript: add extensions to tsconfig and fix type errors (#12781))
import { getMatrixRuntime } from "../../runtime.js";
<<<<<<< HEAD
import { getActiveMatrixClient } from "../active-client.js";
import {
  createMatrixClient,
  isBunRuntime,
  resolveMatrixAuth,
  resolveSharedMatrixClient,
} from "../client.js";
import type { CoreConfig } from "../types.js";
=======
=======
import { getMatrixRuntime } from "../../runtime.js";
import type { CoreConfig } from "../../types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { CoreConfig } from "../../types.js";
import { getMatrixRuntime } from "../../runtime.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { getMatrixRuntime } from "../../runtime.js";
import type { CoreConfig } from "../../types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { CoreConfig } from "../../types.js";
import { getMatrixRuntime } from "../../runtime.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { getMatrixRuntime } from "../../runtime.js";
import type { CoreConfig } from "../../types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
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
