import type { CandidateGenome, FitnessResult } from "../models/types.js";

export function selectPromotionEligible(params: {
  candidates: CandidateGenome[];
  fitnessResults: FitnessResult[];
  limit: number;
}): CandidateGenome[] {
  const resultByCandidate = new Map(params.fitnessResults.map((result) => [result.candidateId, result]));
  return [...params.candidates]
    .filter((candidate) => resultByCandidate.get(candidate.id)?.promotionEligible)
    .sort((left, right) => {
      const leftScore = resultByCandidate.get(left.id)?.weightedScore ?? 0;
      const rightScore = resultByCandidate.get(right.id)?.weightedScore ?? 0;
      return rightScore - leftScore || left.id.localeCompare(right.id);
    })
    .slice(0, params.limit);
}
