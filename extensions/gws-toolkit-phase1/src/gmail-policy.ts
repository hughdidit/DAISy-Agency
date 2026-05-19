import fs from "node:fs";
import path from "node:path";
import type { GmailContactPolicy } from "./types.js";

export type GmailPolicyResolution =
  | { ok: true; value: GmailContactPolicy | undefined }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const DOMAIN_PATTERN = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizeGmailPolicyEmail(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : undefined;
}

export function normalizeGmailPolicyDomain(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().replace(/^@/, "").toLowerCase();
  return DOMAIN_PATTERN.test(normalized) ? normalized : undefined;
}

function uniqueNormalizedList(
  values: unknown,
  normalize: (value: unknown) => string | undefined,
  label: string,
): { ok: true; values: string[] } | { ok: false; error: string } {
  if (!Array.isArray(values)) {
    return { ok: false, error: `${label} must be an array` };
  }
  const normalized: string[] = [];
  for (const value of values) {
    const entry = normalize(value);
    if (!entry) {
      return { ok: false, error: `${label} contains an invalid entry` };
    }
    if (!normalized.includes(entry)) {
      normalized.push(entry);
    }
  }
  return { ok: true, values: normalized };
}

function isPathInside(parent: string, child: string): boolean {
  const normalize = (value: string) => {
    const stripped = path.resolve(value).replace(/[\\/]+$/, "");
    return process.platform === "win32" ? stripped.toLowerCase() : stripped;
  };
  const normalizedParent = normalize(parent);
  const normalizedChild = normalize(child);
  return (
    normalizedChild === normalizedParent ||
    normalizedChild.startsWith(`${normalizedParent}${path.sep}`)
  );
}

function resolvePolicyFile(params: {
  sourcePath: string | undefined;
  rawPath: string;
  label: string;
}): { ok: true; path: string } | { ok: false; error: string } {
  if (!params.sourcePath?.trim()) {
    return {
      ok: false,
      error:
        `${params.label} requires OPENCLAW_CONFIG_FILE or OPENCLAW_CONFIG_PATH ` +
        "so relative policy paths can be resolved",
    };
  }
  let configDir: string;
  try {
    configDir = fs.realpathSync(path.dirname(path.resolve(params.sourcePath)));
  } catch (error) {
    return {
      ok: false,
      error: `Failed to resolve config directory for ${params.label}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  const candidate = path.isAbsolute(params.rawPath)
    ? path.resolve(params.rawPath)
    : path.resolve(configDir, params.rawPath);
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(candidate);
  } catch (error) {
    return {
      ok: false,
      error: `${params.label} is not readable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  if (stat.isSymbolicLink()) {
    return { ok: false, error: `${params.label} must not be a symlink` };
  }
  if (!stat.isFile()) {
    return { ok: false, error: `${params.label} must be a regular file` };
  }

  let realPath: string;
  try {
    realPath = fs.realpathSync(candidate);
  } catch (error) {
    return {
      ok: false,
      error: `Failed to resolve ${params.label}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  if (!isPathInside(configDir, realPath)) {
    return { ok: false, error: `${params.label} must stay inside the config directory` };
  }
  return { ok: true, path: realPath };
}

function readContactList(
  filePath: string,
  label: string,
): { ok: true; emails: string[]; domains: string[] } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    return {
      ok: false,
      error: `${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const obj = asObject(parsed);
  if (!obj) {
    return { ok: false, error: `${label} must contain a JSON object` };
  }
  if (obj.version !== 1) {
    return { ok: false, error: `${label} must set version to 1` };
  }
  const unknownKeys = Object.keys(obj).filter(
    (key) => key !== "version" && key !== "emails" && key !== "domains",
  );
  if (unknownKeys.length > 0) {
    return { ok: false, error: `${label} contains unknown keys: ${unknownKeys.join(", ")}` };
  }
  const emails = uniqueNormalizedList(
    obj.emails ?? [],
    normalizeGmailPolicyEmail,
    `${label}.emails`,
  );
  if (!emails.ok) {
    return emails;
  }
  const domains = uniqueNormalizedList(
    obj.domains ?? [],
    normalizeGmailPolicyDomain,
    `${label}.domains`,
  );
  if (!domains.ok) {
    return domains;
  }
  return { ok: true, emails: emails.values, domains: domains.values };
}

export function resolveGmailContactPolicy(params: {
  rawPolicy: unknown;
  sourcePath?: string;
}): GmailPolicyResolution {
  if (params.rawPolicy === undefined) {
    return { ok: true, value: undefined };
  }
  const obj = asObject(params.rawPolicy);
  if (!obj) {
    return { ok: false, error: "gmailPolicy must be an object" };
  }
  const unknownKeys = Object.keys(obj).filter(
    (key) => key !== "whitelistFile" && key !== "blacklistFile",
  );
  if (unknownKeys.length > 0) {
    return { ok: false, error: `gmailPolicy contains unknown keys: ${unknownKeys.join(", ")}` };
  }

  const readList = (
    key: "whitelistFile" | "blacklistFile",
    label: "gmailPolicy.whitelistFile" | "gmailPolicy.blacklistFile",
  ) => {
    const rawPath = obj[key];
    if (rawPath === undefined) {
      return { ok: true as const, path: undefined, list: { emails: [], domains: [] } };
    }
    if (typeof rawPath !== "string" || !rawPath.trim()) {
      return { ok: false as const, error: `${label} must be a non-empty string` };
    }
    const resolvedFile = resolvePolicyFile({
      sourcePath: params.sourcePath,
      rawPath: rawPath.trim(),
      label,
    });
    if (!resolvedFile.ok) {
      return resolvedFile;
    }
    const list = readContactList(resolvedFile.path, label);
    if (!list.ok) {
      return list;
    }
    return { ok: true as const, path: resolvedFile.path, list };
  };

  const whitelist = readList("whitelistFile", "gmailPolicy.whitelistFile");
  if (!whitelist.ok) {
    return whitelist;
  }
  const blacklist = readList("blacklistFile", "gmailPolicy.blacklistFile");
  if (!blacklist.ok) {
    return blacklist;
  }

  return {
    ok: true,
    value: {
      whitelistFile: whitelist.path,
      blacklistFile: blacklist.path,
      whitelist: {
        emails: whitelist.list.emails,
        domains: whitelist.list.domains,
      },
      blacklist: {
        emails: blacklist.list.emails,
        domains: blacklist.list.domains,
      },
    },
  };
}

export function extractGmailPolicyEmails(value: unknown): string[] {
  const candidates = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const emails: string[] = [];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }
    for (const match of candidate.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
      const normalized = normalizeGmailPolicyEmail(match[0]);
      if (normalized && !emails.includes(normalized)) {
        emails.push(normalized);
      }
    }
  }
  return emails;
}

function emailDomain(email: string): string {
  return email.split("@")[1] ?? "";
}

export function gmailPolicyClassifyEmail(
  policy: GmailContactPolicy | undefined,
  email: string,
): "blacklisted" | "whitelisted" | "unlisted" {
  if (!policy) {
    return "unlisted";
  }
  const normalized = normalizeGmailPolicyEmail(email);
  if (!normalized) {
    return "unlisted";
  }
  const domain = emailDomain(normalized);
  if (policy.blacklist.emails.includes(normalized) || policy.blacklist.domains.includes(domain)) {
    return "blacklisted";
  }
  if (policy.whitelist.emails.includes(normalized) || policy.whitelist.domains.includes(domain)) {
    return "whitelisted";
  }
  return "unlisted";
}

export function buildGmailReadPolicyPayload(
  payload: Record<string, unknown>,
  policy: GmailContactPolicy | undefined,
  options?: { includeBlacklistQueryFilters?: boolean },
): Record<string, unknown> {
  const existingQuery =
    typeof payload.query === "string" && payload.query.trim() ? payload.query.trim() : "";
  const hasQueryToken = (token: string) =>
    new RegExp(`(?:^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`, "i").test(
      existingQuery,
    );
  const blacklistFilters = [
    ...(policy?.blacklist.emails ?? []).map((email) => `-from:${email}`),
    ...(policy?.blacklist.domains ?? []).map((domain) => `-from:${domain}`),
  ].filter((token) => !hasQueryToken(token));
  const queryParts = [
    existingQuery,
    hasQueryToken("-in:spam") ? "" : "-in:spam",
    ...(options?.includeBlacklistQueryFilters ? blacklistFilters : []),
  ].filter(Boolean);
  return {
    ...payload,
    query: queryParts.join(" "),
  };
}

export function evaluateGmailWriteContactPolicy(params: {
  action: string;
  payload: Record<string, unknown>;
  policy: GmailContactPolicy | undefined;
}): { allowed: true } | { allowed: false; reason: string } {
  if (!params.policy || (params.action !== "draft_message" && params.action !== "send_message")) {
    return { allowed: true };
  }
  const recipients = [
    ...extractGmailPolicyEmails(params.payload.to),
    ...extractGmailPolicyEmails(params.payload.cc),
    ...extractGmailPolicyEmails(params.payload.bcc),
  ];
  const blacklisted = recipients.find(
    (recipient) => gmailPolicyClassifyEmail(params.policy, recipient) === "blacklisted",
  );
  if (blacklisted) {
    return {
      allowed: false,
      reason: `gmailPolicy denies ${params.action} for blacklisted recipient ${blacklisted}`,
    };
  }
  if (params.action === "send_message") {
    if (recipients.length === 0) {
      return {
        allowed: false,
        reason: "gmailPolicy requires send_message to include whitelisted recipients",
      };
    }
    const unapproved = recipients.find(
      (recipient) => gmailPolicyClassifyEmail(params.policy, recipient) !== "whitelisted",
    );
    if (unapproved) {
      return {
        allowed: false,
        reason: `gmailPolicy requires send_message recipients to be whitelisted: ${unapproved}`,
      };
    }
  }
  return { allowed: true };
}

function getHeaderValue(payload: unknown, headerName: string): string | undefined {
  const message = asObject(payload);
  const candidates = [
    message,
    asObject(message?.data),
    asObject(message?.message),
    asObject(message?.result),
  ].filter((entry): entry is Record<string, unknown> => Boolean(entry));
  for (const candidate of candidates) {
    const rawPayload = asObject(candidate.payload);
    const headers = rawPayload?.headers;
    if (!Array.isArray(headers)) {
      continue;
    }
    const match = headers.find((entry) => {
      const header = asObject(entry);
      return String(header?.name ?? "").toLowerCase() === headerName.toLowerCase();
    });
    const matchObject = asObject(match);
    if (typeof matchObject?.value === "string") {
      return matchObject.value;
    }
  }
  return undefined;
}

export function evaluateGmailMetadataContactPolicy(params: {
  payload: Record<string, unknown>;
  policy: GmailContactPolicy | undefined;
}): { allowed: true } | { allowed: false; reason: string; sender?: string } {
  if (!params.policy) {
    return { allowed: true };
  }
  const fromHeader = getHeaderValue(params.payload, "From");
  const senders = extractGmailPolicyEmails(fromHeader);
  const blacklisted = senders.find(
    (sender) => gmailPolicyClassifyEmail(params.policy, sender) === "blacklisted",
  );
  if (!blacklisted) {
    return { allowed: true };
  }
  return {
    allowed: false,
    sender: blacklisted,
    reason: `gmailPolicy denies metadata for blacklisted sender ${blacklisted}`,
  };
}
