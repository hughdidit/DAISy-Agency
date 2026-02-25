import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
const HTTP_URL_RE = /^https?:\/\//i;
const DATA_URL_RE = /^data:/i;
const SANDBOX_CONTAINER_WORKDIR = "/workspace";

function normalizeUnicodeSpaces(str: string): string {
  return str.replace(UNICODE_SPACES, " ");
}

function normalizeAtPrefix(filePath: string): string {
  return filePath.startsWith("@") ? filePath.slice(1) : filePath;
}

function expandPath(filePath: string): string {
  const normalized = normalizeUnicodeSpaces(normalizeAtPrefix(filePath));
  if (normalized === "~") {
    return os.homedir();
  }
  if (normalized.startsWith("~/")) {
    return os.homedir() + normalized.slice(1);
  }
  return normalized;
}

function resolveToCwd(filePath: string, cwd: string): string {
  const expanded = expandPath(filePath);
  if (path.isAbsolute(expanded)) {
    return expanded;
  }
  return path.resolve(cwd, expanded);
}

export function resolveSandboxInputPath(filePath: string, cwd: string): string {
  return resolveToCwd(filePath, cwd);
}

export function resolveSandboxPath(params: { filePath: string; cwd: string; root: string }): {
  resolved: string;
  relative: string;
} {
  const resolved = resolveSandboxInputPath(params.filePath, params.cwd);
  const rootResolved = path.resolve(params.root);
  const relative = path.relative(rootResolved, resolved);
  if (!relative || relative === "") {
    return { resolved, relative: "" };
  }
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes sandbox root (${shortPath(rootResolved)}): ${params.filePath}`);
  }
  return { resolved, relative };
}

export async function assertSandboxPath(params: {
  filePath: string;
  cwd: string;
  root: string;
  allowFinalSymlink?: boolean;
}) {
  const resolved = resolveSandboxPath(params);
<<<<<<< HEAD
  await assertNoSymlink(resolved.relative, path.resolve(params.root));
=======
  await assertNoSymlinkEscape(resolved.relative, path.resolve(params.root), {
    allowFinalSymlink: params.allowFinalSymlink,
  });
>>>>>>> 914b9d1e7 (fix(agents): block workspaceOnly apply_patch delete symlink escape)
  return resolved;
}

export function assertMediaNotDataUrl(media: string): void {
  const raw = media.trim();
  if (DATA_URL_RE.test(raw)) {
    throw new Error("data: URLs are not supported for media. Use buffer instead.");
  }
}

export async function resolveSandboxedMediaSource(params: {
  media: string;
  sandboxRoot: string;
}): Promise<string> {
  const raw = params.media.trim();
  if (!raw) {
    return raw;
  }
  if (HTTP_URL_RE.test(raw)) {
    return raw;
  }
  let candidate = raw;
  if (/^file:\/\//i.test(candidate)) {
    try {
      candidate = fileURLToPath(candidate);
    } catch {
      throw new Error(`Invalid file:// URL for sandboxed media: ${raw}`);
    }
  }
<<<<<<< HEAD
<<<<<<< HEAD
  // Allow files under os.tmpdir() — consistent with buildMediaLocalRoots() defaults.
  const resolved = path.resolve(params.sandboxRoot, candidate);
  const tmpDir = os.tmpdir();
  if (resolved === tmpDir || resolved.startsWith(tmpDir + path.sep)) {
    return resolved;
=======
=======
  const containerWorkspaceMapped = mapContainerWorkspacePath({
    candidate,
    sandboxRoot: params.sandboxRoot,
  });
  if (containerWorkspaceMapped) {
    candidate = containerWorkspaceMapped;
  }
>>>>>>> eefbf3dc5 (fix(sandbox): normalize /workspace media paths to host sandbox root)
  const tmpMediaPath = await resolveAllowedTmpMediaPath({
    candidate,
    sandboxRoot: params.sandboxRoot,
  });
  if (tmpMediaPath) {
    return tmpMediaPath;
>>>>>>> 55e38d3b4 (refactor: extract tmp media resolver helper and dedupe sandbox-path tests)
  }
  const sandboxResult = await assertSandboxPath({
    filePath: candidate,
    cwd: params.sandboxRoot,
    root: params.sandboxRoot,
  });
  return sandboxResult.resolved;
}

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
async function assertNoSymlink(relative: string, root: string) {
=======
=======
=======
function mapContainerWorkspacePath(params: {
  candidate: string;
  sandboxRoot: string;
}): string | undefined {
  const normalized = params.candidate.replace(/\\/g, "/");
  if (normalized === SANDBOX_CONTAINER_WORKDIR) {
    return path.resolve(params.sandboxRoot);
  }
  const prefix = `${SANDBOX_CONTAINER_WORKDIR}/`;
  if (!normalized.startsWith(prefix)) {
    return undefined;
  }
  const rel = normalized.slice(prefix.length);
  if (!rel) {
    return path.resolve(params.sandboxRoot);
  }
  return path.resolve(params.sandboxRoot, ...rel.split("/").filter(Boolean));
}

>>>>>>> eefbf3dc5 (fix(sandbox): normalize /workspace media paths to host sandbox root)
async function resolveAllowedTmpMediaPath(params: {
  candidate: string;
  sandboxRoot: string;
}): Promise<string | undefined> {
  const candidateIsAbsolute = path.isAbsolute(expandPath(params.candidate));
  if (!candidateIsAbsolute) {
    return undefined;
  }
  const resolved = path.resolve(resolveSandboxInputPath(params.candidate, params.sandboxRoot));
  const tmpDir = path.resolve(os.tmpdir());
  if (!isPathInside(tmpDir, resolved)) {
    return undefined;
  }
<<<<<<< HEAD
<<<<<<< HEAD
  await assertNoSymlinkEscape(path.relative(tmpDir, resolved), tmpDir);
  return resolved;
}

>>>>>>> 55e38d3b4 (refactor: extract tmp media resolver helper and dedupe sandbox-path tests)
=======
  await assertNoSymlinkEscape(path.relative(openClawTmpDir, resolved), openClawTmpDir);
  await assertNoHardlinkedFinalPath(resolved, openClawTmpDir);
=======
  await assertNoTmpAliasEscape({ filePath: resolved, tmpRoot: openClawTmpDir });
>>>>>>> c267b5edf (refactor(sandbox): unify tmp alias checks and dedupe hardlink tests)
  return resolved;
}

async function assertNoTmpAliasEscape(params: {
  filePath: string;
  tmpRoot: string;
}): Promise<void> {
  await assertNoSymlinkEscape(path.relative(params.tmpRoot, params.filePath), params.tmpRoot);
  await assertNoHardlinkedFinalPath(params.filePath, params.tmpRoot);
}

async function assertNoHardlinkedFinalPath(filePath: string, tmpRoot: string): Promise<void> {
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(filePath);
  } catch (err) {
    if (isNotFoundPathError(err)) {
      return;
    }
    throw err;
  }
  if (!stat.isFile()) {
    return;
  }
  if (stat.nlink > 1) {
    throw new Error(
      `Hardlinked tmp media path is not allowed under tmp root (${shortPath(tmpRoot)}): ${shortPath(filePath)}`,
    );
  }
}

>>>>>>> 22689b9dc (fix(sandbox): reject hardlinked tmp media aliases)
async function assertNoSymlinkEscape(
  relative: string,
  root: string,
  options?: { allowFinalSymlink?: boolean },
) {
>>>>>>> 914b9d1e7 (fix(agents): block workspaceOnly apply_patch delete symlink escape)
  if (!relative) {
    return;
  }
  const parts = relative.split(path.sep).filter(Boolean);
  let current = root;
  for (let idx = 0; idx < parts.length; idx += 1) {
    const part = parts[idx];
    const isLast = idx === parts.length - 1;
    current = path.join(current, part);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) {
<<<<<<< HEAD
        throw new Error(`Symlink not allowed in sandbox path: ${current}`);
=======
        // Unlinking a symlink itself is safe even if it points outside the root. What we
        // must prevent is traversing through a symlink to reach targets outside root.
        if (options?.allowFinalSymlink && isLast) {
          return;
        }
        const target = await tryRealpath(current);
        if (!isPathInside(rootReal, target)) {
          throw new Error(
            `Symlink escapes sandbox root (${shortPath(rootReal)}): ${shortPath(current)}`,
          );
        }
        current = target;
>>>>>>> 914b9d1e7 (fix(agents): block workspaceOnly apply_patch delete symlink escape)
      }
    } catch (err) {
      const anyErr = err as { code?: string };
      if (anyErr.code === "ENOENT") {
        return;
      }
      throw err;
    }
  }
}

function shortPath(value: string) {
  if (value.startsWith(os.homedir())) {
    return `~${value.slice(os.homedir().length)}`;
  }
  return value;
}
