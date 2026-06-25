export const KANBAN_STORE_SCHEMA_VERSION = 1 as const;

export const DEFAULT_KANBAN_BOARD_ID = "hughdidit-agent-kanban" as const;
export const DEFAULT_KANBAN_BOARD_NAME = "Hughdidit Agent Kanban" as const;

export const DEFAULT_KANBAN_LANES = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "Todo" },
  { id: "in-progress", title: "In Progress" },
  { id: "blocked", title: "Blocked" },
  { id: "for-review", title: "For Review" },
  { id: "integration", title: "Integration" },
  { id: "completed", title: "Completed" },
] as const;

export type KanbanLaneKind = (typeof DEFAULT_KANBAN_LANES)[number]["id"];

export type KanbanActor = {
  id: string;
  displayName?: string;
};

export type KanbanBoard = {
  id: string;
  name: string;
  ownerAgentId: string;
  stakeholder: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  archivedAt?: string;
  metadata?: Record<string, unknown>;
};

export type KanbanLane = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  version: number;
  archivedAt?: string;
};

export type KanbanChecklistItem = {
  id: string;
  cardId: string;
  text: string;
  checked: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type KanbanCard = {
  id: string;
  boardId: string;
  laneId: string;
  title: string;
  description?: string;
  position: number;
  assignees: string[];
  labels: string[];
  dueDate?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  checklistItemIds: string[];
  credentialMetadataIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: KanbanActor;
  updatedBy: KanbanActor;
  version: number;
  archivedAt?: string;
};

export type KanbanComment = {
  id: string;
  cardId: string;
  body: string;
  author: KanbanActor;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt?: string;
};

export type KanbanActivityType =
  | "board.initialized"
  | "card.created"
  | "card.updated"
  | "card.moved"
  | "checklist.created"
  | "checklist.updated"
  | "checklist.deleted"
  | "comment.added";

export type KanbanActivity = {
  id: string;
  boardId: string;
  cardId?: string;
  type: KanbanActivityType;
  actor: KanbanActor;
  createdAt: string;
  summary: string;
  data?: Record<string, unknown>;
};

export type KanbanNotification = {
  id: string;
  boardId: string;
  cardId?: string;
  type: string;
  status: "pending" | "sent" | "failed";
  destination?: "discord" | "email" | "in-app";
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  error?: string;
};

export type KanbanScopedCredentialMetadata = {
  id: string;
  boardId: string;
  cardId?: string;
  label: string;
  scope: "board" | "card";
  secretRef?: string;
  hashRef?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: KanbanActor;
};

export type KanbanStoreFile = {
  schemaVersion: typeof KANBAN_STORE_SCHEMA_VERSION;
  boards: Record<string, KanbanBoard>;
  lanes: Record<string, KanbanLane>;
  cards: Record<string, KanbanCard>;
  checklistItems: Record<string, KanbanChecklistItem>;
  comments: Record<string, KanbanComment>;
  activities: KanbanActivity[];
  notifications: Record<string, KanbanNotification>;
  credentialMetadata: Record<string, KanbanScopedCredentialMetadata>;
};

export type KanbanBoardSnapshot = {
  board: KanbanBoard;
  lanes: KanbanLane[];
  cards: KanbanCard[];
};

export type KanbanCardDetail = {
  card: KanbanCard;
  checklistItems: KanbanChecklistItem[];
  comments: KanbanComment[];
  activities: KanbanActivity[];
};
