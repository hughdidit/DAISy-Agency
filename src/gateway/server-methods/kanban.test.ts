import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KanbanService } from "../../kanban/service.js";
import { createKanbanHandlers } from "./kanban.js";
import type { GatewayRequestHandlerOptions, RespondFn } from "./types.js";

async function createHarness() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "daisy-kanban-gateway-"));
  const service = new KanbanService({ storePath: path.join(dir, "kanban.json") });
  return { service, handlers: createKanbanHandlers(service) };
}

async function invoke(params: {
  method: string;
  params?: Record<string, unknown>;
  handlers: ReturnType<typeof createKanbanHandlers>;
}) {
  let response:
    | {
        ok: boolean;
        payload?: unknown;
        error?: { code: string; message: string; retryable?: boolean };
      }
    | undefined;
  const respond: RespondFn = (ok, payload, error) => {
    response = { ok, payload, error };
  };
  const handler = params.handlers[params.method];
  if (!handler) {
    throw new Error(`missing handler: ${params.method}`);
  }
  await handler({
    req: { id: "test", type: "req", method: params.method, params: params.params ?? {} },
    params: params.params ?? {},
    client: null,
    isWebchatConnect: () => false,
    respond,
    context: {} as GatewayRequestHandlerOptions["context"],
  });
  if (!response) {
    throw new Error("handler did not respond");
  }
  return response;
}

describe("kanban gateway handlers", () => {
  it("validates create params before service execution", async () => {
    const { handlers } = await createHarness();

    const response = await invoke({
      handlers,
      method: "kanban.cards.create",
      params: { title: "Valid", extra: true },
    });

    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("INVALID_REQUEST");
    expect(response.error?.message).toContain("unexpected property 'extra'");
  });

  it("creates, lists, fetches, moves, and comments through RPC handlers", async () => {
    const { handlers } = await createHarness();

    const board = await invoke({ handlers, method: "kanban.board.get" });
    expect(board.ok).toBe(true);
    expect(
      (board.payload as { lanes: Array<{ id: string }> }).lanes.map((lane) => lane.id),
    ).toEqual([
      "backlog",
      "todo",
      "in-progress",
      "blocked",
      "for-review",
      "integration",
      "completed",
    ]);

    const created = await invoke({
      handlers,
      method: "kanban.cards.create",
      params: { title: "RPC card", laneId: "todo" },
    });
    const card = (created.payload as { card: { id: string; version: number } }).card;
    expect(created.ok).toBe(true);

    const staleMove = await invoke({
      handlers,
      method: "kanban.cards.move",
      params: { cardId: card.id, laneId: "in-progress", expectedVersion: card.version + 1 },
    });
    expect(staleMove.ok).toBe(false);
    expect(staleMove.error?.retryable).toBe(true);

    const moved = await invoke({
      handlers,
      method: "kanban.cards.move",
      params: { cardId: card.id, laneId: "in-progress", expectedVersion: card.version },
    });
    const movedCard = (moved.payload as { card: { id: string; version: number; laneId: string } })
      .card;
    expect(movedCard.laneId).toBe("in-progress");

    const checklistItem = await invoke({
      handlers,
      method: "kanban.checklists.addItem",
      params: { cardId: card.id, text: "RPC checklist item" },
    });
    const item = (
      checklistItem.payload as {
        item: { id: string; text: string; checked: boolean; version: number };
      }
    ).item;
    expect(checklistItem.ok).toBe(true);
    expect(item.text).toBe("RPC checklist item");
    expect(item.checked).toBe(false);

    const staleChecklistUpdate = await invoke({
      handlers,
      method: "kanban.checklists.updateItem",
      params: { itemId: item.id, expectedVersion: item.version + 1, checked: true },
    });
    expect(staleChecklistUpdate.ok).toBe(false);
    expect(staleChecklistUpdate.error?.retryable).toBe(true);

    const updatedChecklistItem = await invoke({
      handlers,
      method: "kanban.checklists.updateItem",
      params: {
        itemId: item.id,
        expectedVersion: item.version,
        text: "RPC checklist done",
        checked: true,
      },
    });
    expect(
      (
        updatedChecklistItem.payload as {
          item: { text: string; checked: boolean; version: number };
        }
      ).item,
    ).toMatchObject({ text: "RPC checklist done", checked: true, version: 2 });

    const deletedChecklistItem = await invoke({
      handlers,
      method: "kanban.checklists.deleteItem",
      params: { itemId: item.id },
    });
    expect(deletedChecklistItem.payload).toEqual({ deleted: true });

    const comment = await invoke({
      handlers,
      method: "kanban.comments.add",
      params: { cardId: card.id, body: "RPC comment" },
    });
    expect((comment.payload as { comment: { body: string } }).comment.body).toBe("RPC comment");

    const comments = await invoke({
      handlers,
      method: "kanban.comments.list",
      params: { cardId: card.id },
    });
    expect((comments.payload as { comments: Array<{ body: string }> }).comments).toHaveLength(1);

    const listed = await invoke({
      handlers,
      method: "kanban.cards.list",
      params: { laneId: "in-progress" },
    });
    expect(
      (listed.payload as { cards: Array<{ id: string }> }).cards.map((item) => item.id),
    ).toEqual([card.id]);

    const fetched = await invoke({
      handlers,
      method: "kanban.cards.get",
      params: { cardId: card.id },
    });
    const fetchedPayload = fetched.payload as {
      checklistItems: unknown[];
      activities: Array<{ type: string }>;
    };
    expect(fetchedPayload.checklistItems).toEqual([]);
    expect(fetchedPayload.activities.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        "card.created",
        "card.moved",
        "checklist.created",
        "checklist.updated",
        "checklist.deleted",
        "comment.added",
      ]),
    );
    expect(movedCard.version).toBe(2);
  });
});
