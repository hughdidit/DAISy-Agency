<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { ConfigFileSnapshot } from "./types.openclaw.js";
=======
=======
import type { ConfigFileSnapshot } from "./types.openclaw.js";
>>>>>>> ddef3cadb (refactor: replace memory manager prototype mixing)
=======
>>>>>>> 5115f6fdf (style: normalize imports for oxfmt 0.33)
=======
import type { ConfigFileSnapshot } from "./types.openclaw.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { ConfigFileSnapshot } from "./types.openclaw.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { createSubsystemLogger } from "../logging/subsystem.js";
import { isSensitiveConfigPath, type ConfigUiHints } from "./schema.hints.js";

const log = createSubsystemLogger("config/redaction");
const ENV_VAR_PLACEHOLDER_PATTERN = /^\$\{[^}]*\}$/;

function isSensitivePath(path: string): boolean {
  if (path.endsWith("[]")) {
    return isSensitiveConfigPath(path.slice(0, -2));
  } else {
    return isSensitiveConfigPath(path);
  }
}

function isEnvVarPlaceholder(value: string): boolean {
  return ENV_VAR_PLACEHOLDER_PATTERN.test(value.trim());
}

function isExtensionPath(path: string): boolean {
  return (
    path === "plugins" ||
    path.startsWith("plugins.") ||
    path === "channels" ||
    path.startsWith("channels.")
  );
}

function isExplicitlyNonSensitivePath(hints: ConfigUiHints | undefined, paths: string[]): boolean {
  if (!hints) {
    return false;
  }
  return paths.some((path) => hints[path]?.sensitive === false);
}
>>>>>>> 90ef2d6bd (chore: Update formatting.)

/**
 * Sentinel value used to replace sensitive config fields in gateway responses.
 * Write-side handlers (config.set, config.apply, config.patch) detect this
 * sentinel and restore the original value from the on-disk config, so a
 * round-trip through the Web UI does not corrupt credentials.
 */
export const REDACTED_SENTINEL = "__OPENCLAW_REDACTED__";

/**
 * Patterns that identify sensitive config field names.
 * Aligned with the UI-hint logic in schema.ts.
 */
const SENSITIVE_KEY_PATTERNS = [/token$/i, /password/i, /secret/i, /api.?key/i];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Deep-walk an object and replace values whose key matches a sensitive pattern
 * with the redaction sentinel.
 */
function redactObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key) && value !== null && value !== undefined) {
      result[key] = REDACTED_SENTINEL;
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function redactConfigObject<T>(value: T): T {
  return redactObject(value) as T;
}

/**
 * Collect all sensitive string values from a config object.
 * Used for text-based redaction of the raw JSON5 source.
 */
function collectSensitiveValues(obj: unknown): string[] {
  const values: string[] = [];
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return values;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      values.push(...collectSensitiveValues(item));
    }
    return values;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key) && typeof value === "string" && value.length > 0) {
      values.push(value);
    } else if (typeof value === "object" && value !== null) {
      values.push(...collectSensitiveValues(value));
    }
  }
  return values;
}

/**
 * Replace known sensitive values in a raw JSON5 string with the sentinel.
 * Values are replaced longest-first to avoid partial matches.
 */
function redactRawText(raw: string, config: unknown): string {
  const sensitiveValues = collectSensitiveValues(config);
  sensitiveValues.sort((a, b) => b.length - a.length);
  let result = raw;
  for (const value of sensitiveValues) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), REDACTED_SENTINEL);
  }

  const keyValuePattern =
    /(^|[{\s,])((["'])([^"']+)\3|([A-Za-z0-9_$.-]+))(\s*:\s*)(["'])([^"']*)\7/g;
  result = result.replace(
    keyValuePattern,
    (match, prefix, keyExpr, _keyQuote, keyQuoted, keyBare, sep, valQuote, val) => {
      const key = (keyQuoted ?? keyBare) as string | undefined;
      if (!key || !isSensitiveKey(key)) {
        return match;
      }
      if (val === REDACTED_SENTINEL) {
        return match;
      }
      return `${prefix}${keyExpr}${sep}${valQuote}${REDACTED_SENTINEL}${valQuote}`;
    },
  );

  return result;
}

/**
 * Returns a copy of the config snapshot with all sensitive fields
 * replaced by {@link REDACTED_SENTINEL}. The `hash` is preserved
 * (it tracks config identity, not content).
 *
 * Both `config` (the parsed object) and `raw` (the JSON5 source) are scrubbed
 * so no credential can leak through either path.
 */
export function redactConfigSnapshot(snapshot: ConfigFileSnapshot): ConfigFileSnapshot {
  const redactedConfig = redactConfigObject(snapshot.config);
  const redactedRaw = snapshot.raw ? redactRawText(snapshot.raw, snapshot.config) : null;
  const redactedParsed = snapshot.parsed ? redactConfigObject(snapshot.parsed) : snapshot.parsed;
  // Also redact the resolved config (contains values after ${ENV} substitution)
  const redactedResolved = redactConfigObject(snapshot.resolved);

  return {
    ...snapshot,
    config: redactedConfig,
    raw: redactedRaw,
    parsed: redactedParsed,
    resolved: redactedResolved,
  };
}

/**
 * Deep-walk `incoming` and replace any {@link REDACTED_SENTINEL} values
 * (on sensitive keys) with the corresponding value from `original`.
 *
 * This is called by config.set / config.apply / config.patch before writing,
 * so that credentials survive a Web UI round-trip unmodified.
 */
<<<<<<< HEAD
export function restoreRedactedValues(incoming: unknown, original: unknown): unknown {
=======
export function restoreRedactedValues(
  incoming: unknown,
  original: unknown,
  hints?: ConfigUiHints,
): RedactionResult {
  if (incoming === null || incoming === undefined) {
    return { ok: false, error: "no input" };
  }
  if (typeof incoming !== "object") {
    return { ok: false, error: "input not an object" };
  }
  try {
    if (hints) {
      const lookup = buildRedactionLookup(hints);
      if (lookup.has("")) {
        return {
          ok: true,
          result: restoreRedactedValuesWithLookup(incoming, original, lookup, "", hints),
        };
      } else {
        return { ok: true, result: restoreRedactedValuesGuessing(incoming, original, "", hints) };
      }
    } else {
      return { ok: true, result: restoreRedactedValuesGuessing(incoming, original, "") };
    }
  } catch (err) {
    if (err instanceof RedactionError) {
      return {
        ok: false,
        humanReadableMessage: `Sentinel value "${REDACTED_SENTINEL}" in key ${err.key} is not valid as real data`,
      };
    }
    throw err; // some coding error, pass through
  }
}

class RedactionError extends Error {
  public readonly key: string;

  constructor(key: string) {
    super("internal error class---should never escape");
    this.key = key;
    this.name = "RedactionError";
  }
}

function restoreOriginalValueOrThrow(params: {
  key: string;
  path: string;
  original: Record<string, unknown>;
}): unknown {
  if (params.key in params.original) {
    return params.original[params.key];
  }
  log.warn(`Cannot un-redact config key ${params.path} as it doesn't have any value`);
  throw new RedactionError(params.path);
}

/**
 * Worker for restoreRedactedValues().
 * Used when there are ConfigUiHints available.
 */
function restoreRedactedValuesWithLookup(
  incoming: unknown,
  original: unknown,
  lookup: Set<string>,
  prefix: string,
  hints: ConfigUiHints,
): unknown {
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
  if (incoming === null || incoming === undefined) {
    return incoming;
  }
  if (typeof incoming !== "object") {
    return incoming;
  }
  if (Array.isArray(incoming)) {
    const origArr = Array.isArray(original) ? original : [];
    return incoming.map((item, i) => restoreRedactedValues(item, origArr[i]));
  }
  const orig =
    original && typeof original === "object" && !Array.isArray(original)
      ? (original as Record<string, unknown>)
      : {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
<<<<<<< HEAD
    if (isSensitiveKey(key) && value === REDACTED_SENTINEL) {
      if (!(key in orig)) {
        throw new Error(
          `config write rejected: "${key}" is redacted; set an explicit value instead of ${REDACTED_SENTINEL}`,
        );
      }
      result[key] = orig[key];
=======
    result[key] = value;
    const path = prefix ? `${prefix}.${key}` : key;
    const wildcardPath = prefix ? `${prefix}.*` : "*";
    let matched = false;
    for (const candidate of [path, wildcardPath]) {
      if (lookup.has(candidate)) {
        matched = true;
        if (value === REDACTED_SENTINEL) {
          result[key] = restoreOriginalValueOrThrow({ key, path: candidate, original: orig });
        } else if (typeof value === "object" && value !== null) {
          result[key] = restoreRedactedValuesWithLookup(value, orig[key], lookup, candidate, hints);
        }
        break;
      }
    }
    if (!matched && isExtensionPath(path)) {
      const markedNonSensitive = isExplicitlyNonSensitivePath(hints, [path, wildcardPath]);
      if (!markedNonSensitive && isSensitivePath(path) && value === REDACTED_SENTINEL) {
        result[key] = restoreOriginalValueOrThrow({ key, path, original: orig });
      } else if (typeof value === "object" && value !== null) {
        result[key] = restoreRedactedValuesGuessing(value, orig[key], path, hints);
      }
    }
  }
  return result;
}

/**
 * Worker for restoreRedactedValues().
 * Used when ConfigUiHints are NOT available.
 */
function restoreRedactedValuesGuessing(
  incoming: unknown,
  original: unknown,
  prefix: string,
  hints?: ConfigUiHints,
): unknown {
  if (incoming === null || incoming === undefined) {
    return incoming;
  }
  if (typeof incoming !== "object") {
    return incoming;
  }
  if (Array.isArray(incoming)) {
    // Note: If the user removed an item in the middle of the array,
    // we have no way of knowing which one. In this case, the last
    // element(s) get(s) chopped off. Not good, so please don't put
    // sensitive string array in the config...
    const origArr = Array.isArray(original) ? original : [];
    return incoming.map((item, i) => {
      const path = `${prefix}[]`;
      if (incoming.length < origArr.length) {
        log.warn(`Redacted config array key ${path} has been truncated`);
      }
      if (
        !isExplicitlyNonSensitivePath(hints, [path]) &&
        isSensitivePath(path) &&
        item === REDACTED_SENTINEL
      ) {
        return origArr[i];
      }
      return restoreRedactedValuesGuessing(item, origArr[i], path, hints);
    });
  }
  const orig =
    original && typeof original === "object" && !Array.isArray(original)
      ? (original as Record<string, unknown>)
      : {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const wildcardPath = prefix ? `${prefix}.*` : "*";
    if (
      !isExplicitlyNonSensitivePath(hints, [path, wildcardPath]) &&
      isSensitivePath(path) &&
      value === REDACTED_SENTINEL
    ) {
      result[key] = restoreOriginalValueOrThrow({ key, path, original: orig });
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
    } else if (typeof value === "object" && value !== null) {
      result[key] = restoreRedactedValues(value, orig[key]);
    } else {
      result[key] = value;
    }
  }
  return result;
}
