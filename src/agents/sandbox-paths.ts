import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
=======
import { fileURLToPath, URL } from "node:url";
import { isNotFoundPathError, isPathInside } from "../infra/path-guards.js";
>>>>>>> 84e5ab598 (fix: make windows CI path handling deterministic)

const UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

function normalizeUnicodeSpaces(str: string): string {
  return str.replace(UNICODE_SPACES, " ");
}

function expandPath(filePath: string): string {
  const normalized = normalizeUnicodeSpaces(filePath);
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
  if (path.isAbsolute(expanded)) return expanded;
  return path.resolve(cwd, expanded);
}

export function resolveSandboxPath(params: { filePath: string; cwd: string; root: string }): {
  resolved: string;
  relative: string;
} {
  const resolved = resolveToCwd(params.filePath, params.cwd);
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

export async function assertSandboxPath(params: { filePath: string; cwd: string; root: string }) {
  const resolved = resolveSandboxPath(params);
<<<<<<< HEAD
  await assertNoSymlink(resolved.relative, path.resolve(params.root));
=======
  const policy: PathAliasPolicy = {
    allowFinalSymlinkForUnlink: params.allowFinalSymlinkForUnlink,
    allowFinalHardlinkForUnlink: params.allowFinalHardlinkForUnlink,
  };
  await assertNoPathAliasEscape({
    absolutePath: resolved.resolved,
    rootPath: params.root,
    boundaryLabel: "sandbox root",
    policy,
  });
>>>>>>> 46eba86b4 (fix: harden workspace boundary path resolution)
  return resolved;
}

<<<<<<< HEAD
async function assertNoSymlink(relative: string, root: string) {
  if (!relative) return;
=======
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
    const workspaceMappedFromUrl = mapContainerWorkspaceFileUrl({
      fileUrl: candidate,
      sandboxRoot: params.sandboxRoot,
    });
    if (workspaceMappedFromUrl) {
      candidate = workspaceMappedFromUrl;
    } else {
      try {
        candidate = fileURLToPath(candidate);
      } catch {
        throw new Error(`Invalid file:// URL for sandboxed media: ${raw}`);
      }
    }
  }
  const resolved = path.resolve(resolveSandboxInputPath(candidate, params.sandboxRoot));
  const tmpDir = path.resolve(os.tmpdir());
  const candidateIsAbsolute = path.isAbsolute(expandPath(candidate));
  if (candidateIsAbsolute && isPathInside(tmpDir, resolved)) {
    await assertNoSymlinkEscape(path.relative(tmpDir, resolved), tmpDir);
    return resolved;
  }
  const sandboxResult = await assertSandboxPath({
    filePath: candidate,
    cwd: params.sandboxRoot,
    root: params.sandboxRoot,
  });
  return sandboxResult.resolved;
}

<<<<<<< HEAD
=======
function mapContainerWorkspaceFileUrl(params: {
  fileUrl: string;
  sandboxRoot: string;
}): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(params.fileUrl);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "file:") {
    return undefined;
  }
  // Sandbox paths are Linux-style (/workspace/*). Parse the URL path directly so
  // Windows hosts can still accept file:///workspace/... media references.
  const normalizedPathname = decodeURIComponent(parsed.pathname).replace(/\\/g, "/");
  if (
    normalizedPathname !== SANDBOX_CONTAINER_WORKDIR &&
    !normalizedPathname.startsWith(`${SANDBOX_CONTAINER_WORKDIR}/`)
  ) {
    return undefined;
  }
  return mapContainerWorkspacePath({
    candidate: normalizedPathname,
    sandboxRoot: params.sandboxRoot,
  });
}

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
  await assertNoSymlinkEscape(path.relative(tmpDir, resolved), tmpDir);
  return resolved;
}

>>>>>>> 84e5ab598 (fix: make windows CI path handling deterministic)
async function assertNoSymlinkEscape(
  relative: string,
  root: string,
  options?: { allowFinalSymlink?: boolean },
) {
  if (!relative) {
    return;
  }
  const rootReal = await tryRealpath(root);
>>>>>>> d3991d6aa (fix: harden sandbox tmp media validation (#17892) (thanks @dashed))
  const parts = relative.split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) {
        throw new Error(`Symlink not allowed in sandbox path: ${current}`);
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
