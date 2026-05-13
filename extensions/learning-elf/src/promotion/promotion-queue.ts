import { isoFromSeed, stableId } from "../models/ids.js";
import type {
  CandidateGenome,
  FitnessResult,
  PromotionCandidate,
  PromotionState,
} from "../models/types.js";
import { assertElfMaySetState, assertPromotionTransition } from "./lifecycle.js";

export function createPromotionCandidate(params: {
  runId: string;
  candidate: CandidateGenome;
  fitnessResult: FitnessResult;
  seed: number;
  index: number;
}): PromotionCandidate {
  if (params.fitnessResult.candidateId !== params.candidate.id) {
    throw new Error(
      `Fitness result ${params.fitnessResult.id} does not belong to candidate ${params.candidate.id}`,
    );
  }
  let state: PromotionState = "draft";
  assertPromotionTransition(state, "candidate");
  state = "candidate";
  assertPromotionTransition(state, "evaluated");
  const evaluated = "evaluated" as const;
  assertPromotionTransition(evaluated, "promotion_queued");
  assertElfMaySetState("promotion_queued");
  const id = stableId("elf_promotion", {
    runId: params.runId,
    candidateId: params.candidate.id,
    fitnessResultId: params.fitnessResult.id,
  });
  const createdAt = isoFromSeed(params.seed, 20_000 + params.index);
  return {
    id,
    runId: params.runId,
    candidateId: params.candidate.id,
    fitnessResultId: params.fitnessResult.id,
    state: "promotion_queued",
    title: "GitHub PR review strategy candidate",
    rationale: `Candidate scored ${params.fitnessResult.weightedScore} with security gate pass.`,
    queuedAt: createdAt,
    createdAt,
    idempotencyKey: `promotion:${id}`,
  };
}
