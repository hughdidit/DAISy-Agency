import {
  KanbanConflictError,
  KanbanNotFoundError,
  KanbanService,
  KanbanValidationError,
} from "../../kanban/service.js";
import type { KanbanActor } from "../../kanban/types.js";
import { resolveControlPlaneActor } from "../control-plane-audit.js";
import {
  ErrorCodes,
  errorShape,
  validateKanbanBoardGetParams,
  validateKanbanCardsCreateParams,
  validateKanbanCardsGetParams,
  validateKanbanCardsListParams,
  validateKanbanCardsMoveParams,
  validateKanbanCardsUpdateParams,
  validateKanbanChecklistsAddItemParams,
  validateKanbanChecklistsDeleteItemParams,
  validateKanbanChecklistsUpdateItemParams,
  validateKanbanCommentsAddParams,
  validateKanbanCommentsListParams,
} from "../protocol/index.js";
import type { GatewayClient, GatewayRequestHandlers, RespondFn } from "./types.js";
import { assertValidParams } from "./validation.js";

function actorForClient(client: GatewayClient | null): KanbanActor | undefined {
  if (!client) {
    return undefined;
  }
  const actor = resolveControlPlaneActor(client);
  return {
    id: actor.actor,
    displayName: actor.actor,
  };
}

function respondKanbanError(error: unknown, respond: RespondFn): void {
  if (error instanceof KanbanConflictError) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, error.message, { retryable: true }),
    );
    return;
  }
  if (error instanceof KanbanValidationError || error instanceof KanbanNotFoundError) {
    respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, error.message));
    return;
  }
  respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, "kanban operation failed"));
}

export function createKanbanHandlers(service = new KanbanService()): GatewayRequestHandlers {
  return {
    "kanban.board.get": async ({ params, respond }) => {
      if (!assertValidParams(params, validateKanbanBoardGetParams, "kanban.board.get", respond)) {
        return;
      }
      try {
        respond(true, await service.getBoard(), undefined);
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
    "kanban.cards.list": async ({ params, respond }) => {
      if (!assertValidParams(params, validateKanbanCardsListParams, "kanban.cards.list", respond)) {
        return;
      }
      try {
        respond(true, { cards: await service.listCards(params) }, undefined);
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
    "kanban.cards.get": async ({ params, respond }) => {
      if (!assertValidParams(params, validateKanbanCardsGetParams, "kanban.cards.get", respond)) {
        return;
      }
      try {
        respond(true, await service.getCard(params.cardId), undefined);
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
    "kanban.cards.create": async ({ params, client, respond }) => {
      if (
        !assertValidParams(params, validateKanbanCardsCreateParams, "kanban.cards.create", respond)
      ) {
        return;
      }
      try {
        respond(
          true,
          await service.createCard({ ...params, actor: actorForClient(client) }),
          undefined,
        );
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
    "kanban.cards.update": async ({ params, client, respond }) => {
      if (
        !assertValidParams(params, validateKanbanCardsUpdateParams, "kanban.cards.update", respond)
      ) {
        return;
      }
      try {
        respond(
          true,
          await service.updateCard({ ...params, actor: actorForClient(client) }),
          undefined,
        );
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
    "kanban.cards.move": async ({ params, client, respond }) => {
      if (!assertValidParams(params, validateKanbanCardsMoveParams, "kanban.cards.move", respond)) {
        return;
      }
      try {
        respond(
          true,
          await service.moveCard({ ...params, actor: actorForClient(client) }),
          undefined,
        );
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
    "kanban.checklists.addItem": async ({ params, client, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanChecklistsAddItemParams,
          "kanban.checklists.addItem",
          respond,
        )
      ) {
        return;
      }
      try {
        respond(
          true,
          { item: await service.addChecklistItem({ ...params, actor: actorForClient(client) }) },
          undefined,
        );
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
    "kanban.checklists.updateItem": async ({ params, client, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanChecklistsUpdateItemParams,
          "kanban.checklists.updateItem",
          respond,
        )
      ) {
        return;
      }
      try {
        respond(
          true,
          { item: await service.updateChecklistItem({ ...params, actor: actorForClient(client) }) },
          undefined,
        );
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
    "kanban.checklists.deleteItem": async ({ params, client, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanChecklistsDeleteItemParams,
          "kanban.checklists.deleteItem",
          respond,
        )
      ) {
        return;
      }
      try {
        respond(
          true,
          await service.deleteChecklistItem({ ...params, actor: actorForClient(client) }),
          undefined,
        );
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
    "kanban.comments.list": async ({ params, respond }) => {
      if (
        !assertValidParams(
          params,
          validateKanbanCommentsListParams,
          "kanban.comments.list",
          respond,
        )
      ) {
        return;
      }
      try {
        respond(true, { comments: await service.listComments(params.cardId) }, undefined);
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
    "kanban.comments.add": async ({ params, client, respond }) => {
      if (
        !assertValidParams(params, validateKanbanCommentsAddParams, "kanban.comments.add", respond)
      ) {
        return;
      }
      try {
        respond(
          true,
          await service.addComment({ ...params, actor: actorForClient(client) }),
          undefined,
        );
      } catch (error) {
        respondKanbanError(error, respond);
      }
    },
  };
}

export const kanbanHandlers = createKanbanHandlers();
