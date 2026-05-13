import type { CandidateGenome } from "../models/types.js";
import { scanForSecrets } from "./secret-scanner.js";

const TOOL_REASON_MAP = new Map<string, string>([
  ["write_production_config", "production_write_attempt"],
  ["modify_github_workflow", "deployment_workflow_direct_write"],
  ["grant_tool_permission", "tool_permission_escalation"],
  ["write_canonical_doc", "canonical_doc_direct_write"],
  ["override_security_policy", "security_policy_override"],
  ["mutate_system_prompt", "system_prompt_direct_write"],
  ["write_memory_unscoped", "unscoped_memory_write"],
]);

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function detectForbiddenMutations(genome: CandidateGenome): string[] {
  const reasons: string[] = [];
  if (genome.strategy.approvalMode === "never") {
    reasons.push("approval_bypass_attempt");
  }
  if (!genome.constraints.noDirectWrite) {
    reasons.push("production_write_attempt");
  }
  if (!genome.constraints.noPolicyChange) {
    reasons.push("security_policy_override");
  }
  if (!genome.constraints.noSecretStorage) {
    reasons.push("secret_exposure");
  }
  if (!genome.constraints.requiresPromotion) {
    reasons.push("approval_bypass_attempt");
  }
  for (const tool of genome.strategy.toolOrder) {
    const reason = TOOL_REASON_MAP.get(tool);
    if (reason) {
      reasons.push(reason);
    }
  }
  if (genome.strategy.memoryRecipe.includes("unscoped_memory_write")) {
    reasons.push("unscoped_memory_write");
  }
  if (scanForSecrets(genome).length > 0) {
    reasons.push("secret_exposure");
  }
  return unique(reasons);
}

export function assertMutationAllowed(genome: CandidateGenome): void {
  const reasons = detectForbiddenMutations(genome);
  if (reasons.length > 0) {
    throw new Error(`Forbidden ELF mutation rejected: ${reasons.join(", ")}`);
  }
}
