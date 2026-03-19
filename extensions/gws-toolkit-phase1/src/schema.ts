import Ajv, { type ValidateFunction } from "ajv";
import type {
  CalendarReadParams,
  DriveReadParams,
  GmailReadParams,
  StatusParams,
} from "./types.js";

const ajv = new Ajv({
  allErrors: true,
  strict: false,
});

const statusSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    includeVersion: { type: "boolean" },
    includeAuthStatus: { type: "boolean" },
  },
};

const driveSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: { type: "string", enum: ["list_files", "get_file_metadata", "export_file"] },
    pageSize: { type: "integer", minimum: 1, maximum: 200 },
    query: { type: "string", minLength: 1 },
    fileId: { type: "string", minLength: 1 },
    mimeType: { type: "string", minLength: 1 },
  },
  allOf: [
    {
      if: {
        properties: {
          action: { const: "get_file_metadata" },
        },
      },
      then: {
        required: ["fileId"],
      },
    },
    {
      if: {
        properties: {
          action: { const: "export_file" },
        },
      },
      then: {
        required: ["fileId", "mimeType"],
      },
    },
  ],
};

const gmailSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: { type: "string", enum: ["list_messages", "get_message_metadata"] },
    query: { type: "string", minLength: 1 },
    maxResults: { type: "integer", minimum: 1, maximum: 500 },
    messageId: { type: "string", minLength: 1 },
  },
  allOf: [
    {
      if: {
        properties: {
          action: { const: "get_message_metadata" },
        },
      },
      then: {
        required: ["messageId"],
      },
    },
  ],
};

const calendarSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: { type: "string", enum: ["list_events", "get_event"] },
    calendarId: { type: "string", minLength: 1 },
    eventId: { type: "string", minLength: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 200 },
    timeMin: { type: "string", minLength: 1 },
    timeMax: { type: "string", minLength: 1 },
  },
  allOf: [
    {
      if: {
        properties: {
          action: { const: "get_event" },
        },
      },
      then: {
        required: ["eventId"],
      },
    },
  ],
};

const validators = {
  status: ajv.compile(statusSchema) as ValidateFunction<StatusParams>,
  drive: ajv.compile(driveSchema) as ValidateFunction<DriveReadParams>,
  gmail: ajv.compile(gmailSchema) as ValidateFunction<GmailReadParams>,
  calendar: ajv.compile(calendarSchema) as ValidateFunction<CalendarReadParams>,
};

export type ValidationIssue = {
  path: string;
  message: string;
};

function serializeErrors(validate: ValidateFunction<unknown>): ValidationIssue[] {
  const errors = validate.errors ?? [];
  return errors.map((entry) => ({
    path: entry.instancePath || "/",
    message: entry.message ?? "invalid value",
  }));
}

function validate<T>(validator: ValidateFunction<T>, value: unknown) {
  const ok = validator(value);
  if (ok) {
    return { ok: true as const, value: value as T };
  }
  return {
    ok: false as const,
    errors: serializeErrors(validator as ValidateFunction<unknown>),
  };
}

export function validateStatusParams(value: unknown) {
  return validate(validators.status, value);
}

export function validateDriveParams(value: unknown) {
  return validate(validators.drive, value);
}

export function validateGmailParams(value: unknown) {
  return validate(validators.gmail, value);
}

export function validateCalendarParams(value: unknown) {
  return validate(validators.calendar, value);
}
