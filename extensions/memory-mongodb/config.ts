export type MemoryConfig = {
  mcp:
    | {
        transport: "stdio";
        stdio: {
          command: string;
          args: string[];
          env: { MDB_MCP_CONNECTION_STRING: string } & Record<string, string>;
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
    const transport = (mcp.transport ?? DEFAULT_TRANSPORT) as string;
    if (transport !== "stdio" && transport !== "sse") {
      throw new Error("mcp.transport must be \"stdio\" or \"sse\"");
    }

    let rawStdio: Record<string, unknown> = {};
    if (mcp.stdio !== undefined) {
      if (typeof mcp.stdio !== "object" || mcp.stdio === null || Array.isArray(mcp.stdio)) {
        throw new Error("mcp.stdio must be an object");
      }
      rawStdio = mcp.stdio as Record<string, unknown>;
      assertAllowedKeys(rawStdio, ["command", "args", "env"], "mcp.stdio config");
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

    return {
      mcp:
        transport === "stdio"
          ? {
              transport: "stdio" as const,
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
                env: resolvedMcpEnv as { MDB_MCP_CONNECTION_STRING: string } & Record<
                  string,
                  string
                >,
              },
            }
          : {
              transport: "sse" as const,
              url: resolveEnvVars(String(mcp.url)),
            },
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
