import type { GatewayBrowserClient } from "../gateway.ts";
import type {
  KanbanActivity,
  KanbanActivityListResult,
  KanbanBoard,
  KanbanBoardGetResult,
  KanbanCard,
  KanbanCardMutationResult,
  KanbanCardsGetResult,
  KanbanCardsListResult,
  KanbanImportTrelloPreviewResult,
  KanbanImportTrelloRunResult,
  KanbanStatusResult,
} from "../types.ts";

export type KanbanImportFormat = "json" | "csv";
export type KanbanCardDraft = {
  title: string;
  description: string;
  lane: KanbanCard["lane"];
  priority: KanbanCard["priority"];
  assignee: string;
  reviewer: string;
  inputOwner: string;
  labelsText: string;
  dueDate: string;
  readyForCodex: boolean;
  linksText: string;
  watchersText: string;
  checklistText: string;
  customFieldsText: string;
};

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
  kanbanSelectedCardId: string | null;
  kanbanSelectedCard: KanbanCard | null;
  kanbanCardDraft: KanbanCardDraft | null;
  kanbanCardCommentDraft: string;
  kanbanCardBusy: boolean;
  kanbanCardError: string | null;
};

function kanbanBoardParams(state: KanbanState): { boardId?: string } {
  return state.kanbanStatus?.boardId ? { boardId: state.kanbanStatus.boardId } : {};
}

function nowIso(): string {
  return new Date().toISOString();
}

function generatedId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function compactList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function dateInputValue(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

function dueDateValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? `${trimmed}T00:00:00Z` : null;
}

function checklistText(card: KanbanCard): string {
  return (card.checklist ?? [])
    .map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.text}`)
    .join("\n");
}

function parseChecklistDraft(card: KanbanCard, value: string) {
  const existing = card.checklist ?? [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const checked = /^\[(x|X)\]\s*/.test(line);
      const text = line.replace(/^\[(x|X| )\]\s*/, "").trim();
      const fallback = existing[index];
      const timestamp = nowIso();
      return {
        id: fallback?.id ?? generatedId("item"),
        text: text || fallback?.text || "Checklist item",
        checked,
        createdAt: fallback?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
    });
}

export function createKanbanCardDraft(card: KanbanCard): KanbanCardDraft {
  return {
    title: card.title,
    description: card.description ?? "",
    lane: card.lane,
    priority: card.priority,
    assignee: card.assignee ?? "",
    reviewer: card.reviewer ?? "",
    inputOwner: card.inputOwner ?? "",
    labelsText: (card.labels ?? []).join("\n"),
    dueDate: dateInputValue(card.dueDate),
    readyForCodex: card.readyForCodex,
    linksText: (card.links ?? []).join("\n"),
    watchersText: (card.watchers ?? []).join("\n"),
    checklistText: checklistText(card),
    customFieldsText: JSON.stringify(card.customFields ?? {}, null, 2),
  };
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

function applyCardMutation(state: KanbanState, result: KanbanCardMutationResult) {
  state.kanbanSelectedCard = result.card;
  state.kanbanSelectedCardId = result.card.id;
  state.kanbanCardDraft = createKanbanCardDraft(result.card);
  state.kanbanCards = state.kanbanCards.map((card) =>
    card.id === result.card.id ? result.card : card,
  );
  state.kanbanActivity = [result.activity, ...state.kanbanActivity].slice(0, 50);
}

export function updateKanbanCardDraft<K extends keyof KanbanCardDraft>(
  state: KanbanState,
  field: K,
  value: KanbanCardDraft[K],
) {
  if (!state.kanbanCardDraft) {
    return;
  }
  state.kanbanCardDraft = { ...state.kanbanCardDraft, [field]: value };
  state.kanbanCardError = null;
}

export function updateKanbanCardCommentDraft(state: KanbanState, value: string) {
  state.kanbanCardCommentDraft = value;
  state.kanbanCardError = null;
}

export function closeKanbanCard(state: KanbanState) {
  state.kanbanSelectedCardId = null;
  state.kanbanSelectedCard = null;
  state.kanbanCardDraft = null;
  state.kanbanCardCommentDraft = "";
  state.kanbanCardBusy = false;
  state.kanbanCardError = null;
}

export async function selectKanbanCard(state: KanbanState, cardId: string) {
  const fallback = state.kanbanCards.find((card) => card.id === cardId) ?? null;
  state.kanbanSelectedCardId = cardId;
  state.kanbanSelectedCard = fallback;
  state.kanbanCardDraft = fallback ? createKanbanCardDraft(fallback) : null;
  state.kanbanCardCommentDraft = "";
  state.kanbanCardError = null;
  if (!state.client || !state.connected) {
    return;
  }
  state.kanbanCardBusy = true;
  try {
    const result = await state.client.request<KanbanCardsGetResult>("kanban.cards.get", {
      ...kanbanBoardParams(state),
      cardId,
    });
    state.kanbanSelectedCard = result.card;
    state.kanbanCardDraft = createKanbanCardDraft(result.card);
    state.kanbanCards = state.kanbanCards.map((card) =>
      card.id === result.card.id ? result.card : card,
    );
  } catch (err) {
    state.kanbanCardError = String(err);
  } finally {
    state.kanbanCardBusy = false;
  }
}

export async function saveKanbanCard(state: KanbanState) {
  if (!state.client || !state.connected || state.kanbanCardBusy) {
    return;
  }
  const card = state.kanbanSelectedCard;
  const draft = state.kanbanCardDraft;
  if (!card || !draft) {
    return;
  }
  const title = draft.title.trim();
  if (!title) {
    state.kanbanCardError = "Kanban card title is required.";
    return;
  }
  let customFields: Record<string, unknown>;
  try {
    const parsed = JSON.parse(draft.customFieldsText.trim() || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Custom fields must be a JSON object.");
    }
    customFields = parsed as Record<string, unknown>;
  } catch (err) {
    state.kanbanCardError = String(err);
    return;
  }
  state.kanbanCardBusy = true;
  state.kanbanCardError = null;
  try {
    const result = await state.client.request<KanbanCardMutationResult>("kanban.cards.update", {
      ...kanbanBoardParams(state),
      cardId: card.id,
      expectedVersion: card.version,
      updates: {
        title,
        description: draft.description.trim() ? draft.description : null,
        priority: draft.priority,
        assignee: draft.assignee.trim() || null,
        reviewer: draft.reviewer.trim() || null,
        inputOwner: draft.inputOwner.trim() || null,
        labels: compactList(draft.labelsText),
        dueDate: dueDateValue(draft.dueDate),
        checklist: parseChecklistDraft(card, draft.checklistText),
        links: compactList(draft.linksText),
        watchers: compactList(draft.watchersText),
        customFields,
        readyForCodex: draft.readyForCodex,
      },
    });
    applyCardMutation(state, result);
    await loadKanban(state);
  } catch (err) {
    state.kanbanCardError = String(err);
  } finally {
    state.kanbanCardBusy = false;
  }
}

export async function commentKanbanCard(state: KanbanState) {
  if (!state.client || !state.connected || state.kanbanCardBusy || !state.kanbanSelectedCard) {
    return;
  }
  const body = state.kanbanCardCommentDraft.trim();
  if (!body) {
    state.kanbanCardError = "Kanban comment body is required.";
    return;
  }
  state.kanbanCardBusy = true;
  state.kanbanCardError = null;
  try {
    const result = await state.client.request<KanbanCardMutationResult>("kanban.cards.comment", {
      ...kanbanBoardParams(state),
      cardId: state.kanbanSelectedCard.id,
      body,
    });
    state.kanbanCardCommentDraft = "";
    applyCardMutation(state, result);
    await loadKanban(state);
  } catch (err) {
    state.kanbanCardError = String(err);
  } finally {
    state.kanbanCardBusy = false;
  }
}

export async function moveKanbanCard(state: KanbanState, lane: KanbanCard["lane"]) {
  if (!state.client || !state.connected || state.kanbanCardBusy || !state.kanbanSelectedCard) {
    return;
  }
  state.kanbanCardBusy = true;
  state.kanbanCardError = null;
  try {
    const result = await state.client.request<KanbanCardMutationResult>("kanban.cards.move", {
      ...kanbanBoardParams(state),
      cardId: state.kanbanSelectedCard.id,
      expectedVersion: state.kanbanSelectedCard.version,
      lane,
    });
    applyCardMutation(state, result);
    await loadKanban(state);
  } catch (err) {
    state.kanbanCardError = String(err);
  } finally {
    state.kanbanCardBusy = false;
  }
}

export async function archiveKanbanCard(state: KanbanState) {
  if (!state.client || !state.connected || state.kanbanCardBusy || !state.kanbanSelectedCard) {
    return;
  }
  state.kanbanCardBusy = true;
  state.kanbanCardError = null;
  try {
    await state.client.request<KanbanCardMutationResult>("kanban.cards.archive", {
      ...kanbanBoardParams(state),
      cardId: state.kanbanSelectedCard.id,
      expectedVersion: state.kanbanSelectedCard.version,
    });
    closeKanbanCard(state);
    await loadKanban(state);
  } catch (err) {
    state.kanbanCardError = String(err);
  } finally {
    state.kanbanCardBusy = false;
  }
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
  setKanbanImportContent(state, "", file.name);
  const inferred = inferImportFormat(file.name);
  if (inferred) {
    state.kanbanImportFormat = inferred;
  }
  try {
    setKanbanImportContent(state, await file.text(), file.name);
  } catch (err) {
    state.kanbanImportContent = "";
    state.kanbanImportFileName = file.name;
    state.kanbanImportPreview = null;
    state.kanbanImportResult = null;
    state.kanbanImportError = `Failed to read file: ${String(err)}`;
  }
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
