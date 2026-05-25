export type CredentialMode = "credentials_file" | "token";

export type ServiceFamily = "drive" | "gmail" | "calendar" | "docs" | "sheets";

export type ReadToolName =
  | "gws_drive_read"
  | "gws_gmail_read"
  | "gws_calendar_read"
  | "gws_docs_read"
  | "gws_sheets_read";

export type WriteToolName =
  | "gws_drive_write"
  | "gws_gmail_write"
  | "gws_calendar_write"
  | "gws_docs_write"
  | "gws_sheets_write";

export type ToolName = "gws_status" | ReadToolName | WriteToolName;

export type DriveReadAction = "list_files" | "get_file_metadata" | "export_file" | "download_file";
export type GmailReadAction = "list_messages" | "get_message_metadata";
export type CalendarReadAction = "list_events" | "get_event";
export type DocsReadAction = "get_document";
export type SheetsReadAction = "get_spreadsheet" | "get_values";

export type DriveWriteAction = "create_folder" | "upload_file" | "update_file_metadata";
export type GmailWriteAction = "draft_message" | "send_message" | "mark_message_read";
export type CalendarWriteAction = "create_event" | "update_event";
export type DocsWriteAction = "create_document" | "append_text" | "batch_update_document";
export type SheetsWriteAction = "append_values" | "update_values" | "create_spreadsheet";

export type AnyAction =
  | DriveReadAction
  | GmailReadAction
  | CalendarReadAction
  | DocsReadAction
  | SheetsReadAction
  | DriveWriteAction
  | GmailWriteAction
  | CalendarWriteAction
  | DocsWriteAction
  | SheetsWriteAction
  | "status";

export type InvocationContext = {
  agentId?: string;
  sessionId?: string;
  sessionKey?: string;
  messageChannel?: string;
  workspaceDir?: string;
  bindingSubject?: string;
  routeName?: string;
  googleWorkspaceEmail?: string;
};

export type CredentialRouteConfig = {
  mode: CredentialMode;
  label?: string;
  allowedServices: ServiceFamily[];
  allowedTools: ToolName[];
  allowedActions?: string[];
  credentialsFile?: string;
  tokenEnvVar?: string;
  impersonatedUser?: string;
  impersonatedUserEnvVar?: string;
};

export type GmailContactList = {
  emails: string[];
  domains: string[];
};

export type GmailContactPolicy = {
  whitelistFile?: string;
  blacklistFile?: string;
  whitelist: GmailContactList;
  blacklist: GmailContactList;
};

export type GwsToolkitConfig = {
  enabledServices: ServiceFamily[];
  enabledWriteServices: ServiceFamily[];
  binaryPath?: string;
  approvedCredentialDirs: string[];
  credentialsFile?: string;
  tokenEnvVar: string;
  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  safeMode: boolean;
  allowedCredentialModes: CredentialMode[];
  allowWriteOperations: boolean;
  allowUnboundAgents: boolean;
  defaultCredentialRoute: string | null;
  credentialRoutes: Record<string, CredentialRouteConfig>;
  agentCredentialBindings: Record<string, string>;
  workspaceIdentityDomains: string[];
  defaultScopesProfile: "minimal" | "service-set" | "custom";
  customScopes?: string[];
  requireHumanApprovalFor: string[];
  gmailPolicy?: GmailContactPolicy;
  warnings: string[];
};

export type ConfigPosture = {
  sourceEnvVar: "OPENCLAW_CONFIG_FILE" | "OPENCLAW_CONFIG_PATH";
  sourcePathPresent: boolean;
  sourcePathBasename?: string;
  pluginConfigProvided: boolean;
  valid: boolean;
  message: string;
};

export type ResolvedRoute = CredentialRouteConfig & {
  name: string;
};

export type RouteResolution = {
  bindingSubject: string;
  route: ResolvedRoute;
  inherited: boolean;
};

export type AuthResolution = {
  mode: CredentialMode;
  env: Record<string, string>;
  args: string[];
  route: ResolvedRoute;
  bindingSubject: string;
  impersonatedUser?: string;
  transport: "gws_cli" | "google_api";
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

export type RequiredSkillInvocation = {
  name: string;
  timing: "before_reply_or_action";
  reason: string;
};

export type StructuredSuccess<T> = {
  ok: true;
  data: T;
  meta: {
    tool: ToolName;
    action: string;
    service: ServiceFamily | "status";
    resultCode: ResultCode;
    latencyMs: number;
    requiredSkill?: RequiredSkillInvocation;
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

export type StructuredEnvelope<T = Record<string, unknown>> =
  | StructuredSuccess<T>
  | StructuredError;

export type AuditEvent = {
  timestamp: string;
  agentId?: string;
  sessionId?: string;
  sessionKey?: string;
  bindingSubject?: string;
  routeName?: string;
  toolName: ToolName;
  action: string;
  targetService: ServiceFamily | "status";
  readOnly: boolean;
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

export const READONLY_SCOPES: Record<ServiceFamily, string> = {
  drive: "https://www.googleapis.com/auth/drive.readonly",
  gmail: "https://www.googleapis.com/auth/gmail.readonly",
  calendar: "https://www.googleapis.com/auth/calendar.readonly",
  docs: "https://www.googleapis.com/auth/documents.readonly",
  sheets: "https://www.googleapis.com/auth/spreadsheets.readonly",
};

export const WRITE_SCOPES: Record<ServiceFamily, string> = {
  drive: "https://www.googleapis.com/auth/drive",
  gmail: "https://mail.google.com/",
  calendar: "https://www.googleapis.com/auth/calendar",
  docs: "https://www.googleapis.com/auth/documents",
  sheets: "https://www.googleapis.com/auth/spreadsheets",
};

export const ALL_SERVICES: ServiceFamily[] = ["drive", "gmail", "calendar", "docs", "sheets"];

export const READ_TOOLS_BY_SERVICE: Record<ServiceFamily, ReadToolName> = {
  drive: "gws_drive_read",
  gmail: "gws_gmail_read",
  calendar: "gws_calendar_read",
  docs: "gws_docs_read",
  sheets: "gws_sheets_read",
};

export const WRITE_TOOLS_BY_SERVICE: Record<ServiceFamily, WriteToolName> = {
  drive: "gws_drive_write",
  gmail: "gws_gmail_write",
  calendar: "gws_calendar_write",
  docs: "gws_docs_write",
  sheets: "gws_sheets_write",
};

export const DEFAULT_ENABLED_SERVICES: ServiceFamily[] = ["drive", "gmail", "calendar"];

export const DEFAULT_ALLOWED_CREDENTIAL_MODES: CredentialMode[] = ["credentials_file", "token"];

export const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /authorization/i,
  /credential/i,
  /secret/i,
  /access[_-]?key/i,
];
