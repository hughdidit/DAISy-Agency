import { describe, expect, it, vi } from "vitest";
import { loadKanban, type KanbanState } from "./kanban.ts";
import type {
  KanbanActivityListResult,
  KanbanBoardGetResult,
  KanbanCardsListResult,
  KanbanStatusResult,
} from "../types.ts";

function createState(): { state: KanbanState; request: ReturnType<typeof vi.fn> } {
  const request = vi.fn();
  const state: KanbanState = {
    client: {
      request,
    } as unknown as KanbanState["client"],
    connected: true,
    kanbanLoading: false,
    kanbanStatus: null,
    kanbanBoard: null,
    kanbanCards: [],
    kanbanActivity: [],
    kanbanError: null,
  };
  return { state, request };
}

describe("loadKanban", () => {
  it("loads status, board, cards, and activity", async () => {
    const { state, request } = createState();
    const status: KanbanStatusResult = {
      ok: true,
      available: true,
      enabled: true,
      boardId: "board-1",
      redactedUri: "mongodb://redacted",
    };
    const boardResult: KanbanBoardGetResult = {
      board: {
        id: "board-1",
        slug: "default",
        title: "Agent Board",
        lanes: [
          { id: "todo", title: "To do", position: 0 },
          { id: "in_progress", title: "Doing", position: 1 },
          { id: "review", title: "Review", position: 2 },
          { id: "done", title: "Done", position: 3 },
        ],
        createdAt: "2026-06-28T01:00:00Z",
        updatedAt: "2026-06-28T01:00:00Z",
      },
    };
    const cardsResult: KanbanCardsListResult = { cards: [] };
    const activityResult: KanbanActivityListResult = { activity: [] };
    request
      .mockResolvedValueOnce(status)
      .mockResolvedValueOnce(boardResult)
      .mockResolvedValueOnce(cardsResult)
      .mockResolvedValueOnce(activityResult);

    await loadKanban(state);

    expect(request).toHaveBeenNthCalledWith(1, "kanban.status", {});
    expect(request).toHaveBeenNthCalledWith(2, "kanban.board.get", { boardId: "board-1" });
    expect(request).toHaveBeenNthCalledWith(3, "kanban.cards.list", {
      boardId: "board-1",
      includeArchived: false,
      limit: 200,
    });
    expect(request).toHaveBeenNthCalledWith(4, "kanban.activity.list", {
      boardId: "board-1",
      limit: 50,
    });
    expect(state.kanbanStatus).toEqual(status);
    expect(state.kanbanBoard).toEqual(boardResult.board);
    expect(state.kanbanCards).toEqual([]);
    expect(state.kanbanActivity).toEqual([]);
    expect(state.kanbanError).toBeNull();
    expect(state.kanbanLoading).toBe(false);
  });

  it("does not request board data when kanban is unavailable", async () => {
    const { state, request } = createState();
    const status: KanbanStatusResult = {
      ok: false,
      available: false,
      enabled: true,
      reason: "not_configured",
    };
    request.mockResolvedValueOnce(status);
    state.kanbanBoard = {
      id: "stale",
      slug: "stale",
      title: "Stale",
      lanes: [
        { id: "todo", title: "To do", position: 0 },
        { id: "in_progress", title: "Doing", position: 1 },
        { id: "review", title: "Review", position: 2 },
        { id: "done", title: "Done", position: 3 },
      ],
      createdAt: "2026-06-28T01:00:00Z",
      updatedAt: "2026-06-28T01:00:00Z",
    };
    state.kanbanCards = [
      {
        id: "card-1",
        boardId: "stale",
        title: "Stale card",
        lane: "todo",
        position: 0,
        priority: "normal",
        labels: [],
        checklist: [],
        comments: [],
        links: [],
        attachments: [],
        watchers: [],
        customFields: {},
        readyForCodex: false,
        createdAt: "2026-06-28T01:00:00Z",
        updatedAt: "2026-06-28T01:00:00Z",
        version: 1,
      },
    ];

    await loadKanban(state);

    expect(request).toHaveBeenCalledTimes(1);
    expect(state.kanbanStatus).toEqual(status);
    expect(state.kanbanBoard).toBeNull();
    expect(state.kanbanCards).toEqual([]);
    expect(state.kanbanActivity).toEqual([]);
  });

  it("captures gateway errors", async () => {
    const { state, request } = createState();
    request.mockRejectedValueOnce(new Error("gateway unavailable"));

    await loadKanban(state);

    expect(state.kanbanError).toContain("gateway unavailable");
    expect(state.kanbanLoading).toBe(false);
  });
});
