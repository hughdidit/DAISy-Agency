import fs from "node:fs";
import path from "node:path";
<<<<<<< HEAD
import { assertNoPathAliasEscape, type PathAliasPolicy } from "./path-alias-guards.js";
import { isNotFoundPathError, isPathInside } from "./path-guards.js";
import { openVerifiedFileSync, type SafeOpenSyncFailureReason } from "./safe-open-sync.js";
=======
import { resolveBoundaryPath, resolveBoundaryPathSync } from "./boundary-path.js";
import type { PathAliasPolicy } from "./path-alias-guards.js";
import {
  openVerifiedFileSync,
  type SafeOpenSyncAllowedType,
  type SafeOpenSyncFailureReason,
} from "./safe-open-sync.js";
>>>>>>> 687f5779d (sandbox: allow directory boundary checks for mkdirp)

type BoundaryReadFs = Pick<
  typeof fs,
  | "closeSync"
  | "constants"
  | "fstatSync"
  | "lstatSync"
  | "openSync"
  | "readFileSync"
  | "realpathSync"
>;

export type BoundaryFileOpenFailureReason = SafeOpenSyncFailureReason | "validation";

export type BoundaryFileOpenResult =
  | { ok: true; path: string; fd: number; stat: fs.Stats; rootRealPath: string }
  | { ok: false; reason: BoundaryFileOpenFailureReason; error?: unknown };

export type OpenBoundaryFileSyncParams = {
  absolutePath: string;
  rootPath: string;
  boundaryLabel: string;
  rootRealPath?: string;
  maxBytes?: number;
  rejectHardlinks?: boolean;
  allowedTypes?: readonly SafeOpenSyncAllowedType[];
  skipLexicalRootCheck?: boolean;
  ioFs?: BoundaryReadFs;
};

export type OpenBoundaryFileParams = OpenBoundaryFileSyncParams & {
  aliasPolicy?: PathAliasPolicy;
};

function safeRealpathSync(ioFs: Pick<typeof fs, "realpathSync">, value: string): string {
  try {
    return path.resolve(ioFs.realpathSync(value));
  } catch {
    return path.resolve(value);
  }
}

export function canUseBoundaryFileOpen(ioFs: typeof fs): boolean {
  return (
    typeof ioFs.openSync === "function" &&
    typeof ioFs.closeSync === "function" &&
    typeof ioFs.fstatSync === "function" &&
    typeof ioFs.lstatSync === "function" &&
    typeof ioFs.realpathSync === "function" &&
    typeof ioFs.readFileSync === "function" &&
    typeof ioFs.constants === "object" &&
    ioFs.constants !== null
  );
}

export function openBoundaryFileSync(params: OpenBoundaryFileSyncParams): BoundaryFileOpenResult {
  const ioFs = params.ioFs ?? fs;
  const absolutePath = path.resolve(params.absolutePath);
  const rootPath = path.resolve(params.rootPath);
  const rootRealPath = params.rootRealPath
    ? path.resolve(params.rootRealPath)
    : safeRealpathSync(ioFs, rootPath);

  let resolvedPath = absolutePath;
  const lexicalInsideRoot = isPathInside(rootPath, absolutePath);
  try {
    const candidateRealPath = path.resolve(ioFs.realpathSync(absolutePath));
    if (
      !params.skipLexicalRootCheck &&
      !lexicalInsideRoot &&
      !isPathInside(rootRealPath, candidateRealPath)
    ) {
      return {
        ok: false,
        reason: "validation",
        error: new Error(
          `Path escapes ${params.boundaryLabel}: ${absolutePath} (root: ${rootPath})`,
        ),
      };
    }
    if (!isPathInside(rootRealPath, candidateRealPath)) {
      return {
        ok: false,
        reason: "validation",
        error: new Error(
          `Path resolves outside ${params.boundaryLabel}: ${absolutePath} (root: ${rootRealPath})`,
        ),
      };
    }
    resolvedPath = candidateRealPath;
  } catch (error) {
    if (!params.skipLexicalRootCheck && !lexicalInsideRoot) {
      return {
        ok: false,
        reason: "validation",
        error: new Error(
          `Path escapes ${params.boundaryLabel}: ${absolutePath} (root: ${rootPath})`,
        ),
      };
    }
    if (!isNotFoundPathError(error)) {
      // Keep resolvedPath as lexical path; openVerifiedFileSync below will produce
      // a canonical error classification for missing/unreadable targets.
    }
  }

  return openBoundaryFileResolved({
    absolutePath,
    resolvedPath,
    rootRealPath,
    maxBytes: params.maxBytes,
    rejectHardlinks: params.rejectHardlinks,
    allowedType: params.allowedType,
    ioFs,
  });
}

function openBoundaryFileResolved(params: {
  absolutePath: string;
  resolvedPath: string;
  rootRealPath: string;
  maxBytes?: number;
  rejectHardlinks?: boolean;
  allowedType?: SafeOpenSyncAllowedType;
  ioFs: BoundaryReadFs;
}): BoundaryFileOpenResult {
  const opened = openVerifiedFileSync({
    filePath: params.absolutePath,
    resolvedPath: params.resolvedPath,
    rejectHardlinks: params.rejectHardlinks ?? true,
    maxBytes: params.maxBytes,
<<<<<<< HEAD
    allowedTypes: params.allowedTypes,
    ioFs,
=======
    allowedType: params.allowedType,
    ioFs: params.ioFs,
>>>>>>> dcd19da42 (refactor: simplify sandbox boundary open flow)
  });
  if (!opened.ok) {
    return opened;
  }
  return {
    ok: true,
    path: opened.path,
    fd: opened.fd,
    stat: opened.stat,
    rootRealPath: params.rootRealPath,
  };
}

export async function openBoundaryFile(
  params: OpenBoundaryFileParams,
): Promise<BoundaryFileOpenResult> {
  const ioFs = params.ioFs ?? fs;
  const absolutePath = path.resolve(params.absolutePath);
  let resolvedPath: string;
  let rootRealPath: string;
  try {
<<<<<<< HEAD
    await assertNoPathAliasEscape({
      absolutePath: params.absolutePath,
=======
    const resolved = await resolveBoundaryPath({
      absolutePath,
>>>>>>> dcd19da42 (refactor: simplify sandbox boundary open flow)
      rootPath: params.rootPath,
      boundaryLabel: params.boundaryLabel,
      policy: params.aliasPolicy,
    });
    resolvedPath = resolved.canonicalPath;
    rootRealPath = resolved.rootCanonicalPath;
  } catch (error) {
    return { ok: false, reason: "validation", error };
  }
  return openBoundaryFileResolved({
    absolutePath,
    resolvedPath,
    rootRealPath,
    maxBytes: params.maxBytes,
    rejectHardlinks: params.rejectHardlinks,
    allowedType: params.allowedType,
    ioFs,
  });
}
