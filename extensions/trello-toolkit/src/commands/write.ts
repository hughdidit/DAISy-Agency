import type { TrelloClient } from "../client.js";
import { evaluatePolicy, resolveSubject } from "../policy.js";
import type { TrelloWriteAction } from "../types.js";
import type { InvocationContext, TrelloToolkitConfig } from "../types.js";
import {
  deniedEnvelope,
  exceptionEnvelope,
  nowMs,
  readBooleanParam,
  readStringParam,
  resolveCredentials,
  successEnvelope,
} from "./helpers.js";

const WRITE_ACTIONS = new Set<TrelloWriteAction>([
  "create_card",
  "move_card",
  "add_comment",
  "archive_card",
]);

function readAction(rawParams: Record<string, unknown>): TrelloWriteAction {
  const action = readStringParam(rawParams, "action", { required: true });
  if (!WRITE_ACTIONS.has(action as TrelloWriteAction)) {
    throw new Error(`unsupported Trello write action: ${action}`);
  }
  return action as TrelloWriteAction;
}

async function assertScopeAllowed(params: {
  config: TrelloToolkitConfig;
  subject: string;
  client: TrelloClient;
  action: TrelloWriteAction;
  rawParams: Record<string, unknown>;
}) {
  if (params.action === "create_card") {
    const listId = readStringParam(params.rawParams, "listId", { required: true, label: "listId" });
    const list = await params.client.getList(listId);
    return evaluatePolicy({
      config: params.config,
      subject: params.subject,
      tool: "trello_write",
      action: params.action,
      isWrite: true,
      confirm: readBooleanParam(params.rawParams, "confirm"),
      boardId: list.idBoard,
      listId,
    });
  }
  const cardId = readStringParam(params.rawParams, "cardId", { required: true, label: "cardId" });
  const card = await params.client.getCard(cardId);
  const cardDecision = evaluatePolicy({
    config: params.config,
    subject: params.subject,
    tool: "trello_write",
    action: params.action,
    isWrite: true,
    confirm: readBooleanParam(params.rawParams, "confirm"),
    boardId: card.idBoard,
    listId: card.idList,
  });
  if (!cardDecision.allowed || params.action !== "move_card") {
    return cardDecision;
  }
  const targetListId = readStringParam(params.rawParams, "targetListId", {
    required: true,
    label: "targetListId",
  });
  const targetList = await params.client.getList(targetListId);
  return evaluatePolicy({
    config: params.config,
    subject: params.subject,
    tool: "trello_write",
    action: params.action,
    isWrite: true,
    confirm: true,
    boardId: targetList.idBoard,
    listId: targetListId,
  });
}

export async function executeWrite(params: {
  config: TrelloToolkitConfig;
  ctx: InvocationContext;
  rawParams: Record<string, unknown>;
}) {
  const startedAt = nowMs();
  let action: TrelloWriteAction = "create_card";
  let routeName: string | undefined;
  try {
    action = readAction(params.rawParams);
    const subject = resolveSubject(params.ctx.agentId);
    const baseDecision = evaluatePolicy({
      config: params.config,
      subject,
      tool: "trello_write",
      action,
      isWrite: true,
      confirm: readBooleanParam(params.rawParams, "confirm"),
    });
    if (!baseDecision.allowed) {
      return deniedEnvelope({ tool: "trello_write", action, decision: baseDecision, startedAt });
    }
    const credentials = resolveCredentials(params.config);
    if (!credentials.ok) {
      throw new Error(`missing Trello credential env: ${credentials.missing.join(", ")}`);
    }
    const decision = await assertScopeAllowed({
      config: params.config,
      subject,
      client: credentials.client,
      action,
      rawParams: params.rawParams,
    });
    if (!decision.allowed) {
      return deniedEnvelope({ tool: "trello_write", action, decision, startedAt });
    }
    routeName = decision.routeName;
    const data =
      action === "create_card"
        ? await credentials.client.createCard({
            listId: readStringParam(params.rawParams, "listId", { required: true }) ?? "",
            name: readStringParam(params.rawParams, "name", { required: true }) ?? "",
            desc: readStringParam(params.rawParams, "desc"),
          })
        : action === "move_card"
          ? await credentials.client.moveCard({
              cardId: readStringParam(params.rawParams, "cardId", { required: true }) ?? "",
              targetListId:
                readStringParam(params.rawParams, "targetListId", { required: true }) ?? "",
            })
          : action === "add_comment"
            ? await credentials.client.addComment({
                cardId: readStringParam(params.rawParams, "cardId", { required: true }) ?? "",
                text: readStringParam(params.rawParams, "text", { required: true }) ?? "",
              })
            : await credentials.client.archiveCard({
                cardId: readStringParam(params.rawParams, "cardId", { required: true }) ?? "",
              });
    return successEnvelope({ tool: "trello_write", action, data, routeName, startedAt });
  } catch (error) {
    return exceptionEnvelope({ tool: "trello_write", action, routeName, startedAt, error });
  }
}
