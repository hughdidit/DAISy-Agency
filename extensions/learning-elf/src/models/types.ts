export type StoreBackend = "jsonl" | "mcp";

export type TaskClass = "github_pr_review_strategy";
export type GenomeType = "agent_strategy";

export type PromotionState =
  | "draft"
  | "candidate"
  | "evaluated"
  | "disqualified"
  | "promotion_queued"
  | "approved"
  | "rejected"
  | "canonized";

export type SourceRef = {
  type: "fixture" | "repo" | "trace" | "promotion";
  ref: string;
};

export type RiskFinding = {
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
};

export type LearningEvent = {
  id: string;
  eventType: "github_pr_review_feedback" | "ci_failure" | "runbook_gap" | "documentation_gap";
  taskClass: TaskClass;
  summary: string;
  sourceRefs: SourceRef[];
  signals: string[];
  createdAt: string;
  idempotencyKey: string;
};

export type CandidateGenome = {
  id: string;
  genomeType: GenomeType;
  taskClass: TaskClass;
  strategy: {
    toolOrder: string[];
    memoryRecipe: string[];
    reviewFocus: string[];
    maxFindings: number;
    approvalMode: "before_write" | "always" | "never";
    outputFormat: "actionable_review" | "summary" | "raw_notes";
  };
  constraints: {
    noDirectWrite: boolean;
    noPolicyChange: boolean;
    noSecretStorage: boolean;
    requiresPromotion: boolean;
  };
  lineage: {
    seed: number;
    generation: number;
    parentIds: string[];
    mutation: string;
  };
  createdAt: string;
  idempotencyKey: string;
};

export type FitnessScores = {
  correctness: number;
  securityCompliance: number;
  humanUsefulness: number;
  costEfficiency: number;
  latencyEstimate: number;
  auditQuality: number;
  reversibility: number;
};

export type FitnessResult = {
  id: string;
  runId: string;
  candidateId: string;
  scores: FitnessScores;
  weightedScore: number;
  disqualified: boolean;
  promotionEligible: boolean;
  disqualificationReasons: string[];
  createdAt: string;
  idempotencyKey: string;
};

export type EvolutionRun = {
  id: string;
  taskClass: TaskClass;
  fixturePath: string;
  seed: number;
  generations: number;
  population: number;
  candidateIds: string[];
  fitnessResultIds: string[];
  promotionIds: string[];
  disqualifiedCount: number;
  createdAt: string;
  idempotencyKey: string;
};

export type PromotionCandidate = {
  id: string;
  runId: string;
  candidateId: string;
  fitnessResultId: string;
  state: PromotionState;
  title: string;
  rationale: string;
  queuedAt?: string;
  approvedBy?: string;
  rejectedBy?: string;
  createdAt: string;
  idempotencyKey: string;
};

export type NegativeTestCandidate = {
  id: string;
  runId: string;
  candidateId: string;
  reason: string;
  expectedOutcome: "disqualified" | "validation_failure";
  createdAt: string;
  idempotencyKey: string;
};

export type MapeKTrace = {
  id: string;
  runId: string;
  monitor: {
    learningEventIds: string[];
    sourceRefs: SourceRef[];
  };
  analyze: {
    riskFindings: RiskFinding[];
    classifications: string[];
  };
  plan: {
    candidateIds: string[];
    generationCount: number;
    selectionSummary: string;
  };
  execute: {
    promotionIds: string[];
    exportedArtifacts: string[];
    directCanonicalWrites: false;
  };
  knowledge: {
    storedRecordIds: string[];
    storeBackend: StoreBackend;
  };
  createdAt: string;
};

export type EvolutionSummary = {
  runId: string;
  traceId: string;
  candidateIds: string[];
  promotionIds: string[];
  disqualifiedCount: number;
  storeBackend: StoreBackend;
  tracePath?: string;
};
