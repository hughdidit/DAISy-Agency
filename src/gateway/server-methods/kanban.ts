import { loadConfig, type OpenClawConfig } from "../../config/config.js";
import {
  resolveKanbanConfig,
  type KanbanConfigResolution,
  type ResolvedKanbanConfig,
} from "../../kanban/config.js";
import {
  createKanbanRepository,
  type KanbanMongoRepository,
  type KanbanRepositoryStatus,
} from "../../kanban/repository.js";
import type {
  KanbanActivity as RepositoryKanbanActivity,
  KanbanBoard as RepositoryKanbanBoard,
  KanbanCard as RepositoryKanbanCard,
} from "../../kanban/types.js";
import {
  ErrorCodes,
  errorShape,
  validateKanbanActivityListParams,
  validateKanbanBoardGetParams,
  validateKanbanCardsGetParams,
  validateKanbanCardsListParams,
  validateKanbanStatusParams,
} from "../protocol/index.js";
import type {
  KanbanActivity,
  KanbanBoard,
  KanbanCard,
  KanbanStatusResult,
} from "../protocol/schema/types.js";
import type { GatewayRequestHandlers, RespondFn } from "./types.js";
import { assertValidParams } from "./validation.js";

type KanbanRepositoryFactory = (config: ResolvedKanbanConfig) => Promise<KanbanMongoRepository>;

type KanbanHandlersDeps = {
  loadConfig?: () => OpenClawConfig;
  env?: Record<string, string | undefined>;
  createRepository?: KanbanRepositoryFactory;
};

const KANBAN_READ_METHODS = [
  "kanban.status",
  "kanban.board.get",
  "kanban.cards.list",
  "kanban.cards.get",
  "kanban.activity.list",
] as const;

function iso(value: Date): string {
  return value.toISOString();
}

function mapBoard(board: RepositoryKanbanBoard): KanbanBoard {
  return {
    id: board.id,
    slug: board.slug,
    title: board.title,
    lanes: board.lanes.map((lane) => ({
      id: lane.id,
      title: lane.title,
      position: lane.order,
    })),
    createdAt: iso(board.createdAt),
    updatedAt: iso(board.updatedAt),
  };
}

function mapCard(card: RepositoryKanbanCard): KanbanCard {
  return {
    id: card.id,
    boardId: card.boardId,
    title: card.title,
    description: card.description,
    lane: card.lane,
    position: card.position,
    priority: card.priority,
    assignee: card.assignee,
    reviewer: card.reviewer,
    inputOwner: card.inputOwner,
    labels: card.labels,
    dueDate: card.dueAt ? iso(card.dueAt) : undefined,
    checklist: card.checklist.map((item) => ({
      id: item.id,
      text: item.title,
      checked: item.done,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
    })),
    comments: card.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      actor: comment.actor,
      createdAt: iso(comment.createdAt),
    })),
    links: card.links,
    attachments: card.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.filename,
      contentType: attachment.contentType,
      sizeBytes: attachment.byteSize,
      gridFsId: attachment.fileId ?? attachment.id,
      archivedAt: attachment.archivedAt ? iso(attachment.archivedAt) : undefined,
      createdAt: iso(attachment.createdAt),
    })),
    watchers: card.watchers,
    customFields: card.customFields,
    readyForCodex: card.readyForCodex,
    import:
      card.import?.sourceCardId !== undefined
        ? {
            source: card.import.source,
            sourceCardId: card.import.sourceCardId,
          }
        : undefined,
    archivedAt: card.archivedAt ? iso(card.archivedAt) : undefined,
    createdAt: iso(card.createdAt),
    updatedAt: iso(card.updatedAt),
    version: card.version,
  };
}

function mapActivity(activity: RepositoryKanbanActivity): KanbanActivity {
  return {
    id: activity.id,
    boardId: activity.boardId,
    cardId: activity.cardId,
    action: activity.action,
    actor: activity.actor,
    summary: activity.summary,
    data: activity.metadata,
    correlationId: activity.correlationId,
    createdAt: iso(activity.createdAt),
  };
}

function statusPayload(
  resolution: KanbanConfigResolution,
  status?: KanbanRepositoryStatus,
): KanbanStatusResult {
  if (!resolution.available) {
    return {
      ok: false,
      available: false,
      enabled: resolution.reason !== "disabled",
      reason: resolution.reason,
      message: resolution.message,
      redactedUri: resolution.redactedUri,
    };
  }
  if (!status?.available) {
    return {
      ok: false,
      available: false,
      enabled: true,
      reason: "unavailable",
      message: status?.message ?? "Kanban MongoDB is unavailable.",
      redactedUri: status?.redactedUri ?? resolution.config.redactedUri,
    };
  }
  return {
    ok: true,
    available: true,
    enabled: true,
    boardId: status.boardSlug,
    redactedUri: status.redactedUri,
  };
}

function sanitizeError(error: unknown, config: ResolvedKanbanConfig): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.split(config.uri).join(config.redactedUri);
}

function unavailable(resolution: KanbanConfigResolution, status?: KanbanRepositoryStatus) {
  return errorShape(
    ErrorCodes.UNAVAILABLE,
    resolution.available
      ? (status?.message ?? "Kanban MongoDB is unavailable.")
      : resolution.message,
    {
      details: resolution.available
        ? { redactedUri: status?.redactedUri ?? resolution.config.redactedUri }
        : { reason: resolution.reason, redactedUri: resolution.redactedUri },
    },
  );
}

function rejectNonDefaultBoard(
  boardId: string | undefined,
  config: ResolvedKanbanConfig,
  respond: RespondFn,
): boolean {
  if (!boardId || boardId === config.board.slug) {
    return false;
  }
  respond(
    false,
    undefined,
    errorShape(ErrorCodes.INVALID_REQUEST, `unknown Kanban board id: ${boardId}`),
  );
  return true;
}

export function createKanbanHandlers(deps: KanbanHandlersDeps = {}): GatewayRequestHandlers {
  const loadConfigFn = deps.loadConfig ?? loadConfig;
  const createRepository = deps.createRepository ?? createKanbanRepository;
  const resolveConfig = () => resolveKanbanConfig({ cfg: loadConfigFn(), env: deps.env });

  async function withRepository<T>(
    respond: RespondFn,
    run: (repo: KanbanMongoRepository, config: ResolvedKanbanConfig) => Promise<T>,
  ): Promise<T | null> {
    const resolution = resolveConfig();
    if (!resolution.available) {
      respond(false, undefined, unavailable(resolution));
      return null;
    }
    const repo = await createRepository(resolution.config);
    try {
      const status = await repo.status();
      if (!status.available) {
        respond(false, undefined, unavailable(resolution, status));
        return null;
      }
      return await run(repo, resolution.config);
    } catch (error) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, sanitizeError(error, resolution.config)),
      );
      return null;
    } finally {
      await repo.close().catch(() => undefined);
    }
  }

  return {
    "kanban.status": async ({ params, respond }) => {
      if (!assertValidParams(params, validateKanbanStatusParams, "kanban.status", respond)) {
        return;
      }
      const resolution = resolveConfig();
      if (!resolution.available) {
        respond(true, statusPayload(resolution), undefined);
        return;
      }
      const repo = await createRepository(resolution.config);
      try {
        respond(true, statusPayload(resolution, await repo.status()), undefined);
      } catch (error) {
        respond(
          true,
          statusPayload(resolution, {
            available: false,
            database: resolution.config.database,
            boardSlug: resolution.config.board.slug,
            redactedUri: resolution.config.redactedUri,
            message: sanitizeError(error, resolution.config),
          }),
          undefined,
        );
      } finally {
        await repo.close().catch(() => undefined);
      }
    },

    "kanban.board.get": async ({ params, respond }) => {
      if (!assertValidParams(params, validateKanbanBoardGetParams, "kanban.board.get", respond)) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const board = await repo.bootstrapDefaultBoard({
          actor: { type: "system", id: "gateway", name: "DAISy Gateway" },
          correlationId: "kanban.board.get",
        });
        respond(true, { board: mapBoard(board) }, undefined);
      });
    },

    "kanban.cards.list": async ({ params, respond }) => {
      if (!assertValidParams(params, validateKanbanCardsListParams, "kanban.cards.list", respond)) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const cards = await repo.listCards({
          boardId: config.board.slug,
          lane: params.lane,
          includeArchived: params.includeArchived,
          readyForCodex: params.readyForCodex,
          assignee: params.assignee,
          limit: params.limit,
          after: params.after
            ? {
                ...params.after,
                createdAt: new Date(params.after.createdAt),
              }
            : undefined,
        });
        respond(true, { cards: cards.map(mapCard) }, undefined);
      });
    },

    "kanban.cards.get": async ({ params, respond }) => {
      if (!assertValidParams(params, validateKanbanCardsGetParams, "kanban.cards.get", respond)) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const card = await repo.getCard(config.board.slug, params.cardId);
        if (!card) {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, "Kanban card not found"),
          );
          return;
        }
        respond(true, { card: mapCard(card) }, undefined);
      });
    },

    "kanban.activity.list": async ({ params, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanActivityListParams,
          "kanban.activity.list",
          respond,
        )
      ) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const activity = await repo.listActivity({
          boardId: config.board.slug,
          cardId: params.cardId,
          limit: params.limit,
          before: params.before ? new Date(params.before) : undefined,
        });
        respond(true, { activity: activity.map(mapActivity) }, undefined);
      });
    },
  };
}

export const kanbanHandlers = createKanbanHandlers();
export const KANBAN_READ_METHOD_NAMES = [...KANBAN_READ_METHODS];
