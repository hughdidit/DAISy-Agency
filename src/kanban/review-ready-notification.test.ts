import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  formatReviewReadyMessage,
  sendKanbanReviewReadyNotification,
} from "./review-ready-notification.js";
import type { KanbanActivity, KanbanCard } from "./types.js";

function card(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: "card-1",
    boardId: "team-agents",
    title: "Review-ready card",
    description: undefined,
    lane: "review",
    position: 0,
    priority: "normal",
    priorityRank: 2,
    version: 3,
    assignee: "codex-desktop",
    reviewer: "ops-reviewer",
    inputOwner: undefined,
    labels: [],
    dueAt: undefined,
    checklist: [],
    comments: [],
    links: [],
    attachments: [],
    watchers: [],
    customFields: {},
    readyForCodex: false,
    import: undefined,
    createdAt: new Date("2026-07-08T00:00:00.000Z"),
    updatedAt: new Date("2026-07-08T00:10:00.000Z"),
    ...overrides,
  };
}

function activity(): KanbanActivity {
  return {
    id: "activity-1",
    boardId: "team-agents",
    cardId: "card-1",
    action: "card_handoff",
    summary: "Ready for review",
    actor: {
      type: "agent",
      id: "codex-desktop",
      name: "Codex Desktop",
    },
    metadata: {},
    createdAt: new Date("2026-07-08T00:10:00.000Z"),
  };
}

describe("Kanban review-ready notification", () => {
  it("skips Discord notification when disabled", async () => {
    await expect(
      sendKanbanReviewReadyNotification({
        cfg: {} as OpenClawConfig,
        card: card(),
        activity: activity(),
        summary: "Ready for review",
      }),
    ).resolves.toEqual({ attempted: false, reason: "disabled" });
  });

  it("requires a Discord channel when enabled", async () => {
    await expect(
      sendKanbanReviewReadyNotification({
        cfg: {
          kanban: {
            notifications: {
              reviewReady: {
                discord: {
                  enabled: true,
                },
              },
            },
          },
        } as OpenClawConfig,
        card: card(),
        activity: activity(),
        summary: "Ready for review",
      }),
    ).resolves.toEqual({ attempted: false, reason: "missing-channel" });
  });

  it("formats concise non-secret review-ready messages", () => {
    const message = formatReviewReadyMessage({
      cfg: {
        kanban: {
          notifications: {
            reviewReady: {
              discord: {
                enabled: true,
                channelId: "1164617434972553278",
                accountId: "default",
                kanbanUrl: "http://127.0.0.1:18889/kanban",
              },
            },
          },
        },
      } as OpenClawConfig,
      card: card(),
      activity: activity(),
      summary: "Implemented MCP bridge and tests",
    });

    expect(message).toContain("DAISy Kanban card ready for review: Review-ready card");
    expect(message).toContain("Card: card-1");
    expect(message).toContain("Reviewer: ops-reviewer");
    expect(message).toContain("By: Codex Desktop");
    expect(message).toContain("Summary: Implemented MCP bridge and tests");
    expect(message).toContain("Board: http://127.0.0.1:18889/kanban");
    expect(message).not.toContain("mongodb");
    expect(message).not.toContain("OPENCLAW_GATEWAY_TOKEN");
  });
});
