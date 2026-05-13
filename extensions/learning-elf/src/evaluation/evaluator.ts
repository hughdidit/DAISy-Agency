import type { CandidateGenome, FitnessResult, FitnessScores } from "../models/types.js";
import { isoFromSeed, stableId } from "../models/ids.js";
import { evaluateSecurityGate } from "./security-gates.js";
import { clampScore, weightedFitness } from "./scoring.js";

export function evaluateCandidate(params: {
  runId: string;
  candidate: CandidateGenome;
  seed: number;
  index: number;
}): FitnessResult {
  const gate = evaluateSecurityGate(params.candidate);
  const strategy = params.candidate.strategy;
  const toolCoverage = new Set(strategy.toolOrder).size / 6;
  const focusCoverage = new Set(strategy.reviewFocus).size / 6;
  const memoryCoverage = new Set(strategy.memoryRecipe).size / 5;
  const scores: FitnessScores = {
    correctness: clampScore(0.55 + Math.min(toolCoverage, 0.35)),
    securityCompliance: gate.securityCompliance,
    humanUsefulness: clampScore(0.45 + Math.min(focusCoverage, 0.4)),
    costEfficiency: clampScore(strategy.toolOrder.length <= 5 ? 0.9 : 0.7),
    latencyEstimate: clampScore(strategy.toolOrder.length <= 5 ? 0.85 : 0.65),
    auditQuality: clampScore(0.5 + Math.min(memoryCoverage, 0.4)),
    reversibility: params.candidate.constraints.requiresPromotion ? 1 : 0,
  };
  const disqualified = scores.securityCompliance < 1 || gate.disqualificationReasons.length > 0;
  const weightedScore = weightedFitness(scores);
  const id = stableId("elf_fitness", {
    runId: params.runId,
    candidateId: params.candidate.id,
    scores,
    disqualified,
  });
  return {
    id,
    runId: params.runId,
    candidateId: params.candidate.id,
    scores,
    weightedScore,
    disqualified,
    promotionEligible: !disqualified && weightedScore >= 0.6,
    disqualificationReasons: gate.disqualificationReasons,
    createdAt: isoFromSeed(params.seed, 10_000 + params.index),
    idempotencyKey: `fitness:${id}`,
  };
}
