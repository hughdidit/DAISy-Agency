import { constants as fsConstants } from "node:fs";
import type { Stats } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD
=======
import { sameFileIdentity } from "./file-identity.js";
import { isNotFoundPathError, isPathInside, isSymlinkOpenError } from "./path-guards.js";
>>>>>>> 943b8f171 (fix: align windows safe-open file identity checks)

export type SafeOpenErrorCode = "invalid-path" | "not-found";

export class SafeOpenError extends Error {
  code: SafeOpenErrorCode;

  constructor(code: SafeOpenErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "SafeOpenError";
  }
}

export type SafeOpenResult = {
  handle: FileHandle;
  realPath: string;
  stat: Stats;
};

const NOT_FOUND_CODES = new Set(["ENOENT", "ENOTDIR"]);

const ensureTrailingSep = (value: string) => (value.endsWith(path.sep) ? value : value + path.sep);

<<<<<<< HEAD
const isWindows = process.platform === "win32";

const isNodeError = (err: unknown): err is NodeJS.ErrnoException =>
  Boolean(err && typeof err === "object" && "code" in (err as Record<string, unknown>));

const isNotFoundError = (err: unknown) =>
  isNodeError(err) && typeof err.code === "string" && NOT_FOUND_CODES.has(err.code);

const isSymlinkOpenError = (err: unknown) =>
  isNodeError(err) && (err.code === "ELOOP" || err.code === "EINVAL" || err.code === "ENOTSUP");
=======
async function openVerifiedLocalFile(filePath: string): Promise<SafeOpenResult> {
  let handle: FileHandle;
  try {
    handle = await fs.open(filePath, OPEN_READ_FLAGS);
  } catch (err) {
    if (isNotFoundPathError(err)) {
      throw new SafeOpenError("not-found", "file not found");
    }
    if (isSymlinkOpenError(err)) {
      throw new SafeOpenError("symlink", "symlink open blocked", { cause: err });
    }
    throw err;
  }

  try {
    const [stat, lstat] = await Promise.all([handle.stat(), fs.lstat(filePath)]);
    if (lstat.isSymbolicLink()) {
      throw new SafeOpenError("symlink", "symlink not allowed");
    }
    if (!stat.isFile()) {
      throw new SafeOpenError("not-file", "not a file");
    }
    if (!sameFileIdentity(stat, lstat)) {
      throw new SafeOpenError("path-mismatch", "path changed during read");
    }

    const realPath = await fs.realpath(filePath);
    const realStat = await fs.stat(realPath);
    if (!sameFileIdentity(stat, realStat)) {
      throw new SafeOpenError("path-mismatch", "path mismatch");
    }

    return { handle, realPath, stat };
  } catch (err) {
    await handle.close().catch(() => {});
    if (err instanceof SafeOpenError) {
      throw err;
    }
    if (isNotFoundPathError(err)) {
      throw new SafeOpenError("not-found", "file not found");
    }
    throw err;
  }
}
>>>>>>> 943b8f171 (fix: align windows safe-open file identity checks)

export async function openFileWithinRoot(params: {
  rootDir: string;
  relativePath: string;
}): Promise<SafeOpenResult> {
  let rootReal: string;
  try {
    rootReal = await fs.realpath(params.rootDir);
  } catch (err) {
    if (isNotFoundError(err)) {
      throw new SafeOpenError("not-found", "root dir not found");
    }
    throw err;
  }
  const rootWithSep = ensureTrailingSep(rootReal);
  // Precompute case-folded prefix once for the two containment checks.
  const rootPrefix = isWindows ? rootWithSep.toLowerCase() : rootWithSep;
  const withinRoot = (p: string) => (isWindows ? p.toLowerCase() : p).startsWith(rootPrefix);
  const resolved = path.resolve(rootWithSep, params.relativePath);
  if (!withinRoot(resolved)) {
    throw new SafeOpenError("invalid-path", "path escapes root");
  }

  const supportsNoFollow = !isWindows && "O_NOFOLLOW" in fsConstants;
  const flags = fsConstants.O_RDONLY | (supportsNoFollow ? (fsConstants.O_NOFOLLOW as number) : 0);

  let handle: FileHandle;
  try {
    handle = await fs.open(resolved, flags);
  } catch (err) {
    if (isNotFoundError(err)) {
      throw new SafeOpenError("not-found", "file not found");
    }
    if (isSymlinkOpenError(err)) {
      throw new SafeOpenError("invalid-path", "symlink open blocked");
    }
    throw err;
  }

  try {
    const lstat = await fs.lstat(resolved).catch(() => null);
    if (lstat?.isSymbolicLink()) {
      throw new SafeOpenError("invalid-path", "symlink not allowed");
    }

    const realPath = await fs.realpath(resolved);
    if (!withinRoot(realPath)) {
      throw new SafeOpenError("invalid-path", "path escapes root");
    }

    const stat = await handle.stat();
    if (!stat.isFile()) {
      throw new SafeOpenError("invalid-path", "not a file");
    }

    // On Windows, fstat (handle.stat) and stat (fs.stat) can return different
    // ino/dev values because they use different underlying Win32 APIs, so skip
    // this TOCTOU check on platforms where it is unreliable.
    if (!isWindows) {
      const realStat = await fs.stat(realPath);
      if (stat.ino !== realStat.ino || stat.dev !== realStat.dev) {
        throw new SafeOpenError("invalid-path", "path mismatch");
      }
    }

    return { handle, realPath, stat };
  } catch (err) {
    await handle.close().catch(() => {});
    if (err instanceof SafeOpenError) throw err;
    if (isNotFoundError(err)) {
      throw new SafeOpenError("not-found", "file not found");
    }
    throw err;
  }
}
