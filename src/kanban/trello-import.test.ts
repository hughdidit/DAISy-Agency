import { describe, expect, it } from "vitest";
import { parseTrelloImport } from "./trello-import.js";

describe("parseTrelloImport", () => {
  it("normalizes Trello JSON exports into Kanban preview cards", () => {
    const parsed = parseTrelloImport({
      format: "json",
      content: JSON.stringify({
        id: "board-1",
        members: [{ id: "member-1", fullName: "Hugh Chapman", username: "hugh" }],
        customFields: [
          { id: "field-1", name: "Estimate", type: "number" },
          { id: "field-2", name: "Approved", type: "checkbox" },
          {
            id: "field-3",
            name: "Status",
            type: "list",
            options: [{ id: "option-1", value: { text: "Blocked" } }],
          },
          { id: "field-4", name: "trello", type: "text" },
        ],
        lists: [null, { id: "list-todo", name: "To Do" }, { id: "list-review", name: "Review" }],
        checklists: [
          {
            idCard: "card-1",
            checkItems: [
              { id: "check-1", name: "Confirm import preview", state: "complete", pos: 1 },
              { id: "check-2", name: "Run import", state: "incomplete", pos: 2 },
            ],
          },
        ],
        actions: [
          {
            id: "comment-1",
            type: "commentCard",
            date: "2026-01-03T00:00:00.000Z",
            data: { card: { id: "card-1" }, text: "Original Trello comment" },
            memberCreator: { id: "member-1", fullName: "Hugh Chapman" },
          },
        ],
        cards: [
          {
            id: "card-1",
            idBoard: "board-1",
            name: "Ship gateway import",
            desc: "Preserve source fields",
            idList: "list-review",
            idMembers: ["member-1"],
            due: "2026-01-02T03:04:05.000Z",
            labels: [{ name: "High" }, { color: "green" }],
            url: "https://trello.example/cards/card-1",
            pos: 42,
            attachments: [
              {
                id: "attachment-1",
                name: "Spec link",
                url: "https://trello.example/attachments/spec",
                bytes: 123,
                mimeType: "text/plain",
                date: "2026-01-04T00:00:00.000Z",
              },
            ],
            customFieldItems: [
              {
                idCustomField: "field-1",
                value: { number: 3 },
              },
              {
                idCustomField: "field-2",
                value: { checked: true },
              },
              {
                idCustomField: "field-3",
                idValue: "option-1",
              },
              {
                idCustomField: "field-4",
                value: { text: "Custom field named trello" },
              },
            ],
          },
        ],
      }),
    });

    expect(parsed.cards).toEqual([
      expect.objectContaining({
        sourceCardId: "card-1",
        sourceBoardId: "board-1",
        sourceListId: "list-review",
        sourceUrl: "https://trello.example/cards/card-1",
        title: "Ship gateway import",
        description: "Preserve source fields",
        lane: "review",
        priority: "high",
        assignee: "Hugh Chapman",
        labels: ["High", "green"],
        links: ["https://trello.example/cards/card-1", "https://trello.example/attachments/spec"],
        checklist: [
          {
            sourceId: "check-1",
            text: "Confirm import preview",
            checked: true,
            position: 1,
          },
          {
            sourceId: "check-2",
            text: "Run import",
            checked: false,
            position: 2,
          },
        ],
        comments: [
          {
            sourceId: "comment-1",
            body: "Original Trello comment",
            actor: { type: "import", id: "member-1", name: "Hugh Chapman" },
            createdAt: new Date("2026-01-03T00:00:00.000Z"),
          },
        ],
        attachments: [
          {
            sourceId: "attachment-1",
            fileName: "Spec link",
            url: "https://trello.example/attachments/spec",
            contentType: "text/plain",
            sizeBytes: 123,
            createdAt: new Date("2026-01-04T00:00:00.000Z"),
          },
        ],
        watchers: ["Hugh Chapman"],
        customFields: {
          Estimate: "3",
          Approved: "true",
          Status: "Blocked",
          trello: "Custom field named trello",
          trelloImport: {
            listId: "list-review",
            listName: "Review",
            memberIds: ["member-1"],
            attachmentCount: 1,
          },
        },
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
        'Name,List,Labels,Due Date,Description,URL,Members,Checklist,Comments,Attachments,Custom Fields\n"CSV card","Doing","urgent;backend","2026-05-01T00:00:00.000Z","Body","https://trello.example/csv","Codex;Hugh","[x] Import preview;[ ] Import run","Looks good, ship; keep punctuation","https://trello.example/attachment","Estimate=2"',
    });

    expect(parsed.cards).toEqual([
      expect.objectContaining({
        title: "CSV card",
        lane: "in_progress",
        priority: "urgent",
        assignee: "Codex",
        labels: ["urgent", "backend"],
        description: "Body",
        links: ["https://trello.example/csv", "https://trello.example/attachment"],
        checklist: [
          {
            sourceId: "csv-check-1-1",
            text: "Import preview",
            checked: true,
            position: 0,
          },
          {
            sourceId: "csv-check-1-2",
            text: "Import run",
            checked: false,
            position: 1,
          },
        ],
        comments: [
          {
            sourceId: "csv-comment-1-1",
            body: "Looks good, ship; keep punctuation",
            actor: { type: "import", id: "trello-csv" },
          },
        ],
        attachments: [
          {
            sourceId: "csv-attachment-1-1",
            fileName: "https://trello.example/attachment",
            url: "https://trello.example/attachment",
            sizeBytes: 0,
          },
        ],
        watchers: ["Codex", "Hugh"],
        customFields: { trelloCsvCustomFields: "Estimate=2" },
        warnings: ["missing Trello card id; generated stable row id"],
      }),
    ]);
    expect(parsed.cards[0]?.sourceCardId).toMatch(/^csv-[a-f0-9]{12}-1$/);
  });

  it("salts generated JSON ids and marks archived cards as skipped", () => {
    const parsed = parseTrelloImport({
      format: "json",
      content: JSON.stringify({
        cards: [
          {
            name: "Archived Trello card",
            closed: true,
          },
        ],
      }),
    });

    expect(parsed.cards[0]).toEqual(
      expect.objectContaining({
        sourceCardId: expect.stringMatching(/^json-[a-f0-9]{12}-1$/),
        title: "Archived Trello card",
        lane: "todo",
        warnings: [
          "archived Trello card; card skipped during run",
          "missing Trello card id; generated stable row id",
        ],
      }),
    );
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
