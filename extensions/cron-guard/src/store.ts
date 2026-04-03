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
import { isTerminalCronGuardStatus } from "./types.js";

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

function isAuditEvent(value: unknown): value is CronGuardAuditEvent {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    typeof value.actor === "string" &&
    typeof value.atMs === "number" &&
    typeof value.status === "string"
  );
}

function isApprovalRecord(value: unknown): value is CronGuardApprovalRecord {
  return (
    isRecord(value) &&
    typeof value.requestId === "string" &&
    typeof value.action === "string" &&
    typeof value.status === "string" &&
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
    await this.prune();
    await this.persist();
  }

  async prune(): Promise<{
    expiredRequestIds: string[];
    prunedResolvedRequestIds: string[];
  }> {
    const now = this.now();
    const expiredRequestIds: string[] = [];
    for (const record of this.records) {
      if (isTerminalCronGuardStatus(record.status) || record.expiresAtMs > now) {
        continue;
      }
      record.status = "expired";
      record.resolvedAtMs = now;
      record.auditHistory = [
        ...record.auditHistory,
        {
          type: "expired",
          actor: "system",
          atMs: now,
          status: "expired",
        },
      ];
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

    if (expiredRequestIds.length > 0 || prunedResolvedRequestIds.length > 0) {
      await this.persist();
    }

    return { expiredRequestIds, prunedResolvedRequestIds };
  }

  async close(): Promise<void> {}

  private async persist(): Promise<void> {
    const value: CronGuardStoreFile = {
      version: STORE_VERSION,
      requests: this.records,
    };
    await withFileLock(this.filePath, LOCK_OPTIONS, async () => {
      await writeJsonFileAtomically(this.filePath, value);
    });
  }
}
