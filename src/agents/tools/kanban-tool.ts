import { Type } from "@sinclair/typebox";
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
    limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
    after: Type.Optional(Type.Object({}, { additionalProperties: true })),
    before: Type.Optional(Type.String()),
    beforeId: Type.Optional(Type.String()),
  },
  { additionalProperties: true },
);

const KanbanWriteSchema = Type.Object(
  {
    action: stringEnum(KANBAN_WRITE_ACTIONS),
    ...GatewayFields,
    ...BoardField,
    cardId: Type.Optional(Type.String()),
    expectedVersion: Type.Optional(Type.Number({ minimum: 1 })),
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    lane: optionalStringEnum(KANBAN_LANES),
    position: Type.Optional(Type.Number()),
    priority: optionalStringEnum(KANBAN_PRIORITIES),
    assignee: Type.Optional(Type.String()),
    reviewer: Type.Optional(Type.String()),
    inputOwner: Type.Optional(Type.String()),
    labels: Type.Optional(Type.Array(Type.String())),
    dueDate: Type.Optional(Type.String()),
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
    reviewer: Type.Optional(Type.String()),
    inputOwner: Type.Optional(Type.String()),
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

type GatewayToolCaller = typeof callGatewayTool;

type KanbanToolDeps = {
  callGatewayTool?: GatewayToolCaller;
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
  const value = readNumberParam(params, key, {
    required: options.required,
    label: options.label ?? key,
    integer: true,
  });
  if (value !== undefined && value < 1) {
    throw new ToolInputError(`${options.label ?? key} must be at least 1`);
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
  return readStringParam(params, key);
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

function buildCardUpdates(params: Record<string, unknown>) {
  const explicitUpdates = readObjectParam(params, "updates");
  if (explicitUpdates && Object.keys(explicitUpdates).length > 0) {
    return explicitUpdates;
  }

  const updates: Record<string, unknown> = {};
  const stringFields = ["title", "priority"] as const;
  for (const key of stringFields) {
    addIfPresent(updates, key, readStringParam(params, key));
  }
  const nullableFields = ["description", "assignee", "reviewer", "inputOwner", "dueDate"] as const;
  for (const key of nullableFields) {
    if (hasParam(params, key)) {
      addIfPresent(updates, key, readOptionalNullableString(params, key));
    }
  }
  addIfPresent(updates, "labels", readStringArrayParam(params, "labels"));
  addIfPresent(updates, "checklist", readObjectArrayParam(params, "checklist"));
  addIfPresent(updates, "links", readStringArrayParam(params, "links"));
  addIfPresent(updates, "watchers", readStringArrayParam(params, "watchers"));
  addIfPresent(updates, "customFields", readObjectParam(params, "customFields"));
  addIfPresent(updates, "readyForCodex", readBooleanParam(params, "readyForCodex"));

  if (Object.keys(updates).length === 0) {
    throw new ToolInputError("updates required");
  }
  return updates;
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
      addIfPresent(payload, "limit", readLimitedIntegerParam(params, "limit", { max: 200 }));
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

export function createKanbanTools(deps?: KanbanToolDeps): AnyAgentTool[] {
  const callGateway = deps?.callGatewayTool ?? callGatewayTool;
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
        return jsonResult(
          await callGateway("kanban.codex.pickNext", readGatewayOpts(params), {
            ...boardParams(params),
            agentId: readStringParam(params, "agentId"),
            agentName: readStringParam(params, "agentName"),
          }),
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
  ];
}
