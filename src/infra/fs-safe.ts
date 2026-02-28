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

<<<<<<< HEAD
export type SafeOpenErrorCode = "invalid-path" | "not-found";
=======
export type SafeOpenErrorCode =
  | "invalid-path"
  | "not-found"
  | "outside-workspace"
  | "symlink"
  | "not-file"
  | "path-mismatch"
  | "too-large";
>>>>>>> f5c2be191 (fix: distinguish outside-workspace errors from not-found in fs-safe)

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
<<<<<<< HEAD
  if (!withinRoot(resolved)) {
    throw new SafeOpenError("invalid-path", "path escapes root");
  }

  const supportsNoFollow = !isWindows && "O_NOFOLLOW" in fsConstants;
  const flags = fsConstants.O_RDONLY | (supportsNoFollow ? (fsConstants.O_NOFOLLOW as number) : 0);
=======
  if (!isPathInside(rootWithSep, resolved)) {
    throw new SafeOpenError("outside-workspace", "file is outside workspace root");
  }

  let opened: SafeOpenResult;
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

  if (params.rejectHardlinks !== false && opened.stat.nlink > 1) {
    await opened.handle.close().catch(() => {});
    throw new SafeOpenError("invalid-path", "hardlinked path not allowed");
  }

  if (!isPathInside(rootWithSep, opened.realPath)) {
    await opened.handle.close().catch(() => {});
    throw new SafeOpenError("outside-workspace", "file is outside workspace root");
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
    const buffer = await opened.handle.readFile();
    return { buffer, realPath: opened.realPath, stat: opened.stat };
  } finally {
    await opened.handle.close().catch(() => {});
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
  const resolved = path.resolve(rootWithSep, params.relativePath);
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
>>>>>>> f5c2be191 (fix: distinguish outside-workspace errors from not-found in fs-safe)

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

<<<<<<< HEAD
    const realPath = await fs.realpath(resolved);
    if (!withinRoot(realPath)) {
      throw new SafeOpenError("invalid-path", "path escapes root");
=======
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
>>>>>>> f5c2be191 (fix: distinguish outside-workspace errors from not-found in fs-safe)
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
