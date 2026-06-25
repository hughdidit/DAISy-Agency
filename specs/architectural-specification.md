# Architectural Specification: Agent Kanban Board

## Confirmed Intent

- Outcome: Build a private, Trello-like Kanban board inside the existing DAISy-Agency Control UI portal. Cards begin in a backlog lane and can be dragged through workflow lanes to show status. Cards support descriptions, due dates, checklist subtasks, assignees, comments, links, activity, notifications, automation, and agent-safe API operations.
- User: Primary user is DAISy and the agent team. Hugh is the secondary human user. All Hughdidit team agents may operate the board through sandbox-safe tooling; destructive actions such as deletion are admin-only.
- Why now: Trello seat pricing has become cost-prohibitive at roughly $12 per seat per month. A private, repo-owned Kanban system removes that recurring per-seat dependency.
- Success: The finished product replaces Hugh's current Trello workflow for team task management, operates inside Control UI with matching styling, is private to the Hughdidit domain/team, is usable by agents through API/tools/skills, has no known defects, and passes the project test suite and CI/CD workflow.
- Constraint: Use the same technology stack and repo workflow as `hughdidit/DAISy-Agency`: Lit/Vite Control UI frontend, TypeScript gateway RPC/backend patterns, existing auth/config conventions, feature branches from `daisy/dev`, PR-only merge, GitHub Actions CI/CD, and sandbox/worktree development.
- Out of scope: Multi-board workspaces, analytics, dedicated mobile app, offline mode, and advanced permissions beyond team access plus admin-only destructive operations. Future enhancements may be handled as new projects.

## Product Scope

### In scope

- New Control UI navigation entry under the Agent section, tentatively `Agent > Kanban` at `/kanban`.
- Trello-inspired board view matching the attached snapshots structurally while using existing Control UI colors, typography, spacing, icons, panel surfaces, and interaction patterns.
- Default single private board for Hughdidit agent operations.
- Workflow lanes: Backlog, Todo, In Progress, Blocked, For Review, Integration, Completed.
- Board columns with card counts, add-card affordances, drag/drop lane movement, and responsive horizontal scrolling.
- Card creation/editing with title, description, lane, assignees, labels/tags, due date, checklist subtasks, links/attachments-by-URL, comments, and activity history.
- Card detail modal/panel modeled after Trello: status selector, title, action row, dates/overdue badge, description, checklist progress, members/assignees, comments/activity stream.
- Assign cards to Hugh or any configured agent identity.
- Linkable cards with stable canonical URLs and copy-link affordance.
- Due-date display, overdue indication, and due-date reminder scheduling.
- Basic automation:
  - Move a card to Completed when all checklist items are complete and the card is configured for auto-complete.
  - Send due-date reminders.
  - Create/update/delete an all-day event on the configured group Google Calendar when a card has a due date.
- Notifications: in-app, email, and Discord when configured.
- Agent API/tooling/skill support for listing board state, creating/updating cards, moving cards, managing checklist items, assigning cards, adding comments, and querying overdue/due-soon work.
- Persistence, migrations, and tests appropriate to existing DAISy gateway datastore conventions.
- CI verification through existing GitHub Actions. Deployment follows the repo's staging/production promotion process.

### Out of scope

- Multiple boards/workspaces.
- Analytics/reporting dashboards.
- Native mobile app or mobile-specific workflow.
- Offline-first behavior or local conflict resolution.
- Advanced role/permission system beyond team members plus admin-only deletion/archive controls.
- Import/migration from Trello unless added as a later project.
- Rich file hosting for attachments. The product may support URL attachments/links; binary upload/storage is out of scope unless already covered by existing Control UI file facilities.

### Primary workflows

1. Hugh or an agent opens Control UI and navigates to `Agent > Kanban`.
2. Hugh or an agent creates a card in Backlog/Todo with title, description, optional due date, assignees, labels, links, and checklist subtasks.
3. A human user drags the card across lanes as work progresses.
4. An agent uses a sandbox-safe Kanban tool/API call to inspect, create, move, comment, assign, or complete checklist items.
5. The system marks overdue cards and sends due-date reminders through configured channels.
6. The system mirrors due-date cards to the configured group Google Calendar as all-day events.
7. When checklist items are complete and auto-complete is enabled for the card or board policy, the system moves the card to Completed and records activity.
8. Hugh or an admin archives/deletes cards only through admin-gated UI/API flows.

## Architecture

### Runtime

- DAISy-Agency gateway remains the source of truth and hosts the Control UI.
- The UI communicates through the existing `GatewayBrowserClient.request(method, params)` RPC pattern.
- Backend methods live under `src/gateway/server-methods/` or an adjacent existing server-method registry location discovered during implementation.
- The implementation must follow repo-local `AGENTS.md`: no direct commits to `daisy/dev`, feature branch/worktree only, PR-only merge, tests real-behavior first, no new mock infrastructure without explicit approval.

### Frontend

- Stack: Lit 3 + Vite in `ui/`.
- Add `kanban` to the `Tab` union, path map, icon map, Agent tab group, labels/subtitles, and tab rendering.
- Add a new view module, tentatively `ui/src/ui/views/kanban.ts`, plus supporting controller/types modules.
- Visual design:
  - Use existing Control UI CSS variables/surfaces rather than Trello colors directly.
  - Board background should feel native to Control UI while supporting readable lane color accents.
  - Lane headers include title, count, quick actions, and add-card button.
  - Cards use compact dark panel surfaces with title, labels, due-date badge, comment/checklist counts, assignee avatars/initials, and overdue state.
  - Detail panel/modal uses the second snapshot as structure: status selector, title, action buttons, dates, description, checklist progress, comments/activity.
- Interactions:
  - Keyboard-accessible card creation/editing and lane movement.
  - Pointer drag/drop for card lane changes and ordering.
  - No raw `window.open`; follow existing external-link utilities.
  - Sanitize/render markdown using existing Control UI markdown/sanitization conventions.

### Backend

- Add a Kanban domain module under `src/kanban/` or a closely aligned existing domain folder.
- Add gateway RPC methods with input validation and typed results. Candidate method set:
  - `kanban.board.get`
  - `kanban.cards.list`
  - `kanban.cards.get`
  - `kanban.cards.create`
  - `kanban.cards.update`
  - `kanban.cards.move`
  - `kanban.cards.archive`
  - `kanban.cards.delete` (admin-only, confirmation-gated)
  - `kanban.checklists.addItem`
  - `kanban.checklists.updateItem`
  - `kanban.checklists.deleteItem`
  - `kanban.comments.add`
  - `kanban.comments.list`
  - `kanban.automation.runDueReminders`
  - `kanban.notifications.list`
- Prefer an internal service layer separate from RPC handlers so UI, CLI/tooling, cron automation, and tests use one behavior path.
- Implement optimistic concurrency or `updatedAt`/version guards for conflicting card edits.
- Activity events are append-only for card history and auditability.

### Data

Minimum entities:

- `KanbanBoard`: `id`, `name`, `scope`, `createdAt`, `updatedAt`, `settings`.
- `KanbanLane`: `id`, `boardId`, `name`, `order`, `kind`, `wipLimit?`, `color?`.
- `KanbanCard`: `id`, `boardId`, `laneId`, `title`, `description`, `position`, `labels`, `assigneeIds`, `dueDate`, `dueTimeZone`, `calendarEventId?`, `autoComplete`, `archivedAt?`, `createdBy`, `createdAt`, `updatedAt`, `version`.
- Card status is derived from the card's `laneId` and lane metadata for display/filtering. `laneId`
  is the persisted source of truth; a separate card `status` field is not persisted.
- `KanbanChecklistItem`: `id`, `cardId`, `title`, `checked`, `order`, `assigneeId?`, `dueDate?`, `createdAt`, `updatedAt`.
- `KanbanComment`: `id`, `cardId`, `authorId`, `body`, `createdAt`, `updatedAt?`.
- `KanbanActivity`: `id`, `cardId`, `actorId`, `type`, `summary`, `metadata`, `createdAt`.
- `KanbanNotification`: `id`, `cardId?`, `recipientId?`, `channel`, `kind`, `status`, `dedupeKey`, `scheduledFor?`, `sentAt?`, `error?`, `createdAt`.
- `KanbanApiCredential` if existing auth patterns require explicit scoped keys; store only hashed/secret-ref material, never plaintext credentials in datastore or logs.

Storage implementation must follow the repo's existing database/persistence conventions. If there are multiple viable stores, prefer the one already used for gateway runtime state with migration coverage and backup behavior.

### Integrations

- Google Calendar:
  - Configurable group calendar ID.
  - Cards with due dates create all-day events using the card title and canonical card URL.
  - Updating/removing a due date updates/deletes the mirrored event.
  - Failures do not block card save; they create visible sync error state and retryable activity/notification records.
  - Requires route-gated Google Workspace credentials/config; no ad-hoc secrets in code.
- Email:
  - Use existing configured email/GWS-capable pathway if present.
  - Send concise assignment/due/reminder notifications with card title, due date, lane, assignees, and link.
- Discord:
  - Use existing Discord integration/channel pattern if configured.
  - Notifications should be channel-safe and avoid leaking card content outside configured Hughdidit-private destinations.
- Cron/automation:
  - Due reminders and calendar reconciliation should run from existing cron/gateway scheduler patterns where available.
  - Manual trigger RPC is useful for tests and admin retry.

### Security and privacy

- Entire board is private to configured Hughdidit/DAISy team identities.
- Reuse existing Control UI gateway auth/session pairing behavior for humans.
- Agent API access uses either the standard in-repo identity/auth pattern or scoped API keys tied to agent identities.
- Agent capabilities:
  - Read board/card state.
  - Create/update/move/comment/check checklist items.
  - Archive/delete only when the agent identity has admin/destructive permission and provides required confirmation.
- Validate all RPC inputs with existing schema utilities.
- Escape/sanitize user-authored markdown/comment content before rendering.
- Do not log secrets, raw API keys, or private notification payloads unnecessarily.
- Preserve audit history for destructive or automation-triggered changes.

### Deployment

- Development occurs in a feature branch/worktree from `daisy/dev`.
- CI/CD runs through GitHub Actions.
- Staging deploys from `daisy/dev` after PR merge per repo workflow.
- Production deploys from promoted branch per existing repo rules.
- Calendar/email/Discord credentials/config must be expressed as documented config/secrets and verified in staging before production.

## Acceptance Criteria

### Functional

- `Agent > Kanban` appears in the Control UI navigation and routes to a Kanban board page.
- Board displays Backlog, Todo, In Progress, Blocked, For Review, Integration, and Completed lanes with card counts.
- Users can create, view, edit, archive, and admin-delete cards.
- Cards can be dragged/reordered between lanes and movement persists after reload.
- Cards include title, description, labels, due date, assignees, checklist subtasks, URL attachments/links, comments, and activity history.
- Card detail UI structurally matches the provided Trello card snapshot while visually matching Control UI.
- Card list UI structurally matches the provided Trello board snapshot while visually matching Control UI.
- Cards expose stable canonical links that open the board/card detail.
- Due dates show due/overdue state.
- Checklist completion can automatically move eligible cards to Completed.
- Due-date reminders are generated and sent through in-app, email, and Discord when configured.
- Cards with due dates sync to the configured group Google Calendar as all-day events.
- Agents can operate the board through sandbox-safe API/tools/skill documentation.

### Security

- Board RPC methods reject unauthenticated or unauthorized requests.
- Destructive operations are admin-only and confirmation-gated.
- Agent scoped credentials cannot exceed configured permissions.
- UI comment/description rendering is sanitized.
- Calendar/email/Discord config does not expose secrets in UI, logs, tests, or docs.

### Performance

- Default board load is fast for at least 500 active cards and 2,000 archived cards.
- Drag/move operations complete without full-page reload.
- Board/card RPC responses are bounded and paginated where needed for comments/activity/archive.

### Operability

- Admin-visible sync errors exist for notification/calendar failures.
- Automation jobs are idempotent using dedupe keys and card/event IDs.
- Activity history records human, agent, and automation actions.
- Docs explain API/tool usage and operational configuration.

### Sandbox-capable

- Agents can use the Kanban tool/skill from sandbox sessions without direct database or host filesystem access.
- Tool methods are policy-gated through gateway APIs.
- No agent needs broad host access to operate cards.

### CI/CD

- Unit and browser/UI tests cover navigation, board rendering, card CRUD, drag/move persistence, checklist completion automation, permissions, and API validation.
- Integration tests cover calendar sync and notification pathways using real-behavior test harnesses or approved local fakes that do not violate repo anti-mock policy.
- Existing `pnpm check`, `pnpm build`, and relevant test commands pass locally or in CI before PR closeout.

## Risks And Decisions

### Decisions

- DAISy is the primary accountable owner for Kanban board operation.
- Kanban notifications should be directed to DAISy.
- Discord notifications should use the default Discord channel or configured webhook.
- DAISy is responsible for adding due-date cards to the group Google Calendar as all-day events.
- Build inside `hughdidit/DAISy-Agency`, not a separate repo.
- Single private board for the finished product; multi-board is future scope.
- Add Kanban to Agent navigation because DAISy/agents are the primary users.
- Use simple checklist subtasks, not first-class subtask cards.
- Include notifications and basic automation in the finished product.
- Mirror due-date cards to a group Google Calendar as all-day events.
- Agent operation must go through scoped API/tools/skills, not direct datastore access.

### Risks

- Existing datastore conventions may constrain implementation shape; PRD-001 must confirm persistence approach before data code lands.
- Calendar/email/Discord integrations may require staging secrets/config not available in sandbox; implementation must surface clear blockers and support disabled/degraded states.
- Drag/drop UI and keyboard accessibility can become large; keep implementation modular and testable.
- The repo has strict anti-mock and branch/CI rules; tests must use real behavior or approved harness patterns.
- A finished-product scope is larger than a demo; PRDs must remain issue-sized and sequential.

### Open questions

- Exact group Google Calendar ID/config key to use.
- Exact Discord destination/channel config for Kanban notifications.
- Exact email sender/recipient mapping for Hugh and agent identities.
- Whether admin identities are already encoded in Control UI config or need a minimal Kanban-specific admin list.
