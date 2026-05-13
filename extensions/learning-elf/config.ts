import path from "node:path";
import { resolveStateDir } from "../../src/config/paths.js";

export type LearningElfStorageBackend = "jsonl" | "mcp";

export type LearningElfConfig = {
  enabled: boolean;
  storageBackend: LearningElfStorageBackend;
  stateDir?: string;
  mcp?: {
    databaseName?: string;
  };
  llmEvolution?: {
    enabled: boolean;
    provider: "disabled" | "fixture" | "live";
    endpoint?: string;
    apiKeyEnv?: string;
    modelAllowlist: string[];
    maxCandidateCount: number;
    timeoutMs: number;
    tokenBudget: number;
  };
  githubProposals?: {
    enabled: boolean;
    repo?: string;
    branchPrefix: string;
    labels: string[];
    draftDefault: boolean;
    allowedProposalPaths: string[];
    forbiddenPathGlobs: string[];
  };
};

export const DEFAULT_LEARNING_ELF_CONFIG: LearningElfConfig = {
  enabled: true,
  storageBackend: "jsonl",
  llmEvolution: {
    enabled: false,
    provider: "disabled",
    apiKeyEnv: "OPENAI_API_KEY",
    modelAllowlist: [],
    maxCandidateCount: 4,
    timeoutMs: 30_000,
    tokenBudget: 8_000,
  },
  githubProposals: {
    enabled: false,
    branchPrefix: "codex/elf-proposal/",
    labels: ["learning", "capability-proposal"],
    draftDefault: true,
    allowedProposalPaths: ["docs/learning/", ".openclaw/elf/proposals/"],
    forbiddenPathGlobs: [
      ".github/workflows/",
      "deployment/",
      "deploy/",
      "config/production",
      "security/",
    ],
  },
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
    mcp:
      record.mcp && typeof record.mcp === "object" && !Array.isArray(record.mcp)
        ? { databaseName: readString((record.mcp as Record<string, unknown>).databaseName) }
        : undefined,
    llmEvolution: parseLlmEvolution(record.llmEvolution),
    githubProposals: parseGithubProposals(record.githubProposals),
  };
}

export function resolveLearningElfStateDir(config?: Pick<LearningElfConfig, "stateDir">): string {
  return path.join(config?.stateDir?.trim() || resolveStateDir(process.env), "elf");
}

function parseLlmEvolution(value: unknown): LearningElfConfig["llmEvolution"] {
  const defaults = DEFAULT_LEARNING_ELF_CONFIG.llmEvolution!;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...defaults, modelAllowlist: [...defaults.modelAllowlist] };
  }
  const raw = value as Record<string, unknown>;
  const provider =
    raw.provider === "fixture" || raw.provider === "live" || raw.provider === "disabled"
      ? raw.provider
      : defaults.provider;
  return {
    enabled: raw.enabled === true,
    provider,
    endpoint: readString(raw.endpoint),
    apiKeyEnv: readString(raw.apiKeyEnv) ?? defaults.apiKeyEnv,
    modelAllowlist: readStringArray(raw.modelAllowlist) ?? [...defaults.modelAllowlist],
    maxCandidateCount: readPositiveInt(raw.maxCandidateCount, defaults.maxCandidateCount),
    timeoutMs: readPositiveInt(raw.timeoutMs, defaults.timeoutMs),
    tokenBudget: readPositiveInt(raw.tokenBudget, defaults.tokenBudget),
  };
}

function parseGithubProposals(value: unknown): LearningElfConfig["githubProposals"] {
  const defaults = DEFAULT_LEARNING_ELF_CONFIG.githubProposals!;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ...defaults,
      labels: [...defaults.labels],
      allowedProposalPaths: [...defaults.allowedProposalPaths],
      forbiddenPathGlobs: [...defaults.forbiddenPathGlobs],
    };
  }
  const raw = value as Record<string, unknown>;
  return {
    enabled: raw.enabled === true,
    repo: readString(raw.repo),
    branchPrefix: readString(raw.branchPrefix) ?? defaults.branchPrefix,
    labels: readStringArray(raw.labels) ?? [...defaults.labels],
    draftDefault: typeof raw.draftDefault === "boolean" ? raw.draftDefault : defaults.draftDefault,
    allowedProposalPaths: readStringArray(raw.allowedProposalPaths) ?? [
      ...defaults.allowedProposalPaths,
    ],
    forbiddenPathGlobs: readStringArray(raw.forbiddenPathGlobs) ?? [...defaults.forbiddenPathGlobs],
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const result = value
    .map((item) => readString(item))
    .filter((item): item is string => typeof item === "string");
  return result.length > 0 ? result : undefined;
}

function readPositiveInt(value: unknown, defaultValue: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return defaultValue;
  }
  return Math.floor(value);
}
