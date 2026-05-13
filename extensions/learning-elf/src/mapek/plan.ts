import type { CandidateGenome, FitnessResult } from "../models/types.js";
import { createPrototypeGithubPrReviewStrategy } from "../generation/candidate-generator.js";
import { evolvePopulation } from "../evolution/engine.js";
import { evaluateCandidate } from "../evaluation/evaluator.js";
import type { FixturePayload } from "../generation/provider.js";

export type PlanResult = {
  candidates: CandidateGenome[];
  fitnessResults: FitnessResult[];
  selectionSummary: string;
};

export function planEvolution(params: {
  runId: string;
  fixture: FixturePayload;
  seed: number;
  generations: number;
  population: number;
}): PlanResult {
  const prototype = createPrototypeGithubPrReviewStrategy({
    seed: params.seed,
    event: params.fixture.learningEvents[0],
  });
  const initialCandidates = [prototype, ...params.fixture.candidates];
  const candidates = evolvePopulation({
    seed: params.seed,
    generations: params.generations,
    population: params.population,
    initialCandidates,
  });
  const fitnessResults = candidates.map((candidate, index) =>
    evaluateCandidate({ runId: params.runId, candidate, seed: params.seed, index }),
  );
  const eligibleCount = fitnessResults.filter((result) => result.promotionEligible).length;
  return {
    candidates,
    fitnessResults,
    selectionSummary: `${eligibleCount} of ${fitnessResults.length} candidates passed security and fitness gates.`,
  };
}
