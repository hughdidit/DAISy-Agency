import type { CandidateGenome } from "../models/types.js";
import { isoFromSeed, stableId } from "../models/ids.js";
import { assertMutationAllowed } from "../security/forbidden-mutations.js";
import type { SeededRng } from "./rng.js";

const TOOL_CHOICES = [
  "read_pr_diff",
  "read_ci_logs",
  "search_repo_docs",
  "inspect_review_threads",
  "draft_findings",
] as const;

const MEMORY_CHOICES = [
  "repo_conventions",
  "recent_ci_failures",
  "deployment_security_policy",
  "review_closeout_rules",
] as const;

const FOCUS_CHOICES = [
  "ci_regression",
  "security",
  "deployment",
  "least_privilege",
  "documentation_impact",
] as const;

function addUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}

export function mutateGenome(params: {
  parent: CandidateGenome;
  seed: number;
  generation: number;
  index: number;
  rng: SeededRng;
}): CandidateGenome {
  const mutationKind = params.rng.pick([
    "add_tool",
    "add_memory_recipe",
    "add_review_focus",
    "adjust_max_findings",
  ]);
  const candidate: CandidateGenome = JSON.parse(JSON.stringify(params.parent));
  candidate.lineage = {
    seed: params.seed,
    generation: params.generation,
    parentIds: [params.parent.id],
    mutation: mutationKind,
  };
  candidate.createdAt = isoFromSeed(params.seed, params.generation * 100 + params.index);

  if (mutationKind === "add_tool") {
    candidate.strategy.toolOrder = addUnique(
      candidate.strategy.toolOrder,
      params.rng.pick(TOOL_CHOICES),
    );
  } else if (mutationKind === "add_memory_recipe") {
    candidate.strategy.memoryRecipe = addUnique(
      candidate.strategy.memoryRecipe,
      params.rng.pick(MEMORY_CHOICES),
    );
  } else if (mutationKind === "add_review_focus") {
    candidate.strategy.reviewFocus = addUnique(
      candidate.strategy.reviewFocus,
      params.rng.pick(FOCUS_CHOICES),
    );
  } else {
    candidate.strategy.maxFindings = Math.max(3, Math.min(8, 4 + params.rng.int(5)));
  }

  candidate.id = stableId("elf_candidate", {
    parentId: params.parent.id,
    strategy: candidate.strategy,
    generation: params.generation,
    index: params.index,
    seed: params.seed,
  });
  candidate.idempotencyKey = `candidate:${candidate.id}`;
  assertMutationAllowed(candidate);
  return candidate;
}
