import type { LearningCollection, LearningRecord, LearningStore } from "./store.js";

export class McpLearningStore implements LearningStore {
  readonly backend = "mcp" as const;

  async saveRecord<T extends LearningRecord>(_collection: LearningCollection, _record: T): Promise<T> {
    throw new Error("MCP-backed ELF storage is not configured for the initial implementation");
  }

  async listRecords<T extends LearningRecord>(_collection: LearningCollection): Promise<T[]> {
    throw new Error("MCP-backed ELF storage is not configured for the initial implementation");
  }

  async getRecordById<T extends LearningRecord>(
    _collection: LearningCollection,
    _id: string,
  ): Promise<T | null> {
    throw new Error("MCP-backed ELF storage is not configured for the initial implementation");
  }
}
