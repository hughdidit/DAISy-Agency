import type { GatewayBrowserClient } from "../gateway.ts";
import type {
  KanbanActivity,
  KanbanActivityListResult,
  KanbanBoard,
  KanbanBoardGetResult,
  KanbanCard,
  KanbanCardsListResult,
  KanbanStatusResult,
} from "../types.ts";

export type KanbanState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  kanbanLoading: boolean;
  kanbanStatus: KanbanStatusResult | null;
  kanbanBoard: KanbanBoard | null;
  kanbanCards: KanbanCard[];
  kanbanActivity: KanbanActivity[];
  kanbanError: string | null;
};

export async function loadKanban(state: KanbanState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.kanbanLoading) {
    return;
  }
  state.kanbanLoading = true;
  state.kanbanError = null;
  try {
    const status = await state.client.request<KanbanStatusResult>("kanban.status", {});
    state.kanbanStatus = status;
    if (!status.enabled || !status.available) {
      state.kanbanBoard = null;
      state.kanbanCards = [];
      state.kanbanActivity = [];
      return;
    }

    const params = status.boardId ? { boardId: status.boardId } : {};
    const [boardResult, cardsResult, activityResult] = await Promise.all([
      state.client.request<KanbanBoardGetResult>("kanban.board.get", params),
      state.client.request<KanbanCardsListResult>("kanban.cards.list", {
        ...params,
        includeArchived: false,
        limit: 200,
      }),
      state.client.request<KanbanActivityListResult>("kanban.activity.list", {
        ...params,
        limit: 50,
      }),
    ]);

    state.kanbanBoard = boardResult.board;
    state.kanbanCards = cardsResult.cards;
    state.kanbanActivity = activityResult.activity;
  } catch (err) {
    state.kanbanError = String(err);
    state.kanbanBoard = null;
    state.kanbanCards = [];
    state.kanbanActivity = [];
  } finally {
    state.kanbanLoading = false;
  }
}
