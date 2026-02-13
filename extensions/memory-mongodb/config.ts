export type MemoryConfig = {
  embedding: {
    provider: "openai";
    model?: string;
    apiKey: string;
  };
  connectionUri: string;
  databaseName: string;
  collectionName: string;
  vectorSearchIndexName: string;
  captureTriggers: string[];
  autoCapture?: boolean;
  autoRecall?: boolean;
};

export const MEMORY_CATEGORIES = ["preference", "fact", "decision", "entity", "other"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DATABASE_NAME = "daisy_memory";
const DEFAULT_COLLECTION_NAME = "memories";
const DEFAULT_VECTOR_SEARCH_INDEX_NAME = "vector_index";

export const DEFAULT_CAPTURE_TRIGGERS = [
  "remember",
  "prefer",
  "decided|will use",
  "\\+\\d{10,}",
  "[\\w.-]+@[\\w.-]+\\.\\w+",
  "my\\s+\\w+\\s+is|is\\s+my",
  "i (like|prefer|hate|love|want|need)",
  "always|never|important",
];

const EMBEDDING_DIMENSIONS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
};

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: string[],
  label: string,
) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length === 0) return;
  throw new Error(`${label} has unknown keys: ${unknown.join(", ")}`);
}

export function vectorDimsForModel(model: string): number {
  const dims = EMBEDDING_DIMENSIONS[model];
  if (!dims) {
    throw new Error(`Unsupported embedding model: ${model}`);
  }
  return dims;
}

function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, envVar) => {
    const envValue = process.env[envVar];
    if (!envValue) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
    return envValue;
  });
}

function resolveEmbeddingModel(embedding: Record<string, unknown>): string {
  const model = typeof embedding.model === "string" ? embedding.model : DEFAULT_MODEL;
  vectorDimsForModel(model);
  return model;
}

const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Extract the hostname from a single MongoDB host entry, handling
 * bracketed IPv6 addresses (e.g., `[::1]:27017` → `::1`).
 */
function extractHostname(hostEntry: string): string {
  const trimmed = hostEntry.trim();
  if (trimmed.startsWith("[")) {
    // Bracketed IPv6: [::1]:27017
    const closeBracket = trimmed.indexOf("]");
    if (closeBracket > 0) {
      return trimmed.slice(1, closeBracket).toLowerCase();
    }
  }
  // Plain host or IPv4: strip port
  return trimmed.split(":")[0].toLowerCase();
}

/**
 * Validate that the connection URI enforces TLS for non-localhost hosts.
 * - `mongodb+srv://` always uses TLS (enforced by the protocol).
 * - `mongodb://` requires `tls=true` in query params for non-localhost hosts.
 * - Rejects `tlsInsecure=true` and `tlsAllowInvalidCertificates=true`.
 * - Checks ALL hosts in comma-separated replica set URIs.
 */
function validateConnectionUriTls(uri: string): void {
  // Reject insecure TLS options in any URI scheme
  const qIdx = uri.indexOf("?");
  if (qIdx >= 0) {
    const params = new URLSearchParams(uri.slice(qIdx + 1));
    if (params.get("tlsInsecure") === "true") {
      throw new Error(
        "connectionUri sets tlsInsecure=true, which disables certificate validation. Remove this option.",
      );
    }
    if (params.get("tlsAllowInvalidCertificates") === "true") {
      throw new Error(
        "connectionUri sets tlsAllowInvalidCertificates=true, which disables certificate validation. Remove this option.",
      );
    }
  }

  if (uri.startsWith("mongodb+srv://")) return;

  if (!uri.startsWith("mongodb://")) {
    throw new Error("connectionUri must start with mongodb:// or mongodb+srv://");
  }

  // Extract host portion (between :// and the next / or end)
  const afterScheme = uri.slice("mongodb://".length);
  // Host is between optional userinfo@ and the next /
  const atIdx = afterScheme.indexOf("@");
  const hostPart = atIdx >= 0 ? afterScheme.slice(atIdx + 1) : afterScheme;
  const slashIdx = hostPart.indexOf("/");
  const hostSection = slashIdx >= 0 ? hostPart.slice(0, slashIdx) : hostPart;

  // Check ALL hosts in comma-separated replica set URIs
  const hosts = hostSection.split(",");
  const allLocalhost = hosts.every((h) => LOCALHOST_NAMES.has(extractHostname(h)));

  if (allLocalhost) return;

  // At least one remote host — require TLS
  if (qIdx < 0) {
    throw new Error(
      "connectionUri uses plain mongodb:// to a remote host without TLS. " +
        "Use mongodb+srv:// (recommended) or add ?tls=true to the connection string.",
    );
  }

  const params = new URLSearchParams(uri.slice(qIdx + 1));
  const tlsValue = params.get("tls") ?? params.get("ssl");

  if (tlsValue !== "true") {
    throw new Error(
      "connectionUri uses plain mongodb:// to a remote host without TLS. " +
        "Use mongodb+srv:// (recommended) or add tls=true to the connection string.",
    );
  }
}

export const memoryConfigSchema = {
  parse(value: unknown): MemoryConfig {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("memory config required");
    }
    const cfg = value as Record<string, unknown>;
    assertAllowedKeys(
      cfg,
      [
        "embedding",
        "connectionUri",
        "databaseName",
        "collectionName",
        "vectorSearchIndexName",
        "captureTriggers",
        "autoCapture",
        "autoRecall",
      ],
      "memory config",
    );

    const embedding = cfg.embedding as Record<string, unknown> | undefined;
    if (!embedding || typeof embedding.apiKey !== "string") {
      throw new Error("embedding.apiKey is required");
    }
    assertAllowedKeys(embedding, ["apiKey", "model"], "embedding config");

    if (typeof cfg.connectionUri !== "string" || cfg.connectionUri.length === 0) {
      throw new Error("connectionUri is required");
    }

    const model = resolveEmbeddingModel(embedding);
    const resolvedUri = resolveEnvVars(cfg.connectionUri);

    validateConnectionUriTls(resolvedUri);

    // Validate and compile capture triggers
    const rawTriggers = Array.isArray(cfg.captureTriggers)
      ? cfg.captureTriggers
      : DEFAULT_CAPTURE_TRIGGERS;

    const captureTriggers: string[] = [];
    for (const t of rawTriggers) {
      if (typeof t !== "string") {
        throw new Error("captureTriggers must be an array of regex strings");
      }
      // Validate that each string is a valid regex
      try {
        new RegExp(t, "i");
      } catch {
        throw new Error(`Invalid captureTrigger regex: ${t}`);
      }
      captureTriggers.push(t);
    }

    return {
      embedding: {
        provider: "openai",
        model,
        apiKey: resolveEnvVars(embedding.apiKey),
      },
      connectionUri: resolvedUri,
      databaseName:
        typeof cfg.databaseName === "string"
          ? cfg.databaseName
          : DEFAULT_DATABASE_NAME,
      collectionName:
        typeof cfg.collectionName === "string"
          ? cfg.collectionName
          : DEFAULT_COLLECTION_NAME,
      vectorSearchIndexName:
        typeof cfg.vectorSearchIndexName === "string"
          ? cfg.vectorSearchIndexName
          : DEFAULT_VECTOR_SEARCH_INDEX_NAME,
      captureTriggers,
      autoCapture: cfg.autoCapture !== false,
      autoRecall: cfg.autoRecall !== false,
    };
  },
  uiHints: {
    "embedding.apiKey": {
      label: "OpenAI API Key",
      sensitive: true,
      placeholder: "sk-proj-...",
      help: "API key for OpenAI embeddings (or use ${OPENAI_API_KEY})",
    },
    "embedding.model": {
      label: "Embedding Model",
      placeholder: DEFAULT_MODEL,
      help: "OpenAI embedding model to use",
    },
    connectionUri: {
      label: "MongoDB Connection URI",
      sensitive: true,
      placeholder: "${MONGODB_URI}",
      help: "MongoDB Atlas connection string (use ${MONGODB_URI} env var)",
    },
    databaseName: {
      label: "Database Name",
      placeholder: DEFAULT_DATABASE_NAME,
      advanced: true,
    },
    collectionName: {
      label: "Collection Name",
      placeholder: DEFAULT_COLLECTION_NAME,
      advanced: true,
    },
    vectorSearchIndexName: {
      label: "Vector Search Index Name",
      placeholder: DEFAULT_VECTOR_SEARCH_INDEX_NAME,
      advanced: true,
    },
    captureTriggers: {
      label: "Capture Triggers",
      advanced: true,
      help: "Array of regex patterns that trigger auto-capture (case-insensitive)",
    },
    autoCapture: {
      label: "Auto-Capture",
      help: "Automatically capture important information from conversations",
    },
    autoRecall: {
      label: "Auto-Recall",
      help: "Automatically inject relevant memories into context",
    },
  },
};
