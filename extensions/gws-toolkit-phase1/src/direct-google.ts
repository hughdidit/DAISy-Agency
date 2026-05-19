import fs from "node:fs";
import path from "node:path";
import { JWT } from "google-auth-library";
import { buildGmailReadQuery, extractWildcardFromDomainFilters } from "./command-builder.js";
import { PluginError } from "./errors.js";
import {
  READONLY_SCOPES,
  WRITE_SCOPES,
  type AuthResolution,
  type GmailContactPolicy,
  type GwsToolkitConfig,
  type InvocationContext,
  type ServiceFamily,
} from "./types.js";

type ServiceAccountJson = {
  type?: string;
  client_email?: string;
  private_key?: string;
  private_key_id?: string;
};

export type DirectGoogleRequest = {
  method: "GET" | "POST" | "PATCH" | "PUT";
  url: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  responseType?: "json" | "arraybuffer";
};

export type DirectGoogleResult = {
  payload: Record<string, unknown>;
  output: {
    stdoutTruncated: false;
    stderrTruncated: false;
  };
};

export type DirectGoogleClientRequestOptions = {
  method: DirectGoogleRequest["method"];
  url: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  responseType?: DirectGoogleRequest["responseType"];
  timeout: number;
};

const clientCache = new Map<string, JWT>();

function getNativeFetchImplementation(): typeof globalThis.fetch | undefined {
  return typeof globalThis.fetch === "function" ? globalThis.fetch : undefined;
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function compactParams(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function readPositiveInt(value: unknown, fallback: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(value), 1), maximum);
}

function normalizeGmailDomain(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(normalized) ? normalized : undefined;
}

function normalizeGmailEmail(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(normalized) ? normalized : undefined;
}

function buildGmailLabelIds(payload: Record<string, unknown>): string[] | undefined {
  const labels = [
    ...(payload.inbox === true ? ["INBOX"] : []),
    ...(payload.unread === true ? ["UNREAD"] : []),
  ];
  return labels.length > 0 ? labels : undefined;
}

type GmailSenderFilters = {
  fromEmail?: string;
  fromDomains: string[];
  excludeEmails: string[];
  excludeDomains: string[];
};

function resolveGmailSenderFilters(
  payload: Record<string, unknown>,
  policy: GmailContactPolicy | undefined,
): GmailSenderFilters {
  const fromDomains: string[] = [];
  const addDomain = (value: unknown) => {
    const normalized = normalizeGmailDomain(value);
    if (normalized && !fromDomains.includes(normalized)) {
      fromDomains.push(normalized);
    }
  };
  addDomain(payload.fromDomain);
  for (const domain of extractWildcardFromDomainFilters(payload.query).fromDomains) {
    addDomain(domain);
  }
  return {
    fromEmail: normalizeGmailEmail(payload.fromEmail),
    fromDomains,
    excludeEmails: policy?.blacklist.emails ?? [],
    excludeDomains: policy?.blacklist.domains ?? [],
  };
}

function getHeaderValue(payload: unknown, name: string): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const headers = (payload as { payload?: { headers?: unknown } }).payload?.headers;
  if (!Array.isArray(headers)) {
    return undefined;
  }
  const match = headers.find((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    return String((entry as { name?: unknown }).name ?? "").toLowerCase() === name.toLowerCase();
  });
  return match && typeof (match as { value?: unknown }).value === "string"
    ? (match as { value: string }).value
    : undefined;
}

function extractEmailAddresses(value: string): string[] {
  return [...value.matchAll(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi)].map((match) =>
    match[0].toLowerCase(),
  );
}

function fromHeaderMatchesFilters(
  fromHeader: string | undefined,
  filters: GmailSenderFilters,
): boolean {
  const hasPolicyExclusions = filters.excludeEmails.length > 0 || filters.excludeDomains.length > 0;
  if (!filters.fromEmail && filters.fromDomains.length === 0 && !hasPolicyExclusions) {
    return true;
  }
  if (!fromHeader) {
    return false;
  }
  const addresses = extractEmailAddresses(fromHeader);
  if (
    addresses.some(
      (address) =>
        filters.excludeEmails.includes(address) ||
        filters.excludeDomains.some((domain) => address.endsWith(`@${domain}`)),
    )
  ) {
    return false;
  }
  if (filters.fromEmail && !addresses.includes(filters.fromEmail)) {
    return false;
  }
  return (
    filters.fromDomains.length === 0 ||
    filters.fromDomains.some((domain) =>
      addresses.some((address) => address.endsWith(`@${domain}`)),
    )
  );
}

function compactRequestOptions<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function buildDirectGoogleClientRequestOptions(params: {
  method: DirectGoogleRequest["method"];
  url: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  responseType?: DirectGoogleRequest["responseType"];
  timeoutMs: number;
}): DirectGoogleClientRequestOptions {
  return compactRequestOptions({
    method: params.method,
    url: params.url,
    params: params.params,
    data: params.data,
    headers: params.headers,
    responseType: params.responseType,
    timeout: params.timeoutMs,
  }) as DirectGoogleClientRequestOptions;
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

function resolveWorkspaceUploadFile(params: { filePath: unknown; workspaceDir?: string }): {
  filePath: string;
  fileBytes: Buffer;
} {
  const rawFilePath = typeof params.filePath === "string" ? params.filePath.trim() : "";
  const rawWorkspaceDir = params.workspaceDir?.trim();
  if (!rawFilePath || !rawWorkspaceDir) {
    throw new PluginError(
      "VALIDATION_ERROR",
      "Direct Drive upload requires filePath inside the active agent workspace.",
    );
  }

  let workspaceRoot: string;
  try {
    workspaceRoot = fs.realpathSync(path.resolve(rawWorkspaceDir));
  } catch {
    throw new PluginError("VALIDATION_ERROR", "Active agent workspace could not be resolved.");
  }

  const candidate = path.isAbsolute(rawFilePath)
    ? path.resolve(rawFilePath)
    : path.resolve(workspaceRoot, rawFilePath);
  if (!isPathInside(workspaceRoot, candidate)) {
    throw new PluginError(
      "VALIDATION_ERROR",
      "Direct Drive upload filePath must remain inside the active agent workspace.",
      { workspaceDir: workspaceRoot },
    );
  }

  let fd: number | undefined;
  try {
    fd = fs.openSync(candidate, "r");
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) {
      throw new PluginError("VALIDATION_ERROR", "Direct Drive upload filePath must be a file.");
    }
    const resolvedFilePath = fs.realpathSync(candidate);
    if (!isPathInside(workspaceRoot, resolvedFilePath)) {
      throw new PluginError(
        "VALIDATION_ERROR",
        "Direct Drive upload filePath cannot resolve outside the active agent workspace.",
        { workspaceDir: workspaceRoot },
      );
    }
    return { filePath: resolvedFilePath, fileBytes: fs.readFileSync(fd) };
  } catch (error) {
    if (error instanceof PluginError) {
      throw error;
    }
    throw new PluginError("VALIDATION_ERROR", "Direct Drive upload filePath could not be read.", {
      cause: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, "").trim();
}

function commaList(value: unknown): unknown {
  return Array.isArray(value) ? value.map(String).join(",") : value;
}

function readServiceAccountJson(credentialsFile: string): ServiceAccountJson {
  try {
    return JSON.parse(fs.readFileSync(credentialsFile, "utf8")) as ServiceAccountJson;
  } catch (error) {
    throw new PluginError("AUTH_ERROR", "Failed to read service-account JSON credentials.", {
      credentialsFile: path.basename(credentialsFile),
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export function resolveDirectGoogleScopes(params: {
  config: GwsToolkitConfig;
  service: ServiceFamily;
  write: boolean;
}): string[] {
  if (params.config.defaultScopesProfile === "custom") {
    return params.config.customScopes ?? [];
  }
  return [params.write ? WRITE_SCOPES[params.service] : READONLY_SCOPES[params.service]];
}

export function createDelegatedGoogleClient(params: {
  credentialsFile: string;
  subject: string;
  scopes: string[];
}): JWT {
  const scopes = params.scopes.toSorted();
  const cacheKey = `${params.credentialsFile}\0${params.subject}\0${scopes.join(" ")}`;
  const cached = clientCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const credentials = readServiceAccountJson(params.credentialsFile);
  if (
    credentials.type !== "service_account" ||
    !credentials.client_email ||
    !credentials.private_key
  ) {
    throw new PluginError(
      "AUTH_ERROR",
      "Delegated Google API transport requires service-account JSON credentials.",
      {
        credentialsFile: path.basename(params.credentialsFile),
        failureCategory: "CREDENTIAL_POLICY",
      },
    );
  }
  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    keyId: credentials.private_key_id,
    scopes,
    subject: params.subject,
    transporterOptions: {
      fetchImplementation: getNativeFetchImplementation(),
    },
  });
  clientCache.set(cacheKey, client);
  return client;
}

function getCredentialsFile(auth: AuthResolution): string {
  const credentialsFile = auth.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE;
  if (!credentialsFile) {
    throw new PluginError("AUTH_ERROR", "Delegated Google API transport requires credentialsFile", {
      routeName: auth.route.name,
      bindingSubject: auth.bindingSubject,
    });
  }
  return credentialsFile;
}

function buildRawEmail(payload: Record<string, unknown>): string {
  const values = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .map(String)
          .map((entry) => sanitizeHeaderValue(entry))
          .filter(Boolean)
      : typeof value === "string" && value.trim()
        ? [sanitizeHeaderValue(value)]
        : [];
  const replyTo = values(payload.replyTo);
  const headers = [
    `To: ${values(payload.to).join(", ")}`,
    ...(values(payload.cc).length ? [`Cc: ${values(payload.cc).join(", ")}`] : []),
    ...(values(payload.bcc).length ? [`Bcc: ${values(payload.bcc).join(", ")}`] : []),
    ...(replyTo.length ? [`Reply-To: ${replyTo.join(", ")}`] : []),
    `Subject: ${typeof payload.subject === "string" ? sanitizeHeaderValue(payload.subject) : ""}`,
    "MIME-Version: 1.0",
  ];
  const html = typeof payload.bodyHtml === "string" ? payload.bodyHtml : undefined;
  if (html) {
    headers.push("Content-Type: text/html; charset=UTF-8");
    return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${html}`, "utf8").toString("base64url");
  }
  headers.push("Content-Type: text/plain; charset=UTF-8");
  return Buffer.from(
    `${headers.join("\r\n")}\r\n\r\n${typeof payload.bodyText === "string" ? payload.bodyText : ""}`,
    "utf8",
  ).toString("base64url");
}

export function buildDirectGoogleRequest(params: {
  service: ServiceFamily;
  action: string;
  payload: Record<string, unknown>;
  ctx?: InvocationContext;
}): DirectGoogleRequest {
  const p = params.payload;
  switch (params.service) {
    case "drive": {
      if (params.action === "list_files") {
        return {
          method: "GET",
          url: "https://www.googleapis.com/drive/v3/files",
          params: compactParams({ pageSize: p.pageSize, q: p.query }),
        };
      }
      if (params.action === "get_file_metadata") {
        return {
          method: "GET",
          url: `https://www.googleapis.com/drive/v3/files/${encodeSegment(String(p.fileId))}`,
        };
      }
      if (params.action === "export_file") {
        return {
          method: "GET",
          url: `https://www.googleapis.com/drive/v3/files/${encodeSegment(String(p.fileId))}/export`,
          params: { mimeType: p.mimeType },
          responseType: "arraybuffer",
        };
      }
      if (params.action === "create_folder") {
        return {
          method: "POST",
          url: "https://www.googleapis.com/drive/v3/files",
          data: compactParams({
            name: p.name,
            mimeType: "application/vnd.google-apps.folder",
            parents: p.parentId ? [p.parentId] : undefined,
          }),
        };
      }
      if (params.action === "upload_file") {
        const upload = resolveWorkspaceUploadFile({
          filePath: p.filePath,
          workspaceDir: params.ctx?.workspaceDir,
        });
        const metadata = compactParams({
          name: p.name ?? path.basename(upload.filePath),
          parents: p.parentId ? [p.parentId] : undefined,
        });
        const mimeType = typeof p.mimeType === "string" ? p.mimeType : "application/octet-stream";
        const boundary = `daisy-${Date.now().toString(36)}`;
        const body = Buffer.concat([
          Buffer.from(
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
            "utf8",
          ),
          Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`, "utf8"),
          upload.fileBytes,
          Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"),
        ]);
        return {
          method: "POST",
          url: "https://www.googleapis.com/upload/drive/v3/files",
          params: { uploadType: "multipart" },
          headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
          data: body,
        };
      }
      if (params.action === "update_file_metadata") {
        return {
          method: "PATCH",
          url: `https://www.googleapis.com/drive/v3/files/${encodeSegment(String(p.fileId))}`,
          params: compactParams({
            addParents: commaList(p.addParents),
            removeParents: commaList(p.removeParents),
          }),
          data: compactParams({ name: p.name, description: p.description }),
        };
      }
      break;
    }
    case "gmail": {
      if (params.action === "list_messages") {
        return {
          method: "GET",
          url: "https://gmail.googleapis.com/gmail/v1/users/me/messages",
          params: compactParams({
            q: buildGmailReadQuery(p, { includeDomainFilter: false }),
            maxResults: p.maxResults,
            labelIds: buildGmailLabelIds(p),
          }),
        };
      }
      if (params.action === "get_message_metadata") {
        return {
          method: "GET",
          url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeSegment(String(p.messageId))}`,
          params: { format: "metadata" },
        };
      }
      if (params.action === "draft_message") {
        return {
          method: "POST",
          url: "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
          data: { message: { raw: buildRawEmail(p) } },
        };
      }
      if (params.action === "send_message") {
        return {
          method: "POST",
          url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          data: { raw: buildRawEmail(p) },
        };
      }
      if (params.action === "mark_message_read") {
        const messageId = typeof p.messageId === "string" ? p.messageId.trim() : "";
        if (!messageId) {
          throw new PluginError("VALIDATION_ERROR", "messageId is required");
        }
        return {
          method: "POST",
          url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeSegment(messageId)}/modify`,
          data: { removeLabelIds: ["UNREAD"] },
        };
      }
      break;
    }
    case "calendar": {
      const calendarId = String(p.calendarId ?? "primary");
      if (params.action === "list_events") {
        return {
          method: "GET",
          url: `https://www.googleapis.com/calendar/v3/calendars/${encodeSegment(calendarId)}/events`,
          params: compactParams({
            singleEvents: true,
            maxResults: p.pageSize,
            timeMin: p.timeMin,
            timeMax: p.timeMax,
          }),
        };
      }
      if (params.action === "get_event") {
        return {
          method: "GET",
          url: `https://www.googleapis.com/calendar/v3/calendars/${encodeSegment(calendarId)}/events/${encodeSegment(String(p.eventId))}`,
        };
      }
      if (params.action === "create_event" || params.action === "update_event") {
        const event = compactParams({
          summary: p.summary,
          description: p.description,
          location: p.location,
          start: p.start ? { dateTime: p.start } : undefined,
          end: p.end ? { dateTime: p.end } : undefined,
          attendees: Array.isArray(p.attendees)
            ? p.attendees.map((email) => ({ email: String(email) }))
            : undefined,
        });
        if (params.action === "create_event") {
          return {
            method: "POST",
            url: `https://www.googleapis.com/calendar/v3/calendars/${encodeSegment(calendarId)}/events`,
            data: event,
          };
        }
        return {
          method: "PATCH",
          url: `https://www.googleapis.com/calendar/v3/calendars/${encodeSegment(calendarId)}/events/${encodeSegment(String(p.eventId))}`,
          data: event,
        };
      }
      break;
    }
    case "docs": {
      if (params.action === "get_document") {
        return {
          method: "GET",
          url: `https://docs.googleapis.com/v1/documents/${encodeSegment(String(p.documentId))}`,
        };
      }
      if (params.action === "create_document") {
        return {
          method: "POST",
          url: "https://docs.googleapis.com/v1/documents",
          data: { title: p.title },
        };
      }
      if (params.action === "append_text") {
        return {
          method: "POST",
          url: `https://docs.googleapis.com/v1/documents/${encodeSegment(String(p.documentId))}:batchUpdate`,
          data: { requests: [{ insertText: { endOfSegmentLocation: {}, text: p.text } }] },
        };
      }
      if (params.action === "batch_update_document") {
        return {
          method: "POST",
          url: `https://docs.googleapis.com/v1/documents/${encodeSegment(String(p.documentId))}:batchUpdate`,
          data: { requests: p.requests },
        };
      }
      break;
    }
    case "sheets": {
      if (params.action === "get_spreadsheet") {
        return {
          method: "GET",
          url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeSegment(String(p.spreadsheetId))}`,
        };
      }
      if (params.action === "get_values") {
        return {
          method: "GET",
          url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeSegment(String(p.spreadsheetId))}/values/${encodeSegment(String(p.range))}`,
        };
      }
      if (params.action === "create_spreadsheet") {
        return {
          method: "POST",
          url: "https://sheets.googleapis.com/v4/spreadsheets",
          data: { properties: { title: p.title } },
        };
      }
      if (params.action === "append_values" || params.action === "update_values") {
        const suffix = params.action === "append_values" ? ":append" : "";
        return {
          method: params.action === "append_values" ? "POST" : "PUT",
          url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeSegment(String(p.spreadsheetId))}/values/${encodeSegment(String(p.range))}${suffix}`,
          params: { valueInputOption: p.valueInputOption ?? "USER_ENTERED" },
          data: { values: p.values },
        };
      }
      break;
    }
  }
  throw new PluginError("VALIDATION_ERROR", "Unsupported direct Google API action.", {
    service: params.service,
    action: params.action,
  });
}

function mapGoogleError(error: unknown, auth: AuthResolution): PluginError {
  const err = error as {
    code?: unknown;
    message?: unknown;
    response?: { status?: number; data?: unknown };
  };
  const status = typeof err.response?.status === "number" ? err.response.status : undefined;
  const code = status === 401 || status === 403 ? "AUTH_ERROR" : "CLI_ERROR";
  return new PluginError(code, "Google API request failed.", {
    routeName: auth.route.name,
    bindingSubject: auth.bindingSubject,
    delegatedSubject: auth.impersonatedUser,
    status,
    message: typeof err.message === "string" ? err.message : String(error),
    response: err.response?.data,
    transport: "google_api",
  });
}

async function executeDirectGmailListMessages(params: {
  client: JWT;
  config: GwsToolkitConfig;
  payload: Record<string, unknown>;
}): Promise<DirectGoogleResult> {
  const filters = resolveGmailSenderFilters(params.payload, params.config.gmailPolicy);
  const needsSenderPostFilter = Boolean(
    filters.fromEmail ||
    filters.fromDomains.length > 0 ||
    filters.excludeEmails.length > 0 ||
    filters.excludeDomains.length > 0,
  );
  const needsPositiveSenderFilter = Boolean(filters.fromEmail || filters.fromDomains.length > 0);
  const requestedMaxResults = readPositiveInt(params.payload.maxResults, 100, 500);
  const pageSize = needsSenderPostFilter
    ? Math.min(500, Math.max(50, requestedMaxResults * 5))
    : requestedMaxResults;
  const maxInspected = needsSenderPostFilter
    ? Math.min(2_000, Math.max(pageSize, requestedMaxResults * 20))
    : pageSize;
  const senderScanDeadlineAt = Date.now() + Math.min(params.config.timeoutMs, 30_000);
  const metadataConcurrency = 8;
  const query = buildGmailReadQuery(params.payload, {
    includeDomainFilter: false,
    includeEmailFilter: !needsPositiveSenderFilter,
  });
  const labelIds = buildGmailLabelIds(params.payload);
  const messages: unknown[] = [];
  let inspectedMessageCount = 0;
  let pageToken: string | undefined;
  let nextPageToken: string | undefined;
  let deadlineReached = false;

  do {
    if (needsSenderPostFilter && Date.now() >= senderScanDeadlineAt) {
      deadlineReached = true;
      break;
    }
    const response = await params.client.request(
      buildDirectGoogleClientRequestOptions({
        method: "GET",
        url: "https://gmail.googleapis.com/gmail/v1/users/me/messages",
        params: compactParams({
          q: query,
          maxResults: Math.min(pageSize, maxInspected - inspectedMessageCount),
          labelIds,
          pageToken,
        }),
        timeoutMs: params.config.timeoutMs,
      }),
    );
    const payload = (response.data ?? {}) as {
      messages?: unknown[];
      nextPageToken?: unknown;
      resultSizeEstimate?: unknown;
    };
    const candidates = Array.isArray(payload.messages) ? payload.messages : [];
    if (!needsSenderPostFilter) {
      return {
        payload: payload as Record<string, unknown>,
        output: { stdoutTruncated: false, stderrTruncated: false },
      };
    }

    const validCandidates = candidates.filter((candidate) => {
      if (!candidate || typeof candidate !== "object") {
        return false;
      }
      const id = (candidate as { id?: unknown }).id;
      return typeof id === "string" && Boolean(id.trim());
    });
    const remainingInspectionSlots = maxInspected - inspectedMessageCount;
    const candidatesToInspect = validCandidates.slice(0, remainingInspectionSlots);
    for (let index = 0; index < candidatesToInspect.length; index += metadataConcurrency) {
      if (Date.now() >= senderScanDeadlineAt) {
        deadlineReached = true;
        break;
      }
      const batch = candidatesToInspect.slice(index, index + metadataConcurrency);
      inspectedMessageCount += batch.length;
      const metadataResults = await Promise.all(
        batch.map(async (candidate) => {
          const id = (candidate as { id: string }).id;
          const metadata = await params.client.request(
            buildDirectGoogleClientRequestOptions({
              method: "GET",
              url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeSegment(id)}`,
              params: { format: "metadata", metadataHeaders: ["From"] },
              timeoutMs: params.config.timeoutMs,
            }),
          );
          return { candidate, fromHeader: getHeaderValue(metadata.data, "From") };
        }),
      );
      for (const result of metadataResults) {
        if (fromHeaderMatchesFilters(result.fromHeader, filters)) {
          messages.push(result.candidate);
          if (messages.length >= requestedMaxResults) {
            break;
          }
        }
      }
      if (
        messages.length >= requestedMaxResults ||
        inspectedMessageCount >= maxInspected ||
        deadlineReached
      ) {
        break;
      }
    }

    nextPageToken = typeof payload.nextPageToken === "string" ? payload.nextPageToken : undefined;
    pageToken =
      !deadlineReached &&
      messages.length < requestedMaxResults &&
      inspectedMessageCount < maxInspected
        ? nextPageToken
        : undefined;
  } while (pageToken);

  const inspectionLimitReached = inspectedMessageCount >= maxInspected || deadlineReached;

  return {
    payload: {
      messages,
      resultSizeEstimate: messages.length,
      resultLimitReached: messages.length >= requestedMaxResults,
      scanLimitReached: inspectionLimitReached,
      query,
      filters: {
        fromEmail: filters.fromEmail,
        fromDomains: filters.fromDomains,
        labelIds,
      },
      inspectedMessageCount,
      senderFiltered: true,
    },
    output: {
      stdoutTruncated: false,
      stderrTruncated: false,
    },
  };
}

export async function executeDirectGoogleApi(params: {
  config: GwsToolkitConfig;
  auth: AuthResolution;
  ctx?: InvocationContext;
  service: ServiceFamily;
  action: string;
  payload: Record<string, unknown>;
  write: boolean;
}): Promise<DirectGoogleResult> {
  if (!params.auth.impersonatedUser) {
    throw new PluginError("AUTH_ERROR", "Direct Google API transport requires delegated subject.", {
      routeName: params.auth.route.name,
      bindingSubject: params.auth.bindingSubject,
    });
  }
  const credentialsFile = getCredentialsFile(params.auth);
  const client = createDelegatedGoogleClient({
    credentialsFile,
    subject: params.auth.impersonatedUser,
    scopes: resolveDirectGoogleScopes({
      config: params.config,
      service: params.service,
      write: params.write,
    }),
  });
  if (params.service === "gmail" && params.action === "list_messages") {
    try {
      return await executeDirectGmailListMessages({
        client,
        config: params.config,
        payload: params.payload,
      });
    } catch (error) {
      throw mapGoogleError(error, params.auth);
    }
  }
  const request = buildDirectGoogleRequest({
    service: params.service,
    action: params.action,
    payload: params.payload,
    ctx: params.ctx,
  });
  try {
    const response = await client.request(
      buildDirectGoogleClientRequestOptions({
        method: request.method,
        url: request.url,
        params: request.params,
        data: request.data,
        headers: request.headers,
        responseType: request.responseType,
        timeoutMs: params.config.timeoutMs,
      }),
    );
    const payload =
      request.responseType === "arraybuffer"
        ? {
            contentBase64: Buffer.from(response.data as ArrayBuffer).toString("base64"),
            mimeType: params.payload.mimeType,
          }
        : ((response.data ?? {}) as Record<string, unknown>);
    return {
      payload,
      output: {
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    };
  } catch (error) {
    throw mapGoogleError(error, params.auth);
  }
}

export async function executeDirectAuthHealth(params: {
  config: GwsToolkitConfig;
  auth: AuthResolution;
}): Promise<Record<string, unknown>> {
  if (!params.auth.impersonatedUser) {
    throw new PluginError("AUTH_ERROR", "Delegated auth health requires delegated subject.", {
      routeName: params.auth.route.name,
      bindingSubject: params.auth.bindingSubject,
    });
  }
  const service = params.auth.route.allowedServices.includes("calendar")
    ? "calendar"
    : params.auth.route.allowedServices.includes("gmail")
      ? "gmail"
      : params.auth.route.allowedServices.includes("drive")
        ? "drive"
        : params.auth.route.allowedServices[0];
  if (!service) {
    throw new PluginError("AUTH_ERROR", "No allowed service available for delegated auth health.", {
      routeName: params.auth.route.name,
      bindingSubject: params.auth.bindingSubject,
    });
  }
  const credentialsFile = getCredentialsFile(params.auth);
  const client = createDelegatedGoogleClient({
    credentialsFile,
    subject: params.auth.impersonatedUser,
    scopes: resolveDirectGoogleScopes({ config: params.config, service, write: false }),
  });
  const request =
    service === "calendar"
      ? {
          method: "GET" as const,
          url: "https://www.googleapis.com/calendar/v3/users/me/calendarList/primary",
        }
      : service === "gmail"
        ? {
            method: "GET" as const,
            url: "https://gmail.googleapis.com/gmail/v1/users/me/profile",
          }
        : service === "drive"
          ? {
              method: "GET" as const,
              url: "https://www.googleapis.com/drive/v3/about",
              params: { fields: "user" },
            }
          : service === "docs"
            ? {
                method: "GET" as const,
                url: "https://docs.googleapis.com/v1/documents/daisy_auth_health_probe",
                acceptNotFoundAsValid: true,
              }
            : {
                method: "GET" as const,
                url: "https://sheets.googleapis.com/v4/spreadsheets/daisy_auth_health_probe",
                acceptNotFoundAsValid: true,
              };
  try {
    const response = await client.request(
      buildDirectGoogleClientRequestOptions({
        method: request.method,
        url: request.url,
        params: "params" in request ? request.params : undefined,
        timeoutMs: params.config.timeoutMs,
      }),
    );
    return {
      service,
      tokenValid: true,
      tokenError: null,
      payload: response.data,
    };
  } catch (error) {
    const status =
      typeof (error as { response?: { status?: unknown } }).response?.status === "number"
        ? (error as { response: { status: number } }).response.status
        : undefined;
    if ("acceptNotFoundAsValid" in request && request.acceptNotFoundAsValid && status === 404) {
      return {
        service,
        tokenValid: true,
        tokenError: null,
        payload: { status, notFoundAcceptedAsDelegatedSmoke: true },
      };
    }
    throw mapGoogleError(error, params.auth);
  }
}
