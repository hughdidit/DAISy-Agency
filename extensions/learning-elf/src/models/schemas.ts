import { Type } from "@sinclair/typebox";

const SourceRefSchema = Type.Object(
  {
    type: Type.Union([
      Type.Literal("fixture"),
      Type.Literal("repo"),
      Type.Literal("trace"),
      Type.Literal("promotion"),
      Type.Literal("memory"),
    ]),
    ref: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const RiskFindingSchema = Type.Object(
  {
    code: Type.String({ minLength: 1 }),
    severity: Type.Union([
      Type.Literal("low"),
      Type.Literal("medium"),
      Type.Literal("high"),
      Type.Literal("critical"),
    ]),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const LineageSchema = Type.Object(
  {
    seed: Type.Number(),
    generation: Type.Number({ minimum: 0 }),
    parentIds: Type.Array(Type.String()),
    mutation: Type.String(),
  },
  { additionalProperties: false },
);

export const LearningEventSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    eventType: Type.Union([
      Type.Literal("github_pr_review_feedback"),
      Type.Literal("ci_failure"),
      Type.Literal("runbook_gap"),
      Type.Literal("documentation_gap"),
    ]),
    taskClass: Type.Literal("github_pr_review_strategy"),
    summary: Type.String({ minLength: 1 }),
    sourceRefs: Type.Array(SourceRefSchema),
    signals: Type.Array(Type.String()),
    createdAt: Type.String({ minLength: 1 }),
    idempotencyKey: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const CandidateGenomeSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    genomeType: Type.Literal("agent_strategy"),
    taskClass: Type.Literal("github_pr_review_strategy"),
    strategy: Type.Object(
      {
        toolOrder: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
        memoryRecipe: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
        reviewFocus: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
        maxFindings: Type.Number({ minimum: 1, maximum: 20 }),
        approvalMode: Type.Union([
          Type.Literal("before_write"),
          Type.Literal("always"),
          Type.Literal("never"),
        ]),
        outputFormat: Type.Union([
          Type.Literal("actionable_review"),
          Type.Literal("summary"),
          Type.Literal("raw_notes"),
        ]),
      },
      { additionalProperties: false },
    ),
    constraints: Type.Object(
      {
        noDirectWrite: Type.Boolean(),
        noPolicyChange: Type.Boolean(),
        noSecretStorage: Type.Boolean(),
        requiresPromotion: Type.Boolean(),
      },
      { additionalProperties: false },
    ),
    lineage: LineageSchema,
    createdAt: Type.String({ minLength: 1 }),
    idempotencyKey: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const FitnessScoresSchema = Type.Object(
  {
    correctness: Type.Number({ minimum: 0, maximum: 1 }),
    securityCompliance: Type.Number({ minimum: 0, maximum: 1 }),
    humanUsefulness: Type.Number({ minimum: 0, maximum: 1 }),
    costEfficiency: Type.Number({ minimum: 0, maximum: 1 }),
    latencyEstimate: Type.Number({ minimum: 0, maximum: 1 }),
    auditQuality: Type.Number({ minimum: 0, maximum: 1 }),
    reversibility: Type.Number({ minimum: 0, maximum: 1 }),
  },
  { additionalProperties: false },
);

export const FitnessResultSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    runId: Type.String({ minLength: 1 }),
    candidateId: Type.String({ minLength: 1 }),
    scores: FitnessScoresSchema,
    weightedScore: Type.Number({ minimum: 0, maximum: 1 }),
    disqualified: Type.Boolean(),
    promotionEligible: Type.Boolean(),
    disqualificationReasons: Type.Array(Type.String()),
    createdAt: Type.String({ minLength: 1 }),
    idempotencyKey: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const EvolutionRunSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    taskClass: Type.Literal("github_pr_review_strategy"),
    fixturePath: Type.String({ minLength: 1 }),
    seed: Type.Number(),
    generations: Type.Number({ minimum: 1 }),
    population: Type.Number({ minimum: 1 }),
    candidateIds: Type.Array(Type.String()),
    fitnessResultIds: Type.Array(Type.String()),
    promotionIds: Type.Array(Type.String()),
    disqualifiedCount: Type.Number({ minimum: 0 }),
    createdAt: Type.String({ minLength: 1 }),
    idempotencyKey: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const PromotionStateSchema = Type.Union([
  Type.Literal("draft"),
  Type.Literal("candidate"),
  Type.Literal("evaluated"),
  Type.Literal("disqualified"),
  Type.Literal("promotion_queued"),
  Type.Literal("approved"),
  Type.Literal("rejected"),
  Type.Literal("canonized"),
]);

export const PromotionCandidateSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    runId: Type.String({ minLength: 1 }),
    candidateId: Type.String({ minLength: 1 }),
    fitnessResultId: Type.String({ minLength: 1 }),
    state: PromotionStateSchema,
    title: Type.String({ minLength: 1 }),
    rationale: Type.String({ minLength: 1 }),
    queuedAt: Type.Optional(Type.String()),
    approvedBy: Type.Optional(Type.String()),
    rejectedBy: Type.Optional(Type.String()),
    createdAt: Type.String({ minLength: 1 }),
    idempotencyKey: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const NegativeTestCandidateSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    runId: Type.String({ minLength: 1 }),
    candidateId: Type.String({ minLength: 1 }),
    reason: Type.String({ minLength: 1 }),
    expectedOutcome: Type.Union([Type.Literal("disqualified"), Type.Literal("validation_failure")]),
    createdAt: Type.String({ minLength: 1 }),
    idempotencyKey: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const MapeKTraceSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    runId: Type.String({ minLength: 1 }),
    monitor: Type.Object(
      {
        learningEventIds: Type.Array(Type.String()),
        sourceRefs: Type.Array(SourceRefSchema),
      },
      { additionalProperties: false },
    ),
    analyze: Type.Object(
      {
        riskFindings: Type.Array(RiskFindingSchema),
        classifications: Type.Array(Type.String()),
      },
      { additionalProperties: false },
    ),
    plan: Type.Object(
      {
        candidateIds: Type.Array(Type.String()),
        generationCount: Type.Number({ minimum: 1 }),
        selectionSummary: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    ),
    execute: Type.Object(
      {
        promotionIds: Type.Array(Type.String()),
        exportedArtifacts: Type.Array(Type.String()),
        directCanonicalWrites: Type.Literal(false),
      },
      { additionalProperties: false },
    ),
    knowledge: Type.Object(
      {
        storedRecordIds: Type.Array(Type.String()),
        storeBackend: Type.Union([Type.Literal("jsonl"), Type.Literal("mcp")]),
      },
      { additionalProperties: false },
    ),
    createdAt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
