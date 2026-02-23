<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { requireApiKey, resolveApiKeyForProvider } from "../agents/model-auth.js";
import type { EmbeddingProvider, EmbeddingProviderOptions } from "./embeddings.js";
=======
import type { EmbeddingProvider, EmbeddingProviderOptions } from "./embeddings.js";
import { resolveRemoteEmbeddingBearerClient } from "./embeddings-remote-client.js";
import { fetchRemoteEmbeddingVectors } from "./embeddings-remote-fetch.js";
>>>>>>> 9bfd3ca19 (refactor(memory): consolidate embeddings and batch helpers)
=======
=======
import type { SsrFPolicy } from "../infra/net/ssrf.js";
<<<<<<< HEAD
>>>>>>> f87db7c62 (fix(memory): enforce guarded remote policy for embeddings)
import { resolveRemoteEmbeddingBearerClient } from "./embeddings-remote-client.js";
import { fetchRemoteEmbeddingVectors } from "./embeddings-remote-fetch.js";
=======
import {
  createRemoteEmbeddingProvider,
  resolveRemoteEmbeddingClient,
} from "./embeddings-remote-provider.js";
>>>>>>> 8af19ddc5 (refactor: extract shared dedupe helpers for runtime paths)
import type { EmbeddingProvider, EmbeddingProviderOptions } from "./embeddings.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { EmbeddingProvider, EmbeddingProviderOptions } from "./embeddings.js";
import { resolveRemoteEmbeddingBearerClient } from "./embeddings-remote-client.js";
import { fetchRemoteEmbeddingVectors } from "./embeddings-remote-fetch.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { resolveRemoteEmbeddingBearerClient } from "./embeddings-remote-client.js";
import { fetchRemoteEmbeddingVectors } from "./embeddings-remote-fetch.js";
import type { EmbeddingProvider, EmbeddingProviderOptions } from "./embeddings.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { EmbeddingProvider, EmbeddingProviderOptions } from "./embeddings.js";
import { resolveRemoteEmbeddingBearerClient } from "./embeddings-remote-client.js";
import { fetchRemoteEmbeddingVectors } from "./embeddings-remote-fetch.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { resolveRemoteEmbeddingBearerClient } from "./embeddings-remote-client.js";
import { fetchRemoteEmbeddingVectors } from "./embeddings-remote-fetch.js";
import type { EmbeddingProvider, EmbeddingProviderOptions } from "./embeddings.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

export type OpenAiEmbeddingClient = {
  baseUrl: string;
  headers: Record<string, string>;
  ssrfPolicy?: SsrFPolicy;
  model: string;
};

export const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const OPENAI_MAX_INPUT_TOKENS: Record<string, number> = {
  "text-embedding-3-small": 8192,
  "text-embedding-3-large": 8192,
  "text-embedding-ada-002": 8191,
};

export function normalizeOpenAiModel(model: string): string {
  const trimmed = model.trim();
  if (!trimmed) {
    return DEFAULT_OPENAI_EMBEDDING_MODEL;
  }
  if (trimmed.startsWith("openai/")) {
    return trimmed.slice("openai/".length);
  }
  return trimmed;
}

export async function createOpenAiEmbeddingProvider(
  options: EmbeddingProviderOptions,
): Promise<{ provider: EmbeddingProvider; client: OpenAiEmbeddingClient }> {
  const client = await resolveOpenAiEmbeddingClient(options);

  return {
    provider: createRemoteEmbeddingProvider({
      id: "openai",
      client,
      errorPrefix: "openai embeddings failed",
      maxInputTokens: OPENAI_MAX_INPUT_TOKENS[client.model],
    }),
    client,
  };
}

export async function resolveOpenAiEmbeddingClient(
  options: EmbeddingProviderOptions,
): Promise<OpenAiEmbeddingClient> {
  return await resolveRemoteEmbeddingClient({
    provider: "openai",
    options,
    defaultBaseUrl: DEFAULT_OPENAI_BASE_URL,
    normalizeModel: normalizeOpenAiModel,
  });
}
