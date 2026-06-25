import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KanbanConflictError, KanbanService, KanbanValidationError } from "./service.js";
import { loadKanbanStore } from "./store.js";
import { DEFAULT_KANBAN_BOARD_ID, DEFAULT_KANBAN_LANES } from "./types.js";

async function createService() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "daisy-kanban-service-"));
  return {
    dir,
    storePath: path.join(dir, "kanban.json"),
    service: new KanbanService({ storePath: path.join(dir, "kanban.json") }),
  };
}

describe("KanbanService", () => {
  it("creates the default Hughdidit board and lanes idempotently", async () => {
    const { service, storePath } = await createService();

    const first = await service.getBoard();
    const second = await service.getBoard();
    const store = await loadKanbanStore(storePath);

    expect(first.board.id).toBe(DEFAULT_KANBAN_BOARD_ID);
    expect(second.lanes.map((lane) => lane.title)).toEqual(
      DEFAULT_KANBAN_LANES.map((lane) => lane.title),
    );
    expect(Object.values(store.boards)).toHaveLength(1);
    expect(Object.values(store.lanes)).toHaveLength(DEFAULT_KANBAN_LANES.length);
    expect(
      store.activities.filter((activity) => activity.type === "board.initialized"),
    ).toHaveLength(1);
  });

  it("validates card input before persisting", async () => {
    const { service, storePath } = await createService();

    await expect(service.createCard({ title: "   " })).rejects.toBeInstanceOf(
      KanbanValidationError,
    );
    await expect(service.createCard({ title: "Valid", dueDate: "06/25/2026" })).rejects.toThrow(
      "dueDate must use YYYY-MM-DD",
    );

    const store = await loadKanbanStore(storePath);
    expect(Object.values(store.cards)).toHaveLength(0);
  });

  it("creates, updates, and protects cards with expected versions", async () => {
    const { service } = await createService();

    const created = await service.createCard({
      title: "Draft PRD-001 backend",
      description: "Add source of truth",
      assignees: ["daisy", "daisy"],
      labels: ["backend"],
    });
    expect(created.card.version).toBe(1);
    expect(created.card.assignees).toEqual(["daisy"]);

    const updated = await service.updateCard({
      cardId: created.card.id,
      expectedVersion: created.card.version,
      title: "Implement PRD-001 backend",
      dueDate: "2026-06-30",
    });
    expect(updated.card.version).toBe(2);
    expect(updated.card.title).toBe("Implement PRD-001 backend");
    expect(updated.card.dueDate).toBe("2026-06-30");

    await expect(
      service.updateCard({
        cardId: created.card.id,
        expectedVersion: 1,
        title: "Stale write",
      }),
    ).rejects.toBeInstanceOf(KanbanConflictError);
  });

  it("moves cards with deterministic ordering", async () => {
    const { service } = await createService();
    const first = await service.createCard({ title: "First" });
    const second = await service.createCard({ title: "Second" });
    const third = await service.createCard({ title: "Third" });

    await service.moveCard({
      cardId: third.card.id,
      laneId: first.card.laneId,
      index: 0,
      expectedVersion: third.card.version,
    });

    const cards = await service.listCards({ laneId: first.card.laneId });
    expect(cards.map((card) => card.title)).toEqual(["Third", "First", "Second"]);
    expect(cards.map((card) => card.position)).toEqual([1000, 2000, 3000]);
    expect(second.card.laneId).toBe(first.card.laneId);
  });

  it("supports checklist CRUD with activity recording", async () => {
    const { service, storePath } = await createService();
    const created = await service.createCard({ title: "Checklist card" });

    const item = await service.addChecklistItem({
      cardId: created.card.id,
      text: "Write service tests",
    });
    expect(item.checked).toBe(false);

    const updated = await service.updateChecklistItem({
      itemId: item.id,
      expectedVersion: item.version,
      checked: true,
    });
    expect(updated.checked).toBe(true);
    expect(updated.version).toBe(2);

    await expect(
      service.updateChecklistItem({
        itemId: item.id,
        expectedVersion: 1,
        text: "stale",
      }),
    ).rejects.toBeInstanceOf(KanbanConflictError);

    expect(await service.deleteChecklistItem({ itemId: item.id })).toEqual({ deleted: true });
    const detail = await service.getCard(created.card.id);
    expect(detail.checklistItems).toEqual([]);

    const store = await loadKanbanStore(storePath);
    expect(store.activities.map((activity) => activity.type)).toEqual([
      "board.initialized",
      "card.created",
      "checklist.created",
      "checklist.updated",
      "checklist.deleted",
    ]);
  });

  it("adds comments and returns card activity", async () => {
    const { service } = await createService();
    const created = await service.createCard({ title: "Commented card" });

    const added = await service.addComment({
      cardId: created.card.id,
      body: "Ready for review.",
      actor: { id: "kody", displayName: "Kody" },
    });
    expect(added.comment.author.id).toBe("kody");
    expect(added.card.version).toBe(2);

    const comments = await service.listComments(created.card.id);
    expect(comments.map((comment) => comment.body)).toEqual(["Ready for review."]);

    const detail = await service.getCard(created.card.id);
    expect(detail.activities.map((activity) => activity.type)).toEqual([
      "card.created",
      "comment.added",
    ]);
  });
});
