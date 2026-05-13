import type { CandidateGenome, LearningEvent } from "../models/types.js";
import { isoFromSeed, stableId } from "../models/ids.js";

export function createPrototypeGithubPrReviewStrategy(params: {
  seed: number;
  event?: LearningEvent;
}): CandidateGenome {
  const createdAt = isoFromSeed(params.seed);
  const content = {
    genomeType: "agent_strategy",
    taskClass: "github_pr_review_strategy",
    eventId: params.event?.id,
    seed: params.seed,
  };
  const id = stableId("elf_candidate", content);
  return {
    id,
    genomeType: "agent_strategy",
    taskClass: "github_pr_review_strategy",
    strategy: {
      toolOrder: ["read_pr_diff", "read_ci_logs", "search_repo_docs", "draft_findings"],
      memoryRecipe: ["repo_conventions", "recent_ci_failures", "deployment_security_policy"],
      reviewFocus: ["ci_regression", "security", "deployment", "least_privilege"],
      maxFindings: 6,
      approvalMode: "before_write",
      outputFormat: "actionable_review",
    },
    constraints: {
      noDirectWrite: true,
      noPolicyChange: true,
      noSecretStorage: true,
      requiresPromotion: true,
    },
    lineage: {
      seed: params.seed,
      generation: 0,
      parentIds: [],
      mutation: "prototype",
    },
    createdAt,
    idempotencyKey: `candidate:${id}`,
  };
}
