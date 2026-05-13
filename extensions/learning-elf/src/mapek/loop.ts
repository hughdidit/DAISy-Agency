import type { LearningElfConfig } from "../../config.js";
import { FixtureProvider } from "../generation/fixture-provider.js";
import { isoFromSeed, stableId } from "../models/ids.js";
import type { EvolutionRun, EvolutionSummary, NegativeTestCandidate } from "../models/types.js";
import { assertNoSecrets, scanForSecrets } from "../security/secret-scanner.js";
import { JsonlLearningStore } from "../storage/jsonl-store.js";
import { McpLearningStore } from "../storage/mcp-store.js";
import type { LearningStore } from "../storage/store.js";
import { analyzeLearningInputs } from "./analyze.js";
import { executePromotionQueue } from "./execute.js";
import { persistKnowledge } from "./knowledge.js";
import { monitorLearningEvents } from "./monitor.js";
import { planEvolution } from "./plan.js";
import { createMapeKTrace } from "./trace.js";

export function createLearningStore(config: LearningElfConfig): LearningStore {
  return config.storageBackend === "mcp"
    ? new McpLearningStore({ databaseName: config.mcp?.databaseName })
    : new JsonlLearningStore({ stateDir: config.stateDir });
}

export async function runFixtureEvolution(params: {
  config: LearningElfConfig;
  fixturePath: string;
  generations: number;
  population: number;
  seed: number;
}): Promise<EvolutionSummary> {
  const store = createLearningStore(params.config);
  const provider = new FixtureProvider();
  const fixture = await provider.loadFixture(params.fixturePath);
  assertNoSecrets(fixture.learningEvents);
  const runId = stableId("elf_run", {
    fixturePath: params.fixturePath,
    generations: params.generations,
    population: params.population,
    seed: params.seed,
  });

  const monitor = monitorLearningEvents(fixture.learningEvents, params.fixturePath);
  const analyze = analyzeLearningInputs({
    events: fixture.learningEvents,
    candidates: fixture.candidates,
    validationFailures: fixture.validationFailures,
  });
  const plan = planEvolution({
    runId,
    fixture,
    seed: params.seed,
    generations: params.generations,
    population: params.population,
  });
  const execute = executePromotionQueue({
    runId,
    candidates: plan.candidates,
    fitnessResults: plan.fitnessResults,
    seed: params.seed,
  });
  const negativeTests: NegativeTestCandidate[] = plan.fitnessResults
    .filter((result) => result.disqualified)
    .flatMap((result) =>
      result.disqualificationReasons.map((reason) => {
        const id = stableId("elf_negative", { runId, candidateId: result.candidateId, reason });
        return {
          id,
          runId,
          candidateId: result.candidateId,
          reason,
          expectedOutcome: "disqualified" as const,
          createdAt: isoFromSeed(params.seed, 40_000),
          idempotencyKey: `negative:${id}`,
        };
      }),
    );
  const run: EvolutionRun = {
    id: runId,
    taskClass: "github_pr_review_strategy",
    fixturePath: params.fixturePath,
    seed: params.seed,
    generations: params.generations,
    population: params.population,
    candidateIds: plan.candidates.map((candidate) => candidate.id),
    fitnessResultIds: plan.fitnessResults.map((result) => result.id),
    promotionIds: execute.promotions.map((promotion) => promotion.id),
    disqualifiedCount: plan.fitnessResults.filter((result) => result.disqualified).length,
    createdAt: isoFromSeed(params.seed, 50_000),
    idempotencyKey: `run:${runId}`,
  };
  const trace = createMapeKTrace({
    run,
    events: fixture.learningEvents,
    sourceRefs: monitor.sourceRefs,
    riskFindings: analyze.riskFindings,
    classifications: analyze.classifications,
    fitnessResults: plan.fitnessResults,
    promotions: execute.promotions,
    selectionSummary: plan.selectionSummary,
    exportedArtifacts: execute.exportedArtifacts,
    storeBackend: store.backend,
    seed: params.seed,
  });
  const storedIds = await persistKnowledge({
    store,
    learningEvents: fixture.learningEvents,
    candidates: plan.candidates.filter((candidate) => scanForSecrets(candidate).length === 0),
    fitnessResults: plan.fitnessResults,
    promotions: execute.promotions,
    negativeTests,
    run,
  });
  const finalTrace = {
    ...trace,
    knowledge: { ...trace.knowledge, storedRecordIds: [...storedIds, trace.id] },
  };
  await store.saveRecord("elf_mapek_traces", finalTrace);

  return {
    runId,
    traceId: finalTrace.id,
    candidateIds: run.candidateIds,
    promotionIds: run.promotionIds,
    disqualifiedCount: run.disqualifiedCount,
    storeBackend: store.backend,
    tracePath: store.resolveCollectionPath?.("elf_mapek_traces"),
  };
}
