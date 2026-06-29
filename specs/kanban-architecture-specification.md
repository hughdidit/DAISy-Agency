# DAISy Kanban Board Architectural Specification

## Mission

Build a finished DAISy-owned Kanban board in the Control UI portal as part of the `Agent` navigation group. The board replaces Trello for Hughdidit LLC operations while preserving Trello-like work management, agent-safe automation, and a durable audit trail.

Primary outcomes:

- Human operators can manage Hughdidit team work inside Control UI without Trello seats.
- DAISy agents, including Codex, can operate the board through authenticated gateway APIs, tools, and a bundled skill.
- Every material board transaction is visible in the board Activity panel and preserved in append-only activity storage.

Success metrics:

- All Kanban PRDs are implemented, PR'd, merged to `daisy/dev`, deployed to staging, and verified.
- Control UI exposes `Agent > Kanban` with four lanes: `To Do`, `In Progress`, `Review`, and `Done`.
- MongoDB is the source of truth for cards, activity, imports, and attachment metadata.
- Agents can pick up `readyForCodex` work by priority and age, then hand off to `Review` or complete to `Done`.

## Context

The current repo is DAISy-Agency, a DAISy-branded fork of OpenClaw. Control UI is a Lit/Vite frontend served by the gateway. Gateway operations use typed RPC methods, protocol schemas, method scopes, and server-method handlers. Agent tools are brokered through the gateway/tool catalog rather than direct datastore access.

The feature must follow `../AGENTS.md`:

- Create feature branches from `daisy/dev`.
- Use Git for Windows for git operations.
- Do not work directly on `daisy/dev` or `daisy/main`.
- Use PRs, CI, code review, staging dry-run, staging deploy, and `verify.yml`.
- Prefer TDD and real-behavior tests.
- Do not add mock-based tests or mock infrastructure.
- Keep changes issue-sized, even when a PRD needs multiple PRs.

## Product Scope

In scope:

- A single shared board named `Team Agents`.
- Four fixed workflow lanes: `To Do`, `In Progress`, `Review`, and `Done`.
- A right-side Activity panel modeled after the supplied Linear-style screenshot while using existing Control UI visual language.
- Trello-like cards with title, description, lane, order, priority, assignee, reviewer/input owner, labels, due date, checklist, comments, links, attachments, watchers, custom fields, `readyForCodex`, import metadata, and archive state.
- Card create, read, update, move, comment, checklist, attachment, watcher, archive, and import flows.
- CSV and JSON import from exported Trello data, with preview before write.
- MongoDB persistence in a dedicated Kanban database and collections.
- Gateway RPC API for humans, UI, external operators, and agent tooling.
- Agent tools and a Codex skill for manual and scheduled operation.
- Append-only activity events for auditability and quick visual confirmation.

Out of scope:

- Live Trello synchronization.
- Anonymous board access.
- Direct agent access to MongoDB.
- Hard deletion of cards or activity.
- A standalone REST API separate from existing DAISy gateway RPC patterns.

## Architecture

### Runtime Components

- Control UI renders the board and calls gateway RPC methods through the existing client path.
- Gateway RPC validates inputs with protocol schemas, enforces method scopes, and delegates to a Kanban service.
- The Kanban service owns business rules, activity generation, Trello import mapping, card ordering, and Codex pickup semantics.
- The Kanban repository owns MongoDB access, indexes, optimistic concurrency, and GridFS attachment storage.
- Agent tools call gateway-backed Kanban operations. No tool bypasses gateway auth, authorization, validation, or activity logging.
- The `kanban-codex` skill tells Codex how to pick up, work, hand off, and complete cards.

### Data Storage

MongoDB is required. The default database is `daisy_kanban`, configurable through existing secret/config mechanisms. Kanban storage must not reuse the memory MongoDB database or collections.

Collections:

- `boards`: board identity, lane definitions, board settings, timestamps.
- `cards`: active and archived cards, card metadata, order, assignees, checklist state, custom fields, import ids, version.
- `activity`: append-only audit events keyed by board/card, actor, action, timestamp, and correlation id.
- `imports`: Trello import jobs, preview mapping, status, source hashes, idempotency data.
- `attachments`: attachment metadata, archive state, ownership, content refs.
- GridFS collections for attachment blobs.

Required indexes:

- `cards`: `{ boardId: 1, archivedAt: 1, lane: 1, position: 1 }`
- `cards`: `{ boardId: 1, readyForCodex: 1, priorityRank: 1, createdAt: 1 }`
- `cards`: `{ boardId: 1, "import.source": 1, "import.sourceCardId": 1 }` as a partial unique index that only includes documents where both import fields exist. When Trello data lacks a source card id, imports must use a stored source hash plus explicit import idempotency key instead of allowing missing source ids to collide.
- `activity`: `{ boardId: 1, createdAt: -1 }`
- `activity`: `{ cardId: 1, createdAt: -1 }`
- `imports`: `{ source: 1, sourceHash: 1 }`

MongoDB connection rules:

- Connection URI comes from secret-backed configuration or environment, never source code.
- URI values are redacted in logs and errors.
- TLS is required for non-local/non-container production-like MongoDB endpoints.
- Startup/status reports unavailable Kanban if required MongoDB config is missing.

### Domain Model

Board:

- `id`, `slug`, `name`, `lanes`, `createdAt`, `updatedAt`, `settings`.
- The canonical board slug is `team-agents`.
- Lanes are fixed in order: `todo`, `in_progress`, `review`, `done`.

Card:

- `id`, `boardId`, `key`, `title`, `description`, `lane`, `position`, `priority`, `priorityRank`, `assigneeId`, `assigneeName`, `reviewerId`, `inputOwnerId`, `labels`, `dueAt`, `checklist`, `comments`, `links`, `attachmentIds`, `watchers`, `customFields`, `readyForCodex`, `import`, `archivedAt`, `createdAt`, `updatedAt`, `version`.
- `key` is a human-stable identifier such as `KAN-0001`.
- `version` is required for conflicting updates where stale writes could lose data.

Activity:

- `id`, `boardId`, `cardId`, `actorType`, `actorId`, `actorName`, `action`, `summary`, `metadata`, `correlationId`, `createdAt`.
- Activity is append-only. Corrections are represented by new events.

Import:

- `id`, `source`, `sourceHash`, `status`, `preview`, `mapping`, `createdBy`, `createdAt`, `completedAt`, `error`.
- Imports are idempotent by Trello source card id where available.

### Gateway API

The public API is gateway RPC. Methods:

- `kanban.status`
- `kanban.board.get`
- `kanban.cards.list`
- `kanban.cards.get`
- `kanban.cards.create`
- `kanban.cards.update`
- `kanban.cards.move`
- `kanban.cards.comment`
- `kanban.cards.attachments.add`
- `kanban.cards.attachments.archive`
- `kanban.cards.archive`
- `kanban.activity.list`
- `kanban.import.trello.preview`
- `kanban.import.trello.run`
- `kanban.codex.pickNext`
- `kanban.codex.handoff`
- `kanban.codex.complete`

Method scope policy:

- Read scope: `kanban.status`, board/card/activity reads, import preview.
- Write scope: create/update/move/comment/archive/import run, Codex pickup/handoff/complete.
- Admin scope is reserved for future board-level configuration and destructive maintenance. Card hard delete is not implemented.

RPC requirements:

- All inputs are schema validated.
- List responses are bounded and paginated.
- Mutations return the updated card plus the generated activity event.
- Mutations include actor attribution from the authenticated caller/tool context.
- Write methods fail closed when Kanban storage is unavailable.

### Control UI

Navigation:

- Add `kanban` to the top-level `Agent` navigation group.
- Route path is `/kanban`.
- English label is `Kanban`; subtitle references agent work tracking.

Layout:

- Main content uses a board grid with lanes `To Do`, `In Progress`, `Review`, and `Done`.
- Right side is an Activity rail showing recent activity with actor, badge/action, card title, summary, and timestamp.
- Cards show title, labels, priority, due date, checklist/comment/attachment counts, assignee/reviewer, and `readyForCodex`.
- Card detail opens in a Control UI-native panel/modal with Trello-like fields and actions.

Interactions:

- Create/edit/move/archive cards.
- Drag and reorder cards, with keyboard-accessible move controls.
- Filter/search by text, lane, assignee, label, priority, due date, archived state, and `readyForCodex`.
- Import Trello JSON/CSV through preview and run steps.
- Activity updates after every mutation.

Design constraints:

- Use existing Control UI color variables, spacing, typography, panels, buttons, menus, and empty/error states.
- Keep cards compact and scan-friendly.
- Do not use marketing/landing-page composition.
- Ensure mobile and desktop layouts avoid text overlap and preserve useful board scanning.

### Agent Tools And Skills

Tooling:

- `kanban_read`: status, board, cards, card detail, and activity.
- `kanban_write`: create, update, move, comment, archive, checklist, watcher, and attachment metadata operations.
- `kanban_pick_task`: atomically claim the next eligible Codex-ready card.
- `kanban_handoff`: move work to `Review`, set reviewer/input owner, and log handoff.
- `kanban_complete`: move work to `Done` and log completion.

Codex skill:

- Add `../skills/kanban-codex/SKILL.md`.
- Skill instructs Codex to use Kanban tools, never direct MongoDB.
- Scheduled pickup flow uses `kanban_pick_task`.
- Only cards marked `readyForCodex` are eligible.
- Pick order is highest priority, then oldest created card.
- Completed work moves to `Done` without human approval when acceptance criteria are met.
- Work needing review/input moves to `Review` with reviewer/input owner and a concise activity entry.

### Trello Import

Supported sources:

- Trello board JSON export.
- Trello CSV export.

Import behavior:

- Preview maps source lists to DAISy lanes before write.
- Default mapping recognizes todo/backlog, doing/progress, review/input, and done/complete names.
- Unknown Trello lists map to `To Do` and retain original list metadata.
- Labels, due dates, members, checklists, comments/actions, links, attachments, custom fields, and card ids are preserved where present.
- Binary attachments are stored in GridFS only when included or uploaded; URL-only attachments remain links/metadata.
- Re-running the same import updates/links existing imported cards instead of duplicating them.
- Every imported card and import run emits activity.

## Security And Privacy

- Board access requires existing DAISy gateway authentication.
- Agent access is scoped by tool policy and gateway method scopes.
- All writes are attributed to a human, agent, API caller, import job, or system actor.
- User-authored markdown/text is sanitized before rendering.
- Attachment names, metadata, and content are validated and bounded.
- Secrets, MongoDB URIs, import files, and private board content are not logged unnecessarily.
- Archive hides cards from default views but preserves auditability.

## Performance And Reliability

- Default board load supports at least 500 active and 2,000 archived cards using bounded queries.
- Activity rail loads recent activity with pagination.
- Card moves are atomic and keep lane ordering stable.
- Codex pickup is atomic so scheduled agents do not claim the same card.
- Import jobs are idempotent and resumable through stored source hashes and source card ids.
- Kanban status reports configuration, connectivity, and degraded/unavailable states without exposing secrets.

## Test Strategy

- Unit tests for schemas, lane rules, card ordering, priority ordering, activity generation, import mapping, and status redaction.
- Repository integration tests against a real MongoDB service, not mock persistence.
- Gateway RPC tests for method scopes, validation, auth/write failure behavior, and mutation responses.
- UI browser tests for navigation, board rendering, card detail, filters, Activity panel, drag/reorder, and responsive layout.
- Tool tests for read/write/pickup/handoff/complete behavior through gateway-backed paths.
- Import tests for Trello JSON/CSV preview, run, idempotency, mapping, and activity.
- Security tests for no hard delete, activity append-only behavior, redacted MongoDB errors, and sanitized UI rendering.

## Deployment And Operations

- Every issue-sized slice is developed on a branch from `daisy/dev`.
- Every slice is PR'd to `daisy/dev`, passes CI, resolves review, runs `code-review-and-quality`, squash-merges, deploys dry-run to staging, deploys real to staging, and runs `verify.yml`.
- The final PRD reconciliation compares PRD files, backlog status, merged PR evidence, and staging evidence to ensure no Kanban PRD or PRD slice was skipped.
- The final global review runs `code-review-and-quality` across the whole Kanban implementation and resolves all Critical and required findings through follow-up issue-sized PRs.

## Risks And Constraints

- Prior unmerged Kanban remote-branch work is obsolete for this project and must not be adopted or used as implementation source material unless a future user request explicitly opens a separate candidate-review task.
- MongoDB availability and credentials are required before the feature can operate in staging.
- Attachment support must remain bounded to prevent storage abuse.
- Importing Trello data can expose private task content, so import files and errors must be handled as sensitive operational data.
- Large PRDs must be split into issue-sized PRs to preserve review quality.
