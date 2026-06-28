import { describe, expect, it } from "vitest";
import { parseTrelloImport } from "./trello-import.js";

describe("parseTrelloImport", () => {
  it("normalizes Trello JSON exports into Kanban preview cards", () => {
    const parsed = parseTrelloImport({
      format: "json",
      content: JSON.stringify({
        lists: [
          { id: "list-todo", name: "To Do" },
          { id: "list-review", name: "Review" },
        ],
        cards: [
          {
            id: "card-1",
            name: "Ship gateway import",
            desc: "Preserve source fields",
            idList: "list-review",
            due: "2026-01-02T03:04:05.000Z",
            labels: [{ name: "High" }, { color: "green" }],
            url: "https://trello.example/cards/card-1",
            pos: 42,
          },
        ],
      }),
    });

    expect(parsed.cards).toEqual([
      expect.objectContaining({
        sourceCardId: "card-1",
        title: "Ship gateway import",
        description: "Preserve source fields",
        lane: "review",
        priority: "high",
        labels: ["High", "green"],
        links: ["https://trello.example/cards/card-1"],
        position: 42,
        warnings: [],
      }),
    ]);
    expect(parsed.cards[0]?.dueAt?.toISOString()).toBe("2026-01-02T03:04:05.000Z");
    expect(parsed.warnings).toEqual([]);
  });

  it("normalizes CSV exports and generates stable source ids when needed", () => {
    const parsed = parseTrelloImport({
      format: "csv",
      content:
        'Name,List,Labels,Due Date,Description,URL\n"CSV card","Doing","urgent;backend","2026-05-01T00:00:00.000Z","Body","https://trello.example/csv"',
    });

    expect(parsed.cards).toEqual([
      expect.objectContaining({
        title: "CSV card",
        lane: "in_progress",
        priority: "urgent",
        labels: ["urgent", "backend"],
        description: "Body",
        links: ["https://trello.example/csv"],
        warnings: ["missing Trello card id; generated stable row id"],
      }),
    ]);
    expect(parsed.cards[0]?.sourceCardId).toMatch(/^csv-[a-f0-9]{12}-1$/);
  });

  it("rejects malformed import content with actionable messages", () => {
    expect(() => parseTrelloImport({ format: "json", content: "[]" })).toThrow(
      "Trello JSON import content must be an object",
    );
    expect(() => parseTrelloImport({ format: "csv", content: "   " })).toThrow(
      "Trello import content must not be blank",
    );
  });
});
