import type { CronJob } from "../../../src/cron/types.js";

export const CRON_GUARD_PLUGIN_ID = "cron-guard";
export const CRON_GUARD_EVENTS = [
  "cron.guard.requested",
  "cron.guard.modified",
  "cron.guard.resolved",
  "cron.guard.applied",
  "cron.guard.expired",
] as const;

export const CRON_GUARD_ACTIONS = ["add", "update", "remove"] as const;
export type CronGuardAction = (typeof CRON_GUARD_ACTIONS)[number];

export const CRON_GUARD_STATUSES = [
  "pending",
  "modified",
  "approved",
  "denied",
  "expired",
  "applied",
  "failed",
] as const;
export type CronGuardStatus = (typeof CRON_GUARD_STATUSES)[number];

export type CronGuardRequester = {
  agentId?: string;
  sessionKey?: string;
  sender?: string;
  requesterSenderId?: string;
  toolName?: string;
  messageChannel?: string;
};

export type CronGuardApprover = {
  id: string;
  principal: string;
  channel?: string;
  from?: string;
};

export type CronGuardAuditEventType =
  | "requested"
  | "modified"
  | "approved"
  | "denied"
  | "expired"
  | "applied"
  | "failed";

export type CronGuardAuditEvent = {
  type: CronGuardAuditEventType;
  actor: string;
  atMs: number;
  note?: string;
  status: CronGuardStatus;
};

export type CronGuardApplyResult = {
  ok: boolean;
  jobId?: string;
  removed?: boolean;
  error?: string;
};

export type CronGuardDiffSummary = {
  changedFields: string[];
};

export type CronGuardApprovalRecord = {
  requestId: string;
  action: CronGuardAction;
  status: CronGuardStatus;
  targetJobId?: string;
  requester: CronGuardRequester;
  approver?: CronGuardApprover;
  createdAtMs: number;
  expiresAtMs: number;
  resolvedAtMs?: number;
  appliedAtMs?: number;
  originalPayload: Record<string, unknown>;
  currentPayload: Record<string, unknown>;
  currentJobSnapshot?: CronJob;
  diffSummary?: CronGuardDiffSummary;
  applyResult?: CronGuardApplyResult;
  auditHistory: CronGuardAuditEvent[];
};

export type CronGuardRetentionPolicy = {
  maxAgeMs: number;
  maxResolved: number;
};

export type CronGuardStoreFile = {
  version: 1;
  requests: CronGuardApprovalRecord[];
};

export type CronGuardReadOptions = {
  redactWebhookTargets: boolean;
};

export function isTerminalCronGuardStatus(status: CronGuardStatus): boolean {
  return status === "denied" || status === "expired" || status === "applied" || status === "failed";
}
