import { PluginError } from "./errors.js";
import type { CalendarReadParams, DriveReadParams, GmailReadParams } from "./types.js";

export type GwsCommandSpec = {
  argv: string[];
  action: string;
  service: "drive" | "gmail" | "calendar";
};

function appendIfString(argv: string[], flag: string, value: unknown): void {
  if (typeof value === "string" && value.trim()) {
    argv.push(flag, value.trim());
  }
}

function appendIfInt(argv: string[], flag: string, value: unknown): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    argv.push(flag, String(Math.floor(value)));
  }
}

export function buildDriveReadCommand(params: DriveReadParams, authArgs: string[]): GwsCommandSpec {
  const argv = ["drive", ...authArgs];
  if (params.action === "list_files") {
    argv.push("list-files", "--format", "json");
    appendIfInt(argv, "--page-size", params.pageSize);
    appendIfString(argv, "--query", params.query);
    return { argv, action: params.action, service: "drive" };
  }
  if (params.action === "get_file_metadata") {
    if (!params.fileId) {
      throw new PluginError("VALIDATION_ERROR", "fileId is required for get_file_metadata");
    }
    argv.push("get-file-metadata", "--file-id", params.fileId, "--format", "json");
    return { argv, action: params.action, service: "drive" };
  }
  if (params.action === "export_file") {
    if (!params.fileId || !params.mimeType) {
      throw new PluginError("VALIDATION_ERROR", "fileId and mimeType are required for export_file");
    }
    argv.push(
      "export-file",
      "--file-id",
      params.fileId,
      "--mime-type",
      params.mimeType,
      "--format",
      "json",
    );
    return { argv, action: params.action, service: "drive" };
  }
  throw new PluginError("DENY_POLICY", `Unsupported drive action: ${params.action}`);
}

export function buildGmailReadCommand(params: GmailReadParams, authArgs: string[]): GwsCommandSpec {
  const argv = ["gmail", ...authArgs];
  if (params.action === "list_messages") {
    argv.push("list-messages", "--format", "json");
    appendIfString(argv, "--query", params.query);
    appendIfInt(argv, "--max-results", params.maxResults);
    return { argv, action: params.action, service: "gmail" };
  }
  if (params.action === "get_message_metadata") {
    if (!params.messageId) {
      throw new PluginError("VALIDATION_ERROR", "messageId is required for get_message_metadata");
    }
    argv.push("get-message-metadata", "--message-id", params.messageId, "--format", "json");
    return { argv, action: params.action, service: "gmail" };
  }
  throw new PluginError("DENY_POLICY", `Unsupported gmail action: ${params.action}`);
}

export function buildCalendarReadCommand(
  params: CalendarReadParams,
  authArgs: string[],
): GwsCommandSpec {
  const argv = ["calendar", ...authArgs];
  if (params.action === "list_events") {
    argv.push("list-events", "--format", "json");
    appendIfString(argv, "--calendar-id", params.calendarId);
    appendIfInt(argv, "--page-size", params.pageSize);
    appendIfString(argv, "--time-min", params.timeMin);
    appendIfString(argv, "--time-max", params.timeMax);
    return { argv, action: params.action, service: "calendar" };
  }
  if (params.action === "get_event") {
    if (!params.eventId) {
      throw new PluginError("VALIDATION_ERROR", "eventId is required for get_event");
    }
    argv.push("get-event", "--event-id", params.eventId, "--format", "json");
    appendIfString(argv, "--calendar-id", params.calendarId);
    return { argv, action: params.action, service: "calendar" };
  }
  throw new PluginError("DENY_POLICY", `Unsupported calendar action: ${params.action}`);
}
