export type MemoryConfig = {
  mcp:
    | {
        transport: "stdio";
        stdio: {
          command: string;
          args: string[];
          env?: Record<string, string>;
        };
      }
    | {
        transport: "sse";
        url: string;
      };
  voyage: {
    apiKey: string;
    embeddingModel: string;
    rerankModel: string;
  };
  database: {
    name: string;
    collection: string;
    indexName: string;
  };
  captureTriggers: string[];
  autoCapture?: boolean;
  autoRecall?: boolean;
};

export const MEMORY_CATEGORIES = ["preference", "fact", "decision", "entity", "other"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

const DEFAULT_TRANSPORT = "stdio" as const;
const DEFAULT_STDIO_COMMAND = "npx";
const DEFAULT_STDIO_ARGS = ["-y", "mongodb-mcp-server"];
const DEFAULT_EMBEDDING_MODEL = "voyage-3.5";
const DEFAULT_RERANK_MODEL = "rerank-2";
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

const VOYAGE_MODEL_DEFAULTS = {
  embedding: DEFAULT_EMBEDDING_MODEL,
  rerank: DEFAULT_RERANK_MODEL,
} as const;

const VOYAGE_EMBEDDING_DIMENSIONS: Record<string, number> = {
  "voyage-3": 1024,
  "voyage-3-large": 1024,
  "voyage-3-lite": 512,
  "voyage-3.5": 1024,
  "voyage-3.5-lite": 512,
  "voyage-code-3": 1024,
  "voyage-finance-2": 1024,
  "voyage-law-2": 1024,
  "voyage-multilingual-2": 1024,
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
  const dims = VOYAGE_EMBEDDING_DIMENSIONS[model];
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

function resolveStringRecordEnvVars(value: Record<string, unknown>): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "string") {
      throw new Error("mcp.stdio.env values must be strings");
    }
    resolved[key] = resolveEnvVars(raw);
  }
  return resolved;
}

function resolveEmbeddingModel(voyage: Record<string, unknown>): string {
  const model =
    typeof voyage.embeddingModel === "string"
      ? voyage.embeddingModel
      : VOYAGE_MODEL_DEFAULTS.embedding;
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
        "mcp",
        "voyage",
        "database",
        "captureTriggers",
        "autoCapture",
        "autoRecall",
      ],
      "memory config",
    );

    const mcp = cfg.mcp as Record<string, unknown> | undefined;
    if (!mcp || typeof mcp !== "object") {
      throw new Error("mcp is required");
    }
    assertAllowedKeys(mcp, ["transport", "stdio", "url"], "mcp config");
    const rawTransport = mcp.transport ?? DEFAULT_TRANSPORT;
    if (rawTransport !== "stdio" && rawTransport !== "sse") {
      throw new Error("mcp.transport must be \"stdio\" or \"sse\"");
    }
    const transport = rawTransport;

    // Only access mcp.stdio when transport is "stdio"
    let rawStdio: Record<string, unknown> = {};
    if (transport === "stdio") {
      rawStdio = (mcp.stdio as Record<string, unknown> | undefined) ?? {};
      if (mcp.stdio !== undefined) {
        assertAllowedKeys(rawStdio, ["command", "args", "env"], "mcp.stdio config");
      }
    }

    if (transport === "sse") {
      if (typeof mcp.url !== "string" || mcp.url.length === 0) {
        throw new Error("mcp.url is required when mcp.transport is \"sse\"");
      }
    }

    const voyage = cfg.voyage as Record<string, unknown> | undefined;
    if (!voyage || typeof voyage.apiKey !== "string") {
      throw new Error("voyage.apiKey is required");
    }
    assertAllowedKeys(voyage, ["apiKey", "embeddingModel", "rerankModel"], "voyage config");

    const database = cfg.database as Record<string, unknown> | undefined;
    if (database && typeof database !== "object") {
      throw new Error("database must be an object");
    }

    const rawStdioEnv = rawStdio.env as Record<string, unknown> | undefined;
    const connectionUri = rawStdioEnv?.MDB_MCP_CONNECTION_STRING;

    if (transport === "stdio" && (typeof connectionUri !== "string" || connectionUri.length === 0)) {
      throw new Error(
        "mcp.stdio.env.MDB_MCP_CONNECTION_STRING is required when mcp.transport is \"stdio\"",
      );
    }

    const embeddingModel = resolveEmbeddingModel(voyage);
    const rerankModel =
      typeof voyage.rerankModel === "string"
        ? voyage.rerankModel
        : VOYAGE_MODEL_DEFAULTS.rerank;

    if (typeof connectionUri === "string" && connectionUri.length > 0) {
      validateConnectionUriTls(resolveEnvVars(connectionUri));
    }

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

    const resolvedMcpEnv = rawStdioEnv
      ? resolveStringRecordEnvVars(rawStdioEnv)
      : undefined;

    const mcpResult: MemoryConfig["mcp"] =
      transport === "stdio"
        ? {
            transport: "stdio",
            stdio: {
              command:
                typeof rawStdio.command === "string" && rawStdio.command.length > 0
                  ? rawStdio.command
                  : DEFAULT_STDIO_COMMAND,
              args: Array.isArray(rawStdio.args)
                ? rawStdio.args.map((arg) => {
                    if (typeof arg !== "string") {
                      throw new Error("mcp.stdio.args must be an array of strings");
                    }
                    return arg;
                  })
                : DEFAULT_STDIO_ARGS,
              env: resolvedMcpEnv,
            },
          }
        : {
            transport: "sse",
            url: resolveEnvVars(String(mcp.url)),
          };

    return {
      mcp: mcpResult,
      voyage: {
        apiKey: resolveEnvVars(voyage.apiKey),
        embeddingModel,
        rerankModel,
      },
      database: {
        name:
          typeof database?.name === "string" ? database.name : DEFAULT_DATABASE_NAME,
        collection:
          typeof database?.collection === "string"
            ? database.collection
            : DEFAULT_COLLECTION_NAME,
        indexName:
          typeof database?.indexName === "string"
            ? database.indexName
            : DEFAULT_VECTOR_SEARCH_INDEX_NAME,
      },
      captureTriggers,
      autoCapture: cfg.autoCapture !== false,
      autoRecall: cfg.autoRecall !== false,
    };
  },
  uiHints: {
    "mcp.transport": {
      label: "MCP Transport",
      placeholder: DEFAULT_TRANSPORT,
      help: "Choose stdio for local MCP server or sse for remote endpoint",
    },
    "mcp.stdio.command": {
      label: "MCP Command",
      placeholder: DEFAULT_STDIO_COMMAND,
      help: "Executable used to launch MongoDB MCP server",
    },
    "mcp.stdio.args": {
      label: "MCP Command Args",
      placeholder: JSON.stringify(DEFAULT_STDIO_ARGS),
      advanced: true,
    },
    "mcp.stdio.env.MDB_MCP_CONNECTION_STRING": {
      label: "MongoDB Connection String",
      sensitive: true,
      placeholder: "${MONGODB_URI}",
      help: "Use MDB_MCP_CONNECTION_STRING to pass Atlas URI to MCP (supports ${MONGODB_URI})",
    },
    "mcp.url": {
      label: "MCP SSE URL",
      placeholder: "https://example.com/sse",
      help: "Required when mcp.transport is sse",
    },
    "voyage.apiKey": {
      label: "Voyage AI API Key",
      sensitive: true,
      placeholder: "pa-...",
      help: "API key for Voyage AI embeddings (or use ${VOYAGE_API_KEY})",
    },
    "voyage.embeddingModel": {
      label: "Embedding Model",
      placeholder: DEFAULT_EMBEDDING_MODEL,
      help: "Voyage AI embedding model to use",
    },
    "voyage.rerankModel": {
      label: "Rerank Model",
      placeholder: DEFAULT_RERANK_MODEL,
      advanced: true,
      help: "Optional Voyage rerank model for future ranking workflows",
    },
    "database.name": {
      label: "Database Name",
      placeholder: DEFAULT_DATABASE_NAME,
      advanced: true,
    },
    "database.collection": {
      label: "Collection Name",
      placeholder: DEFAULT_COLLECTION_NAME,
      advanced: true,
    },
    "database.indexName": {
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
