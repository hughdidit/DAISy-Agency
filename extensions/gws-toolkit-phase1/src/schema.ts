import { Ajv, type ValidateFunction } from "ajv";

const ajv = new Ajv({
  allErrors: true,
  strict: false,
});

const boolean = { type: "boolean" };
const string = { type: "string", minLength: 1 };
const email = { ...string, pattern: "^[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+$" };
const domain = { ...string, pattern: "^@?[A-Za-z0-9][A-Za-z0-9.-]*\\.[A-Za-z]{2,}$" };
const integer = (minimum: number, maximum: number) => ({
  type: "integer",
  minimum,
  maximum,
});

const stringArray = {
  type: "array",
  items: string,
  minItems: 1,
};

const jsonValue = {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "null" },
    {
      type: "array",
      items: {
        anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }],
      },
    },
  ],
};

const valueMatrix = {
  type: "array",
  minItems: 1,
  items: {
    type: "array",
    minItems: 1,
    items: jsonValue,
  },
};

const statusSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    includeVersion: boolean,
    includeAuthStatus: boolean,
  },
};

const driveReadSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: { type: "string", enum: ["list_files", "get_file_metadata", "export_file"] },
    pageSize: integer(1, 200),
    query: string,
    fileId: string,
    mimeType: string,
  },
  allOf: [
    {
      if: { properties: { action: { const: "get_file_metadata" } } },
      then: { required: ["fileId"] },
    },
    {
      if: { properties: { action: { const: "export_file" } } },
      then: { required: ["fileId", "mimeType"] },
    },
  ],
};

const gmailReadSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: { type: "string", enum: ["list_messages", "get_message_metadata"] },
    query: string,
    fromEmail: email,
    fromDomain: domain,
    unread: boolean,
    inbox: boolean,
    maxResults: integer(1, 500),
    messageId: string,
  },
  allOf: [
    {
      if: { properties: { action: { const: "get_message_metadata" } } },
      then: { required: ["messageId"] },
    },
  ],
};

const calendarReadSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: { type: "string", enum: ["list_events", "get_event"] },
    calendarId: string,
    eventId: string,
    pageSize: integer(1, 200),
    timeMin: string,
    timeMax: string,
  },
  allOf: [
    {
      if: { properties: { action: { const: "get_event" } } },
      then: { required: ["eventId"] },
    },
  ],
};

const docsReadSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "documentId"],
  properties: {
    action: { type: "string", enum: ["get_document"] },
    documentId: string,
  },
};

const sheetsReadSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "spreadsheetId"],
  properties: {
    action: { type: "string", enum: ["get_spreadsheet", "get_values"] },
    spreadsheetId: string,
    range: string,
  },
  allOf: [
    {
      if: { properties: { action: { const: "get_values" } } },
      then: { required: ["range"] },
    },
  ],
};

const driveWriteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "confirm"],
  properties: {
    action: { type: "string", enum: ["create_folder", "upload_file", "update_file_metadata"] },
    confirm: boolean,
    name: string,
    parentId: string,
    filePath: string,
    fileId: string,
    mimeType: string,
    description: string,
    addParents: stringArray,
    removeParents: stringArray,
  },
  allOf: [
    {
      if: { properties: { action: { const: "create_folder" } } },
      then: { required: ["name"] },
    },
    {
      if: { properties: { action: { const: "upload_file" } } },
      then: { required: ["filePath"] },
    },
    {
      if: { properties: { action: { const: "update_file_metadata" } } },
      then: { required: ["fileId"] },
    },
  ],
};

const gmailWriteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "confirm"],
  properties: {
    action: { type: "string", enum: ["draft_message", "send_message"] },
    confirm: boolean,
    to: {
      anyOf: [string, stringArray],
    },
    cc: {
      anyOf: [string, stringArray],
    },
    bcc: {
      anyOf: [string, stringArray],
    },
    replyTo: string,
    subject: string,
    bodyText: string,
    bodyHtml: string,
  },
  allOf: [
    {
      if: { properties: { action: { enum: ["draft_message", "send_message"] } } },
      then: { required: ["to"] },
    },
    {
      if: { properties: { action: { enum: ["draft_message", "send_message"] } } },
      then: {
        anyOf: [{ required: ["bodyText"] }, { required: ["bodyHtml"] }],
      },
    },
  ],
};

const calendarWriteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "confirm"],
  properties: {
    action: { type: "string", enum: ["create_event", "update_event"] },
    confirm: boolean,
    calendarId: string,
    eventId: string,
    summary: string,
    description: string,
    location: string,
    start: string,
    end: string,
    attendees: {
      type: "array",
      items: string,
    },
  },
  allOf: [
    {
      if: { properties: { action: { const: "create_event" } } },
      then: { required: ["summary", "start", "end"] },
    },
    {
      if: { properties: { action: { const: "update_event" } } },
      then: { required: ["eventId"] },
    },
  ],
};

const docsWriteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "confirm"],
  properties: {
    action: {
      type: "string",
      enum: ["create_document", "append_text", "batch_update_document"],
    },
    confirm: boolean,
    title: string,
    documentId: string,
    text: string,
    requests: {
      type: "array",
      minItems: 1,
      items: { type: "object" },
    },
  },
  allOf: [
    {
      if: { properties: { action: { const: "create_document" } } },
      then: { required: ["title"] },
    },
    {
      if: { properties: { action: { const: "append_text" } } },
      then: { required: ["documentId", "text"] },
    },
    {
      if: { properties: { action: { const: "batch_update_document" } } },
      then: { required: ["documentId", "requests"] },
    },
  ],
};

const sheetsWriteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "confirm"],
  properties: {
    action: { type: "string", enum: ["append_values", "update_values", "create_spreadsheet"] },
    confirm: boolean,
    spreadsheetId: string,
    range: string,
    values: valueMatrix,
    title: string,
    valueInputOption: { type: "string", enum: ["RAW", "USER_ENTERED"] },
  },
  allOf: [
    {
      if: { properties: { action: { enum: ["append_values", "update_values"] } } },
      then: { required: ["spreadsheetId", "range", "values"] },
    },
    {
      if: { properties: { action: { const: "create_spreadsheet" } } },
      then: { required: ["title"] },
    },
  ],
};

const validators = {
  status: ajv.compile(statusSchema),
  driveRead: ajv.compile(driveReadSchema),
  gmailRead: ajv.compile(gmailReadSchema),
  calendarRead: ajv.compile(calendarReadSchema),
  docsRead: ajv.compile(docsReadSchema),
  sheetsRead: ajv.compile(sheetsReadSchema),
  driveWrite: ajv.compile(driveWriteSchema),
  gmailWrite: ajv.compile(gmailWriteSchema),
  calendarWrite: ajv.compile(calendarWriteSchema),
  docsWrite: ajv.compile(docsWriteSchema),
  sheetsWrite: ajv.compile(sheetsWriteSchema),
};

export type ValidationIssue = {
  path: string;
  message: string;
};

function serializeErrors(validate: ValidateFunction<unknown>): ValidationIssue[] {
  return (validate.errors ?? []).map((entry) => ({
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

export function validateDriveReadParams(value: unknown) {
  return validate(validators.driveRead, value);
}

export function validateGmailReadParams(value: unknown) {
  return validate(validators.gmailRead, value);
}

export function validateCalendarReadParams(value: unknown) {
  return validate(validators.calendarRead, value);
}

export function validateDocsReadParams(value: unknown) {
  return validate(validators.docsRead, value);
}

export function validateSheetsReadParams(value: unknown) {
  return validate(validators.sheetsRead, value);
}

export function validateDriveWriteParams(value: unknown) {
  return validate(validators.driveWrite, value);
}

export function validateGmailWriteParams(value: unknown) {
  return validate(validators.gmailWrite, value);
}

export function validateCalendarWriteParams(value: unknown) {
  return validate(validators.calendarWrite, value);
}

export function validateDocsWriteParams(value: unknown) {
  return validate(validators.docsWrite, value);
}

export function validateSheetsWriteParams(value: unknown) {
  return validate(validators.sheetsWrite, value);
}
