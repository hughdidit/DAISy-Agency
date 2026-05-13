import type { CandidateGenome } from "../models/types.js";
import { mutateGenome } from "./mutation.js";
import { SeededRng } from "./rng.js";

export function evolvePopulation(params: {
  seed: number;
  generations: number;
  population: number;
  initialCandidates: CandidateGenome[];
}): CandidateGenome[] {
  const rng = new SeededRng(params.seed);
  const candidates = [...params.initialCandidates];
  let parents = [...params.initialCandidates];
  const mutationBudget = params.population * params.generations;
  let produced = 0;
  if (parents.length === 0) {
    return candidates;
  }

  for (let generation = 1; generation <= params.generations; generation += 1) {
    const generationParents = parents.slice(
      0,
      Math.max(1, Math.min(parents.length, params.population)),
    );
    let acceptedThisGeneration = 0;
    for (
      let index = 0;
      acceptedThisGeneration < params.population && produced < mutationBudget;
      index += 1
    ) {
      const parent = generationParents[index % generationParents.length];
      if (!parent) {
        break;
      }
      const candidate = mutateGenome({ parent, seed: params.seed, generation, index, rng });
      if (candidate) {
        candidates.push(candidate);
        acceptedThisGeneration += 1;
        produced += 1;
      }
      if (index >= params.population * 2 - 1) {
        break;
      }
    }
    parents = candidates.slice(-params.population);
  }

  return candidates;
}
