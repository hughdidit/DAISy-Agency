---
name: kanban-codex
description: Use when Codex or a scheduled DAISy agent is asked to pick up, work, hand off, or complete DAISy Kanban cards.
---

# Kanban Codex

Use DAISy Kanban tools to coordinate card work. Never read or write Kanban MongoDB directly.

## Required Tool Path

- Use `kanban_read` for board status, card lists, card detail, and activity.
- Use `kanban_pick_task` to claim work. It claims only `readyForCodex` cards, ordered by priority and then oldest.
- Use `kanban_handoff` when the card needs review or human input.
- Use `kanban_complete` when the card is done.
- Use `kanban_write` only for explicit card create, update, move, comment, or archive actions outside the pickup/handoff/complete flow.
- Do not use database clients, Mongo shells, direct collection reads, or filesystem copies of Kanban data.

## Manual Pickup Workflow

1. Call `kanban_read` with `action:"status"`. If Kanban is unavailable, report the status and stop.
2. Call `kanban_pick_task` with the current agent id/name when available.
3. If no card is returned, report that there is no Codex-ready work and stop.
4. Call `kanban_read` with `action:"get_card"` for the claimed card when more context is needed.
5. Work the card using the repository and user instructions.
6. Before the final Kanban action, use the card's current `version` as `expectedVersion`. Re-read the card first if any Kanban write may have changed it.
7. Leave concise evidence on the board through the final Kanban action:
   - `kanban_complete` with `cardId`, `expectedVersion`, and a summary when the card is finished.
   - `kanban_handoff` with `cardId`, `expectedVersion`, a summary, and `reviewer` or `inputOwner` when review or input is needed.
8. Include the card id and final card version in the chat closeout.

## Scheduled Pickup Workflow

Scheduled jobs should run an isolated Codex turn that follows the manual workflow above. The job prompt should name this skill and instruct the agent to call `kanban_pick_task`; it should not preselect a card outside the gateway.

Recommended cron payload shape:

```json
{
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Use the kanban-codex skill. Check DAISy Kanban status, pick the next readyForCodex card, work it, then complete or hand off with evidence.",
    "timeoutSeconds": 0
  },
  "delivery": {
    "mode": "announce"
  },
  "enabled": true
}
```

## Handoff Rules

- Move blocked, needs-review, or needs-input work to Review with `kanban_handoff`.
- Set `reviewer` when a named reviewer should inspect the result.
- Set `inputOwner` when a named person or team must provide missing information.
- Keep summaries short and factual: what changed, what was verified, and what remains.

## Completion Rules

- Move finished work to Done only through `kanban_complete`.
- The completion summary must include concrete evidence, such as tests, CI run ids, PR ids, deployment ids, or an explicit unverified note.
- Do not mark a card complete when deployment, verification, review, or required human input is still pending.
