import { randomUUID } from "node:crypto";
import {
  GridFSBucket,
  MongoClient,
  type Collection,
  type Db,
  type Filter,
  type IndexDescription,
} from "mongodb";
import { redactMongoUri, type ResolvedKanbanConfig } from "./config.js";
import {
  KANBAN_LANES,
  type KanbanActivity,
  type KanbanActivityAction,
  type KanbanActorEnvelope,
  type KanbanAuditEnvelope,
  type KanbanBoard,
} from "./types.js";

export type KanbanBoardDocument = Omit<KanbanBoard, "id"> & {
  _id: string;
};

export type KanbanActivityDocument = Omit<KanbanActivity, "id"> & {
  _id: string;
};

type CollectionSet = {
  boards: Collection<KanbanBoardDocument>;
  cards: Collection;
  activity: Collection<KanbanActivityDocument>;
  imports: Collection;
  attachments: Collection;
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

export function buildDefaultBoardDocument(config: ResolvedKanbanConfig): KanbanBoardDocument {
  const now = new Date();
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

function clampLimit(limit: number | undefined, max: number): number {
  if (limit === undefined) {
    return max;
  }
  if (!Number.isFinite(limit) || limit <= 0) {
    return max;
  }
  return Math.min(Math.floor(limit), max);
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
      cards: this.db.collection(config.collections.cards),
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

  async bootstrapDefaultBoard(audit: KanbanAuditEnvelope): Promise<KanbanBoard> {
    validateKanbanAuditEnvelope(audit);
    const board = buildDefaultBoardDocument(this.config);
    const result = await this.collections.boards.updateOne(
      { _id: board._id },
      {
        $setOnInsert: board,
      },
      { upsert: true },
    );

    const persisted = await this.collections.boards.findOne({ _id: board._id });
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
        audit,
      );
    }
    return mapBoard(persisted);
  }

  async getDefaultBoard(): Promise<KanbanBoard | null> {
    const board = await this.collections.boards.findOne({ slug: this.config.board.slug });
    return board ? mapBoard(board) : null;
  }

  async appendActivity(
    input: KanbanAppendActivityInput,
    audit: KanbanAuditEnvelope,
  ): Promise<KanbanActivity> {
    validateKanbanAuditEnvelope(audit);
    const now = audit.occurredAt ?? new Date();
    const document: KanbanActivityDocument = {
      _id: randomUUID(),
      boardId: input.boardId,
      cardId: input.cardId,
      action: input.action,
      summary: input.summary,
      actor: audit.actor,
      correlationId: audit.correlationId,
      metadata: input.metadata,
      createdAt: now,
    };
    await this.collections.activity.insertOne(document);
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
