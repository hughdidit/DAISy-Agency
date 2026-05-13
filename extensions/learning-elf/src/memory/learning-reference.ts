import type { FitnessResult, PromotionCandidate } from "../models/types.js";

export type ElfLearningReference = {
  text: string;
  kind: "fact";
  importance: number;
  confidence: number;
  status: "recorded" | "negative_signal";
  sourceMessageIds: string[];
  tags: string[];
};

export function buildElfLearningReference(params: {
  promotion?: PromotionCandidate;
  fitness: FitnessResult;
}): ElfLearningReference {
  if (params.fitness.disqualified) {
    return {
      text:
        `ELF rejected candidate ${params.fitness.candidateId}: ` +
        params.fitness.disqualificationReasons.join(", "),
      kind: "fact",
      importance: 0.55,
      confidence: 1,
      status: "negative_signal",
      sourceMessageIds: [params.fitness.id],
      tags: ["elf", "negative-learning-signal"],
    };
  }

  return {
    text:
      `ELF evaluated candidate ${params.fitness.candidateId} as safe ` +
      `with weighted score ${params.fitness.weightedScore.toFixed(3)}.`,
    kind: "fact",
    importance: 0.65,
    confidence: 0.9,
    status: params.promotion?.state === "promotion_queued" ? "recorded" : "negative_signal",
    sourceMessageIds: [params.fitness.id, params.promotion?.id].filter(
      (id): id is string => typeof id === "string",
    ),
    tags: ["elf", "learning-reference"],
  };
}
