import type {
  EvolutionRun,
  FitnessResult,
  LearningEvent,
  MapeKTrace,
  PromotionCandidate,
  RiskFinding,
  SourceRef,
} from "../models/types.js";
import { isoFromSeed, stableId } from "../models/ids.js";
import type { StoreBackend } from "../models/types.js";

export function createMapeKTrace(params: {
  run: EvolutionRun;
  events: LearningEvent[];
  sourceRefs: SourceRef[];
  riskFindings: RiskFinding[];
  classifications: string[];
  fitnessResults: FitnessResult[];
  promotions: PromotionCandidate[];
  selectionSummary: string;
  exportedArtifacts: string[];
  storeBackend: StoreBackend;
  seed: number;
}): MapeKTrace {
  const id = stableId("elf_trace", {
    runId: params.run.id,
    candidateIds: params.run.candidateIds,
    promotionIds: params.promotions.map((promotion) => promotion.id),
  });
  return {
    id,
    runId: params.run.id,
    monitor: {
      learningEventIds: params.events.map((event) => event.id),
      sourceRefs: params.sourceRefs,
    },
    analyze: {
      riskFindings: params.riskFindings,
      classifications: params.classifications,
    },
    plan: {
      candidateIds: params.run.candidateIds,
      generationCount: params.run.generations,
      selectionSummary: params.selectionSummary,
    },
    execute: {
      promotionIds: params.promotions.map((promotion) => promotion.id),
      exportedArtifacts: params.exportedArtifacts,
      directCanonicalWrites: false,
    },
    knowledge: {
      storedRecordIds: [],
      storeBackend: params.storeBackend,
    },
    createdAt: isoFromSeed(params.seed, 30_000),
  };
}
