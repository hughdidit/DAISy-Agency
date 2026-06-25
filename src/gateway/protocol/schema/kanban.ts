import { Type } from "@sinclair/typebox";
import { NonEmptyString } from "./primitives.js";

const TimestampSchema = NonEmptyString;
const KanbanPrioritySchema = Type.Union([
  Type.Literal("low"),
  Type.Literal("normal"),
  Type.Literal("high"),
  Type.Literal("urgent"),
]);

export const KanbanActorSchema = Type.Object(
  {
    id: NonEmptyString,
    displayName: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);

export const KanbanBoardSchema = Type.Object(
  {
    id: NonEmptyString,
    name: NonEmptyString,
    ownerAgentId: NonEmptyString,
    stakeholder: NonEmptyString,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    version: Type.Integer({ minimum: 1 }),
    archivedAt: Type.Optional(TimestampSchema),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  { additionalProperties: false },
);

export const KanbanLaneSchema = Type.Object(
  {
    id: NonEmptyString,
    boardId: NonEmptyString,
    title: NonEmptyString,
    position: Type.Integer({ minimum: 0 }),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    version: Type.Integer({ minimum: 1 }),
    archivedAt: Type.Optional(TimestampSchema),
  },
  { additionalProperties: false },
);

export const KanbanCardSchema = Type.Object(
  {
    id: NonEmptyString,
    boardId: NonEmptyString,
    laneId: NonEmptyString,
    title: NonEmptyString,
    description: Type.Optional(Type.String()),
    position: Type.Integer({ minimum: 0 }),
    assignees: Type.Array(NonEmptyString),
    labels: Type.Array(NonEmptyString),
    dueDate: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
    priority: Type.Optional(KanbanPrioritySchema),
    checklistItemIds: Type.Array(NonEmptyString),
    credentialMetadataIds: Type.Array(NonEmptyString),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    createdBy: KanbanActorSchema,
    updatedBy: KanbanActorSchema,
    version: Type.Integer({ minimum: 1 }),
    archivedAt: Type.Optional(TimestampSchema),
  },
  { additionalProperties: false },
);

export const KanbanChecklistItemSchema = Type.Object(
  {
    id: NonEmptyString,
    cardId: NonEmptyString,
    text: NonEmptyString,
    checked: Type.Boolean(),
    position: Type.Integer({ minimum: 0 }),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const KanbanCommentSchema = Type.Object(
  {
    id: NonEmptyString,
    cardId: NonEmptyString,
    body: NonEmptyString,
    author: KanbanActorSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    version: Type.Integer({ minimum: 1 }),
    deletedAt: Type.Optional(TimestampSchema),
  },
  { additionalProperties: false },
);

const KanbanActivityTypeSchema = Type.Union([
  Type.Literal("board.initialized"),
  Type.Literal("card.created"),
  Type.Literal("card.updated"),
  Type.Literal("card.moved"),
  Type.Literal("checklist.created"),
  Type.Literal("checklist.updated"),
  Type.Literal("checklist.deleted"),
  Type.Literal("comment.added"),
]);

export const KanbanActivitySchema = Type.Object(
  {
    id: NonEmptyString,
    boardId: NonEmptyString,
    cardId: Type.Optional(NonEmptyString),
    type: KanbanActivityTypeSchema,
    actor: KanbanActorSchema,
    createdAt: TimestampSchema,
    summary: NonEmptyString,
    data: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  { additionalProperties: false },
);

export const KanbanNotificationSchema = Type.Object(
  {
    id: NonEmptyString,
    boardId: NonEmptyString,
    cardId: Type.Optional(NonEmptyString),
    type: NonEmptyString,
    status: Type.Union([Type.Literal("pending"), Type.Literal("sent"), Type.Literal("failed")]),
    destination: Type.Optional(
      Type.Union([Type.Literal("discord"), Type.Literal("email"), Type.Literal("in-app")]),
    ),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    deliveredAt: Type.Optional(TimestampSchema),
    error: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const KanbanScopedCredentialMetadataSchema = Type.Object(
  {
    id: NonEmptyString,
    boardId: NonEmptyString,
    cardId: Type.Optional(NonEmptyString),
    label: NonEmptyString,
    scope: Type.Union([Type.Literal("board"), Type.Literal("card")]),
    secretRef: Type.Optional(NonEmptyString),
    hashRef: Type.Optional(NonEmptyString),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    createdBy: KanbanActorSchema,
  },
  { additionalProperties: false },
);

export const KanbanBoardGetParamsSchema = Type.Object({}, { additionalProperties: false });

export const KanbanCardsListParamsSchema = Type.Object(
  {
    laneId: Type.Optional(NonEmptyString),
    includeArchived: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const KanbanCardsGetParamsSchema = Type.Object(
  {
    cardId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const KanbanCardsCreateParamsSchema = Type.Object(
  {
    title: NonEmptyString,
    description: Type.Optional(Type.String()),
    laneId: Type.Optional(NonEmptyString),
    assignees: Type.Optional(Type.Array(NonEmptyString)),
    labels: Type.Optional(Type.Array(NonEmptyString)),
    dueDate: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
    priority: Type.Optional(KanbanPrioritySchema),
  },
  { additionalProperties: false },
);

export const KanbanCardsUpdateParamsSchema = Type.Object(
  {
    cardId: NonEmptyString,
    expectedVersion: Type.Integer({ minimum: 1 }),
    title: Type.Optional(NonEmptyString),
    description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    assignees: Type.Optional(Type.Array(NonEmptyString)),
    labels: Type.Optional(Type.Array(NonEmptyString)),
    dueDate: Type.Optional(
      Type.Union([Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }), Type.Null()]),
    ),
    priority: Type.Optional(Type.Union([KanbanPrioritySchema, Type.Null()])),
  },
  { additionalProperties: false },
);

export const KanbanCardsMoveParamsSchema = Type.Object(
  {
    cardId: NonEmptyString,
    laneId: NonEmptyString,
    index: Type.Optional(Type.Integer({ minimum: 0 })),
    expectedVersion: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const KanbanCommentsListParamsSchema = Type.Object(
  {
    cardId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const KanbanCommentsAddParamsSchema = Type.Object(
  {
    cardId: NonEmptyString,
    body: NonEmptyString,
  },
  { additionalProperties: false },
);

export const KanbanChecklistsAddItemParamsSchema = Type.Object(
  {
    cardId: NonEmptyString,
    text: NonEmptyString,
    checked: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const KanbanChecklistsUpdateItemParamsSchema = Type.Object(
  {
    itemId: NonEmptyString,
    expectedVersion: Type.Integer({ minimum: 1 }),
    text: Type.Optional(NonEmptyString),
    checked: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const KanbanChecklistsDeleteItemParamsSchema = Type.Object(
  {
    itemId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const KanbanBoardSnapshotSchema = Type.Object(
  {
    board: KanbanBoardSchema,
    lanes: Type.Array(KanbanLaneSchema),
    cards: Type.Array(KanbanCardSchema),
  },
  { additionalProperties: false },
);

export const KanbanCardDetailSchema = Type.Object(
  {
    card: KanbanCardSchema,
    checklistItems: Type.Array(KanbanChecklistItemSchema),
    comments: Type.Array(KanbanCommentSchema),
    activities: Type.Array(KanbanActivitySchema),
  },
  { additionalProperties: false },
);

export const KanbanCardsListResultSchema = Type.Object(
  {
    cards: Type.Array(KanbanCardSchema),
  },
  { additionalProperties: false },
);

export const KanbanCommentsListResultSchema = Type.Object(
  {
    comments: Type.Array(KanbanCommentSchema),
  },
  { additionalProperties: false },
);

export const KanbanCommentsAddResultSchema = Type.Object(
  {
    comment: KanbanCommentSchema,
    card: KanbanCardSchema,
  },
  { additionalProperties: false },
);

export const KanbanChecklistsAddItemResultSchema = Type.Object(
  {
    item: KanbanChecklistItemSchema,
  },
  { additionalProperties: false },
);

export const KanbanChecklistsUpdateItemResultSchema = Type.Object(
  {
    item: KanbanChecklistItemSchema,
  },
  { additionalProperties: false },
);

export const KanbanChecklistsDeleteItemResultSchema = Type.Object(
  {
    deleted: Type.Boolean(),
  },
  { additionalProperties: false },
);
