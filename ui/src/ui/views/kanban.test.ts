import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { KanbanCardDraft } from "../controllers/kanban.ts";
import type {
  KanbanBoard,
  KanbanCard,
  KanbanImportTrelloPreviewResult,
  KanbanImportTrelloRunResult,
  KanbanStatusResult,
} from "../types.ts";
import { renderKanban, type KanbanProps } from "./kanban.ts";

const board: KanbanBoard = {
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
};

const status: KanbanStatusResult = {
  ok: true,
  available: true,
  enabled: true,
  boardId: "board-1",
};

const importPreview: KanbanImportTrelloPreviewResult = {
  importId: "import-1",
  warnings: ["Archived cards are skipped"],
  cards: [
    {
      sourceCardId: "trello-card-1",
      title: "Imported Trello card",
      lane: "todo",
      priority: "normal",
      labels: ["imported"],
      checklistCount: 2,
      commentCount: 1,
      attachmentCount: 3,
      watcherCount: 4,
      warnings: [],
    },
  ],
};

const importResult: KanbanImportTrelloRunResult = {
  importRunId: "run-1",
  created: 1,
  updated: 2,
  skipped: 3,
  activity: {
    id: "activity-import",
    boardId: "board-1",
    action: "import_run",
    actor: { type: "import", id: "trello" },
    summary: "Imported Trello board",
    createdAt: "2026-06-28T01:10:00Z",
  },
};

function createCard(overrides: Partial<KanbanCard>): KanbanCard {
  return {
    id: "card-1",
    boardId: "board-1",
    title: "Implement board shell",
    lane: "todo",
    position: 0,
    priority: "high",
    assignee: "codex",
    labels: ["PRD-003"],
    checklist: [
      {
        id: "item-1",
        text: "Add view",
        checked: true,
        createdAt: "2026-06-28T01:00:00Z",
        updatedAt: "2026-06-28T01:00:00Z",
      },
    ],
    comments: [],
    links: ["https://example.invalid"],
    attachments: [],
    watchers: [],
    customFields: {},
    readyForCodex: true,
    createdAt: "2026-06-28T01:00:00Z",
    updatedAt: "2026-06-28T01:00:00Z",
    version: 1,
    ...overrides,
  };
}

function createDraft(overrides: Partial<KanbanCardDraft> = {}): KanbanCardDraft {
  return {
    title: "Implement board shell",
    description: "Create the visible board.",
    lane: "todo",
    priority: "high",
    assignee: "codex",
    reviewer: "",
    inputOwner: "",
    labelsText: "PRD-003",
    dueDate: "2026-06-30",
    readyForCodex: true,
    linksText: "https://example.invalid",
    watchersText: "hugh",
    checklistText: "[x] Add view",
    customFieldsText: '{\n  "slice": "ui"\n}',
    ...overrides,
  };
}

function createProps(overrides: Partial<KanbanProps> = {}): KanbanProps {
  return {
    loading: false,
    status,
    board,
    cards: [
      createCard({ id: "card-1", title: "Implement board shell", lane: "todo" }),
      createCard({
        id: "card-2",
        title: "Review activity rail",
        lane: "review",
        priority: "normal",
      }),
    ],
    activity: [
      {
        id: "activity-1",
        boardId: "board-1",
        cardId: "card-1",
        action: "card_create",
        actor: { type: "agent", id: "codex", name: "Codex" },
        summary: "Created card Implement board shell",
        createdAt: "2026-06-28T01:05:00Z",
      },
    ],
    error: null,
    importFormat: "json",
    importContent: "",
    importFileName: null,
    importPreview: null,
    importResult: null,
    importBusy: false,
    importError: null,
    selectedCardId: null,
    selectedCard: null,
    cardDraft: null,
    cardCommentDraft: "",
    cardBusy: false,
    cardError: null,
    onRefresh: () => undefined,
    onImportFormatChange: () => undefined,
    onImportContentChange: () => undefined,
    onImportFile: () => undefined,
    onImportPreview: () => undefined,
    onImportRun: () => undefined,
    onCardSelect: () => undefined,
    onCardClose: () => undefined,
    onCardDraftChange: () => undefined,
    onCardCommentChange: () => undefined,
    onCardSave: () => undefined,
    onCardComment: () => undefined,
    onCardMove: () => undefined,
    onCardArchive: () => undefined,
    ...overrides,
  };
}

describe("kanban view", () => {
  it("renders board lanes, cards, and activity", () => {
    const container = document.createElement("div");
    render(renderKanban(createProps()), container);

    expect(container.textContent).toContain("Agent Board");
    expect(container.textContent).toContain("To do");
    expect(container.textContent).toContain("Doing");
    expect(container.textContent).toContain("Review");
    expect(container.textContent).toContain("Done");
    expect(container.textContent).toContain("Implement board shell");
    expect(container.textContent).toContain("Review activity rail");
    expect(container.textContent).toContain("Created card Implement board shell");
    expect(container.querySelectorAll(".kanban-lane")).toHaveLength(4);
    expect(container.querySelectorAll(".kanban-card")).toHaveLength(2);
  });

  it("wires refresh and disables the button while loading", () => {
    const container = document.createElement("div");
    const onRefresh = vi.fn();
    render(renderKanban(createProps({ loading: true, onRefresh })), container);

    const button = container.querySelector("button");
    expect(button?.disabled).toBe(true);
    expect(button?.textContent?.trim()).toBe("Refreshing...");
  });

  it("calls refresh from the active refresh button", () => {
    const container = document.createElement("div");
    const onRefresh = vi.fn();
    render(renderKanban(createProps({ onRefresh })), container);

    container.querySelector("button")?.click();

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows unavailable status detail without card data", () => {
    const container = document.createElement("div");
    render(
      renderKanban(
        createProps({
          status: {
            ok: false,
            enabled: true,
            available: false,
            reason: "MongoDB is not configured",
          },
          board: null,
          cards: [],
          activity: [],
        }),
      ),
      container,
    );

    expect(container.textContent).toContain("Unavailable");
    expect(container.textContent).toContain("MongoDB is not configured");
    expect(container.textContent).toContain("No cards");
    expect(container.textContent).toContain("No recent activity");
  });

  it("does not mark the gateway unavailable before status loads", () => {
    const container = document.createElement("div");
    render(renderKanban(createProps({ status: null })), container);

    expect(container.textContent).toContain("Unknown");
    expect(container.textContent).not.toContain("Unavailable");
  });

  it("renders import controls and calls content and format callbacks", () => {
    const container = document.createElement("div");
    const onImportContentChange = vi.fn();
    const onImportFormatChange = vi.fn();
    render(renderKanban(createProps({ onImportContentChange, onImportFormatChange })), container);

    const textarea = container.querySelector(".kanban-import__textarea") as HTMLTextAreaElement;
    textarea.value = '{"cards":[]}';
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const select = container.querySelector(".kanban-import select") as HTMLSelectElement;
    select.value = "csv";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(container.textContent).toContain("Trello Import");
    expect(onImportContentChange).toHaveBeenCalledWith('{"cards":[]}');
    expect(onImportFormatChange).toHaveBeenCalledWith("csv");
  });

  it("calls preview and run actions from the import panel", () => {
    const container = document.createElement("div");
    const onImportPreview = vi.fn();
    const onImportRun = vi.fn();
    render(
      renderKanban(
        createProps({
          importContent: '{"cards":[]}',
          importPreview,
          onImportPreview,
          onImportRun,
        }),
      ),
      container,
    );

    const buttons = [...container.querySelectorAll("button")];
    buttons.find((button) => button.textContent?.trim() === "Preview")?.click();
    buttons.find((button) => button.textContent?.trim() === "Run import")?.click();

    expect(onImportPreview).toHaveBeenCalledTimes(1);
    expect(onImportRun).toHaveBeenCalledTimes(1);
  });

  it("shows Trello preview warnings and import result counts", () => {
    const container = document.createElement("div");
    render(renderKanban(createProps({ importPreview, importResult })), container);

    expect(container.textContent).toContain("1 cards, 1 warnings");
    expect(container.textContent).toContain("Archived cards are skipped");
    expect(container.textContent).toContain("Imported Trello card");
    expect(container.textContent).toContain("2 checklist, 1 comments, 3 files");
    expect(container.textContent).toContain("1 created");
    expect(container.textContent).toContain("2 updated");
    expect(container.textContent).toContain("3 skipped");
    expect(container.textContent).toContain("Imported Trello board");
    expect(
      [...container.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Run import",
      )?.disabled,
    ).toBe(true);
  });

  it("selects a card from the board", () => {
    const container = document.createElement("div");
    const onCardSelect = vi.fn();
    render(renderKanban(createProps({ onCardSelect })), container);

    (container.querySelector('.kanban-card[data-card-id="card-1"]') as HTMLButtonElement).click();

    expect(onCardSelect).toHaveBeenCalledWith("card-1");
  });

  it("renders selected card detail fields and wires edit actions", () => {
    const container = document.createElement("div");
    const selectedCard = createCard({
      id: "card-1",
      comments: [
        {
          id: "comment-1",
          body: "Needs release evidence",
          actor: { type: "human", id: "hugh", name: "Hugh" },
          createdAt: "2026-06-28T02:00:00Z",
        },
      ],
      attachments: [
        {
          id: "attachment-1",
          fileName: "brief.pdf",
          sizeBytes: 1200,
          createdAt: "2026-06-28T02:05:00Z",
        },
      ],
      watchers: ["hugh"],
      customFields: { slice: "ui" },
    });
    const onCardDraftChange = vi.fn();
    const onCardCommentChange = vi.fn();
    const onCardSave = vi.fn();
    const onCardComment = vi.fn();
    const onCardMove = vi.fn();
    const onCardArchive = vi.fn();
    const onCardClose = vi.fn();
    render(
      renderKanban(
        createProps({
          selectedCardId: "card-1",
          selectedCard,
          cardDraft: createDraft({ lane: "review" }),
          cardCommentDraft: "Ready for review",
          onCardDraftChange,
          onCardCommentChange,
          onCardSave,
          onCardComment,
          onCardMove,
          onCardArchive,
          onCardClose,
        }),
      ),
      container,
    );

    const titleInput = container.querySelector(".kanban-detail input") as HTMLInputElement;
    titleInput.value = "Updated title";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));

    const commentTextarea = [
      ...container.querySelectorAll<HTMLTextAreaElement>(".kanban-detail textarea"),
    ].at(-1);
    commentTextarea!.value = "New comment";
    commentTextarea!.dispatchEvent(new Event("input", { bubbles: true }));

    const buttons = [...container.querySelectorAll<HTMLButtonElement>(".kanban-detail button")];
    buttons.find((button) => button.textContent?.trim() === "Save changes")?.click();
    buttons.find((button) => button.textContent?.trim() === "Move")?.click();
    buttons.find((button) => button.textContent?.trim() === "Archive")?.click();
    buttons.find((button) => button.textContent?.trim() === "Add comment")?.click();
    buttons.find((button) => button.textContent?.trim() === "Close")?.click();

    expect(container.textContent).toContain("Card Detail");
    expect(container.textContent).toContain("Needs release evidence");
    expect(container.textContent).toContain("brief.pdf");
    expect(onCardDraftChange).toHaveBeenCalledWith("title", "Updated title");
    expect(onCardCommentChange).toHaveBeenCalledWith("New comment");
    expect(onCardSave).toHaveBeenCalledTimes(1);
    expect(onCardMove).toHaveBeenCalledWith("review");
    expect(onCardArchive).toHaveBeenCalledTimes(1);
    expect(onCardComment).toHaveBeenCalledTimes(1);
    expect(onCardClose).toHaveBeenCalledTimes(1);
  });
});
