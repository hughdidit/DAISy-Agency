import type { OpenClawConfig } from "../config/config.js";
import type { KanbanMongoCollectionsConfig } from "../config/types.kanban.js";
import {
  KANBAN_DEFAULT_BOARD_SLUG,
  KANBAN_DEFAULT_BOARD_TITLE,
  KANBAN_DEFAULT_DATABASE,
} from "./types.js";

export const KANBAN_DEFAULT_COLLECTIONS = {
  boards: "boards",
  cards: "cards",
  activity: "activity",
  imports: "imports",
  attachments: "attachments",
  gridFsBucket: "kanban_attachments",
} as const;

export type ResolvedKanbanMongoCollections = Required<KanbanMongoCollectionsConfig>;

export type ResolvedKanbanConfig = {
  enabled: true;
  uri: string;
  redactedUri: string;
  database: string;
  collections: ResolvedKanbanMongoCollections;
  board: {
    slug: string;
    title: string;
  };
};

export type KanbanConfigUnavailableReason =
  | "disabled"
  | "missing-uri"
  | "invalid-uri"
  | "tls-required";

export type KanbanConfigResolution =
  | {
      available: true;
      config: ResolvedKanbanConfig;
    }
  | {
      available: false;
      reason: KanbanConfigUnavailableReason;
      message: string;
      redactedUri?: string;
    };

type EnvLike = Record<string, string | undefined>;

type CollectionKey = keyof ResolvedKanbanMongoCollections;

type ParsedMongoUri = {
  protocol: "mongodb:" | "mongodb+srv:";
  credentials?: string;
  hosts: string;
  path?: string;
  searchParams: URLSearchParams;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const CONTAINER_HOSTS = new Set(["mongo", "mongodb", "host.docker.internal"]);
const SENSITIVE_QUERY_KEY_PATTERN =
  /password|passwd|pwd|secret|token|credential|authmechanismproperties|tlscertificatekeyfilepassword/i;

function firstNonBlank(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

function collectionName(
  key: CollectionKey,
  configured: KanbanMongoCollectionsConfig | undefined,
  env: EnvLike,
): string {
  if (key === "gridFsBucket") {
    return firstNonBlank(
      configured?.gridFsBucket,
      env.KANBAN_MONGODB_GRIDFS_BUCKET,
      KANBAN_DEFAULT_COLLECTIONS.gridFsBucket,
    )!;
  }
  const envKey = `KANBAN_MONGODB_${key
    .replace(/[A-Z]/g, (match) => `_${match}`)
    .toUpperCase()}_COLLECTION`;
  return firstNonBlank(configured?.[key], env[envKey], KANBAN_DEFAULT_COLLECTIONS[key])!;
}

function parseMongoUri(raw: string | undefined): ParsedMongoUri | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }
  const lowerValue = value.toLowerCase();
  let protocol: ParsedMongoUri["protocol"];
  let protocolPrefixLength: number;
  if (lowerValue.startsWith("mongodb+srv://")) {
    protocol = "mongodb+srv:";
    protocolPrefixLength = "mongodb+srv://".length;
  } else if (lowerValue.startsWith("mongodb://")) {
    protocol = "mongodb:";
    protocolPrefixLength = "mongodb://".length;
  } else {
    return null;
  }
  const remainder = value.slice(protocolPrefixLength);
  const queryStart = remainder.indexOf("?");
  const beforeQuery = queryStart >= 0 ? remainder.slice(0, queryStart) : remainder;
  const query = queryStart >= 0 ? remainder.slice(queryStart + 1) : "";
  const pathStart = beforeQuery.indexOf("/");
  const authority = pathStart >= 0 ? beforeQuery.slice(0, pathStart) : beforeQuery;
  const path = pathStart >= 0 ? beforeQuery.slice(pathStart + 1) : undefined;
  if (!authority.trim()) {
    return null;
  }

  const credentialEnd = authority.lastIndexOf("@");
  const credentials = credentialEnd >= 0 ? authority.slice(0, credentialEnd) : undefined;
  const hosts = credentialEnd >= 0 ? authority.slice(credentialEnd + 1) : authority;
  if (!hosts.trim()) {
    return null;
  }
  return {
    protocol,
    credentials,
    hosts,
    path,
    searchParams: new URLSearchParams(query),
  };
}

function redactedCredentials(credentials: string | undefined): string {
  if (!credentials) {
    return "";
  }
  return credentials.includes(":") ? "redacted:redacted@" : "redacted@";
}

function redactSensitiveQueryValues(value: string): string {
  const queryStart = value.indexOf("?");
  if (queryStart < 0) {
    return value;
  }
  const beforeQuery = value.slice(0, queryStart);
  const params = new URLSearchParams(value.slice(queryStart + 1));
  for (const key of Array.from(params.keys())) {
    if (SENSITIVE_QUERY_KEY_PATTERN.test(key)) {
      params.set(key, "redacted");
    }
  }
  return `${beforeQuery}?${params.toString()}`;
}

export function redactMongoUri(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) {
    return undefined;
  }
  const parsed = parseMongoUri(value);
  if (!parsed) {
    const redactedUserInfo = value.replace(/(mongodb(?:\+srv)?:\/\/)([^@/\s]+)@/i, "$1redacted@");
    return redactSensitiveQueryValues(redactedUserInfo);
  }
  for (const key of Array.from(parsed.searchParams.keys())) {
    if (SENSITIVE_QUERY_KEY_PATTERN.test(key)) {
      parsed.searchParams.set(key, "redacted");
    }
  }
  const query = parsed.searchParams.size > 0 ? `?${parsed.searchParams.toString()}` : "";
  const path = parsed.path !== undefined ? `/${parsed.path}` : "";
  const credentials = redactedCredentials(parsed.credentials);
  return `${parsed.protocol}//${credentials}${parsed.hosts}${path}${query}`;
}

function hostIsLocalOrContainer(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (LOCAL_HOSTS.has(normalized) || CONTAINER_HOSTS.has(normalized)) {
    return true;
  }
  if (normalized.startsWith("127.")) {
    return true;
  }
  return false;
}

function extractMongoHostName(hostEntry: string): string {
  const trimmed = hostEntry.trim();
  if (trimmed.startsWith("[")) {
    const closingBracket = trimmed.indexOf("]");
    return closingBracket > 0 ? trimmed.slice(1, closingBracket) : trimmed;
  }
  return trimmed.split(":")[0] ?? trimmed;
}

function uriRequiresTls(parsed: ParsedMongoUri): boolean {
  const tlsValue = parsed.searchParams.get("tls") ?? parsed.searchParams.get("ssl");
  if (tlsValue?.toLowerCase() === "false") {
    return true;
  }
  if (parsed.protocol === "mongodb+srv:") {
    return false;
  }
  if (tlsValue?.toLowerCase() === "true") {
    return false;
  }
  const hosts = parsed.hosts.split(",").map(extractMongoHostName);
  return hosts.some((host) => !hostIsLocalOrContainer(host));
}

export function resolveKanbanConfig(
  params: {
    cfg?: OpenClawConfig;
    env?: EnvLike;
  } = {},
): KanbanConfigResolution {
  const env = params.env ?? process.env;
  const kanban = params.cfg?.kanban;
  if (kanban?.enabled === false) {
    return {
      available: false,
      reason: "disabled",
      message: "Kanban is disabled by config.",
    };
  }

  const uri = firstNonBlank(kanban?.mongodb?.uri, env.KANBAN_MONGODB_URI);
  if (!uri) {
    return {
      available: false,
      reason: "missing-uri",
      message: "Kanban MongoDB URI is not configured.",
    };
  }

  const redactedUri = redactMongoUri(uri)!;
  const parsed = parseMongoUri(uri);
  if (!parsed) {
    return {
      available: false,
      reason: "invalid-uri",
      message: `Kanban MongoDB URI is invalid: ${redactedUri}`,
      redactedUri,
    };
  }
  if (uriRequiresTls(parsed)) {
    return {
      available: false,
      reason: "tls-required",
      message: `Kanban MongoDB URI requires tls=true for non-local hosts: ${redactedUri}`,
      redactedUri,
    };
  }

  const collections = kanban?.mongodb?.collections;
  return {
    available: true,
    config: {
      enabled: true,
      uri,
      redactedUri,
      database: firstNonBlank(
        kanban?.mongodb?.database,
        env.KANBAN_MONGODB_DATABASE,
        KANBAN_DEFAULT_DATABASE,
      )!,
      collections: {
        boards: collectionName("boards", collections, env),
        cards: collectionName("cards", collections, env),
        activity: collectionName("activity", collections, env),
        imports: collectionName("imports", collections, env),
        attachments: collectionName("attachments", collections, env),
        gridFsBucket: collectionName("gridFsBucket", collections, env),
      },
      board: {
        slug: firstNonBlank(kanban?.board?.slug, env.KANBAN_BOARD_SLUG, KANBAN_DEFAULT_BOARD_SLUG)!,
        title: firstNonBlank(
          kanban?.board?.title,
          env.KANBAN_BOARD_TITLE,
          KANBAN_DEFAULT_BOARD_TITLE,
        )!,
      },
    },
  };
}
