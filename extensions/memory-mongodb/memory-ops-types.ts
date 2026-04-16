export const MEMORY_OPS_KINDS = [
  "note",
  "fact",
  "preference",
  "commitment",
  "decision",
  "audit",
] as const;

export type MemoryOpsKind = (typeof MEMORY_OPS_KINDS)[number];

export const MEMORY_OPS_MODALITIES = ["text", "image", "audio", "video", "document"] as const;

export type MemoryOpsModality = (typeof MEMORY_OPS_MODALITIES)[number];

export type MemoryOpsAttachmentManifest = {
  modality: MemoryOpsModality;
  mimeType: string;
  filename?: string;
  contentHash: string;
  byteLength?: number;
  durationMs?: number;
  pageCount?: number;
  transcriptStatus?: "available" | "missing" | "deferred";
  ocrStatus?: "available" | "missing" | "deferred";
  storageMode: "inline" | "external_ref";
  externalRef?: string;
};

export type MemoryOpsCommitmentStatus = "open" | "resolved" | "cancelled";

export type MemoryOpsMetadata = {
  kind: MemoryOpsKind;
  scopeSubject: string;
  source: string;
  confidence?: number;
  sourceMessageIds?: string[];
  observationCount?: number;
  stabilityScore?: number;
  status?: string;
  owner?: string;
  dueAt?: number;
  followUpAt?: number;
  priority?: "low" | "medium" | "high";
  supersedesId?: string;
  expiresAt?: number;
  auditRunId?: string;
  attachmentSummary?: {
    modalities: MemoryOpsModality[];
    totalCount: number;
  };
  attachments?: MemoryOpsAttachmentManifest[];
  preference?: {
    key: string;
    value: string;
  };
};

export type MemoryCaptureCandidate = {
  text?: string;
  kind: MemoryOpsKind;
  importance: number;
  parts?: Array<Record<string, unknown>>;
  attachments?: MemoryOpsAttachmentManifest[];
  category?: string;
  subCategory?: string;
  tags?: string[];
  confidence?: number;
  sourceMessageIds?: string[];
  observedAt?: number;
  status?: string;
  supersedesId?: string;
  commitment?: {
    owner: string;
    dueAt?: number;
    followUpAt?: number;
    priority?: "low" | "medium" | "high";
  };
  preference?: {
    key: string;
    value: string;
  };
};

export type MemoryCaptureOutcomeStatus =
  | "created"
  | "duplicate"
  | "rejected_secret"
  | "rejected_low_confidence"
  | "invalid";

export type MemoryCaptureOutcome = {
  status: MemoryCaptureOutcomeStatus;
  id?: string;
  reason?: string;
  existingId?: string;
};

export type MemoryRecallFilters = {
  kinds?: MemoryOpsKind[];
  openCommitmentsOnly?: boolean;
  preferencesOnly?: boolean;
  modalities?: MemoryOpsModality[];
  includeMetadata?: boolean;
};

export type MemoryHygieneStrategy = "dedupe" | "stale-prune" | "promote" | "conflict-review";

export type MemoryHygieneAction = {
  id: string;
  strategy: MemoryHygieneStrategy;
  action: "delete" | "promote" | "review";
  reason: string;
  memoryIds: string[];
  candidateText?: string;
  candidateValue?: string;
};

export type MemoryHygienePlan = {
  planId: string;
  scopeSubject: string;
  generatedAt: number;
  actions: MemoryHygieneAction[];
};

export type CommitmentTrackerMode = "capture" | "list_open" | "resolve" | "cancel";

export type PreferenceMinerMode = "observe" | "plan_promotions" | "apply_promotions" | "list";
