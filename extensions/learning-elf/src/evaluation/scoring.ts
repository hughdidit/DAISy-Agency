import type { FitnessScores } from "../models/types.js";

export const FITNESS_WEIGHTS: FitnessScores = {
  correctness: 0.25,
  securityCompliance: 0.25,
  humanUsefulness: 0.15,
  costEfficiency: 0.05,
  latencyEstimate: 0.05,
  auditQuality: 0.15,
  reversibility: 0.1,
};

export function clampScore(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(6))));
}

export function weightedFitness(scores: FitnessScores): number {
  const total =
    scores.correctness * FITNESS_WEIGHTS.correctness +
    scores.securityCompliance * FITNESS_WEIGHTS.securityCompliance +
    scores.humanUsefulness * FITNESS_WEIGHTS.humanUsefulness +
    scores.costEfficiency * FITNESS_WEIGHTS.costEfficiency +
    scores.latencyEstimate * FITNESS_WEIGHTS.latencyEstimate +
    scores.auditQuality * FITNESS_WEIGHTS.auditQuality +
    scores.reversibility * FITNESS_WEIGHTS.reversibility;
  return clampScore(total);
}
