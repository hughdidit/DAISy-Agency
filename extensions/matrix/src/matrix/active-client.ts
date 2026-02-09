import type { MatrixClient } from "@vector-im/matrix-bot-sdk";
<<<<<<< HEAD
=======
import { normalizeAccountId } from "openclaw/plugin-sdk";
>>>>>>> c89b8d99f (fix: normalize accountId in active-client and send/client for consistent keying)

let activeClient: MatrixClient | null = null;

<<<<<<< HEAD
export function setActiveMatrixClient(client: MatrixClient | null): void {
  activeClient = client;
}

export function getActiveMatrixClient(): MatrixClient | null {
  return activeClient;
=======
export function setActiveMatrixClient(
  client: MatrixClient | null,
  accountId?: string | null,
): void {
  const key = normalizeAccountId(accountId);
  if (client) {
    activeClients.set(key, client);
  } else {
    activeClients.delete(key);
  }
}

export function getActiveMatrixClient(accountId?: string | null): MatrixClient | null {
  const key = normalizeAccountId(accountId);
  return activeClients.get(key) ?? null;
}

export function getAnyActiveMatrixClient(): MatrixClient | null {
  // Return any available client (for backward compatibility)
  const first = activeClients.values().next();
  return first.done ? null : first.value;
}

export function clearAllActiveMatrixClients(): void {
  activeClients.clear();
>>>>>>> c89b8d99f (fix: normalize accountId in active-client and send/client for consistent keying)
}
