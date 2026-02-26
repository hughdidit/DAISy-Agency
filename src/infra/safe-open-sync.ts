import fs from "node:fs";

export type SafeOpenSyncFailureReason = "path" | "validation" | "io";

export type SafeOpenSyncResult =
  | { ok: true; path: string; fd: number; stat: fs.Stats }
  | { ok: false; reason: SafeOpenSyncFailureReason; error?: unknown };

type SafeOpenSyncFs = Pick<
  typeof fs,
  "constants" | "lstatSync" | "realpathSync" | "openSync" | "fstatSync" | "closeSync"
>;

function isExpectedPathError(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  return code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP";
}

export function sameFileIdentity(left: fs.Stats, right: fs.Stats): boolean {
  // On Windows, lstatSync (by path) may return dev=0 while fstatSync (by fd)
  // returns the real volume serial number.  When either dev is 0, fall back to
  // ino-only comparison which is still unique within a single volume.
  const devMatch =
    left.dev === right.dev || (process.platform === "win32" && (left.dev === 0 || right.dev === 0));
  return devMatch && left.ino === right.ino;
}

export function openVerifiedFileSync(params: {
  filePath: string;
  resolvedPath?: string;
  rejectPathSymlink?: boolean;
  rejectHardlinks?: boolean;
  maxBytes?: number;
  ioFs?: SafeOpenSyncFs;
}): SafeOpenSyncResult {
  const ioFs = params.ioFs ?? fs;
  const openReadFlags =
    ioFs.constants.O_RDONLY |
    (typeof ioFs.constants.O_NOFOLLOW === "number" ? ioFs.constants.O_NOFOLLOW : 0);
  let fd: number | null = null;
  try {
    if (params.rejectPathSymlink) {
      const candidateStat = ioFs.lstatSync(params.filePath);
      if (candidateStat.isSymbolicLink()) {
        return { ok: false, reason: "validation" };
      }
    }

    const realPath = params.resolvedPath ?? ioFs.realpathSync(params.filePath);
    const preOpenStat = ioFs.lstatSync(realPath);
    if (!preOpenStat.isFile()) {
      return { ok: false, reason: "validation" };
    }
    if (params.rejectHardlinks && preOpenStat.nlink > 1) {
      return { ok: false, reason: "validation" };
    }
    if (params.maxBytes !== undefined && preOpenStat.size > params.maxBytes) {
      return { ok: false, reason: "validation" };
    }

    fd = ioFs.openSync(realPath, openReadFlags);
    const openedStat = ioFs.fstatSync(fd);
    if (!openedStat.isFile()) {
      return { ok: false, reason: "validation" };
    }
    if (params.rejectHardlinks && openedStat.nlink > 1) {
      return { ok: false, reason: "validation" };
    }
    if (params.maxBytes !== undefined && openedStat.size > params.maxBytes) {
      return { ok: false, reason: "validation" };
    }
    if (!sameFileIdentity(preOpenStat, openedStat)) {
      return { ok: false, reason: "validation" };
    }

    const opened = { ok: true as const, path: realPath, fd, stat: openedStat };
    fd = null;
    return opened;
  } catch (error) {
    if (isExpectedPathError(error)) {
      return { ok: false, reason: "path", error };
    }
    return { ok: false, reason: "io", error };
  } finally {
    if (fd !== null) {
      ioFs.closeSync(fd);
    }
  }
}
