# PRD-001 Kanban MongoDB Foundation

Target executor: Codex Desktop, model: gpt-5.5 High thinking

## 1) Mission

Build: MongoDB-backed Kanban foundation.

Primary outcome: establish the dedicated Kanban source of truth, domain types, repository, indexes, activity append service, and status behavior.

Success metrics:

- Kanban uses a dedicated MongoDB database and collections.
- The default board is bootstrapped with `To Do`, `In Progress`, `Review`, and `Done`.
- Activity is append-only.
- Cards and attachments are archived, not hard deleted.
- Real MongoDB integration tests cover repository behavior.

## 2) Context

This PRD implements the storage layer described in `../specs/kanban-architecture-specification.md`. It must not implement Control UI, agent tools, or Trello import UI.

Existing repo/project:

- TypeScript ESM.
- Gateway runtime already has config/status patterns.
- MongoDB is present in deployment context for other capabilities, but Kanban must use its own database/collections.

## 3) Hard Requirements

- Add Kanban config resolution for MongoDB URI/database/collection names using existing repo conventions.
- Redact MongoDB URI and credentials in all logs/errors/status.
- Require TLS for non-local/non-container MongoDB endpoints.
- Add Kanban domain types for board, lane, card, checklist item, comment, activity, import, attachment metadata, and a typed actor/audit envelope.
- Add repository operations for board bootstrap, card CRUD, move ordering, archive, activity append/list, status, and index creation.
- Add atomic Codex pickup repository primitive for `readyForCodex` cards by priority then oldest.
- Add GridFS plumbing for attachment content storage without exposing binary upload through RPC yet.
- Add real-behavior tests against a real MongoDB service or approved repo integration test harness.
- Require repository-facing write payloads and activity append payloads to carry an actor/audit envelope for human, agent, API, import, and system writes.

## 4) Non-Goals

- Gateway RPC handlers.
- UI.
- Agent tools or skills.
- Trello import execution.
- Separate REST API.

## 5) Inputs You Can Assume

- Users: gateway handlers and future tools/UI.
- Environment: containerized DAISy dev/test/staging.
- Tech stack: TypeScript, MongoDB Node driver, existing repo config patterns.
- Data/storage: dedicated `daisy_kanban` database by default.
- Security: least privilege, no secret logging, no direct agent DB access.
- Performance: indexes support 500 active and 2,000 archived cards.

## 6) Required Deliverables

1. Domain types.
2. MongoDB config/status resolver.
3. Repository and service layer foundation.
4. Index creation.
5. Activity append helper.
6. Archive-only card behavior.
7. Actor/audit envelope shared by write payloads and activity records.
8. Real MongoDB integration tests.
9. Docs/config notes if new environment variables are introduced.

## 7) Output Format

Closeout must include assumptions, implementation plan, changed files, test commands and expected/actual output, and acceptance criteria table.

## 8) Quality Bar

- No mock persistence.
- Storage errors are explicit and redacted.
- Repository methods are bounded and typed.
- Atomic operations are used for move/pickup/concurrency-sensitive flows.

## 9) Acceptance Criteria

| Criterion              | Required result                                          |
| ---------------------- | -------------------------------------------------------- |
| Dedicated storage      | Kanban uses dedicated DB/collections                     |
| Board bootstrap        | `team-agents` board exists with four lanes               |
| Archive policy         | No hard delete API in repository                         |
| Activity               | Every mutation helper can append activity                |
| Codex pickup primitive | Atomic priority-then-oldest claim exists                 |
| Actor attribution      | Write and activity payloads require actor/audit envelope |
| Tests                  | Real MongoDB integration coverage added                  |

## 10) Project-Specific Details

If this PRD is too broad for one review, split into issue-sized PRs: config/types, repository/indexes, and integration tests.
