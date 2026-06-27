export type KanbanMongoCollectionsConfig = {
  boards?: string;
  cards?: string;
  activity?: string;
  imports?: string;
  attachments?: string;
  gridFsBucket?: string;
};

export type KanbanMongoConfig = {
  /** MongoDB connection URI. Prefer ${KANBAN_MONGODB_URI}. */
  uri?: string;
  /** Dedicated Kanban database name. Defaults to daisy_kanban. */
  database?: string;
  /** Optional collection and GridFS bucket overrides. */
  collections?: KanbanMongoCollectionsConfig;
};

export type KanbanBoardConfig = {
  /** Stable board slug. Defaults to team-agents. */
  slug?: string;
  /** Human-facing board title. Defaults to Team Agents. */
  title?: string;
};

export type KanbanConfig = {
  /** Set false to keep Kanban unavailable even when MongoDB config is present. */
  enabled?: boolean;
  mongodb?: KanbanMongoConfig;
  board?: KanbanBoardConfig;
};
