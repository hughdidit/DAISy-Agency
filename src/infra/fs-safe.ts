<<<<<<< HEAD
import { constants as fsConstants } from "node:fs";
import type { Stats } from "node:fs";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { constants as fsConstants } from "node:fs";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { Stats } from "node:fs";
>>>>>>> ed11e93cf (chore(format))
import type { FileHandle } from "node:fs/promises";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { constants as fsConstants } from "node:fs";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { FileHandle } from "node:fs/promises";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { constants as fsConstants } from "node:fs";
=======
>>>>>>> bf3f8ec42 (refactor(media): unify safe local file reads)
import type { FileHandle } from "node:fs/promises";
=======
>>>>>>> b4792c736 (style: format fs-safe and web media)
import { constants as fsConstants } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
=======
import { sameFileIdentity } from "./file-identity.js";
import { expandHomePrefix } from "./home-dir.js";
import { assertNoPathAliasEscape } from "./path-alias-guards.js";
<<<<<<< HEAD
import { isNotFoundPathError, isPathInside, isSymlinkOpenError } from "./path-guards.js";
>>>>>>> 645d96395 (feat: expand ~ (tilde) to home directory in file tools (read/write/edit) (openclaw#29779) thanks @Glucksberg)
=======
import {
  hasNodeErrorCode,
  isNotFoundPathError,
  isPathInside,
  isSymlinkOpenError,
} from "./path-guards.js";
>>>>>>> 6398a0ba8 (fix(infra): avoid EISDIR leak to messaging when Read targets directory (Closes #31186))

export type SafeOpenErrorCode =
  | "invalid-path"
  | "not-found"
  | "symlink"
  | "not-file"
  | "path-mismatch"
  | "too-large";

export class SafeOpenError extends Error {
  code: SafeOpenErrorCode;

  constructor(code: SafeOpenErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "SafeOpenError";
  }
}

export type SafeOpenResult = {
  handle: FileHandle;
  realPath: string;
  stat: Stats;
};

export type SafeLocalReadResult = {
  buffer: Buffer;
  realPath: string;
  stat: Stats;
};

const NOT_FOUND_CODES = new Set(["ENOENT", "ENOTDIR"]);
const SUPPORTS_NOFOLLOW = process.platform !== "win32" && "O_NOFOLLOW" in fsConstants;
const OPEN_READ_FLAGS = fsConstants.O_RDONLY | (SUPPORTS_NOFOLLOW ? fsConstants.O_NOFOLLOW : 0);

const ensureTrailingSep = (value: string) => (value.endsWith(path.sep) ? value : value + path.sep);

<<<<<<< HEAD
<<<<<<< HEAD
const isWindows = process.platform === "win32";

const isNodeError = (err: unknown): err is NodeJS.ErrnoException =>
  Boolean(err && typeof err === "object" && "code" in (err as Record<string, unknown>));

const isNotFoundError = (err: unknown) =>
  isNodeError(err) && typeof err.code === "string" && NOT_FOUND_CODES.has(err.code);

const isSymlinkOpenError = (err: unknown) =>
  isNodeError(err) && (err.code === "ELOOP" || err.code === "EINVAL" || err.code === "ENOTSUP");
=======
/**
 * Compare file stats for identity verification.
 * On Windows, device IDs (dev) are unreliable and may differ between
 * handle.stat() and fs.lstat() for the same file. We skip dev comparison
 * on Windows and rely solely on inode (ino) matching.
 */
function statsMatch(stat1: Stats, stat2: Stats): boolean {
  if (stat1.ino !== stat2.ino) {
    return false;
  }
  // On Windows, dev values are unreliable across different stat sources
  if (process.platform !== "win32" && stat1.dev !== stat2.dev) {
    return false;
  }
  return true;
}
>>>>>>> 7455ceecf (fix(windows): skip unreliable dev comparison in fs-safe openVerifiedLocalFile)

async function openVerifiedLocalFile(filePath: string): Promise<SafeOpenResult> {
=======
async function expandRelativePathWithHome(relativePath: string): Promise<string> {
  let home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  try {
    home = await fs.realpath(home);
  } catch {
    // If the home dir cannot be canonicalized, keep lexical expansion behavior.
  }
  return expandHomePrefix(relativePath, { home });
}

async function openVerifiedLocalFile(
  filePath: string,
  options?: {
    rejectHardlinks?: boolean;
  },
): Promise<SafeOpenResult> {
<<<<<<< HEAD
>>>>>>> 645d96395 (feat: expand ~ (tilde) to home directory in file tools (read/write/edit) (openclaw#29779) thanks @Glucksberg)
=======
  // Reject directories before opening so we never surface EISDIR to callers (e.g. tool
  // results that get sent to messaging channels). See openclaw/openclaw#31186.
  try {
    const preStat = await fs.lstat(filePath);
    if (preStat.isDirectory()) {
      throw new SafeOpenError("not-file", "not a file");
    }
  } catch (err) {
    if (err instanceof SafeOpenError) {
      throw err;
    }
    // ENOENT and other lstat errors: fall through and let fs.open handle.
  }

>>>>>>> 6398a0ba8 (fix(infra): avoid EISDIR leak to messaging when Read targets directory (Closes #31186))
  let handle: FileHandle;
  try {
    handle = await fs.open(filePath, OPEN_READ_FLAGS);
  } catch (err) {
    if (isNotFoundError(err)) {
      throw new SafeOpenError("not-found", "file not found");
    }
    if (isSymlinkOpenError(err)) {
      throw new SafeOpenError("symlink", "symlink open blocked", { cause: err });
    }
    // Defensive: if open still throws EISDIR (e.g. race), sanitize so it never leaks.
    if (hasNodeErrorCode(err, "EISDIR")) {
      throw new SafeOpenError("not-file", "not a file");
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
    if (!statsMatch(stat, lstat)) {
      throw new SafeOpenError("path-mismatch", "path changed during read");
    }

    const realPath = await fs.realpath(filePath);
    const realStat = await fs.stat(realPath);
    if (!statsMatch(stat, realStat)) {
      throw new SafeOpenError("path-mismatch", "path mismatch");
    }

    return { handle, realPath, stat };
  } catch (err) {
    await handle.close().catch(() => {});
    if (err instanceof SafeOpenError) {
      throw err;
    }
    if (isNotFoundError(err)) {
      throw new SafeOpenError("not-found", "file not found");
    }
    throw err;
  }
}

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
<<<<<<< HEAD
  // Precompute case-folded prefix once for the two containment checks.
  const rootPrefix = isWindows ? rootWithSep.toLowerCase() : rootWithSep;
  const withinRoot = (p: string) => (isWindows ? p.toLowerCase() : p).startsWith(rootPrefix);
  const resolved = path.resolve(rootWithSep, params.relativePath);
  if (!withinRoot(resolved)) {
    throw new SafeOpenError("invalid-path", "path escapes root");
=======
  const expanded = await expandRelativePathWithHome(params.relativePath);
  const resolved = path.resolve(rootWithSep, expanded);
  if (!isPathInside(rootWithSep, resolved)) {
    throw new SafeOpenError("outside-workspace", "file is outside workspace root");
>>>>>>> 645d96395 (feat: expand ~ (tilde) to home directory in file tools (read/write/edit) (openclaw#29779) thanks @Glucksberg)
  }

<<<<<<< HEAD
<<<<<<< HEAD
  const supportsNoFollow = !isWindows && "O_NOFOLLOW" in fsConstants;
  const flags = fsConstants.O_RDONLY | (supportsNoFollow ? (fsConstants.O_NOFOLLOW as number) : 0);
=======
  const supportsNoFollow = process.platform !== "win32" && "O_NOFOLLOW" in fsConstants;
  const flags = fsConstants.O_RDONLY | (supportsNoFollow ? fsConstants.O_NOFOLLOW : 0);
>>>>>>> 15792b153 (chore: Enable more lint rules, disable some that trigger a lot. Will clean up later.)

  let handle: FileHandle;
=======
  let opened: SafeOpenResult;
>>>>>>> bf3f8ec42 (refactor(media): unify safe local file reads)
  try {
    opened = await openVerifiedLocalFile(resolved);
  } catch (err) {
    if (err instanceof SafeOpenError) {
      if (err.code === "not-found") {
        throw err;
      }
      throw new SafeOpenError("invalid-path", "path is not a regular file under root", {
        cause: err,
      });
    }
    throw err;
  }

  if (!opened.realPath.startsWith(rootWithSep)) {
    await opened.handle.close().catch(() => {});
    throw new SafeOpenError("invalid-path", "path escapes root");
  }

  return opened;
}

export async function readLocalFileSafely(params: {
  filePath: string;
  maxBytes?: number;
}): Promise<SafeLocalReadResult> {
  const opened = await openVerifiedLocalFile(params.filePath);
  try {
    if (params.maxBytes !== undefined && opened.stat.size > params.maxBytes) {
      throw new SafeOpenError(
        "too-large",
        `file exceeds limit of ${params.maxBytes} bytes (got ${opened.stat.size})`,
      );
    }
<<<<<<< HEAD

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
    if (err instanceof SafeOpenError) {
      throw err;
    }
    if (isNotFoundError(err)) {
      throw new SafeOpenError("not-found", "file not found");
    }
    throw err;
=======
    const buffer = await opened.handle.readFile();
    return { buffer, realPath: opened.realPath, stat: opened.stat };
  } finally {
    await opened.handle.close().catch(() => {});
<<<<<<< HEAD
>>>>>>> bf3f8ec42 (refactor(media): unify safe local file reads)
=======
  }
}

export async function writeFileWithinRoot(params: {
  rootDir: string;
  relativePath: string;
  data: string | Buffer;
  encoding?: BufferEncoding;
  mkdir?: boolean;
}): Promise<void> {
  let rootReal: string;
  try {
    rootReal = await fs.realpath(params.rootDir);
  } catch (err) {
    if (isNotFoundPathError(err)) {
      throw new SafeOpenError("not-found", "root dir not found");
    }
    throw err;
  }
  const rootWithSep = ensureTrailingSep(rootReal);
  const expanded = await expandRelativePathWithHome(params.relativePath);
  const resolved = path.resolve(rootWithSep, expanded);
  if (!isPathInside(rootWithSep, resolved)) {
    throw new SafeOpenError("outside-workspace", "file is outside workspace root");
  }
  try {
    await assertNoPathAliasEscape({
      absolutePath: resolved,
      rootPath: rootReal,
      boundaryLabel: "root",
    });
  } catch (err) {
    throw new SafeOpenError("invalid-path", "path alias escape blocked", { cause: err });
  }
  if (params.mkdir !== false) {
    await fs.mkdir(path.dirname(resolved), { recursive: true });
  }

  let ioPath = resolved;
  try {
    const resolvedRealPath = await fs.realpath(resolved);
    if (!isPathInside(rootWithSep, resolvedRealPath)) {
      throw new SafeOpenError("outside-workspace", "file is outside workspace root");
    }
    ioPath = resolvedRealPath;
  } catch (err) {
    if (err instanceof SafeOpenError) {
      throw err;
    }
    if (!isNotFoundPathError(err)) {
      throw err;
    }
  }

  let handle: FileHandle;
  try {
    handle = await fs.open(ioPath, OPEN_WRITE_FLAGS, 0o600);
  } catch (err) {
    if (isNotFoundPathError(err)) {
      throw new SafeOpenError("not-found", "file not found");
    }
    if (isSymlinkOpenError(err)) {
      throw new SafeOpenError("invalid-path", "symlink open blocked", { cause: err });
    }
    throw err;
  }

  try {
    const [stat, lstat] = await Promise.all([handle.stat(), fs.lstat(ioPath)]);
    if (lstat.isSymbolicLink() || !stat.isFile()) {
      throw new SafeOpenError("invalid-path", "path is not a regular file under root");
    }
    if (stat.nlink > 1) {
      throw new SafeOpenError("invalid-path", "hardlinked path not allowed");
    }
    if (!sameFileIdentity(stat, lstat)) {
      throw new SafeOpenError("path-mismatch", "path changed during write");
    }

    const realPath = await fs.realpath(ioPath);
    const realStat = await fs.stat(realPath);
    if (!sameFileIdentity(stat, realStat)) {
      throw new SafeOpenError("path-mismatch", "path mismatch");
    }
    if (realStat.nlink > 1) {
      throw new SafeOpenError("invalid-path", "hardlinked path not allowed");
    }
    if (!isPathInside(rootWithSep, realPath)) {
      throw new SafeOpenError("outside-workspace", "file is outside workspace root");
    }

    if (typeof params.data === "string") {
      await handle.writeFile(params.data, params.encoding ?? "utf8");
    } else {
      await handle.writeFile(params.data);
    }
  } finally {
    await handle.close().catch(() => {});
>>>>>>> 645d96395 (feat: expand ~ (tilde) to home directory in file tools (read/write/edit) (openclaw#29779) thanks @Glucksberg)
  }
}
