import { createHash, randomUUID } from "node:crypto";
import type { OpenClawPluginToolContext } from "../../src/plugins/types.js";
import { isSubagentSessionKey } from "../../src/routing/session-key.js";
import type { MemoryCategory, MemoryConfig } from "./config.js";
import type {
  CommitmentTrackerMode,
  MemoryCaptureCandidate,
  MemoryCaptureOutcome,
  MemoryHygieneAction,
  MemoryHygienePlan,
  MemoryHygieneStrategy,
  MemoryRecallFilters,
  MemoryOpsAttachmentManifest,
  MemoryOpsMetadata,
  MemorySensitivity,
  PreferenceMinerMode,
} from "./memory-ops-types.js";
import type { MemoryEntry, MemoryEventInput, MongoMemoryDB } from "./mongodb-provider.js";
import {
  buildAttachmentManifests,
  multimodalPartsToFallbackText,
  type MultimodalPart,
} from "./payload-chunker.js";

type Logger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string) => void;
};

type CaptureInput = {
  scopeSubject: string;
  entries: MemoryCaptureCandidate[];
  source: string;
  dedupeThreshold?: number;
};

type CommitmentTrackerInput = {
  mode: CommitmentTrackerMode;
  scopeSubject: string;
  text?: string;
  owner?: string;
  dueAt?: number;
  followUpAt?: number;
  priority?: "low" | "medium" | "high";
  commitmentId?: string;
  note?: string;
};

type PreferenceInput = {
  mode: PreferenceMinerMode;
  scopeSubject: string;
  key?: string;
  value?: string;
  confidence?: number;
};

type HygieneInput = {
  mode: "plan" | "apply";
  scopeSubject: string;
  strategies?: MemoryHygieneStrategy[];
  maxCandidates?: number;
  planId?: string;
  planHash?: string;
  approvedActionIds?: string[];
};

type RecallInput = {
  query: string;
  scopeSubject: string;
  limit?: number;
  maxLimit?: number;
  minScore?: number;
  filters?: MemoryRecallFilters;
};

type AuditInput = {
  scopeSubject: string;
  runId?: string;
  cleanupOnSuccess?: boolean;
};

type AuditRecallResult = {
  pass: boolean;
  recall: {
    count: number;
    noResult: boolean;
    memories: Array<Record<string, unknown>>;
  };
  attempts: number;
  resolvedStoredId?: string;
  reason?: string;
};

type PreferencePromotionPlan = {
  key: string;
  value: string;
  observations: number;
  conflicts: number;
  stabilityScore: number;
  supportingIds: string[];
};

const SECRET_PATTERNS = [
  /(api[-_ ]?key|token|password|passwd|secret|connection string)\s*[:=]\s*\S+/i,
  /bearer\s+[a-z0-9._-]{8,}/i,
  /(?:sk|pk)_[a-z0-9]{12,}/i,
  /xox[baprs]-[a-z0-9-]{10,}/i,
  /ghp_[a-z0-9]{20,}/i,
  /mongodb(?:\+srv)?:\/\//i,
  /-----begin [a-z ]*private key-----/i,
  /\b\d{6}\b\s*(?:otp|one-time|verification code)/i,
];

const DEFAULT_DEDUPE_THRESHOLD = 0.95;
const DEFAULT_RECALL_MIN_SCORE = 0.1;
const DEFAULT_AUDIT_RECALL_RETRY_DELAYS_MS = [250, 750, 1_500, 3_000] as const;
const ATTACHMENT_ONLY_FALLBACK_RE = /^\[attachment:[^\]]+\]$/i;
const HYGIENE_PLAN_MAX_AGE_MS = 15 * 60 * 1000;
const FULL_MEMORY_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEMORY_ID_PREFIX_REGEX = /^[0-9a-f-]{8,35}$/i;

export class MemoryOpsService {
  private readonly hygienePlans = new Map<string, MemoryHygienePlan>();

  constructor(
    private readonly db: MongoMemoryDB,
    private readonly cfg: MemoryConfig["ops"],
    private readonly logger?: Logger,
    private readonly auditRecallRetryDelaysMs: readonly number[] = DEFAULT_AUDIT_RECALL_RETRY_DELAYS_MS,
  ) {}

  async capture(input: CaptureInput): Promise<{ outcomes: MemoryCaptureOutcome[] }> {
    const dedupeThreshold = clampScore(input.dedupeThreshold ?? DEFAULT_DEDUPE_THRESHOLD);
    const outcomes: MemoryCaptureOutcome[] = [];

    for (const candidate of input.entries) {
      const result = await this.captureOne({
        candidate,
        scopeSubject: input.scopeSubject,
        source: input.source,
        dedupeThreshold,
      });
      outcomes.push(result);
    }

    void this.recordEvent({
      scopeSubject: input.scopeSubject,
      actor: input.source,
      operation: "memory_capture",
      status: summarizeOutcomeStatus(outcomes.map((outcome) => outcome.status)),
      memoryIds: outcomes
        .map((outcome) => outcome.id ?? outcome.existingId)
        .filter((id): id is string => typeof id === "string"),
      summary: `Processed ${outcomes.length} memory capture candidate(s).`,
      details: { outcomes },
    });

    return { outcomes };
  }

  async recall(input: RecallInput): Promise<{
    count: number;
    noResult: boolean;
    memories: Array<Record<string, unknown>>;
  }> {
    const maxLimit = clampPositiveInt(input.maxLimit, 20, 200);
    const limit = clampPositiveInt(input.limit, 5, maxLimit);
    const minScore =
      typeof input.minScore === "number" ? clampScore(input.minScore) : DEFAULT_RECALL_MIN_SCORE;
    const results = await this.db.searchByQuery(input.query, limit, minScore, {
      scopeSubject: input.scopeSubject,
      kinds: input.filters?.kinds,
      modalities: input.filters?.modalities,
      openCommitmentsOnly: input.filters?.openCommitmentsOnly,
      preferencesOnly: input.filters?.preferencesOnly,
      includeSecrets: input.filters?.includeSecrets,
    });

    const memories = results.slice(0, limit).map((result) => {
      const ops = readOpsMetadata(result.entry);
      const attachments = Array.isArray(ops?.attachments)
        ? ops.attachments.filter((item) => isObject(item))
        : [];

      return {
        id: result.entry.id,
        text: result.entry.text,
        category: result.entry.category,
        type: result.entry.type,
        importance: result.entry.importance,
        kind: ops?.kind,
        status: ops?.status,
        sensitivity: readSensitivity(ops),
        scopeSubject: ops?.scopeSubject,
        score: result.score,
        vectorScore: result.vectorScore,
        modalities: summarizeModalities(attachments),
        attachments,
        metadata: input.filters?.includeMetadata ? result.entry.metadata : undefined,
      };
    });

    return {
      count: memories.length,
      noResult: memories.length === 0,
      memories,
    };
  }

  async memoryHygiene(input: HygieneInput): Promise<{
    mode: "plan" | "apply";
    plan: MemoryHygienePlan;
    applied?: {
      deletedIds: string[];
      promotedIds: string[];
      reviewCount: number;
    };
  }> {
    if (input.mode === "plan") {
      const plan = await this.buildHygienePlan(
        input.scopeSubject,
        input.strategies,
        input.maxCandidates,
      );
      this.hygienePlans.set(plan.planId, plan);
      void this.recordEvent({
        scopeSubject: input.scopeSubject,
        actor: "memory_hygiene",
        operation: "memory_hygiene_plan",
        status: "planned",
        memoryIds: Array.from(new Set(plan.actions.flatMap((action) => action.memoryIds))),
        summary: `Generated memory hygiene plan with ${plan.actions.length} action(s).`,
        details: {
          planId: plan.planId,
          planHash: plan.planHash,
          actionIds: plan.actions.map((action) => action.id),
        },
      });
      return { mode: "plan", plan };
    }

    if (!input.planId || !input.planHash) {
      throw new Error("planId and planHash are required for memory_hygiene apply");
    }
    const cachedPlan = this.hygienePlans.get(input.planId);
    if (!cachedPlan) {
      throw new Error("planId not found or expired");
    }
    if (cachedPlan.scopeSubject !== input.scopeSubject) {
      throw new Error("planId is not valid for the current scope");
    }
    if (Date.now() - cachedPlan.generatedAt > HYGIENE_PLAN_MAX_AGE_MS) {
      this.hygienePlans.delete(input.planId);
      throw new Error("planId not found or expired");
    }
    if (cachedPlan.planHash !== input.planHash) {
      throw new Error("planHash does not match the cached hygiene plan");
    }
    const approvedActionIds = Array.isArray(input.approvedActionIds) ? input.approvedActionIds : [];
    if (
      !sameStringSet(
        approvedActionIds,
        cachedPlan.actions.map((action) => action.id),
      )
    ) {
      throw new Error("approvedActionIds must exactly match the cached hygiene plan actions");
    }
    const plan = cachedPlan;

    const deletedIds: string[] = [];
    const promotedIds: string[] = [];
    let reviewCount = 0;

    for (const action of plan.actions) {
      if (action.action === "delete") {
        for (const memoryId of action.memoryIds) {
          const deleted = await this.db.delete(memoryId).catch(() => false);
          if (deleted) {
            deletedIds.push(memoryId);
          }
        }
        continue;
      }

      if (action.action === "promote") {
        const captureResult = await this.capture({
          scopeSubject: input.scopeSubject,
          source: "memory_hygiene",
          entries: [
            {
              text: action.candidateText ?? "Promoted preference",
              kind: "preference",
              importance: 0.8,
              confidence: 0.95,
              status: "promoted",
              preference: {
                key: action.id,
                value: action.candidateValue ?? action.candidateText ?? "promoted",
              },
            },
          ],
        });
        for (const outcome of captureResult.outcomes) {
          if (outcome.status === "created" && outcome.id) {
            promotedIds.push(outcome.id);
          }
        }
        continue;
      }

      reviewCount += 1;
    }

    if (input.planId) {
      this.hygienePlans.delete(input.planId);
    }

    void this.recordEvent({
      scopeSubject: input.scopeSubject,
      actor: "memory_hygiene",
      operation: "memory_hygiene_apply",
      status: "applied",
      memoryIds: [...deletedIds, ...promotedIds],
      summary: `Applied memory hygiene plan ${plan.planId}.`,
      details: {
        planId: plan.planId,
        planHash: plan.planHash,
        deletedIds,
        promotedIds,
        reviewCount,
      },
    });

    return {
      mode: "apply",
      plan,
      applied: {
        deletedIds,
        promotedIds,
        reviewCount,
      },
    };
  }

  async commitmentTracker(input: CommitmentTrackerInput): Promise<Record<string, unknown>> {
    if (input.mode === "capture") {
      if (!input.text || !input.owner) {
        throw new Error("text and owner are required for commitment capture");
      }

      const captured = await this.capture({
        scopeSubject: input.scopeSubject,
        source: "commitment_tracker",
        entries: [
          {
            text: input.text,
            kind: "commitment",
            importance: 0.9,
            confidence: 0.95,
            commitment: {
              owner: input.owner,
              dueAt: input.dueAt,
              followUpAt: input.followUpAt,
              priority: input.priority,
            },
          },
        ],
      });

      void this.recordEvent({
        scopeSubject: input.scopeSubject,
        actor: "commitment_tracker",
        operation: "commitment_capture",
        status: summarizeOutcomeStatus(captured.outcomes.map((outcome) => outcome.status)),
        memoryIds: captured.outcomes
          .map((outcome) => outcome.id ?? outcome.existingId)
          .filter((id): id is string => typeof id === "string"),
        summary: "Captured commitment memory.",
        details: { outcomes: captured.outcomes },
      });

      return {
        mode: input.mode,
        outcomes: captured.outcomes,
      };
    }

    if (input.mode === "list_open") {
      const commitments = await this.listOpenCommitments(input.scopeSubject);
      return {
        mode: input.mode,
        count: commitments.length,
        commitments,
      };
    }

    if (input.mode === "resolve" || input.mode === "cancel") {
      if (!input.commitmentId) {
        throw new Error("commitmentId is required");
      }

      const updated = await this.supersedeCommitment(
        input.scopeSubject,
        input.commitmentId,
        input.mode === "resolve" ? "resolved" : "cancelled",
        input.note,
      );

      void this.recordEvent({
        scopeSubject: input.scopeSubject,
        actor: "commitment_tracker",
        operation: `commitment_${input.mode}`,
        status: "updated",
        memoryIds: [
          input.commitmentId,
          typeof updated.replacementId === "string" ? updated.replacementId : undefined,
        ].filter((id): id is string => typeof id === "string"),
        summary: `Commitment ${input.mode} created a replacement memory.`,
        details: updated,
      });

      return {
        mode: input.mode,
        updated,
      };
    }

    throw new Error(`Unsupported commitment tracker mode: ${input.mode}`);
  }

  async preferenceMiner(input: PreferenceInput): Promise<Record<string, unknown>> {
    if (input.mode === "observe") {
      if (!input.key || !input.value) {
        throw new Error("key and value are required for preference observe mode");
      }

      const outcomes = await this.capture({
        scopeSubject: input.scopeSubject,
        source: "preference_miner",
        entries: [
          {
            text: `${input.key}: ${input.value}`,
            kind: "preference",
            importance: 0.7,
            confidence: input.confidence ?? 0.8,
            preference: {
              key: input.key,
              value: input.value,
            },
          },
        ],
      });

      return {
        mode: input.mode,
        outcomes: outcomes.outcomes,
      };
    }

    if (input.mode === "list") {
      const all = await this.db.listByScope(input.scopeSubject, this.cfg.hygieneMaxCandidates * 4);
      const preferences = all
        .map((entry) => ({ entry, ops: readOpsMetadata(entry) }))
        .filter(
          ({ ops }) => ops?.kind === "preference" && !isSecretSensitivity(readSensitivity(ops)),
        )
        .map(({ entry, ops }) => ({
          id: entry.id,
          text: entry.text,
          key: readPreferenceKey(ops),
          value: readPreferenceValue(ops),
          status: ops?.status,
          stabilityScore: typeof ops?.stabilityScore === "number" ? ops.stabilityScore : undefined,
          observationCount:
            typeof ops?.observationCount === "number" ? ops.observationCount : undefined,
        }));
      return {
        mode: input.mode,
        count: preferences.length,
        preferences,
      };
    }

    const plans = await this.planPreferencePromotions(input.scopeSubject);

    if (input.mode === "plan_promotions") {
      return {
        mode: input.mode,
        promotions: plans,
      };
    }

    if (input.mode === "apply_promotions") {
      const created: string[] = [];
      for (const plan of plans) {
        const status =
          plan.observations >= this.cfg.preferenceMinObservations + 2 && plan.stabilityScore >= 0.95
            ? "truth"
            : "promoted";

        const outcome = await this.capture({
          scopeSubject: input.scopeSubject,
          source: "preference_miner",
          entries: [
            {
              text: `${plan.key}: ${plan.value}`,
              kind: "preference",
              importance: 0.85,
              confidence: Math.max(plan.stabilityScore, this.cfg.preferenceMinStabilityScore),
              status,
              preference: {
                key: plan.key,
                value: plan.value,
              },
            },
          ],
        });

        for (const entry of outcome.outcomes) {
          if (entry.status === "created" && entry.id) {
            created.push(entry.id);
          }
        }

        if (created.length > 0) {
          this.logger?.info?.(
            `memory-mongodb: preference_miner promoted ${plan.key}=${plan.value} status=${status}`,
          );
        }
      }

      void this.recordEvent({
        scopeSubject: input.scopeSubject,
        actor: "preference_miner",
        operation: "preference_promotion",
        status: created.length > 0 ? "promoted" : "skipped",
        memoryIds: created,
        summary: `Applied ${created.length} preference promotion(s).`,
        details: { promotedIds: created, promotions: plans },
      });

      return {
        mode: input.mode,
        promotedCount: created.length,
        promotedIds: created,
        promotions: plans,
      };
    }

    throw new Error(`Unsupported preference miner mode: ${input.mode}`);
  }

  async memoryAudit(input: AuditInput): Promise<Record<string, unknown>> {
    const runId = input.runId?.trim() || randomUUID();
    const token = `memory-audit-probe-${runId}-${randomUUID().slice(0, 8)}`;

    const captured = await this.capture({
      scopeSubject: input.scopeSubject,
      source: "memory_audit",
      entries: [
        {
          text: token,
          kind: "audit",
          importance: 0.1,
          confidence: 1,
          auditRunId: runId,
          expiresAt: Date.now() + 1000 * 60 * 60 * 24,
        },
      ],
    });

    const created = captured.outcomes.find((outcome) => outcome.status === "created" && outcome.id);
    if (!created?.id) {
      return {
        pass: false,
        reason: "audit probe could not be stored",
        runId,
        capture: captured.outcomes,
      };
    }

    const startedAt = Date.now();
    const auditRecall = await this.recallAuditProbe({
      token,
      createdId: created.id,
      scopeSubject: input.scopeSubject,
    });
    const recall = auditRecall.recall;
    const latencyMs = Date.now() - startedAt;

    const pass = auditRecall.pass;
    const cleanupRequested = input.cleanupOnSuccess ?? this.cfg.auditCleanup;
    let cleanupResult: "skipped" | "deleted" | "failed" = "skipped";
    let cleanupReason: string | undefined;
    const resolvedStoredId = auditRecall.resolvedStoredId;

    if (cleanupRequested && pass) {
      const cleanup = await this.deleteAuditProbe({
        storedId: created.id,
        resolvedStoredId,
        scopeSubject: input.scopeSubject,
      });
      cleanupResult = cleanup.deleted ? "deleted" : "failed";
      cleanupReason = cleanup.reason;
    }

    const result = {
      pass,
      runId,
      token,
      storedId: created.id,
      resolvedStoredId: resolvedStoredId === created.id ? undefined : resolvedStoredId,
      recallHits: recall.count,
      recallEvidenceIds: recall.memories.map((memory) => memory.id),
      recallAttempts: auditRecall.attempts,
      latencyMs,
      cleanupResult,
      cleanupReason,
      reason: auditRecall.reason,
    };
    void this.recordEvent({
      scopeSubject: input.scopeSubject,
      actor: "memory_audit",
      operation: "memory_audit",
      status: pass ? "passed" : "failed",
      memoryIds: [resolvedStoredId ?? created.id],
      summary: pass ? "Memory audit probe round-trip passed." : "Memory audit probe recall failed.",
      details: result,
    });
    return result;
  }

  private async recallAuditProbe(input: {
    token: string;
    createdId: string;
    scopeSubject: string;
  }): Promise<AuditRecallResult> {
    let recall: Awaited<ReturnType<MemoryOpsService["recall"]>> = {
      count: 0,
      noResult: true,
      memories: [],
    };
    let reason: string | undefined;
    const maxAttempts = 1 + this.auditRecallRetryDelaysMs.length;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (attempt > 1) {
        const delayMs = this.auditRecallRetryDelaysMs[attempt - 2] ?? 0;
        if (delayMs > 0) {
          await delay(delayMs);
        }
      }

      recall = await this.recall({
        query: input.token,
        scopeSubject: input.scopeSubject,
        limit: 5,
        minScore: 0,
        filters: {
          kinds: ["audit"],
          includeMetadata: true,
        },
      });

      const resolution = resolveAuditStoredId(input.createdId, recall.memories);
      if (resolution.status === "matched") {
        return {
          pass: true,
          recall,
          attempts: attempt,
          resolvedStoredId: resolution.id,
        };
      }
      reason = resolution.reason;
    }

    return {
      pass: false,
      recall,
      attempts: maxAttempts,
      reason,
    };
  }

  private async deleteAuditProbe(input: {
    storedId: string;
    resolvedStoredId?: string;
    scopeSubject: string;
  }): Promise<{ deleted: boolean; reason?: string }> {
    const deleteId = input.resolvedStoredId ?? input.storedId;
    const exact = await this.deleteMemoryById(deleteId);
    if (input.resolvedStoredId) {
      return exact;
    }
    if (exact.deleted || !isMemoryIdPrefix(input.storedId) || isFullMemoryId(input.storedId)) {
      return exact;
    }

    const matches = await this.db
      .findByIdPrefix(input.storedId, input.scopeSubject, 2)
      .catch((error) => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    if (!Array.isArray(matches)) {
      return { deleted: false, reason: matches.error };
    }
    if (matches.length !== 1) {
      return {
        deleted: false,
        reason: matches.length === 0 ? "prefix_not_found" : "ambiguous_prefix",
      };
    }
    return this.deleteMemoryById(matches[0].id);
  }

  private async deleteMemoryById(id: string): Promise<{ deleted: boolean; reason?: string }> {
    try {
      const deleted = await this.db.delete(id);
      return deleted ? { deleted } : { deleted, reason: "not_found" };
    } catch (error) {
      return { deleted: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  private async captureOne(input: {
    candidate: MemoryCaptureCandidate;
    scopeSubject: string;
    source: string;
    dedupeThreshold: number;
  }): Promise<MemoryCaptureOutcome> {
    const parts = normalizeParts(input.candidate.parts, input.candidate.text);
    if (parts.length === 0) {
      return {
        status: "invalid",
        reason: "candidate requires text or parts",
      };
    }

    const fallbackText = multimodalPartsToFallbackText(parts, 4_000).trim();
    if (!fallbackText) {
      return {
        status: "invalid",
        reason: "candidate resolves to empty text",
      };
    }

    const sensitivity = normalizeSensitivity(input.candidate.sensitivity);
    if (looksLikeSecret(fallbackText) && !isSecretSensitivity(sensitivity)) {
      return {
        status: "rejected_secret",
        reason:
          "candidate contains secret-like content; re-submit with sensitivity=secret to store intentionally",
      };
    }

    const confidence =
      typeof input.candidate.confidence === "number" ? clampScore(input.candidate.confidence) : 1;
    if (confidence < this.cfg.captureMinConfidence) {
      return {
        status: "rejected_low_confidence",
        reason: `confidence ${confidence.toFixed(2)} below capture threshold`,
      };
    }

    const inlineManifests = buildAttachmentManifests(parts);
    const combinedAttachments: MemoryOpsAttachmentManifest[] = [
      ...inlineManifests,
      ...(Array.isArray(input.candidate.attachments)
        ? input.candidate.attachments.filter((item) => isObject(item))
        : []),
    ] as MemoryOpsAttachmentManifest[];

    for (const attachment of combinedAttachments) {
      if (
        attachment.modality === "document" &&
        !this.cfg.supportedDocumentMimeTypes.includes(attachment.mimeType)
      ) {
        return {
          status: "invalid",
          reason: `unsupported document MIME type: ${attachment.mimeType}`,
        };
      }
      if (attachment.modality === "document") {
        const maxInlineBytes = this.cfg.maxInlineDocumentBytesByMime[attachment.mimeType];
        if (
          typeof maxInlineBytes === "number" &&
          maxInlineBytes >= 0 &&
          typeof attachment.byteLength === "number" &&
          attachment.byteLength > maxInlineBytes
        ) {
          return {
            status: "invalid",
            reason:
              `inline document exceeds maximum size for ${attachment.mimeType}: ` +
              `${attachment.byteLength} bytes > ${maxInlineBytes} bytes`,
          };
        }
      }
    }

    const status = deriveStatus(input.candidate);
    const attachmentsChecksum = attachmentFingerprint(combinedAttachments);
    const contentHash = createHash("sha256")
      .update(
        JSON.stringify({
          fallbackText,
          attachmentsChecksum,
          status,
          supersedesId: input.candidate.supersedesId ?? null,
        }),
      )
      .digest("hex");

    const skipDedupe = input.source === "memory_audit" || input.candidate.kind === "audit";
    if (!skipDedupe) {
      const existing = await this.db.searchByQuery(fallbackText, 3, 0, {
        scopeSubject: input.scopeSubject,
        includeSecrets: true,
      });

      for (const candidate of existing) {
        const ops = readOpsMetadata(candidate.entry);
        const candidateScope =
          typeof candidate.entry.scopeSubject === "string"
            ? candidate.entry.scopeSubject
            : ops?.scopeSubject;
        if (candidateScope !== input.scopeSubject) {
          continue;
        }
        const existingHash = typeof ops?.contentHash === "string" ? ops.contentHash : undefined;
        if (existingHash && existingHash === contentHash) {
          return {
            status: "duplicate",
            existingId: candidate.entry.id,
            reason: "matching content hash",
          };
        }
        if (candidate.score >= input.dedupeThreshold) {
          if (isAttachmentOnlyFallbackText(fallbackText)) {
            const existingChecksum = attachmentFingerprint(
              Array.isArray(ops?.attachments)
                ? (ops.attachments.filter((item) =>
                    isObject(item),
                  ) as MemoryOpsAttachmentManifest[])
                : [],
            );
            if (existingChecksum !== attachmentsChecksum) {
              continue;
            }
          }
          return {
            status: "duplicate",
            existingId: candidate.entry.id,
            reason: `semantic similarity ${(candidate.score * 100).toFixed(0)}%`,
          };
        }
      }
    }

    const metadataOps: MemoryOpsMetadata & { contentHash: string } = {
      kind: input.candidate.kind,
      scopeSubject: input.scopeSubject,
      source: input.source,
      sensitivity,
      confidence,
      sourceMessageIds: input.candidate.sourceMessageIds,
      status,
      observedAt: input.candidate.observedAt,
      expiresAt: input.candidate.expiresAt,
      auditRunId: input.candidate.auditRunId,
      owner: input.candidate.commitment?.owner,
      dueAt: input.candidate.commitment?.dueAt,
      followUpAt: input.candidate.commitment?.followUpAt,
      priority: input.candidate.commitment?.priority,
      attachmentSummary: {
        modalities: Array.from(new Set(combinedAttachments.map((item) => item.modality))),
        totalCount: combinedAttachments.length,
      },
      attachments: combinedAttachments,
      preference: input.candidate.preference,
      supersedesId: input.candidate.supersedesId,
      contentHash,
    };

    const category = resolveCategory(input.candidate.kind, input.candidate.category);

    const stored = await this.db.store({
      text: fallbackText,
      parts,
      importance: clampScore(input.candidate.importance),
      category,
      subCategory: input.candidate.subCategory,
      type: resolveMemoryType(input.candidate.kind),
      tags: input.candidate.tags,
      metadata: {
        source: input.source,
        ops: metadataOps,
      },
    });

    return {
      status: "created",
      id: stored.id,
    };
  }

  private async buildHygienePlan(
    scopeSubject: string,
    strategies?: MemoryHygieneStrategy[],
    maxCandidates?: number,
  ): Promise<MemoryHygienePlan> {
    const selectedStrategies =
      Array.isArray(strategies) && strategies.length > 0
        ? strategies
        : (["dedupe", "stale-prune", "promote", "conflict-review"] as MemoryHygieneStrategy[]);

    const limit = Math.max(1, Math.min(maxCandidates ?? this.cfg.hygieneMaxCandidates, 100));
    const entries = (await this.db.listByScope(scopeSubject, limit)).filter(
      (entry) => !isSecretSensitivity(readSensitivity(readOpsMetadata(entry))),
    );
    const actions: MemoryHygieneAction[] = [];

    if (selectedStrategies.includes("dedupe")) {
      const byHash = new Map<string, MemoryEntry[]>();
      for (const entry of entries) {
        const ops = readOpsMetadata(entry);
        const hash = typeof ops?.contentHash === "string" ? ops.contentHash : "";
        if (!hash) {
          continue;
        }
        const list = byHash.get(hash) ?? [];
        list.push(entry);
        byHash.set(hash, list);
      }

      for (const [hash, duplicates] of byHash.entries()) {
        if (duplicates.length < 2) {
          continue;
        }
        duplicates.sort((a, b) => b.updatedAt - a.updatedAt);
        const duplicateIds = duplicates.slice(1).map((entry) => entry.id);
        actions.push({
          id: `dedupe:${hash}`,
          strategy: "dedupe",
          action: "delete",
          reason: "duplicate memories share content hash",
          memoryIds: duplicateIds,
          candidateText: duplicates[0]?.text,
        });
      }
    }

    if (selectedStrategies.includes("stale-prune")) {
      const now = Date.now();
      for (const entry of entries) {
        const ops = readOpsMetadata(entry);
        const expiresAt = typeof ops?.expiresAt === "number" ? ops.expiresAt : undefined;
        const staleAudit = ops?.kind === "audit" && entry.updatedAt < now - 1000 * 60 * 60 * 24;
        if ((typeof expiresAt === "number" && expiresAt < now) || staleAudit) {
          actions.push({
            id: `stale:${entry.id}`,
            strategy: "stale-prune",
            action: "delete",
            reason: "memory is expired or stale audit probe",
            memoryIds: [entry.id],
            candidateText: entry.text,
          });
        }
      }
    }

    if (selectedStrategies.includes("conflict-review")) {
      const preferences = entries
        .map((entry) => ({ entry, ops: readOpsMetadata(entry) }))
        .filter(({ ops }) => ops?.kind === "preference");

      const grouped = new Map<string, Map<string, string[]>>();
      for (const item of preferences) {
        const key = readPreferenceKey(item.ops) ?? item.entry.text;
        const value = readPreferenceValue(item.ops) ?? item.entry.text;
        const values = grouped.get(key) ?? new Map<string, string[]>();
        const ids = values.get(value) ?? [];
        ids.push(item.entry.id);
        values.set(value, ids);
        grouped.set(key, values);
      }

      for (const [key, values] of grouped.entries()) {
        if (values.size <= 1) {
          continue;
        }
        const allIds = Array.from(values.values()).flat();
        actions.push({
          id: `conflict:${key}`,
          strategy: "conflict-review",
          action: "review",
          reason: "conflicting preference evidence detected",
          memoryIds: allIds,
          candidateText: key,
        });
      }
    }

    if (selectedStrategies.includes("promote")) {
      const promotions = await this.planPreferencePromotions(scopeSubject);
      for (const promotion of promotions) {
        actions.push({
          id: promotion.key,
          strategy: "promote",
          action: "promote",
          reason: `stable preference candidate (${promotion.observations} observations)`,
          memoryIds: promotion.supportingIds,
          candidateText: `${promotion.key}: ${promotion.value}`,
          candidateValue: promotion.value,
        });
      }
    }

    return {
      planId: randomUUID(),
      scopeSubject,
      generatedAt: Date.now(),
      actions,
      planHash: buildPlanHash(actions),
    };
  }

  private async listOpenCommitments(scopeSubject: string): Promise<Array<Record<string, unknown>>> {
    const entries = await this.db.listByScope(scopeSubject, this.cfg.hygieneMaxCandidates * 4, {
      includeSecrets: true,
    });
    const commitmentEntries = entries
      .map((entry) => ({ entry, ops: readOpsMetadata(entry) }))
      .filter(({ ops }) => ops?.kind === "commitment");

    const superseded = new Set<string>();
    for (const { ops } of commitmentEntries) {
      if (typeof ops?.supersedesId === "string") {
        superseded.add(ops.supersedesId);
      }
    }

    return commitmentEntries
      .filter(
        ({ entry, ops }) =>
          ops?.status === "open" &&
          !superseded.has(entry.id) &&
          !isSecretSensitivity(readSensitivity(ops)),
      )
      .map(({ entry, ops }) => ({
        id: entry.id,
        text: entry.text,
        owner: ops?.owner,
        status: ops?.status,
        dueAt: ops?.dueAt,
        followUpAt: ops?.followUpAt,
        priority: ops?.priority,
        updatedAt: entry.updatedAt,
      }));
  }

  private async supersedeCommitment(
    scopeSubject: string,
    commitmentId: string,
    status: "resolved" | "cancelled",
    note?: string,
  ): Promise<Record<string, unknown>> {
    const existing = await this.db.getById(commitmentId);
    if (!existing) {
      throw new Error(`commitment ${commitmentId} not found`);
    }

    const ops = readOpsMetadata(existing);
    if (
      ops?.scopeSubject !== scopeSubject ||
      ops.kind !== "commitment" ||
      isSecretSensitivity(readSensitivity(ops))
    ) {
      throw new Error("commitment not found in current agent scope");
    }

    const outcome = await this.capture({
      scopeSubject,
      source: "commitment_tracker",
      entries: [
        {
          text: note ? `${existing.text}\n${note}` : existing.text,
          kind: "commitment",
          importance: existing.importance,
          confidence: 1,
          status,
          supersedesId: commitmentId,
          commitment: {
            owner: typeof ops.owner === "string" ? ops.owner : "unknown",
            dueAt: typeof ops.dueAt === "number" ? ops.dueAt : undefined,
            followUpAt: typeof ops.followUpAt === "number" ? ops.followUpAt : undefined,
            priority: isPriority(ops.priority) ? ops.priority : undefined,
          },
        },
      ],
      dedupeThreshold: 1,
    });

    const createdId = outcome.outcomes.find((item) => item.status === "created")?.id;
    if (!createdId) {
      throw new Error(`failed to update commitment status to ${status}`);
    }

    return {
      supersededId: commitmentId,
      replacementId: createdId,
      status,
    };
  }

  private async planPreferencePromotions(scopeSubject: string): Promise<PreferencePromotionPlan[]> {
    const entries = await this.db.listByScope(scopeSubject, this.cfg.hygieneMaxCandidates * 5);

    const grouped = new Map<string, Map<string, string[]>>();
    for (const entry of entries) {
      const ops = readOpsMetadata(entry);
      if (ops?.kind !== "preference") {
        continue;
      }
      if (isSecretSensitivity(readSensitivity(ops))) {
        continue;
      }
      const status = typeof ops.status === "string" ? ops.status : "observed";
      if (status !== "observed" && status !== "open") {
        continue;
      }

      const key = readPreferenceKey(ops) ?? entry.text;
      const value = readPreferenceValue(ops) ?? entry.text;
      const values = grouped.get(key) ?? new Map<string, string[]>();
      const ids = values.get(value) ?? [];
      ids.push(entry.id);
      values.set(value, ids);
      grouped.set(key, values);
    }

    const promotions: PreferencePromotionPlan[] = [];
    for (const [key, values] of grouped.entries()) {
      let topValue = "";
      let topIds: string[] = [];
      let conflictCount = 0;

      for (const [value, ids] of values.entries()) {
        if (ids.length > topIds.length) {
          conflictCount += topIds.length;
          topValue = value;
          topIds = [...ids];
        } else {
          conflictCount += ids.length;
        }
      }

      if (!topValue || topIds.length === 0) {
        continue;
      }

      const observations = topIds.length;
      const stabilityScore = observations / Math.max(1, observations + conflictCount);

      if (
        observations >= this.cfg.preferenceMinObservations &&
        stabilityScore >= this.cfg.preferenceMinStabilityScore
      ) {
        promotions.push({
          key,
          value: topValue,
          observations,
          conflicts: conflictCount,
          stabilityScore,
          supportingIds: topIds,
        });
      }
    }

    return promotions;
  }

  private async recordEvent(input: MemoryEventInput): Promise<void> {
    try {
      await this.db.recordEvent(input);
    } catch (error) {
      this.logger?.warn?.(
        `memory-mongodb: failed to record memory event ${input.operation}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

export function resolveScopeSubjectFromContext(ctx: OpenClawPluginToolContext): string | null {
  const normalizedAgentId = typeof ctx.agentId === "string" ? ctx.agentId.trim().toLowerCase() : "";
  if (!normalizedAgentId) {
    return null;
  }

  if (ctx.sessionKey && isSubagentSessionKey(ctx.sessionKey)) {
    const subagentId = resolveSubagentIdFromSessionKey(ctx.sessionKey);
    return `subagent:${subagentId ?? normalizedAgentId}`;
  }

  return `agent:${normalizedAgentId}`;
}

function normalizeParts(parts: unknown, text: string | undefined): MultimodalPart[] {
  const normalizedParts = Array.isArray(parts)
    ? (parts.filter((item) => isObject(item)) as MultimodalPart[])
    : [];

  const normalizedText = typeof text === "string" ? text.trim() : "";
  if (normalizedParts.length === 0 && normalizedText) {
    return [{ text: normalizedText }];
  }
  if (normalizedParts.length > 0 && normalizedText) {
    return [{ text: normalizedText }, ...normalizedParts];
  }
  return normalizedParts;
}

function resolveSubagentIdFromSessionKey(sessionKey: string): string | null {
  const tokens = sessionKey
    .trim()
    .toLowerCase()
    .split(":")
    .filter((token) => token.length > 0);
  const subagentIndex = tokens.lastIndexOf("subagent");
  const candidate = subagentIndex >= 0 ? tokens[subagentIndex + 1] : undefined;
  if (!candidate) {
    return null;
  }
  return candidate.trim().length > 0 ? candidate.trim() : null;
}

function isAttachmentOnlyFallbackText(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return false;
  }
  return lines.every((line) => ATTACHMENT_ONLY_FALLBACK_RE.test(line));
}

function attachmentFingerprint(attachments: MemoryOpsAttachmentManifest[]): string {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return "none";
  }
  const normalized = attachments
    .map((attachment) => ({
      modality: attachment.modality,
      mimeType: attachment.mimeType,
      contentHash: attachment.contentHash,
      byteLength: attachment.byteLength ?? null,
      storageMode: attachment.storageMode,
      externalRef: attachment.externalRef ?? null,
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function looksLikeSecret(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return SECRET_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function clampPositiveInt(value: number | undefined, fallback: number, max: number): number {
  const raw = Number.isFinite(value) ? (value as number) : fallback;
  const normalized = Math.trunc(raw);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }
  return Math.max(1, Math.min(normalized, max));
}

function resolveCategory(kind: string, requested?: string): MemoryCategory {
  if (
    requested === "preference" ||
    requested === "fact" ||
    requested === "decision" ||
    requested === "entity" ||
    requested === "other"
  ) {
    return requested;
  }
  switch (kind) {
    case "preference":
      return "preference";
    case "fact":
      return "fact";
    case "decision":
    case "commitment":
      return "decision";
    default:
      return "other";
  }
}

function resolveMemoryType(
  kind: string,
): "working" | "cache" | "episodic" | "semantic" | "procedural" | "associative" {
  switch (kind) {
    case "fact":
      return "semantic";
    case "decision":
    case "commitment":
      return "procedural";
    case "preference":
      return "associative";
    default:
      return "episodic";
  }
}

function deriveStatus(candidate: MemoryCaptureCandidate): string {
  if (typeof candidate.status === "string" && candidate.status.trim().length > 0) {
    return candidate.status.trim();
  }
  if (candidate.kind === "commitment") {
    return "open";
  }
  if (candidate.kind === "preference") {
    return "observed";
  }
  if (candidate.kind === "audit") {
    return "probe";
  }
  return "recorded";
}

function summarizeModalities(attachments: Array<Record<string, unknown>>): string[] {
  if (attachments.length === 0) {
    return ["text"];
  }
  const modalities = attachments
    .map((item) => (typeof item.modality === "string" ? item.modality : null))
    .filter((value): value is string => typeof value === "string");
  return modalities.length > 0 ? Array.from(new Set(modalities)) : ["text"];
}

function readOpsMetadata(entry: MemoryEntry): Record<string, unknown> | null {
  if (!isObject(entry.metadata)) {
    return null;
  }
  const raw = entry.metadata.ops;
  return isObject(raw) ? raw : null;
}

function readPreferenceKey(ops: Record<string, unknown> | null): string | undefined {
  if (!ops || !isObject(ops.preference)) {
    return undefined;
  }
  return typeof ops.preference.key === "string" ? ops.preference.key : undefined;
}

function readPreferenceValue(ops: Record<string, unknown> | null): string | undefined {
  if (!ops || !isObject(ops.preference)) {
    return undefined;
  }
  return typeof ops.preference.value === "string" ? ops.preference.value : undefined;
}

function readSensitivity(ops: Record<string, unknown> | null): MemorySensitivity | undefined {
  if (!ops || typeof ops.sensitivity !== "string") {
    return undefined;
  }
  if (ops.sensitivity === "secret" || ops.sensitivity === "normal") {
    return ops.sensitivity;
  }
  return undefined;
}

function normalizeSensitivity(value: unknown): MemorySensitivity {
  return value === "secret" ? "secret" : "normal";
}

function isSecretSensitivity(value: unknown): value is "secret" {
  return value === "secret";
}

function isPriority(value: unknown): value is "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFullMemoryId(value: string): boolean {
  return FULL_MEMORY_ID_REGEX.test(value);
}

function isMemoryIdPrefix(value: string): boolean {
  return MEMORY_ID_PREFIX_REGEX.test(value);
}

function resolveAuditStoredId(
  storedId: string,
  memories: Array<Record<string, unknown>>,
): { status: "matched"; id: string } | { status: "missing"; reason: string } {
  const evidenceIds = memories
    .map((memory) => (typeof memory.id === "string" ? memory.id : null))
    .filter((id): id is string => typeof id === "string");

  if (evidenceIds.includes(storedId)) {
    return { status: "matched", id: storedId };
  }

  if (!isMemoryIdPrefix(storedId)) {
    return { status: "missing", reason: "stored_id_not_recalled" };
  }

  const normalizedStoredId = storedId.toLowerCase();
  const prefixMatches = evidenceIds.filter((id) => id.toLowerCase().startsWith(normalizedStoredId));
  if (prefixMatches.length === 1) {
    return { status: "matched", id: prefixMatches[0] };
  }
  if (prefixMatches.length > 1) {
    return { status: "missing", reason: "ambiguous_stored_id_prefix" };
  }
  return { status: "missing", reason: "stored_id_not_recalled" };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeOutcomeStatus(statuses: string[]): string {
  if (statuses.length === 0) {
    return "empty";
  }
  if (statuses.every((status) => status === "created")) {
    return "created";
  }
  if (statuses.some((status) => status === "created")) {
    return "partial";
  }
  return statuses[0] ?? "unknown";
}

function buildPlanHash(actions: MemoryHygieneAction[]): string {
  const stableActions = actions
    .map((action) => ({
      id: action.id,
      strategy: action.strategy,
      action: action.action,
      memoryIds: [...action.memoryIds].sort(),
      candidateText: action.candidateText ?? null,
      candidateValue: action.candidateValue ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return createHash("sha256").update(JSON.stringify(stableActions)).digest("hex");
}

function sameStringSet(left: string[], right: string[]): boolean {
  const normalizedLeft = [...new Set(left)].sort();
  const normalizedRight = [...new Set(right)].sort();
  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}
