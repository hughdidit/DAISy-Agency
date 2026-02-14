import type { MatrixClient } from "@vector-im/matrix-bot-sdk";
<<<<<<< HEAD
=======
import { normalizeAccountId } from "openclaw/plugin-sdk/account-id";
>>>>>>> 6543ce717 (perf(test): avoid plugin-sdk barrel imports)

let activeClient: MatrixClient | null = null;

export function setActiveMatrixClient(client: MatrixClient | null): void {
  activeClient = client;
}

export function getActiveMatrixClient(): MatrixClient | null {
  return activeClient;
}
