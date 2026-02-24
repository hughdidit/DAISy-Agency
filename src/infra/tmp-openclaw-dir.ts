import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const POSIX_OPENCLAW_TMP_DIR = "/tmp/openclaw";

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

<<<<<<< HEAD
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
=======
  const isTrustedPreferredDir = (st: {
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    mode?: number;
    uid?: number;
  }): boolean => {
    return st.isDirectory() && !st.isSymbolicLink() && isSecureDirForUser(st);
  };

  const resolvePreferredState = (
    requireWritableAccess: boolean,
  ): "available" | "missing" | "invalid" => {
    try {
      const preferred = lstatSync(POSIX_OPENCLAW_TMP_DIR);
      if (!isTrustedPreferredDir(preferred)) {
        return "invalid";
      }
      if (requireWritableAccess) {
        accessSync(POSIX_OPENCLAW_TMP_DIR, fs.constants.W_OK | fs.constants.X_OK);
      }
      return "available";
    } catch (err) {
      if (isNodeErrorWithCode(err, "ENOENT")) {
        return "missing";
      }
      return "invalid";
    }
  };

  const existingPreferredState = resolvePreferredState(true);
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
=======
    // Create with a safe default; subsequent callers expect it exists.
    mkdirSync(POSIX_OPENCLAW_TMP_DIR, { recursive: true, mode: 0o700 });
    if (resolvePreferredState(true) !== "available") {
      return fallback();
    }
>>>>>>> def993dbd (refactor(tmp): harden temp boundary guardrails)
    return POSIX_OPENCLAW_TMP_DIR;
  } catch {
    return path.join(tmpdir(), "openclaw");
  }
}
