import { Type } from "@sinclair/typebox";
import {
  KANBAN_MAX_ACTIVE_CARD_LIST_LIMIT,
  KANBAN_MAX_ARCHIVED_CARD_LIST_LIMIT,
} from "../../kanban/types.js";
import { optionalStringEnum, stringEnum } from "../schema/typebox.js";
import {
  type AnyAgentTool,
  jsonResult,
  readNumberParam,
  readStringArrayParam,
  readStringParam,
  ToolInputError,
} from "./common.js";
import { callGatewayTool, readGatewayCallOptions, type GatewayCallOptions } from "./gateway.js";

const KANBAN_LANES = ["todo", "in_progress", "review", "done"] as const;
const KANBAN_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
const KANBAN_READ_ACTIONS = ["status", "board", "list_cards", "get_card", "activity"] as const;
const JSON_SCHEMA_THEN_KEYWORD = ["th", "en"].join("");
const KANBAN_WRITE_ACTIONS = [
  "create_card",
  "update_card",
  "move_card",
  "comment_card",
  "archive_card",
] as const;

const GatewayFields = {
  gatewayUrl: Type.Optional(Type.String()),
  gatewayToken: Type.Optional(Type.String()),
  timeoutMs: Type.Optional(Type.Number()),
};

const BoardField = {
  boardId: Type.Optional(Type.String()),
};

const NullableStringField = Type.Optional(
  Type.Unsafe<string | null>({
    type: ["string", "null"],
  }),
);

const KanbanReadSchema = Type.Object(
  {
    action: stringEnum(KANBAN_READ_ACTIONS),
    ...GatewayFields,
    ...BoardField,
    cardId: Type.Optional(Type.String()),
    lane: optionalStringEnum(KANBAN_LANES),
    includeArchived: Type.Optional(Type.Boolean()),
    readyForCodex: Type.Optional(Type.Boolean()),
    assignee: Type.Optional(Type.String()),
    limit: Type.Optional(
      Type.Integer({ minimum: 1, maximum: KANBAN_MAX_ARCHIVED_CARD_LIST_LIMIT }),
    ),
    after: Type.Optional(Type.Object({}, { additionalProperties: true })),
    before: Type.Optional(Type.String()),
    beforeId: Type.Optional(Type.String()),
  },
  {
    additionalProperties: true,
    allOf: [
      {
        if: {
          properties: { action: { const: "list_cards" } },
          required: ["action"],
        },
        [JSON_SCHEMA_THEN_KEYWORD]: {
          if: {
            properties: { includeArchived: { const: true } },
            required: ["includeArchived"],
          },
          [JSON_SCHEMA_THEN_KEYWORD]: {
            properties: {
              limit: { type: "integer", minimum: 1, maximum: KANBAN_MAX_ARCHIVED_CARD_LIST_LIMIT },
            },
          },
          else: {
            properties: {
              limit: { type: "integer", minimum: 1, maximum: KANBAN_MAX_ACTIVE_CARD_LIST_LIMIT },
            },
          },
        },
      },
      {
        if: {
          properties: { action: { const: "activity" } },
          required: ["action"],
        },
        [JSON_SCHEMA_THEN_KEYWORD]: {
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 200 },
          },
        },
      },
    ],
  },
);

const KanbanWriteSchema = Type.Object(
  {
    action: stringEnum(KANBAN_WRITE_ACTIONS),
    ...GatewayFields,
    ...BoardField,
    cardId: Type.Optional(Type.String()),
    expectedVersion: Type.Optional(Type.Number({ minimum: 1 })),
    title: Type.Optional(Type.String()),
    description: NullableStringField,
    lane: optionalStringEnum(KANBAN_LANES),
    position: Type.Optional(Type.Number()),
    priority: optionalStringEnum(KANBAN_PRIORITIES),
    assignee: NullableStringField,
    reviewer: NullableStringField,
    inputOwner: NullableStringField,
    labels: Type.Optional(Type.Array(Type.String())),
    dueDate: NullableStringField,
    readyForCodex: Type.Optional(Type.Boolean()),
    links: Type.Optional(Type.Array(Type.String())),
    watchers: Type.Optional(Type.Array(Type.String())),
    customFields: Type.Optional(Type.Object({}, { additionalProperties: true })),
    checklist: Type.Optional(Type.Array(Type.Object({}, { additionalProperties: true }))),
    updates: Type.Optional(Type.Object({}, { additionalProperties: true })),
    body: Type.Optional(Type.String()),
  },
  { additionalProperties: true },
);

const KanbanPickTaskSchema = Type.Object(
  {
    ...GatewayFields,
    ...BoardField,
    worker: optionalStringEnum(["codex", "work"] as const),
    agentId: Type.Optional(Type.String()),
    agentName: Type.Optional(Type.String()),
  },
  { additionalProperties: true },
);

const KanbanHandoffSchema = Type.Object(
  {
    ...GatewayFields,
    ...BoardField,
    cardId: Type.String(),
    expectedVersion: Type.Number({ minimum: 1 }),
    summary: Type.String(),
    reviewer: NullableStringField,
    inputOwner: NullableStringField,
  },
  { additionalProperties: true },
);

const KanbanCompleteSchema = Type.Object(
  {
    ...GatewayFields,
    ...BoardField,
    cardId: Type.String(),
    expectedVersion: Type.Number({ minimum: 1 }),
    summary: Type.String(),
  },
  { additionalProperties: true },
);

const KanbanStatusToolSchema = Type.Object({ ...GatewayFields });
const KanbanListCardsToolSchema = Type.Object({
  ...GatewayFields,
  ...BoardField,
  lane: optionalStringEnum(KANBAN_LANES),
  includeArchived: Type.Optional(Type.Boolean()),
  readyForCodex: Type.Optional(Type.Boolean()),
  assignee: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: KANBAN_MAX_ARCHIVED_CARD_LIST_LIMIT })),
});
const KanbanGetCardToolSchema = Type.Object({
  ...GatewayFields,
  ...BoardField,
  cardId: Type.String(),
});
const KanbanActivityToolSchema = Type.Object({
  ...GatewayFields,
  ...BoardField,
  cardId: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
  before: Type.Optional(Type.String()),
  beforeId: Type.Optional(Type.String()),
});
const KanbanCreateCardToolSchema = Type.Object({
  ...GatewayFields,
  ...BoardField,
  title: Type.String(),
  description: Type.Optional(Type.String()),
  lane: optionalStringEnum(KANBAN_LANES),
  priority: optionalStringEnum(KANBAN_PRIORITIES),
  labels: Type.Optional(Type.Array(Type.String())),
  readyForCodex: Type.Optional(Type.Boolean()),
});
const KanbanUpdateCardToolSchema = Type.Object({
  ...GatewayFields,
  ...BoardField,
  cardId: Type.String(),
  expectedVersion: Type.Integer({ minimum: 1 }),
  updates: Type.Object({}, { additionalProperties: true }),
});
const KanbanMoveCardToolSchema = Type.Object({
  ...GatewayFields,
  ...BoardField,
  cardId: Type.String(),
  expectedVersion: Type.Integer({ minimum: 1 }),
  lane: stringEnum(KANBAN_LANES),
  position: Type.Optional(Type.Number()),
});
const KanbanCommentCardToolSchema = Type.Object({
  ...GatewayFields,
  ...BoardField,
  cardId: Type.String(),
  body: Type.String(),
});
const KanbanArchiveCardToolSchema = Type.Object({
  ...GatewayFields,
  ...BoardField,
  cardId: Type.String(),
  expectedVersion: Type.Integer({ minimum: 1 }),
});

type GatewayToolCaller = typeof callGatewayTool;

type KanbanToolDeps = {
  callGatewayTool?: GatewayToolCaller;
};

type KanbanToolOptions = {
  agentId?: string;
  agentName?: string;
};

type NullableStringKeys = "description" | "assignee" | "reviewer" | "inputOwner" | "dueDate";

function toSnakeCaseKey(key: string): string {
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function hasParam(params: Record<string, unknown>, key: string): boolean {
  if (Object.hasOwn(params, key)) {
    return true;
  }
  const snakeKey = toSnakeCaseKey(key);
  return snakeKey !== key && Object.hasOwn(params, snakeKey);
}

function readRawParam(params: Record<string, unknown>, key: string): unknown {
  if (Object.hasOwn(params, key)) {
    return params[key];
  }
  const snakeKey = toSnakeCaseKey(key);
  if (snakeKey !== key && Object.hasOwn(params, snakeKey)) {
    return params[snakeKey];
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBooleanParam(params: Record<string, unknown>, key: string): boolean | undefined {
  const raw = readRawParam(params, key);
  return typeof raw === "boolean" ? raw : undefined;
}

function readObjectParam(
  params: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const raw = readRawParam(params, key);
  if (raw === undefined) {
    return undefined;
  }
  if (!isRecord(raw)) {
    throw new ToolInputError(`${key} must be an object`);
  }
  return raw;
}

function readObjectArrayParam(
  params: Record<string, unknown>,
  key: string,
): Array<Record<string, unknown>> | undefined {
  const raw = readRawParam(params, key);
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw) || raw.some((entry) => !isRecord(entry))) {
    throw new ToolInputError(`${key} must be an array of objects`);
  }
  return raw;
}

function readPositiveIntegerParam(
  params: Record<string, unknown>,
  key: string,
  options: { required?: boolean; label?: string } = {},
): number | undefined {
  const label = options.label ?? key;
  const raw = readRawParam(params, key);
  let value: number | undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    value = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        value = parsed;
      }
    }
  }
  if (value === undefined) {
    if (options.required) {
      throw new ToolInputError(`${label} required`);
    }
    return undefined;
  }
  if (!Number.isInteger(value)) {
    throw new ToolInputError(`${label} must be an integer`);
  }
  if (value !== undefined && value < 1) {
    throw new ToolInputError(`${label} must be at least 1`);
  }
  return value;
}

function readLimitedIntegerParam(
  params: Record<string, unknown>,
  key: string,
  options: { max: number },
): number | undefined {
  const value = readPositiveIntegerParam(params, key);
  if (value !== undefined && value > options.max) {
    throw new ToolInputError(`${key} must be at most ${options.max}`);
  }
  return value;
}

function readOptionalNullableString(
  params: Record<string, unknown>,
  key: NullableStringKeys,
): string | null | undefined {
  const raw = readRawParam(params, key);
  if (raw === null) {
    return null;
  }
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== "string") {
    throw new ToolInputError(`${key} must be a string or null`);
  }
  const value = raw.trim();
  return value ? value : undefined;
}

function addIfPresent(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function boardParams(params: Record<string, unknown>) {
  return {
    boardId: readStringParam(params, "boardId"),
  };
}

function readGatewayOpts(params: Record<string, unknown>): GatewayCallOptions {
  return readGatewayCallOptions(params);
}

function buildCardCreateParams(params: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    ...boardParams(params),
    title: readStringParam(params, "title", { required: true, label: "title" }),
  };
  addIfPresent(
    payload,
    "description",
    readStringParam(params, "description", { allowEmpty: true }),
  );
  addIfPresent(payload, "lane", readStringParam(params, "lane"));
  addIfPresent(payload, "position", readNumberParam(params, "position"));
  addIfPresent(payload, "priority", readStringParam(params, "priority"));
  addIfPresent(payload, "assignee", readStringParam(params, "assignee"));
  addIfPresent(payload, "reviewer", readStringParam(params, "reviewer"));
  addIfPresent(payload, "inputOwner", readStringParam(params, "inputOwner"));
  addIfPresent(payload, "labels", readStringArrayParam(params, "labels"));
  addIfPresent(payload, "dueDate", readStringParam(params, "dueDate"));
  addIfPresent(payload, "readyForCodex", readBooleanParam(params, "readyForCodex"));
  addIfPresent(payload, "links", readStringArrayParam(params, "links"));
  addIfPresent(payload, "watchers", readStringArrayParam(params, "watchers"));
  addIfPresent(payload, "customFields", readObjectParam(params, "customFields"));
  return payload;
}

function buildNormalizedUpdates(source: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};
  const stringFields = ["title", "priority"] as const;
  for (const key of stringFields) {
    addIfPresent(updates, key, readStringParam(source, key));
  }
  const nullableFields = ["description", "assignee", "reviewer", "inputOwner", "dueDate"] as const;
  for (const key of nullableFields) {
    if (hasParam(source, key)) {
      addIfPresent(updates, key, readOptionalNullableString(source, key));
    }
  }
  addIfPresent(updates, "labels", readStringArrayParam(source, "labels"));
  addIfPresent(updates, "checklist", readObjectArrayParam(source, "checklist"));
  addIfPresent(updates, "links", readStringArrayParam(source, "links"));
  addIfPresent(updates, "watchers", readStringArrayParam(source, "watchers"));
  addIfPresent(updates, "customFields", readObjectParam(source, "customFields"));
  addIfPresent(updates, "readyForCodex", readBooleanParam(source, "readyForCodex"));

  if (Object.keys(updates).length === 0) {
    throw new ToolInputError("updates required");
  }
  return updates;
}

function buildCardUpdates(params: Record<string, unknown>) {
  const explicitUpdates = readObjectParam(params, "updates");
  if (explicitUpdates) {
    return buildNormalizedUpdates(explicitUpdates);
  }
  return buildNormalizedUpdates(params);
}

function buildReadRequest(action: string, params: Record<string, unknown>) {
  switch (action) {
    case "status":
      return { method: "kanban.status", params: {} };
    case "board":
      return { method: "kanban.board.get", params: boardParams(params) };
    case "list_cards": {
      const payload: Record<string, unknown> = boardParams(params);
      addIfPresent(payload, "lane", readStringParam(params, "lane"));
      addIfPresent(payload, "includeArchived", readBooleanParam(params, "includeArchived"));
      addIfPresent(payload, "readyForCodex", readBooleanParam(params, "readyForCodex"));
      addIfPresent(payload, "assignee", readStringParam(params, "assignee"));
      const includeArchived = payload.includeArchived === true;
      addIfPresent(
        payload,
        "limit",
        readLimitedIntegerParam(params, "limit", {
          max: includeArchived
            ? KANBAN_MAX_ARCHIVED_CARD_LIST_LIMIT
            : KANBAN_MAX_ACTIVE_CARD_LIST_LIMIT,
        }),
      );
      addIfPresent(payload, "after", readObjectParam(params, "after"));
      return { method: "kanban.cards.list", params: payload };
    }
    case "get_card":
      return {
        method: "kanban.cards.get",
        params: {
          ...boardParams(params),
          cardId: readStringParam(params, "cardId", { required: true, label: "cardId" }),
        },
      };
    case "activity": {
      const payload: Record<string, unknown> = boardParams(params);
      addIfPresent(payload, "cardId", readStringParam(params, "cardId"));
      addIfPresent(payload, "limit", readLimitedIntegerParam(params, "limit", { max: 200 }));
      addIfPresent(payload, "before", readStringParam(params, "before"));
      addIfPresent(payload, "beforeId", readStringParam(params, "beforeId"));
      return { method: "kanban.activity.list", params: payload };
    }
    default:
      throw new ToolInputError(`unknown Kanban read action: ${action}`);
  }
}

function buildWriteRequest(action: string, params: Record<string, unknown>) {
  switch (action) {
    case "create_card":
      return {
        method: "kanban.cards.create",
        params: buildCardCreateParams(params),
      };
    case "update_card":
      return {
        method: "kanban.cards.update",
        params: {
          ...boardParams(params),
          cardId: readStringParam(params, "cardId", { required: true, label: "cardId" }),
          expectedVersion: readPositiveIntegerParam(params, "expectedVersion", {
            required: true,
            label: "expectedVersion",
          }),
          updates: buildCardUpdates(params),
        },
      };
    case "move_card":
      return {
        method: "kanban.cards.move",
        params: {
          ...boardParams(params),
          cardId: readStringParam(params, "cardId", { required: true, label: "cardId" }),
          expectedVersion: readPositiveIntegerParam(params, "expectedVersion", {
            required: true,
            label: "expectedVersion",
          }),
          lane: readStringParam(params, "lane", { required: true, label: "lane" }),
          position: readNumberParam(params, "position"),
        },
      };
    case "comment_card":
      return {
        method: "kanban.cards.comment",
        params: {
          ...boardParams(params),
          cardId: readStringParam(params, "cardId", { required: true, label: "cardId" }),
          body: readStringParam(params, "body", { required: true, label: "body" }),
        },
      };
    case "archive_card":
      return {
        method: "kanban.cards.archive",
        params: {
          ...boardParams(params),
          cardId: readStringParam(params, "cardId", { required: true, label: "cardId" }),
          expectedVersion: readPositiveIntegerParam(params, "expectedVersion", {
            required: true,
            label: "expectedVersion",
          }),
        },
      };
    default:
      throw new ToolInputError(`unknown Kanban write action: ${action}`);
  }
}

export function createKanbanTools(
  options: KanbanToolOptions = {},
  deps?: KanbanToolDeps,
): AnyAgentTool[] {
  const callGateway = deps?.callGatewayTool ?? callGatewayTool;
  const invoke = async (method: string, params: Record<string, unknown>) =>
    jsonResult(await callGateway(method, readGatewayOpts(params), params));
  const granularTools: AnyAgentTool[] = [
    {
      label: "Kanban Status",
      name: "kanban_status",
      description: "Use this when you need to check whether the DAISy Kanban gateway and board are available.",
      parameters: KanbanStatusToolSchema,
      execute: async (_id, args) => invoke("kanban.status", {}),
    },
    {
      label: "Kanban List Cards",
      name: "kanban_list_cards",
      description: "Use this when you need the current active or archived DAISy Kanban cards.",
      parameters: KanbanListCardsToolSchema,
      execute: async (_id, args) => {
        const params = args as Record<string, unknown>;
        return invoke("kanban.cards.list", buildReadRequest("list_cards", params).params as Record<string, unknown>);
      },
    },
    {
      label: "Kanban Get Card",
      name: "kanban_get_card",
      description: "Use this when you need the full current version of one DAISy Kanban card.",
      parameters: KanbanGetCardToolSchema,
      execute: async (_id, args) => {
        const params = args as Record<string, unknown>;
        return invoke("kanban.cards.get", buildReadRequest("get_card", params).params as Record<string, unknown>);
      },
    },
    {
      label: "Kanban Activity",
      name: "kanban_list_activity",
      description: "Use this when you need append-only activity history for the DAISy Kanban board or a card.",
      parameters: KanbanActivityToolSchema,
      execute: async (_id, args) => {
        const params = args as Record<string, unknown>;
        return invoke("kanban.activity.list", buildReadRequest("activity", params).params as Record<string, unknown>);
      },
    },
    {
      label: "Kanban Create Card",
      name: "kanban_create_card",
      description: "Use this when you need to create one DAISy Kanban card.",
      parameters: KanbanCreateCardToolSchema,
      execute: async (_id, args) => invoke("kanban.cards.create", buildCardCreateParams(args as Record<string, unknown>)),
    },
    {
      label: "Kanban Update Card",
      name: "kanban_update_card",
      description: "Use this when you need to update one card with an optimistic expectedVersion check.",
      parameters: KanbanUpdateCardToolSchema,
      execute: async (_id, args) => {
        const params = args as Record<string, unknown>;
        return invoke("kanban.cards.update", {
          ...boardParams(params),
          cardId: readStringParam(params, "cardId", { required: true, label: "cardId" }),
          expectedVersion: readPositiveIntegerParam(params, "expectedVersion", { required: true, label: "expectedVersion" }),
          updates: buildCardUpdates(params),
        });
      },
    },
    {
      label: "Kanban Move Card",
      name: "kanban_move_card",
      description: "Use this when you need to move or reorder one card with an optimistic expectedVersion check.",
      parameters: KanbanMoveCardToolSchema,
      execute: async (_id, args) => invoke("kanban.cards.move", buildWriteRequest("move_card", args as Record<string, unknown>).params as Record<string, unknown>),
    },
    {
      label: "Kanban Comment Card",
      name: "kanban_comment_card",
      description: "Use this when you need to append an evidence or progress comment to a card.",
      parameters: KanbanCommentCardToolSchema,
      execute: async (_id, args) => invoke("kanban.cards.comment", buildWriteRequest("comment_card", args as Record<string, unknown>).params as Record<string, unknown>),
    },
    {
      label: "Kanban Archive Card",
      name: "kanban_archive_card",
      description: "Use this when you need to archive a card after rereading its current version.",
      parameters: KanbanArchiveCardToolSchema,
      execute: async (_id, args) => invoke("kanban.cards.archive", buildWriteRequest("archive_card", args as Record<string, unknown>).params as Record<string, unknown>),
    },
  ];
  return [
    {
      label: "Kanban Read",
      name: "kanban_read",
      description:
        "Read DAISy Kanban status, board, cards, card detail, or activity through Gateway RPC only. Actions: status, board, list_cards, get_card, activity.",
      parameters: KanbanReadSchema,
      execute: async (_toolCallId, args) => {
        const params = args as Record<string, unknown>;
        const action = readStringParam(params, "action", { required: true });
        const request = buildReadRequest(action, params);
        return jsonResult(
          await callGateway(request.method, readGatewayOpts(params), request.params),
        );
      },
    },
    {
      label: "Kanban Write",
      name: "kanban_write",
      description:
        "Create, update, move, comment on, or archive DAISy Kanban cards through Gateway RPC only. Mutations require expectedVersion when changing existing cards.",
      parameters: KanbanWriteSchema,
      execute: async (_toolCallId, args) => {
        const params = args as Record<string, unknown>;
        const action = readStringParam(params, "action", { required: true });
        const request = buildWriteRequest(action, params);
        return jsonResult(
          await callGateway(request.method, readGatewayOpts(params), request.params),
        );
      },
    },
    {
      label: "Kanban Pick Task",
      name: "kanban_pick_task",
      description:
        "Atomically claim the next readyForCodex DAISy Kanban card through Gateway RPC. Gateway selection is priority first, then oldest card.",
      parameters: KanbanPickTaskSchema,
      execute: async (_toolCallId, args) => {
        const params = args as Record<string, unknown>;
        const worker = readStringParam(params, "worker");
        const payload: Record<string, unknown> = {
          ...boardParams(params),
          agentId: readStringParam(params, "agentId") ?? options.agentId,
          agentName: readStringParam(params, "agentName") ?? options.agentName,
        };
        if (worker) payload.worker = worker;
        return jsonResult(
          await callGateway("kanban.codex.pickNext", readGatewayOpts(params), payload),
        );
      },
    },
    {
      label: "Kanban Handoff",
      name: "kanban_handoff",
      description:
        "Move a DAISy Kanban card to Review with a concise handoff summary, reviewer, or input owner through Gateway RPC only.",
      parameters: KanbanHandoffSchema,
      execute: async (_toolCallId, args) => {
        const params = args as Record<string, unknown>;
        const payload: Record<string, unknown> = {
          ...boardParams(params),
          cardId: readStringParam(params, "cardId", { required: true, label: "cardId" }),
          expectedVersion: readPositiveIntegerParam(params, "expectedVersion", {
            required: true,
            label: "expectedVersion",
          }),
          summary: readStringParam(params, "summary", { required: true, label: "summary" }),
        };
        if (hasParam(params, "reviewer")) {
          addIfPresent(payload, "reviewer", readOptionalNullableString(params, "reviewer"));
        }
        if (hasParam(params, "inputOwner")) {
          addIfPresent(payload, "inputOwner", readOptionalNullableString(params, "inputOwner"));
        }
        return jsonResult(
          await callGateway("kanban.codex.handoff", readGatewayOpts(params), payload),
        );
      },
    },
    {
      label: "Kanban Complete",
      name: "kanban_complete",
      description:
        "Move a DAISy Kanban card to Done with a concise completion summary through Gateway RPC only.",
      parameters: KanbanCompleteSchema,
      execute: async (_toolCallId, args) => {
        const params = args as Record<string, unknown>;
        return jsonResult(
          await callGateway("kanban.codex.complete", readGatewayOpts(params), {
            ...boardParams(params),
            cardId: readStringParam(params, "cardId", { required: true, label: "cardId" }),
            expectedVersion: readPositiveIntegerParam(params, "expectedVersion", {
              required: true,
              label: "expectedVersion",
            }),
            summary: readStringParam(params, "summary", { required: true, label: "summary" }),
          }),
        );
      },
    },
    ...granularTools,
  ];
}
