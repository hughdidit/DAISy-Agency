import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { afterEach, describe, expect, it } from "vitest";
import { getSubCliEntries } from "../../../src/cli/program/register.subclis.js";
import { registerElfCli } from "./cli.js";
import { evaluateCandidate } from "./evaluation/evaluator.js";
import { mutateGenome } from "./evolution/mutation.js";
import { SeededRng } from "./evolution/rng.js";
import { FixtureProvider } from "./generation/fixture-provider.js";
import { runFixtureEvolution } from "./mapek/loop.js";
import { CandidateGenomeSchema, MapeKTraceSchema } from "./models/schemas.js";
import type {
  CandidateGenome,
  FitnessResult,
  MapeKTrace,
  PromotionCandidate,
} from "./models/types.js";
import { validateWithSchema } from "./models/validation.js";
import { assertElfMaySetState, assertPromotionTransition } from "./promotion/lifecycle.js";
import { assertMutationAllowed, detectForbiddenMutations } from "./security/forbidden-mutations.js";
import { scanForSecrets } from "./security/secret-scanner.js";
import { JsonlLearningStore } from "./storage/jsonl-store.js";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const eventFixture = path.join(
  fixtureRoot,
  "fixtures",
  "learning-events",
  "pr-review-failure.json",
);
const safeFixture = path.join(
  fixtureRoot,
  "fixtures",
  "candidates",
  "safe-pr-review-strategy.json",
);
const unsafeApprovalFixture = path.join(
  fixtureRoot,
  "fixtures",
  "candidates",
  "unsafe-approval-bypass.json",
);
const unsafeProductionFixture = path.join(
  fixtureRoot,
  "fixtures",
  "candidates",
  "unsafe-production-mutation.json",
);
const unsafeSecretFixture = path.join(
  fixtureRoot,
  "fixtures",
  "candidates",
  "unsafe-secret-storage.json",
);
const malformedFixture = path.join(fixtureRoot, "fixtures", "candidates", "malformed-genome.json");

const tempDirs: string[] = [];

async function makeTempStateDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "learning-elf-"));
  tempDirs.push(dir);
  return dir;
}

async function readFixture<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

describe("DAISy ELF schemas and security", () => {
  it("validates structured genomes and rejects malformed genomes", async () => {
    const safe = await readFixture<CandidateGenome>(safeFixture);
    const malformed = await readFixture<unknown>(malformedFixture);

    expect(validateWithSchema<CandidateGenome>(CandidateGenomeSchema, safe).ok).toBe(true);
    expect(validateWithSchema<CandidateGenome>(CandidateGenomeSchema, malformed).ok).toBe(false);
  });

  it("rejects required secret-like patterns", () => {
    const findings = scanForSecrets({
      privateKey: ["-----BEGIN", "PRIVATE", "KEY-----"].join(" "),
      apiKey: "api_key=value",
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      github: "GITHUB_TOKEN",
      google: "GOOGLE_APPLICATION_CREDENTIALS",
      refresh: "refresh_token",
      access: "access_token",
      client: "client_secret",
      password: "password=value",
      mongo: "mongodb+srv://user:pass@example.invalid/db",
      bearer: "Bearer abc123",
    });

    expect(findings.map((finding) => finding.pattern)).toEqual(
      expect.arrayContaining([
        ["BEGIN", "PRIVATE", "KEY"].join(" "),
        "api_key=",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GITHUB_TOKEN",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "refresh_token",
        "access_token",
        "client_secret",
        "password=",
        "mongodb+srv://",
        "Bearer",
      ]),
    );
  });

  it("rejects forbidden mutations with explicit reasons", async () => {
    const approval = await readFixture<CandidateGenome>(unsafeApprovalFixture);
    const production = await readFixture<CandidateGenome>(unsafeProductionFixture);
    const secret = await readFixture<CandidateGenome>(unsafeSecretFixture);

    expect(detectForbiddenMutations(approval)).toContain("approval_bypass_attempt");
    expect(detectForbiddenMutations(production)).toEqual(
      expect.arrayContaining(["production_write_attempt", "deployment_workflow_direct_write"]),
    );
    expect(detectForbiddenMutations(secret)).toContain("secret_exposure");
    expect(() => assertMutationAllowed(production)).toThrow(/Forbidden ELF mutation rejected/);
  });

  it("rejects invalid generated mutations without crashing evolution", async () => {
    const production = await readFixture<CandidateGenome>(unsafeProductionFixture);

    expect(() =>
      mutateGenome({
        parent: production,
        seed: 7,
        generation: 1,
        index: 0,
        rng: new SeededRng(7),
      }),
    ).not.toThrow();
    expect(
      mutateGenome({
        parent: production,
        seed: 7,
        generation: 1,
        index: 0,
        rng: new SeededRng(7),
      }),
    ).toBeNull();
  });

  it("uses security gates as hard disqualification even with useful strategy shape", async () => {
    const candidate = await readFixture<CandidateGenome>(unsafeProductionFixture);
    const result = evaluateCandidate({ runId: "run_security", candidate, seed: 1, index: 0 });

    expect(result.weightedScore).toBeGreaterThan(0);
    expect(result.disqualified).toBe(true);
    expect(result.promotionEligible).toBe(false);
    expect(result.disqualificationReasons).toContain("production_write_attempt");
  });

  it("enforces promotion lifecycle and prevents ELF self-approval", () => {
    expect(() => assertPromotionTransition("draft", "candidate")).not.toThrow();
    expect(() => assertPromotionTransition("evaluated", "promotion_queued")).not.toThrow();
    expect(() => assertPromotionTransition("promotion_queued", "canonized")).toThrow();
    expect(() => assertElfMaySetState("approved")).toThrow(/may not self-set/);
    expect(() => assertElfMaySetState("canonized")).toThrow(/may not self-set/);
  });
});

describe("DAISy ELF fixture evolution", () => {
  it("runs deterministic fixture evolution and persists a MAPE-K trace", async () => {
    const firstState = await makeTempStateDir();
    const secondState = await makeTempStateDir();
    const first = await runFixtureEvolution({
      config: { enabled: true, storageBackend: "jsonl", stateDir: firstState },
      fixturePath: eventFixture,
      generations: 3,
      population: 20,
      seed: 1234,
    });
    const second = await runFixtureEvolution({
      config: { enabled: true, storageBackend: "jsonl", stateDir: secondState },
      fixturePath: eventFixture,
      generations: 3,
      population: 20,
      seed: 1234,
    });

    expect({ ...second, tracePath: undefined }).toEqual({ ...first, tracePath: undefined });
    expect(first.promotionIds.length).toBeGreaterThan(0);
    expect(first.disqualifiedCount).toBeGreaterThan(0);

    const store = new JsonlLearningStore({ stateDir: firstState });
    const traces = await store.listRecords<MapeKTrace>("elf_mapek_traces");
    expect(traces).toHaveLength(1);
    expect(validateWithSchema<MapeKTrace>(MapeKTraceSchema, traces[0]).ok).toBe(true);
    expect(traces[0]?.execute.directCanonicalWrites).toBe(false);
    expect(traces[0]?.monitor.learningEventIds).toContain("evt_pr_review_failure_001");
    expect(traces[0]?.knowledge.storedRecordIds.length).toBeGreaterThan(0);
  });

  it("queues safe candidates and does not persist secret-bearing candidate genomes", async () => {
    const stateDir = await makeTempStateDir();
    await runFixtureEvolution({
      config: { enabled: true, storageBackend: "jsonl", stateDir },
      fixturePath: eventFixture,
      generations: 1,
      population: 8,
      seed: 42,
    });
    const store = new JsonlLearningStore({ stateDir });
    const promotions = await store.listRecords<PromotionCandidate>("elf_promotion_candidates");
    const candidates = await store.listRecords<CandidateGenome>("elf_candidate_genomes");
    const fitness = await store.listRecords<FitnessResult>("elf_fitness_results");

    expect(promotions.some((promotion) => promotion.state === "promotion_queued")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "candidate_unsafe_secret_storage")).toBe(
      false,
    );
    const secretFitness = fitness.find(
      (result) => result.candidateId === "candidate_unsafe_secret_storage",
    );
    expect(secretFitness?.disqualificationReasons).toContain("secret_exposure");
  });

  it("rejects secret-bearing fixture learning events before persistence", async () => {
    const stateDir = await makeTempStateDir();
    const event = await readFixture<Record<string, unknown>>(eventFixture);
    const secretEventPath = path.join(stateDir, "secret-event.json");
    await fs.writeFile(
      secretEventPath,
      JSON.stringify({ ...event, summary: "review context included GITHUB_TOKEN" }),
      "utf8",
    );

    await expect(
      runFixtureEvolution({
        config: { enabled: true, storageBackend: "jsonl", stateDir },
        fixturePath: secretEventPath,
        generations: 1,
        population: 4,
        seed: 52,
      }),
    ).rejects.toThrow(/Secret-like content rejected: GITHUB_TOKEN/);

    const store = new JsonlLearningStore({ stateDir });
    await expect(store.listRecords("elf_learning_events")).resolves.toHaveLength(0);
  });

  it("loads malformed fixture candidates as validation failures rather than evaluating them", async () => {
    const provider = new FixtureProvider();
    const fixture = await provider.loadFixture(malformedFixture);

    expect(fixture.candidates).toHaveLength(0);
    expect(fixture.validationFailures.length).toBeGreaterThan(0);
  });

  it("loads JSONL fixtures whose first line is an object", async () => {
    const stateDir = await makeTempStateDir();
    const event = await readFixture<unknown>(eventFixture);
    const safe = await readFixture<unknown>(safeFixture);
    const jsonlPath = path.join(stateDir, "fixture.jsonl");
    await fs.writeFile(jsonlPath, `${JSON.stringify(event)}\n${JSON.stringify(safe)}\n`, "utf8");

    const fixture = await new FixtureProvider().loadFixture(jsonlPath);

    expect(fixture.learningEvents).toHaveLength(1);
    expect(fixture.candidates).toHaveLength(1);
    expect(fixture.validationFailures).toHaveLength(0);
  });
});

describe("DAISy ELF CLI", () => {
  it("declares elf as a lazy plugin-backed top-level command", () => {
    const entry = getSubCliEntries().find((candidate) => candidate.name === "elf");
    expect(entry?.hasSubcommands).toBe(true);
    expect(entry?.description).toContain("Evolutionary Learning Fabric");
  });

  it("runs fixture mode, lists records, exports Markdown, and displays trace", async () => {
    const stateDir = await makeTempStateDir();
    const program = new Command();
    program.exitOverride();
    registerElfCli({
      program,
      config: { enabled: true, storageBackend: "jsonl", stateDir },
      logger: {},
    });
    const printed: string[] = [];
    const originalLog = console.log;
    console.log = (value?: unknown) => {
      printed.push(String(value));
    };

    try {
      await program.parseAsync(
        [
          "elf",
          "evolve",
          "--fixture",
          eventFixture,
          "--generations",
          "2",
          "--population",
          "10",
          "--seed",
          "77",
        ],
        { from: "user" },
      );
      const summary = JSON.parse(printed.at(-1) ?? "{}") as {
        runId: string;
        promotionIds: string[];
      };
      expect(summary.runId).toMatch(/^elf_run_/);
      expect(summary.promotionIds.length).toBeGreaterThan(0);

      await program.parseAsync(["elf", "candidates", "list"], { from: "user" });
      expect(JSON.parse(printed.at(-1) ?? "[]").length).toBeGreaterThan(0);

      await program.parseAsync(["elf", "promotions", "list"], { from: "user" });
      expect(JSON.parse(printed.at(-1) ?? "[]").length).toBeGreaterThan(0);

      const outPath = path.join(stateDir, "proposal.md");
      await program.parseAsync(
        [
          "elf",
          "promotions",
          "export",
          "--promotion-id",
          summary.promotionIds[0] ?? "",
          "--out",
          outPath,
        ],
        { from: "user" },
      );
      const markdown = await fs.readFile(outPath, "utf8");
      expect(markdown).toContain("Direct canonical writes performed: false");
      expect(markdown).toContain("Human approval required before canonization.");

      await program.parseAsync(["elf", "trace", "show", "--run-id", summary.runId], {
        from: "user",
      });
      const trace = JSON.parse(printed.at(-1) ?? "{}") as MapeKTrace;
      expect(trace.execute.directCanonicalWrites).toBe(false);
      expect(trace.runId).toBe(summary.runId);
    } finally {
      console.log = originalLog;
    }
  });

  it("ingests JSONL files whose first line is an object", async () => {
    const stateDir = await makeTempStateDir();
    const event = await readFixture<unknown>(eventFixture);
    const safe = await readFixture<unknown>(safeFixture);
    const jsonlPath = path.join(stateDir, "ingest.jsonl");
    await fs.writeFile(jsonlPath, `${JSON.stringify(event)}\n${JSON.stringify(safe)}\n`, "utf8");
    const program = new Command();
    program.exitOverride();
    registerElfCli({
      program,
      config: { enabled: true, storageBackend: "jsonl", stateDir },
      logger: {},
    });
    const printed: string[] = [];
    const originalLog = console.log;
    console.log = (value?: unknown) => {
      printed.push(String(value));
    };

    try {
      await program.parseAsync(["elf", "ingest", "--file", jsonlPath], { from: "user" });
      const result = JSON.parse(printed.at(-1) ?? "{}") as {
        saved: string[];
        rejected: unknown[];
      };
      expect(result.saved).toHaveLength(2);
      expect(result.rejected).toHaveLength(0);
    } finally {
      console.log = originalLog;
    }
  });
});

describe("DAISy ELF JSONL storage", () => {
  it("uses idempotency keys without duplicating appended records", async () => {
    const stateDir = await makeTempStateDir();
    const store = new JsonlLearningStore({ stateDir });
    const safe = await readFixture<CandidateGenome>(safeFixture);

    await store.saveRecord("elf_candidate_genomes", safe);
    await store.saveRecord("elf_candidate_genomes", { ...safe, id: "candidate_duplicate_id" });

    const records = await store.listRecords<CandidateGenome>("elf_candidate_genomes");
    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe(safe.id);
  });
});
