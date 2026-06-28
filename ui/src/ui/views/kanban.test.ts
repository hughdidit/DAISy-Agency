import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { KanbanBoard, KanbanCard, KanbanStatusResult } from "../types.ts";
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
    onRefresh: () => undefined,
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
});
