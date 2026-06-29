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
  type KanbanRunTrelloImportResult,
  type KanbanUpdateCardInput,
} from "../../kanban/repository.js";
import { parseTrelloImport } from "../../kanban/trello-import.js";
import type {
  KanbanActivity as RepositoryKanbanActivity,
  KanbanBoard as RepositoryKanbanBoard,
  KanbanCard as RepositoryKanbanCard,
  KanbanActorEnvelope,
  KanbanAuditEnvelope,
  KanbanChecklistItem as RepositoryKanbanChecklistItem,
} from "../../kanban/types.js";
import {
  ErrorCodes,
  errorShape,
  validateKanbanActivityListParams,
  validateKanbanBoardGetParams,
  validateKanbanCardsArchiveParams,
  validateKanbanCardsCommentParams,
  validateKanbanCardsCreateParams,
  validateKanbanCardsGetParams,
  validateKanbanCardsListParams,
  validateKanbanCardsMoveParams,
  validateKanbanCardsUpdateParams,
  validateKanbanCodexCompleteParams,
  validateKanbanCodexHandoffParams,
  validateKanbanCodexPickNextParams,
  validateKanbanImportTrelloPreviewParams,
  validateKanbanImportTrelloRunParams,
  validateKanbanStatusParams,
} from "../protocol/index.js";
import type {
  KanbanActivity,
  KanbanBoard,
  KanbanCard,
  KanbanCardMutationResult,
  KanbanCardsUpdateParams,
  KanbanImportTrelloPreviewResult,
  KanbanStatusResult,
} from "../protocol/schema/types.js";
import type { GatewayClient, GatewayRequestHandlers, RespondFn } from "./types.js";
import { assertValidParams } from "./validation.js";

type KanbanRepositoryFactory = (config: ResolvedKanbanConfig) => Promise<KanbanMongoRepository>;
type UnavailableKanbanRepositoryStatus = Extract<KanbanRepositoryStatus, { available: false }>;

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

const KANBAN_WRITE_METHODS = [
  "kanban.import.trello.preview",
  "kanban.cards.create",
  "kanban.cards.update",
  "kanban.cards.move",
  "kanban.cards.comment",
  "kanban.cards.archive",
  "kanban.import.trello.run",
  "kanban.codex.pickNext",
  "kanban.codex.handoff",
  "kanban.codex.complete",
] as const;

function iso(value: Date): string {
  return value.toISOString();
}

function mapImportReference(
  reference: RepositoryKanbanCard["import"] | undefined,
): NonNullable<RepositoryKanbanCard["import"]> | undefined {
  if (!reference) {
    return undefined;
  }
  const mapped: NonNullable<RepositoryKanbanCard["import"]> = {
    source: reference.source,
  };
  if (reference.sourceCardId) {
    mapped.sourceCardId = reference.sourceCardId;
  }
  if (reference.sourceBoardId) {
    mapped.sourceBoardId = reference.sourceBoardId;
  }
  if (reference.sourceListId) {
    mapped.sourceListId = reference.sourceListId;
  }
  if (reference.sourceUrl) {
    mapped.sourceUrl = reference.sourceUrl;
  }
  if (reference.importRunId) {
    mapped.importRunId = reference.importRunId;
  }
  return mapped;
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
      gridFsId: attachment.fileId,
      import: mapImportReference(attachment.import),
      archivedAt: attachment.archivedAt ? iso(attachment.archivedAt) : undefined,
      createdAt: iso(attachment.createdAt),
    })),
    watchers: card.watchers,
    customFields: card.customFields,
    readyForCodex: card.readyForCodex,
    import: mapImportReference(card.import),
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

function mapMutationResult(result: {
  card: RepositoryKanbanCard;
  activity: RepositoryKanbanActivity;
}): KanbanCardMutationResult {
  return {
    card: mapCard(result.card),
    activity: mapActivity(result.activity),
  };
}

function mapImportRunResult(result: KanbanRunTrelloImportResult) {
  return {
    importRunId: result.importRunId,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    activity: mapActivity(result.activity),
  };
}

function mapImportPreviewResult(params: {
  importId: string;
  cards: ReturnType<typeof parseTrelloImport>["cards"];
  warnings: string[];
}): KanbanImportTrelloPreviewResult {
  return {
    importId: params.importId,
    cards: params.cards.map((card) => {
      const checklist = Array.isArray(card.checklist) ? card.checklist : [];
      const comments = Array.isArray(card.comments) ? card.comments : [];
      const attachments = Array.isArray(card.attachments) ? card.attachments : [];
      const watchers = Array.isArray(card.watchers) ? card.watchers : [];
      return {
        sourceCardId: card.sourceCardId,
        title: card.title,
        lane: card.lane,
        priority: card.priority,
        labels: card.labels,
        dueDate: card.dueAt ? iso(card.dueAt) : undefined,
        sourceUrl: card.sourceUrl,
        checklistCount: checklist.length,
        commentCount: comments.length,
        attachmentCount: attachments.length,
        watcherCount: watchers.length,
        warnings: card.warnings,
      };
    }),
    warnings: params.warnings,
  };
}

type GatewayChecklistItem = NonNullable<KanbanCardsUpdateParams["updates"]["checklist"]>[number];

function mapChecklistItem(
  item: GatewayChecklistItem,
  position: number,
): RepositoryKanbanChecklistItem {
  const now = new Date();
  return {
    id: item.id,
    title: item.text,
    done: item.checked,
    position,
    createdAt: item.createdAt ? new Date(item.createdAt) : now,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : now,
  };
}

function mapUpdateParams(
  updates: KanbanCardsUpdateParams["updates"],
): KanbanUpdateCardInput["updates"] {
  return {
    title: updates.title,
    description: updates.description,
    priority: updates.priority,
    assignee: updates.assignee,
    reviewer: updates.reviewer,
    inputOwner: updates.inputOwner,
    labels: updates.labels,
    dueAt:
      updates.dueDate === null ? null : updates.dueDate ? new Date(updates.dueDate) : undefined,
    checklist: updates.checklist?.map((item, index) => mapChecklistItem(item, index)),
    links: updates.links,
    watchers: updates.watchers,
    customFields: updates.customFields,
    readyForCodex: updates.readyForCodex,
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
  if (!status || !status.available) {
    const unavailableStatus = status?.available === false ? status : undefined;
    return {
      ok: false,
      available: false,
      enabled: true,
      reason: "unavailable",
      message: unavailableStatus?.message ?? "Kanban MongoDB is unavailable.",
      redactedUri: unavailableStatus?.redactedUri ?? resolution.config.redactedUri,
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

function unavailable(
  resolution: KanbanConfigResolution,
  status?: UnavailableKanbanRepositoryStatus,
) {
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

function actorFromClient(
  client: GatewayClient | null,
  fallbackId: string,
  forceAgent = false,
): KanbanActorEnvelope {
  const clientInfo = client?.connect?.client;
  const id =
    client?.connect?.device?.id ??
    clientInfo?.instanceId ??
    clientInfo?.id ??
    client?.connId ??
    fallbackId;
  const name = clientInfo?.displayName;
  if (forceAgent) {
    return name ? { type: "agent", id, name } : { type: "agent", id };
  }
  const mode = clientInfo?.mode;
  const type = mode === "ui" || mode === "webchat" ? "human" : "api";
  return name ? { type, id, name } : { type, id };
}

function auditFromRequest(
  client: GatewayClient | null,
  requestId: string,
  forceAgent = false,
): KanbanAuditEnvelope {
  return {
    actor: actorFromClient(client, "kanban-gateway", forceAgent),
    correlationId: requestId,
  };
}

function codexAuditFromRequest(
  client: GatewayClient | null,
  requestId: string,
  params: { agentId?: string; agentName?: string },
): KanbanAuditEnvelope {
  if (params.agentId) {
    return {
      actor: params.agentName
        ? { type: "agent", id: params.agentId, name: params.agentName }
        : { type: "agent", id: params.agentId },
      correlationId: requestId,
    };
  }
  return auditFromRequest(client, requestId, true);
}

function notFoundOrConflict(respond: RespondFn): void {
  respond(
    false,
    undefined,
    errorShape(ErrorCodes.INVALID_REQUEST, "Kanban card not found or version conflict"),
  );
}

function cardNotFound(respond: RespondFn): void {
  respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "Kanban card not found"));
}

function requireNonBlankParam(value: string, fieldName: string, respond: RespondFn): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, `${fieldName} must not be blank`),
    );
    return null;
  }
  return trimmed;
}

function invalidRequest(message: string, respond: RespondFn): void {
  respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, message));
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
    let repo: KanbanMongoRepository | null = null;
    try {
      repo = await createRepository(resolution.config);
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
      await repo?.close().catch(() => undefined);
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
      let repo: KanbanMongoRepository | null = null;
      try {
        repo = await createRepository(resolution.config);
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
        await repo?.close().catch(() => undefined);
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
        const board = await repo.getDefaultBoard();
        if (!board) {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.UNAVAILABLE, "Kanban board is not initialized.", {
              details: { boardId: config.board.slug },
            }),
          );
          return;
        }
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
          beforeId: params.beforeId,
        });
        respond(true, { activity: activity.map(mapActivity) }, undefined);
      });
    },

    "kanban.import.trello.preview": async ({ params, req, client, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanImportTrelloPreviewParams,
          "kanban.import.trello.preview",
          respond,
        )
      ) {
        return;
      }
      let parsed: ReturnType<typeof parseTrelloImport>;
      try {
        parsed = parseTrelloImport({ format: params.format, content: params.content });
      } catch (error) {
        invalidRequest(error instanceof Error ? error.message : String(error), respond);
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const preview = await repo.recordTrelloImportPreview(
          {
            boardId: config.board.slug,
            sourceHash: parsed.sourceHash,
            format: params.format,
            cards: parsed.cards,
            warnings: parsed.warnings,
          },
          auditFromRequest(client, req.id),
        );
        respond(
          true,
          mapImportPreviewResult({
            importId: preview._id,
            cards: preview.cards,
            warnings: preview.warnings,
          }),
          undefined,
        );
      });
    },

    "kanban.cards.create": async ({ params, req, client, respond }) => {
      if (
        !assertValidParams(params, validateKanbanCardsCreateParams, "kanban.cards.create", respond)
      ) {
        return;
      }
      const title = requireNonBlankParam(params.title, "Kanban card title", respond);
      if (!title) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const result = await repo.createCard(
          {
            boardId: config.board.slug,
            title,
            description: params.description,
            lane: params.lane,
            position: params.position,
            priority: params.priority,
            assignee: params.assignee,
            reviewer: params.reviewer,
            inputOwner: params.inputOwner,
            labels: params.labels,
            dueAt: params.dueDate ? new Date(params.dueDate) : undefined,
            links: params.links,
            watchers: params.watchers,
            customFields: params.customFields,
            readyForCodex: params.readyForCodex,
          },
          auditFromRequest(client, req.id),
        );
        respond(true, mapMutationResult(result), undefined);
      });
    },

    "kanban.cards.update": async ({ params, req, client, respond }) => {
      if (
        !assertValidParams(params, validateKanbanCardsUpdateParams, "kanban.cards.update", respond)
      ) {
        return;
      }
      let title: string | undefined;
      if (params.updates.title !== undefined) {
        const trimmedTitle = requireNonBlankParam(
          params.updates.title,
          "Kanban card title",
          respond,
        );
        if (!trimmedTitle) {
          return;
        }
        title = trimmedTitle;
      }
      const updates = mapUpdateParams({ ...params.updates, title });
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const result = await repo.updateCard(
          {
            boardId: config.board.slug,
            cardId: params.cardId,
            expectedVersion: params.expectedVersion,
            updates,
          },
          auditFromRequest(client, req.id),
        );
        if (!result) {
          notFoundOrConflict(respond);
          return;
        }
        respond(true, mapMutationResult(result), undefined);
      });
    },

    "kanban.cards.move": async ({ params, req, client, respond }) => {
      if (!assertValidParams(params, validateKanbanCardsMoveParams, "kanban.cards.move", respond)) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const result = await repo.moveCard(
          {
            boardId: config.board.slug,
            cardId: params.cardId,
            expectedVersion: params.expectedVersion,
            lane: params.lane,
            position: params.position,
          },
          auditFromRequest(client, req.id),
        );
        if (!result) {
          notFoundOrConflict(respond);
          return;
        }
        respond(true, mapMutationResult(result), undefined);
      });
    },

    "kanban.cards.comment": async ({ params, req, client, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanCardsCommentParams,
          "kanban.cards.comment",
          respond,
        )
      ) {
        return;
      }
      const body = requireNonBlankParam(params.body, "Kanban comment body", respond);
      if (!body) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const result = await repo.commentCard(
          {
            boardId: config.board.slug,
            cardId: params.cardId,
            body,
          },
          auditFromRequest(client, req.id),
        );
        if (!result) {
          cardNotFound(respond);
          return;
        }
        respond(true, mapMutationResult(result), undefined);
      });
    },

    "kanban.cards.archive": async ({ params, req, client, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanCardsArchiveParams,
          "kanban.cards.archive",
          respond,
        )
      ) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const result = await repo.archiveCard(
          {
            boardId: config.board.slug,
            cardId: params.cardId,
            expectedVersion: params.expectedVersion,
          },
          auditFromRequest(client, req.id),
        );
        if (!result) {
          notFoundOrConflict(respond);
          return;
        }
        respond(true, mapMutationResult(result), undefined);
      });
    },

    "kanban.import.trello.run": async ({ params, req, client, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanImportTrelloRunParams,
          "kanban.import.trello.run",
          respond,
        )
      ) {
        return;
      }
      let parsed:
        | {
            sourceHash: string;
            format: "json" | "csv";
            cards: ReturnType<typeof parseTrelloImport>["cards"];
            warnings: string[];
          }
        | undefined;
      if ("format" in params) {
        try {
          const direct = parseTrelloImport({ format: params.format, content: params.content });
          parsed = { ...direct, format: params.format };
        } catch (error) {
          invalidRequest(error instanceof Error ? error.message : String(error), respond);
          return;
        }
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        let importId: string | undefined;
        let cards = parsed?.cards;
        if ("importId" in params) {
          const preview = await repo.getTrelloImportPreview(params.importId, config.board.slug);
          if (!preview) {
            invalidRequest(`unknown Trello import preview id: ${params.importId}`, respond);
            return;
          }
          importId = preview._id;
          cards = preview.cards;
        } else if ("format" in params && parsed) {
          const preview = await repo.recordTrelloImportPreview(
            {
              boardId: config.board.slug,
              sourceHash: parsed.sourceHash,
              format: parsed.format,
              cards: parsed.cards,
              warnings: parsed.warnings,
            },
            auditFromRequest(client, req.id),
          );
          importId = preview._id;
          cards = parsed.cards;
        }
        if (!importId || !cards) {
          invalidRequest("Trello import run requires a preview id or import content", respond);
          return;
        }
        const result = await repo.runTrelloImport(
          {
            boardId: config.board.slug,
            importId,
            cards,
          },
          auditFromRequest(client, req.id),
        );
        respond(true, mapImportRunResult(result), undefined);
      });
    },

    "kanban.codex.pickNext": async ({ params, req, client, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanCodexPickNextParams,
          "kanban.codex.pickNext",
          respond,
        )
      ) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const result = await repo.pickNextCodexCard(
          { boardId: config.board.slug },
          codexAuditFromRequest(client, req.id, params),
        );
        respond(true, result ? mapMutationResult(result) : { card: null }, undefined);
      });
    },

    "kanban.codex.handoff": async ({ params, req, client, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanCodexHandoffParams,
          "kanban.codex.handoff",
          respond,
        )
      ) {
        return;
      }
      const summary = requireNonBlankParam(params.summary, "Kanban handoff summary", respond);
      if (!summary) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const result = await repo.handoffCodexCard(
          {
            boardId: config.board.slug,
            cardId: params.cardId,
            expectedVersion: params.expectedVersion,
            summary,
            reviewer: params.reviewer,
            inputOwner: params.inputOwner,
          },
          auditFromRequest(client, req.id, true),
        );
        if (!result) {
          notFoundOrConflict(respond);
          return;
        }
        respond(true, mapMutationResult(result), undefined);
      });
    },

    "kanban.codex.complete": async ({ params, req, client, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanCodexCompleteParams,
          "kanban.codex.complete",
          respond,
        )
      ) {
        return;
      }
      const summary = requireNonBlankParam(params.summary, "Kanban completion summary", respond);
      if (!summary) {
        return;
      }
      await withRepository(respond, async (repo, config) => {
        if (rejectNonDefaultBoard(params.boardId, config, respond)) {
          return;
        }
        const result = await repo.completeCodexCard(
          {
            boardId: config.board.slug,
            cardId: params.cardId,
            expectedVersion: params.expectedVersion,
            summary,
          },
          auditFromRequest(client, req.id, true),
        );
        if (!result) {
          notFoundOrConflict(respond);
          return;
        }
        respond(true, mapMutationResult(result), undefined);
      });
    },
  };
}

export const kanbanHandlers = createKanbanHandlers();
export const KANBAN_READ_METHOD_NAMES = [...KANBAN_READ_METHODS];
export const KANBAN_WRITE_METHOD_NAMES = [...KANBAN_WRITE_METHODS];
export const KANBAN_METHOD_NAMES = [...KANBAN_READ_METHODS, ...KANBAN_WRITE_METHODS];
