import VoyageAI from "voyageai";

type RerankResult = {
  index: number;
  score: number;
};

type EmbedResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
};

type RerankResponse = {
  data?: unknown[];
};

type VoyageClient = {
  embed: (request: { model: string; input: string }) => Promise<EmbedResponse>;
  rerank: (request: {
    model: string;
    query: string;
    documents: string[];
    topK: number;
  }) => Promise<RerankResponse>;
};

type VoyageConstructor = new (options: { apiKey: string }) => VoyageClient;

export class VoyageService {
  private client: VoyageClient;

  constructor(
    apiKey: string,
    private readonly embeddingModel: string,
    private readonly rerankModel: string,
  ) {
    const VoyageClientCtor = VoyageAI as unknown as VoyageConstructor;
    this.client = new VoyageClientCtor({ apiKey });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embed({
      model: this.embeddingModel,
      input: text,
    });

    const embedding = response.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error(`Voyage did not return an embedding for model ${this.embeddingModel}`);
    }

    return embedding;
  }

  async rerank(query: string, documents: string[], topK: number): Promise<RerankResult[]> {
    if (documents.length === 0) {
      return [];
    }

    const response = await this.client.rerank({
      model: this.rerankModel,
      query,
      documents,
      topK,
    });

    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows
      .map((row: unknown) => {
        const index = this.readIndex(row);
        const score = this.readScore(row);
        if (index === null || score === null) {
          return null;
        }
        return { index, score };
      })
      .filter((row): row is RerankResult => row !== null);
  }

  private readIndex(row: unknown): number | null {
    if (!row || typeof row !== "object") {
      return null;
    }
    const record = row as Record<string, unknown>;
    const candidates = [record.index, record.documentIndex, record.document_index];
    for (const candidate of candidates) {
      if (typeof candidate === "number") {
        return candidate;
      }
    }
    return null;
  }

  private readScore(row: unknown): number | null {
    if (!row || typeof row !== "object") {
      return null;
    }
    const record = row as Record<string, unknown>;
    const candidates = [record.relevanceScore, record.relevance_score, record.score];
    for (const candidate of candidates) {
      if (typeof candidate === "number") {
        return candidate;
      }
    }
    return null;
  }
}
