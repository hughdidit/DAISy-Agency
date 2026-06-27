import { randomUUID } from "node:crypto";
import {
  GridFSBucket,
  MongoClient,
  type ClientSession,
  type Collection,
  type Db,
  type Filter,
  type IndexDescription,
  type UpdateFilter,
} from "mongodb";
import { redactMongoUri, type ResolvedKanbanConfig } from "./config.js";
import {
  KANBAN_LANES,
  type KanbanActivity,
  type KanbanActivityAction,
  type KanbanActorEnvelope,
  type KanbanAuditEnvelope,
  type KanbanBoard,
  type KanbanCard,
  type KanbanLaneId,
  type KanbanPriority,
} from "./types.js";

export type KanbanBoardDocument = Omit<KanbanBoard, "id"> & {
  _id: string;
};

export type KanbanActivityDocument = Omit<KanbanActivity, "id"> & {
  _id: string;
};

export type KanbanCardDocument = Omit<KanbanCard, "id"> & {
  _id: string;
};

type CollectionSet = {
  boards: Collection<KanbanBoardDocument>;
  cards: Collection<KanbanCardDocument>;
  activity: Collection<KanbanActivityDocument>;
  imports: Collection;
  attachments: Collection;
};

const KANBAN_PRIORITY_RANK: Record<KanbanPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export type KanbanRepositoryStatus =
  | {
      available: true;
      database: string;
      boardSlug: string;
      redactedUri: string;
    }
  | {
      available: false;
      database: string;
      boardSlug: string;
      redactedUri: string;
      message: string;
    };

export type KanbanAppendActivityInput = {
  boardId: string;
  cardId?: string;
  action: KanbanActivityAction;
  summary: string;
  metadata?: Record<string, unknown>;
};

export type KanbanListActivityParams = {
  boardId: string;
  cardId?: string;
  limit?: number;
  before?: Date;
  beforeId?: string;
};

export type KanbanListCardsParams = {
  boardId: string;
  lane?: KanbanLaneId;
  includeArchived?: boolean;
  readyForCodex?: boolean;
  limit?: number;
  after?: {
    lane: KanbanLaneId;
    position: number;
    createdAt: Date;
    cardId: string;
  };
};

export type KanbanCreateCardInput = {
  id?: string;
  boardId: string;
  title: string;
  description?: string;
  lane?: KanbanLaneId;
  position?: number;
  priority?: KanbanPriority;
  assignee?: string;
  reviewer?: string;
  inputOwner?: string;
  labels?: string[];
  dueAt?: Date;
  checklist?: KanbanCard["checklist"];
  comments?: KanbanCard["comments"];
  links?: string[];
  attachments?: KanbanCard["attachments"];
  watchers?: string[];
  customFields?: Record<string, unknown>;
  readyForCodex?: boolean;
  import?: KanbanCard["import"];
};

export type KanbanUpdateCardInput = {
  boardId: string;
  cardId: string;
  expectedVersion: number;
  updates: {
    title?: string;
    description?: string | null;
    priority?: KanbanPriority;
    assignee?: string | null;
    reviewer?: string | null;
    inputOwner?: string | null;
    labels?: string[];
    dueAt?: Date | null;
    checklist?: KanbanCard["checklist"];
    comments?: KanbanCard["comments"];
    links?: string[];
    attachments?: KanbanCard["attachments"];
    watchers?: string[];
    customFields?: Record<string, unknown>;
    readyForCodex?: boolean;
    import?: KanbanCard["import"] | null;
  };
};

export type KanbanMoveCardInput = {
  boardId: string;
  cardId: string;
  expectedVersion: number;
  lane: KanbanLaneId;
  position: number;
};

export type KanbanArchiveCardInput = {
  boardId: string;
  cardId: string;
  expectedVersion: number;
};

export type KanbanPickNextCodexCardInput = {
  boardId: string;
};

export type KanbanCardMutationResult = {
  card: KanbanCard;
  activity: KanbanActivity;
};

type TimestampedKanbanAuditEnvelope = KanbanAuditEnvelope & {
  occurredAt: Date;
};

type KanbanIndexDefinitions = {
  boards: IndexDescription[];
  cards: IndexDescription[];
  activity: IndexDescription[];
  imports: IndexDescription[];
  attachments: IndexDescription[];
};

export const KANBAN_INDEX_DEFINITIONS: KanbanIndexDefinitions = {
  boards: [
    {
      key: { slug: 1 },
      name: "kanban_boards_slug_unique",
      unique: true,
    },
  ],
  cards: [
    {
      key: { boardId: 1, archivedAt: 1, lane: 1, position: 1 },
      name: "kanban_cards_board_lane_position",
    },
    {
      key: { boardId: 1, readyForCodex: 1, priorityRank: 1, createdAt: 1 },
      name: "kanban_cards_codex_pickup",
    },
    {
      key: { boardId: 1, "import.source": 1, "import.sourceCardId": 1 },
      name: "kanban_cards_import_source_card_unique",
      unique: true,
      partialFilterExpression: {
        "import.source": { $exists: true },
        "import.sourceCardId": { $exists: true },
      },
    },
  ],
  activity: [
    {
      key: { boardId: 1, createdAt: -1, _id: -1 },
      name: "kanban_activity_board_created",
    },
    {
      key: { cardId: 1, createdAt: -1, _id: -1 },
      name: "kanban_activity_card_created",
    },
  ],
  imports: [
    {
      key: { source: 1, sourceHash: 1 },
      name: "kanban_imports_source_hash_unique",
      unique: true,
    },
  ],
  attachments: [
    {
      key: { boardId: 1, cardId: 1, archivedAt: 1 },
      name: "kanban_attachments_board_card_archived",
    },
  ],
};

export async function createKanbanMongoClient(config: ResolvedKanbanConfig): Promise<MongoClient> {
  const client = new MongoClient(config.uri, {
    appName: "daisy-kanban",
  });
  await client.connect();
  return client;
}

export async function createKanbanRepository(
  config: ResolvedKanbanConfig,
): Promise<KanbanMongoRepository> {
  const client = await createKanbanMongoClient(config);
  return new KanbanMongoRepository(client, config);
}

export function buildDefaultBoardDocument(
  config: ResolvedKanbanConfig,
  now = new Date(),
): KanbanBoardDocument {
  return {
    _id: config.board.slug,
    slug: config.board.slug,
    title: config.board.title,
    lanes: KANBAN_LANES.map((lane) => ({ ...lane })),
    createdAt: now,
    updatedAt: now,
  };
}

function mapBoard(document: KanbanBoardDocument): KanbanBoard {
  const { _id, ...board } = document;
  return {
    id: _id,
    ...board,
  };
}

function mapActivity(document: KanbanActivityDocument): KanbanActivity {
  const { _id, ...activity } = document;
  return {
    id: _id,
    ...activity,
  };
}

function mapCard(document: KanbanCardDocument): KanbanCard {
  const { _id, ...card } = document;
  return {
    id: _id,
    ...card,
    description: card.description ?? undefined,
    assignee: card.assignee ?? undefined,
    reviewer: card.reviewer ?? undefined,
    inputOwner: card.inputOwner ?? undefined,
    dueAt: card.dueAt ?? undefined,
    import: card.import ?? undefined,
  };
}

function assertActor(actor: KanbanActorEnvelope): void {
  if (!actor.id || !actor.id.trim()) {
    throw new Error("Kanban audit actor id is required");
  }
  if (!actor.type) {
    throw new Error("Kanban audit actor type is required");
  }
}

export function validateKanbanAuditEnvelope(audit: KanbanAuditEnvelope | null | undefined): void {
  if (!audit) {
    throw new Error("Kanban audit envelope is required");
  }
  if (!audit.actor) {
    throw new Error("Kanban audit actor is required");
  }
  assertActor(audit.actor);
}

function auditWithTimestamp(audit: KanbanAuditEnvelope): TimestampedKanbanAuditEnvelope {
  validateKanbanAuditEnvelope(audit);
  return audit.occurredAt
    ? (audit as TimestampedKanbanAuditEnvelope)
    : { ...audit, occurredAt: new Date() };
}

function clampLimit(limit: number | undefined, max: number): number {
  if (limit === undefined) {
    return max;
  }
  if (!Number.isFinite(limit) || limit <= 0) {
    return max;
  }
  return Math.min(Math.floor(limit), max);
}

function priorityRank(priority: KanbanPriority): number {
  return KANBAN_PRIORITY_RANK[priority];
}

function cloneCardArray<T extends object>(items: T[] | undefined): T[] {
  return items ? items.map((item) => ({ ...item })) : [];
}

function cloneStrings(items: string[] | undefined): string[] {
  return items ? [...items] : [];
}

function cloneRecord(value: Record<string, unknown> | undefined): Record<string, unknown> {
  return value ? { ...value } : {};
}

function requireNonEmptyText(value: string, message: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(message);
  }
  return trimmed;
}

export function buildCardDocument(
  input: KanbanCreateCardInput,
  now = new Date(),
): KanbanCardDocument {
  const priority = input.priority ?? "normal";
  const title = requireNonEmptyText(input.title, "Kanban card title is required");
  return {
    _id: input.id ?? randomUUID(),
    boardId: requireNonEmptyText(input.boardId, "Kanban board id is required"),
    title,
    description: input.description,
    lane: input.lane ?? "todo",
    position: input.position ?? now.getTime(),
    priority,
    priorityRank: priorityRank(priority),
    version: 1,
    assignee: input.assignee,
    reviewer: input.reviewer,
    inputOwner: input.inputOwner,
    labels: cloneStrings(input.labels),
    dueAt: input.dueAt,
    checklist: cloneCardArray(input.checklist),
    comments: cloneCardArray(input.comments),
    links: cloneStrings(input.links),
    attachments: cloneCardArray(input.attachments),
    watchers: cloneStrings(input.watchers),
    customFields: cloneRecord(input.customFields),
    readyForCodex: input.readyForCodex ?? false,
    import: input.import ? { ...input.import } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildCardUpdateOperation(
  input: KanbanUpdateCardInput,
  now: Date,
): UpdateFilter<KanbanCardDocument> {
  const set: Partial<KanbanCardDocument> = {
    updatedAt: now,
  };
  const unset: Record<string, ""> = {};
  const { updates } = input;
  if (updates.title !== undefined) {
    set.title = requireNonEmptyText(updates.title, "Kanban card title is required");
  }
  if (updates.description === null) {
    unset.description = "";
  } else if (updates.description !== undefined) {
    set.description = updates.description;
  }
  if (updates.priority !== undefined) {
    set.priority = updates.priority;
    set.priorityRank = priorityRank(updates.priority);
  }
  if (updates.assignee === null) {
    unset.assignee = "";
  } else if (updates.assignee !== undefined) {
    set.assignee = updates.assignee;
  }
  if (updates.reviewer === null) {
    unset.reviewer = "";
  } else if (updates.reviewer !== undefined) {
    set.reviewer = updates.reviewer;
  }
  if (updates.inputOwner === null) {
    unset.inputOwner = "";
  } else if (updates.inputOwner !== undefined) {
    set.inputOwner = updates.inputOwner;
  }
  if (updates.labels !== undefined) {
    set.labels = cloneStrings(updates.labels);
  }
  if (updates.dueAt === null) {
    unset.dueAt = "";
  } else if (updates.dueAt !== undefined) {
    set.dueAt = updates.dueAt;
  }
  if (updates.checklist !== undefined) {
    set.checklist = cloneCardArray(updates.checklist);
  }
  if (updates.comments !== undefined) {
    set.comments = cloneCardArray(updates.comments);
  }
  if (updates.links !== undefined) {
    set.links = cloneStrings(updates.links);
  }
  if (updates.attachments !== undefined) {
    set.attachments = cloneCardArray(updates.attachments);
  }
  if (updates.watchers !== undefined) {
    set.watchers = cloneStrings(updates.watchers);
  }
  if (updates.customFields !== undefined) {
    set.customFields = { ...updates.customFields };
  }
  if (updates.readyForCodex !== undefined) {
    set.readyForCodex = updates.readyForCodex;
  }
  if (updates.import === null) {
    unset.import = "";
  } else if (updates.import !== undefined) {
    set.import = { ...updates.import };
  }
  const operation: UpdateFilter<KanbanCardDocument> = {
    $inc: { version: 1 },
    $set: set,
  };
  if (Object.keys(unset).length > 0) {
    operation.$unset = unset as UpdateFilter<KanbanCardDocument>["$unset"];
  }
  return operation;
}

function redactRepositoryError(error: unknown, config: ResolvedKanbanConfig): string {
  const raw = error instanceof Error ? error.message : String(error);
  const redactedUri = redactMongoUri(config.uri) ?? config.redactedUri;
  return raw.split(config.uri).join(redactedUri);
}

export class KanbanMongoRepository {
  private readonly db: Db;
  private readonly collections: CollectionSet;

  constructor(
    private readonly client: MongoClient,
    private readonly config: ResolvedKanbanConfig,
  ) {
    this.db = client.db(config.database);
    this.collections = {
      boards: this.db.collection<KanbanBoardDocument>(config.collections.boards),
      cards: this.db.collection<KanbanCardDocument>(config.collections.cards),
      activity: this.db.collection<KanbanActivityDocument>(config.collections.activity),
      imports: this.db.collection(config.collections.imports),
      attachments: this.db.collection(config.collections.attachments),
    };
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  async status(): Promise<KanbanRepositoryStatus> {
    try {
      await this.db.command({ ping: 1 });
      return {
        available: true,
        database: this.config.database,
        boardSlug: this.config.board.slug,
        redactedUri: this.config.redactedUri,
      };
    } catch (error) {
      return {
        available: false,
        database: this.config.database,
        boardSlug: this.config.board.slug,
        redactedUri: this.config.redactedUri,
        message: redactRepositoryError(error, this.config),
      };
    }
  }

  async ensureIndexes(): Promise<void> {
    await Promise.all([
      this.collections.boards.createIndexes(KANBAN_INDEX_DEFINITIONS.boards),
      this.collections.cards.createIndexes(KANBAN_INDEX_DEFINITIONS.cards),
      this.collections.activity.createIndexes(KANBAN_INDEX_DEFINITIONS.activity),
      this.collections.imports.createIndexes(KANBAN_INDEX_DEFINITIONS.imports),
      this.collections.attachments.createIndexes(KANBAN_INDEX_DEFINITIONS.attachments),
    ]);
  }

  private async withTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = this.client.startSession();
    const empty = Symbol("empty transaction result");
    let result: T | typeof empty = empty;
    try {
      await session.withTransaction(async () => {
        result = await operation(session);
      });
      if (result === empty) {
        throw new Error("Kanban repository transaction did not produce a result");
      }
      return result;
    } finally {
      await session.endSession();
    }
  }

  async bootstrapDefaultBoard(audit: KanbanAuditEnvelope): Promise<KanbanBoard> {
    const unifiedAudit = auditWithTimestamp(audit);
    const board = buildDefaultBoardDocument(this.config, unifiedAudit.occurredAt);
    return this.withTransaction(async (session) => {
      const result = await this.collections.boards.updateOne(
        { _id: board._id },
        {
          $setOnInsert: board,
        },
        { upsert: true, session },
      );

      const persisted = await this.collections.boards.findOne({ _id: board._id }, { session });
      if (!persisted) {
        throw new Error("Kanban default board bootstrap failed");
      }
      if (result.upsertedCount > 0) {
        await this.appendActivity(
          {
            boardId: persisted._id,
            action: "board_bootstrap",
            summary: `Created ${persisted.title} board`,
          },
          unifiedAudit,
          session,
        );
      }
      return mapBoard(persisted);
    });
  }

  async getDefaultBoard(): Promise<KanbanBoard | null> {
    const board = await this.collections.boards.findOne({ slug: this.config.board.slug });
    return board ? mapBoard(board) : null;
  }

  async createCard(
    input: KanbanCreateCardInput,
    audit: KanbanAuditEnvelope,
  ): Promise<KanbanCardMutationResult> {
    const unifiedAudit = auditWithTimestamp(audit);
    return this.withTransaction(async (session) => {
      const document = buildCardDocument(input, unifiedAudit.occurredAt);
      await this.collections.cards.insertOne(document, { session });
      const activity = await this.appendActivity(
        {
          boardId: document.boardId,
          cardId: document._id,
          action: "card_create",
          summary: `Created ${document.title}`,
        },
        unifiedAudit,
        session,
      );
      return {
        card: mapCard(document),
        activity,
      };
    });
  }

  async listCards(params: KanbanListCardsParams): Promise<KanbanCard[]> {
    const limit = clampLimit(params.limit, 500);
    const filter: Filter<KanbanCardDocument> = {
      boardId: params.boardId,
    };
    if (!params.includeArchived) {
      filter.archivedAt = { $exists: false };
    }
    if (params.lane) {
      filter.lane = params.lane;
    }
    if (params.readyForCodex !== undefined) {
      filter.readyForCodex = params.readyForCodex;
    }
    if (params.after) {
      const after = params.after;
      filter.$or = params.lane
        ? [
            { lane: after.lane, position: { $gt: after.position } },
            { lane: after.lane, position: after.position, createdAt: { $gt: after.createdAt } },
            {
              lane: after.lane,
              position: after.position,
              createdAt: after.createdAt,
              _id: { $gt: after.cardId },
            },
          ]
        : [
            { lane: { $gt: after.lane } },
            { lane: after.lane, position: { $gt: after.position } },
            { lane: after.lane, position: after.position, createdAt: { $gt: after.createdAt } },
            {
              lane: after.lane,
              position: after.position,
              createdAt: after.createdAt,
              _id: { $gt: after.cardId },
            },
          ];
    }
    const rows = await this.collections.cards
      .find(filter, {
        limit,
        sort: { lane: 1, position: 1, createdAt: 1, _id: 1 },
      })
      .toArray();
    return rows.map(mapCard);
  }

  async getCard(boardId: string, cardId: string): Promise<KanbanCard | null> {
    const card = await this.collections.cards.findOne({
      boardId,
      _id: cardId,
      archivedAt: { $exists: false },
    });
    return card ? mapCard(card) : null;
  }

  async updateCard(
    input: KanbanUpdateCardInput,
    audit: KanbanAuditEnvelope,
  ): Promise<KanbanCardMutationResult | null> {
    const unifiedAudit = auditWithTimestamp(audit);
    return this.withTransaction(async (session) => {
      const card = await this.collections.cards.findOneAndUpdate(
        {
          _id: input.cardId,
          boardId: input.boardId,
          archivedAt: { $exists: false },
          version: input.expectedVersion,
        },
        buildCardUpdateOperation(input, unifiedAudit.occurredAt),
        { returnDocument: "after", session },
      );
      if (!card) {
        return null;
      }
      const activity = await this.appendActivity(
        {
          boardId: input.boardId,
          cardId: input.cardId,
          action: "card_update",
          summary: `Updated ${card.title}`,
        },
        unifiedAudit,
        session,
      );
      return {
        card: mapCard(card),
        activity,
      };
    });
  }

  async moveCard(
    input: KanbanMoveCardInput,
    audit: KanbanAuditEnvelope,
  ): Promise<KanbanCardMutationResult | null> {
    const unifiedAudit = auditWithTimestamp(audit);
    return this.withTransaction(async (session) => {
      const card = await this.collections.cards.findOneAndUpdate(
        {
          _id: input.cardId,
          boardId: input.boardId,
          archivedAt: { $exists: false },
          version: input.expectedVersion,
        },
        {
          $inc: { version: 1 },
          $set: {
            lane: input.lane,
            position: input.position,
            updatedAt: unifiedAudit.occurredAt,
          },
        },
        { returnDocument: "after", session },
      );
      if (!card) {
        return null;
      }
      const activity = await this.appendActivity(
        {
          boardId: input.boardId,
          cardId: input.cardId,
          action: "card_move",
          summary: `Moved ${card.title} to ${card.lane}`,
          metadata: {
            lane: card.lane,
            position: card.position,
          },
        },
        unifiedAudit,
        session,
      );
      return {
        card: mapCard(card),
        activity,
      };
    });
  }

  async archiveCard(
    input: KanbanArchiveCardInput,
    audit: KanbanAuditEnvelope,
  ): Promise<KanbanCardMutationResult | null> {
    const unifiedAudit = auditWithTimestamp(audit);
    return this.withTransaction(async (session) => {
      const card = await this.collections.cards.findOneAndUpdate(
        {
          _id: input.cardId,
          boardId: input.boardId,
          archivedAt: { $exists: false },
          version: input.expectedVersion,
        },
        {
          $inc: { version: 1 },
          $set: {
            archivedAt: unifiedAudit.occurredAt,
            readyForCodex: false,
            updatedAt: unifiedAudit.occurredAt,
          },
        },
        { returnDocument: "after", session },
      );
      if (!card) {
        return null;
      }
      const activity = await this.appendActivity(
        {
          boardId: input.boardId,
          cardId: input.cardId,
          action: "card_archive",
          summary: `Archived ${card.title}`,
        },
        unifiedAudit,
        session,
      );
      return {
        card: mapCard(card),
        activity,
      };
    });
  }

  async pickNextCodexCard(
    input: KanbanPickNextCodexCardInput,
    audit: KanbanAuditEnvelope,
  ): Promise<KanbanCardMutationResult | null> {
    const unifiedAudit = auditWithTimestamp(audit);
    return this.withTransaction(async (session) => {
      const card = await this.collections.cards.findOneAndUpdate(
        {
          boardId: input.boardId,
          archivedAt: { $exists: false },
          readyForCodex: true,
        },
        {
          $set: {
            assignee: unifiedAudit.actor.id,
            lane: "in_progress",
            readyForCodex: false,
            updatedAt: unifiedAudit.occurredAt,
          },
          $inc: { version: 1 },
        },
        {
          returnDocument: "after",
          session,
          sort: { priorityRank: 1, createdAt: 1, _id: 1 },
        },
      );
      if (!card) {
        return null;
      }
      const activity = await this.appendActivity(
        {
          boardId: input.boardId,
          cardId: card._id,
          action: "card_pickup",
          summary: `${unifiedAudit.actor.name ?? unifiedAudit.actor.id} picked up ${card.title}`,
        },
        unifiedAudit,
        session,
      );
      return {
        card: mapCard(card),
        activity,
      };
    });
  }

  async appendActivity(
    input: KanbanAppendActivityInput,
    audit: KanbanAuditEnvelope,
    session?: ClientSession,
  ): Promise<KanbanActivity> {
    const unifiedAudit = auditWithTimestamp(audit);
    const document: KanbanActivityDocument = {
      _id: randomUUID(),
      boardId: input.boardId,
      cardId: input.cardId,
      action: input.action,
      summary: input.summary,
      actor: unifiedAudit.actor,
      correlationId: unifiedAudit.correlationId,
      metadata: input.metadata,
      createdAt: unifiedAudit.occurredAt,
    };
    await this.collections.activity.insertOne(document, session ? { session } : undefined);
    return mapActivity(document);
  }

  async listActivity(params: KanbanListActivityParams): Promise<KanbanActivity[]> {
    const limit = clampLimit(params.limit, 100);
    const filter: Filter<KanbanActivityDocument> = {
      boardId: params.boardId,
    };
    if (params.cardId) {
      filter.cardId = params.cardId;
    }
    if (params.before) {
      if (params.beforeId) {
        filter.$or = [
          { createdAt: { $lt: params.before } },
          { createdAt: params.before, _id: { $lt: params.beforeId } },
        ];
      } else {
        filter.createdAt = { $lt: params.before };
      }
    }
    const rows = await this.collections.activity
      .find(filter, {
        limit,
        sort: { createdAt: -1, _id: -1 },
      })
      .toArray();
    return rows.map(mapActivity);
  }

  attachmentBucket(): GridFSBucket {
    return new GridFSBucket(this.db, {
      bucketName: this.config.collections.gridFsBucket,
    });
  }
}
