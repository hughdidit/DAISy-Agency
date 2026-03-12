import { PayloadChunker, type MultimodalPart } from "./payload-chunker.js";

const DEFAULT_EMBEDDING_DIMENSIONS = 1_536;

function normalizeL2(vector: number[]): number[] {
  let magnitudeSquared = 0;
  for (const value of vector) {
    magnitudeSquared += value * value;
  }

  if (magnitudeSquared === 0) {
    return [...vector];
  }

  const magnitude = Math.sqrt(magnitudeSquared);
  return vector.map((value) => value / magnitude);
}

function meanPool(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error("Cannot mean-pool an empty embedding set");
  }

  const dimension = vectors[0].length;
  if (dimension === 0) {
    throw new Error("Embedding vectors must not be empty");
  }

  const pooled = new Array<number>(dimension).fill(0);
  for (const vector of vectors) {
    if (vector.length !== dimension) {
      throw new Error("Embedding vectors must all have the same dimensions for mean-pooling");
    }

    for (let i = 0; i < dimension; i += 1) {
      pooled[i] += vector[i];
    }
  }

  return pooled.map((value) => value / vectors.length);
}

function readEmbeddingValues(response: Record<string, unknown>): number[] | null {
  const candidateValues = [
    ((response.embedding as Record<string, unknown> | undefined)?.values as unknown),
    ((response.embeddings as Array<Record<string, unknown>> | undefined)?.[0]?.values as unknown),
  ];

  for (const values of candidateValues) {
    if (Array.isArray(values) && values.every((value) => typeof value === "number")) {
      return values;
    }
  }

  return null;
}

export class GeminiService {
  constructor(
    private readonly apiKey: string,
    private readonly embeddingModel: string,
    private readonly outputDimensionality = DEFAULT_EMBEDDING_DIMENSIONS,
  ) {}

  async embed(parts: MultimodalPart[]): Promise<number[]> {
    const batches = PayloadChunker.chunk(parts);
    const embeddings: number[][] = [];

    for (const batch of batches) {
      const embedding = await this.embedBatch(batch);
      embeddings.push(normalizeL2(embedding));
    }

    if (embeddings.length === 1) {
      return embeddings[0];
    }

    const pooled = meanPool(embeddings);
    return normalizeL2(pooled);
  }

  private async embedBatch(parts: MultimodalPart[]): Promise<number[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.embeddingModel}:embedContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          content: {
            parts,
          },
          outputDimensionality: this.outputDimensionality,
        }),
      },
    );

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `Gemini embedding request failed (${response.status}): ${responseText.slice(0, 400)}`,
      );
    }

    let payload: unknown;
    try {
      payload = responseText.length > 0 ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("Gemini embedding response was not valid JSON");
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Gemini embedding response body must be an object");
    }

    const values = readEmbeddingValues(payload as Record<string, unknown>);
    if (!values) {
      throw new Error("Gemini embedding response did not include embedding.values");
    }

    if (values.length !== this.outputDimensionality) {
      throw new Error(
        `Gemini embedding dimensionality mismatch: expected ${this.outputDimensionality}, got ${values.length}`,
      );
    }

    return values;
  }
}

export { meanPool, normalizeL2 };