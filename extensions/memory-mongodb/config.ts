import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  DEFAULT_MEMORY_AUTONOMY_POLICY,
  type MemoryAutonomyPolicy,
} from "./memory-autonomy-types.js";
import { defaultSupportedMimeTypes } from "./payload-chunker.js";

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
    eventCollection: string;
    indexName: string;
    indexNameV2: string;
  };
  routing: {
    tenantId: string;
    workspaceId: string;
    defaultVisibility: "private" | "workspace" | "project";
    legacyFallback: boolean;
  };
  retrieval: {
    minScore: number;
    vectorLimit: number;
    numCandidatesMultiplier: number;
  };
  captureTriggers: string[];
  autoCapture?: boolean;
  autoRecall?: boolean;
  ops: MemoryOpsConfig;
};

export type MemoryOpsConfig = {
  enabled: boolean;
  preferenceMinObservations: number;
  preferenceMinStabilityScore: number;
  captureMinConfidence: number;
  hygieneMaxCandidates: number;
  auditCleanup: boolean;
  supportedDocumentMimeTypes: string[];
  maxInlineDocumentBytesByMime: Record<string, number>;
  schemaMode: "migrate-in-place" | "strict-validator" | "additive";
  autonomy?: MemoryAutonomyPolicy;
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
const DEFAULT_EVENT_COLLECTION_NAME = "memory_events";
const DEFAULT_VECTOR_SEARCH_INDEX_NAME = "vector_index";
const DEFAULT_VECTOR_SEARCH_INDEX_NAME_V2 = "vector_index_v2";
const DEFAULT_TENANT_ID = "default";
const DEFAULT_WORKSPACE_ID = "default";
const DEFAULT_VISIBILITY = "private" as const;
const DEFAULT_LEGACY_ROUTING_FALLBACK = true;
const DEFAULT_MIN_SCORE = 0.1;
const DEFAULT_VECTOR_LIMIT = 8;
const DEFAULT_NUM_CANDIDATES_MULTIPLIER = 10;
const DEFAULT_OPS_ENABLED = true;
const DEFAULT_OPS_PREFERENCE_MIN_OBSERVATIONS = 2;
const DEFAULT_OPS_PREFERENCE_MIN_STABILITY_SCORE = 0.8;
const DEFAULT_OPS_CAPTURE_MIN_CONFIDENCE = 0.7;
const DEFAULT_OPS_HYGIENE_MAX_CANDIDATES = 25;
const DEFAULT_OPS_AUDIT_CLEANUP = true;
const DEFAULT_OPS_SCHEMA_MODE = "additive" as const;
const DEFAULT_MAX_INLINE_DOCUMENT_BYTES = 2_000_000;
export const BUNDLED_MCP_SERVER_PACKAGE = "mongodb-mcp-server";
export const BUNDLED_MCP_SERVER_VERSION = "1.2.0";

const DEFAULT_SUPPORTED_DOCUMENT_MIME_TYPES = defaultSupportedMimeTypes.filter(
  (mimeType) =>
    !mimeType.startsWith("image/") &&
    !mimeType.startsWith("audio/") &&
    !mimeType.startsWith("video/"),
);

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
  "corepack",
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

function launcherTargetBasename(value: string): string {
  return executableBasename(value)
    .replace(/\.(c|m)?js$/i, "")
    .replace(/-cli$/i, "");
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

  const commandBasename = executableBasename(command);
  if (FORBIDDEN_CUSTOM_LAUNCHERS.has(commandBasename)) {
    throw new Error(
      "mcp.stdio.command cannot use a shell or package-manager launcher. " +
        "Use the bundled default or an absolute executable path.",
    );
  }

  if (args.length === 0 && (commandBasename === "node" || commandBasename === "nodejs")) {
    throw new Error(
      "mcp.stdio.args cannot be empty when mcp.stdio.command uses a Node launcher. " +
        "Leave args unset to use the bundled defaults or provide a standalone MCP server executable.",
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
    if (FORBIDDEN_CUSTOM_LAUNCHERS.has(launcherTargetBasename(firstArg))) {
      throw new Error("mcp.stdio.args[0] cannot target a shell or package-manager wrapper.");
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

function parseBoolean(value: unknown, label: string, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function parseNonEmptyString(value: unknown, label: string, defaultValue: string): string {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function parseVisibility(value: unknown): "private" | "workspace" | "project" {
  if (value === undefined) {
    return DEFAULT_VISIBILITY;
  }
  if (value !== "private" && value !== "workspace" && value !== "project") {
    throw new Error("routing.defaultVisibility must be one of: private, workspace, project");
  }
  return value;
}

function parseSchemaMode(
  value: unknown,
  label: string,
): "migrate-in-place" | "strict-validator" | "additive" {
  if (value === undefined) {
    return DEFAULT_OPS_SCHEMA_MODE;
  }
  if (value !== "migrate-in-place" && value !== "strict-validator" && value !== "additive") {
    throw new Error(`${label} must be one of: migrate-in-place, strict-validator, additive`);
  }
  return value;
}

function parseSupportedDocumentMimeTypes(value: unknown): string[] {
  if (value === undefined) {
    return [...DEFAULT_SUPPORTED_DOCUMENT_MIME_TYPES];
  }
  if (!Array.isArray(value)) {
    throw new Error("ops.supportedDocumentMimeTypes must be an array of strings");
  }
  const normalized = value
    .map((entry) => {
      if (typeof entry !== "string") {
        throw new Error("ops.supportedDocumentMimeTypes must be an array of strings");
      }
      return entry.trim().toLowerCase();
    })
    .filter(Boolean);

  if (normalized.length === 0) {
    throw new Error("ops.supportedDocumentMimeTypes must include at least one MIME type");
  }

  return Array.from(new Set(normalized));
}

function parseInlineDocumentBytesByMime(value: unknown): Record<string, number> {
  if (value === undefined) {
    const defaults: Record<string, number> = {};
    for (const mime of DEFAULT_SUPPORTED_DOCUMENT_MIME_TYPES) {
      defaults[mime] = DEFAULT_MAX_INLINE_DOCUMENT_BYTES;
    }
    return defaults;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ops.maxInlineDocumentBytesByMime must be an object");
  }
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const mimeType = key.trim().toLowerCase();
    if (!mimeType) {
      throw new Error("ops.maxInlineDocumentBytesByMime cannot include empty MIME type keys");
    }
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
      throw new Error(`ops.maxInlineDocumentBytesByMime.${key} must be a positive number`);
    }
    result[mimeType] = Math.floor(raw);
  }
  return result;
}

function parseAutonomyPolicy(value: unknown): MemoryAutonomyPolicy {
  if (value === undefined) {
    return { ...DEFAULT_MEMORY_AUTONOMY_POLICY };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ops.autonomy must be an object");
  }
  const raw = value as Record<string, unknown>;
  assertAllowedKeys(
    raw,
    [
      "autoCapture",
      "autoScore",
      "autoDedupe",
      "autoCompact",
      "autoPrune",
      "autoPromote",
      "secretAutoCapture",
      "crossScopePromotion",
    ],
    "ops.autonomy",
  );
  return {
    autoCapture: parseBoolean(
      raw.autoCapture,
      "ops.autonomy.autoCapture",
      DEFAULT_MEMORY_AUTONOMY_POLICY.autoCapture,
    ),
    autoScore: parseBoolean(
      raw.autoScore,
      "ops.autonomy.autoScore",
      DEFAULT_MEMORY_AUTONOMY_POLICY.autoScore,
    ),
    autoDedupe: parseBoolean(
      raw.autoDedupe,
      "ops.autonomy.autoDedupe",
      DEFAULT_MEMORY_AUTONOMY_POLICY.autoDedupe,
    ),
    autoCompact: parseBoolean(
      raw.autoCompact,
      "ops.autonomy.autoCompact",
      DEFAULT_MEMORY_AUTONOMY_POLICY.autoCompact,
    ),
    autoPrune: parseBoolean(
      raw.autoPrune,
      "ops.autonomy.autoPrune",
      DEFAULT_MEMORY_AUTONOMY_POLICY.autoPrune,
    ),
    autoPromote: parseBoolean(
      raw.autoPromote,
      "ops.autonomy.autoPromote",
      DEFAULT_MEMORY_AUTONOMY_POLICY.autoPromote,
    ),
    secretAutoCapture: parseBoolean(
      raw.secretAutoCapture,
      "ops.autonomy.secretAutoCapture",
      DEFAULT_MEMORY_AUTONOMY_POLICY.secretAutoCapture,
    ),
    crossScopePromotion: parseBoolean(
      raw.crossScopePromotion,
      "ops.autonomy.crossScopePromotion",
      DEFAULT_MEMORY_AUTONOMY_POLICY.crossScopePromotion,
    ),
  };
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
      [
        "mcp",
        "gemini",
        "database",
        "routing",
        "retrieval",
        "captureTriggers",
        "autoCapture",
        "autoRecall",
        "ops",
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
    if (
      database !== undefined &&
      (typeof database !== "object" || database === null || Array.isArray(database))
    ) {
      throw new Error("database must be an object");
    }
    if (database) {
      assertAllowedKeys(
        database,
        ["name", "collection", "eventCollection", "indexName", "indexNameV2"],
        "database config",
      );
    }

    const routing = cfg.routing as Record<string, unknown> | undefined;
    if (
      routing !== undefined &&
      (typeof routing !== "object" || routing === null || Array.isArray(routing))
    ) {
      throw new Error("routing must be an object");
    }
    if (routing) {
      assertAllowedKeys(
        routing,
        ["tenantId", "workspaceId", "defaultVisibility", "legacyFallback"],
        "routing config",
      );
    }

    const retrieval = cfg.retrieval as Record<string, unknown> | undefined;
    if (
      retrieval !== undefined &&
      (typeof retrieval !== "object" || retrieval === null || Array.isArray(retrieval))
    ) {
      throw new Error("retrieval must be an object");
    }
    if (retrieval) {
      assertAllowedKeys(
        retrieval,
        ["minScore", "vectorLimit", "numCandidatesMultiplier"],
        "retrieval config",
      );
    }

    const rawOps = cfg.ops as Record<string, unknown> | undefined;
    if (
      rawOps !== undefined &&
      (typeof rawOps !== "object" || rawOps === null || Array.isArray(rawOps))
    ) {
      throw new Error("ops must be an object");
    }
    if (rawOps) {
      assertAllowedKeys(
        rawOps,
        [
          "enabled",
          "preferenceMinObservations",
          "preferenceMinStabilityScore",
          "captureMinConfidence",
          "hygieneMaxCandidates",
          "auditCleanup",
          "supportedDocumentMimeTypes",
          "maxInlineDocumentBytesByMime",
          "schemaMode",
          "autonomy",
        ],
        "ops config",
      );
    }
    const parsedOpsEnabled = parseBoolean(rawOps?.enabled, "ops.enabled", DEFAULT_OPS_ENABLED);
    if (!parsedOpsEnabled) {
      throw new Error(
        "ops.enabled=false is not supported; memory-ops is required for memory-mongodb",
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
      const customCommand =
        typeof rawStdio.command === "string" && rawStdio.command.length > 0
          ? rawStdio.command
          : undefined;
      const hasCustomCommandOverride = customCommand !== undefined;
      const hasCustomLauncherOverrides = hasCustomCommandOverride || rawStdio.args !== undefined;
      const allowCustomLauncher = rawStdio.allowCustomLauncher === true;
      if (hasCustomLauncherOverrides && !allowCustomLauncher) {
        throw new Error(
          "mcp.stdio.command and mcp.stdio.args are disabled by default. " +
            "Set mcp.stdio.allowCustomLauncher=true only when you intentionally need a privileged custom launcher.",
        );
      }

      const stdioCommand = customCommand ?? DEFAULT_STDIO_COMMAND;

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
        name: parseNonEmptyString(database?.name, "database.name", DEFAULT_DATABASE_NAME),
        collection: parseNonEmptyString(
          database?.collection,
          "database.collection",
          DEFAULT_COLLECTION_NAME,
        ),
        eventCollection: parseNonEmptyString(
          database?.eventCollection,
          "database.eventCollection",
          DEFAULT_EVENT_COLLECTION_NAME,
        ),
        indexName: parseNonEmptyString(
          database?.indexName,
          "database.indexName",
          DEFAULT_VECTOR_SEARCH_INDEX_NAME,
        ),
        indexNameV2: parseNonEmptyString(
          database?.indexNameV2,
          "database.indexNameV2",
          DEFAULT_VECTOR_SEARCH_INDEX_NAME_V2,
        ),
      },
      routing: {
        tenantId: parseNonEmptyString(routing?.tenantId, "routing.tenantId", DEFAULT_TENANT_ID),
        workspaceId: parseNonEmptyString(
          routing?.workspaceId,
          "routing.workspaceId",
          DEFAULT_WORKSPACE_ID,
        ),
        defaultVisibility: parseVisibility(routing?.defaultVisibility),
        legacyFallback: parseBoolean(
          routing?.legacyFallback,
          "routing.legacyFallback",
          DEFAULT_LEGACY_ROUTING_FALLBACK,
        ),
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
      ops: {
        enabled: true,
        preferenceMinObservations: parsePositiveInt(
          rawOps?.preferenceMinObservations,
          "ops.preferenceMinObservations",
          DEFAULT_OPS_PREFERENCE_MIN_OBSERVATIONS,
        ),
        preferenceMinStabilityScore: parseScore(
          rawOps?.preferenceMinStabilityScore,
          "ops.preferenceMinStabilityScore",
          DEFAULT_OPS_PREFERENCE_MIN_STABILITY_SCORE,
        ),
        captureMinConfidence: parseScore(
          rawOps?.captureMinConfidence,
          "ops.captureMinConfidence",
          DEFAULT_OPS_CAPTURE_MIN_CONFIDENCE,
        ),
        hygieneMaxCandidates: parsePositiveInt(
          rawOps?.hygieneMaxCandidates,
          "ops.hygieneMaxCandidates",
          DEFAULT_OPS_HYGIENE_MAX_CANDIDATES,
        ),
        auditCleanup: parseBoolean(
          rawOps?.auditCleanup,
          "ops.auditCleanup",
          DEFAULT_OPS_AUDIT_CLEANUP,
        ),
        supportedDocumentMimeTypes: parseSupportedDocumentMimeTypes(
          rawOps?.supportedDocumentMimeTypes,
        ),
        maxInlineDocumentBytesByMime: parseInlineDocumentBytesByMime(
          rawOps?.maxInlineDocumentBytesByMime,
        ),
        schemaMode: parseSchemaMode(rawOps?.schemaMode, "ops.schemaMode"),
        autonomy: parseAutonomyPolicy(rawOps?.autonomy),
      },
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
      help: "Requires mcp.stdio.allowCustomLauncher=true; leave unset to launch the bundled pinned MongoDB MCP server",
    },
    "mcp.stdio.args": {
      label: "MCP Command Args",
      placeholder: DEFAULT_STDIO_ARGS_PLACEHOLDER,
      advanced: true,
      help: "Requires mcp.stdio.allowCustomLauncher=true; leave unset to use the bundled pinned MongoDB MCP server entrypoint",
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
    "database.eventCollection": {
      label: "Memory Event Collection",
      placeholder: DEFAULT_EVENT_COLLECTION_NAME,
      advanced: true,
    },
    "database.indexName": {
      label: "Vector Index Name",
      placeholder: DEFAULT_VECTOR_SEARCH_INDEX_NAME,
      advanced: true,
    },
    "database.indexNameV2": {
      label: "Scoped Vector Index Name",
      placeholder: DEFAULT_VECTOR_SEARCH_INDEX_NAME_V2,
      advanced: true,
      help: "Atlas vector index with routing filter fields for scoped multi-agent recall",
    },
    "routing.tenantId": {
      label: "Memory Tenant ID",
      placeholder: DEFAULT_TENANT_ID,
      advanced: true,
    },
    "routing.workspaceId": {
      label: "Memory Workspace ID",
      placeholder: DEFAULT_WORKSPACE_ID,
      advanced: true,
    },
    "routing.defaultVisibility": {
      label: "Default Memory Visibility",
      placeholder: DEFAULT_VISIBILITY,
      advanced: true,
      help: "Default visibility for new durable memories; private preserves agent-local isolation",
    },
    "routing.legacyFallback": {
      label: "Legacy Routing Fallback",
      advanced: true,
      help: "Search legacy vector index after scoped v2 search during additive backfill rollout",
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
    "ops.enabled": {
      label: "Memory Ops Enabled",
      help: "Enable deterministic memory-ops primitives and metadata contracts",
    },
    "ops.preferenceMinObservations": {
      label: "Preference Min Observations",
      placeholder: String(DEFAULT_OPS_PREFERENCE_MIN_OBSERVATIONS),
      advanced: true,
    },
    "ops.preferenceMinStabilityScore": {
      label: "Preference Min Stability",
      placeholder: String(DEFAULT_OPS_PREFERENCE_MIN_STABILITY_SCORE),
      advanced: true,
    },
    "ops.captureMinConfidence": {
      label: "Capture Min Confidence",
      placeholder: String(DEFAULT_OPS_CAPTURE_MIN_CONFIDENCE),
      advanced: true,
    },
    "ops.hygieneMaxCandidates": {
      label: "Hygiene Max Candidates",
      placeholder: String(DEFAULT_OPS_HYGIENE_MAX_CANDIDATES),
      advanced: true,
    },
    "ops.auditCleanup": {
      label: "Audit Cleanup",
      advanced: true,
      help: "Clean up memory_audit probe records automatically",
    },
    "ops.supportedDocumentMimeTypes": {
      label: "Supported Document MIME Types",
      advanced: true,
      help: "Document MIME types accepted for capture and manifest tracking",
    },
    "ops.maxInlineDocumentBytesByMime": {
      label: "Max Inline Document Bytes By MIME",
      advanced: true,
      help: "Per-MIME inline byte limits for document capture payloads",
    },
    "ops.schemaMode": {
      label: "Schema Mode",
      placeholder: DEFAULT_OPS_SCHEMA_MODE,
      advanced: true,
      help: "Schema rollout mode for memory-ops metadata contracts",
    },
    "ops.autonomy": {
      label: "Memory Autonomy Policy",
      advanced: true,
      help: "Self-administered non-secret capture, scoring, dedupe, and compaction defaults",
    },
  },
};
