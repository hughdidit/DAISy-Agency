import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

type StdioEnv = {
  MDB_MCP_CONNECTION_STRING: string;
  NODE_EXTRA_CA_CERTS?: string;
  NODE_USE_SYSTEM_CA?: string;
  SSL_CERT_DIR?: string;
  SSL_CERT_FILE?: string;
};

export type MemoryConfig = {
  mcp:
    | {
        transport: "stdio";
        stdio: {
          allowCustomLauncher?: boolean;
          command: string;
          args: string[];
          env: StdioEnv;
        };
      }
    | {
        transport: "sse";
        url: string;
      };
  gemini: {
    apiKey: string;
    embeddingModel: string;
  };
  database: {
    name: string;
    collection: string;
    indexName: string;
  };
  retrieval: {
    minScore: number;
    vectorLimit: number;
    numCandidatesMultiplier: number;
  };
  captureTriggers: string[];
  autoCapture?: boolean;
  autoRecall?: boolean;
};

export const MEMORY_CATEGORIES = ["preference", "fact", "decision", "entity", "other"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

const DEFAULT_TRANSPORT = "stdio" as const;
const DEFAULT_STDIO_COMMAND = process.execPath;
const DEFAULT_STDIO_COMMAND_PLACEHOLDER = "bundled default";
const DEFAULT_STDIO_ARGS_PLACEHOLDER = '["<bundled mongodb-mcp-server entrypoint>"]';
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2-preview";
const DEFAULT_DATABASE_NAME = "daisy_memory";
const DEFAULT_COLLECTION_NAME = "memories";
const DEFAULT_VECTOR_SEARCH_INDEX_NAME = "vector_index";
const DEFAULT_MIN_SCORE = 0.1;
const DEFAULT_VECTOR_LIMIT = 8;
const DEFAULT_NUM_CANDIDATES_MULTIPLIER = 10;
export const BUNDLED_MCP_SERVER_PACKAGE = "mongodb-mcp-server";
export const BUNDLED_MCP_SERVER_VERSION = "1.2.0";

const require = createRequire(import.meta.url);

const STDIO_ENV_OVERRIDE_ALLOWLIST = [
  "MDB_MCP_CONNECTION_STRING",
  "NODE_EXTRA_CA_CERTS",
  "NODE_USE_SYSTEM_CA",
  "SSL_CERT_DIR",
  "SSL_CERT_FILE",
] as const;

const DISALLOWED_STDIO_ENV_KEYS = new Set([
  "NODE_OPTIONS",
  "NODE_PATH",
  "TS_NODE_PROJECT",
  "TSX_TSCONFIG_PATH",
]);

const FORBIDDEN_CUSTOM_LAUNCHERS = new Set([
  "bash",
  "cmd",
  "dash",
  "fish",
  "npm",
  "npx",
  "pnpm",
  "powershell",
  "pwsh",
  "sh",
  "yarn",
  "zsh",
]);

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

const GEMINI_EMBEDDING_DIMENSIONS: Record<string, number> = {
  "gemini-embedding-2-preview": 1536,
};

export function resolveBundledMongoMcpServerEntrypoint(): string {
  try {
    const packageMainPath = require.resolve(BUNDLED_MCP_SERVER_PACKAGE);
    const packageRoot = path.resolve(path.dirname(packageMainPath), "..", "..");
    const packageJsonPath = path.join(packageRoot, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      version?: string;
      bin?: string | Record<string, string>;
    };
    if (packageJson.version !== BUNDLED_MCP_SERVER_VERSION) {
      throw new Error(
        `unexpected mongodb-mcp-server version: expected ${BUNDLED_MCP_SERVER_VERSION}, got ${packageJson.version ?? "unknown"}`,
      );
    }
    const rawBin =
      typeof packageJson.bin === "string"
        ? packageJson.bin
        : packageJson.bin?.[BUNDLED_MCP_SERVER_PACKAGE];

    if (typeof rawBin !== "string" || rawBin.length === 0) {
      throw new Error("missing mongodb-mcp-server bin entry");
    }

    const entrypoint = path.join(packageRoot, rawBin);
    if (!fs.existsSync(entrypoint)) {
      throw new Error("bundled mongodb-mcp-server entrypoint not found");
    }

    return entrypoint;
  } catch (error) {
    const reason =
      error instanceof Error && error.message ? ` Resolution failed: ${error.message}` : "";
    throw new Error(
      `Bundled MongoDB MCP server (${BUNDLED_MCP_SERVER_PACKAGE}@${BUNDLED_MCP_SERVER_VERSION}) ` +
        "is not installed or could not be resolved. " +
        "Install the bundled dependency or set mcp.stdio.command and mcp.stdio.args explicitly." +
        reason,
    );
  }
}

export function resolveBundledMongoMcpServerArgs(): string[] {
  return [resolveBundledMongoMcpServerEntrypoint()];
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: string[], label: string) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new Error(`${label} has unknown keys: ${unknown.join(", ")}`);
  }
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

function isAbsoluteFilePath(value: string): boolean {
  return path.posix.isAbsolute(value) || path.win32.isAbsolute(value);
}

function executableBasename(value: string): string {
  const normalized = value.replace(/[\\/]+$/, "").replace(/\\/g, "/");
  const basename = path.posix.basename(normalized);
  return basename.replace(/\.(bat|cmd|exe|ps1)$/i, "").toLowerCase();
}

function validateStdioEnvKeys(rawEnv: Record<string, unknown> | undefined): void {
  if (!rawEnv) {
    return;
  }

  const disallowed = Object.keys(rawEnv).filter((key) =>
    DISALLOWED_STDIO_ENV_KEYS.has(key.toUpperCase()),
  );
  if (disallowed.length > 0) {
    throw new Error(
      `mcp.stdio.env has disallowed keys: ${disallowed.join(", ")}. ` +
        "Runtime-mutating Node or tsx env is not allowed for the MongoDB MCP child.",
    );
  }

  assertAllowedKeys(rawEnv, [...STDIO_ENV_OVERRIDE_ALLOWLIST], "mcp.stdio.env");
}

function validateCustomLauncher(command: string, args: string[]): void {
  if (!isAbsoluteFilePath(command)) {
    throw new Error(
      "mcp.stdio.command must be an absolute path when custom launcher overrides are enabled",
    );
  }

  if (FORBIDDEN_CUSTOM_LAUNCHERS.has(executableBasename(command))) {
    throw new Error(
      "mcp.stdio.command cannot use a shell or package-manager launcher. " +
        "Use the bundled default or an absolute executable path.",
    );
  }

  if (args.length > 0) {
    const firstArg = args[0];
    if (firstArg.startsWith("-")) {
      throw new Error(
        "mcp.stdio.args cannot start with runtime flags when custom launcher overrides are enabled. " +
          "Provide an absolute entrypoint path instead.",
      );
    }
    if (!isAbsoluteFilePath(firstArg)) {
      throw new Error(
        "mcp.stdio.args[0] must be an absolute entrypoint path when custom launcher overrides are enabled",
      );
    }
  }
}

function parsePositiveInt(value: unknown, label: string, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return Math.floor(value);
}

function parseScore(value: unknown, label: string, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be a number between 0 and 1`);
  }
  return value;
}

export function vectorDimsForModel(model: string): number {
  const dims = GEMINI_EMBEDDING_DIMENSIONS[model];
  if (!dims) {
    throw new Error(`Unsupported embedding model: ${model}`);
  }
  return dims;
}

const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function extractHostname(hostEntry: string): string {
  const trimmed = hostEntry.trim();
  if (trimmed.startsWith("[")) {
    const closeBracket = trimmed.indexOf("]");
    if (closeBracket > 0) {
      return trimmed.slice(1, closeBracket).toLowerCase();
    }
  }
  return trimmed.split(":")[0].toLowerCase();
}

function validateConnectionUriTls(uri: string): void {
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

  if (uri.startsWith("mongodb+srv://")) {
    return;
  }

  if (!uri.startsWith("mongodb://")) {
    throw new Error("connectionUri must start with mongodb:// or mongodb+srv://");
  }

  const afterScheme = uri.slice("mongodb://".length);
  const atIdx = afterScheme.indexOf("@");
  const hostPart = atIdx >= 0 ? afterScheme.slice(atIdx + 1) : afterScheme;
  const slashIdx = hostPart.indexOf("/");
  const hostSection = slashIdx >= 0 ? hostPart.slice(0, slashIdx) : hostPart;
  const hosts = hostSection.split(",");
  const allLocalhost = hosts.every((entry) => LOCALHOST_NAMES.has(extractHostname(entry)));
  if (allLocalhost) {
    return;
  }

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

function parseCaptureTriggers(rawTriggers: unknown): string[] {
  const triggerValues = Array.isArray(rawTriggers) ? rawTriggers : DEFAULT_CAPTURE_TRIGGERS;
  const triggers: string[] = [];

  for (const trigger of triggerValues) {
    if (typeof trigger !== "string") {
      throw new Error("captureTriggers must be an array of regex strings");
    }
    try {
      new RegExp(trigger, "i");
    } catch {
      throw new Error(`Invalid captureTrigger regex: ${trigger}`);
    }
    triggers.push(trigger);
  }

  return triggers;
}

export const memoryConfigSchema = {
  parse(value: unknown): MemoryConfig {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("memory config required");
    }

    const cfg = value as Record<string, unknown>;
    assertAllowedKeys(
      cfg,
      ["mcp", "gemini", "database", "retrieval", "captureTriggers", "autoCapture", "autoRecall"],
      "memory config",
    );

    const mcp = cfg.mcp as Record<string, unknown> | undefined;
    if (!mcp || typeof mcp !== "object") {
      throw new Error("mcp is required");
    }
    assertAllowedKeys(mcp, ["transport", "stdio", "url"], "mcp config");

    const transport = (mcp.transport ?? DEFAULT_TRANSPORT) as string;
    if (transport !== "stdio" && transport !== "sse") {
      throw new Error('mcp.transport must be "stdio" or "sse"');
    }

    let rawStdio: Record<string, unknown> = {};
    if (mcp.stdio !== undefined) {
      if (typeof mcp.stdio !== "object" || mcp.stdio === null || Array.isArray(mcp.stdio)) {
        throw new Error("mcp.stdio must be an object");
      }
      rawStdio = mcp.stdio as Record<string, unknown>;
      assertAllowedKeys(
        rawStdio,
        ["allowCustomLauncher", "command", "args", "env"],
        "mcp.stdio config",
      );
    }

    if (transport === "sse") {
      if (typeof mcp.url !== "string" || mcp.url.length === 0) {
        throw new Error('mcp.url is required when mcp.transport is "sse"');
      }
    }

    const gemini = cfg.gemini as Record<string, unknown> | undefined;
    if (!gemini || typeof gemini.apiKey !== "string") {
      throw new Error("gemini.apiKey is required");
    }
    assertAllowedKeys(gemini, ["apiKey", "embeddingModel"], "gemini config");

    const embeddingModel =
      typeof gemini.embeddingModel === "string" ? gemini.embeddingModel : DEFAULT_EMBEDDING_MODEL;
    vectorDimsForModel(embeddingModel);

    const database = cfg.database as Record<string, unknown> | undefined;
    if (database && typeof database !== "object") {
      throw new Error("database must be an object");
    }
    if (database) {
      assertAllowedKeys(database, ["name", "collection", "indexName"], "database config");
    }

    const retrieval = cfg.retrieval as Record<string, unknown> | undefined;
    if (retrieval && typeof retrieval !== "object") {
      throw new Error("retrieval must be an object");
    }
    if (retrieval) {
      assertAllowedKeys(
        retrieval,
        ["minScore", "vectorLimit", "numCandidatesMultiplier"],
        "retrieval config",
      );
    }

    let parsedMcp: MemoryConfig["mcp"];
    if (transport === "stdio") {
      if (
        rawStdio.allowCustomLauncher !== undefined &&
        typeof rawStdio.allowCustomLauncher !== "boolean"
      ) {
        throw new Error("mcp.stdio.allowCustomLauncher must be a boolean");
      }

      if (rawStdio.command !== undefined && typeof rawStdio.command !== "string") {
        throw new Error("mcp.stdio.command must be a string");
      }

      if (rawStdio.args !== undefined && !Array.isArray(rawStdio.args)) {
        throw new Error("mcp.stdio.args must be an array of strings");
      }

      const rawStdioEnvValue = rawStdio.env;
      if (
        rawStdioEnvValue !== undefined &&
        (typeof rawStdioEnvValue !== "object" ||
          rawStdioEnvValue === null ||
          Array.isArray(rawStdioEnvValue))
      ) {
        throw new Error("mcp.stdio.env must be an object");
      }

      const rawStdioEnv = rawStdioEnvValue as Record<string, unknown> | undefined;
      validateStdioEnvKeys(rawStdioEnv);
      const connectionUri = rawStdioEnv?.MDB_MCP_CONNECTION_STRING;

      if (!rawStdioEnv || typeof connectionUri !== "string" || connectionUri.length === 0) {
        throw new Error(
          'mcp.stdio.env.MDB_MCP_CONNECTION_STRING is required when mcp.transport is "stdio"',
        );
      }

      try {
        validateConnectionUriTls(resolveEnvVars(connectionUri));
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(
            err.message.replace(/connectionUri/g, "mcp.stdio.env.MDB_MCP_CONNECTION_STRING"),
          );
        }
        throw err;
      }

      const rawStdioArgs = rawStdio.args;
      const stdioArgs =
        rawStdioArgs !== undefined
          ? rawStdioArgs.map((arg) => {
              if (typeof arg !== "string") {
                throw new Error("mcp.stdio.args must be an array of strings");
              }
              return arg;
            })
          : resolveBundledMongoMcpServerArgs();
      const hasCustomLauncherOverrides =
        rawStdio.command !== undefined || rawStdio.args !== undefined;
      const allowCustomLauncher = rawStdio.allowCustomLauncher === true;
      if (hasCustomLauncherOverrides && !allowCustomLauncher) {
        throw new Error(
          "mcp.stdio.command and mcp.stdio.args are disabled by default. " +
            "Set mcp.stdio.allowCustomLauncher=true only when you intentionally need a privileged custom launcher.",
        );
      }

      const stdioCommand =
        typeof rawStdio.command === "string" && rawStdio.command.length > 0
          ? rawStdio.command
          : DEFAULT_STDIO_COMMAND;

      if (hasCustomLauncherOverrides) {
        validateCustomLauncher(stdioCommand, stdioArgs);
      }

      parsedMcp = {
        transport: "stdio",
        stdio: {
          allowCustomLauncher: allowCustomLauncher || undefined,
          command: stdioCommand,
          args: stdioArgs,
          env: resolveStringRecordEnvVars(rawStdioEnv) as StdioEnv,
        },
      };
    } else {
      parsedMcp = {
        transport: "sse",
        url: resolveEnvVars(mcp.url as string),
      };
    }

    return {
      mcp: parsedMcp,
      gemini: {
        apiKey: resolveEnvVars(gemini.apiKey),
        embeddingModel,
      },
      database: {
        name: typeof database?.name === "string" ? database.name : DEFAULT_DATABASE_NAME,
        collection:
          typeof database?.collection === "string" ? database.collection : DEFAULT_COLLECTION_NAME,
        indexName:
          typeof database?.indexName === "string"
            ? database.indexName
            : DEFAULT_VECTOR_SEARCH_INDEX_NAME,
      },
      retrieval: {
        minScore: parseScore(retrieval?.minScore, "retrieval.minScore", DEFAULT_MIN_SCORE),
        vectorLimit: parsePositiveInt(
          retrieval?.vectorLimit,
          "retrieval.vectorLimit",
          DEFAULT_VECTOR_LIMIT,
        ),
        numCandidatesMultiplier: parsePositiveInt(
          retrieval?.numCandidatesMultiplier,
          "retrieval.numCandidatesMultiplier",
          DEFAULT_NUM_CANDIDATES_MULTIPLIER,
        ),
      },
      captureTriggers: parseCaptureTriggers(cfg.captureTriggers),
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
      placeholder: DEFAULT_STDIO_COMMAND_PLACEHOLDER,
      help: "Privileged override. Leave unset to launch the bundled pinned MongoDB MCP server",
    },
    "mcp.stdio.args": {
      label: "MCP Command Args",
      placeholder: DEFAULT_STDIO_ARGS_PLACEHOLDER,
      advanced: true,
      help: "Privileged override. Leave unset to use the bundled pinned MongoDB MCP server entrypoint",
    },
    "mcp.stdio.allowCustomLauncher": {
      label: "Allow Custom Launcher",
      advanced: true,
      help: "Unsafe escape hatch. Enable only when you intentionally need a non-bundled MongoDB MCP launcher",
    },
    "mcp.stdio.env.MDB_MCP_CONNECTION_STRING": {
      label: "MongoDB Connection String",
      sensitive: true,
      placeholder: "${MONGODB_URI}",
      help: "Atlas URI passed to the MongoDB MCP child. Other child env keys are restricted to approved TLS settings",
    },
    "mcp.url": {
      label: "MCP SSE URL",
      placeholder: "https://example.com/sse",
      help: "Required when mcp.transport is sse",
    },
    "gemini.apiKey": {
      label: "Gemini API Key",
      sensitive: true,
      placeholder: "AIza...",
      help: "Gemini API key (or use ${GEMINI_API_KEY})",
    },
    "gemini.embeddingModel": {
      label: "Embedding Model",
      placeholder: DEFAULT_EMBEDDING_MODEL,
      help: "Gemini embedding model",
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
      label: "Vector Index Name",
      placeholder: DEFAULT_VECTOR_SEARCH_INDEX_NAME,
      advanced: true,
    },
    "retrieval.minScore": {
      label: "Minimum Score",
      placeholder: String(DEFAULT_MIN_SCORE),
      advanced: true,
      help: "Filter out low-score vector search results",
    },
    "retrieval.vectorLimit": {
      label: "Vector Limit",
      placeholder: String(DEFAULT_VECTOR_LIMIT),
      advanced: true,
      help: "Max candidates returned from vector search",
    },
    "retrieval.numCandidatesMultiplier": {
      label: "Candidates Multiplier",
      placeholder: String(DEFAULT_NUM_CANDIDATES_MULTIPLIER),
      advanced: true,
      help: "numCandidates = vectorLimit * multiplier",
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
