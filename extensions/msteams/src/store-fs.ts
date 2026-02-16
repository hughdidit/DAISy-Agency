import fs from "node:fs";
<<<<<<< HEAD
import path from "node:path";
<<<<<<< HEAD

=======
import { safeParseJson } from "openclaw/plugin-sdk";
<<<<<<< HEAD
>>>>>>> f0924d3c4 (refactor: consolidate PNG encoder and safeParseJson utilities (#12457))
import lockfile from "proper-lockfile";
=======
=======
import { readJsonFileWithFallback, writeJsonFileAtomically } from "openclaw/plugin-sdk";
>>>>>>> 544ffbcf7 (refactor(extensions): dedupe connector helper usage)
import { withFileLock as withPathLock } from "./file-lock.js";
>>>>>>> 201ac2b72 (perf: replace proper-lockfile with lightweight file locks)

const STORE_LOCK_OPTIONS = {
  retries: {
    retries: 10,
    factor: 2,
    minTimeout: 100,
    maxTimeout: 10_000,
    randomize: true,
  },
  stale: 30_000,
} as const;

export async function readJsonFile<T>(
  filePath: string,
  fallback: T,
): Promise<{ value: T; exists: boolean }> {
  return await readJsonFileWithFallback(filePath, fallback);
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeJsonFileAtomically(filePath, value);
}

async function ensureJsonFile(filePath: string, fallback: unknown) {
  try {
    await fs.promises.access(filePath);
  } catch {
    await writeJsonFile(filePath, fallback);
  }
}

export async function withFileLock<T>(
  filePath: string,
  fallback: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  await ensureJsonFile(filePath, fallback);
  return await withPathLock(filePath, STORE_LOCK_OPTIONS, async () => {
    return await fn();
  });
}
