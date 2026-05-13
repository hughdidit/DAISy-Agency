import type {
  CandidateGenome,
  EvolutionRun,
  FitnessResult,
  LearningEvent,
  MapeKTrace,
  NegativeTestCandidate,
  PromotionCandidate,
} from "../models/types.js";
import type { LearningStore } from "../storage/store.js";

export async function persistKnowledge(params: {
  store: LearningStore;
  learningEvents: LearningEvent[];
  candidates: CandidateGenome[];
  fitnessResults: FitnessResult[];
  promotions: PromotionCandidate[];
  negativeTests: NegativeTestCandidate[];
  run: EvolutionRun;
  trace?: MapeKTrace;
}): Promise<string[]> {
  const stored: string[] = [];
  for (const event of params.learningEvents) {
    stored.push((await params.store.saveRecord("elf_learning_events", event)).id);
  }
  for (const candidate of params.candidates) {
    stored.push((await params.store.saveRecord("elf_candidate_genomes", candidate)).id);
  }
  for (const fitness of params.fitnessResults) {
    stored.push((await params.store.saveRecord("elf_fitness_results", fitness)).id);
  }
  for (const promotion of params.promotions) {
    stored.push((await params.store.saveRecord("elf_promotion_candidates", promotion)).id);
  }
  for (const negative of params.negativeTests) {
    stored.push((await params.store.saveRecord("elf_negative_test_candidates", negative)).id);
  }
  stored.push((await params.store.saveRecord("elf_evolution_runs", params.run)).id);
  if (params.trace) {
    stored.push((await params.store.saveRecord("elf_mapek_traces", params.trace)).id);
  }
  return stored;
}
