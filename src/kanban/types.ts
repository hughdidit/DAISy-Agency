export const KANBAN_DEFAULT_BOARD_SLUG = "team-agents";
export const KANBAN_DEFAULT_BOARD_TITLE = "Team Agents";
export const KANBAN_DEFAULT_DATABASE = "daisy_kanban";
export const KANBAN_MAX_ACTIVE_CARD_LIST_LIMIT = 500;
export const KANBAN_MAX_ARCHIVED_CARD_LIST_LIMIT = 2_000;
export const KANBAN_MAX_ATTACHMENT_BYTES = 5_000_000;
export const KANBAN_MAX_ATTACHMENT_BASE64_LENGTH = Math.ceil(KANBAN_MAX_ATTACHMENT_BYTES / 3) * 4;
export const KANBAN_MAX_ATTACHMENTS_PER_CARD = 100;
export const KANBAN_MAX_ATTACHMENT_FILENAME_LENGTH = 255;
export const KANBAN_WORKER_LABELS = ["worker:codex", "worker:work", "worker:any"] as const;
export type KanbanWorker = "codex" | "work";

export function normalizeKanbanLabels(labels: string[] | undefined): string[] {
  const normalized: string[] = [];
  const workers = new Set<string>();
  for (const raw of labels ?? []) {
    const label = raw.trim();
    if (!label) {
      continue;
    }
    const lower = label.toLowerCase();
    if ((KANBAN_WORKER_LABELS as readonly string[]).includes(lower)) {
      workers.add(lower);
      continue;
    }
    normalized.push(label);
  }
  if (workers.size > 1) {
    throw new Error("Kanban card cannot contain conflicting worker labels");
  }
  return [...normalized, ...workers];
}

export const KANBAN_LANES = [
  { id: "todo", title: "To Do", order: 0 },
  { id: "in_progress", title: "In Progress", order: 1 },
  { id: "review", title: "Review", order: 2 },
  { id: "done", title: "Done", order: 3 },
] as const;

export type KanbanLaneId = (typeof KANBAN_LANES)[number]["id"];
export type KanbanPriority = "urgent" | "high" | "normal" | "low";
export type KanbanActorType = "human" | "agent" | "api" | "import" | "system";

export type KanbanActorEnvelope = {
  type: KanbanActorType;
  id: string;
  name?: string;
};

export type KanbanAuditEnvelope = {
  actor: KanbanActorEnvelope;
  correlationId?: string;
  reason?: string;
  occurredAt?: Date;
};

export type KanbanBoard = {
  id: string;
  slug: string;
  title: string;
  lanes: KanbanLane[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
};

export type KanbanLane = {
  id: KanbanLaneId;
  title: string;
  order: number;
};

export type KanbanChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type KanbanComment = {
  id: string;
  body: string;
  actor: KanbanActorEnvelope;
  createdAt: Date;
  updatedAt?: Date;
};

export type KanbanAttachmentMetadata = {
  id: string;
  fileId?: string;
  filename: string;
  contentType?: string;
  byteSize: number;
  createdAt: Date;
  archivedAt?: Date;
  import?: KanbanImportReference;
};

export type KanbanImportReference = {
  source: "trello";
  sourceBoardId?: string;
  sourceCardId?: string;
  sourceListId?: string;
  sourceUrl?: string;
  importRunId?: string;
};

export type KanbanCard = {
  id: string;
  boardId: string;
  title: string;
  description?: string;
  lane: KanbanLaneId;
  position: number;
  priority: KanbanPriority;
  priorityRank: number;
  version: number;
  assignee?: string;
  reviewer?: string;
  inputOwner?: string;
  labels: string[];
  dueAt?: Date;
  checklist: KanbanChecklistItem[];
  comments: KanbanComment[];
  links: string[];
  attachments: KanbanAttachmentMetadata[];
  watchers: string[];
  customFields: Record<string, unknown>;
  readyForCodex: boolean;
  import?: KanbanImportReference;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
};

export type KanbanActivityAction =
  | "board_bootstrap"
  | "card_create"
  | "card_update"
  | "card_move"
  | "card_comment"
  | "card_archive"
  | "card_pickup"
  | "card_handoff"
  | "card_complete"
  | "import_preview"
  | "import_run"
  | "attachment_add"
  | "attachment_archive";

export type KanbanActivity = {
  id: string;
  boardId: string;
  cardId?: string;
  action: KanbanActivityAction;
  summary: string;
  actor: KanbanActorEnvelope;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export type KanbanImportRun = {
  id: string;
  source: "trello";
  sourceHash: string;
  status: "previewed" | "running" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  summary?: Record<string, unknown>;
};
