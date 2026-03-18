export type CredentialMode = "oauth" | "credentials_file" | "token";

export type ServiceFamily = "drive" | "gmail" | "calendar";

export type DriveReadAction = "list_files" | "get_file_metadata" | "export_file";
export type GmailReadAction = "list_messages" | "get_message_metadata";
export type CalendarReadAction = "list_events" | "get_event";

export type ToolName = "gws_status" | "gws_drive_read" | "gws_gmail_read" | "gws_calendar_read";

export type InvocationContext = {
  agentId?: string;
  sessionId?: string;
};

export type StatusParams = {
  includeVersion?: boolean;
  includeAuthStatus?: boolean;
};

export type DriveReadParams = {
  action: DriveReadAction;
  pageSize?: number;
  query?: string;
  fileId?: string;
  mimeType?: string;
};

export type GmailReadParams = {
  action: GmailReadAction;
  query?: string;
  maxResults?: number;
  messageId?: string;
};

export type CalendarReadParams = {
  action: CalendarReadAction;
  calendarId?: string;
  eventId?: string;
  pageSize?: number;
  timeMin?: string;
  timeMax?: string;
};

export type ToolParams = StatusParams | DriveReadParams | GmailReadParams | CalendarReadParams;

export type GwsToolkitConfig = {
  enabledServices: ServiceFamily[];
  binaryPath?: string;
  approvedCredentialDirs: string[];
  credentialsFile?: string;
  tokenEnvVar: string;
  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  safeMode: boolean;
  allowedCredentialModes: CredentialMode[];
  defaultScopesProfile: "minimal" | "custom";
  customScopes?: string[];
};

export type ConfigPosture = {
  sourceEnvVar: "OPENCLAW_CONFIG_FILE";
  sourcePathPresent: boolean;
  sourcePathBasename?: string;
  pluginConfigProvided: boolean;
  valid: boolean;
  message: string;
};

export type AuthResolution = {
  mode: CredentialMode;
  env: Record<string, string>;
  args: string[];
};

export type PolicyDecision = {
  allowed: boolean;
  reason?: string;
  service?: ServiceFamily;
  action?: string;
};

export type ResultCode =
  | "OK"
  | "DENY_POLICY"
  | "VALIDATION_ERROR"
  | "CONFIG_ERROR"
  | "BINARY_NOT_FOUND"
  | "UNSUPPORTED_GWS_VERSION"
  | "AUTH_ERROR"
  | "EXEC_TIMEOUT"
  | "EXEC_ERROR"
  | "NON_JSON_OUTPUT"
  | "CLI_ERROR"
  | "INTERNAL_ERROR";

export type StructuredSuccess<T> = {
  ok: true;
  data: T;
  meta: {
    tool: ToolName;
    action: string;
    service: ServiceFamily | "status";
    resultCode: ResultCode;
    latencyMs: number;
  };
};

export type StructuredError = {
  ok: false;
  error: {
    code: ResultCode;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    tool: ToolName;
    action: string;
    service: ServiceFamily | "status";
    latencyMs: number;
  };
};

export type StructuredEnvelope<T = Record<string, unknown>> = StructuredSuccess<T> | StructuredError;

export type AuditEvent = {
  timestamp: string;
  agentId?: string;
  sessionId?: string;
  toolName: ToolName;
  action: string;
  targetService: ServiceFamily | "status";
  readOnly: true;
  decision: "allow" | "deny";
  denyReason?: string;
  credentialMode?: CredentialMode;
  latencyMs: number;
  exitCode?: number | null;
  resultCode: ResultCode;
};

export type DiscoveryResult = {
  binaryPath: string;
  versionText: string;
  version: {
    major: number;
    minor: number;
    patch: number;
  };
};

export type ExecutionResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  durationMs: number;
};

export const MIN_SUPPORTED_GWS_VERSION = {
  major: 0,
  minor: 0,
  patch: 1,
} as const;

export const ALLOWED_WRITE_SCOPE_MARKERS = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
] as const;

export const MINIMAL_SCOPE_PROFILE = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

export const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /authorization/i,
  /credential/i,
  /secret/i,
  /access[_-]?key/i,
];

