import fs from "node:fs/promises";
import path from "node:path";
import {
  readJsonFileWithFallback,
  withFileLock,
  writeJsonFileAtomically,
} from "openclaw/plugin-sdk";
import type {
  CronGuardApprovalRecord,
  CronGuardAuditEvent,
  CronGuardRetentionPolicy,
  CronGuardStoreFile,
} from "./types.js";
import {
  CRON_GUARD_ACTIONS,
  CRON_GUARD_AUDIT_EVENT_TYPES,
  CRON_GUARD_STATUSES,
  isTerminalCronGuardStatus,
} from "./types.js";

const STORE_VERSION = 1;
const LOCK_OPTIONS = {
  retries: {
    retries: 6,
    factor: 1.5,
    minTimeout: 20,
    maxTimeout: 250,
    randomize: true,
  },
  stale: 30_000,
} as const;

export function resolveCronGuardStorePath(stateDir: string): string {
  return path.join(stateDir, "plugins", "cron-guard", "requests.json");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function ensurePrivateDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  try {
    await fs.chmod(dir, 0o700);
  } catch {
    // chmod may be ignored on some local filesystems.
  }
}

function isAllowedString<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function isAuditEvent(value: unknown): value is CronGuardAuditEvent {
  return (
    isRecord(value) &&
    isAllowedString(value.type, CRON_GUARD_AUDIT_EVENT_TYPES) &&
    typeof value.actor === "string" &&
    typeof value.atMs === "number" &&
    isAllowedString(value.status, CRON_GUARD_STATUSES)
  );
}

function isApprovalRecord(value: unknown): value is CronGuardApprovalRecord {
  return (
    isRecord(value) &&
    typeof value.requestId === "string" &&
    isAllowedString(value.action, CRON_GUARD_ACTIONS) &&
    isAllowedString(value.status, CRON_GUARD_STATUSES) &&
    typeof value.createdAtMs === "number" &&
    typeof value.expiresAtMs === "number" &&
    isRecord(value.requester) &&
    isRecord(value.originalPayload) &&
    isRecord(value.currentPayload) &&
    Array.isArray(value.auditHistory) &&
    value.auditHistory.every((entry) => isAuditEvent(entry))
  );
}

function normalizeStoreFile(value: unknown): CronGuardStoreFile {
  if (!isRecord(value) || value.version !== STORE_VERSION || !Array.isArray(value.requests)) {
    return { version: STORE_VERSION, requests: [] };
  }
  return {
    version: STORE_VERSION,
    requests: value.requests.filter((entry): entry is CronGuardApprovalRecord =>
      isApprovalRecord(entry),
    ),
  };
}

function resolveRecordTimestamp(record: CronGuardApprovalRecord): number {
  return record.appliedAtMs ?? record.resolvedAtMs ?? record.createdAtMs;
}

export class CronGuardStore {
  private readonly filePath: string;
  private readonly retention: CronGuardRetentionPolicy;
  private readonly now: () => number;
  private records: CronGuardApprovalRecord[];

  private constructor(params: {
    filePath: string;
    retention: CronGuardRetentionPolicy;
    now: () => number;
    records: CronGuardApprovalRecord[];
  }) {
    this.filePath = params.filePath;
    this.retention = params.retention;
    this.now = params.now;
    this.records = params.records;
  }

  static async open(params: {
    stateDir: string;
    retention: CronGuardRetentionPolicy;
    now?: () => number;
  }): Promise<CronGuardStore> {
    const filePath = resolveCronGuardStorePath(params.stateDir);
    await ensurePrivateDir(path.dirname(filePath));
    const read = await readJsonFileWithFallback(filePath, { version: STORE_VERSION, requests: [] });
    const store = new CronGuardStore({
      filePath,
      retention: params.retention,
      now: params.now ?? (() => Date.now()),
      records: normalizeStoreFile(read.value).requests,
    });
    await store.prune();
    return store;
  }

  list(): CronGuardApprovalRecord[] {
    return this.records.toSorted((a, b) => b.createdAtMs - a.createdAtMs);
  }

  get(requestId: string): CronGuardApprovalRecord | undefined {
    return this.records.find((record) => record.requestId === requestId);
  }

  async put(record: CronGuardApprovalRecord): Promise<void> {
    const index = this.records.findIndex((entry) => entry.requestId === record.requestId);
    if (index >= 0) {
      this.records[index] = record;
    } else {
      this.records.push(record);
    }
    const result = await this.prune();
    if (!result.persisted) {
      await this.persist();
    }
  }

  async prune(): Promise<{
    expiredRequestIds: string[];
    prunedResolvedRequestIds: string[];
    persisted: boolean;
  }> {
    const now = this.now();
    const expiredRequestIds: string[] = [];
    for (const record of this.records) {
      if (isTerminalCronGuardStatus(record.status) || record.expiresAtMs > now) {
        continue;
      }
      record.status = "expired";
      record.resolvedAtMs = now;
      const expiredAuditEvent: CronGuardAuditEvent = {
        type: "expired",
        actor: "system",
        atMs: now,
        status: "expired",
      };
      record.auditHistory = [...record.auditHistory, expiredAuditEvent];
      expiredRequestIds.push(record.requestId);
    }

    const resolved = this.records
      .filter((record) => isTerminalCronGuardStatus(record.status))
      .toSorted((a, b) => resolveRecordTimestamp(b) - resolveRecordTimestamp(a));

    const keepResolved = new Set(
      resolved
        .filter((record, index) => {
          if (index >= this.retention.maxResolved) {
            return false;
          }
          return now - resolveRecordTimestamp(record) <= this.retention.maxAgeMs;
        })
        .map((record) => record.requestId),
    );

    const prunedResolvedRequestIds: string[] = [];
    this.records = this.records.filter((record) => {
      if (!isTerminalCronGuardStatus(record.status) || keepResolved.has(record.requestId)) {
        return true;
      }
      prunedResolvedRequestIds.push(record.requestId);
      return false;
    });

    let persisted = false;
    if (expiredRequestIds.length > 0 || prunedResolvedRequestIds.length > 0) {
      await this.persist();
      persisted = true;
    }

    return { expiredRequestIds, prunedResolvedRequestIds, persisted };
  }

  async close(): Promise<void> {}

  private async persist(): Promise<void> {
    const value: CronGuardStoreFile = {
      version: STORE_VERSION,
      requests: this.records,
    };
    await ensurePrivateDir(path.dirname(this.filePath));
    await withFileLock(this.filePath, LOCK_OPTIONS, async () => {
      await writeJsonFileAtomically(this.filePath, value);
    });
  }
}
