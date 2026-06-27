# PRD-002 Kanban Gateway RPC API

Target executor: Codex Desktop, model: gpt-5.5 High thinking

## 1) Mission

Build: gateway RPC API for Kanban.

Primary outcome: expose the Kanban service through validated, scoped, authenticated gateway RPC methods used by Control UI, external API callers, and agent tools.

Success metrics:

- All specified `kanban.*` RPC methods are registered and scoped.
- Mutations return updated card data and generated activity events.
- Read/list responses are bounded.
- Auth, validation, and unavailable-storage behavior are covered by tests.

## 2) Context

Depends on PRD-001 storage/service foundation. This PRD follows existing gateway server-method, protocol schema, method list, and method-scope patterns.

## 3) Hard Requirements

- Add protocol schemas and validators for all Kanban RPC inputs/outputs.
- Register methods in server method list/discovery.
- Add method scopes for read and write operations.
- Implement handlers:
  - `kanban.status`
  - `kanban.board.get`
  - `kanban.cards.list`
  - `kanban.cards.get`
  - `kanban.cards.create`
  - `kanban.cards.update`
  - `kanban.cards.move`
  - `kanban.cards.comment`
  - `kanban.cards.archive`
  - `kanban.activity.list`
  - `kanban.import.trello.preview`
  - `kanban.import.trello.run`
  - `kanban.codex.pickNext`
  - `kanban.codex.handoff`
  - `kanban.codex.complete`
- Attribute all writes to the authenticated human, agent, API, import, or system actor.
- Fail closed for missing/unhealthy MongoDB.
- Do not expose hard delete.

## 4) Non-Goals

- UI rendering.
- Tool catalog registration.
- Full Trello binary attachment handling beyond service/API contracts needed for import.

## 5) Inputs You Can Assume

- Users: Control UI, agents, external gateway RPC callers.
- Interfaces: DAISy gateway RPC.
- Security: existing gateway auth/method-scope model.
- Data/storage: PRD-001 Kanban service.
- Compatibility: current Control UI gateway client.

## 6) Required Deliverables

1. Protocol schemas.
2. Server method handlers.
3. Method list registration.
4. Method scope classification.
5. Gateway tests for validation, auth/scope, happy path, and unavailable storage.
6. Minimal API documentation if existing docs patterns require it.

## 7) Output Format

Closeout must include assumptions, implementation plan, changed files, test commands and expected/actual output, and acceptance criteria table.

## 8) Quality Bar

- Inputs are validated before service calls.
- Errors do not leak secrets or raw import content.
- Pagination and limits are enforced.
- Mutation/activity behavior is consistent across handlers.

## 9) Acceptance Criteria

| Criterion          | Required result                         |
| ------------------ | --------------------------------------- |
| Methods registered | All `kanban.*` methods discoverable     |
| Scopes             | Read/write methods classified correctly |
| Validation         | Invalid payloads rejected               |
| Activity           | Mutations return activity event         |
| Codex APIs         | pickup/handoff/complete implemented     |
| Tests              | Gateway tests pass without new mocks    |

## 10) Project-Specific Details

If this PRD is too broad for one PR, split protocol/scopes first, then handlers/tests.
