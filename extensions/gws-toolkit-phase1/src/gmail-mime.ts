import fs from "node:fs";
import path from "node:path";
import { PluginError } from "./errors.js";

export type GmailMimeOptions = {
  workspaceDir?: string;
  bodyPreference: "text-first" | "html-first";
  headerNewlineMode: "reject" | "strip";
};

type ResolvedAttachment = {
  filename: string;
  mimeType: string;
  bytes: Buffer;
};

const DEFAULT_ATTACHMENT_MIME_TYPE = "application/octet-stream";

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".gif": "image/gif",
  ".htm": "text/html",
  ".html": "text/html",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

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

function resolveWorkspaceRoot(workspaceDir: string | undefined): string {
  const rawWorkspaceDir = workspaceDir?.trim();
  if (!rawWorkspaceDir) {
    throw new PluginError(
      "VALIDATION_ERROR",
      "Gmail attachments require filePath inside the active agent workspace.",
    );
  }
  try {
    return fs.realpathSync(path.resolve(rawWorkspaceDir));
  } catch {
    throw new PluginError("VALIDATION_ERROR", "Active agent workspace could not be resolved.");
  }
}

function readWorkspaceAttachmentFile(params: { filePath: unknown; workspaceDir?: string }): {
  filePath: string;
  bytes: Buffer;
} {
  const rawFilePath = typeof params.filePath === "string" ? params.filePath.trim() : "";
  if (!rawFilePath) {
    throw new PluginError("VALIDATION_ERROR", "attachment filePath is required");
  }

  const workspaceRoot = resolveWorkspaceRoot(params.workspaceDir);
  const candidate = path.isAbsolute(rawFilePath)
    ? path.resolve(rawFilePath)
    : path.resolve(workspaceRoot, rawFilePath);
  if (!isPathInside(workspaceRoot, candidate)) {
    throw new PluginError(
      "VALIDATION_ERROR",
      "Gmail attachment filePath must remain inside the active agent workspace.",
      { workspaceDir: workspaceRoot },
    );
  }

  let fd: number | undefined;
  try {
    fd = fs.openSync(candidate, "r");
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) {
      throw new PluginError("VALIDATION_ERROR", "Gmail attachment filePath must be a file.");
    }
    const resolvedFilePath = fs.realpathSync(candidate);
    if (!isPathInside(workspaceRoot, resolvedFilePath)) {
      throw new PluginError(
        "VALIDATION_ERROR",
        "Gmail attachment filePath cannot resolve outside the active agent workspace.",
        { workspaceDir: workspaceRoot },
      );
    }
    return { filePath: resolvedFilePath, bytes: fs.readFileSync(fd) };
  } catch (error) {
    if (error instanceof PluginError) {
      throw error;
    }
    throw new PluginError("VALIDATION_ERROR", "Gmail attachment filePath could not be read.", {
      cause: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
}

function sanitizeHeaderValue(value: string, options: GmailMimeOptions, label: string): string {
  if (/[\r\n]/.test(value)) {
    if (options.headerNewlineMode === "reject") {
      throw new PluginError("VALIDATION_ERROR", `${label} cannot contain newlines`);
    }
    return value.replace(/[\r\n]/g, "").trim();
  }
  return value.trim();
}

function values(value: unknown, options: GmailMimeOptions, label: string): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((entry) => sanitizeHeaderValue(entry, options, label))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [sanitizeHeaderValue(value, options, label)];
  }
  return [];
}

function selectBody(
  payload: Record<string, unknown>,
  preference: GmailMimeOptions["bodyPreference"],
): {
  contentType: string;
  body: string;
} {
  const bodyText =
    typeof payload.bodyText === "string" && payload.bodyText.trim() ? payload.bodyText : "";
  const bodyHtml =
    typeof payload.bodyHtml === "string" && payload.bodyHtml.trim() ? payload.bodyHtml : "";
  if (preference === "html-first" && bodyHtml) {
    return { contentType: "text/html; charset=UTF-8", body: bodyHtml };
  }
  if (bodyText || !bodyHtml) {
    return { contentType: "text/plain; charset=UTF-8", body: bodyText };
  }
  return { contentType: "text/html; charset=UTF-8", body: bodyHtml };
}

function safeFilename(value: string | undefined, fallback: string): string {
  const raw = value?.trim() || fallback;
  const basename = raw.split(/[\\/]/).pop() ?? "attachment";
  const sanitized = basename
    .replace(/[\x00-\x1f\x7f"\\]/g, "_")
    .replace(/[<>:|?*]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 180);
  return sanitized || "attachment";
}

function mimeTypeForAttachment(value: unknown, filename: string, filePath: string): string {
  if (typeof value === "string" && value.trim()) {
    const mimeType = value.trim();
    if (
      /[\r\n]/.test(mimeType) ||
      !/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(mimeType)
    ) {
      throw new PluginError("VALIDATION_ERROR", "attachment mimeType must be a valid MIME type");
    }
    return mimeType;
  }
  return (
    MIME_TYPES_BY_EXTENSION[path.extname(filename).toLowerCase()] ??
    MIME_TYPES_BY_EXTENSION[path.extname(filePath).toLowerCase()] ??
    DEFAULT_ATTACHMENT_MIME_TYPE
  );
}

function wrapBase64(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/.{1,76}/g, "$&\r\n")
    .trimEnd();
}

function quoteMimeParam(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function resolveAttachments(
  payload: Record<string, unknown>,
  options: GmailMimeOptions,
): ResolvedAttachment[] {
  if (payload.attachments === undefined) {
    return [];
  }
  if (!Array.isArray(payload.attachments)) {
    throw new PluginError("VALIDATION_ERROR", "attachments must be an array");
  }
  return payload.attachments.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new PluginError("VALIDATION_ERROR", "attachment entries must be objects");
    }
    const attachment = entry as Record<string, unknown>;
    const file = readWorkspaceAttachmentFile({
      filePath: attachment.filePath,
      workspaceDir: options.workspaceDir,
    });
    const filename = safeFilename(
      typeof attachment.filename === "string" ? attachment.filename : undefined,
      path.basename(file.filePath),
    );
    return {
      filename,
      mimeType: mimeTypeForAttachment(attachment.mimeType, filename, file.filePath),
      bytes: file.bytes,
    };
  });
}

export function buildRawGmailMimeMessage(
  payload: Record<string, unknown>,
  options: GmailMimeOptions,
): string {
  const to = values(payload.to, options, "to");
  if (to.length === 0) {
    throw new PluginError("VALIDATION_ERROR", "to is required");
  }
  const cc = values(payload.cc, options, "cc");
  const bcc = values(payload.bcc, options, "bcc");
  const replyTo = values(payload.replyTo, options, "replyTo");
  const subject =
    typeof payload.subject === "string"
      ? sanitizeHeaderValue(payload.subject, options, "subject")
      : "";
  const body = selectBody(payload, options.bodyPreference);
  const attachments = resolveAttachments(payload, options);
  const headers = [
    `To: ${to.join(", ")}`,
    ...(cc.length ? [`Cc: ${cc.join(", ")}`] : []),
    ...(bcc.length ? [`Bcc: ${bcc.join(", ")}`] : []),
    ...(replyTo.length ? [`Reply-To: ${replyTo.join(", ")}`] : []),
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
  ];

  if (attachments.length === 0) {
    return Buffer.from(
      `${headers.join("\r\n")}\r\nContent-Type: ${body.contentType}\r\n\r\n${body.body}`,
      "utf8",
    ).toString("base64url");
  }

  const boundary = `daisy-mixed-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
  const parts = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: ${body.contentType}`,
    "Content-Transfer-Encoding: 7bit",
    "",
    body.body,
    ...attachments.flatMap((attachment) => {
      const filename = quoteMimeParam(attachment.filename);
      return [
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}; name="${filename}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${filename}"`,
        "",
        wrapBase64(attachment.bytes),
      ];
    }),
    `--${boundary}--`,
    "",
  ];
  return Buffer.from(parts.join("\r\n"), "utf8").toString("base64url");
}
