export type TrelloToolName = "trello_status" | "trello_read" | "trello_write";

export type TrelloReadAction = "list_boards" | "list_lists" | "list_cards" | "get_card";

export type TrelloWriteAction = "create_card" | "move_card" | "add_comment" | "archive_card";

export type TrelloAction = "status" | TrelloReadAction | TrelloWriteAction;

export type TrelloResultCode =
  | "OK"
  | "CONFIG_ERROR"
  | "DENY_POLICY"
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMIT"
  | "TRELLO_ERROR"
  | "NETWORK_ERROR"
  | "EXEC_TIMEOUT"
  | "NON_JSON_OUTPUT"
  | "RESPONSE_TOO_LARGE"
  | "INTERNAL_ERROR";

export type TrelloRouteConfig = {
  allowedTools: TrelloToolName[];
  allowedActions: TrelloAction[];
  allowedBoardIds: string[];
  allowedListIds: string[];
};

export type TrelloToolkitConfig = {
  apiKeyEnvVar: string;
  tokenEnvVar: string;
  timeoutMs: number;
  maxResponseBytes: number;
  allowWriteOperations: boolean;
  allowUnboundAgents: boolean;
  defaultRoute: string | null;
  routes: Record<string, TrelloRouteConfig>;
  agentRouteBindings: Record<string, string>;
};

export type ConfigPosture = {
  pluginConfigProvided: boolean;
  valid: boolean;
  message: string;
};

export type InvocationContext = {
  agentId?: string;
  sessionId?: string;
  sessionKey?: string;
};

export type ResolvedRoute = TrelloRouteConfig & {
  name: string;
};

export type PolicyDecision =
  | { allowed: true; routeName: string; route: ResolvedRoute }
  | { allowed: false; reason: string; routeName?: string };

export type StructuredSuccess<T = unknown> = {
  ok: true;
  data: T;
  meta: {
    tool: TrelloToolName;
    action: TrelloAction;
    resultCode: TrelloResultCode;
    latencyMs: number;
    routeName?: string;
  };
};

export type StructuredError = {
  ok: false;
  error: {
    code: TrelloResultCode;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    tool: TrelloToolName;
    action: TrelloAction;
    resultCode: TrelloResultCode;
    latencyMs: number;
    routeName?: string;
  };
};

export type StructuredEnvelope<T = unknown> = StructuredSuccess<T> | StructuredError;

export type AuditEvent = {
  timestamp: string;
  agentId?: string;
  sessionId?: string;
  sessionKey?: string;
  toolName: TrelloToolName;
  action: TrelloAction;
  decision: "allow" | "deny";
  denyReason?: string;
  routeName?: string;
  latencyMs: number;
  resultCode: TrelloResultCode;
};

export type TrelloBoard = {
  id: string;
  name?: string;
  closed?: boolean;
  url?: string;
};

export type TrelloList = {
  id: string;
  name?: string;
  closed?: boolean;
  idBoard?: string;
};

export type TrelloCard = {
  id: string;
  name?: string;
  desc?: string;
  closed?: boolean;
  idBoard?: string;
  idList?: string;
  shortUrl?: string;
  url?: string;
};
