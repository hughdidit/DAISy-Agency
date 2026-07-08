import type { OpenClawConfig } from "../config/config.js";
import { sendMessage } from "../infra/outbound/message.js";
import type { KanbanActivity, KanbanCard } from "./types.js";

const DEFAULT_KANBAN_URL = "http://127.0.0.1:18889/kanban";

export type KanbanReviewReadyNotificationResult =
  | {
      attempted: false;
      reason: "disabled" | "missing-channel";
    }
  | {
      attempted: true;
      ok: true;
      channel: "discord";
      channelId: string;
      accountId: string;
    }
  | {
      attempted: true;
      ok: false;
      channel: "discord";
      channelId: string;
      accountId: string;
      error: string;
    };

export type KanbanReviewReadyNotificationInput = {
  cfg: OpenClawConfig;
  card: KanbanCard;
  activity: KanbanActivity;
  summary: string;
};

function trim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function formatReviewReadyMessage(input: KanbanReviewReadyNotificationInput): string {
  const actorName = input.activity.actor.name ?? input.activity.actor.id;
  const reviewer = trim(input.card.reviewer);
  const configuredUrl = trim(input.cfg.kanban?.notifications?.reviewReady?.discord?.kanbanUrl);
  const kanbanUrl = configuredUrl ?? DEFAULT_KANBAN_URL;
  return [
    `DAISy Kanban card ready for review: ${input.card.title}`,
    `Card: ${input.card.id}`,
    reviewer ? `Reviewer: ${reviewer}` : undefined,
    `By: ${actorName}`,
    `Summary: ${input.summary}`,
    `Board: ${kanbanUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendKanbanReviewReadyNotification(
  input: KanbanReviewReadyNotificationInput,
): Promise<KanbanReviewReadyNotificationResult> {
  const discord = input.cfg.kanban?.notifications?.reviewReady?.discord;
  if (discord?.enabled !== true) {
    return { attempted: false, reason: "disabled" };
  }
  const channelId = trim(discord.channelId);
  if (!channelId) {
    return { attempted: false, reason: "missing-channel" };
  }
  const accountId = trim(discord.accountId) ?? "default";
  try {
    await sendMessage({
      cfg: input.cfg,
      channel: "discord",
      to: `channel:${channelId}`,
      accountId,
      content: formatReviewReadyMessage(input),
      silent: true,
    });
    return {
      attempted: true,
      ok: true,
      channel: "discord",
      channelId,
      accountId,
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      channel: "discord",
      channelId,
      accountId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
