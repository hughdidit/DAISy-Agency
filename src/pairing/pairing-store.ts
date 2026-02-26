import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getPairingAdapter } from "../channels/plugins/pairing.js";
import type { ChannelId, ChannelPairingAdapter } from "../channels/plugins/types.js";
import { resolveOAuthDir, resolveStateDir } from "../config/paths.js";
import { withFileLock as withPathLock } from "../infra/file-lock.js";
import { resolveRequiredHomeDir } from "../infra/home-dir.js";
import { readJsonFileWithFallback, writeJsonFileAtomically } from "../plugin-sdk/json-store.js";

const PAIRING_CODE_LENGTH = 8;
const PAIRING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIRING_PENDING_TTL_MS = 60 * 60 * 1000;
const PAIRING_PENDING_MAX = 3;
const PAIRING_STORE_LOCK_OPTIONS = {
  retries: {
    retries: 10,
    factor: 2,
    minTimeout: 100,
    maxTimeout: 10_000,
    randomize: true,
  },
  stale: 30_000,
} as const;

export type PairingChannel = ChannelId;

export type PairingRequest = {
  id: string;
  code: string;
  createdAt: string;
  lastSeenAt: string;
  meta?: Record<string, string>;
};

type PairingStore = {
  version: 1;
  requests: PairingRequest[];
};

type AllowFromStore = {
  version: 1;
  allowFrom: string[];
};

function resolveCredentialsDir(env: NodeJS.ProcessEnv = process.env): string {
  const stateDir = resolveStateDir(env, () => resolveRequiredHomeDir(env, os.homedir));
  return resolveOAuthDir(env, stateDir);
}

/** Sanitize channel ID for use in filenames (prevent path traversal). */
function safeChannelKey(channel: PairingChannel): string {
  const raw = String(channel).trim().toLowerCase();
  if (!raw) {
    throw new Error("invalid pairing channel");
  }
  const safe = raw.replace(/[\\/:*?"<>|]/g, "_").replace(/\.\./g, "_");
  if (!safe || safe === "_") {
    throw new Error("invalid pairing channel");
  }
  return safe;
}

function resolvePairingPath(channel: PairingChannel, env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveCredentialsDir(env), `${safeChannelKey(channel)}-pairing.json`);
}

function resolveAllowFromPath(
  channel: PairingChannel,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return path.join(resolveCredentialsDir(env), `${safeChannelKey(channel)}-allowFrom.json`);
}

async function readJsonFile<T>(
  filePath: string,
  fallback: T,
): Promise<{ value: T; exists: boolean }> {
  return await readJsonFileWithFallback(filePath, fallback);
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeJsonFileAtomically(filePath, value);
}

async function readPairingRequests(filePath: string): Promise<PairingRequest[]> {
  const { value } = await readJsonFile<PairingStore>(filePath, {
    version: 1,
    requests: [],
  });
  return Array.isArray(value.requests) ? value.requests : [];
}

async function readPrunedPairingRequests(filePath: string): Promise<{
  requests: PairingRequest[];
  removed: boolean;
}> {
  return pruneExpiredRequests(await readPairingRequests(filePath), Date.now());
}

async function ensureJsonFile(filePath: string, fallback: unknown) {
  try {
    await fs.promises.access(filePath);
  } catch {
    await writeJsonFile(filePath, fallback);
  }
}

async function withFileLock<T>(
  filePath: string,
  fallback: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  await ensureJsonFile(filePath, fallback);
  return await withPathLock(filePath, PAIRING_STORE_LOCK_OPTIONS, async () => {
    return await fn();
  });
}

function parseTimestamp(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function isExpired(entry: PairingRequest, nowMs: number): boolean {
  const createdAt = parseTimestamp(entry.createdAt);
  if (!createdAt) {
    return true;
  }
  return nowMs - createdAt > PAIRING_PENDING_TTL_MS;
}

function pruneExpiredRequests(reqs: PairingRequest[], nowMs: number) {
  const kept: PairingRequest[] = [];
  let removed = false;
  for (const req of reqs) {
    if (isExpired(req, nowMs)) {
      removed = true;
      continue;
    }
    kept.push(req);
  }
  return { requests: kept, removed };
}

function resolveLastSeenAt(entry: PairingRequest): number {
  return parseTimestamp(entry.lastSeenAt) ?? parseTimestamp(entry.createdAt) ?? 0;
}

function pruneExcessRequests(reqs: PairingRequest[], maxPending: number) {
  if (maxPending <= 0 || reqs.length <= maxPending) {
    return { requests: reqs, removed: false };
  }
  const sorted = reqs.slice().toSorted((a, b) => resolveLastSeenAt(a) - resolveLastSeenAt(b));
  return { requests: sorted.slice(-maxPending), removed: true };
}

function randomCode(): string {
  // Human-friendly: 8 chars, upper, no ambiguous chars (0O1I).
  let out = "";
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    const idx = crypto.randomInt(0, PAIRING_CODE_ALPHABET.length);
    out += PAIRING_CODE_ALPHABET[idx];
  }
  return out;
}

function generateUniqueCode(existing: Set<string>): string {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const code = randomCode();
    if (!existing.has(code)) {
      return code;
    }
  }
  throw new Error("failed to generate unique pairing code");
}

function normalizePairingAccountId(accountId?: string): string {
  return accountId?.trim().toLowerCase() || "";
}

function requestMatchesAccountId(entry: PairingRequest, normalizedAccountId: string): boolean {
  if (!normalizedAccountId) {
    return true;
  }
  return (
    String(entry.meta?.accountId ?? "")
      .trim()
      .toLowerCase() === normalizedAccountId
  );
}

function shouldIncludeLegacyAllowFromEntries(normalizedAccountId: string): boolean {
  // Keep backward compatibility for legacy channel-scoped allowFrom only on default account.
  // Non-default accounts should remain isolated to avoid cross-account implicit approvals.
  return !normalizedAccountId || normalizedAccountId === "default";
}

function normalizeId(value: string | number): string {
  return String(value).trim();
}

function normalizeAllowEntry(channel: PairingChannel, entry: string): string {
  const trimmed = entry.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "*") {
    return "";
  }
  const adapter = getPairingAdapter(channel);
  const normalized = adapter?.normalizeAllowEntry ? adapter.normalizeAllowEntry(trimmed) : trimmed;
  return String(normalized).trim();
}

function normalizeAllowFromList(channel: PairingChannel, store: AllowFromStore): string[] {
  const list = Array.isArray(store.allowFrom) ? store.allowFrom : [];
  return list.map((v) => normalizeAllowEntry(channel, String(v))).filter(Boolean);
}

function normalizeAllowFromInput(channel: PairingChannel, entry: string | number): string {
  return normalizeAllowEntry(channel, normalizeId(entry));
}

function dedupePreserveOrder(entries: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    const normalized = String(entry).trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

async function readAllowFromStateForPath(
  channel: PairingChannel,
  filePath: string,
): Promise<string[]> {
  const { value } = await readJsonFile<AllowFromStore>(filePath, {
    version: 1,
    allowFrom: [],
  });
  return normalizeAllowFromList(channel, value);
}

function readAllowFromStateForPathSync(channel: PairingChannel, filePath: string): string[] {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as AllowFromStore;
    return normalizeAllowFromList(channel, parsed);
  } catch {
    return [];
  }
}

async function readAllowFromState(params: {
  channel: PairingChannel;
  entry: string | number;
  filePath: string;
}): Promise<{ current: string[]; normalized: string | null }> {
  const { value } = await readJsonFile<AllowFromStore>(params.filePath, {
    version: 1,
    allowFrom: [],
  });
  const current = normalizeAllowFromList(params.channel, value);
  const normalized = normalizeAllowFromInput(params.channel, params.entry);
  return { current, normalized: normalized || null };
}

async function writeAllowFromState(filePath: string, allowFrom: string[]): Promise<void> {
  await writeJsonFile(filePath, {
    version: 1,
    allowFrom,
  } satisfies AllowFromStore);
}

async function updateAllowFromStoreEntry(params: {
  channel: PairingChannel;
  entry: string | number;
  env?: NodeJS.ProcessEnv;
  apply: (current: string[], normalized: string) => string[] | null;
}): Promise<{ changed: boolean; allowFrom: string[] }> {
  const env = params.env ?? process.env;
  const filePath = resolveAllowFromPath(params.channel, env);
  return await withFileLock(
    filePath,
    { version: 1, allowFrom: [] } satisfies AllowFromStore,
    async () => {
      const { current, normalized } = await readAllowFromState({
        channel: params.channel,
        entry: params.entry,
        filePath,
      });
      if (!normalized) {
        return { changed: false, allowFrom: current };
      }
      const next = params.apply(current, normalized);
      if (!next) {
        return { changed: false, allowFrom: current };
      }
      await writeAllowFromState(filePath, next);
      return { changed: true, allowFrom: next };
    },
  );
}

export async function readChannelAllowFromStore(
  channel: PairingChannel,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string[]> {
<<<<<<< HEAD
  const filePath = resolveAllowFromPath(channel, env);
  const { value } = await readJsonFile<AllowFromStore>(filePath, {
    version: 1,
    allowFrom: [],
  });
  return normalizeAllowFromList(channel, value);
=======
  const normalizedAccountId = accountId?.trim().toLowerCase() ?? "";
  if (!normalizedAccountId) {
    const filePath = resolveAllowFromPath(channel, env);
    return await readAllowFromStateForPath(channel, filePath);
  }

  const scopedPath = resolveAllowFromPath(channel, env, accountId);
  const scopedEntries = await readAllowFromStateForPath(channel, scopedPath);
  if (!shouldIncludeLegacyAllowFromEntries(normalizedAccountId)) {
    return scopedEntries;
  }
  // Backward compatibility: legacy channel-level allowFrom store was unscoped.
  // Keep honoring it for default account to prevent re-pair prompts after upgrades.
  const legacyPath = resolveAllowFromPath(channel, env);
  const legacyEntries = await readAllowFromStateForPath(channel, legacyPath);
  return dedupePreserveOrder([...scopedEntries, ...legacyEntries]);
>>>>>>> 6754a926e (fix(pairing): support legacy telegram allowFrom migration)
}

export function readChannelAllowFromStoreSync(
  channel: PairingChannel,
  env: NodeJS.ProcessEnv = process.env,
  accountId?: string,
): string[] {
  const normalizedAccountId = accountId?.trim().toLowerCase() ?? "";
  if (!normalizedAccountId) {
    const filePath = resolveAllowFromPath(channel, env);
    return readAllowFromStateForPathSync(channel, filePath);
  }

  const scopedPath = resolveAllowFromPath(channel, env, accountId);
  const scopedEntries = readAllowFromStateForPathSync(channel, scopedPath);
  if (!shouldIncludeLegacyAllowFromEntries(normalizedAccountId)) {
    return scopedEntries;
  }
  const legacyPath = resolveAllowFromPath(channel, env);
  const legacyEntries = readAllowFromStateForPathSync(channel, legacyPath);
  return dedupePreserveOrder([...scopedEntries, ...legacyEntries]);
}

type AllowFromStoreEntryUpdateParams = {
  channel: PairingChannel;
  entry: string | number;
  accountId?: string;
  env?: NodeJS.ProcessEnv;
};

type ChannelAllowFromStoreEntryMutation = (
  current: string[],
  normalized: string,
) => string[] | null;

async function updateChannelAllowFromStore(
  params: {
    apply: ChannelAllowFromStoreEntryMutation;
  } & AllowFromStoreEntryUpdateParams,
): Promise<{ changed: boolean; allowFrom: string[] }> {
  return await updateAllowFromStoreEntry({
    channel: params.channel,
    entry: params.entry,
    accountId: params.accountId,
    env: params.env,
    apply: params.apply,
  });
}

<<<<<<< HEAD
export async function addChannelAllowFromStoreEntry(params: {
  channel: PairingChannel;
  entry: string | number;
  env?: NodeJS.ProcessEnv;
}): Promise<{ changed: boolean; allowFrom: string[] }> {
<<<<<<< HEAD
  return await updateAllowFromStoreEntry({
    channel: params.channel,
    entry: params.entry,
    env: params.env,
=======
  return await updateChannelAllowFromStore({
    ...params,
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
    apply: (current, normalized) => {
      if (current.includes(normalized)) {
        return null;
      }
      return [...current, normalized];
    },
  });
}

export async function removeChannelAllowFromStoreEntry(params: {
  channel: PairingChannel;
  entry: string | number;
  env?: NodeJS.ProcessEnv;
}): Promise<{ changed: boolean; allowFrom: string[] }> {
<<<<<<< HEAD
  return await updateAllowFromStoreEntry({
    channel: params.channel,
    entry: params.entry,
    env: params.env,
=======
  return await updateChannelAllowFromStore({
    ...params,
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
    apply: (current, normalized) => {
      const next = current.filter((entry) => entry !== normalized);
      if (next.length === current.length) {
        return null;
      }
      return next;
    },
=======
async function mutateChannelAllowFromStoreEntry(
  params: AllowFromStoreEntryUpdateParams,
  apply: ChannelAllowFromStoreEntryMutation,
): Promise<{ changed: boolean; allowFrom: string[] }> {
  return await updateChannelAllowFromStore({
    ...params,
    apply,
  });
}

export async function addChannelAllowFromStoreEntry(
  params: AllowFromStoreEntryUpdateParams,
): Promise<{ changed: boolean; allowFrom: string[] }> {
  return await mutateChannelAllowFromStoreEntry(params, (current, normalized) => {
    if (current.includes(normalized)) {
      return null;
    }
    return [...current, normalized];
  });
}

export async function removeChannelAllowFromStoreEntry(
  params: AllowFromStoreEntryUpdateParams,
): Promise<{ changed: boolean; allowFrom: string[] }> {
  return await mutateChannelAllowFromStoreEntry(params, (current, normalized) => {
    const next = current.filter((entry) => entry !== normalized);
    if (next.length === current.length) {
      return null;
    }
    return next;
>>>>>>> 06b0a60be (refactor(daemon): share runtime and service probe helpers)
  });
}

export async function listChannelPairingRequests(
  channel: PairingChannel,
  env: NodeJS.ProcessEnv = process.env,
): Promise<PairingRequest[]> {
  const filePath = resolvePairingPath(channel, env);
  return await withFileLock(
    filePath,
    { version: 1, requests: [] } satisfies PairingStore,
    async () => {
      const { requests: prunedExpired, removed: expiredRemoved } =
        await readPrunedPairingRequests(filePath);
      const { requests: pruned, removed: cappedRemoved } = pruneExcessRequests(
        prunedExpired,
        PAIRING_PENDING_MAX,
      );
      if (expiredRemoved || cappedRemoved) {
        await writeJsonFile(filePath, {
          version: 1,
          requests: pruned,
        } satisfies PairingStore);
      }
<<<<<<< HEAD
<<<<<<< HEAD
      return pruned
=======
      const normalizedAccountId = accountId?.trim().toLowerCase() || "";
=======
      const normalizedAccountId = normalizePairingAccountId(accountId);
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
      const filtered = normalizedAccountId
        ? pruned.filter((entry) => requestMatchesAccountId(entry, normalizedAccountId))
        : pruned;
      return filtered
>>>>>>> d19b74692 (feat(skills): add cross-platform install fallback for non-brew environments (#17687))
        .filter(
          (r) =>
            r &&
            typeof r.id === "string" &&
            typeof r.code === "string" &&
            typeof r.createdAt === "string",
        )
        .slice()
        .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
  );
}

export async function upsertChannelPairingRequest(params: {
  channel: PairingChannel;
  id: string | number;
  meta?: Record<string, string | undefined | null>;
  env?: NodeJS.ProcessEnv;
  /** Extension channels can pass their adapter directly to bypass registry lookup. */
  pairingAdapter?: ChannelPairingAdapter;
}): Promise<{ code: string; created: boolean }> {
  const env = params.env ?? process.env;
  const filePath = resolvePairingPath(params.channel, env);
  return await withFileLock(
    filePath,
    { version: 1, requests: [] } satisfies PairingStore,
    async () => {
      const now = new Date().toISOString();
      const nowMs = Date.now();
      const id = normalizeId(params.id);
      const meta =
        params.meta && typeof params.meta === "object"
          ? Object.fromEntries(
              Object.entries(params.meta)
                .map(([k, v]) => [k, String(v ?? "").trim()] as const)
                .filter(([_, v]) => Boolean(v)),
            )
          : undefined;
<<<<<<< HEAD
=======
      const meta = normalizedAccountId ? { ...baseMeta, accountId: normalizedAccountId } : baseMeta;
>>>>>>> d19b74692 (feat(skills): add cross-platform install fallback for non-brew environments (#17687))

      let reqs = await readPairingRequests(filePath);
      const { requests: prunedExpired, removed: expiredRemoved } = pruneExpiredRequests(
        reqs,
        nowMs,
      );
      reqs = prunedExpired;
      const existingIdx = reqs.findIndex((r) => {
        if (r.id !== id) {
          return false;
        }
        return requestMatchesAccountId(r, normalizePairingAccountId(normalizedAccountId));
      });
      const existingCodes = new Set(
        reqs.map((req) =>
          String(req.code ?? "")
            .trim()
            .toUpperCase(),
        ),
      );

      if (existingIdx >= 0) {
        const existing = reqs[existingIdx];
        const existingCode =
          existing && typeof existing.code === "string" ? existing.code.trim() : "";
        const code = existingCode || generateUniqueCode(existingCodes);
        const next: PairingRequest = {
          id,
          code,
          createdAt: existing?.createdAt ?? now,
          lastSeenAt: now,
          meta: meta ?? existing?.meta,
        };
        reqs[existingIdx] = next;
        const { requests: capped } = pruneExcessRequests(reqs, PAIRING_PENDING_MAX);
        await writeJsonFile(filePath, {
          version: 1,
          requests: capped,
        } satisfies PairingStore);
        return { code, created: false };
      }

      const { requests: capped, removed: cappedRemoved } = pruneExcessRequests(
        reqs,
        PAIRING_PENDING_MAX,
      );
      reqs = capped;
      if (PAIRING_PENDING_MAX > 0 && reqs.length >= PAIRING_PENDING_MAX) {
        if (expiredRemoved || cappedRemoved) {
          await writeJsonFile(filePath, {
            version: 1,
            requests: reqs,
          } satisfies PairingStore);
        }
        return { code: "", created: false };
      }
      const code = generateUniqueCode(existingCodes);
      const next: PairingRequest = {
        id,
        code,
        createdAt: now,
        lastSeenAt: now,
        ...(meta ? { meta } : {}),
      };
      await writeJsonFile(filePath, {
        version: 1,
        requests: [...reqs, next],
      } satisfies PairingStore);
      return { code, created: true };
    },
  );
}

export async function approveChannelPairingCode(params: {
  channel: PairingChannel;
  code: string;
  env?: NodeJS.ProcessEnv;
}): Promise<{ id: string; entry?: PairingRequest } | null> {
  const env = params.env ?? process.env;
  const code = params.code.trim().toUpperCase();
  if (!code) {
    return null;
  }

  const filePath = resolvePairingPath(params.channel, env);
  return await withFileLock(
    filePath,
    { version: 1, requests: [] } satisfies PairingStore,
    async () => {
<<<<<<< HEAD
      const { value } = await readJsonFile<PairingStore>(filePath, {
        version: 1,
        requests: [],
      });
      const reqs = Array.isArray(value.requests) ? value.requests : [];
      const nowMs = Date.now();
      const { requests: pruned, removed } = pruneExpiredRequests(reqs, nowMs);
<<<<<<< HEAD
      const idx = pruned.findIndex((r) => String(r.code ?? "").toUpperCase() === code);
=======
      const normalizedAccountId = params.accountId?.trim().toLowerCase() || "";
=======
      const { requests: pruned, removed } = await readPrunedPairingRequests(filePath);
      const normalizedAccountId = normalizePairingAccountId(params.accountId);
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
      const idx = pruned.findIndex((r) => {
        if (String(r.code ?? "").toUpperCase() !== code) {
          return false;
        }
        return requestMatchesAccountId(r, normalizedAccountId);
      });
>>>>>>> d19b74692 (feat(skills): add cross-platform install fallback for non-brew environments (#17687))
      if (idx < 0) {
        if (removed) {
          await writeJsonFile(filePath, {
            version: 1,
            requests: pruned,
          } satisfies PairingStore);
        }
        return null;
      }
      const entry = pruned[idx];
      if (!entry) {
        return null;
      }
      pruned.splice(idx, 1);
      await writeJsonFile(filePath, {
        version: 1,
        requests: pruned,
      } satisfies PairingStore);
      await addChannelAllowFromStoreEntry({
        channel: params.channel,
        entry: entry.id,
        env,
      });
      return { id: entry.id, entry };
    },
  );
}
