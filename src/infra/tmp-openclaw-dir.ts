import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const POSIX_OPENCLAW_TMP_DIR = "/tmp/openclaw";
const TMP_DIR_ACCESS_MODE = fs.constants.W_OK | fs.constants.X_OK;

type ResolvePreferredOpenClawTmpDirOptions = {
  accessSync?: (path: string, mode?: number) => void;
  statSync?: (path: string) => { isDirectory(): boolean };
  tmpdir?: () => string;
};

type MaybeNodeError = { code?: string };

function isNodeErrorWithCode(err: unknown, code: string): err is MaybeNodeError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as MaybeNodeError).code === code
  );
}

export function resolvePreferredOpenClawTmpDir(
  options: ResolvePreferredOpenClawTmpDirOptions = {},
): string {
  const accessSync = options.accessSync ?? fs.accessSync;
  const statSync = options.statSync ?? fs.statSync;
  const tmpdir = options.tmpdir ?? os.tmpdir;

  try {
    const preferred = statSync(POSIX_OPENCLAW_TMP_DIR);
    if (!preferred.isDirectory()) {
      return path.join(tmpdir(), "openclaw");
    }
    accessSync(POSIX_OPENCLAW_TMP_DIR, fs.constants.W_OK | fs.constants.X_OK);
    return POSIX_OPENCLAW_TMP_DIR;
  } catch (err) {
    if (!isNodeErrorWithCode(err, "ENOENT")) {
      return path.join(tmpdir(), "openclaw");
    }
<<<<<<< HEAD
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    mode?: number;
    uid?: number;
  }): boolean => {
    return st.isDirectory() && !st.isSymbolicLink() && isSecureDirForUser(st);
  };

  const resolveDirState = (candidatePath: string): "available" | "missing" | "invalid" => {
    try {
      const preferred = lstatSync(POSIX_OPENCLAW_TMP_DIR);
      if (!isTrustedPreferredDir(preferred)) {
        return "invalid";
      }
      if (requireWritableAccess) {
        accessSync(POSIX_OPENCLAW_TMP_DIR, fs.constants.W_OK | fs.constants.X_OK);
      }
=======
      accessSync(candidatePath, TMP_DIR_ACCESS_MODE);
>>>>>>> 1f004e664 (refactor(tmp): simplify trusted tmp dir state checks)
      return "available";
    } catch (err) {
      if (isNodeErrorWithCode(err, "ENOENT")) {
        return "missing";
      }
      return "invalid";
    }
  };

  const existingPreferredState = resolvePreferredState(true);
=======
  const existingPreferredState = resolveDirState(POSIX_OPENCLAW_TMP_DIR);
>>>>>>> 1f004e664 (refactor(tmp): simplify trusted tmp dir state checks)
  if (existingPreferredState === "available") {
    return POSIX_OPENCLAW_TMP_DIR;
  }
  if (existingPreferredState === "invalid") {
    return fallback();
>>>>>>> def993dbd (refactor(tmp): harden temp boundary guardrails)
  }

  try {
    accessSync("/tmp", fs.constants.W_OK | fs.constants.X_OK);
<<<<<<< HEAD
      return ensureTrustedFallbackDir();
>>>>>>> f41715a18 (refactor(browser): split act route modules and dedupe path guards)
    }
>>>>>>> def993dbd (refactor(tmp): harden temp boundary guardrails)
    return POSIX_OPENCLAW_TMP_DIR;
  } catch {
    return path.join(tmpdir(), "openclaw");
  }
}
