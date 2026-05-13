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
  if (parents.length === 0) {
    return candidates;
  }

  for (let generation = 1; generation <= params.generations; generation += 1) {
    const generationParents = parents.slice(
      0,
      Math.max(1, Math.min(parents.length, params.population)),
    );
    for (let index = 0; candidates.length < params.population * params.generations; index += 1) {
      const parent = generationParents[index % generationParents.length];
      if (!parent) {
        break;
      }
      candidates.push(mutateGenome({ parent, seed: params.seed, generation, index, rng }));
      if (index >= params.population - 1) {
        break;
      }
    }
    parents = candidates.slice(-params.population);
  }

  return candidates.slice(0, Math.max(params.population, params.population * params.generations));
}
