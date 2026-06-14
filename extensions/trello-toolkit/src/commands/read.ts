import type { TrelloClient } from "../client.js";
import { evaluatePolicy, resolveSubject } from "../policy.js";
import type { TrelloReadAction } from "../types.js";
import type { InvocationContext, TrelloToolkitConfig } from "../types.js";
import {
  deniedEnvelope,
  exceptionEnvelope,
  nowMs,
  readStringParam,
  resolveCredentials,
  successEnvelope,
} from "./helpers.js";

const READ_ACTIONS = new Set<TrelloReadAction>([
  "list_boards",
  "list_lists",
  "list_cards",
  "get_card",
]);

function readAction(rawParams: Record<string, unknown>): TrelloReadAction {
  const action = readStringParam(rawParams, "action", { required: true });
  if (!READ_ACTIONS.has(action as TrelloReadAction)) {
    throw new Error(`unsupported Trello read action: ${action}`);
  }
  return action as TrelloReadAction;
}

async function resolveScope(
  client: TrelloClient,
  action: TrelloReadAction,
  rawParams: Record<string, unknown>,
) {
  if (action === "list_boards") {
    return {};
  }
  if (action === "list_lists") {
    return { boardId: readStringParam(rawParams, "boardId", { required: true, label: "boardId" }) };
  }
  if (action === "list_cards") {
    const listId = readStringParam(rawParams, "listId", { required: true, label: "listId" });
    const list = await client.getList(listId);
    return { boardId: list.idBoard, listId };
  }
  const cardId = readStringParam(rawParams, "cardId", { required: true, label: "cardId" });
  const card = await client.getCard(cardId);
  return { boardId: card.idBoard, listId: card.idList, card };
}

export async function executeRead(params: {
  config: TrelloToolkitConfig;
  ctx: InvocationContext;
  rawParams: Record<string, unknown>;
}) {
  const startedAt = nowMs();
  let action: TrelloReadAction = "list_boards";
  let routeName: string | undefined;
  try {
    action = readAction(params.rawParams);
    const subject = resolveSubject(params.ctx.agentId);
    const baseDecision = evaluatePolicy({
      config: params.config,
      subject,
      tool: "trello_read",
      action,
    });
    if (!baseDecision.allowed) {
      return deniedEnvelope({ tool: "trello_read", action, decision: baseDecision, startedAt });
    }
    const credentials = resolveCredentials(params.config);
    if (!credentials.ok) {
      throw new Error(`missing Trello credential env: ${credentials.missing.join(", ")}`);
    }
    const scope = await resolveScope(credentials.client, action, params.rawParams);
    const decision = evaluatePolicy({
      config: params.config,
      subject,
      tool: "trello_read",
      action,
      boardId: scope.boardId,
      listId: scope.listId,
    });
    if (!decision.allowed) {
      return deniedEnvelope({ tool: "trello_read", action, decision, startedAt });
    }
    routeName = decision.routeName;
    const data =
      action === "list_boards"
        ? (await credentials.client.listBoards()).filter(
            (board) =>
              decision.route.allowedBoardIds.length === 0 ||
              decision.route.allowedBoardIds.includes(board.id),
          )
        : action === "list_lists"
          ? (
              await credentials.client.listLists(
                readStringParam(params.rawParams, "boardId", { required: true }) ?? "",
              )
            ).filter(
              (list) =>
                decision.route.allowedListIds.length === 0 ||
                decision.route.allowedListIds.includes(list.id),
            )
          : action === "list_cards"
            ? await credentials.client.listCards(
                readStringParam(params.rawParams, "listId", { required: true }) ?? "",
              )
            : scope.card;
    return successEnvelope({ tool: "trello_read", action, data, routeName, startedAt });
  } catch (error) {
    return exceptionEnvelope({ tool: "trello_read", action, routeName, startedAt, error });
  }
}
