import { PluginError } from "./errors.js";

export type CalendarParamValue = string | number | boolean | null | string[] | number[];

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new PluginError("VALIDATION_ERROR", `${label} is required`);
  }
  return value.trim();
}

function appendString(
  target: Record<string, CalendarParamValue>,
  key: string,
  value: unknown,
): void {
  if (typeof value === "string" && value.trim()) {
    target[key] = value.trim();
  }
}

function appendNumber(
  target: Record<string, CalendarParamValue>,
  key: string,
  value: unknown,
): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    target[key] = Math.floor(value);
  }
}

function appendBoolean(
  target: Record<string, CalendarParamValue>,
  key: string,
  value: unknown,
): void {
  if (typeof value === "boolean") {
    target[key] = value;
  }
}

function compactObject(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function trimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function appendBodyString(target: Record<string, unknown>, key: string, value: unknown): void {
  const normalized = trimmedString(value);
  if (normalized) {
    target[key] = normalized;
  }
}

function appendBodyBoolean(target: Record<string, unknown>, key: string, value: unknown): void {
  if (typeof value === "boolean") {
    target[key] = value;
  }
}

function buildEventDateTime(params: {
  dateTime?: unknown;
  date?: unknown;
  timeZone?: unknown;
}): Record<string, string> | undefined {
  const dateTime = trimmedString(params.dateTime);
  const date = trimmedString(params.date);
  if (!dateTime && !date) {
    return undefined;
  }
  const timeZone = trimmedString(params.timeZone);
  return compactObject({
    dateTime,
    date: dateTime ? undefined : date,
    timeZone,
  }) as Record<string, string>;
}

function buildAttendees(value: unknown): { email: string }[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const attendees = value
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
  return attendees;
}

function appendObject(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    target[key] = value;
  }
}

function appendArray(target: Record<string, unknown>, key: string, value: unknown): void {
  if (Array.isArray(value) && value.length > 0) {
    target[key] = value;
  }
}

export function buildCalendarListParams(
  params: Record<string, unknown>,
): Record<string, CalendarParamValue> {
  const requestParams: Record<string, CalendarParamValue> = {
    calendarId: trimmedString(params.calendarId) ?? "primary",
    singleEvents: typeof params.singleEvents === "boolean" ? params.singleEvents : true,
  };
  appendNumber(requestParams, "maxResults", params.pageSize);
  appendString(requestParams, "timeMin", params.timeMin);
  appendString(requestParams, "timeMax", params.timeMax);
  appendBoolean(requestParams, "showDeleted", params.showDeleted);
  appendString(requestParams, "orderBy", params.orderBy);
  appendString(requestParams, "q", params.q);
  appendString(requestParams, "timeZone", params.timeZone);
  appendString(requestParams, "updatedMin", params.updatedMin);
  appendString(requestParams, "pageToken", params.pageToken);
  appendString(requestParams, "syncToken", params.syncToken);
  appendString(requestParams, "iCalUID", params.iCalUID);
  appendNumber(requestParams, "maxAttendees", params.maxAttendees);
  return requestParams;
}

export function buildCalendarWriteRequestParams(params: Record<string, unknown>): {
  calendarId: string;
  eventId?: string;
  requestParams: Record<string, CalendarParamValue>;
} {
  const calendarId = trimmedString(params.calendarId) ?? "primary";
  const requestParams: Record<string, CalendarParamValue> = { calendarId };
  if (params.action === "update_event") {
    requestParams.eventId = readString(params.eventId, "eventId");
  }
  appendBoolean(requestParams, "supportsAttachments", params.supportsAttachments);
  appendString(requestParams, "sendUpdates", params.sendUpdates);
  return {
    calendarId,
    eventId:
      typeof requestParams.eventId === "string" ? (requestParams.eventId as string) : undefined,
    requestParams,
  };
}

export function buildCalendarEventBody(params: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  appendBodyString(body, "summary", params.summary);
  appendBodyString(body, "description", params.description);
  appendBodyString(body, "location", params.location);
  appendBodyString(body, "colorId", params.colorId);
  appendBodyString(body, "visibility", params.visibility);
  appendBodyString(body, "transparency", params.transparency);

  const start = buildEventDateTime({
    dateTime: params.start,
    date: params.startDate,
    timeZone: params.startTimeZone,
  });
  if (start) {
    body.start = start;
  }
  const end = buildEventDateTime({
    dateTime: params.end,
    date: params.endDate,
    timeZone: params.endTimeZone,
  });
  if (end) {
    body.end = end;
  }

  const attendees = buildAttendees(params.attendees);
  if (attendees !== undefined) {
    body.attendees = attendees;
  }
  appendArray(body, "recurrence", params.recurrence);
  appendObject(body, "reminders", params.reminders);
  appendObject(body, "source", params.source);
  appendObject(body, "extendedProperties", params.extendedProperties);
  appendArray(body, "attachments", params.attachments);
  appendBodyBoolean(body, "guestsCanInviteOthers", params.guestsCanInviteOthers);
  appendBodyBoolean(body, "guestsCanModify", params.guestsCanModify);
  appendBodyBoolean(body, "guestsCanSeeOtherGuests", params.guestsCanSeeOtherGuests);
  return body;
}
