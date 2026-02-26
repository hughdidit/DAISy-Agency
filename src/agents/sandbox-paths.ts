import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
import { fileURLToPath } from "node:url";
=======
import { fileURLToPath, URL } from "node:url";
<<<<<<< HEAD
import { assertNoHardlinkedFinalPath } from "../infra/hardlink-guards.js";
>>>>>>> 04d91d031 (fix(security): block workspace hardlink alias escapes)
import { isNotFoundPathError, isPathInside } from "../infra/path-guards.js";
=======
import { assertNoPathAliasEscape, type PathAliasPolicy } from "../infra/path-alias-guards.js";
import { isPathInside } from "../infra/path-guards.js";
>>>>>>> de61e9c97 (refactor(security): unify path alias guard policies)
import { resolvePreferredOpenClawTmpDir } from "../infra/tmp-openclaw-dir.js";

const UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
const HTTP_URL_RE = /^https?:\/\//i;
const DATA_URL_RE = /^data:/i;

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

<<<<<<< HEAD
export async function assertSandboxPath(params: { filePath: string; cwd: string; root: string }) {
  const resolved = resolveSandboxPath(params);
  await assertNoSymlinkEscape(resolved.relative, path.resolve(params.root));
=======
export async function assertSandboxPath(params: {
  filePath: string;
  cwd: string;
  root: string;
  allowFinalSymlinkForUnlink?: boolean;
  allowFinalHardlinkForUnlink?: boolean;
}) {
  const resolved = resolveSandboxPath(params);
  const policy: PathAliasPolicy = {
    allowFinalSymlinkForUnlink: params.allowFinalSymlinkForUnlink,
    allowFinalHardlinkForUnlink: params.allowFinalHardlinkForUnlink,
  };
  await assertNoPathAliasEscape({
    absolutePath: resolved.resolved,
    rootPath: path.resolve(params.root),
    boundaryLabel: "sandbox root",
    policy,
  });
>>>>>>> 04d91d031 (fix(security): block workspace hardlink alias escapes)
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
  const resolved = await assertSandboxPath({
    filePath: candidate,
    cwd: params.sandboxRoot,
    root: params.sandboxRoot,
  });
  return resolved.resolved;
}

<<<<<<< HEAD
<<<<<<< HEAD
async function assertNoSymlink(relative: string, root: string) {
  if (!relative) return;
=======
async function assertNoSymlinkEscape(relative: string, root: string) {
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
  const openClawTmpDir = path.resolve(resolvePreferredOpenClawTmpDir());
  if (!isPathInside(openClawTmpDir, resolved)) {
    return undefined;
  }
  await assertNoSymlinkEscape(path.relative(openClawTmpDir, resolved), openClawTmpDir);
  return resolved;
}

<<<<<<< HEAD
=======
async function assertNoTmpAliasEscape(params: {
  filePath: string;
  tmpRoot: string;
}): Promise<void> {
  await assertNoPathAliasEscape({
    absolutePath: params.filePath,
    rootPath: params.tmpRoot,
    boundaryLabel: "tmp root",
  });
}

<<<<<<< HEAD
>>>>>>> 04d91d031 (fix(security): block workspace hardlink alias escapes)
async function assertNoSymlinkEscape(
  relative: string,
  root: string,
  options?: { allowFinalSymlink?: boolean },
) {
>>>>>>> d3da67c7a (fix(security): lock sandbox tmp media paths to openclaw roots)
  if (!relative) {
    return;
  }
  const rootReal = await tryRealpath(root);
>>>>>>> 5e7c3250c (fix(security): add optional workspace-only path guards for fs tools)
  const parts = relative.split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) {
        const target = await tryRealpath(current);
        if (!isPathInside(rootReal, target)) {
          throw new Error(
            `Symlink escapes sandbox root (${shortPath(rootReal)}): ${shortPath(current)}`,
          );
        }
        current = target;
      }
    } catch (err) {
      if (isNotFoundPathError(err)) {
        return;
      }
      throw err;
    }
  }
}

async function tryRealpath(value: string): Promise<string> {
  try {
    return await fs.realpath(value);
  } catch {
    return path.resolve(value);
  }
}

=======
>>>>>>> de61e9c97 (refactor(security): unify path alias guard policies)
function shortPath(value: string) {
  if (value.startsWith(os.homedir())) {
    return `~${value.slice(os.homedir().length)}`;
  }
  return value;
}
