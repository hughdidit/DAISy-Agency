import type { CandidateGenome, LearningEvent } from "../models/types.js";

export type FixturePayload = {
  learningEvents: LearningEvent[];
  candidates: CandidateGenome[];
  validationFailures: Array<{ file: string; errors: string[] }>;
};

export type CandidateProvider = {
  loadFixture(fixturePath: string): Promise<FixturePayload>;
};
