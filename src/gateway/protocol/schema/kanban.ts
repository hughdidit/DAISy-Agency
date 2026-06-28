import { Type } from "@sinclair/typebox";
import { NonEmptyString } from "./primitives.js";

const IsoDateTimeString = Type.String({
  format: "date-time",
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,9})?(?:Z|[+-]\\d{2}:\\d{2})$",
});
const NullableString = Type.Union([Type.String(), Type.Null()]);
const NullableNonEmptyString = Type.Union([NonEmptyString, Type.Null()]);
const KanbanImportFormatSchema = Type.Union([Type.Literal("json"), Type.Literal("csv")]);

export const KanbanLaneIdSchema = Type.Union([
  Type.Literal("todo"),
  Type.Literal("in_progress"),
  Type.Literal("review"),
  Type.Literal("done"),
]);

export const KanbanPrioritySchema = Type.Union([
  Type.Literal("urgent"),
  Type.Literal("high"),
  Type.Literal("normal"),
  Type.Literal("low"),
]);

export const KanbanActorTypeSchema = Type.Union([
  Type.Literal("human"),
  Type.Literal("agent"),
  Type.Literal("api"),
  Type.Literal("import"),
  Type.Literal("system"),
]);

export const KanbanActivityActionSchema = Type.Union([
  Type.Literal("board_bootstrap"),
  Type.Literal("card_create"),
  Type.Literal("card_update"),
  Type.Literal("card_move"),
  Type.Literal("card_comment"),
  Type.Literal("card_archive"),
  Type.Literal("card_pickup"),
  Type.Literal("card_handoff"),
  Type.Literal("card_complete"),
  Type.Literal("import_preview"),
  Type.Literal("import_run"),
  Type.Literal("attachment_add"),
  Type.Literal("attachment_archive"),
]);

export const KanbanActorSchema = Type.Object(
  {
    type: KanbanActorTypeSchema,
    id: NonEmptyString,
    name: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const KanbanLaneSchema = Type.Object(
  {
    id: KanbanLaneIdSchema,
    title: NonEmptyString,
    position: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const KanbanBoardSchema = Type.Object(
  {
    id: NonEmptyString,
    slug: NonEmptyString,
    title: NonEmptyString,
    lanes: Type.Array(KanbanLaneSchema, { minItems: 4, maxItems: 4 }),
    createdAt: IsoDateTimeString,
    updatedAt: IsoDateTimeString,
  },
  { additionalProperties: false },
);

export const KanbanChecklistItemSchema = Type.Object(
  {
    id: NonEmptyString,
    text: NonEmptyString,
    checked: Type.Boolean(),
    createdAt: IsoDateTimeString,
    updatedAt: IsoDateTimeString,
  },
  { additionalProperties: false },
);

export const KanbanCommentSchema = Type.Object(
  {
    id: NonEmptyString,
    body: NonEmptyString,
    actor: KanbanActorSchema,
    createdAt: IsoDateTimeString,
  },
  { additionalProperties: false },
);

export const KanbanAttachmentMetadataSchema = Type.Object(
  {
    id: NonEmptyString,
    fileName: NonEmptyString,
    contentType: Type.Optional(Type.String()),
    sizeBytes: Type.Integer({ minimum: 0 }),
    gridFsId: NonEmptyString,
    archivedAt: Type.Optional(IsoDateTimeString),
    createdAt: IsoDateTimeString,
  },
  { additionalProperties: false },
);

export const KanbanImportReferenceSchema = Type.Object(
  {
    source: Type.Union([Type.Literal("trello"), Type.Literal("manual"), Type.Literal("api")]),
    sourceCardId: NonEmptyString,
    importRunId: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);

export const KanbanCardSchema = Type.Object(
  {
    id: NonEmptyString,
    boardId: NonEmptyString,
    title: NonEmptyString,
    description: Type.Optional(Type.String()),
    lane: KanbanLaneIdSchema,
    position: Type.Number(),
    priority: KanbanPrioritySchema,
    assignee: Type.Optional(NonEmptyString),
    reviewer: Type.Optional(NonEmptyString),
    inputOwner: Type.Optional(NonEmptyString),
    labels: Type.Array(Type.String(), { maxItems: 50 }),
    dueDate: Type.Optional(IsoDateTimeString),
    checklist: Type.Array(KanbanChecklistItemSchema, { maxItems: 200 }),
    comments: Type.Array(KanbanCommentSchema, { maxItems: 200 }),
    links: Type.Array(Type.String(), { maxItems: 100 }),
    attachments: Type.Array(KanbanAttachmentMetadataSchema, { maxItems: 100 }),
    watchers: Type.Array(NonEmptyString, { maxItems: 100 }),
    customFields: Type.Record(Type.String(), Type.Unknown()),
    readyForCodex: Type.Boolean(),
    import: Type.Optional(KanbanImportReferenceSchema),
    archivedAt: Type.Optional(IsoDateTimeString),
    createdAt: IsoDateTimeString,
    updatedAt: IsoDateTimeString,
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const KanbanActivitySchema = Type.Object(
  {
    id: NonEmptyString,
    boardId: NonEmptyString,
    cardId: Type.Optional(NonEmptyString),
    action: KanbanActivityActionSchema,
    actor: KanbanActorSchema,
    summary: NonEmptyString,
    data: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    correlationId: Type.Optional(NonEmptyString),
    createdAt: IsoDateTimeString,
  },
  { additionalProperties: false },
);

export const KanbanCardMutationResultSchema = Type.Object(
  {
    card: KanbanCardSchema,
    activity: KanbanActivitySchema,
  },
  { additionalProperties: false },
);

export const KanbanStatusParamsSchema = Type.Object({}, { additionalProperties: false });

export const KanbanStatusResultSchema = Type.Object(
  {
    ok: Type.Boolean(),
    available: Type.Boolean(),
    enabled: Type.Boolean(),
    boardId: Type.Optional(NonEmptyString),
    reason: Type.Optional(Type.String()),
    message: Type.Optional(Type.String()),
    redactedUri: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const KanbanBoardGetParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);

export const KanbanBoardGetResultSchema = Type.Object(
  {
    board: KanbanBoardSchema,
  },
  { additionalProperties: false },
);

export const KanbanCardsListParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    lane: Type.Optional(KanbanLaneIdSchema),
    includeArchived: Type.Optional(Type.Boolean()),
    readyForCodex: Type.Optional(Type.Boolean()),
    assignee: Type.Optional(NonEmptyString),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
    after: Type.Optional(
      Type.Object(
        {
          lane: KanbanLaneIdSchema,
          position: Type.Number(),
          createdAt: IsoDateTimeString,
          cardId: NonEmptyString,
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const KanbanCardsListResultSchema = Type.Object(
  {
    cards: Type.Array(KanbanCardSchema, { maxItems: 200 }),
  },
  { additionalProperties: false },
);

export const KanbanCardsGetParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    cardId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const KanbanCardsGetResultSchema = Type.Object(
  {
    card: KanbanCardSchema,
  },
  { additionalProperties: false },
);

export const KanbanCardsCreateParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    title: NonEmptyString,
    description: Type.Optional(Type.String()),
    lane: Type.Optional(KanbanLaneIdSchema),
    position: Type.Optional(Type.Number()),
    priority: Type.Optional(KanbanPrioritySchema),
    assignee: Type.Optional(NonEmptyString),
    reviewer: Type.Optional(NonEmptyString),
    inputOwner: Type.Optional(NonEmptyString),
    labels: Type.Optional(Type.Array(Type.String(), { maxItems: 50 })),
    dueDate: Type.Optional(IsoDateTimeString),
    readyForCodex: Type.Optional(Type.Boolean()),
    links: Type.Optional(Type.Array(Type.String(), { maxItems: 100 })),
    watchers: Type.Optional(Type.Array(NonEmptyString, { maxItems: 100 })),
    customFields: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  { additionalProperties: false },
);

export const KanbanCardsUpdateParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    cardId: NonEmptyString,
    expectedVersion: Type.Integer({ minimum: 1 }),
    updates: Type.Object(
      {
        title: Type.Optional(NonEmptyString),
        description: Type.Optional(NullableString),
        priority: Type.Optional(KanbanPrioritySchema),
        assignee: Type.Optional(NullableNonEmptyString),
        reviewer: Type.Optional(NullableNonEmptyString),
        inputOwner: Type.Optional(NullableNonEmptyString),
        labels: Type.Optional(Type.Array(Type.String(), { maxItems: 50 })),
        dueDate: Type.Optional(Type.Union([IsoDateTimeString, Type.Null()])),
        checklist: Type.Optional(Type.Array(KanbanChecklistItemSchema, { maxItems: 200 })),
        links: Type.Optional(Type.Array(Type.String(), { maxItems: 100 })),
        watchers: Type.Optional(Type.Array(NonEmptyString, { maxItems: 100 })),
        customFields: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        readyForCodex: Type.Optional(Type.Boolean()),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const KanbanCardsMoveParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    cardId: NonEmptyString,
    expectedVersion: Type.Integer({ minimum: 1 }),
    lane: KanbanLaneIdSchema,
    position: Type.Optional(Type.Number()),
  },
  { additionalProperties: false },
);

export const KanbanCardsCommentParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    cardId: NonEmptyString,
    body: NonEmptyString,
  },
  { additionalProperties: false },
);

export const KanbanCardsArchiveParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    cardId: NonEmptyString,
    expectedVersion: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const KanbanActivityListParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    cardId: Type.Optional(NonEmptyString),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
    before: Type.Optional(IsoDateTimeString),
  },
  { additionalProperties: false },
);

export const KanbanActivityListResultSchema = Type.Object(
  {
    activity: Type.Array(KanbanActivitySchema, { maxItems: 200 }),
  },
  { additionalProperties: false },
);

export const KanbanImportTrelloPreviewParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    format: KanbanImportFormatSchema,
    content: NonEmptyString,
  },
  { additionalProperties: false },
);

export const KanbanImportPreviewCardSchema = Type.Object(
  {
    sourceCardId: NonEmptyString,
    title: NonEmptyString,
    lane: KanbanLaneIdSchema,
    priority: KanbanPrioritySchema,
    labels: Type.Array(Type.String(), { maxItems: 50 }),
    dueDate: Type.Optional(IsoDateTimeString),
    warnings: Type.Array(Type.String(), { maxItems: 20 }),
  },
  { additionalProperties: false },
);

export const KanbanImportTrelloPreviewResultSchema = Type.Object(
  {
    importId: NonEmptyString,
    cards: Type.Array(KanbanImportPreviewCardSchema, { maxItems: 1000 }),
    warnings: Type.Array(Type.String(), { maxItems: 100 }),
  },
  { additionalProperties: false },
);

export const KanbanImportTrelloRunParamsSchema = Type.Union([
  Type.Object(
    {
      boardId: Type.Optional(NonEmptyString),
      importId: NonEmptyString,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      boardId: Type.Optional(NonEmptyString),
      format: KanbanImportFormatSchema,
      content: NonEmptyString,
    },
    { additionalProperties: false },
  ),
]);

export const KanbanImportTrelloRunResultSchema = Type.Object(
  {
    importRunId: NonEmptyString,
    created: Type.Integer({ minimum: 0 }),
    updated: Type.Integer({ minimum: 0 }),
    skipped: Type.Integer({ minimum: 0 }),
    activity: KanbanActivitySchema,
  },
  { additionalProperties: false },
);

export const KanbanCodexPickNextParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    agentId: Type.Optional(NonEmptyString),
    agentName: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const KanbanCodexPickNextResultSchema = Type.Object(
  {
    card: Type.Union([KanbanCardSchema, Type.Null()]),
    activity: Type.Optional(KanbanActivitySchema),
  },
  { additionalProperties: false },
);

export const KanbanCodexHandoffParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    cardId: NonEmptyString,
    expectedVersion: Type.Integer({ minimum: 1 }),
    summary: NonEmptyString,
    reviewer: Type.Optional(NullableNonEmptyString),
    inputOwner: Type.Optional(NullableNonEmptyString),
  },
  { additionalProperties: false },
);

export const KanbanCodexCompleteParamsSchema = Type.Object(
  {
    boardId: Type.Optional(NonEmptyString),
    cardId: NonEmptyString,
    expectedVersion: Type.Integer({ minimum: 1 }),
    summary: NonEmptyString,
  },
  { additionalProperties: false },
);
