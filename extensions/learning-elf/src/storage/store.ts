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

export type LearningStore = {
  backend: StoreBackend;
  saveRecord<T extends LearningRecord>(collection: LearningCollection, record: T): Promise<T>;
  listRecords<T extends LearningRecord>(collection: LearningCollection): Promise<T[]>;
  getRecordById<T extends LearningRecord>(
    collection: LearningCollection,
    id: string,
  ): Promise<T | null>;
  resolveCollectionPath?(collection: LearningCollection): string;
};
