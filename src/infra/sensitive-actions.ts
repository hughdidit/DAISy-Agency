import crypto from "node:crypto";

export type SensitiveActionCategory = "financial" | "deletion";

export type SensitiveActionClassification = {
  category: SensitiveActionCategory;
  reason: string;
  operationPreview: string;
  operationHash: string;
};

type ClassifySensitiveActionParams = {
  surface: "tool" | "gateway";
  toolName?: string;
  method?: string;
  actionName?: string;
  payload?: unknown;
  agentId?: string;
  sessionKey?: string;
};

const MAX_STRING_CHARS = 240;
const MAX_ARRAY_ITEMS = 16;
const MAX_OBJECT_KEYS = 32;
const MAX_PREVIEW_CHARS = 2_000;
const CAMEL_CASE_BOUNDARY = /([a-z])([A-Z])/g;
const PASCAL_CASE_BOUNDARY = /([A-Z])([A-Z][a-z])/g;

const DELETION_TERMS = [
  "delete",
  "remove",
  "purge",
  "trash",
  "destroy",
  "wipe",
  "rmdir",
  "unlink",
  "drop",
  "archive-destructive",
  "destructive-archive",
] as const;

const FINANCIAL_TERMS = [
  "payment",
  "purchase",
  "order",
  "checkout",
  "funds",
  "transaction",
  "spend",
  "buy",
  "paid",
  "invoice",
  "billing",
  "charge",
] as const;
const SENSITIVE_TERMS: readonly string[] = [...DELETION_TERMS, ...FINANCIAL_TERMS];

function redactOrBound(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value.length > MAX_STRING_CHARS ? `${value.slice(0, MAX_STRING_CHARS)}...` : value;
  }
  if (Array.isArray(value)) {
    const bounded = value.slice(0, MAX_ARRAY_ITEMS).map((entry) => redactOrBound(entry, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) {
      bounded.push(`...${value.length - MAX_ARRAY_ITEMS} more`);
    }
    return bounded;
  }
  if (!value || typeof value !== "object") {
    return typeof value;
  }
  if (depth >= 4) {
    return "[object]";
  }
  const result: Record<string, unknown> = {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_OBJECT_KEYS);
  for (const [key, raw] of entries) {
    if (/token|secret|password|credential|api[_-]?key|authorization/i.test(key)) {
      result[key] = "[redacted]";
    } else {
      result[key] = redactOrBound(raw, depth + 1);
    }
  }
  const totalKeys = Object.keys(value as Record<string, unknown>).length;
  if (totalKeys > MAX_OBJECT_KEYS) {
    result["..."] = `${totalKeys - MAX_OBJECT_KEYS} more keys`;
  }
  return result;
}

function redactForFingerprint(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return "[circular]";
    }
    seen.add(value);
    const result = value.map((entry) => redactForFingerprint(entry, seen));
    seen.delete(value);
    return result;
  }
  if (!value || typeof value !== "object") {
    return typeof value;
  }
  if (seen.has(value)) {
    return "[circular]";
  }
  seen.add(value);
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (/token|secret|password|credential|api[_-]?key|authorization/i.test(key)) {
      result[key] = "[redacted]";
    } else {
      result[key] = redactForFingerprint(raw, seen);
    }
  }
  seen.delete(value);
  return result;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).toSorted(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function termsMatch(haystack: string, terms: readonly string[]): string | null {
  const normalized = haystack
    .replace(CAMEL_CASE_BOUNDARY, "$1 $2")
    .replace(PASCAL_CASE_BOUNDARY, "$1 $2")
    .toLowerCase();
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = term.includes("-")
      ? new RegExp(escaped, "i")
      : new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    if (pattern.test(normalized)) {
      return term;
    }
  }
  return null;
}

function isActionLikePayloadKey(key: string): boolean {
  const normalized = key
    .replace(CAMEL_CASE_BOUNDARY, "$1 $2")
    .replace(/[-_.]/g, " ")
    .toLowerCase();
  return /\b(action|operation|command|method|intent|verb)\b/.test(normalized);
}

function payloadFlagIsEnabled(value: unknown): boolean {
  return value !== false && value !== null && value !== undefined;
}

function collectPayloadIntentText(value: unknown, depth = 0, includeBareStrings = true): string[] {
  if (typeof value === "string") {
    return includeBareStrings ? [value] : [];
  }
  if (!value || typeof value !== "object" || depth >= 4) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectPayloadIntentText(entry, depth + 1, includeBareStrings));
  }

  const result: string[] = [];
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (isActionLikePayloadKey(key)) {
      result.push(key);
      if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
        result.push(String(raw));
      } else {
        result.push(...collectPayloadIntentText(raw, depth + 1, true));
      }
      continue;
    }

    if (payloadFlagIsEnabled(raw) && termsMatch(key, SENSITIVE_TERMS)) {
      result.push(key);
    }

    if (raw && typeof raw === "object") {
      result.push(...collectPayloadIntentText(raw, depth + 1, false));
    }
  }
  return result;
}

function buildPreview(params: ClassifySensitiveActionParams): string {
  const boundedPayload = redactOrBound(params.payload);
  const preview = stableStringify({
    surface: params.surface,
    toolName: params.toolName ?? null,
    method: params.method ?? null,
    actionName: params.actionName ?? null,
    agentId: params.agentId ?? null,
    sessionKey: params.sessionKey ?? null,
    payload: boundedPayload,
  });
  return preview.length > MAX_PREVIEW_CHARS ? `${preview.slice(0, MAX_PREVIEW_CHARS)}...` : preview;
}

export function classifySensitiveAction(
  params: ClassifySensitiveActionParams,
): SensitiveActionClassification | null {
  const preview = buildPreview(params);
  const fingerprint = stableStringify({
    surface: params.surface,
    toolName: params.toolName ?? null,
    method: params.method ?? null,
    actionName: params.actionName ?? null,
    agentId: params.agentId ?? null,
    sessionKey: params.sessionKey ?? null,
    payload: redactForFingerprint(params.payload),
  });
  const haystack = [
    params.toolName,
    params.method,
    params.actionName,
    ...collectPayloadIntentText(params.payload),
  ]
    .filter(Boolean)
    .join(" ");

  const deletionTerm = termsMatch(haystack, DELETION_TERMS);
  const financialTerm = termsMatch(haystack, FINANCIAL_TERMS);
  const category: SensitiveActionCategory | null = deletionTerm
    ? "deletion"
    : financialTerm
      ? "financial"
      : null;
  if (!category) {
    return null;
  }
  const operationHash = crypto
    .createHash("sha256")
    .update(stableStringify({ category, fingerprint }))
    .digest("hex");
  return {
    category,
    reason:
      category === "deletion"
        ? `matched destructive term "${deletionTerm}"`
        : `matched financial term "${financialTerm}"`,
    operationPreview: preview,
    operationHash,
  };
}

export function isSensitiveApprovalCategory(value: unknown): value is SensitiveActionCategory {
  return value === "financial" || value === "deletion";
}
