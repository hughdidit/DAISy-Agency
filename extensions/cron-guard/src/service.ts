import { randomUUID } from "node:crypto";
import type { CronJob, CronJobCreate, CronJobPatch } from "../../../src/cron/types.js";
import type { CronService } from "../../../src/cron/service.js";
import { normalizeCronJobCreate, normalizeCronJobPatch } from "../../../src/cron/normalize.js";
import { validateScheduleTimestamp } from "../../../src/cron/validate-timestamp.js";
import {
  ErrorCodes,
  formatValidationErrors,
  validateCronAddParams,
  validateCronUpdateParams,
} from "../../../src/gateway/protocol/index.js";
import type { PluginLogger } from "../../../src/plugins/types.js";
import { resolveCronGuardPluginConfig, type CronGuardPluginConfig } from "./config.js";
import { CronGuardStore } from "./store.js";
import type {
  CronGuardApprovalRecord,
  CronGuardApprover,
  CronGuardDiffSummary,
  CronGuardRequester,
} from "./types.js";
import { CRON_GUARD_EVENTS, isTerminalCronGuardStatus, type CronGuardAuditEventType } from "./types.js";

type RuntimeInit = {
  stateDir: string;
  logger: PluginLogger;
  config: CronGuardPluginConfig;
  broadcast?: (event: string, payload: unknown) => void;
  now?: () => number;
};

type ResolutionParams = {
  requestId: string;
  disposition: "approve" | "deny";
  approver: CronGuardApprover;
  cron: CronService;
};

type ModifyParams = {
  requestId: string;
  payload: Record<string, unknown>;
  approver: CronGuardApprover;
};

type CreateRequestBase = {
  requester: CronGuardRequester;
};

type CreateAddRequestParams = CreateRequestBase & {
  payload: Record<string, unknown>;
};

type CreateUpdateRequestParams = CreateRequestBase & {
  jobId: string;
  patch: Record<string, unknown>;
  cron: CronService;
};

type CreateRemoveRequestParams = CreateRequestBase & {
  jobId: string;
  cron: CronService;
};

function makeValidationError(prefix: string, errors: unknown): Error {
  return new Error(`${prefix}: ${formatValidationErrors(errors as never)}`, {
    cause: { code: ErrorCodes.INVALID_REQUEST },
  });
}

function cloneCronJob(job: CronJob): CronJob {
  return structuredClone(job);
}

function buildDiffSummary(before: Record<string, unknown>, after: Record<string, unknown>): CronGuardDiffSummary {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changedFields = [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  return { changedFields: changedFields.toSorted() };
}

function readRecordOrThrow(store: CronGuardStore, requestId: string): CronGuardApprovalRecord {
  const record = store.get(requestId);
  if (!record) {
    throw new Error(`Unknown requestId: ${requestId}`);
  }
  return record;
}

function assertMutable(record: CronGuardApprovalRecord, now: number): void {
  if (isTerminalCronGuardStatus(record.status)) {
    throw new Error(`Request ${record.requestId} is already ${record.status}.`);
  }
  if (record.expiresAtMs <= now) {
    throw new Error(`Request ${record.requestId} has expired.`);
  }
}

function appendAudit(
  record: CronGuardApprovalRecord,
  type: CronGuardAuditEventType,
  actor: string,
  atMs: number,
  status: CronGuardApprovalRecord["status"],
  note?: string,
): CronGuardApprovalRecord {
  return {
    ...record,
    status,
    auditHistory: [
      ...record.auditHistory,
      {
        type,
        actor,
        atMs,
        status,
        ...(note ? { note } : {}),
      },
    ],
  };
}

function normalizeAddPayload(payload: Record<string, unknown>): CronJobCreate {
  const normalized = normalizeCronJobCreate(payload);
  if (!normalized || !validateCronAddParams(normalized)) {
    throw makeValidationError("invalid cron_guard_add_request payload", validateCronAddParams.errors);
  }
  const timeCheck = validateScheduleTimestamp(normalized.schedule);
  if (!timeCheck.ok) {
    throw new Error(timeCheck.message);
  }
  return normalized;
}

function normalizeUpdatePatch(jobId: string, patch: Record<string, unknown>): CronJobPatch {
  const normalizedPatch = normalizeCronJobPatch(patch);
  const candidate = normalizedPatch ? { id: jobId, patch: normalizedPatch } : { id: jobId, patch };
  if (!validateCronUpdateParams(candidate)) {
    throw makeValidationError("invalid cron_guard_update_request patch", validateCronUpdateParams.errors);
  }
  const normalized = (candidate as { patch: CronJobPatch }).patch;
  if (normalized.schedule) {
    const timeCheck = validateScheduleTimestamp(normalized.schedule);
    if (!timeCheck.ok) {
      throw new Error(timeCheck.message);
    }
  }
  return normalized;
}

function normalizeRemovePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const jobId = typeof payload.jobId === "string" ? payload.jobId.trim() : "";
  if (!jobId) {
    throw new Error("invalid cron_guard_remove_request payload: jobId required");
  }
  const note = typeof payload.note === "string" && payload.note.trim() ? payload.note.trim() : undefined;
  return {
    jobId,
    ...(note ? { note } : {}),
  };
}

export class CronGuardRuntime {
  private readonly config: CronGuardPluginConfig;
  private readonly logger: PluginLogger;
  private readonly now: () => number;
  private readonly broadcast?: (event: string, payload: unknown) => void;
  private readonly store: CronGuardStore;
  private pruneTimer: NodeJS.Timeout | null = null;

  private constructor(params: {
    config: CronGuardPluginConfig;
    logger: PluginLogger;
    now: () => number;
    store: CronGuardStore;
    broadcast?: (event: string, payload: unknown) => void;
  }) {
    this.config = params.config;
    this.logger = params.logger;
    this.now = params.now;
    this.store = params.store;
    this.broadcast = params.broadcast;
  }

  static async create(params: RuntimeInit): Promise<CronGuardRuntime> {
    const now = params.now ?? (() => Date.now());
    const store = await CronGuardStore.open({
      stateDir: params.stateDir,
      retention: params.config.audit.retention,
      now,
    });
    return new CronGuardRuntime({
      config: params.config,
      logger: params.logger,
      now,
      store,
      broadcast: params.broadcast,
    });
  }

  start(): void {
    this.pruneTimer = setInterval(() => {
      void this.prune().catch((err) => {
        this.logger.warn(`cron-guard prune failed: ${String(err)}`);
      });
    }, Math.min(this.config.approvalTtlMs, 60_000));
    this.pruneTimer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
    await this.store.close();
  }

  getConfig(): CronGuardPluginConfig {
    return this.config;
  }

  listRequests(): CronGuardApprovalRecord[] {
    return this.store.list();
  }

  getRequest(requestId: string): CronGuardApprovalRecord | undefined {
    return this.store.get(requestId);
  }

  async createAddRequest(params: CreateAddRequestParams): Promise<CronGuardApprovalRecord> {
    const payload = normalizeAddPayload(params.payload);
    const now = this.now();
    const record: CronGuardApprovalRecord = {
      requestId: randomUUID(),
      action: "add",
      status: "pending",
      requester: params.requester,
      createdAtMs: now,
      expiresAtMs: now + this.config.approvalTtlMs,
      originalPayload: payload as unknown as Record<string, unknown>,
      currentPayload: payload as unknown as Record<string, unknown>,
      auditHistory: [
        {
          type: "requested",
          actor: params.requester.toolName ?? "unknown",
          atMs: now,
          status: "pending",
        },
      ],
    };
    await this.store.put(record);
    this.emit(CRON_GUARD_EVENTS[0], record);
    return record;
  }

  async createUpdateRequest(params: CreateUpdateRequestParams): Promise<CronGuardApprovalRecord> {
    const snapshot = params.cron.getJob(params.jobId);
    if (!snapshot) {
      throw new Error(`Cron job not found: ${params.jobId}`);
    }
    const patch = normalizeUpdatePatch(params.jobId, params.patch);
    const diffSummary = buildDiffSummary(snapshot as unknown as Record<string, unknown>, {
      ...snapshot,
      ...patch,
    });
    const now = this.now();
    const record: CronGuardApprovalRecord = {
      requestId: randomUUID(),
      action: "update",
      status: "pending",
      targetJobId: params.jobId,
      requester: params.requester,
      createdAtMs: now,
      expiresAtMs: now + this.config.approvalTtlMs,
      originalPayload: patch as unknown as Record<string, unknown>,
      currentPayload: patch as unknown as Record<string, unknown>,
      currentJobSnapshot: cloneCronJob(snapshot),
      diffSummary,
      auditHistory: [
        {
          type: "requested",
          actor: params.requester.toolName ?? "unknown",
          atMs: now,
          status: "pending",
        },
      ],
    };
    await this.store.put(record);
    this.emit(CRON_GUARD_EVENTS[0], record);
    return record;
  }

  async createRemoveRequest(params: CreateRemoveRequestParams): Promise<CronGuardApprovalRecord> {
    const snapshot = params.cron.getJob(params.jobId);
    if (!snapshot) {
      throw new Error(`Cron job not found: ${params.jobId}`);
    }
    const payload = normalizeRemovePayload({ jobId: params.jobId });
    const now = this.now();
    const record: CronGuardApprovalRecord = {
      requestId: randomUUID(),
      action: "remove",
      status: "pending",
      targetJobId: params.jobId,
      requester: params.requester,
      createdAtMs: now,
      expiresAtMs: now + this.config.approvalTtlMs,
      originalPayload: payload,
      currentPayload: payload,
      currentJobSnapshot: cloneCronJob(snapshot),
      diffSummary: { changedFields: ["remove"] },
      auditHistory: [
        {
          type: "requested",
          actor: params.requester.toolName ?? "unknown",
          atMs: now,
          status: "pending",
        },
      ],
    };
    await this.store.put(record);
    this.emit(CRON_GUARD_EVENTS[0], record);
    return record;
  }

  async modifyRequest(params: ModifyParams): Promise<CronGuardApprovalRecord> {
    const now = this.now();
    const record = readRecordOrThrow(this.store, params.requestId);
    assertMutable(record, now);

    let currentPayload: Record<string, unknown>;
    let diffSummary = record.diffSummary;
    if (record.action === "add") {
      currentPayload = normalizeAddPayload(params.payload) as unknown as Record<string, unknown>;
    } else if (record.action === "update") {
      currentPayload = normalizeUpdatePatch(record.targetJobId ?? "", params.payload) as unknown as Record<string, unknown>;
      if (record.currentJobSnapshot) {
        diffSummary = buildDiffSummary(
          record.currentJobSnapshot as unknown as Record<string, unknown>,
          {
            ...record.currentJobSnapshot,
            ...currentPayload,
          },
        );
      }
    } else {
      currentPayload = normalizeRemovePayload(params.payload);
    }

    const updated = appendAudit(record, "modified", params.approver.principal, now, "modified");
    updated.currentPayload = currentPayload;
    updated.approver = params.approver;
    updated.diffSummary = diffSummary;
    await this.store.put(updated);
    this.emit(CRON_GUARD_EVENTS[1], updated);
    return updated;
  }

  async resolveRequest(params: ResolutionParams): Promise<CronGuardApprovalRecord> {
    const now = this.now();
    const record = readRecordOrThrow(this.store, params.requestId);
    assertMutable(record, now);

    if (params.disposition === "deny") {
      const denied = appendAudit(record, "denied", params.approver.principal, now, "denied");
      denied.approver = params.approver;
      denied.resolvedAtMs = now;
      await this.store.put(denied);
      this.emit(CRON_GUARD_EVENTS[2], denied);
      return denied;
    }

    const approved = appendAudit(record, "approved", params.approver.principal, now, "approved");
    approved.approver = params.approver;
    approved.resolvedAtMs = now;
    await this.store.put(approved);
    this.emit(CRON_GUARD_EVENTS[2], approved);

    try {
      return await this.applyApprovedRequest(approved, params.cron);
    } catch (err) {
      const failed = appendAudit(
        approved,
        "failed",
        params.approver.principal,
        this.now(),
        "failed",
        String(err),
      );
      failed.applyResult = {
        ok: false,
        error: String(err),
      };
      await this.store.put(failed);
      this.emit(CRON_GUARD_EVENTS[3], failed);
      return failed;
    }
  }

  async prune(): Promise<void> {
    const result = await this.store.prune();
    for (const requestId of result.expiredRequestIds) {
      const record = this.store.get(requestId);
      if (record) {
        this.emit(CRON_GUARD_EVENTS[4], record);
      }
    }
  }

  private async applyApprovedRequest(
    record: CronGuardApprovalRecord,
    cron: CronService,
  ): Promise<CronGuardApprovalRecord> {
    const now = this.now();
    if (record.action === "add") {
      const job = await cron.add(normalizeAddPayload(record.currentPayload));
      const applied = appendAudit(record, "applied", record.approver?.principal ?? "system", now, "applied");
      applied.appliedAtMs = now;
      applied.applyResult = { ok: true, jobId: job.id };
      await this.store.put(applied);
      this.emit(CRON_GUARD_EVENTS[3], applied);
      return applied;
    }

    const jobId = record.targetJobId;
    if (!jobId) {
      throw new Error("Missing targetJobId for cron-guard request.");
    }
    const existing = cron.getJob(jobId);
    if (!existing) {
      throw new Error(`Cron job not found at apply time: ${jobId}`);
    }

    if (record.action === "update") {
      await cron.update(jobId, normalizeUpdatePatch(jobId, record.currentPayload));
      const applied = appendAudit(record, "applied", record.approver?.principal ?? "system", now, "applied");
      applied.appliedAtMs = now;
      applied.applyResult = { ok: true, jobId };
      await this.store.put(applied);
      this.emit(CRON_GUARD_EVENTS[3], applied);
      return applied;
    }

    const removalPayload = normalizeRemovePayload(record.currentPayload);
    if (removalPayload.jobId !== jobId) {
      throw new Error("Remove request jobId cannot be modified.");
    }
    const result = await cron.remove(jobId);
    if (!result.removed) {
      throw new Error(`Cron job was not removed: ${jobId}`);
    }
    const applied = appendAudit(record, "applied", record.approver?.principal ?? "system", now, "applied");
    applied.appliedAtMs = now;
    applied.applyResult = { ok: true, jobId, removed: true };
    await this.store.put(applied);
    this.emit(CRON_GUARD_EVENTS[3], applied);
    return applied;
  }

  private emit(event: string, record: CronGuardApprovalRecord): void {
    this.broadcast?.(event, {
      requestId: record.requestId,
      action: record.action,
      status: record.status,
      targetJobId: record.targetJobId,
      createdAtMs: record.createdAtMs,
      expiresAtMs: record.expiresAtMs,
      resolvedAtMs: record.resolvedAtMs,
      appliedAtMs: record.appliedAtMs,
    });
  }
}

let runtimeSingleton: CronGuardRuntime | null = null;

export async function initializeCronGuardRuntime(params: RuntimeInit): Promise<CronGuardRuntime> {
  if (runtimeSingleton) {
    await runtimeSingleton.stop();
  }
  const config = resolveCronGuardPluginConfig(params.config);
  runtimeSingleton = await CronGuardRuntime.create({
    ...params,
    config,
  });
  runtimeSingleton.start();
  return runtimeSingleton;
}

export function getCronGuardRuntime(): CronGuardRuntime {
  if (!runtimeSingleton) {
    throw new Error("Cron Guard runtime has not started.");
  }
  return runtimeSingleton;
}

export async function stopCronGuardRuntime(): Promise<void> {
  if (!runtimeSingleton) {
    return;
  }
  await runtimeSingleton.stop();
  runtimeSingleton = null;
}
