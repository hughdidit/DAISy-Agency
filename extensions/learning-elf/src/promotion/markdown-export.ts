import fs from "node:fs/promises";
import path from "node:path";
import type { CandidateGenome, FitnessResult, MapeKTrace, PromotionCandidate } from "../models/types.js";

export function renderPromotionMarkdown(params: {
  promotion: PromotionCandidate;
  candidate: CandidateGenome;
  fitness: FitnessResult;
  trace: MapeKTrace | null;
}): string {
  const { promotion, candidate, fitness, trace } = params;
  return [
    `# ${promotion.title}`,
    "",
    "## Governance",
    "",
    `- Promotion ID: ${promotion.id}`,
    `- Candidate ID: ${candidate.id}`,
    `- State: ${promotion.state}`,
    "- Direct canonical writes performed: false",
    "- Human approval required before canonization.",
    "",
    "## Fitness",
    "",
    `- Weighted score: ${fitness.weightedScore}`,
    `- Promotion eligible: ${fitness.promotionEligible}`,
    `- Disqualified: ${fitness.disqualified}`,
    `- Disqualification reasons: ${fitness.disqualificationReasons.join(", ") || "none"}`,
    "",
    "## Strategy",
    "",
    `- Tool order: ${candidate.strategy.toolOrder.join(", ")}`,
    `- Memory recipe: ${candidate.strategy.memoryRecipe.join(", ")}`,
    `- Review focus: ${candidate.strategy.reviewFocus.join(", ")}`,
    `- Max findings: ${candidate.strategy.maxFindings}`,
    `- Approval mode: ${candidate.strategy.approvalMode}`,
    "",
    "## MAPE-K Trace",
    "",
    `- Trace ID: ${trace?.id ?? "not found"}`,
    `- Run ID: ${promotion.runId}`,
    "",
  ].join("\n");
}

export async function exportPromotionMarkdown(params: {
  outPath: string;
  promotion: PromotionCandidate;
  candidate: CandidateGenome;
  fitness: FitnessResult;
  trace: MapeKTrace | null;
}): Promise<string> {
  const resolved = path.resolve(params.outPath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, renderPromotionMarkdown(params), "utf8");
  return resolved;
}
