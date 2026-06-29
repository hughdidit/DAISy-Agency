import type { GatewayBrowserClient } from "../gateway.ts";
import type {
  KanbanActivity,
  KanbanActivityListResult,
  KanbanBoard,
  KanbanBoardGetResult,
  KanbanCard,
  KanbanCardsListResult,
  KanbanImportTrelloPreviewResult,
  KanbanImportTrelloRunResult,
  KanbanStatusResult,
} from "../types.ts";

export type KanbanImportFormat = "json" | "csv";

export type KanbanState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  kanbanLoading: boolean;
  kanbanStatus: KanbanStatusResult | null;
  kanbanBoard: KanbanBoard | null;
  kanbanCards: KanbanCard[];
  kanbanActivity: KanbanActivity[];
  kanbanError: string | null;
  kanbanImportFormat: KanbanImportFormat;
  kanbanImportContent: string;
  kanbanImportFileName: string | null;
  kanbanImportPreview: KanbanImportTrelloPreviewResult | null;
  kanbanImportResult: KanbanImportTrelloRunResult | null;
  kanbanImportBusy: boolean;
  kanbanImportError: string | null;
};

function kanbanBoardParams(state: KanbanState): { boardId?: string } {
  return state.kanbanStatus?.boardId ? { boardId: state.kanbanStatus.boardId } : {};
}

function inferImportFormat(fileName: string): KanbanImportFormat | null {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".csv")) {
    return "csv";
  }
  if (lower.endsWith(".json")) {
    return "json";
  }
  return null;
}

export function setKanbanImportFormat(state: KanbanState, format: KanbanImportFormat) {
  state.kanbanImportFormat = format;
  state.kanbanImportPreview = null;
  state.kanbanImportResult = null;
  state.kanbanImportError = null;
}

export function setKanbanImportContent(
  state: KanbanState,
  content: string,
  fileName: string | null = null,
) {
  state.kanbanImportContent = content;
  state.kanbanImportFileName = fileName;
  state.kanbanImportPreview = null;
  state.kanbanImportResult = null;
  state.kanbanImportError = null;
}

export async function loadKanbanImportFile(state: KanbanState, file: File | null) {
  if (!file) {
    return;
  }
  const inferred = inferImportFormat(file.name);
  if (inferred) {
    state.kanbanImportFormat = inferred;
  }
  setKanbanImportContent(state, await file.text(), file.name);
}

export async function previewKanbanImport(state: KanbanState) {
  if (!state.client || !state.connected || state.kanbanImportBusy) {
    return;
  }
  const content = state.kanbanImportContent.trim();
  if (!content) {
    state.kanbanImportError = "Paste Trello export content or choose a file before previewing.";
    return;
  }
  state.kanbanImportBusy = true;
  state.kanbanImportError = null;
  state.kanbanImportResult = null;
  try {
    state.kanbanImportPreview = await state.client.request<KanbanImportTrelloPreviewResult>(
      "kanban.import.trello.preview",
      {
        ...kanbanBoardParams(state),
        format: state.kanbanImportFormat,
        content,
      },
    );
  } catch (err) {
    state.kanbanImportError = String(err);
    state.kanbanImportPreview = null;
  } finally {
    state.kanbanImportBusy = false;
  }
}

export async function runKanbanImport(state: KanbanState) {
  if (!state.client || !state.connected || state.kanbanImportBusy) {
    return;
  }
  if (!state.kanbanImportPreview) {
    state.kanbanImportError = "Preview the Trello import before running it.";
    return;
  }
  state.kanbanImportBusy = true;
  state.kanbanImportError = null;
  try {
    state.kanbanImportResult = await state.client.request<KanbanImportTrelloRunResult>(
      "kanban.import.trello.run",
      {
        ...kanbanBoardParams(state),
        importId: state.kanbanImportPreview.importId,
      },
    );
    await loadKanban(state);
  } catch (err) {
    state.kanbanImportError = String(err);
  } finally {
    state.kanbanImportBusy = false;
  }
}

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

    const params = kanbanBoardParams(state);
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
