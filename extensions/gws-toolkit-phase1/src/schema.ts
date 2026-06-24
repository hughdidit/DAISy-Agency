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

const emailArray = {
  type: "array",
  items: email,
  minItems: 1,
};

const contactResourceNameArray = {
  type: "array",
  items: {
    ...string,
    pattern: "^people/[A-Za-z0-9._~-]+$",
  },
  minItems: 1,
};

const peopleResourceName = {
  ...string,
  pattern: "^people/[A-Za-z0-9._~-]+$",
};

const contactGroupResourceName = {
  ...string,
  pattern: "^contactGroups/[A-Za-z0-9._~-]+$",
};

const directoryKey = {
  ...string,
  pattern: "^[^\\s/]+$",
};

const directoryGroupRole = {
  type: "string",
  enum: ["OWNER", "MANAGER", "MEMBER"],
};

const stringMap = {
  type: "object",
  additionalProperties: string,
};

const calendarRecurrenceArray = {
  type: "array",
  minItems: 1,
  items: {
    ...string,
    pattern: "^(RRULE|RDATE|EXDATE):.+$",
  },
};

const calendarReminders = {
  type: "object",
  additionalProperties: false,
  properties: {
    useDefault: boolean,
    overrides: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["method", "minutes"],
        properties: {
          method: { type: "string", enum: ["email", "popup"] },
          minutes: integer(0, 40320),
        },
      },
    },
  },
};

const calendarSource = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: string,
    url: string,
  },
};

const calendarExtendedProperties = {
  type: "object",
  additionalProperties: false,
  properties: {
    private: stringMap,
    shared: stringMap,
  },
};

const calendarAttachments = {
  type: "array",
  minItems: 1,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["fileUrl"],
    properties: {
      fileUrl: string,
      title: string,
      mimeType: string,
      iconLink: string,
      fileId: string,
    },
  },
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

const contactOrganizationArray = {
  type: "array",
  minItems: 1,
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: string,
      title: string,
      department: string,
    },
    anyOf: [{ required: ["name"] }, { required: ["title"] }, { required: ["department"] }],
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
    action: {
      type: "string",
      enum: ["list_files", "get_file_metadata", "export_file", "download_file"],
    },
    pageSize: integer(1, 200),
    query: string,
    fileId: string,
    mimeType: string,
    outputPath: string,
    overwrite: boolean,
    includeItemsFromAllDrives: boolean,
    corpora: { type: "string", enum: ["user", "drive", "allDrives", "domain"] },
    driveId: string,
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
    {
      if: { properties: { action: { const: "download_file" } } },
      then: { required: ["fileId"] },
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
    singleEvents: boolean,
    showDeleted: boolean,
    orderBy: { type: "string", enum: ["startTime", "updated"] },
    q: string,
    timeZone: string,
    updatedMin: string,
    pageToken: string,
    syncToken: string,
    iCalUID: string,
    maxAttendees: integer(1, 200),
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

const contactsReadSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: {
      type: "string",
      enum: ["list_contacts", "get_contact", "list_contact_groups", "get_contact_group"],
    },
    resourceName: string,
    pageSize: integer(1, 200),
    pageToken: string,
    personFields: string,
    groupFields: string,
    maxMembers: integer(1, 1000),
  },
  allOf: [
    {
      if: { properties: { action: { const: "get_contact" } } },
      then: {
        required: ["resourceName"],
        properties: {
          resourceName: peopleResourceName,
        },
      },
    },
    {
      if: { properties: { action: { const: "get_contact_group" } } },
      then: {
        required: ["resourceName"],
        properties: {
          resourceName: contactGroupResourceName,
        },
      },
    },
  ],
};

const groupsReadSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: {
      type: "string",
      enum: ["list_groups", "get_group", "list_group_members", "get_group_member"],
    },
    customer: string,
    domain: domain,
    query: string,
    pageToken: string,
    maxResults: integer(1, 200),
    groupKey: directoryKey,
    memberKey: directoryKey,
    roles: {
      type: "array",
      items: directoryGroupRole,
      minItems: 1,
      uniqueItems: true,
    },
    includeDerivedMembership: boolean,
  },
  allOf: [
    {
      if: { properties: { action: { const: "list_groups" } } },
      then: {
        not: { required: ["customer", "domain"] },
      },
    },
    {
      if: { properties: { action: { const: "get_group" } } },
      then: { required: ["groupKey"] },
    },
    {
      if: { properties: { action: { const: "list_group_members" } } },
      then: { required: ["groupKey"] },
    },
    {
      if: { properties: { action: { const: "get_group_member" } } },
      then: { required: ["groupKey", "memberKey"] },
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
    action: { type: "string", enum: ["draft_message", "send_message", "mark_message_read"] },
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
    messageId: string,
    attachments: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["filePath"],
        properties: {
          filePath: string,
          filename: string,
          mimeType: string,
        },
      },
    },
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
    {
      if: { properties: { action: { const: "mark_message_read" } } },
      then: { required: ["messageId"] },
    },
    {
      if: { properties: { action: { const: "mark_message_read" } } },
      then: { not: { required: ["attachments"] } },
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
    startDate: string,
    endDate: string,
    startTimeZone: string,
    endTimeZone: string,
    attendees: {
      type: "array",
      items: string,
    },
    recurrence: calendarRecurrenceArray,
    visibility: { type: "string", enum: ["default", "public", "private", "confidential"] },
    transparency: { type: "string", enum: ["opaque", "transparent"] },
    colorId: string,
    reminders: calendarReminders,
    source: calendarSource,
    extendedProperties: calendarExtendedProperties,
    attachments: calendarAttachments,
    supportsAttachments: boolean,
    sendUpdates: { type: "string", enum: ["all", "externalOnly", "none"] },
    guestsCanInviteOthers: boolean,
    guestsCanModify: boolean,
    guestsCanSeeOtherGuests: boolean,
  },
  allOf: [
    {
      if: { properties: { action: { const: "create_event" } } },
      then: {
        required: ["summary"],
        anyOf: [{ required: ["start", "end"] }, { required: ["startDate", "endDate"] }],
      },
    },
    {
      if: { properties: { action: { const: "update_event" } } },
      then: { required: ["eventId"] },
    },
    { not: { required: ["start", "startDate"] } },
    { not: { required: ["end", "endDate"] } },
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

const contactsWriteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "confirm"],
  properties: {
    action: {
      type: "string",
      enum: [
        "create_contact",
        "update_contact",
        "create_contact_group",
        "update_contact_group",
        "modify_contact_group_members",
      ],
    },
    confirm: boolean,
    resourceName: string,
    etag: string,
    givenName: string,
    familyName: string,
    displayName: string,
    emailAddresses: emailArray,
    phoneNumbers: {
      type: "array",
      items: {
        ...string,
        pattern: "^[+()0-9][+()0-9 .-]{2,}$",
      },
      minItems: 1,
    },
    organizations: contactOrganizationArray,
    personFields: string,
    name: string,
    resourceNamesToAdd: contactResourceNameArray,
    resourceNamesToRemove: contactResourceNameArray,
  },
  allOf: [
    {
      if: { properties: { action: { const: "create_contact" } } },
      then: {
        anyOf: [
          { required: ["givenName"] },
          { required: ["familyName"] },
          { required: ["displayName"] },
          { required: ["emailAddresses"] },
          { required: ["phoneNumbers"] },
          { required: ["organizations"] },
        ],
      },
    },
    {
      if: { properties: { action: { const: "update_contact" } } },
      then: {
        required: ["resourceName", "etag"],
        properties: {
          resourceName: peopleResourceName,
        },
        anyOf: [
          { required: ["givenName"] },
          { required: ["familyName"] },
          { required: ["displayName"] },
          { required: ["emailAddresses"] },
          { required: ["phoneNumbers"] },
          { required: ["organizations"] },
        ],
      },
    },
    {
      if: { properties: { action: { const: "create_contact_group" } } },
      then: { required: ["name"] },
    },
    {
      if: { properties: { action: { const: "update_contact_group" } } },
      then: {
        required: ["resourceName", "name"],
        properties: {
          resourceName: contactGroupResourceName,
        },
      },
    },
    {
      if: { properties: { action: { const: "modify_contact_group_members" } } },
      then: {
        required: ["resourceName"],
        properties: {
          resourceName: contactGroupResourceName,
        },
        anyOf: [{ required: ["resourceNamesToAdd"] }, { required: ["resourceNamesToRemove"] }],
      },
    },
  ],
};

const groupsWriteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "confirm"],
  properties: {
    action: {
      type: "string",
      enum: [
        "create_group",
        "update_group",
        "add_group_member",
        "update_group_member",
        "remove_group_member",
      ],
    },
    confirm: boolean,
    groupKey: directoryKey,
    memberKey: directoryKey,
    memberEmail: email,
    role: directoryGroupRole,
    email: email,
    name: string,
    description: string,
  },
  allOf: [
    {
      if: { properties: { action: { const: "create_group" } } },
      then: { required: ["email", "name"] },
    },
    {
      if: { properties: { action: { const: "update_group" } } },
      then: {
        required: ["groupKey"],
        anyOf: [{ required: ["email"] }, { required: ["name"] }, { required: ["description"] }],
      },
    },
    {
      if: { properties: { action: { const: "add_group_member" } } },
      then: { required: ["groupKey", "memberEmail"] },
    },
    {
      if: { properties: { action: { const: "update_group_member" } } },
      then: { required: ["groupKey", "memberKey", "role"] },
    },
    {
      if: { properties: { action: { const: "remove_group_member" } } },
      then: { required: ["groupKey", "memberKey"] },
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
  contactsRead: ajv.compile(contactsReadSchema),
  groupsRead: ajv.compile(groupsReadSchema),
  driveWrite: ajv.compile(driveWriteSchema),
  gmailWrite: ajv.compile(gmailWriteSchema),
  calendarWrite: ajv.compile(calendarWriteSchema),
  docsWrite: ajv.compile(docsWriteSchema),
  sheetsWrite: ajv.compile(sheetsWriteSchema),
  contactsWrite: ajv.compile(contactsWriteSchema),
  groupsWrite: ajv.compile(groupsWriteSchema),
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

export function validateContactsReadParams(value: unknown) {
  return validate(validators.contactsRead, value);
}

export function validateGroupsReadParams(value: unknown) {
  return validate(validators.groupsRead, value);
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

export function validateContactsWriteParams(value: unknown) {
  return validate(validators.contactsWrite, value);
}

export function validateGroupsWriteParams(value: unknown) {
  return validate(validators.groupsWrite, value);
}
