import fs from "node:fs/promises";
import path from "node:path";
import { createAsyncLock, writeJsonAtomic } from "../infra/json-files.js";
import { resolveConfigDir } from "../utils.js";
import { KANBAN_STORE_SCHEMA_VERSION, type KanbanStoreFile } from "./types.js";

export const DEFAULT_KANBAN_STORE_PATH = path.join(resolveConfigDir(), "kanban", "store.json");

const locks = new Map<string, ReturnType<typeof createAsyncLock>>();

function lockForPath(storePath: string) {
  const resolved = path.resolve(storePath);
  let lock = locks.get(resolved);
  if (!lock) {
    lock = createAsyncLock();
    locks.set(resolved, lock);
  }
  return lock;
}

export function createEmptyKanbanStore(): KanbanStoreFile {
  return {
    schemaVersion: KANBAN_STORE_SCHEMA_VERSION,
    boards: {},
    lanes: {},
    cards: {},
    checklistItems: {},
    comments: {},
    activities: [],
    notifications: {},
    credentialMetadata: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function migrateKanbanStore(raw: unknown): KanbanStoreFile {
  if (!isRecord(raw)) {
    return createEmptyKanbanStore();
  }
  return {
    schemaVersion: KANBAN_STORE_SCHEMA_VERSION,
    boards: isRecord(raw.boards) ? (raw.boards as KanbanStoreFile["boards"]) : {},
    lanes: isRecord(raw.lanes) ? (raw.lanes as KanbanStoreFile["lanes"]) : {},
    cards: isRecord(raw.cards) ? (raw.cards as KanbanStoreFile["cards"]) : {},
    checklistItems: isRecord(raw.checklistItems)
      ? (raw.checklistItems as KanbanStoreFile["checklistItems"])
      : {},
    comments: isRecord(raw.comments) ? (raw.comments as KanbanStoreFile["comments"]) : {},
    activities: Array.isArray(raw.activities)
      ? (raw.activities as KanbanStoreFile["activities"])
      : [],
    notifications: isRecord(raw.notifications)
      ? (raw.notifications as KanbanStoreFile["notifications"])
      : {},
    credentialMetadata: isRecord(raw.credentialMetadata)
      ? (raw.credentialMetadata as KanbanStoreFile["credentialMetadata"])
      : {},
  };
}

export async function loadKanbanStore(
  storePath = DEFAULT_KANBAN_STORE_PATH,
): Promise<KanbanStoreFile> {
  try {
    const raw = await fs.readFile(storePath, "utf-8");
    return migrateKanbanStore(JSON.parse(raw));
  } catch (err) {
    if ((err as { code?: unknown })?.code === "ENOENT") {
      return createEmptyKanbanStore();
    }
    throw err;
  }
}

export async function saveKanbanStore(
  store: KanbanStoreFile,
  storePath = DEFAULT_KANBAN_STORE_PATH,
): Promise<void> {
  await writeJsonAtomic(storePath, store, { mode: 0o600, trailingNewline: true });
}

export async function updateKanbanStore<T>(
  storePath: string,
  updater: (store: KanbanStoreFile) => Promise<T> | T,
): Promise<T> {
  return await lockForPath(storePath)(async () => {
    const store = await loadKanbanStore(storePath);
    const result = await updater(store);
    await saveKanbanStore(store, storePath);
    return result;
  });
}
