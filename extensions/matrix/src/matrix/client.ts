export type { MatrixAuth, MatrixResolvedConfig } from "./client/types.js";
export { isBunRuntime } from "./client/runtime.js";
export {
  resolveMatrixConfig,
  resolveMatrixConfigForAccount,
  resolveMatrixAuth,
} from "./client/config.js";
export { createMatrixClient } from "./client/create-client.js";
export {
  resolveSharedMatrixClient,
  waitForMatrixSync,
  stopSharedClient,
<<<<<<< HEAD
=======
  stopSharedClientForAccount,
>>>>>>> caf5d2dd7 (feat(matrix): Add multi-account support to Matrix channel)
} from "./client/shared.js";
