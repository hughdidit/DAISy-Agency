import type { LearningCollection, LearningCollectionRecordMap, LearningStore } from "./store.js";

export type McpLearningRecordClient = {
  insertMany(database: string, collection: string, documents: Array<Record<string, unknown>>): Promise<number>;
  aggregate(database: string, collection: string, pipeline: unknown[]): Promise<Array<Record<string, unknown>>>;
  updateMany(
    database: string,
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<{ matchedCount: number; modifiedCount: number }>;
};

export const LEARNING_COLLECTION_RECORD_MAP: Record<LearningCollection, string> = {
  elf_learning_events: "LearningEvent",
  elf_candidate_genomes: "CandidateGenome",
  elf_evolution_runs: "EvolutionRun",
  elf_fitness_results: "FitnessResult",
  elf_promotion_candidates: "PromotionCandidate",
  elf_negative_test_candidates: "NegativeTestCandidate",
  elf_mapek_traces: "MapeKTrace",
};

export class McpLearningStore implements LearningStore {
  readonly backend = "mcp" as const;

  constructor(
    private readonly params: {
      client?: McpLearningRecordClient;
      databaseName?: string;
    } = {},
  ) {}

  async saveRecord<C extends LearningCollection>(
    collection: C,
    record: LearningCollectionRecordMap[C],
  ): Promise<LearningCollectionRecordMap[C]> {
    const client = this.requireClient();
    const existing = await this.getRecordById(collection, record.id);
    if (existing) {
      return existing;
    }
    const idempotencyKey =
      typeof (record as { idempotencyKey?: unknown }).idempotencyKey === "string"
        ? (record as { idempotencyKey: string }).idempotencyKey
        : undefined;
    if (idempotencyKey) {
      const found = await client.aggregate(this.databaseName(), collection, [
        { $match: { idempotencyKey } },
        { $limit: 1 },
      ]);
      if (found[0]) {
        return found[0] as LearningCollectionRecordMap[C];
      }
    }
    await client.insertMany(this.databaseName(), collection, [record as Record<string, unknown>]);
    return record;
  }

  async listRecords<C extends LearningCollection>(
    collection: C,
  ): Promise<Array<LearningCollectionRecordMap[C]>> {
    return this.requireClient().aggregate(this.databaseName(), collection, [
      { $sort: { createdAt: 1, id: 1 } },
    ]) as Promise<Array<LearningCollectionRecordMap[C]>>;
  }

  async getRecordById<C extends LearningCollection>(
    collection: C,
    id: string,
  ): Promise<LearningCollectionRecordMap[C] | null> {
    const found = await this.requireClient().aggregate(this.databaseName(), collection, [
      { $match: { id } },
      { $limit: 1 },
    ]);
    return (found[0] as LearningCollectionRecordMap[C] | undefined) ?? null;
  }

  private databaseName(): string {
    return this.params.databaseName ?? "daisy_learning";
  }

  private requireClient(): McpLearningRecordClient {
    if (!this.params.client) {
      throw new Error("MCP-backed ELF storage requires a configured MongoDB MCP record client");
    }
    return this.params.client;
  }
}
