import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  DEFAULT_KANBAN_STORE_PATH,
  loadKanbanStore,
  saveKanbanStore,
  updateKanbanStore,
} from "./store.js";
import {
  DEFAULT_KANBAN_BOARD_ID,
  DEFAULT_KANBAN_BOARD_NAME,
  DEFAULT_KANBAN_LANES,
  type KanbanActivity,
  type KanbanActor,
  type KanbanBoardSnapshot,
  type KanbanCard,
  type KanbanCardDetail,
  type KanbanChecklistItem,
  type KanbanComment,
  type KanbanStoreFile,
} from "./types.js";

export class KanbanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KanbanValidationError";
  }
}

export class KanbanConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KanbanConflictError";
  }
}

export class KanbanNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KanbanNotFoundError";
  }
}

type CreateCardInput = {
  title: string;
  description?: string;
  laneId?: string;
  assignees?: string[];
  labels?: string[];
  dueDate?: string;
  priority?: KanbanCard["priority"];
  actor?: KanbanActor;
};

type UpdateCardInput = {
  cardId: string;
  expectedVersion: number;
  title?: string;
  description?: string | null;
  assignees?: string[];
  labels?: string[];
  dueDate?: string | null;
  priority?: KanbanCard["priority"] | null;
  actor?: KanbanActor;
};

type MoveCardInput = {
  cardId: string;
  laneId: string;
  index?: number;
  expectedVersion: number;
  actor?: KanbanActor;
};

type ChecklistInput = {
  cardId: string;
  text: string;
  checked?: boolean;
  actor?: KanbanActor;
};

type ChecklistPatch = {
  itemId: string;
  expectedVersion: number;
  text?: string;
  checked?: boolean;
  actor?: KanbanActor;
};

type CommentInput = {
  cardId: string;
  body: string;
  actor?: KanbanActor;
};

const POSITION_STEP = 1_000;
const DEFAULT_ACTOR: KanbanActor = { id: "daisy", displayName: "DAISy" };

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: unknown, field: string, opts: { maxLength: number }): string {
  if (typeof value !== "string") {
    throw new KanbanValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new KanbanValidationError(`${field} is required`);
  }
  if (trimmed.length > opts.maxLength) {
    throw new KanbanValidationError(`${field} must be ${opts.maxLength} characters or fewer`);
  }
  return trimmed;
}

function normalizeOptionalText(
  value: string | null | undefined,
  field: string,
  opts: { maxLength: number },
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > opts.maxLength) {
    throw new KanbanValidationError(`${field} must be ${opts.maxLength} characters or fewer`);
  }
  return trimmed || undefined;
}

function normalizeStringList(values: string[] | undefined, field: string): string[] {
  if (!values) {
    return [];
  }
  const normalized = values.map((value) => normalizeText(value, field, { maxLength: 100 }));
  return Array.from(new Set(normalized));
}

function normalizeActor(actor: KanbanActor | undefined): KanbanActor {
  if (!actor) {
    return DEFAULT_ACTOR;
  }
  const id = normalizeText(actor.id, "actor.id", { maxLength: 120 });
  const displayName = normalizeOptionalText(actor.displayName, "actor.displayName", {
    maxLength: 200,
  });
  return displayName ? { id, displayName } : { id };
}

function assertExpectedVersion(current: number, expected: number): void {
  if (!Number.isInteger(expected) || expected < 1) {
    throw new KanbanValidationError("expectedVersion must be a positive integer");
  }
  if (current !== expected) {
    throw new KanbanConflictError("card changed since last read; reload and retry");
  }
}

function sortByPosition<T extends { position: number; createdAt: string; id: string }>(
  items: T[],
): T[] {
  return items.toSorted(
    (a, b) =>
      a.position - b.position ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}

function nextPosition(items: Array<{ position: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.position), 0) + POSITION_STEP;
}

function clampInsertIndex(index: number | undefined, length: number): number {
  if (index === undefined) {
    return length;
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new KanbanValidationError("index must be a non-negative integer");
  }
  return Math.min(index, length);
}

export class KanbanService {
  readonly storePath: string;

  constructor(opts: { storePath?: string } = {}) {
    this.storePath = path.resolve(opts.storePath ?? DEFAULT_KANBAN_STORE_PATH);
  }

  async getBoard(): Promise<KanbanBoardSnapshot> {
    return await updateKanbanStore(this.storePath, (store) => {
      ensureDefaultBoard(store);
      return boardSnapshot(store);
    });
  }

  async listCards(
    opts: { laneId?: string; includeArchived?: boolean } = {},
  ): Promise<KanbanCard[]> {
    await this.ensureDefaultBoard();
    const store = await loadKanbanStore(this.storePath);
    if (opts.laneId && !store.lanes[opts.laneId]) {
      throw new KanbanNotFoundError(`lane not found: ${opts.laneId}`);
    }
    return sortByPosition(
      Object.values(store.cards).filter((card) => {
        if (card.boardId !== DEFAULT_KANBAN_BOARD_ID) {
          return false;
        }
        if (!opts.includeArchived && card.archivedAt) {
          return false;
        }
        return opts.laneId ? card.laneId === opts.laneId : true;
      }),
    );
  }

  async getCard(cardId: string): Promise<KanbanCardDetail> {
    await this.ensureDefaultBoard();
    const store = await loadKanbanStore(this.storePath);
    return cardDetail(store, requireCard(store, cardId));
  }

  async createCard(input: CreateCardInput): Promise<KanbanCardDetail> {
    return await updateKanbanStore(this.storePath, (store) => {
      ensureDefaultBoard(store);
      const actor = normalizeActor(input.actor);
      const laneId = input.laneId ?? DEFAULT_KANBAN_LANES[0].id;
      requireLane(store, laneId);
      const createdAt = nowIso();
      const card: KanbanCard = {
        id: randomUUID(),
        boardId: DEFAULT_KANBAN_BOARD_ID,
        laneId,
        title: normalizeText(input.title, "title", { maxLength: 200 }),
        description: normalizeOptionalText(input.description, "description", { maxLength: 10_000 }),
        position: nextPosition(cardsInLane(store, laneId)),
        assignees: normalizeStringList(input.assignees, "assignees"),
        labels: normalizeStringList(input.labels, "labels"),
        dueDate: normalizeDueDate(input.dueDate),
        priority: input.priority ?? "normal",
        checklistItemIds: [],
        credentialMetadataIds: [],
        createdAt,
        updatedAt: createdAt,
        createdBy: actor,
        updatedBy: actor,
        version: 1,
      };
      store.cards[card.id] = card;
      recordActivity(store, {
        type: "card.created",
        actor,
        cardId: card.id,
        summary: `Created card "${card.title}"`,
      });
      return cardDetail(store, card);
    });
  }

  async updateCard(input: UpdateCardInput): Promise<KanbanCardDetail> {
    return await updateKanbanStore(this.storePath, (store) => {
      ensureDefaultBoard(store);
      const card = requireCard(store, input.cardId);
      assertExpectedVersion(card.version, input.expectedVersion);
      const actor = normalizeActor(input.actor);
      const patch: Partial<KanbanCard> = {};
      if (input.title !== undefined) {
        patch.title = normalizeText(input.title, "title", { maxLength: 200 });
      }
      if (input.description !== undefined) {
        patch.description = normalizeOptionalText(input.description, "description", {
          maxLength: 10_000,
        });
      }
      if (input.assignees !== undefined) {
        patch.assignees = normalizeStringList(input.assignees, "assignees");
      }
      if (input.labels !== undefined) {
        patch.labels = normalizeStringList(input.labels, "labels");
      }
      if (input.dueDate !== undefined) {
        patch.dueDate = normalizeDueDate(input.dueDate);
      }
      if (input.priority !== undefined) {
        patch.priority = input.priority ?? undefined;
      }
      const next = {
        ...card,
        ...patch,
        updatedAt: nowIso(),
        updatedBy: actor,
        version: card.version + 1,
      };
      store.cards[card.id] = next;
      recordActivity(store, {
        type: "card.updated",
        actor,
        cardId: card.id,
        summary: `Updated card "${next.title}"`,
      });
      return cardDetail(store, next);
    });
  }

  async moveCard(input: MoveCardInput): Promise<KanbanCardDetail> {
    return await updateKanbanStore(this.storePath, (store) => {
      ensureDefaultBoard(store);
      const card = requireCard(store, input.cardId);
      const targetLane = requireLane(store, input.laneId);
      assertExpectedVersion(card.version, input.expectedVersion);
      const actor = normalizeActor(input.actor);
      const sourceLaneId = card.laneId;
      const targetCards = sortByPosition(
        cardsInLane(store, input.laneId).filter((candidate) => candidate.id !== card.id),
      );
      const insertAt = clampInsertIndex(input.index, targetCards.length);
      const moved = {
        ...card,
        laneId: input.laneId,
        updatedAt: nowIso(),
        updatedBy: actor,
        version: card.version + 1,
      };
      targetCards.splice(insertAt, 0, moved);
      rewritePositions(store, targetCards);
      if (sourceLaneId !== input.laneId) {
        rewritePositions(store, sortByPosition(cardsInLane(store, sourceLaneId)));
      }
      recordActivity(store, {
        type: "card.moved",
        actor,
        cardId: card.id,
        summary: `Moved card "${card.title}" to ${targetLane.title}`,
        data: { fromLaneId: sourceLaneId, toLaneId: input.laneId, index: insertAt },
      });
      return cardDetail(store, store.cards[card.id] ?? moved);
    });
  }

  async addChecklistItem(input: ChecklistInput): Promise<KanbanChecklistItem> {
    return await updateKanbanStore(this.storePath, (store) => {
      ensureDefaultBoard(store);
      const card = requireCard(store, input.cardId);
      const actor = normalizeActor(input.actor);
      const createdAt = nowIso();
      const item: KanbanChecklistItem = {
        id: randomUUID(),
        cardId: card.id,
        text: normalizeText(input.text, "text", { maxLength: 500 }),
        checked: input.checked ?? false,
        position: nextPosition(
          card.checklistItemIds
            .map((id) => store.checklistItems[id])
            .filter((item): item is KanbanChecklistItem => Boolean(item)),
        ),
        createdAt,
        updatedAt: createdAt,
        version: 1,
      };
      store.checklistItems[item.id] = item;
      store.cards[card.id] = {
        ...card,
        checklistItemIds: [...card.checklistItemIds, item.id],
        updatedAt: createdAt,
        updatedBy: actor,
        version: card.version + 1,
      };
      recordActivity(store, {
        type: "checklist.created",
        actor,
        cardId: card.id,
        summary: `Added checklist item to "${card.title}"`,
      });
      return item;
    });
  }

  async updateChecklistItem(input: ChecklistPatch): Promise<KanbanChecklistItem> {
    return await updateKanbanStore(this.storePath, (store) => {
      ensureDefaultBoard(store);
      const item = store.checklistItems[input.itemId];
      if (!item) {
        throw new KanbanNotFoundError(`checklist item not found: ${input.itemId}`);
      }
      const card = requireCard(store, item.cardId);
      assertExpectedVersion(item.version, input.expectedVersion);
      const actor = normalizeActor(input.actor);
      const updated: KanbanChecklistItem = {
        ...item,
        text:
          input.text === undefined
            ? item.text
            : normalizeText(input.text, "text", { maxLength: 500 }),
        checked: input.checked ?? item.checked,
        updatedAt: nowIso(),
        version: item.version + 1,
      };
      store.checklistItems[item.id] = updated;
      store.cards[card.id] = {
        ...card,
        updatedAt: updated.updatedAt,
        updatedBy: actor,
        version: card.version + 1,
      };
      recordActivity(store, {
        type: "checklist.updated",
        actor,
        cardId: card.id,
        summary: `Updated checklist item on "${card.title}"`,
      });
      return updated;
    });
  }

  async deleteChecklistItem(input: {
    itemId: string;
    actor?: KanbanActor;
  }): Promise<{ deleted: boolean }> {
    return await updateKanbanStore(this.storePath, (store) => {
      ensureDefaultBoard(store);
      const item = store.checklistItems[input.itemId];
      if (!item) {
        return { deleted: false };
      }
      const card = requireCard(store, item.cardId);
      const actor = normalizeActor(input.actor);
      delete store.checklistItems[item.id];
      store.cards[card.id] = {
        ...card,
        checklistItemIds: card.checklistItemIds.filter((id) => id !== item.id),
        updatedAt: nowIso(),
        updatedBy: actor,
        version: card.version + 1,
      };
      recordActivity(store, {
        type: "checklist.deleted",
        actor,
        cardId: card.id,
        summary: `Deleted checklist item from "${card.title}"`,
      });
      return { deleted: true };
    });
  }

  async listComments(cardId: string): Promise<KanbanComment[]> {
    await this.ensureDefaultBoard();
    const store = await loadKanbanStore(this.storePath);
    requireCard(store, cardId);
    return commentsForCard(store, cardId);
  }

  async addComment(input: CommentInput): Promise<{ comment: KanbanComment; card: KanbanCard }> {
    return await updateKanbanStore(this.storePath, (store) => {
      ensureDefaultBoard(store);
      const card = requireCard(store, input.cardId);
      const actor = normalizeActor(input.actor);
      const createdAt = nowIso();
      const comment: KanbanComment = {
        id: randomUUID(),
        cardId: card.id,
        body: normalizeText(input.body, "body", { maxLength: 10_000 }),
        author: actor,
        createdAt,
        updatedAt: createdAt,
        version: 1,
      };
      store.comments[comment.id] = comment;
      const updatedCard = {
        ...card,
        updatedAt: createdAt,
        updatedBy: actor,
        version: card.version + 1,
      };
      store.cards[card.id] = updatedCard;
      recordActivity(store, {
        type: "comment.added",
        actor,
        cardId: card.id,
        summary: `Added comment to "${card.title}"`,
      });
      return { comment, card: updatedCard };
    });
  }

  private async ensureDefaultBoard(): Promise<void> {
    await updateKanbanStore(this.storePath, (store) => {
      ensureDefaultBoard(store);
    });
  }
}

export function ensureDefaultBoard(store: KanbanStoreFile): boolean {
  let changed = false;
  const createdAt = nowIso();
  if (!store.boards[DEFAULT_KANBAN_BOARD_ID]) {
    store.boards[DEFAULT_KANBAN_BOARD_ID] = {
      id: DEFAULT_KANBAN_BOARD_ID,
      name: DEFAULT_KANBAN_BOARD_NAME,
      ownerAgentId: "daisy",
      stakeholder: "Hugh Chapman",
      createdAt,
      updatedAt: createdAt,
      version: 1,
      metadata: { team: "Hughdidit/DAISy" },
    };
    recordActivity(store, {
      type: "board.initialized",
      actor: DEFAULT_ACTOR,
      summary: `Initialized ${DEFAULT_KANBAN_BOARD_NAME}`,
    });
    changed = true;
  }
  for (const [index, laneDef] of DEFAULT_KANBAN_LANES.entries()) {
    if (store.lanes[laneDef.id]) {
      continue;
    }
    store.lanes[laneDef.id] = {
      id: laneDef.id,
      boardId: DEFAULT_KANBAN_BOARD_ID,
      title: laneDef.title,
      position: (index + 1) * POSITION_STEP,
      createdAt,
      updatedAt: createdAt,
      version: 1,
    };
    changed = true;
  }
  return changed;
}

export async function initializeKanbanStore(storePath: string): Promise<void> {
  const store = await loadKanbanStore(storePath);
  ensureDefaultBoard(store);
  await saveKanbanStore(store, storePath);
}

function boardSnapshot(store: KanbanStoreFile): KanbanBoardSnapshot {
  const board = store.boards[DEFAULT_KANBAN_BOARD_ID];
  if (!board) {
    throw new KanbanNotFoundError("default kanban board not found");
  }
  return {
    board,
    lanes: sortByPosition(
      Object.values(store.lanes).filter((lane) => lane.boardId === DEFAULT_KANBAN_BOARD_ID),
    ),
    cards: sortByPosition(
      Object.values(store.cards).filter(
        (card) => card.boardId === DEFAULT_KANBAN_BOARD_ID && !card.archivedAt,
      ),
    ),
  };
}

function requireCard(store: KanbanStoreFile, cardId: string): KanbanCard {
  const id = normalizeText(cardId, "cardId", { maxLength: 120 });
  const card = store.cards[id];
  if (!card || card.archivedAt) {
    throw new KanbanNotFoundError(`card not found: ${id}`);
  }
  return card;
}

function requireLane(store: KanbanStoreFile, laneId: string) {
  const id = normalizeText(laneId, "laneId", { maxLength: 120 });
  const lane = store.lanes[id];
  if (!lane || lane.boardId !== DEFAULT_KANBAN_BOARD_ID || lane.archivedAt) {
    throw new KanbanNotFoundError(`lane not found: ${id}`);
  }
  return lane;
}

function cardsInLane(store: KanbanStoreFile, laneId: string): KanbanCard[] {
  return Object.values(store.cards).filter(
    (card) =>
      card.laneId === laneId && card.boardId === DEFAULT_KANBAN_BOARD_ID && !card.archivedAt,
  );
}

function rewritePositions(store: KanbanStoreFile, cards: KanbanCard[]): void {
  cards.forEach((card, index) => {
    store.cards[card.id] = {
      ...card,
      position: (index + 1) * POSITION_STEP,
    };
  });
}

function checklistForCard(store: KanbanStoreFile, card: KanbanCard): KanbanChecklistItem[] {
  return sortByPosition(
    card.checklistItemIds
      .map((id) => store.checklistItems[id])
      .filter((item): item is KanbanChecklistItem => Boolean(item)),
  );
}

function commentsForCard(store: KanbanStoreFile, cardId: string): KanbanComment[] {
  return Object.values(store.comments)
    .filter((comment) => comment.cardId === cardId && !comment.deletedAt)
    .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

function activitiesForCard(store: KanbanStoreFile, cardId: string): KanbanActivity[] {
  return store.activities
    .filter((activity) => activity.cardId === cardId)
    .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

function cardDetail(store: KanbanStoreFile, card: KanbanCard): KanbanCardDetail {
  return {
    card,
    checklistItems: checklistForCard(store, card),
    comments: commentsForCard(store, card.id),
    activities: activitiesForCard(store, card.id),
  };
}

function recordActivity(
  store: KanbanStoreFile,
  params: Omit<KanbanActivity, "id" | "boardId" | "createdAt">,
): void {
  store.activities.push({
    id: randomUUID(),
    boardId: DEFAULT_KANBAN_BOARD_ID,
    createdAt: nowIso(),
    ...params,
  });
}

function normalizeDueDate(value: string | null | undefined): string | undefined {
  const normalized = normalizeOptionalText(value, "dueDate", { maxLength: 40 });
  if (!normalized) {
    return undefined;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new KanbanValidationError("dueDate must use YYYY-MM-DD");
  }
  return normalized;
}
