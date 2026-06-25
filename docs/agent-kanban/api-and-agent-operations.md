# Agent Kanban API and Operations Plan

This document describes the intended operator and agent-facing contract for the Agent Kanban Board. It is a planning artifact for the implementation PRDs and must be kept current as code lands.

## Human UI

- Control UI navigation: `Agent > Kanban`.
- Route: `/kanban`.
- Card route: `/kanban/cards/:cardId` or equivalent query/hash route that fits existing Control UI routing.
- Humans use existing Control UI authentication/pairing.

## Agent API surface

Agents should never read or write the Kanban datastore directly. They use gateway-scoped methods/tools.

Planned gateway RPC methods:

- `kanban.board.get`
- `kanban.cards.list`
- `kanban.cards.get`
- `kanban.cards.create`
- `kanban.cards.update`
- `kanban.cards.move`
- `kanban.cards.archive`
- `kanban.cards.delete` — admin-only and confirmation-gated
- `kanban.checklists.addItem`
- `kanban.checklists.updateItem`
- `kanban.checklists.deleteItem`
- `kanban.comments.add`
- `kanban.comments.list`
- `kanban.notifications.list`
- `kanban.automation.runDueReminders`

## Tooling expectations

Expose sandbox-safe agent tools after the backend RPC exists. Candidate tools:

- `kanban_read`: list lanes/cards, get card detail, list comments/activity.
- `kanban_write`: create/update/move cards, add comments, manage checklist items, assign members.
- `kanban_admin`: archive/delete/reconcile operations, only available to admin-scoped identities and confirmation-gated.

Tool responses should be compact, structured, and stable enough for agents to use in task workflows.

## Permission model

- Team agents: read, create, update, move, comment, checklist management, assignment.
- Admin identities: all team permissions plus archive/delete and manual reconciliation.
- Destructive actions require confirmation and activity logging.
- API keys, if required, are scoped to an agent identity and stored as hashes or secret references only.

## Agent skill behavior

The bundled Kanban skill should instruct agents to:

1. Read the card before modifying it.
2. Prefer comments for status/context updates.
3. Move cards only when the work state actually changes.
4. Mark checklist items complete only after verification.
5. Never delete/archive unless explicitly asked and admin-authorized.
6. Use due dates and assignees conservatively.
7. Record enough activity/comment context for Hugh and DAISy to audit the decision.

## Notifications

Notification channels:

- In-app notification feed.
- Email, when configured.
- Discord, when configured to a private Hughdidit/DAISy destination.

Notification events:

- Card assigned.
- Due date approaching.
- Card overdue.
- Mention/comment on card.
- Card moved to blocked/review/completed.
- Calendar sync failure or notification delivery failure for admins.

## Google Calendar sync

- Cards with due dates create all-day events on the configured group Google Calendar.
- Event title should include the card title and optionally a short board prefix.
- Event description should include the canonical card URL, assignees, lane, and sanitized description summary.
- Updating card title/due date/assignees should update the event.
- Removing the due date or archiving/deleting the card should remove or cancel the event according to the chosen calendar policy.
- Sync failures should be visible, retryable, and non-blocking for card save.

## Configuration to confirm during implementation

- Group Google Calendar ID/config key.
- Discord channel/destination config key.
- Email sender and recipient mapping.
- Admin identity source.
- Existing datastore/migration mechanism to use.
