import AjvPkg from "ajv";
import { describe, expect, it } from "vitest";
import {
  KANBAN_MAX_ATTACHMENT_BASE64_LENGTH,
  KANBAN_MAX_ATTACHMENT_FILENAME_LENGTH,
} from "../../../kanban/types.js";
import { ProtocolSchemas } from "./protocol-schemas.js";

function createAjv() {
  return new (AjvPkg as unknown as new (opts?: object) => import("ajv").default)({
    allErrors: true,
    strict: false,
  });
}

describe("Kanban gateway protocol schemas", () => {
  it("registers public Kanban schema names in the protocol registry", () => {
    expect(ProtocolSchemas).toEqual(
      expect.objectContaining({
        KanbanStatusParams: expect.any(Object),
        KanbanStatusResult: expect.any(Object),
        KanbanBoardGetParams: expect.any(Object),
        KanbanBoardGetResult: expect.any(Object),
        KanbanCardsListParams: expect.any(Object),
        KanbanCardsListResult: expect.any(Object),
        KanbanCardsGetParams: expect.any(Object),
        KanbanCardsGetResult: expect.any(Object),
        KanbanCardsCreateParams: expect.any(Object),
        KanbanCardsUpdateParams: expect.any(Object),
        KanbanCardsMoveParams: expect.any(Object),
        KanbanCardsCommentParams: expect.any(Object),
        KanbanCardsAttachmentAddParams: expect.any(Object),
        KanbanCardsAttachmentArchiveParams: expect.any(Object),
        KanbanCardsArchiveParams: expect.any(Object),
        KanbanActivityListParams: expect.any(Object),
        KanbanActivityListResult: expect.any(Object),
        KanbanImportTrelloPreviewParams: expect.any(Object),
        KanbanImportTrelloPreviewResult: expect.any(Object),
        KanbanImportTrelloRunParams: expect.any(Object),
        KanbanImportTrelloRunResult: expect.any(Object),
        KanbanCodexPickNextParams: expect.any(Object),
        KanbanCodexPickNextResult: expect.any(Object),
        KanbanCodexHandoffParams: expect.any(Object),
        KanbanCodexCompleteParams: expect.any(Object),
      }),
    );
  });

  it("bounds card list requests and rejects extra properties", () => {
    const validate = createAjv().compile(ProtocolSchemas.KanbanCardsListParams);

    expect(
      validate({
        boardId: "team-agents",
        lane: "todo",
        limit: 200,
        after: {
          lane: "todo",
          position: 10,
          createdAt: "2026-01-02T03:04:05.000Z",
          cardId: "card-1",
        },
      }),
    ).toBe(true);
    expect(validate({ limit: 201 })).toBe(false);
    expect(validate({ lane: "blocked" })).toBe(false);
    expect(
      validate({
        after: { lane: "todo", position: 10, createdAt: "not-a-date", cardId: "card-1" },
      }),
    ).toBe(false);
    expect(validate({ boardId: "team-agents", token: "secret" })).toBe(false);
  });

  it("requires Trello import preview content and bounds preview results", () => {
    const previewParams = createAjv().compile(ProtocolSchemas.KanbanImportTrelloPreviewParams);
    const previewResult = createAjv().compile(ProtocolSchemas.KanbanImportTrelloPreviewResult);

    expect(previewParams({ format: "json", content: '{"cards":[]}' })).toBe(true);
    expect(previewParams({ format: "xml", content: "<cards />" })).toBe(false);
    expect(previewParams({ format: "csv" })).toBe(false);
    expect(
      previewResult({
        importId: "preview-1",
        cards: [
          {
            sourceCardId: "trello-card-1",
            title: "Imported card",
            lane: "todo",
            priority: "normal",
            labels: [],
            checklistCount: 0,
            commentCount: 0,
            attachmentCount: 0,
            watcherCount: 0,
            warnings: [],
          },
        ],
        warnings: [],
      }),
    ).toBe(true);
  });

  it("requires exactly one Trello import run source", () => {
    const runParams = createAjv().compile(ProtocolSchemas.KanbanImportTrelloRunParams);

    expect(runParams({ importId: "preview-1" })).toBe(true);
    expect(runParams({ format: "csv", content: "Name,Desc\nCard,Body" })).toBe(true);
    expect(runParams({})).toBe(false);
    expect(runParams({ format: "json" })).toBe(false);
    expect(runParams({ importId: "preview-1", format: "json", content: "{}" })).toBe(false);
  });

  it("requires optimistic versions for conflicting card mutations", () => {
    const update = createAjv().compile(ProtocolSchemas.KanbanCardsUpdateParams);
    const move = createAjv().compile(ProtocolSchemas.KanbanCardsMoveParams);
    const addAttachment = createAjv().compile(ProtocolSchemas.KanbanCardsAttachmentAddParams);
    const archiveAttachment = createAjv().compile(
      ProtocolSchemas.KanbanCardsAttachmentArchiveParams,
    );
    const archive = createAjv().compile(ProtocolSchemas.KanbanCardsArchiveParams);

    expect(update({ cardId: "card-1", expectedVersion: 2, updates: { title: "Retitle" } })).toBe(
      true,
    );
    expect(update({ cardId: "card-1", updates: { title: "Retitle" } })).toBe(false);
    expect(move({ cardId: "card-1", expectedVersion: 2, lane: "review" })).toBe(true);
    expect(move({ cardId: "card-1", lane: "review" })).toBe(false);
    expect(
      addAttachment({
        cardId: "card-1",
        expectedVersion: 2,
        fileName: "notes.txt",
        contentType: "text/plain",
        contentBase64: "bm90ZXM=",
      }),
    ).toBe(true);
    expect(
      addAttachment({
        cardId: "card-1",
        fileName: "notes.txt",
        contentBase64: "bm90ZXM=",
      }),
    ).toBe(false);
    expect(
      addAttachment({
        cardId: "card-1",
        expectedVersion: 2,
        fileName: "x".repeat(KANBAN_MAX_ATTACHMENT_FILENAME_LENGTH + 1),
        contentBase64: "bm90ZXM=",
      }),
    ).toBe(false);
    expect(
      addAttachment({
        cardId: "card-1",
        expectedVersion: 2,
        fileName: "notes.txt",
        contentBase64: "A".repeat(KANBAN_MAX_ATTACHMENT_BASE64_LENGTH + 1),
      }),
    ).toBe(false);
    expect(
      archiveAttachment({
        cardId: "card-1",
        expectedVersion: 3,
        attachmentId: "attachment-1",
      }),
    ).toBe(true);
    expect(archiveAttachment({ cardId: "card-1", attachmentId: "attachment-1" })).toBe(false);
    expect(archive({ cardId: "card-1", expectedVersion: 2 })).toBe(true);
    expect(archive({ cardId: "card-1" })).toBe(false);
  });

  it("accepts Codex handoff and completion contracts", () => {
    const handoff = createAjv().compile(ProtocolSchemas.KanbanCodexHandoffParams);
    const complete = createAjv().compile(ProtocolSchemas.KanbanCodexCompleteParams);

    expect(
      handoff({
        cardId: "card-1",
        expectedVersion: 3,
        summary: "Needs a human look",
        reviewer: "hugh",
      }),
    ).toBe(true);
    expect(handoff({ cardId: "card-1", summary: "" })).toBe(false);
    expect(handoff({ cardId: "card-1", summary: "Needs a human look" })).toBe(false);
    expect(complete({ cardId: "card-1", expectedVersion: 3, summary: "Done" })).toBe(true);
    expect(complete({ cardId: "card-1", summary: "Done" })).toBe(false);
  });
});
