---
name: trello
description: Manage Trello boards, lists, and cards through the brokered Trello toolkit.
homepage: https://developer.atlassian.com/cloud/trello/rest/
metadata:
  {
    "openclaw":
      { "emoji": "📋", "requires": { "config": ["plugins.entries.trello-toolkit.enabled"] } },
  }
---

# Trello Skill

Use the brokered `trello_*` tools to work with Trello. Do not run Trello `curl`
commands directly from a sandbox; Trello credentials stay in the gateway and are
never exposed as sandbox environment variables.

## Tools

### `trello_status`

Check Trello config, credential presence, route binding, and optional account
health.

Use `includeAccount: true` only when you need a live Trello account smoke.

### `trello_read`

Read boards, lists, and cards.

- `list_boards`: no IDs required.
- `list_lists`: requires `boardId`.
- `list_cards`: requires `listId`.
- `get_card`: requires `cardId`.

### `trello_write`

Create, move, comment on, or archive cards.

- `create_card`: requires `listId`, `name`, optional `desc`, and `confirm: true`.
- `move_card`: requires `cardId`, `targetListId`, and `confirm: true`.
- `add_comment`: requires `cardId`, `text`, and `confirm: true`.
- `archive_card`: requires `cardId` and `confirm: true`.

Writes also require `plugins.entries.trello-toolkit.config.allowWriteOperations`
and the active agent route to allow the requested tool, action, board, and list.

## Notes

- Board, list, and card IDs can be found from Trello URLs or with the read tools.
- If a tool returns `DENY_POLICY`, check the active agent route in
  `plugins.entries.trello-toolkit.config`.
- If a tool returns `CONFIG_ERROR`, check gateway `TRELLO_API_KEY`,
  `TRELLO_TOKEN`, and the `trello-toolkit` plugin config.
