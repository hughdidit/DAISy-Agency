import type {
  CandidateGenome,
  EvolutionRun,
  FitnessResult,
  LearningEvent,
  MapeKTrace,
  NegativeTestCandidate,
  PromotionCandidate,
  StoreBackend,
} from "../models/types.js";

export type LearningCollection =
  | "elf_learning_events"
  | "elf_candidate_genomes"
  | "elf_evolution_runs"
  | "elf_fitness_results"
  | "elf_promotion_candidates"
  | "elf_negative_test_candidates"
  | "elf_mapek_traces";

export type LearningRecord =
  | LearningEvent
  | CandidateGenome
  | EvolutionRun
  | FitnessResult
  | PromotionCandidate
  | NegativeTestCandidate
  | MapeKTrace;

export type LearningCollectionRecordMap = {
  elf_learning_events: LearningEvent;
  elf_candidate_genomes: CandidateGenome;
  elf_evolution_runs: EvolutionRun;
  elf_fitness_results: FitnessResult;
  elf_promotion_candidates: PromotionCandidate;
  elf_negative_test_candidates: NegativeTestCandidate;
  elf_mapek_traces: MapeKTrace;
};

export type LearningStore = {
  backend: StoreBackend;
  saveRecord<C extends LearningCollection>(
    collection: C,
    record: LearningCollectionRecordMap[C],
  ): Promise<LearningCollectionRecordMap[C]>;
  listRecords<C extends LearningCollection>(
    collection: C,
  ): Promise<Array<LearningCollectionRecordMap[C]>>;
  getRecordById<C extends LearningCollection>(
    collection: C,
    id: string,
  ): Promise<LearningCollectionRecordMap[C] | null>;
  resolveCollectionPath?(collection: LearningCollection): string;
};
