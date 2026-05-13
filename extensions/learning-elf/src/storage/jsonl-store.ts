import fs from "node:fs/promises";
import path from "node:path";
import { resolveLearningElfStateDir } from "../../config.js";
import type { LearningCollection, LearningRecord, LearningStore } from "./store.js";

const COLLECTION_FILES: Record<LearningCollection, string> = {
  elf_learning_events: "elf_learning_events.jsonl",
  elf_candidate_genomes: "elf_candidate_genomes.jsonl",
  elf_evolution_runs: "elf_evolution_runs.jsonl",
  elf_fitness_results: "elf_fitness_results.jsonl",
  elf_promotion_candidates: "elf_promotion_candidates.jsonl",
  elf_negative_test_candidates: "elf_negative_test_candidates.jsonl",
  elf_mapek_traces: "elf_mapek_traces.jsonl",
};

type RecordWithIdempotency = LearningRecord & { idempotencyKey?: string };
type CollectionIndex = {
  byId: Map<string, RecordWithIdempotency>;
  byIdempotencyKey: Map<string, RecordWithIdempotency>;
};

export class JsonlLearningStore implements LearningStore {
  readonly backend = "jsonl" as const;
  private readonly rootDir: string;
  private readonly indexes = new Map<LearningCollection, CollectionIndex>();

  constructor(params?: { stateDir?: string }) {
    this.rootDir = resolveLearningElfStateDir({ stateDir: params?.stateDir });
  }

  resolveCollectionPath(collection: LearningCollection): string {
    return path.join(this.rootDir, COLLECTION_FILES[collection]);
  }

  async saveRecord<T extends LearningRecord>(
    collection: LearningCollection,
    record: T,
  ): Promise<T> {
    await fs.mkdir(this.rootDir, { recursive: true, mode: 0o700 });
    const index = await this.getCollectionIndex(collection);
    const idempotencyKey = (record as RecordWithIdempotency).idempotencyKey;
    const found = idempotencyKey ? index.byIdempotencyKey.get(idempotencyKey) : undefined;
    const foundById = found ?? index.byId.get(record.id);
    if (foundById) {
      return foundById as T;
    }
    await fs.appendFile(this.resolveCollectionPath(collection), `${JSON.stringify(record)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    index.byId.set(record.id, record);
    if (idempotencyKey) {
      index.byIdempotencyKey.set(idempotencyKey, record);
    }
    return record;
  }

  async listRecords<T extends LearningRecord>(collection: LearningCollection): Promise<T[]> {
    const filePath = this.resolveCollectionPath(collection);
    let text = "";
    try {
      text = await fs.readFile(filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  }

  async getRecordById<T extends LearningRecord>(
    collection: LearningCollection,
    id: string,
  ): Promise<T | null> {
    const records = await this.listRecords<T>(collection);
    return records.find((record) => record.id === id) ?? null;
  }

  private async getCollectionIndex(collection: LearningCollection): Promise<CollectionIndex> {
    const cached = this.indexes.get(collection);
    if (cached) {
      return cached;
    }
    const records = await this.listRecords<RecordWithIdempotency>(collection);
    const index: CollectionIndex = {
      byId: new Map(records.map((record) => [record.id, record])),
      byIdempotencyKey: new Map(
        records
          .filter((record): record is RecordWithIdempotency & { idempotencyKey: string } =>
            Boolean(record.idempotencyKey),
          )
          .map((record) => [record.idempotencyKey, record]),
      ),
    };
    this.indexes.set(collection, index);
    return index;
  }
}
