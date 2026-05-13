import type { CandidateGenome, LearningEvent, RiskFinding } from "../models/types.js";
import { detectForbiddenMutations } from "../security/forbidden-mutations.js";
import { scanForSecrets } from "../security/secret-scanner.js";

export type AnalyzeResult = {
  riskFindings: RiskFinding[];
  classifications: string[];
};

export function analyzeLearningInputs(params: {
  events: LearningEvent[];
  candidates: CandidateGenome[];
  validationFailures: Array<{ errors: string[] }>;
}): AnalyzeResult {
  const riskFindings: RiskFinding[] = [];
  for (const candidate of params.candidates) {
    for (const reason of detectForbiddenMutations(candidate)) {
      riskFindings.push({
        code: reason,
        severity: "high",
        message: `Candidate ${candidate.id} triggered ${reason}`,
      });
    }
    for (const secret of scanForSecrets(candidate)) {
      riskFindings.push({
        code: "secret_exposure",
        severity: "critical",
        message: secret.message,
      });
    }
  }
  for (const failure of params.validationFailures) {
    riskFindings.push({
      code: "validation_failure",
      severity: "medium",
      message: failure.errors.join("; "),
    });
  }
  const classifications = [...new Set(params.events.map((event) => event.taskClass))];
  if (classifications.length === 0) {
    classifications.push("github_pr_review_strategy");
  }
  return { riskFindings, classifications };
}
