import { PayloadChunker, type MultimodalPart } from "./payload-chunker.js";

const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2-preview";
const DEFAULT_OUTPUT_DIMENSIONALITY = 1536;
const GEMINI_MODELS_API = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiEmbedResponse = {
  embedding?: {
    values?: number[];
  };
  embeddings?: Array<{
    values?: number[];
    embedding?: {
      values?: number[];
    };
  }>;
};

type JsonAuthCredential = {
  token?: unknown;
  access_token?: unknown;
};

function isFiniteNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function l2Normalize(vector: number[]): number[] {
  const sumSquares = vector.reduce((total, value) => total + value * value, 0);
  const magnitude = Math.sqrt(sumSquares);

  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    throw new Error("Cannot normalize zero-length embedding vector");
  }

  return vector.map((value) => value / magnitude);
}

function meanPool(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error("Cannot aggregate empty embedding list");
  }

  const dims = vectors[0]?.length ?? 0;
  if (dims === 0) {
    throw new Error("Embedding vectors must be non-empty");
  }

  const totals = new Array<number>(dims).fill(0);

  for (const vector of vectors) {
    if (vector.length !== dims) {
      throw new Error("Embedding vectors must have consistent dimensionality");
    }

    for (let i = 0; i < dims; i += 1) {
      totals[i] += vector[i];
    }
  }

  return totals.map((value) => value / vectors.length);
}

function extractEmbeddingValues(payload: GeminiEmbedResponse): number[] {
  if (isFiniteNumberArray(payload.embedding?.values)) {
    return payload.embedding.values;
  }

  if (Array.isArray(payload.embeddings) && payload.embeddings.length > 0) {
    const first = payload.embeddings[0];
    if (isFiniteNumberArray(first?.values)) {
      return first.values;
    }
    if (isFiniteNumberArray(first?.embedding?.values)) {
      return first.embedding.values;
    }
  }

  throw new Error("Gemini embedding response did not include embedding values");
}

function toGeminiApiPart(part: MultimodalPart): Record<string, unknown> {
  if ("text" in part) {
    return { text: part.text };
  }

  return {
    inlineData: {
      mimeType: part.inlineData.mimeType,
      data: part.inlineData.data,
    },
  };
}

function parseAuthTokenJson(rawApiKey: string): string | null {
  try {
    const parsed = JSON.parse(rawApiKey) as JsonAuthCredential;
    const tokenValue =
      typeof parsed.token === "string"
        ? parsed.token.trim()
        : typeof parsed.access_token === "string"
          ? parsed.access_token.trim()
          : "";

    return tokenValue.length > 0 ? tokenValue : null;
  } catch {
    return null;
  }
}

function buildGeminiAuthHeaders(rawApiKey: string): Record<string, string> {
  const oauthToken = parseAuthTokenJson(rawApiKey);
  if (oauthToken) {
    return {
      Authorization: `Bearer ${oauthToken}`,
    };
  }

  return {
    "x-goog-api-key": rawApiKey,
  };
}

async function safeReadErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || "no response body";
  } catch {
    return "failed to read response body";
  }
}

export class GeminiService {
  private readonly authHeaders: Record<string, string>;

  constructor(
    apiKey: string,
    private readonly embeddingModel = DEFAULT_EMBEDDING_MODEL,
    private readonly outputDimensionality = DEFAULT_OUTPUT_DIMENSIONALITY,
  ) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error("Gemini API key is required");
    }

    this.authHeaders = buildGeminiAuthHeaders(apiKey.trim());
  }

  async embed(parts: MultimodalPart[]): Promise<number[]> {
    const chunks = PayloadChunker.chunk(parts);
    const vectors: number[][] = [];

    for (const chunk of chunks) {
      const vector = await this.embedChunk(chunk);
      vectors.push(vector);
    }

    if (vectors.length === 1) {
      return vectors[0];
    }

    return l2Normalize(meanPool(vectors));
  }

  private async embedChunk(parts: MultimodalPart[]): Promise<number[]> {
    const endpoint = `${GEMINI_MODELS_API}/${this.embeddingModel}:embedContent`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.authHeaders,
      },
      body: JSON.stringify({
        content: {
          parts: parts.map(toGeminiApiPart),
        },
        taskType: "SEMANTIC_SIMILARITY",
        outputDimensionality: this.outputDimensionality,
      }),
    });

    if (!response.ok) {
      const details = await safeReadErrorBody(response);
      throw new Error(`Gemini embedding request failed (${response.status}): ${details}`);
    }

    const payload = (await response.json()) as GeminiEmbedResponse;
    const values = extractEmbeddingValues(payload);

    if (values.length !== this.outputDimensionality) {
      throw new Error(
        `Gemini embedding dimensionality mismatch: expected ${this.outputDimensionality}, received ${values.length}`,
      );
    }

    return l2Normalize(values);
  }
}
