import path from "node:path";
import { SENSITIVE_KEY_PATTERNS } from "./types.js";

type PluginLoggerLike = {
  debug?: (message: string) => void;
  info?: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string) => void;
};

const TOKEN_PATTERN = /\b([A-Za-z0-9_-]{16,}\.[A-Za-z0-9._-]{10,}|ya29\.[A-Za-z0-9._-]+)\b/g;
const AUTH_HEADER_PATTERN = /(authorization\s*[:=]\s*)([^\s,;]+)/gi;

function redactString(input: string): string {
  let output = input.replace(TOKEN_PATTERN, "[REDACTED_TOKEN]");
  output = output.replace(AUTH_HEADER_PATTERN, "$1[REDACTED]");
  output = output.replace(/(credential(s)?[_-]?file\s*[:=]\s*)([^\s,;]+)/gi, "$1[REDACTED_PATH]");
  return output;
}

function sanitizePathLike(input: unknown): unknown {
  if (typeof input !== "string") {
    return input;
  }
  if (input.includes("/") || input.includes("\\")) {
    return path.basename(input);
  }
  return input;
}

function redactObject(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactObject(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      out[key] = "[REDACTED]";
      continue;
    }
    const next = redactObject(raw);
    out[key] = sanitizePathLike(next);
  }
  return out;
}

export type RedactingLogger = {
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
  debug: (message: string, meta?: unknown) => void;
};

export function createRedactingLogger(logger: PluginLoggerLike): RedactingLogger {
  const log = (level: "info" | "warn" | "error" | "debug", message: string, meta?: unknown) => {
    const redactedMessage = redactString(message);
    const redactedMeta = meta === undefined ? undefined : redactObject(meta);
    if (redactedMeta !== undefined) {
      logger[level]?.(`${redactedMessage} ${JSON.stringify(redactedMeta)}`);
      return;
    }
    logger[level]?.(redactedMessage);
  };

  return {
    info: (message, meta) => log("info", message, meta),
    warn: (message, meta) => log("warn", message, meta),
    error: (message, meta) => log("error", message, meta),
    debug: (message, meta) => log("debug", message, meta),
  };
}

export function redactForOutput(value: unknown): unknown {
  return redactObject(value);
}
