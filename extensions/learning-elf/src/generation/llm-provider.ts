import type { LearningElfConfig } from "../../config.js";
import { CandidateGenomeSchema } from "../models/schemas.js";
import type { CandidateGenome, SourceRef } from "../models/types.js";
import { validateWithSchema } from "../models/validation.js";
import { assertNoSecrets } from "../security/secret-scanner.js";

export type LlmEvolutionRequest = {
  prompt: string;
  model: string;
  sourceRefs: SourceRef[];
  maxCandidates: number;
};

export type LlmEvolutionResult = {
  provider: "fixture" | "live";
  model: string;
  prompt: string;
  sourceRefs: SourceRef[];
  candidates: CandidateGenome[];
  metadata: {
    generatedAt: string;
    tokenBudget?: number;
  };
};

export interface LlmEvolutionProvider {
  generateCandidates(request: LlmEvolutionRequest): Promise<LlmEvolutionResult>;
}

export class DisabledLlmEvolutionProvider implements LlmEvolutionProvider {
  async generateCandidates(): Promise<LlmEvolutionResult> {
    throw new Error("Live LLM evolution is disabled; enable llmEvolution explicitly to use it");
  }
}

export class FixtureLlmEvolutionProvider implements LlmEvolutionProvider {
  constructor(private readonly candidates: CandidateGenome[]) {}

  async generateCandidates(request: LlmEvolutionRequest): Promise<LlmEvolutionResult> {
    const candidates = this.candidates.slice(0, request.maxCandidates);
    assertNoSecrets({ prompt: request.prompt, candidates });
    return {
      provider: "fixture",
      model: request.model,
      prompt: request.prompt,
      sourceRefs: request.sourceRefs,
      candidates,
      metadata: {
        generatedAt: "2026-01-01T00:00:00.000Z",
      },
    };
  }
}

export class ConfiguredLiveLlmEvolutionProvider implements LlmEvolutionProvider {
  constructor(
    private readonly config: NonNullable<LearningElfConfig["llmEvolution"]>,
    private readonly delegate: LlmEvolutionProvider,
  ) {}

  async generateCandidates(request: LlmEvolutionRequest): Promise<LlmEvolutionResult> {
    if (!this.config.enabled || this.config.provider !== "live") {
      throw new Error("Live LLM evolution is disabled by configuration");
    }
    if (!this.config.modelAllowlist.includes(request.model)) {
      throw new Error(`LLM evolution model is not allowlisted: ${request.model}`);
    }
    if (request.maxCandidates > this.config.maxCandidateCount) {
      throw new Error(
        `LLM evolution candidate count exceeds configured maximum ${this.config.maxCandidateCount}`,
      );
    }
    const result = await this.delegate.generateCandidates(request);
    assertNoSecrets(result);
    return {
      ...result,
      provider: "live",
      metadata: {
        ...result.metadata,
        tokenBudget: this.config.tokenBudget,
      },
    };
  }
}

export class HttpLlmEvolutionProvider implements LlmEvolutionProvider {
  constructor(private readonly config: NonNullable<LearningElfConfig["llmEvolution"]>) {}

  async generateCandidates(request: LlmEvolutionRequest): Promise<LlmEvolutionResult> {
    if (!this.config.endpoint) {
      throw new Error("Live LLM evolution requires llmEvolution.endpoint");
    }
    const apiKeyEnv = this.config.apiKeyEnv ?? "OPENAI_API_KEY";
    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Live LLM evolution requires ${apiKeyEnv}`);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: request.model,
          messages: [
            {
              role: "system",
              content:
                'Return JSON only: {"candidates":[CandidateGenome,...]}. ' +
                "Do not include secrets, direct writes, approvals, deploys, or policy bypasses.",
            },
            {
              role: "user",
              content: request.prompt,
            },
          ],
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`LLM endpoint returned ${response.status}`);
      }
      const payload = (await response.json()) as Record<string, unknown>;
      const content = extractLlmJsonContent(payload);
      assertNoSecrets(content);
      const candidates = readCandidates(content).slice(0, request.maxCandidates);
      return {
        provider: "live",
        model: request.model,
        prompt: request.prompt,
        sourceRefs: request.sourceRefs,
        candidates,
        metadata: {
          generatedAt: new Date().toISOString(),
          tokenBudget: this.config.tokenBudget,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createLlmEvolutionProvider(config: LearningElfConfig): LlmEvolutionProvider {
  if (!config.llmEvolution?.enabled) {
    return new DisabledLlmEvolutionProvider();
  }
  if (config.llmEvolution.provider === "fixture") {
    return new FixtureLlmEvolutionProvider([]);
  }
  if (config.llmEvolution.provider === "live") {
    return new ConfiguredLiveLlmEvolutionProvider(
      config.llmEvolution,
      new HttpLlmEvolutionProvider(config.llmEvolution),
    );
  }
  return new DisabledLlmEvolutionProvider();
}

function extractLlmJsonContent(payload: Record<string, unknown>): unknown {
  const directCandidates = payload.candidates;
  if (Array.isArray(directCandidates)) {
    return payload;
  }
  const choices = payload.choices;
  if (Array.isArray(choices)) {
    const first = choices[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const message = (first as Record<string, unknown>).message;
      if (message && typeof message === "object" && !Array.isArray(message)) {
        const content = (message as Record<string, unknown>).content;
        if (typeof content === "string") {
          return JSON.parse(content) as unknown;
        }
      }
    }
  }
  return payload;
}

function readCandidates(value: unknown): CandidateGenome[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("LLM evolution response must be an object");
  }
  const candidates = (value as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) {
    throw new Error("LLM evolution response must include candidates[]");
  }
  return candidates.map((candidate, index) => {
    const validation = validateWithSchema<CandidateGenome>(CandidateGenomeSchema, candidate);
    if (!validation.ok) {
      throw new Error(
        `LLM candidate ${index} failed schema validation: ${validation.errors.join("; ")}`,
      );
    }
    return validation.value;
  });
}
