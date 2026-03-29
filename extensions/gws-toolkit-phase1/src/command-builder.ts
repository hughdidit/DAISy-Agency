import { PluginError } from "./errors.js";
import type { CalendarReadParams, DriveReadParams, GmailReadParams } from "./types.js";

export type GwsCommandSpec = {
  argv: string[];
  action: string;
  service: "drive" | "gmail" | "calendar";
};

type JsonParamValue = string | number | boolean;

function appendIfString(params: Record<string, JsonParamValue>, key: string, value: unknown): void {
  if (typeof value === "string" && value.trim()) {
    params[key] = value.trim();
  }
}

function appendIfInt(params: Record<string, JsonParamValue>, key: string, value: unknown): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    params[key] = Math.floor(value);
  }
}

function appendIfBool(params: Record<string, JsonParamValue>, key: string, value: unknown): void {
  if (typeof value === "boolean") {
    params[key] = value;
  }
}

function appendParamsArg(argv: string[], params: Record<string, JsonParamValue>): void {
  if (Object.keys(params).length > 0) {
    argv.push("--params", JSON.stringify(params));
  }
}

export function buildDriveReadCommand(params: DriveReadParams, authArgs: string[]): GwsCommandSpec {
  const argv = ["drive", ...authArgs];
  if (params.action === "list_files") {
    const requestParams: Record<string, JsonParamValue> = {};
    appendIfInt(requestParams, "pageSize", params.pageSize);
    appendIfString(requestParams, "q", params.query);
    argv.push("files", "list", "--format", "json");
    appendParamsArg(argv, requestParams);
    return { argv, action: params.action, service: "drive" };
  }
  if (params.action === "get_file_metadata") {
    if (!params.fileId) {
      throw new PluginError("VALIDATION_ERROR", "fileId is required for get_file_metadata");
    }
    argv.push("files", "get", "--format", "json", "--params", JSON.stringify({ fileId: params.fileId }));
    return { argv, action: params.action, service: "drive" };
  }
  if (params.action === "export_file") {
    if (!params.fileId || !params.mimeType) {
      throw new PluginError("VALIDATION_ERROR", "fileId and mimeType are required for export_file");
    }
    argv.push(
      "files",
      "export",
      "--format",
      "json",
      "--params",
      JSON.stringify({
        fileId: params.fileId,
        mimeType: params.mimeType,
      }),
    );
    return { argv, action: params.action, service: "drive" };
  }
  throw new PluginError("DENY_POLICY", `Unsupported drive action: ${params.action}`);
}

export function buildGmailReadCommand(params: GmailReadParams, authArgs: string[]): GwsCommandSpec {
  const argv = ["gmail", ...authArgs];
  if (params.action === "list_messages") {
    const requestParams: Record<string, JsonParamValue> = {
      userId: "me",
    };
    appendIfString(requestParams, "q", params.query);
    appendIfInt(requestParams, "maxResults", params.maxResults);
    argv.push("users", "messages", "list", "--format", "json");
    appendParamsArg(argv, requestParams);
    return { argv, action: params.action, service: "gmail" };
  }
  if (params.action === "get_message_metadata") {
    if (!params.messageId) {
      throw new PluginError("VALIDATION_ERROR", "messageId is required for get_message_metadata");
    }
    argv.push(
      "users",
      "messages",
      "get",
      "--format",
      "json",
      "--params",
      JSON.stringify({
        userId: "me",
        id: params.messageId,
        format: "metadata",
      }),
    );
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
    const requestParams: Record<string, JsonParamValue> = {
      calendarId: params.calendarId?.trim() || "primary",
    };
    appendIfInt(requestParams, "maxResults", params.pageSize);
    appendIfString(requestParams, "timeMin", params.timeMin);
    appendIfString(requestParams, "timeMax", params.timeMax);
    appendIfBool(requestParams, "singleEvents", true);
    argv.push("events", "list", "--format", "json");
    appendParamsArg(argv, requestParams);
    return { argv, action: params.action, service: "calendar" };
  }
  if (params.action === "get_event") {
    if (!params.eventId) {
      throw new PluginError("VALIDATION_ERROR", "eventId is required for get_event");
    }
    argv.push(
      "events",
      "get",
      "--format",
      "json",
      "--params",
      JSON.stringify({
        calendarId: params.calendarId?.trim() || "primary",
        eventId: params.eventId,
      }),
    );
    return { argv, action: params.action, service: "calendar" };
  }
  throw new PluginError("DENY_POLICY", `Unsupported calendar action: ${params.action}`);
}
