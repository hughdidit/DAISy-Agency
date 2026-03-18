import type { AuthResolution } from "./types.js";
import type { GwsToolkitConfig, PolicyDecision, ServiceFamily, ToolName } from "./types.js";

const READ_ACTIONS: Record<ServiceFamily, Set<string>> = {
  drive: new Set(["list_files", "get_file_metadata", "export_file"]),
  gmail: new Set(["list_messages", "get_message_metadata"]),
  calendar: new Set(["list_events", "get_event"]),
};

const WRITE_HINTS = [
  "create",
  "update",
  "delete",
  "write",
  "send",
  "draft",
  "trash",
  "archive",
  "modify",
  "move",
  "upload",
  "raw",
];

function hasWriteHint(value: unknown): boolean {
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    return WRITE_HINTS.some((hint) => lowered.includes(hint));
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasWriteHint(entry));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, entry]) => hasWriteHint(key) || hasWriteHint(entry),
    );
  }
  return false;
}

export function evaluatePolicy(params: {
  tool: ToolName;
  service: ServiceFamily | "status";
  action: string;
  payload: unknown;
  config: GwsToolkitConfig;
  auth?: AuthResolution;
}): PolicyDecision {
  if (!params.config.safeMode) {
    return {
      allowed: false,
      reason: "safeMode must remain enabled for gws-toolkit-phase1",
      service: params.service === "status" ? undefined : params.service,
      action: params.action,
    };
  }

  if (params.service !== "status" && !params.config.enabledServices.includes(params.service)) {
    return {
      allowed: false,
      reason: `service disabled by config: ${params.service}`,
      service: params.service,
      action: params.action,
    };
  }

  if (params.service !== "status") {
    if (!READ_ACTIONS[params.service].has(params.action)) {
      return {
        allowed: false,
        reason: `action not allowed in phase1: ${params.action}`,
        service: params.service,
        action: params.action,
      };
    }
  }

  if (params.service !== "status" && hasWriteHint(params.payload)) {
    return {
      allowed: false,
      reason: "write/raw-like request shape denied",
      service: params.service,
      action: params.action,
    };
  }

  if (params.service !== "status" && params.auth) {
    if (!params.config.allowedCredentialModes.includes(params.auth.mode)) {
      return {
        allowed: false,
        reason: `auth mode denied by config: ${params.auth.mode}`,
        service: params.service,
        action: params.action,
      };
    }
  }

  return {
    allowed: true,
    service: params.service === "status" ? undefined : params.service,
    action: params.action,
  };
}
