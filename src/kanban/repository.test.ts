import { describe, expect, it } from "vitest";
import { KANBAN_DEFAULT_COLLECTIONS } from "./config.js";
import type { ResolvedKanbanConfig } from "./config.js";
import {
  buildDefaultBoardDocument,
  KANBAN_INDEX_DEFINITIONS,
  validateKanbanAuditEnvelope,
} from "./repository.js";
import { KANBAN_DEFAULT_BOARD_SLUG, KANBAN_DEFAULT_BOARD_TITLE, KANBAN_LANES } from "./types.js";

const config: ResolvedKanbanConfig = {
  enabled: true,
  uri: "mongodb://localhost:27017",
  redactedUri: "mongodb://localhost:27017",
  database: "daisy_kanban",
  collections: KANBAN_DEFAULT_COLLECTIONS,
  board: {
    slug: KANBAN_DEFAULT_BOARD_SLUG,
    title: KANBAN_DEFAULT_BOARD_TITLE,
  },
};

describe("KANBAN_INDEX_DEFINITIONS", () => {
  it("declares required board, card, activity, import, and attachment indexes", () => {
    expect(KANBAN_INDEX_DEFINITIONS.boards).toContainEqual(
      expect.objectContaining({
        key: { slug: 1 },
        unique: true,
      }),
    );
    expect(KANBAN_INDEX_DEFINITIONS.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { boardId: 1, archivedAt: 1, lane: 1, position: 1 },
        }),
        expect.objectContaining({
          key: { boardId: 1, readyForCodex: 1, priorityRank: 1, createdAt: 1 },
        }),
        expect.objectContaining({
          key: { boardId: 1, "import.source": 1, "import.sourceCardId": 1 },
          unique: true,
          partialFilterExpression: {
            "import.source": { $exists: true },
            "import.sourceCardId": { $exists: true },
          },
        }),
      ]),
    );
    expect(KANBAN_INDEX_DEFINITIONS.activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: { boardId: 1, createdAt: -1, _id: -1 } }),
        expect.objectContaining({ key: { cardId: 1, createdAt: -1, _id: -1 } }),
      ]),
    );
    expect(KANBAN_INDEX_DEFINITIONS.imports).toContainEqual(
      expect.objectContaining({
        key: { source: 1, sourceHash: 1 },
        unique: true,
      }),
    );
    expect(KANBAN_INDEX_DEFINITIONS.attachments).toContainEqual(
      expect.objectContaining({
        key: { boardId: 1, cardId: 1, archivedAt: 1 },
      }),
    );
  });
});

describe("buildDefaultBoardDocument", () => {
  it("creates the shared Team Agents board with the fixed four-lane workflow", () => {
    const board = buildDefaultBoardDocument(config);

    expect(board).toMatchObject({
      _id: "team-agents",
      slug: "team-agents",
      title: "Team Agents",
      lanes: KANBAN_LANES,
    });
    expect(board.createdAt).toBeInstanceOf(Date);
    expect(board.updatedAt).toBeInstanceOf(Date);
  });
});

describe("validateKanbanAuditEnvelope", () => {
  it("requires an audit envelope before repository writes can proceed", () => {
    expect(() => validateKanbanAuditEnvelope(undefined)).toThrow(
      "Kanban audit envelope is required",
    );
  });

  it("requires an audit actor before repository writes can proceed", () => {
    expect(() =>
      validateKanbanAuditEnvelope({ actor: undefined } as unknown as Parameters<
        typeof validateKanbanAuditEnvelope
      >[0]),
    ).toThrow("Kanban audit actor is required");
  });

  it("requires actor identity before repository writes can proceed", () => {
    expect(() =>
      validateKanbanAuditEnvelope({
        actor: {
          type: "system",
          id: "",
        },
      }),
    ).toThrow("Kanban audit actor id is required");
  });
});
