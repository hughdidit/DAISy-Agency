import path from "node:path";
<<<<<<< HEAD
=======
import { SafeOpenError, openFileWithinRoot } from "../infra/fs-safe.js";
import { isNotFoundPathError, isPathInside } from "../infra/path-guards.js";
>>>>>>> 496a76c03 (fix(security): harden browser trace/download temp path handling)
import { resolvePreferredOpenClawTmpDir } from "../infra/tmp-openclaw-dir.js";

export const DEFAULT_BROWSER_TMP_DIR = resolvePreferredOpenClawTmpDir();
export const DEFAULT_TRACE_DIR = DEFAULT_BROWSER_TMP_DIR;
export const DEFAULT_DOWNLOAD_DIR = path.join(DEFAULT_BROWSER_TMP_DIR, "downloads");
export const DEFAULT_UPLOAD_DIR = path.join(DEFAULT_BROWSER_TMP_DIR, "uploads");

export function resolvePathWithinRoot(params: {
  rootDir: string;
  requestedPath: string;
  scopeLabel: string;
  defaultFileName?: string;
}): { ok: true; path: string } | { ok: false; error: string } {
  const root = path.resolve(params.rootDir);
  const raw = params.requestedPath.trim();
  if (!raw) {
    if (!params.defaultFileName) {
      return { ok: false, error: "path is required" };
    }
    return { ok: true, path: path.join(root, params.defaultFileName) };
  }
  const resolved = path.resolve(root, raw);
  const rel = path.relative(root, resolved);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    return { ok: false, error: `Invalid path: must stay within ${params.scopeLabel}` };
  }
  return { ok: true, path: resolved };
}

export async function resolveWritablePathWithinRoot(params: {
  rootDir: string;
  requestedPath: string;
  scopeLabel: string;
  defaultFileName?: string;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const lexical = resolvePathWithinRoot(params);
  if (!lexical.ok) {
    return lexical;
  }

  const invalid = (): { ok: false; error: string } => ({
    ok: false,
    error: `Invalid path: must stay within ${params.scopeLabel}`,
  });

  const rootDir = path.resolve(params.rootDir);
  let rootRealPath: string;
  try {
    const rootLstat = await fs.lstat(rootDir);
    if (!rootLstat.isDirectory() || rootLstat.isSymbolicLink()) {
      return invalid();
    }
    rootRealPath = await fs.realpath(rootDir);
  } catch {
    return invalid();
  }

  const requestedPath = lexical.path;
  const parentDir = path.dirname(requestedPath);
  try {
    const parentLstat = await fs.lstat(parentDir);
    if (!parentLstat.isDirectory() || parentLstat.isSymbolicLink()) {
      return invalid();
    }
    const parentRealPath = await fs.realpath(parentDir);
    if (!isPathInside(rootRealPath, parentRealPath)) {
      return invalid();
    }
  } catch {
    return invalid();
  }

  try {
    const targetLstat = await fs.lstat(requestedPath);
    if (targetLstat.isSymbolicLink() || !targetLstat.isFile()) {
      return invalid();
    }
    const targetRealPath = await fs.realpath(requestedPath);
    if (!isPathInside(rootRealPath, targetRealPath)) {
      return invalid();
    }
  } catch (err) {
    if (!isNotFoundPathError(err)) {
      return invalid();
    }
  }

  return lexical;
}

export function resolvePathsWithinRoot(params: {
  rootDir: string;
  requestedPaths: string[];
  scopeLabel: string;
}): { ok: true; paths: string[] } | { ok: false; error: string } {
  const resolvedPaths: string[] = [];
  for (const raw of params.requestedPaths) {
    const pathResult = resolvePathWithinRoot({
      rootDir: params.rootDir,
      requestedPath: raw,
      scopeLabel: params.scopeLabel,
    });
    if (!pathResult.ok) {
      return { ok: false, error: pathResult.error };
    }
    resolvedPaths.push(pathResult.path);
  }
  return { ok: true, paths: resolvedPaths };
}
