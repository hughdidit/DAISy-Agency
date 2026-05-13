import type { MemorySearchResult } from "./mongodb-provider.js";

export const MEMORY_AUTONOMY_BACKFILL_VERSION = "2026-05-phase2-v1";

export type MemoryAutonomyPolicy = {
  autoCapture: boolean;
  autoScore: boolean;
  autoDedupe: boolean;
  autoCompact: boolean;
  autoPrune: boolean;
  autoPromote: boolean;
  secretAutoCapture: boolean;
  crossScopePromotion: boolean;
};

export type MemoryUsefulnessScore = {
  retrievalUse: number;
  taskOutcome: number;
  freshness: number;
  confidence: number;
  stability: number;
  correctionPenalty: number;
  securityPenalty: number;
  dedupePenalty: number;
  stalenessPenalty: number;
  finalPrecedence: number;
};

export type AgentUsefulnessMetadata = {
  precedence: number;
  components: MemoryUsefulnessScore;
  lastRecalledAt?: number;
  recallCount: number;
  positiveOutcomeCount: number;
  correctionCount: number;
};

export type MemoryUsefulnessMetadata = {
  globalPrecedence: number;
  finalScore: number;
  components: MemoryUsefulnessScore;
  backfillVersion?: string;
  backfilledAt?: number;
  scoredAt?: number;
};

export type MemoryDedupeMetadata = {
  duplicateOf?: string;
  retainedMemoryId?: string;
  reason?: string;
  appliedAt?: number;
};

export type MemoryCompactionMetadata = {
  status?: "source" | "summary" | "candidate";
  compactedInto?: string;
  sourceMemoryIds?: string[];
  supersededBy?: string;
  compactedAt?: number;
  scoreHistory?: Array<{
    memoryId: string;
    finalPrecedence: number;
  }>;
};

export type MemoryOpsAutonomyMetadata = {
  usefulness?: MemoryUsefulnessMetadata;
  agentUsefulness?: Record<string, AgentUsefulnessMetadata>;
  dedupe?: MemoryDedupeMetadata;
  compaction?: MemoryCompactionMetadata;
};

export type MemoryAutonomyBackfillOptions = {
  dryRun: boolean;
  scopeSubject: string;
  limit?: number;
  resumeAfter?: string;
  agentId?: string;
};

export type MemoryAutonomyMutationSummary = {
  dryRun: boolean;
  scopeSubject: string;
  scanned: number;
  planned: number;
  updated: number;
  skipped: number;
  sampleIds: string[];
  errors: string[];
};

export type MemoryAutonomyExplainResult = {
  memoryId: string;
  scopeSubject?: string;
  usefulness?: MemoryUsefulnessMetadata;
  agentUsefulness?: AgentUsefulnessMetadata;
  dedupe?: MemoryDedupeMetadata;
  compaction?: MemoryCompactionMetadata;
};

export type RankedMemorySearchResult = MemorySearchResult & {
  score: number;
  vectorScore: number;
  globalPrecedence: number;
  agentPrecedence: number;
};

export const DEFAULT_MEMORY_AUTONOMY_POLICY: MemoryAutonomyPolicy = {
  autoCapture: true,
  autoScore: true,
  autoDedupe: true,
  autoCompact: true,
  autoPrune: false,
  autoPromote: true,
  secretAutoCapture: false,
  crossScopePromotion: false,
};
