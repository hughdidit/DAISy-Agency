import { createHash } from "node:crypto";
import type { MemoryCategory } from "./config.js";
import {
  DEFAULT_MEMORY_AUTONOMY_POLICY,
  MEMORY_AUTONOMY_BACKFILL_VERSION,
  type AgentUsefulnessMetadata,
  type MemoryAutonomyBackfillOptions,
  type MemoryAutonomyExplainResult,
  type MemoryAutonomyMutationSummary,
  type MemoryAutonomyPolicy,
  type MemoryCompactionMetadata,
  type MemoryDedupeMetadata,
  type MemoryOpsAutonomyMetadata,
  type MemoryUsefulnessMetadata,
  type MemoryUsefulnessScore,
  type RankedMemorySearchResult,
} from "./memory-autonomy-types.js";
import type { MemoryOpsMetadata } from "./memory-ops-types.js";
import type {
  MemoryEntry,
  MemoryEventInput,
  MemorySearchResult,
  MemoryStoreInput,
} from "./mongodb-provider.js";

type Logger = {
  warn?: (message: string) => void;
};

type MemoryAutonomyDb = {
  listByScope(
    scopeSubject: string,
    limit?: number,
    options?: { includeSecrets?: boolean },
  ): Promise<MemoryEntry[]>;
  getById(id: string): Promise<MemoryEntry | null>;
  store?(entry: MemoryStoreInput): Promise<MemoryEntry>;
  patchMemoryOpsMetadata?(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<{ matchedCount: number; modifiedCount: number }>;
  recordEvent(input: MemoryEventInput): Promise<unknown>;
};

type ScoreOptions = {
  now?: number;
  agentId?: string;
};

const DEFAULT_AUTONOMY_LIMIT = 100;
const MAX_AUTONOMY_LIMIT = 500;
const LOW_PRECEDENCE_COMPACTION_THRESHOLD = 0.38;
const STALE_MS = 1000 * 60 * 60 * 24 * 90;

export class MemoryAutonomyService {
  readonly policy: MemoryAutonomyPolicy;

  constructor(
    private readonly db: MemoryAutonomyDb,
    policy?: Partial<MemoryAutonomyPolicy>,
    private readonly logger?: Logger,
  ) {
    this.policy = {
      ...DEFAULT_MEMORY_AUTONOMY_POLICY,
      ...(policy ?? {}),
    };
  }

  status(): { policy: MemoryAutonomyPolicy; backfillVersion: string } {
    return {
      policy: this.policy,
      backfillVersion: MEMORY_AUTONOMY_BACKFILL_VERSION,
    };
  }

  async backfillScores(
    options: MemoryAutonomyBackfillOptions,
  ): Promise<MemoryAutonomyMutationSummary> {
    const result = createMutationSummary(options);
    const entries = await this.loadScopedEntries(options);
    const now = Date.now();
    const agentId = options.agentId ?? agentIdFromScopeSubject(options.scopeSubject);

    for (const entry of entries) {
      result.scanned += 1;
      const ops = readOps(entry);
      const existing = readAutonomyMetadata(ops).usefulness;
      if (existing?.backfillVersion === MEMORY_AUTONOMY_BACKFILL_VERSION) {
        result.skipped += 1;
        continue;
      }
      if (isSecret(entry, ops)) {
        result.skipped += 1;
        continue;
      }

      const score = scoreMemoryUsefulness(entry, { now, agentId });
      const usefulness: MemoryUsefulnessMetadata = {
        globalPrecedence: score.finalPrecedence,
        finalScore: score.finalPrecedence,
        components: score,
        backfillVersion: MEMORY_AUTONOMY_BACKFILL_VERSION,
        backfilledAt: now,
      };
      const agentUsefulness = agentId
        ? {
            [agentId]: createAgentUsefulness(score, now),
          }
        : undefined;
      result.planned += 1;
      pushSample(result.sampleIds, entry.id);

      if (options.dryRun) {
        continue;
      }

      const patch: Record<string, unknown> = {
        usefulness,
      };
      if (agentUsefulness) {
        patch.agentUsefulness = {
          ...readAutonomyMetadata(ops).agentUsefulness,
          ...agentUsefulness,
        };
      }
      await this.patchOps(entry.id, patch, result);
    }

    if (!options.dryRun) {
      await this.recordEvent({
        scopeSubject: options.scopeSubject,
        actor: "memory_autonomy",
        operation: "memory_usefulness_backfilled",
        status: result.errors.length > 0 ? "partial" : "applied",
        memoryIds: result.sampleIds,
        summary: `Backfilled usefulness metadata for ${result.updated} memory record(s).`,
        details: {
          backfillVersion: MEMORY_AUTONOMY_BACKFILL_VERSION,
          scanned: result.scanned,
          planned: result.planned,
          updated: result.updated,
          skipped: result.skipped,
          dryRun: result.dryRun,
        },
      });
    }

    return result;
  }

  async score(options: {
    dryRun: boolean;
    scopeSubject: string;
    agentId?: string;
    limit?: number;
  }): Promise<MemoryAutonomyMutationSummary> {
    const result = createMutationSummary(options);
    const entries = await this.loadScopedEntries(options);
    const now = Date.now();
    const promotedIds: string[] = [];
    const demotedIds: string[] = [];

    for (const entry of entries) {
      result.scanned += 1;
      const ops = readOps(entry);
      if (isSecret(entry, ops)) {
        result.skipped += 1;
        continue;
      }
      const score = scoreMemoryUsefulness(entry, { now, agentId: options.agentId });
      const previousPrecedence = currentPrecedence(entry);
      const patch: Record<string, unknown> = {
        usefulness: {
          globalPrecedence: score.finalPrecedence,
          finalScore: score.finalPrecedence,
          components: score,
          scoredAt: now,
        },
      };
      if (options.agentId) {
        patch.agentUsefulness = {
          ...readAutonomyMetadata(ops).agentUsefulness,
          [options.agentId]: createAgentUsefulness(score, now),
        };
      }
      result.planned += 1;
      pushSample(result.sampleIds, entry.id);
      if (score.finalPrecedence > previousPrecedence) {
        pushSample(promotedIds, entry.id);
      }
      if (score.finalPrecedence < previousPrecedence) {
        pushSample(demotedIds, entry.id);
      }
      if (!options.dryRun) {
        await this.patchOps(entry.id, patch, result);
      }
    }

    if (!options.dryRun) {
      await this.recordEvent({
        scopeSubject: options.scopeSubject,
        actor: "memory_autonomy",
        operation: options.agentId ? "memory_agent_usefulness_scored" : "memory_usefulness_scored",
        status: result.errors.length > 0 ? "partial" : "applied",
        memoryIds: result.sampleIds,
        summary: `Scored usefulness metadata for ${result.updated} memory record(s).`,
        details: { agentId: options.agentId, scanned: result.scanned, updated: result.updated },
      });
      if (promotedIds.length > 0) {
        await this.recordEvent({
          scopeSubject: options.scopeSubject,
          actor: "memory_autonomy",
          operation: "memory_precedence_promoted",
          status: "applied",
          memoryIds: promotedIds,
          summary: `Promoted recall precedence for ${promotedIds.length} memory record(s).`,
          details: { agentId: options.agentId },
        });
      }
      if (demotedIds.length > 0) {
        await this.recordEvent({
          scopeSubject: options.scopeSubject,
          actor: "memory_autonomy",
          operation: "memory_precedence_demoted",
          status: "applied",
          memoryIds: demotedIds,
          summary: `Demoted recall precedence for ${demotedIds.length} memory record(s).`,
          details: { agentId: options.agentId },
        });
      }
    }

    return result;
  }

  async explain(memoryId: string, agentId?: string): Promise<MemoryAutonomyExplainResult> {
    const entry = await this.db.getById(memoryId);
    if (!entry) {
      throw new Error(`Memory not found: ${memoryId}`);
    }
    const ops = readOps(entry);
    const autonomy = readAutonomyMetadata(ops);
    return {
      memoryId,
      scopeSubject: readString(ops?.scopeSubject) ?? entry.scopeSubject,
      usefulness: autonomy.usefulness,
      agentUsefulness: agentId ? autonomy.agentUsefulness?.[agentId] : undefined,
      dedupe: autonomy.dedupe,
      compaction: autonomy.compaction,
    };
  }

  async dedupe(options: {
    dryRun: boolean;
    scopeSubject: string;
    limit?: number;
  }): Promise<MemoryAutonomyMutationSummary> {
    const result = createMutationSummary(options);
    const entries = (await this.loadScopedEntries(options)).filter((entry) => {
      const ops = readOps(entry);
      return !isSecret(entry, ops);
    });
    result.scanned = entries.length;
    const buckets = new Map<string, MemoryEntry[]>();
    for (const entry of entries) {
      const key = dedupeKey(entry);
      buckets.set(key, [...(buckets.get(key) ?? []), entry]);
    }

    for (const bucket of buckets.values()) {
      if (bucket.length < 2) {
        continue;
      }
      const retained = bucket
        .slice()
        .sort(
          (a, b) => currentPrecedence(b) - currentPrecedence(a) || b.updatedAt - a.updatedAt,
        )[0];
      if (!retained) {
        continue;
      }
      for (const duplicate of bucket) {
        if (duplicate.id === retained.id) {
          continue;
        }
        const dedupe: MemoryDedupeMetadata = {
          duplicateOf: retained.id,
          retainedMemoryId: retained.id,
          reason: "exact_content_hash",
          appliedAt: Date.now(),
        };
        const score = scoreMemoryUsefulness(duplicate, { now: Date.now() });
        score.dedupePenalty = 1;
        score.finalPrecedence = clamp(score.finalPrecedence * 0.25);
        result.planned += 1;
        pushSample(result.sampleIds, duplicate.id);
        if (!options.dryRun) {
          await this.patchOps(
            duplicate.id,
            {
              dedupe,
              usefulness: {
                globalPrecedence: score.finalPrecedence,
                finalScore: score.finalPrecedence,
                components: score,
                scoredAt: Date.now(),
              },
            },
            result,
          );
        }
      }
    }

    if (!options.dryRun) {
      await this.recordEvent({
        scopeSubject: options.scopeSubject,
        actor: "memory_autonomy",
        operation: "memory_dedupe_applied",
        status: result.errors.length > 0 ? "partial" : "applied",
        memoryIds: result.sampleIds,
        summary: `Applied dedupe metadata to ${result.updated} memory record(s).`,
        details: { scanned: result.scanned, planned: result.planned, updated: result.updated },
      });
    }

    return result;
  }

  async compact(options: {
    dryRun: boolean;
    scopeSubject: string;
    limit?: number;
  }): Promise<MemoryAutonomyMutationSummary & { summaryMemoryId?: string }> {
    const result = createMutationSummary(options) as MemoryAutonomyMutationSummary & {
      summaryMemoryId?: string;
    };
    const entries = (await this.loadScopedEntries(options)).filter((entry) => {
      const ops = readOps(entry);
      return !isSecret(entry, ops) && isLowValueOrStale(entry, ops);
    });
    result.scanned = entries.length;
    if (entries.length < 2) {
      result.skipped = entries.length;
      return result;
    }

    const selected = entries.slice(0, Math.min(entries.length, 12));
    result.planned = selected.length;
    for (const entry of selected) {
      pushSample(result.sampleIds, entry.id);
    }
    if (options.dryRun) {
      return result;
    }
    if (!this.db.store) {
      result.errors.push("store capability unavailable for compaction summary creation");
      return result;
    }

    const now = Date.now();
    const summary = selected.map((entry) => `- ${entry.text.slice(0, 240)}`).join("\n");
    const sourceMemoryIds = selected.map((entry) => entry.id);
    const stored = await this.db.store({
      text: `Compacted memory summary for ${options.scopeSubject}:\n${summary}`,
      parts: [{ text: `Compacted memory summary for ${options.scopeSubject}:\n${summary}` }],
      importance: 0.45,
      category: "other" satisfies MemoryCategory,
      type: "semantic",
      metadata: {
        source: "memory_autonomy",
        ops: {
          kind: "fact",
          source: "memory_autonomy",
          scopeSubject: options.scopeSubject,
          sensitivity: "normal",
          confidence: 0.8,
          status: "compacted_summary",
          compaction: {
            status: "summary",
            sourceMemoryIds,
            compactedAt: now,
            scoreHistory: selected.map((entry) => ({
              memoryId: entry.id,
              finalPrecedence: currentPrecedence(entry),
            })),
          } satisfies MemoryCompactionMetadata,
        } satisfies MemoryOpsMetadata & MemoryOpsAutonomyMetadata,
      },
      tags: ["memory-autonomy", "compacted-summary"],
    });
    result.summaryMemoryId = stored.id;

    for (const entry of selected) {
      await this.patchOps(
        entry.id,
        {
          compaction: {
            status: "source",
            compactedInto: stored.id,
            supersededBy: stored.id,
            compactedAt: now,
          } satisfies MemoryCompactionMetadata,
        },
        result,
      );
    }

    await this.recordEvent({
      scopeSubject: options.scopeSubject,
      actor: "memory_autonomy",
      operation: "memory_compaction_applied",
      status: result.errors.length > 0 ? "partial" : "applied",
      memoryIds: [stored.id, ...sourceMemoryIds],
      summary: `Compacted ${sourceMemoryIds.length} memory record(s) into ${stored.id}.`,
      details: { summaryMemoryId: stored.id, sourceMemoryIds },
    });

    return result;
  }

  private async loadScopedEntries(options: {
    scopeSubject: string;
    limit?: number;
    resumeAfter?: string;
  }): Promise<MemoryEntry[]> {
    const limit = clampInt(options.limit ?? DEFAULT_AUTONOMY_LIMIT, 1, MAX_AUTONOMY_LIMIT);
    const entries = await this.db.listByScope(options.scopeSubject, limit, {
      includeSecrets: true,
    });
    if (!options.resumeAfter) {
      return entries;
    }
    return entries.filter((entry) => entry.id > options.resumeAfter!);
  }

  private async patchOps(
    id: string,
    patch: Record<string, unknown>,
    result: MemoryAutonomyMutationSummary,
  ): Promise<void> {
    if (!this.db.patchMemoryOpsMetadata) {
      result.errors.push("patchMemoryOpsMetadata capability unavailable");
      return;
    }
    try {
      const update = await this.db.patchMemoryOpsMetadata(id, patch);
      if (update.modifiedCount > 0) {
        result.updated += update.modifiedCount;
      } else {
        result.skipped += 1;
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  private async recordEvent(input: MemoryEventInput): Promise<void> {
    try {
      await this.db.recordEvent(input);
    } catch (error) {
      this.logger?.warn?.(
        `memory-autonomy: failed to record ${input.operation}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

export function scoreMemoryUsefulness(
  entry: MemoryEntry,
  options: ScoreOptions = {},
): MemoryUsefulnessScore {
  const now = options.now ?? Date.now();
  const ops = readOps(entry);
  const ageMs = Math.max(0, now - entry.updatedAt);
  const observationCount = readNumber(ops?.observationCount) ?? 1;
  const confidence = readNumber(ops?.confidence) ?? confidenceFromEntry(entry);
  const freshness = clamp(1 - ageMs / (1000 * 60 * 60 * 24 * 180));
  const stability = clamp(readNumber(ops?.stabilityScore) ?? Math.min(1, observationCount / 4));
  const retrievalUse = clamp(Math.min(1, observationCount / 6));
  const taskOutcome = outcomeScore(readString(ops?.status));
  const securityPenalty = isSecret(entry, ops) ? 1 : 0;
  const dedupePenalty = readAutonomyMetadata(ops).dedupe?.duplicateOf ? 0.7 : 0;
  const stalenessPenalty = ageMs > STALE_MS ? Math.min(0.6, ageMs / (STALE_MS * 4)) : 0;
  const correctionPenalty = readString(ops?.status) === "corrected" ? 0.5 : 0;

  const positive =
    retrievalUse * 0.16 +
    taskOutcome * 0.18 +
    freshness * 0.14 +
    confidence * 0.2 +
    stability * 0.18 +
    clamp(entry.importance) * 0.14;
  const penalty = correctionPenalty + securityPenalty + dedupePenalty + stalenessPenalty;
  const finalPrecedence = clamp(positive - penalty * 0.25);

  return {
    retrievalUse,
    taskOutcome,
    freshness,
    confidence,
    stability,
    correctionPenalty,
    securityPenalty,
    dedupePenalty,
    stalenessPenalty,
    finalPrecedence,
  };
}

export function rankMemorySearchResults(
  results: MemorySearchResult[],
  agentId?: string,
): RankedMemorySearchResult[] {
  return results
    .map((result) => {
      const ops = readOps(result.entry);
      const autonomy = readAutonomyMetadata(ops);
      const globalPrecedence =
        autonomy.usefulness?.globalPrecedence ?? conservativeDefaultPrecedence(result.entry);
      const agentPrecedence =
        agentId && autonomy.agentUsefulness?.[agentId]
          ? autonomy.agentUsefulness[agentId].precedence
          : conservativeDefaultPrecedence(result.entry);
      const combinedScore = clamp(
        result.vectorScore * 0.72 + globalPrecedence * 0.18 + agentPrecedence * 0.1,
      );
      return {
        ...result,
        score: combinedScore,
        vectorScore: result.vectorScore,
        globalPrecedence,
        agentPrecedence,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function createMutationSummary(options: {
  dryRun: boolean;
  scopeSubject: string;
}): MemoryAutonomyMutationSummary {
  return {
    dryRun: options.dryRun,
    scopeSubject: options.scopeSubject,
    scanned: 0,
    planned: 0,
    updated: 0,
    skipped: 0,
    sampleIds: [],
    errors: [],
  };
}

function createAgentUsefulness(
  components: MemoryUsefulnessScore,
  now: number,
): AgentUsefulnessMetadata {
  return {
    precedence: components.finalPrecedence,
    components,
    lastRecalledAt: now,
    recallCount: Math.max(1, Math.round(components.retrievalUse * 6)),
    positiveOutcomeCount: components.taskOutcome > 0.6 ? 1 : 0,
    correctionCount: components.correctionPenalty > 0 ? 1 : 0,
  };
}

function readOps(entry: MemoryEntry): (Record<string, unknown> & MemoryOpsAutonomyMetadata) | null {
  const metadata = entry.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const ops = metadata.ops;
  if (!ops || typeof ops !== "object" || Array.isArray(ops)) {
    return null;
  }
  return ops as Record<string, unknown> & MemoryOpsAutonomyMetadata;
}

function readAutonomyMetadata(ops: Record<string, unknown> | null): MemoryOpsAutonomyMetadata {
  if (!ops) {
    return {};
  }
  return ops as MemoryOpsAutonomyMetadata;
}

function currentPrecedence(entry: MemoryEntry): number {
  return (
    readAutonomyMetadata(readOps(entry)).usefulness?.globalPrecedence ??
    conservativeDefaultPrecedence(entry)
  );
}

function conservativeDefaultPrecedence(entry: MemoryEntry): number {
  return clamp(entry.importance * 0.55 + confidenceFromEntry(entry) * 0.25 + 0.1);
}

function confidenceFromEntry(entry: MemoryEntry): number {
  const ops = readOps(entry);
  return readNumber(ops?.confidence) ?? 0.55;
}

function isSecret(entry: MemoryEntry, ops: Record<string, unknown> | null): boolean {
  return entry.sensitivity === "secret" || ops?.sensitivity === "secret";
}

function isLowValueOrStale(entry: MemoryEntry, ops: Record<string, unknown> | null): boolean {
  const autonomy = readAutonomyMetadata(ops);
  if (autonomy.compaction?.status === "source" || autonomy.dedupe?.duplicateOf) {
    return false;
  }
  return (
    currentPrecedence(entry) < LOW_PRECEDENCE_COMPACTION_THRESHOLD ||
    Date.now() - entry.updatedAt > STALE_MS
  );
}

function dedupeKey(entry: MemoryEntry): string {
  const ops = readOps(entry);
  const hash = readString(ops?.contentHash);
  if (hash) {
    return `hash:${hash}`;
  }
  return `text:${createHash("sha256").update(normalizeText(entry.text)).digest("hex")}`;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function outcomeScore(status: string | undefined): number {
  if (status === "truth" || status === "promoted" || status === "resolved") {
    return 1;
  }
  if (status === "corrected" || status === "cancelled") {
    return 0.2;
  }
  if (status === "duplicate" || status === "compacted") {
    return 0.35;
  }
  return 0.65;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value) : undefined;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function pushSample(samples: string[], id: string): void {
  if (samples.length < 10 && !samples.includes(id)) {
    samples.push(id);
  }
}

function agentIdFromScopeSubject(scopeSubject: string): string | undefined {
  const [kind, value] = scopeSubject.split(":", 2);
  if ((kind === "agent" || kind === "subagent") && value) {
    return value;
  }
  return undefined;
}
