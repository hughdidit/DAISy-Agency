import type { CandidateGenome, FitnessResult, PromotionCandidate } from "../models/types.js";
import { createPromotionCandidate } from "../promotion/promotion-queue.js";
import { selectPromotionEligible } from "../evolution/selection.js";

export type ExecuteResult = {
  promotions: PromotionCandidate[];
  exportedArtifacts: string[];
  directCanonicalWrites: false;
};

export function executePromotionQueue(params: {
  runId: string;
  candidates: CandidateGenome[];
  fitnessResults: FitnessResult[];
  seed: number;
}): ExecuteResult {
  const selected = selectPromotionEligible({
    candidates: params.candidates,
    fitnessResults: params.fitnessResults,
    limit: 3,
  });
  const resultByCandidate = new Map(params.fitnessResults.map((result) => [result.candidateId, result]));
  const promotions = selected.map((candidate, index) => {
    const fitnessResult = resultByCandidate.get(candidate.id);
    if (!fitnessResult) {
      throw new Error(`Missing fitness result for candidate ${candidate.id}`);
    }
    return createPromotionCandidate({
      runId: params.runId,
      candidate,
      fitnessResult,
      seed: params.seed,
      index,
    });
  });
  return {
    promotions,
    exportedArtifacts: [],
    directCanonicalWrites: false,
  };
}
