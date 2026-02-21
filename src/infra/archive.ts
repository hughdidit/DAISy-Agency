<<<<<<< HEAD
=======
import { constants as fsConstants } from "node:fs";
>>>>>>> 4b226b74f (fix(security): block zip symlink escape in archive extraction)
import fs from "node:fs/promises";
import path from "node:path";
import * as tar from "tar";
<<<<<<< HEAD
<<<<<<< HEAD
import JSZip from "jszip";
=======
import { resolveSafeBaseDir } from "./path-safety.js";
>>>>>>> 2363e1b08 (fix(security): restrict skill download target paths)
=======
import {
  resolveArchiveOutputPath,
  stripArchivePath,
  validateArchiveEntryPath,
} from "./archive-path.js";
import { isNotFoundPathError, isPathInside, isSymlinkOpenError } from "./path-guards.js";
>>>>>>> ed960ba4e (refactor(security): centralize path guard helpers)

export type ArchiveKind = "tar" | "zip";

export type ArchiveLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
};

<<<<<<< HEAD
=======
export type ArchiveExtractLimits = {
  /**
   * Max archive file bytes (compressed). Primarily protects zip extraction
   * because we currently read the whole archive into memory for parsing.
   */
  maxArchiveBytes?: number;
  /** Max number of extracted entries (files + dirs). */
  maxEntries?: number;
  /** Max extracted bytes (sum of all files). */
  maxExtractedBytes?: number;
  /** Max extracted bytes for a single file entry. */
  maxEntryBytes?: number;
};

export type ArchiveSecurityErrorCode =
  | "destination-not-directory"
  | "destination-symlink"
  | "destination-symlink-traversal";

export class ArchiveSecurityError extends Error {
  code: ArchiveSecurityErrorCode;

  constructor(code: ArchiveSecurityErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "ArchiveSecurityError";
  }
}

/** @internal */
export const DEFAULT_MAX_ARCHIVE_BYTES_ZIP = 256 * 1024 * 1024;
/** @internal */
export const DEFAULT_MAX_ENTRIES = 50_000;
/** @internal */
export const DEFAULT_MAX_EXTRACTED_BYTES = 512 * 1024 * 1024;
/** @internal */
export const DEFAULT_MAX_ENTRY_BYTES = 256 * 1024 * 1024;

const ERROR_ARCHIVE_SIZE_EXCEEDS_LIMIT = "archive size exceeds limit";
const ERROR_ARCHIVE_ENTRY_COUNT_EXCEEDS_LIMIT = "archive entry count exceeds limit";
const ERROR_ARCHIVE_ENTRY_EXTRACTED_SIZE_EXCEEDS_LIMIT =
  "archive entry extracted size exceeds limit";
const ERROR_ARCHIVE_EXTRACTED_SIZE_EXCEEDS_LIMIT = "archive extracted size exceeds limit";
const ERROR_ARCHIVE_ENTRY_TRAVERSES_SYMLINK = "archive entry traverses symlink in destination";

>>>>>>> 4b226b74f (fix(security): block zip symlink escape in archive extraction)
const TAR_SUFFIXES = [".tgz", ".tar.gz", ".tar"];
const OPEN_WRITE_FLAGS =
  fsConstants.O_WRONLY |
  fsConstants.O_CREAT |
  fsConstants.O_TRUNC |
  (process.platform !== "win32" && "O_NOFOLLOW" in fsConstants ? fsConstants.O_NOFOLLOW : 0);

export function resolveArchiveKind(filePath: string): ArchiveKind | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".zip")) return "zip";
  if (TAR_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return "tar";
  return null;
}

export async function resolvePackedRootDir(extractDir: string): Promise<string> {
  const direct = path.join(extractDir, "package");
  try {
    const stat = await fs.stat(direct);
    if (stat.isDirectory()) return direct;
  } catch {
    // ignore
  }

  const entries = await fs.readdir(extractDir, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  if (dirs.length !== 1) {
    throw new Error(`unexpected archive layout (dirs: ${dirs.join(", ")})`);
  }
  const onlyDir = dirs[0];
  if (!onlyDir) {
    throw new Error("unexpected archive layout (no package dir found)");
  }
  return path.join(extractDir, onlyDir);
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

<<<<<<< HEAD
function resolveSafeBaseDir(destDir: string): string {
  const resolved = path.resolve(destDir);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

=======
// Path hygiene.
>>>>>>> 2363e1b08 (fix(security): restrict skill download target paths)
function normalizeArchivePath(raw: string): string {
  // Archives may contain Windows separators; treat them as separators.
  return raw.replaceAll("\\", "/");
}

function isWindowsDrivePath(p: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(p);
}

function validateArchiveEntryPath(entryPath: string): void {
  if (!entryPath || entryPath === "." || entryPath === "./") {
    return;
  }
  if (isWindowsDrivePath(entryPath)) {
    throw new Error(`archive entry uses a drive path: ${entryPath}`);
  }
  const normalized = path.posix.normalize(normalizeArchivePath(entryPath));
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`archive entry escapes destination: ${entryPath}`);
  }
  if (path.posix.isAbsolute(normalized) || normalized.startsWith("//")) {
    throw new Error(`archive entry is absolute: ${entryPath}`);
  }
}

<<<<<<< HEAD
function stripArchivePath(entryPath: string, stripComponents: number): string | null {
  const normalized = path.posix.normalize(normalizeArchivePath(entryPath));
  if (!normalized || normalized === "." || normalized === "./") {
    return null;
=======
function createByteBudgetTracker(limits: ResolvedArchiveExtractLimits): {
  startEntry: () => void;
  addBytes: (bytes: number) => void;
  addEntrySize: (size: number) => void;
} {
  let entryBytes = 0;
  let extractedBytes = 0;

  const addBytes = (bytes: number) => {
    const b = Math.max(0, Math.floor(bytes));
    if (b === 0) {
      return;
    }
    entryBytes += b;
    if (entryBytes > limits.maxEntryBytes) {
      throw new Error(ERROR_ARCHIVE_ENTRY_EXTRACTED_SIZE_EXCEEDS_LIMIT);
    }
    extractedBytes += b;
    if (extractedBytes > limits.maxExtractedBytes) {
      throw new Error(ERROR_ARCHIVE_EXTRACTED_SIZE_EXCEEDS_LIMIT);
    }
  };

  return {
    startEntry() {
      entryBytes = 0;
    },
    addBytes,
    addEntrySize(size: number) {
      const s = Math.max(0, Math.floor(size));
      if (s > limits.maxEntryBytes) {
        throw new Error(ERROR_ARCHIVE_ENTRY_EXTRACTED_SIZE_EXCEEDS_LIMIT);
      }
      // Note: tar budgets are based on the header-declared size.
      addBytes(s);
    },
  };
}

function createExtractBudgetTransform(params: {
  onChunkBytes: (bytes: number) => void;
}): Transform {
  return new Transform({
    transform(chunk, _encoding, callback) {
      try {
        const buf = chunk instanceof Buffer ? chunk : Buffer.from(chunk as Uint8Array);
        params.onChunkBytes(buf.byteLength);
        callback(null, buf);
      } catch (err) {
        callback(err instanceof Error ? err : new Error(String(err)));
      }
    },
  });
}

function symlinkTraversalError(originalPath: string): ArchiveSecurityError {
  return new ArchiveSecurityError(
    "destination-symlink-traversal",
    `${ERROR_ARCHIVE_ENTRY_TRAVERSES_SYMLINK}: ${originalPath}`,
  );
}

async function assertDestinationDirReady(destDir: string): Promise<string> {
  const stat = await fs.lstat(destDir);
  if (stat.isSymbolicLink()) {
    throw new ArchiveSecurityError("destination-symlink", "archive destination is a symlink");
  }
  if (!stat.isDirectory()) {
    throw new ArchiveSecurityError(
      "destination-not-directory",
      "archive destination is not a directory",
    );
  }
  return await fs.realpath(destDir);
}

async function assertNoSymlinkTraversal(params: {
  rootDir: string;
  relPath: string;
  originalPath: string;
}): Promise<void> {
  const parts = params.relPath.split("/").filter(Boolean);
  let current = path.resolve(params.rootDir);
  for (const part of parts) {
    current = path.join(current, part);
    let stat: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      stat = await fs.lstat(current);
    } catch (err) {
      if (isNotFoundPathError(err)) {
        continue;
      }
      throw err;
    }
    if (stat.isSymbolicLink()) {
      throw symlinkTraversalError(params.originalPath);
    }
  }
}

async function assertResolvedInsideDestination(params: {
  destinationRealDir: string;
  targetPath: string;
  originalPath: string;
}): Promise<void> {
  let resolved: string;
  try {
    resolved = await fs.realpath(params.targetPath);
  } catch (err) {
    if (isNotFoundPathError(err)) {
      return;
    }
    throw err;
  }
  if (!isPathInside(params.destinationRealDir, resolved)) {
    throw symlinkTraversalError(params.originalPath);
  }
}

async function openZipOutputFile(outPath: string, originalPath: string) {
  try {
    return await fs.open(outPath, OPEN_WRITE_FLAGS, 0o666);
  } catch (err) {
    if (isSymlinkOpenError(err)) {
      throw symlinkTraversalError(originalPath);
    }
    throw err;
  }
}

async function cleanupPartialRegularFile(filePath: string): Promise<void> {
  let stat: Awaited<ReturnType<typeof fs.lstat>>;
  try {
    stat = await fs.lstat(filePath);
  } catch (err) {
    if (isNotFoundPathError(err)) {
      return;
    }
    throw err;
  }
  if (stat.isFile()) {
    await fs.unlink(filePath).catch(() => undefined);
  }
}

type ZipEntry = {
  name: string;
  dir: boolean;
  unixPermissions?: number;
  nodeStream?: () => NodeJS.ReadableStream;
  async: (type: "nodebuffer") => Promise<Buffer>;
};

type ZipExtractBudget = ReturnType<typeof createByteBudgetTracker>;

async function readZipEntryStream(entry: ZipEntry): Promise<NodeJS.ReadableStream> {
  if (typeof entry.nodeStream === "function") {
    return entry.nodeStream();
>>>>>>> 4b226b74f (fix(security): block zip symlink escape in archive extraction)
  }

  // Keep the validation separate so callers can reject traversal in the original
  // path even if stripping could make it "look" safe.
  const parts = normalized.split("/").filter((part) => part.length > 0 && part !== ".");
  const strip = Math.max(0, Math.floor(stripComponents));
  const stripped = strip === 0 ? parts.join("/") : parts.slice(strip).join("/");
  const result = path.posix.normalize(stripped);
  if (!result || result === "." || result === "./") {
    return null;
  }
  return result;
}

function resolveCheckedOutPath(destDir: string, relPath: string, original: string): string {
  const safeBase = resolveSafeBaseDir(destDir);
  const outPath = path.resolve(destDir, relPath);
  if (!outPath.startsWith(safeBase)) {
    throw new Error(`archive entry escapes destination: ${original}`);
  }
  return outPath;
}

function resolveZipOutputPath(params: {
  entryPath: string;
  strip: number;
  destinationDir: string;
}): { relPath: string; outPath: string } | null {
  validateArchiveEntryPath(params.entryPath);
  const relPath = stripArchivePath(params.entryPath, params.strip);
  if (!relPath) {
    return null;
  }
  validateArchiveEntryPath(relPath);
  return {
    relPath,
    outPath: resolveArchiveOutputPath({
      rootDir: params.destinationDir,
      relPath,
      originalPath: params.entryPath,
    }),
  };
}

async function prepareZipOutputPath(params: {
  destinationDir: string;
  destinationRealDir: string;
  relPath: string;
  outPath: string;
  originalPath: string;
  isDirectory: boolean;
}): Promise<void> {
  await assertNoSymlinkTraversal({
    rootDir: params.destinationDir,
    relPath: params.relPath,
    originalPath: params.originalPath,
  });

  if (params.isDirectory) {
    await fs.mkdir(params.outPath, { recursive: true });
    await assertResolvedInsideDestination({
      destinationRealDir: params.destinationRealDir,
      targetPath: params.outPath,
      originalPath: params.originalPath,
    });
    return;
  }

  const parentDir = path.dirname(params.outPath);
  await fs.mkdir(parentDir, { recursive: true });
  await assertResolvedInsideDestination({
    destinationRealDir: params.destinationRealDir,
    targetPath: parentDir,
    originalPath: params.originalPath,
  });
}

async function writeZipFileEntry(params: {
  entry: ZipEntry;
  outPath: string;
  budget: ZipExtractBudget;
}): Promise<void> {
  const handle = await openZipOutputFile(params.outPath, params.entry.name);
  params.budget.startEntry();
  const readable = await readZipEntryStream(params.entry);
  const writable = handle.createWriteStream();

  try {
    await pipeline(
      readable,
      createExtractBudgetTransform({ onChunkBytes: params.budget.addBytes }),
      writable,
    );
  } catch (err) {
    await cleanupPartialRegularFile(params.outPath).catch(() => undefined);
    throw err;
  }

  // Best-effort permission restore for zip entries created on unix.
  if (typeof params.entry.unixPermissions === "number") {
    const mode = params.entry.unixPermissions & 0o777;
    if (mode !== 0) {
      await fs.chmod(params.outPath, mode).catch(() => undefined);
    }
  }
}

async function extractZip(params: {
  archivePath: string;
  destDir: string;
  stripComponents?: number;
}): Promise<void> {
<<<<<<< HEAD
=======
  const limits = resolveExtractLimits(params.limits);
  const destinationRealDir = await assertDestinationDirReady(params.destDir);
  const stat = await fs.stat(params.archivePath);
  if (stat.size > limits.maxArchiveBytes) {
    throw new Error(ERROR_ARCHIVE_SIZE_EXCEEDS_LIMIT);
  }

>>>>>>> 4b226b74f (fix(security): block zip symlink escape in archive extraction)
  const buffer = await fs.readFile(params.archivePath);
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files);
  const strip = Math.max(0, Math.floor(params.stripComponents ?? 0));

  for (const entry of entries) {
    const output = resolveZipOutputPath({
      entryPath: entry.name,
      strip,
      destinationDir: params.destDir,
    });
    if (!output) {
      continue;
    }

<<<<<<< HEAD
<<<<<<< HEAD
    const outPath = resolveCheckedOutPath(params.destDir, relPath, entry.name);
=======
    const outPath = resolveArchiveOutputPath({
      rootDir: params.destDir,
      relPath,
      originalPath: entry.name,
    });
    await assertNoSymlinkTraversal({
      rootDir: params.destDir,
      relPath,
=======
    await prepareZipOutputPath({
      destinationDir: params.destDir,
      destinationRealDir,
      relPath: output.relPath,
      outPath: output.outPath,
>>>>>>> ed960ba4e (refactor(security): centralize path guard helpers)
      originalPath: entry.name,
      isDirectory: entry.dir,
    });
>>>>>>> 4b226b74f (fix(security): block zip symlink escape in archive extraction)
    if (entry.dir) {
      continue;
    }

<<<<<<< HEAD
    await fs.mkdir(path.dirname(outPath), { recursive: true });
<<<<<<< HEAD
    const data = await entry.async("nodebuffer");
    await fs.writeFile(outPath, data);
=======
    await assertResolvedInsideDestination({
      destinationRealDir,
      targetPath: path.dirname(outPath),
      originalPath: entry.name,
    });
    const handle = await openZipOutputFile(outPath, entry.name);
    budget.startEntry();
    const readable = await readZipEntryStream(entry);
    const writable = handle.createWriteStream();

    try {
      await pipeline(
        readable,
        createExtractBudgetTransform({ onChunkBytes: budget.addBytes }),
        writable,
      );
    } catch (err) {
      await cleanupPartialRegularFile(outPath).catch(() => undefined);
      throw err;
    }
>>>>>>> 4b226b74f (fix(security): block zip symlink escape in archive extraction)

    // Best-effort permission restore for zip entries created on unix.
    if (typeof entry.unixPermissions === "number") {
      const mode = entry.unixPermissions & 0o777;
      if (mode !== 0) {
        await fs.chmod(outPath, mode).catch(() => undefined);
      }
    }
=======
    await writeZipFileEntry({
      entry,
      outPath: output.outPath,
      budget,
    });
>>>>>>> ed960ba4e (refactor(security): centralize path guard helpers)
  }
}

export async function extractArchive(params: {
  archivePath: string;
  destDir: string;
  timeoutMs: number;
  kind?: ArchiveKind;
  stripComponents?: number;
  tarGzip?: boolean;
  logger?: ArchiveLogger;
}): Promise<void> {
  const kind = params.kind ?? resolveArchiveKind(params.archivePath);
  if (!kind) {
    throw new Error(`unsupported archive: ${params.archivePath}`);
  }

  const label = kind === "zip" ? "extract zip" : "extract tar";
  if (kind === "tar") {
    const strip = Math.max(0, Math.floor(params.stripComponents ?? 0));
    let firstError: Error | undefined;
    await withTimeout(
      tar.x({
        file: params.archivePath,
        cwd: params.destDir,
        strip,
        gzip: params.tarGzip,
        preservePaths: false,
        strict: true,
        filter: (entryPath, entry) => {
          try {
            validateArchiveEntryPath(entryPath);
            // `tar`'s filter callback can pass either a ReadEntry or a Stats-ish object;
            // fail closed for any link-like entries.
            const entryType =
              typeof entry === "object" &&
              entry !== null &&
              "type" in entry &&
              typeof (entry as { type?: unknown }).type === "string"
                ? (entry as { type: string }).type
                : undefined;
            const isSymlink =
              typeof entry === "object" &&
              entry !== null &&
              "isSymbolicLink" in entry &&
              typeof (entry as { isSymbolicLink?: unknown }).isSymbolicLink === "function" &&
              Boolean((entry as { isSymbolicLink: () => boolean }).isSymbolicLink());
            if (entryType === "SymbolicLink" || entryType === "Link" || isSymlink) {
              throw new Error(`tar entry is a link: ${entryPath}`);
            }
            const relPath = stripArchivePath(entryPath, strip);
            if (!relPath) {
              return false;
            }
            validateArchiveEntryPath(relPath);
            resolveCheckedOutPath(params.destDir, relPath, entryPath);
            return true;
          } catch (err) {
            if (!firstError) {
              firstError = err instanceof Error ? err : new Error(String(err));
            }
            return false;
          }
        },
      }),
      params.timeoutMs,
      label,
    );
    if (firstError) {
      throw firstError;
    }
    return;
  }

  await withTimeout(
    extractZip({
      archivePath: params.archivePath,
      destDir: params.destDir,
      stripComponents: params.stripComponents,
    }),
    params.timeoutMs,
    label,
  );
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}
