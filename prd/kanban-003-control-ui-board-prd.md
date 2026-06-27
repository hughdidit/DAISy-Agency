# PRD-003 Kanban Control UI Board

Target executor: Codex Desktop, model: gpt-5.5 High thinking

## 1) Mission

Build: Control UI Kanban board under the `Agent` navigation section.

Primary outcome: humans can operate the DAISy Kanban board in Control UI with a Linear-style board structure and Control UI-native design.

Success metrics:

- `Agent > Kanban` appears and routes to `/kanban`.
- The board shows `To Do`, `In Progress`, `Review`, `Done`, and a right-side Activity rail.
- Users can create, edit, move, filter, archive, and inspect cards.
- Activity updates after board transactions.

## 2) Context

Depends on PRD-001 and PRD-002. Control UI is Lit/Vite and already has navigation, localization, controllers, views, and browser tests.

## 3) Hard Requirements

- Add `kanban` to Control UI tab/navigation/path/icon/localization patterns.
- Add a Kanban controller/client wrapper for gateway RPC calls.
- Add a Kanban view using existing Control UI CSS tokens and components.
- Render four lanes left-to-right with counts and compact card summaries.
- Render a persistent Activity rail on the right.
- Add card detail panel/modal with Trello-like fields.
- Support create, update, move/reorder, comment, archive, filters, and `readyForCodex` controls.
- Provide keyboard-accessible movement controls plus pointer drag/reorder.
- Add responsive behavior for desktop and mobile without overlapping text.
- Add browser/UI tests and screenshots where repo conventions support them.

## 4) Non-Goals

- Backend storage or RPC implementation.
- Agent tool implementation.
- Live Trello sync.

## 5) Inputs You Can Assume

- Users: Hugh and DAISy operators.
- Environment: Control UI served by DAISy gateway.
- Tech stack: Lit 3, Vite, existing Control UI CSS.
- Interfaces: gateway RPC methods from PRD-002.
- Security: UI relies on gateway auth and method scopes.
- Compatibility: current supported browser targets for Control UI.

## 6) Required Deliverables

1. Navigation changes.
2. Kanban types/controller/client.
3. Board view.
4. Card detail panel.
5. Activity rail.
6. Filters and card actions.
7. UI/browser tests.
8. Screenshot or visual verification evidence.

## 7) Output Format

Closeout must include assumptions, implementation plan, changed files, test commands and expected/actual output, screenshots/verification notes, and acceptance criteria table.

## 8) Quality Bar

- UI feels native to Control UI, not a Trello clone.
- No decorative landing page.
- Controls are accessible and predictable.
- Text does not overlap at supported viewports.
- Lists and activity queries are bounded.

## 9) Acceptance Criteria

| Criterion       | Required result                       |
| --------------- | ------------------------------------- |
| Navigation      | `Agent > Kanban` visible              |
| Board           | Four lanes render left-to-right       |
| Activity        | Right rail shows recent audit events  |
| Card operations | Create/edit/move/archive/comment work |
| Accessibility   | Keyboard move path exists             |
| Tests           | UI/browser tests pass                 |

## 10) Project-Specific Details

If this PRD is too broad for one PR, split into navigation/shell, card operations, drag/reorder, and visual hardening slices.
