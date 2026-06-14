# Trello Toolkit

`trello-toolkit` provides gateway-brokered Trello tools for agents. Trello API
credentials stay in the gateway container; sandboxed agents use `trello_*` tools
and do not receive `TRELLO_API_KEY` or `TRELLO_TOKEN`.

## Configuration

Enable the plugin and bind each Trello-capable agent to a route:

```json
{
  "plugins": {
    "entries": {
      "trello-toolkit": {
        "enabled": true,
        "config": {
          "apiKeyEnvVar": "TRELLO_API_KEY",
          "tokenEnvVar": "TRELLO_TOKEN",
          "allowWriteOperations": true,
          "allowUnboundAgents": false,
          "defaultRoute": null,
          "routes": {
            "ops": {
              "allowedTools": ["trello_status", "trello_read", "trello_write"],
              "allowedActions": [
                "status",
                "list_boards",
                "list_lists",
                "list_cards",
                "get_card",
                "create_card",
                "move_card",
                "add_comment",
                "archive_card"
              ],
              "allowedBoardIds": ["<board-id>"],
              "allowedListIds": ["<list-id>"]
            }
          },
          "agentRouteBindings": {
            "agent:daisy": "ops"
          }
        }
      }
    }
  }
}
```

`allowedBoardIds` and `allowedListIds` are optional. Empty arrays mean the route
does not restrict that resource type. Writes still require `confirm: true` in
the tool call.

## Tools

- `trello_status`: reports route and credential posture, with optional live
  account health when `includeAccount` is true.
- `trello_read`: supports `list_boards`, `list_lists`, `list_cards`, and
  `get_card`.
- `trello_write`: supports `create_card`, `move_card`, `add_comment`, and
  `archive_card`.

For card mutations, the gateway fetches card or list metadata first and applies
the route's board/list policy before calling the Trello write endpoint.

## Migration From The Shell Skill

The old Trello skill used sandbox-local `curl` commands and expected
`TRELLO_API_KEY`, `TRELLO_TOKEN`, and `jq` inside the sandbox. That does not fit
DAISy's sandbox policy because sandbox exec does not inherit gateway secrets and
default sandbox networking is disabled.

Use the brokered `trello_*` tools instead. Agents with explicit
`agents.list[].skills` allowlists must include `trello` for the prompt guidance
to appear.
