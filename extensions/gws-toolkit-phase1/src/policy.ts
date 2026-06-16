import { evaluateGmailWriteContactPolicy } from "./gmail-policy.js";
import type {
  AuthResolution,
  GwsToolkitConfig,
  PolicyDecision,
  ServiceFamily,
  ToolName,
} from "./types.js";

const READ_ACTIONS: Record<ServiceFamily, Set<string>> = {
  drive: new Set(["list_files", "get_file_metadata", "export_file", "download_file"]),
  gmail: new Set(["list_messages", "get_message_metadata"]),
  calendar: new Set(["list_events", "get_event"]),
  docs: new Set(["get_document"]),
  sheets: new Set(["get_spreadsheet", "get_values"]),
  contacts: new Set(["list_contacts", "get_contact", "list_contact_groups", "get_contact_group"]),
  groups: new Set(["list_groups", "get_group", "list_group_members", "get_group_member"]),
};

const WRITE_ACTIONS: Record<ServiceFamily, Set<string>> = {
  drive: new Set(["create_folder", "upload_file", "update_file_metadata"]),
  gmail: new Set(["draft_message", "send_message", "mark_message_read"]),
  calendar: new Set(["create_event", "update_event"]),
  docs: new Set(["create_document", "append_text", "batch_update_document"]),
  sheets: new Set(["append_values", "update_values", "create_spreadsheet"]),
  contacts: new Set([
    "create_contact",
    "update_contact",
    "create_contact_group",
    "update_contact_group",
    "modify_contact_group_members",
  ]),
  groups: new Set([
    "create_group",
    "update_group",
    "add_group_member",
    "update_group_member",
    "remove_group_member",
  ]),
};

const WRITE_HINTS = ["create", "update", "delete", "write", "send", "modify", "move", "upload"];
const WRITE_HINT_PATTERN = new RegExp(`\\b(${WRITE_HINTS.join("|")})\\b`, "i");
const RAW_KEY_EXACT = new Set(["raw", "rawcommand", "raw_command"]);

function hasWriteHint(value: unknown): boolean {
  if (typeof value === "string") {
    return WRITE_HINT_PATTERN.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasWriteHint(entry));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([key, entry]) => {
      const normalizedKey = key.trim().toLowerCase();
      if (RAW_KEY_EXACT.has(normalizedKey)) {
        return true;
      }
      return hasWriteHint(entry);
    });
  }
  return false;
}

function isActionAllowedForService(
  service: ServiceFamily,
  action: string,
  isWrite: boolean,
): boolean {
  return isWrite ? WRITE_ACTIONS[service].has(action) : READ_ACTIONS[service].has(action);
}

function routeAllowsAction(
  auth: AuthResolution,
  service: ServiceFamily,
  tool: ToolName,
  action: string,
) {
  if (!auth.route.allowedServices.includes(service)) {
    return false;
  }
  if (!auth.route.allowedTools.includes(tool)) {
    return false;
  }
  if (!auth.route.allowedActions || auth.route.allowedActions.length === 0) {
    return true;
  }
  const compound = `${service}:${action}`;
  return auth.route.allowedActions.includes(action) || auth.route.allowedActions.includes(compound);
}

function routeExplicitlyAllowsAction(
  auth: AuthResolution,
  service: ServiceFamily,
  action: string,
): boolean {
  const compound = `${service}:${action}`;
  return (
    auth.route.allowedActions?.includes(action) === true ||
    auth.route.allowedActions?.includes(compound) === true
  );
}

export function evaluatePolicy(params: {
  tool: ToolName;
  service: ServiceFamily | "status";
  action: string;
  payload: unknown;
  config: GwsToolkitConfig;
  auth?: AuthResolution;
  isWrite?: boolean;
  confirm?: boolean;
}): PolicyDecision {
  const isWrite = params.isWrite === true;

  if (!params.config.safeMode) {
    return {
      allowed: false,
      reason: "safeMode must remain enabled for gws-toolkit-phase1",
      service: params.service === "status" ? undefined : params.service,
      action: params.action,
    };
  }

  if (params.service === "status") {
    return { allowed: true, action: params.action };
  }

  if (!params.config.enabledServices.includes(params.service)) {
    return {
      allowed: false,
      reason: `service disabled by config: ${params.service}`,
      service: params.service,
      action: params.action,
    };
  }

  if (!isActionAllowedForService(params.service, params.action, isWrite)) {
    return {
      allowed: false,
      reason: `action not allowed for ${isWrite ? "write" : "read"} tool: ${params.action}`,
      service: params.service,
      action: params.action,
    };
  }

  if (!isWrite && hasWriteHint(params.payload)) {
    return {
      allowed: false,
      reason: "write/raw-like request shape denied",
      service: params.service,
      action: params.action,
    };
  }

  if (isWrite) {
    if (!params.config.allowWriteOperations) {
      return {
        allowed: false,
        reason: "write operations disabled by config",
        service: params.service,
        action: params.action,
      };
    }
    if (!params.config.enabledWriteServices.includes(params.service)) {
      return {
        allowed: false,
        reason: `write service disabled by config: ${params.service}`,
        service: params.service,
        action: params.action,
      };
    }
    if (params.confirm !== true) {
      return {
        allowed: false,
        reason: "write operations require confirm=true",
        service: params.service,
        action: params.action,
      };
    }
    if (params.service === "gmail") {
      const gmailPolicy = evaluateGmailWriteContactPolicy({
        action: params.action,
        payload: params.payload as Record<string, unknown>,
        policy: params.config.gmailPolicy,
      });
      if (!gmailPolicy.allowed) {
        return {
          allowed: false,
          reason: gmailPolicy.reason,
          service: params.service,
          action: params.action,
        };
      }
    }
  }

  if (params.auth) {
    if (!params.config.allowedCredentialModes.includes(params.auth.mode)) {
      return {
        allowed: false,
        reason: `auth mode denied by config: ${params.auth.mode}`,
        service: params.service,
        action: params.action,
      };
    }
    if (!routeAllowsAction(params.auth, params.service, params.tool, params.action)) {
      return {
        allowed: false,
        reason: `route ${params.auth.route.name} does not allow ${params.service}:${params.action}`,
        service: params.service,
        action: params.action,
      };
    }
    if (
      params.service === "gmail" &&
      params.action === "mark_message_read" &&
      !routeExplicitlyAllowsAction(params.auth, params.service, params.action)
    ) {
      return {
        allowed: false,
        reason: `route ${params.auth.route.name} must explicitly allow gmail:mark_message_read`,
        service: params.service,
        action: params.action,
      };
    }
  }

  return {
    allowed: true,
    service: params.service,
    action: params.action,
  };
}
