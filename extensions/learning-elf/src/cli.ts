import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import type { LearningElfConfig } from "../config.js";
import { createLearningStore, runFixtureEvolution } from "./mapek/loop.js";
import { CandidateGenomeSchema, LearningEventSchema } from "./models/schemas.js";
import type {
  CandidateGenome,
  LearningEvent,
  FitnessResult,
  MapeKTrace,
  PromotionCandidate,
} from "./models/types.js";
import { validateWithSchema } from "./models/validation.js";
import { exportPromotionMarkdown } from "./promotion/markdown-export.js";
import { assertNoSecrets } from "./security/secret-scanner.js";

type Logger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string) => void;
};

async function readPayloads(filePath: string): Promise<unknown[]> {
  const text = await fs.readFile(path.resolve(filePath), "utf8");
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to parse JSONL at line ${index + 1}: ${message}`);
        }
      });
  }
}

function parsePositiveInt(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function printJson(value: unknown): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(value, null, 2));
}

export function registerElfCli(params: {
  program: Command;
  config: LearningElfConfig;
  logger?: Logger;
}): void {
  const root = params.program.command("elf").description("DAISy Evolutionary Learning Fabric");

  root
    .command("ingest")
    .description("Ingest fixture learning events or candidate genomes")
    .requiredOption("--file <path>", "JSON or JSONL fixture path")
    .action(async (options: { file: string }) => {
      const store = createLearningStore(params.config);
      const payloads = await readPayloads(options.file);
      const saved: string[] = [];
      const rejected: Array<{ index: number; errors: string[] }> = [];
      for (const [index, payload] of payloads.entries()) {
        try {
          assertNoSecrets(payload);
        } catch (error) {
          rejected.push({ index, errors: [String(error)] });
          continue;
        }
        const event = validateWithSchema<LearningEvent>(LearningEventSchema, payload);
        if (event.ok) {
          saved.push((await store.saveRecord("elf_learning_events", event.value)).id);
          continue;
        }
        const candidate = validateWithSchema<CandidateGenome>(CandidateGenomeSchema, payload);
        if (candidate.ok) {
          saved.push((await store.saveRecord("elf_candidate_genomes", candidate.value)).id);
          continue;
        }
        rejected.push({ index, errors: [...event.errors, ...candidate.errors] });
      }
      printJson({ saved, rejected, storeBackend: store.backend });
    });

  root
    .command("evolve")
    .description("Run deterministic fixture-mode evolution")
    .requiredOption("--fixture <path>", "Fixture JSON or JSONL path")
    .requiredOption("--generations <n>", "Generation count")
    .requiredOption("--population <n>", "Population size")
    .requiredOption("--seed <n>", "Deterministic seed")
    .action(
      async (options: {
        fixture: string;
        generations: string;
        population: string;
        seed: string;
      }) => {
        const summary = await runFixtureEvolution({
          config: params.config,
          fixturePath: options.fixture,
          generations: parsePositiveInt(options.generations, "generations"),
          population: parsePositiveInt(options.population, "population"),
          seed: parsePositiveInt(options.seed, "seed"),
        });
        printJson(summary);
      },
    );

  root
    .command("candidates")
    .description("Candidate genome commands")
    .command("list")
    .description("List stored candidate genomes")
    .action(async () => {
      const store = createLearningStore(params.config);
      printJson(await store.listRecords<CandidateGenome>("elf_candidate_genomes"));
    });

  const promotions = root.command("promotions").description("Promotion queue commands");
  promotions
    .command("list")
    .description("List promotion candidates")
    .action(async () => {
      const store = createLearningStore(params.config);
      printJson(await store.listRecords<PromotionCandidate>("elf_promotion_candidates"));
    });

  promotions
    .command("export")
    .description("Export a promotion proposal as Markdown")
    .requiredOption("--promotion-id <id>", "Promotion candidate ID")
    .requiredOption("--out <path>", "Markdown output path")
    .action(async (options: { promotionId: string; out: string }) => {
      const store = createLearningStore(params.config);
      const promotion = await store.getRecordById<PromotionCandidate>(
        "elf_promotion_candidates",
        options.promotionId,
      );
      if (!promotion) {
        throw new Error(`Promotion not found: ${options.promotionId}`);
      }
      const candidate = await store.getRecordById<CandidateGenome>(
        "elf_candidate_genomes",
        promotion.candidateId,
      );
      const fitness = await store.getRecordById<FitnessResult>(
        "elf_fitness_results",
        promotion.fitnessResultId,
      );
      const traces = await store.listRecords<MapeKTrace>("elf_mapek_traces");
      const trace = traces.find((entry) => entry.runId === promotion.runId) ?? null;
      if (!candidate || !fitness) {
        throw new Error(`Promotion ${promotion.id} is missing candidate or fitness records`);
      }
      const outPath = await exportPromotionMarkdown({
        outPath: options.out,
        promotion,
        candidate,
        fitness,
        trace,
      });
      printJson({ promotionId: promotion.id, outPath });
    });

  root
    .command("trace")
    .description("MAPE-K trace commands")
    .command("show")
    .description("Show a persisted MAPE-K trace by run ID")
    .requiredOption("--run-id <id>", "Evolution run ID")
    .action(async (options: { runId: string }) => {
      const store = createLearningStore(params.config);
      const traces = await store.listRecords<MapeKTrace>("elf_mapek_traces");
      const trace = traces.find((entry) => entry.runId === options.runId);
      if (!trace) {
        throw new Error(`Trace not found for run: ${options.runId}`);
      }
      printJson(trace);
    });
}
