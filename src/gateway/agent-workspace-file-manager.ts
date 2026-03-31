import fs from "node:fs/promises";
import path from "node:path";
import { resolveBoundaryPath } from "../infra/boundary-path.js";
import { sameFileIdentity } from "../infra/file-identity.js";
import { readFileWithinRoot, writeFileWithinRoot } from "../infra/fs-safe.js";
import {
  decodeTextFile,
  encodeTextFile,
  type SupportedTextFileEncoding,
} from "../shared/text-file-codec.js";

export type AgentWorkspaceFileKind = "file" | "directory";

export type AgentWorkspaceFileEntry = {
  path: string;
  name: string;
  kind: AgentWorkspaceFileKind;
  size?: number;
  updatedAtMs?: number;
};

export type AgentWorkspaceFileDocument = AgentWorkspaceFileEntry & {
  contentBase64: string;
  textEditable: boolean;
  textContent?: string;
  encoding?: SupportedTextFileEncoding;
  includeBom?: boolean;
  textError?: string;
};

export const AGENT_WORKSPACE_MEDIA_INBOUND_RELATIVE_PATH = path.join("media", "inbound");

function normalizeRelativePath(
  input: string | undefined,
  options?: { allowEmpty?: boolean },
): string {
  const raw = (input ?? "").trim().replace(/\\/g, "/");
  const parts = raw
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const normalized = parts.join("/");
  if (!options?.allowEmpty && !normalized) {
    throw new Error("path is required");
  }
  return normalized;
}

function toApiRelativePath(rootDir: string, absolutePath: string): string {
  return path.relative(rootDir, absolutePath).split(path.sep).join("/");
}

async function ensureRootDir(rootDir: string): Promise<void> {
  await fs.mkdir(rootDir, { recursive: true });
}

async function resolvePathInRoot(params: {
  rootDir: string;
  relativePath: string;
  allowMissing?: boolean;
}): Promise<{
  absolutePath: string;
  canonicalPath: string;
  kind: "missing" | "file" | "directory";
}> {
  const absolutePath = path.resolve(params.rootDir, params.relativePath);
  const resolved = await resolveBoundaryPath({
    absolutePath,
    rootPath: params.rootDir,
    boundaryLabel: "agent workspace media/inbound",
  });
  if (resolved.kind === "missing") {
    if (!params.allowMissing) {
      throw new Error("unsafe workspace path (path not found)");
    }
    return { absolutePath, canonicalPath: absolutePath, kind: "missing" };
  }
  if (resolved.kind !== "file" && resolved.kind !== "directory") {
    throw new Error("unsafe workspace path (unsupported path type)");
  }

  const [stat, lstat] = await Promise.all([
    fs.stat(resolved.canonicalPath),
    fs.lstat(absolutePath),
  ]);
  if (lstat.isSymbolicLink()) {
    throw new Error("unsafe workspace path (symlinks are not allowed)");
  }
  if (stat.isFile()) {
    if (stat.nlink > 1) {
      throw new Error("unsafe workspace path (hardlinked files are not allowed)");
    }
    if (!sameFileIdentity(stat, lstat)) {
      throw new Error("unsafe workspace path (path changed during access)");
    }
    return { absolutePath, canonicalPath: resolved.canonicalPath, kind: "file" };
  }
  if (stat.isDirectory()) {
    return { absolutePath, canonicalPath: resolved.canonicalPath, kind: "directory" };
  }
  throw new Error("unsafe workspace path (unsupported path type)");
}

async function statEntry(
  rootDir: string,
  absolutePath: string,
  kind: AgentWorkspaceFileKind,
): Promise<AgentWorkspaceFileEntry> {
  const stat = await fs.stat(absolutePath);
  return {
    path: toApiRelativePath(rootDir, absolutePath),
    name: path.basename(absolutePath),
    kind,
    ...(kind === "file" ? { size: stat.size } : {}),
    updatedAtMs: Math.floor(stat.mtimeMs),
  };
}

async function ensureParentDirectory(rootDir: string, relativePath: string): Promise<void> {
  const parentRelative = path.posix.dirname(relativePath);
  if (!parentRelative || parentRelative === ".") {
    return;
  }
  const resolvedParent = await resolvePathInRoot({
    rootDir,
    relativePath: parentRelative,
    allowMissing: true,
  });
  if (resolvedParent.kind === "file") {
    throw new Error("unsafe workspace path (parent path is a file)");
  }
  await fs.mkdir(resolvedParent.absolutePath, { recursive: true });
}

export function resolveAgentWorkspaceMediaInboundRoot(workspaceDir: string): string {
  return path.join(workspaceDir, AGENT_WORKSPACE_MEDIA_INBOUND_RELATIVE_PATH);
}

export async function listAgentWorkspaceFiles(params: {
  rootDir: string;
  dir?: string;
}): Promise<AgentWorkspaceFileEntry[]> {
  await ensureRootDir(params.rootDir);
  const dir = normalizeRelativePath(params.dir, { allowEmpty: true });
  const target = dir
    ? await resolvePathInRoot({ rootDir: params.rootDir, relativePath: dir, allowMissing: false })
    : {
        absolutePath: params.rootDir,
        canonicalPath: params.rootDir,
        kind: "directory",
      };
  if (target.kind !== "directory") {
    throw new Error("unsafe workspace path (directory expected)");
  }

  const children = await fs.readdir(target.absolutePath, { withFileTypes: true });
  const entries: AgentWorkspaceFileEntry[] = [];
  for (const child of children) {
    const childAbsolutePath = path.join(target.absolutePath, child.name);
    try {
      const resolved = await resolvePathInRoot({
        rootDir: params.rootDir,
        relativePath: toApiRelativePath(params.rootDir, childAbsolutePath),
      });
      if (resolved.kind === "file") {
        entries.push(await statEntry(params.rootDir, resolved.absolutePath, "file"));
      } else if (resolved.kind === "directory") {
        entries.push(await statEntry(params.rootDir, resolved.absolutePath, "directory"));
      }
    } catch {
      continue;
    }
  }

  return entries.toSorted((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "directory" ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}

export async function getAgentWorkspaceFile(params: {
  rootDir: string;
  relativePath: string;
}): Promise<AgentWorkspaceFileDocument> {
  await ensureRootDir(params.rootDir);
  const relativePath = normalizeRelativePath(params.relativePath);
  const resolved = await resolvePathInRoot({
    rootDir: params.rootDir,
    relativePath,
    allowMissing: false,
  });
  if (resolved.kind !== "file") {
    throw new Error("unsafe workspace path (file expected)");
  }

  const safeRead = await readFileWithinRoot({
    rootDir: params.rootDir,
    relativePath,
    rejectHardlinks: true,
  });
  const entry = await statEntry(params.rootDir, resolved.absolutePath, "file");
  const decoded = decodeTextFile(new Uint8Array(safeRead.buffer));
  if (decoded.textEditable) {
    return {
      ...entry,
      contentBase64: safeRead.buffer.toString("base64"),
      textEditable: true,
      textContent: decoded.textContent,
      encoding: decoded.encoding,
      includeBom: decoded.includeBom,
    };
  }
  return {
    ...entry,
    contentBase64: safeRead.buffer.toString("base64"),
    textEditable: false,
    textError: decoded.textError,
  };
}

export async function setAgentWorkspaceFile(params: {
  rootDir: string;
  relativePath: string;
  content?: string;
  contentBase64?: string;
  encoding?: SupportedTextFileEncoding;
  includeBom?: boolean;
}): Promise<AgentWorkspaceFileDocument> {
  await ensureRootDir(params.rootDir);
  const relativePath = normalizeRelativePath(params.relativePath);
  await ensureParentDirectory(params.rootDir, relativePath);

  const rawBytes =
    typeof params.contentBase64 === "string"
      ? Buffer.from(params.contentBase64, "base64")
      : Buffer.from(
          encodeTextFile({
            content: params.content ?? "",
            encoding: params.encoding ?? "utf-8",
            includeBom: params.includeBom === true,
          }),
        );

  await writeFileWithinRoot({
    rootDir: params.rootDir,
    relativePath,
    data: rawBytes,
  });
  return await getAgentWorkspaceFile({ rootDir: params.rootDir, relativePath });
}

export async function mkdirAgentWorkspaceFilePath(params: {
  rootDir: string;
  relativePath: string;
}): Promise<AgentWorkspaceFileEntry> {
  await ensureRootDir(params.rootDir);
  const relativePath = normalizeRelativePath(params.relativePath);
  const resolved = await resolvePathInRoot({
    rootDir: params.rootDir,
    relativePath,
    allowMissing: true,
  });
  if (resolved.kind === "file") {
    throw new Error("unsafe workspace path (file already exists)");
  }
  await fs.mkdir(resolved.absolutePath, { recursive: true });
  return await statEntry(params.rootDir, resolved.absolutePath, "directory");
}

export async function moveAgentWorkspaceFilePath(params: {
  rootDir: string;
  fromRelativePath: string;
  toRelativePath: string;
}): Promise<AgentWorkspaceFileEntry> {
  await ensureRootDir(params.rootDir);
  const fromRelativePath = normalizeRelativePath(params.fromRelativePath);
  const toRelativePath = normalizeRelativePath(params.toRelativePath);
  const source = await resolvePathInRoot({
    rootDir: params.rootDir,
    relativePath: fromRelativePath,
    allowMissing: false,
  });
  if (source.kind !== "file" && source.kind !== "directory") {
    throw new Error("unsafe workspace path (unsupported source)");
  }
  const target = await resolvePathInRoot({
    rootDir: params.rootDir,
    relativePath: toRelativePath,
    allowMissing: true,
  });
  if (target.kind !== "missing") {
    throw new Error("unsafe workspace path (target already exists)");
  }
  await ensureParentDirectory(params.rootDir, toRelativePath);
  await fs.rename(source.absolutePath, target.absolutePath);
  return await statEntry(params.rootDir, target.absolutePath, source.kind);
}

export async function deleteAgentWorkspaceFilePath(params: {
  rootDir: string;
  relativePath: string;
}): Promise<void> {
  await ensureRootDir(params.rootDir);
  const relativePath = normalizeRelativePath(params.relativePath);
  const resolved = await resolvePathInRoot({
    rootDir: params.rootDir,
    relativePath,
    allowMissing: false,
  });
  if (resolved.kind === "file") {
    await fs.rm(resolved.absolutePath, { force: false });
    return;
  }
  if (resolved.kind === "directory") {
    await fs.rm(resolved.absolutePath, { recursive: true, force: false });
    return;
  }
  throw new Error("unsafe workspace path (unsupported path type)");
}
