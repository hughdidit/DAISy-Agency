import fs from "node:fs";
import path from "node:path";
import { PluginError } from "./errors.js";

export type GwsCommandSpec = {
  argv: string[];
  action: string;
  service: "drive" | "gmail" | "calendar" | "docs" | "sheets";
  isWrite: boolean;
  cwd?: string;
};

type JsonParamValue = string | number | boolean | null | string[] | number[];

const WILDCARD_FROM_DOMAIN_PATTERN =
  /\bfrom:\s*(?:\(\s*)?\*?@([A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,})(?:\s*\))?/gi;
const WILDCARD_FROM_DOMAIN_GROUP_PATTERN =
  /\bfrom:\(\s*((?:\*?@[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}\s*(?:\bOR\b\s*)?)+)\)/gi;
const DOMAIN_IN_GROUP_PATTERN = /\*?@([A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,})/gi;

function appendIfString(params: Record<string, JsonParamValue>, key: string, value: unknown): void {
  if (typeof value === "string" && value.trim()) {
    params[key] = value.trim();
  }
}

function appendIfStringArray(
  params: Record<string, JsonParamValue>,
  key: string,
  value: unknown,
): void {
  if (!Array.isArray(value)) {
    return;
  }
  const values = value
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (values.length > 0) {
    params[key] = values;
  }
}

function appendIfInt(params: Record<string, JsonParamValue>, key: string, value: unknown): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    params[key] = Math.floor(value);
  }
}

function appendParamsArg(argv: string[], params: Record<string, JsonParamValue>): void {
  if (Object.keys(params).length > 0) {
    argv.push("--params", JSON.stringify(params));
  }
}

function normalizeDomain(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(normalized) ? normalized : undefined;
}

function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(normalized) ? normalized : undefined;
}

export function extractWildcardFromDomainFilters(query: unknown): {
  query?: string;
  fromDomains: string[];
} {
  if (typeof query !== "string" || !query.trim()) {
    return { fromDomains: [] };
  }
  const domains: string[] = [];
  const addDomain = (value: string) => {
    const normalized = normalizeDomain(value);
    if (normalized && !domains.includes(normalized)) {
      domains.push(normalized);
    }
  };
  const withoutGroups = query.replace(
    WILDCARD_FROM_DOMAIN_GROUP_PATTERN,
    (_match, group: string) => {
      for (const match of group.matchAll(DOMAIN_IN_GROUP_PATTERN)) {
        addDomain(match[1] ?? "");
      }
      return " ";
    },
  );
  const stripped = withoutGroups.replace(WILDCARD_FROM_DOMAIN_PATTERN, (_match, domain: string) => {
    addDomain(domain);
    return " ";
  });
  const normalizedQuery = stripped
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(?:AND|OR)\b\s*/i, "")
    .replace(/\s*\b(?:AND|OR)$/i, "")
    .trim();
  return {
    query: /^(?:AND|OR)?$/i.test(normalizedQuery) ? undefined : normalizedQuery || undefined,
    fromDomains: domains,
  };
}

export function buildGmailReadQuery(
  params: Record<string, unknown>,
  options?: { includeDomainFilter?: boolean; includeEmailFilter?: boolean },
): string | undefined {
  const parts: string[] = [];
  const extracted = extractWildcardFromDomainFilters(params.query);
  if (extracted.query) {
    parts.push(extracted.query);
  }
  if (params.unread === true) {
    parts.push("is:unread");
  }
  if (params.inbox === true) {
    parts.push("in:inbox");
  }
  const fromEmail = normalizeEmail(params.fromEmail);
  if (fromEmail && options?.includeEmailFilter !== false) {
    parts.push(`from:${fromEmail}`);
  }
  const domains = new Set<string>();
  const fromDomain = normalizeDomain(params.fromDomain);
  if (fromDomain) {
    domains.add(fromDomain);
  }
  for (const domain of extracted.fromDomains) {
    domains.add(domain);
  }
  if (domains.size > 0 && options?.includeDomainFilter) {
    const domainFilters = [...domains].map((domain) => `from:${domain}`);
    parts.push(domainFilters.length === 1 ? domainFilters[0] : `(${domainFilters.join(" OR ")})`);
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function appendJsonArg(argv: string[], payload: Record<string, unknown>): void {
  argv.push("--json", JSON.stringify(payload));
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new PluginError("VALIDATION_ERROR", `${label} is required`);
  }
  return value.trim();
}

function resolveUploadFile(input: unknown): { cwd: string; relativePath: string } {
  const rawPath = readString(input, "filePath");
  const resolvedPath = path.resolve(rawPath);
  let stats: fs.Stats;
  try {
    stats = fs.statSync(resolvedPath);
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : undefined;
    if (code === "ENOENT") {
      throw new PluginError("VALIDATION_ERROR", "filePath does not exist");
    }
    throw new PluginError("VALIDATION_ERROR", "filePath could not be accessed");
  }

  if (!stats.isFile()) {
    throw new PluginError("VALIDATION_ERROR", "filePath must reference a regular file");
  }

  return {
    cwd: path.dirname(resolvedPath),
    relativePath: path.basename(resolvedPath),
  };
}

function asStringArray(value: unknown): string[] | undefined {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  const values = value
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function sanitizeHeaderValue(value: string, label: string): string {
  if (/[\r\n]/.test(value)) {
    throw new PluginError("VALIDATION_ERROR", `${label} cannot contain newlines`);
  }
  return value.trim();
}

function sanitizeAddressList(value: unknown, label: string): string[] | undefined {
  const values = asStringArray(value);
  return values?.map((entry) => sanitizeHeaderValue(entry, label));
}

function createMimeMessage(params: Record<string, unknown>): string {
  const to = sanitizeAddressList(params.to, "to");
  if (!to || to.length === 0) {
    throw new PluginError("VALIDATION_ERROR", "to is required");
  }

  const cc = sanitizeAddressList(params.cc, "cc");
  const bcc = sanitizeAddressList(params.bcc, "bcc");
  const replyTo =
    typeof params.replyTo === "string" && params.replyTo.trim()
      ? sanitizeHeaderValue(params.replyTo, "replyTo")
      : undefined;
  const subject =
    typeof params.subject === "string" && params.subject.trim()
      ? sanitizeHeaderValue(params.subject, "subject")
      : "";
  const bodyText =
    typeof params.bodyText === "string" && params.bodyText.trim() ? params.bodyText : "";
  const bodyHtml =
    typeof params.bodyHtml === "string" && params.bodyHtml.trim() ? params.bodyHtml : "";
  const contentType =
    bodyText || !bodyHtml ? "text/plain; charset=UTF-8" : "text/html; charset=UTF-8";
  const body = bodyText || bodyHtml;

  const headers = [
    `To: ${to.join(", ")}`,
    ...(cc?.length ? [`Cc: ${cc.join(", ")}`] : []),
    ...(bcc?.length ? [`Bcc: ${bcc.join(", ")}`] : []),
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: ${contentType}`,
    "",
    body,
  ];
  return Buffer.from(headers.join("\r\n"), "utf8").toString("base64url");
}

export function buildDriveReadCommand(
  params: Record<string, unknown>,
  authArgs: string[],
): GwsCommandSpec {
  const argv = ["drive", ...authArgs];
  if (params.action === "list_files") {
    const requestParams: Record<string, JsonParamValue> = {};
    appendIfInt(requestParams, "pageSize", params.pageSize);
    appendIfString(requestParams, "q", params.query);
    argv.push("files", "list", "--format", "json");
    appendParamsArg(argv, requestParams);
    return { argv, action: "list_files", service: "drive", isWrite: false };
  }
  if (params.action === "get_file_metadata") {
    argv.push("files", "get", "--format", "json");
    appendParamsArg(argv, { fileId: readString(params.fileId, "fileId") });
    return { argv, action: "get_file_metadata", service: "drive", isWrite: false };
  }
  if (params.action === "export_file") {
    argv.push("files", "export", "--format", "json");
    appendParamsArg(argv, {
      fileId: readString(params.fileId, "fileId"),
      mimeType: readString(params.mimeType, "mimeType"),
    });
    return { argv, action: "export_file", service: "drive", isWrite: false };
  }
  throw new PluginError("DENY_POLICY", `Unsupported drive action: ${String(params.action)}`);
}

export function buildGmailReadCommand(
  params: Record<string, unknown>,
  authArgs: string[],
): GwsCommandSpec {
  const argv = ["gmail", ...authArgs];
  if (params.action === "list_messages") {
    const requestParams: Record<string, JsonParamValue> = { userId: "me" };
    appendIfString(requestParams, "q", buildGmailReadQuery(params, { includeDomainFilter: true }));
    appendIfInt(requestParams, "maxResults", params.maxResults);
    argv.push("users", "messages", "list", "--format", "json");
    appendParamsArg(argv, requestParams);
    return { argv, action: "list_messages", service: "gmail", isWrite: false };
  }
  if (params.action === "get_message_metadata") {
    argv.push("users", "messages", "get", "--format", "json");
    appendParamsArg(argv, {
      userId: "me",
      id: readString(params.messageId, "messageId"),
      format: "metadata",
    });
    return { argv, action: "get_message_metadata", service: "gmail", isWrite: false };
  }
  throw new PluginError("DENY_POLICY", `Unsupported gmail action: ${String(params.action)}`);
}

export function buildCalendarReadCommand(
  params: Record<string, unknown>,
  authArgs: string[],
): GwsCommandSpec {
  const argv = ["calendar", ...authArgs];
  if (params.action === "list_events") {
    const requestParams: Record<string, JsonParamValue> = {
      calendarId:
        typeof params.calendarId === "string" && params.calendarId.trim()
          ? params.calendarId.trim()
          : "primary",
      singleEvents: true,
    };
    appendIfInt(requestParams, "maxResults", params.pageSize);
    appendIfString(requestParams, "timeMin", params.timeMin);
    appendIfString(requestParams, "timeMax", params.timeMax);
    argv.push("events", "list", "--format", "json");
    appendParamsArg(argv, requestParams);
    return { argv, action: "list_events", service: "calendar", isWrite: false };
  }
  if (params.action === "get_event") {
    argv.push("events", "get", "--format", "json");
    appendParamsArg(argv, {
      calendarId:
        typeof params.calendarId === "string" && params.calendarId.trim()
          ? params.calendarId.trim()
          : "primary",
      eventId: readString(params.eventId, "eventId"),
    });
    return { argv, action: "get_event", service: "calendar", isWrite: false };
  }
  throw new PluginError("DENY_POLICY", `Unsupported calendar action: ${String(params.action)}`);
}

export function buildDocsReadCommand(
  params: Record<string, unknown>,
  authArgs: string[],
): GwsCommandSpec {
  const argv = ["docs", ...authArgs, "documents", "get", "--format", "json"];
  appendParamsArg(argv, { documentId: readString(params.documentId, "documentId") });
  return { argv, action: "get_document", service: "docs", isWrite: false };
}

export function buildSheetsReadCommand(
  params: Record<string, unknown>,
  authArgs: string[],
): GwsCommandSpec {
  if (params.action === "get_spreadsheet") {
    const argv = ["sheets", ...authArgs, "spreadsheets", "get", "--format", "json"];
    appendParamsArg(argv, { spreadsheetId: readString(params.spreadsheetId, "spreadsheetId") });
    return { argv, action: "get_spreadsheet", service: "sheets", isWrite: false };
  }
  if (params.action === "get_values") {
    const argv = ["sheets", ...authArgs, "spreadsheets", "values", "get", "--format", "json"];
    appendParamsArg(argv, {
      spreadsheetId: readString(params.spreadsheetId, "spreadsheetId"),
      range: readString(params.range, "range"),
    });
    return { argv, action: "get_values", service: "sheets", isWrite: false };
  }
  throw new PluginError("DENY_POLICY", `Unsupported sheets action: ${String(params.action)}`);
}

export function buildDriveWriteCommand(
  params: Record<string, unknown>,
  authArgs: string[],
): GwsCommandSpec {
  if (params.action === "create_folder") {
    const argv = ["drive", ...authArgs, "files", "create", "--format", "json"];
    const body: Record<string, unknown> = {
      name: readString(params.name, "name"),
      mimeType: "application/vnd.google-apps.folder",
    };
    if (typeof params.parentId === "string" && params.parentId.trim()) {
      body.parents = [params.parentId.trim()];
    }
    appendJsonArg(argv, body);
    return { argv, action: "create_folder", service: "drive", isWrite: true };
  }
  if (params.action === "upload_file") {
    const argv = ["drive", ...authArgs, "files", "create", "--format", "json"];
    const body: Record<string, unknown> = {};
    const upload = resolveUploadFile(params.filePath);
    if (typeof params.name === "string" && params.name.trim()) {
      body.name = params.name.trim();
    }
    if (typeof params.parentId === "string" && params.parentId.trim()) {
      body.parents = [params.parentId.trim()];
    }
    if (typeof params.mimeType === "string" && params.mimeType.trim()) {
      body.mimeType = params.mimeType.trim();
    }
    appendJsonArg(argv, body);
    argv.push("--upload", upload.relativePath);
    if (typeof params.mimeType === "string" && params.mimeType.trim()) {
      argv.push("--upload-content-type", params.mimeType.trim());
    }
    return {
      argv,
      action: "upload_file",
      service: "drive",
      isWrite: true,
      cwd: upload.cwd,
    };
  }
  if (params.action === "update_file_metadata") {
    const argv = ["drive", ...authArgs, "files", "update", "--format", "json"];
    const requestParams: Record<string, JsonParamValue> = {
      fileId: readString(params.fileId, "fileId"),
    };
    appendIfStringArray(requestParams, "addParents", params.addParents);
    appendIfStringArray(requestParams, "removeParents", params.removeParents);
    appendParamsArg(argv, requestParams);
    const body: Record<string, unknown> = {};
    if (typeof params.name === "string" && params.name.trim()) {
      body.name = params.name.trim();
    }
    if (typeof params.description === "string" && params.description.trim()) {
      body.description = params.description.trim();
    }
    appendJsonArg(argv, body);
    return { argv, action: "update_file_metadata", service: "drive", isWrite: true };
  }
  throw new PluginError("DENY_POLICY", `Unsupported drive write action: ${String(params.action)}`);
}

export function buildGmailWriteCommand(
  params: Record<string, unknown>,
  authArgs: string[],
): GwsCommandSpec {
  const raw = createMimeMessage(params);
  if (params.action === "draft_message") {
    const argv = ["gmail", ...authArgs, "users", "drafts", "create", "--format", "json"];
    appendParamsArg(argv, { userId: "me" });
    appendJsonArg(argv, { message: { raw } });
    return { argv, action: "draft_message", service: "gmail", isWrite: true };
  }
  if (params.action === "send_message") {
    const argv = ["gmail", ...authArgs, "users", "messages", "send", "--format", "json"];
    appendParamsArg(argv, { userId: "me" });
    appendJsonArg(argv, { raw });
    return { argv, action: "send_message", service: "gmail", isWrite: true };
  }
  throw new PluginError("DENY_POLICY", `Unsupported gmail write action: ${String(params.action)}`);
}

export function buildCalendarWriteCommand(
  params: Record<string, unknown>,
  authArgs: string[],
): GwsCommandSpec {
  const calendarId =
    typeof params.calendarId === "string" && params.calendarId.trim()
      ? params.calendarId.trim()
      : "primary";
  const attendees =
    Array.isArray(params.attendees) && params.attendees.length > 0
      ? params.attendees
          .filter((entry) => typeof entry === "string")
          .map((entry) => ({ email: entry.trim() }))
      : undefined;
  const body: Record<string, unknown> = {};
  if (typeof params.summary === "string" && params.summary.trim()) {
    body.summary = params.summary.trim();
  }
  if (typeof params.description === "string" && params.description.trim()) {
    body.description = params.description.trim();
  }
  if (typeof params.location === "string" && params.location.trim()) {
    body.location = params.location.trim();
  }
  if (typeof params.start === "string" && params.start.trim()) {
    body.start = { dateTime: params.start.trim() };
  }
  if (typeof params.end === "string" && params.end.trim()) {
    body.end = { dateTime: params.end.trim() };
  }
  if (attendees) {
    body.attendees = attendees;
  }
  if (params.action === "create_event") {
    const argv = ["calendar", ...authArgs, "events", "insert", "--format", "json"];
    appendParamsArg(argv, { calendarId });
    appendJsonArg(argv, body);
    return { argv, action: "create_event", service: "calendar", isWrite: true };
  }
  if (params.action === "update_event") {
    const argv = ["calendar", ...authArgs, "events", "patch", "--format", "json"];
    appendParamsArg(argv, { calendarId, eventId: readString(params.eventId, "eventId") });
    appendJsonArg(argv, body);
    return { argv, action: "update_event", service: "calendar", isWrite: true };
  }
  throw new PluginError(
    "DENY_POLICY",
    `Unsupported calendar write action: ${String(params.action)}`,
  );
}

export function buildDocsWriteCommand(
  params: Record<string, unknown>,
  authArgs: string[],
): GwsCommandSpec {
  if (params.action === "create_document") {
    const argv = ["docs", ...authArgs, "documents", "create", "--format", "json"];
    appendJsonArg(argv, { title: readString(params.title, "title") });
    return { argv, action: "create_document", service: "docs", isWrite: true };
  }
  if (params.action === "append_text") {
    const argv = ["docs", ...authArgs, "documents", "batchUpdate", "--format", "json"];
    appendParamsArg(argv, { documentId: readString(params.documentId, "documentId") });
    appendJsonArg(argv, {
      requests: [
        {
          insertText: {
            endOfSegmentLocation: {},
            text: readString(params.text, "text"),
          },
        },
      ],
    });
    return { argv, action: "append_text", service: "docs", isWrite: true };
  }
  if (params.action === "batch_update_document") {
    if (!Array.isArray(params.requests) || params.requests.length === 0) {
      throw new PluginError("VALIDATION_ERROR", "requests is required");
    }
    const argv = ["docs", ...authArgs, "documents", "batchUpdate", "--format", "json"];
    appendParamsArg(argv, { documentId: readString(params.documentId, "documentId") });
    appendJsonArg(argv, { requests: params.requests });
    return { argv, action: "batch_update_document", service: "docs", isWrite: true };
  }
  throw new PluginError("DENY_POLICY", `Unsupported docs write action: ${String(params.action)}`);
}

export function buildSheetsWriteCommand(
  params: Record<string, unknown>,
  authArgs: string[],
): GwsCommandSpec {
  if (params.action === "create_spreadsheet") {
    const argv = ["sheets", ...authArgs, "spreadsheets", "create", "--format", "json"];
    appendJsonArg(argv, {
      properties: {
        title: readString(params.title, "title"),
      },
    });
    return { argv, action: "create_spreadsheet", service: "sheets", isWrite: true };
  }

  const valueInputOption =
    typeof params.valueInputOption === "string" && params.valueInputOption.trim()
      ? params.valueInputOption.trim()
      : "USER_ENTERED";
  if (!Array.isArray(params.values) || params.values.length === 0) {
    throw new PluginError("VALIDATION_ERROR", "values is required");
  }

  if (params.action === "append_values") {
    const argv = ["sheets", ...authArgs, "spreadsheets", "values", "append", "--format", "json"];
    appendParamsArg(argv, {
      spreadsheetId: readString(params.spreadsheetId, "spreadsheetId"),
      range: readString(params.range, "range"),
      valueInputOption,
    });
    appendJsonArg(argv, { values: params.values });
    return { argv, action: "append_values", service: "sheets", isWrite: true };
  }
  if (params.action === "update_values") {
    const argv = ["sheets", ...authArgs, "spreadsheets", "values", "update", "--format", "json"];
    appendParamsArg(argv, {
      spreadsheetId: readString(params.spreadsheetId, "spreadsheetId"),
      range: readString(params.range, "range"),
      valueInputOption,
    });
    appendJsonArg(argv, { values: params.values });
    return { argv, action: "update_values", service: "sheets", isWrite: true };
  }
  throw new PluginError("DENY_POLICY", `Unsupported sheets write action: ${String(params.action)}`);
}
