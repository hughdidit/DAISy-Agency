import path from "node:path";
import { resolveStateDir } from "../../src/config/paths.js";

export type LearningElfStorageBackend = "jsonl" | "mcp";

export type LearningElfConfig = {
  enabled: boolean;
  storageBackend: LearningElfStorageBackend;
  stateDir?: string;
};

export const DEFAULT_LEARNING_ELF_CONFIG: LearningElfConfig = {
  enabled: true,
  storageBackend: "jsonl",
};

export function resolveLearningElfConfig(raw: unknown): LearningElfConfig {
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const record = value as Record<string, unknown>;
  const storageBackend = record.storageBackend === "mcp" ? "mcp" : "jsonl";
  const stateDir =
    typeof record.stateDir === "string" && record.stateDir.trim() ? record.stateDir : undefined;
  return {
    enabled: typeof record.enabled === "boolean" ? record.enabled : true,
    storageBackend,
    stateDir,
  };
}

export function resolveLearningElfStateDir(config?: Pick<LearningElfConfig, "stateDir">): string {
  return path.join(config?.stateDir?.trim() || resolveStateDir(process.env), "elf");
}
