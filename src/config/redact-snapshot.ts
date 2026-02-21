<<<<<<< HEAD
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
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { createSubsystemLogger } from "../logging/subsystem.js";
import { isSensitiveConfigPath, type ConfigUiHints } from "./schema.hints.js";
import type { ConfigFileSnapshot } from "./types.openclaw.js";

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

function isWholeObjectSensitivePath(path: string): boolean {
  const lowered = path.toLowerCase();
  return lowered.endsWith("serviceaccount") || lowered.endsWith("serviceaccountref");
}

function collectSensitiveStrings(value: unknown, values: string[]): void {
  if (typeof value === "string") {
    if (!isEnvVarPlaceholder(value)) {
      values.push(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSensitiveStrings(item, values);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectSensitiveStrings(item, values);
    }
  }
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
<<<<<<< HEAD
    for (const item of obj) {
      values.push(...collectSensitiveValues(item));
=======
    const path = `${prefix}[]`;
    if (!lookup.has(path)) {
      // Keep behavior symmetric with object fallback: if hints miss the path,
      // still run pattern-based guessing for non-extension arrays.
      return redactObjectGuessing(obj, prefix, values, hints);
>>>>>>> 13478cc79 (refactor(config): harden catchall hint mapping and array fallback)
    }
    return values;
  }
<<<<<<< HEAD
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key) && typeof value === "string" && value.length > 0) {
      values.push(value);
    } else if (typeof value === "object" && value !== null) {
      values.push(...collectSensitiveValues(value));
=======

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const wildcardPath = prefix ? `${prefix}.*` : "*";
      let matched = false;
      for (const candidate of [path, wildcardPath]) {
        result[key] = value;
        if (lookup.has(candidate)) {
          matched = true;
          // Hey, greptile, look here, this **IS** only applied to strings
          if (typeof value === "string" && !isEnvVarPlaceholder(value)) {
            result[key] = REDACTED_SENTINEL;
            values.push(value);
          } else if (typeof value === "object" && value !== null) {
            if (hints[candidate]?.sensitive === true && !Array.isArray(value)) {
              collectSensitiveStrings(value, values);
              result[key] = REDACTED_SENTINEL;
            } else {
              result[key] = redactObjectWithLookup(value, lookup, candidate, values, hints);
            }
          } else if (
            hints[candidate]?.sensitive === true &&
            value !== undefined &&
            value !== null
          ) {
            // Keep primitives at explicitly-sensitive paths fully redacted.
            result[key] = REDACTED_SENTINEL;
          }
          break;
        }
      }
      if (!matched) {
        // Fall back to pattern-based guessing for paths not covered by schema
        // hints. This catches dynamic keys inside catchall objects (for example
        // env.GROQ_API_KEY) and extension/plugin config alike.
        const markedNonSensitive = isExplicitlyNonSensitivePath(hints, [path, wildcardPath]);
        if (
          typeof value === "string" &&
          !markedNonSensitive &&
          isSensitivePath(path) &&
          !isEnvVarPlaceholder(value)
        ) {
          result[key] = REDACTED_SENTINEL;
          values.push(value);
        } else if (typeof value === "object" && value !== null) {
          result[key] = redactObjectGuessing(value, path, values, hints);
        }
      }
>>>>>>> f0c3c8b6a (fix(config): redact dynamic catchall secret keys)
    }
  }
<<<<<<< HEAD
  return values;
=======

  return obj;
}

/**
 * Worker for redactObject() and collectSensitiveValues().
 * Used when ConfigUiHints are NOT available.
 */
function redactObjectGuessing(
  obj: unknown,
  prefix: string,
  values: string[],
  hints?: ConfigUiHints,
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => {
      const path = `${prefix}[]`;
      if (
        !isExplicitlyNonSensitivePath(hints, [path]) &&
        isSensitivePath(path) &&
        typeof item === "string" &&
        !isEnvVarPlaceholder(item)
      ) {
        values.push(item);
        return REDACTED_SENTINEL;
      }
      return redactObjectGuessing(item, path, values, hints);
    });
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const dotPath = prefix ? `${prefix}.${key}` : key;
      const wildcardPath = prefix ? `${prefix}.*` : "*";
      if (
        !isExplicitlyNonSensitivePath(hints, [dotPath, wildcardPath]) &&
        isSensitivePath(dotPath) &&
        typeof value === "string" &&
        !isEnvVarPlaceholder(value)
      ) {
        result[key] = REDACTED_SENTINEL;
        values.push(value);
      } else if (
        !isExplicitlyNonSensitivePath(hints, [dotPath, wildcardPath]) &&
        isSensitivePath(dotPath) &&
        isWholeObjectSensitivePath(dotPath) &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        collectSensitiveStrings(value, values);
        result[key] = REDACTED_SENTINEL;
      } else if (typeof value === "object" && value !== null) {
        result[key] = redactObjectGuessing(value, dotPath, values, hints);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return obj;
>>>>>>> c3a4251a6 (Config: add secret ref schema and redaction foundations)
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

function mapRedactedArray(params: {
  incoming: unknown[];
  original: unknown;
  path: string;
  mapItem: (item: unknown, index: number, originalArray: unknown[]) => unknown;
}): unknown[] {
  const originalArray = Array.isArray(params.original) ? params.original : [];
  if (params.incoming.length < originalArray.length) {
    log.warn(`Redacted config array key ${params.path} has been truncated`);
  }
  return params.incoming.map((item, index) => params.mapItem(item, index, originalArray));
}

function toObjectRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function shouldPassThroughRestoreValue(incoming: unknown): boolean {
  return incoming === null || incoming === undefined || typeof incoming !== "object";
}

function toRestoreArrayContext(
  incoming: unknown,
  prefix: string,
): { incoming: unknown[]; path: string } | null {
  if (!Array.isArray(incoming)) {
    return null;
  }
  return { incoming, path: `${prefix}[]` };
}

function restoreArrayItemWithLookup(params: {
  item: unknown;
  index: number;
  originalArray: unknown[];
  lookup: Set<string>;
  path: string;
  hints: ConfigUiHints;
}): unknown {
  if (params.item === REDACTED_SENTINEL) {
    return params.originalArray[params.index];
  }
  return restoreRedactedValuesWithLookup(
    params.item,
    params.originalArray[params.index],
    params.lookup,
    params.path,
    params.hints,
  );
}

function restoreArrayItemWithGuessing(params: {
  item: unknown;
  index: number;
  originalArray: unknown[];
  path: string;
  hints?: ConfigUiHints;
}): unknown {
  if (
    !isExplicitlyNonSensitivePath(params.hints, [params.path]) &&
    isSensitivePath(params.path) &&
    params.item === REDACTED_SENTINEL
  ) {
    return params.originalArray[params.index];
  }
  return restoreRedactedValuesGuessing(
    params.item,
    params.originalArray[params.index],
    params.path,
    params.hints,
  );
}

function restoreGuessingArray(
  incoming: unknown[],
  original: unknown,
  path: string,
  hints?: ConfigUiHints,
): unknown[] {
  return mapRedactedArray({
    incoming,
    original,
    path,
    mapItem: (item, index, originalArray) =>
      restoreArrayItemWithGuessing({
        item,
        index,
        originalArray,
        path,
        hints,
      }),
  });
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
<<<<<<< HEAD
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
  if (incoming === null || incoming === undefined) {
    return incoming;
  }
  if (typeof incoming !== "object") {
    return incoming;
  }
  if (Array.isArray(incoming)) {
<<<<<<< HEAD
    const origArr = Array.isArray(original) ? original : [];
    return incoming.map((item, i) => restoreRedactedValues(item, origArr[i]));
=======
=======
  if (shouldPassThroughRestoreValue(incoming)) {
    return incoming;
  }

  const arrayContext = toRestoreArrayContext(incoming, prefix);
  if (arrayContext) {
>>>>>>> 3179097a1 (refactor: dedupe redact snapshot restore prelude)
    // Note: If the user removed an item in the middle of the array,
    // we have no way of knowing which one. In this case, the last
    // element(s) get(s) chopped off. Not good, so please don't put
    // sensitive string array in the config...
    const { incoming: incomingArray, path } = arrayContext;
    if (!lookup.has(path)) {
      // Keep behavior symmetric with object fallback: if hints miss the path,
      // still run pattern-based guessing for non-extension arrays.
      return restoreRedactedValuesGuessing(incomingArray, original, prefix, hints);
    }
    return mapRedactedArray({
      incoming: incomingArray,
      original,
      path,
      mapItem: (item, index, originalArray) =>
        restoreArrayItemWithLookup({
          item,
          index,
          originalArray,
          lookup,
          path,
          hints,
        }),
    });
>>>>>>> 231f2af7d (refactor(config): dedupe redacted snapshot array/object restore paths)
  }
  const orig = toObjectRecord(original);
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
    if (!matched) {
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
  if (shouldPassThroughRestoreValue(incoming)) {
    return incoming;
  }

  const arrayContext = toRestoreArrayContext(incoming, prefix);
  if (arrayContext) {
    // Note: If the user removed an item in the middle of the array,
    // we have no way of knowing which one. In this case, the last
    // element(s) get(s) chopped off. Not good, so please don't put
    // sensitive string array in the config...
    const { incoming: incomingArray, path } = arrayContext;
    return restoreGuessingArray(incomingArray, original, path, hints);
  }
  const orig = toObjectRecord(original);
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
