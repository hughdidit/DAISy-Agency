# PRD-001 Kanban Persistence and RPC Note

The Agent Kanban backend uses the repo's existing mutable runtime-state pattern: a private JSON
store under the OpenClaw state directory, written atomically with owner-only file permissions.

- Default path: `<state-dir>/kanban/store.json`
- Store schema: `schemaVersion: 1`
- Migration path: reads pass through `migrateKanbanStore`, which normalizes missing sections into
  the current v1 shape before the service writes the file again.
- Source of truth: callers use `KanbanService`; gateway handlers do not access raw store records.
- Default board: `hughdidit-agent-kanban`, lazily created with Backlog, Todo, In Progress,
  Blocked, For Review, Integration, and Completed lanes.

PRD-001 implements the domain model, JSON persistence, gateway handlers, and generated protocol
schema for these initial gateway RPC methods:

- `kanban.board.get`
- `kanban.cards.list`
- `kanban.cards.get`
- `kanban.cards.create`
- `kanban.cards.update`
- `kanban.cards.move`
- `kanban.checklists.addItem`
- `kanban.checklists.updateItem`
- `kanban.checklists.deleteItem`
- `kanban.comments.list`
- `kanban.comments.add`

Card and checklist mutation RPCs require `expectedVersion` for optimistic concurrency where they
update existing records. A stale version returns a retryable invalid-request error so clients can
reload and retry intentionally.

Notification delivery, Google Calendar sync, agent tools, archive/delete operations, and UI views are
reserved for later PRDs.
