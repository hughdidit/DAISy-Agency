# Codex Desktop Kanban MCP

Use the DAISy Kanban MCP server when Codex Desktop should pick up cards from the DAISy Kanban board. Codex Desktop schedules the recurring run; OpenClaw Gateway remains the only service that reads or writes Kanban MongoDB.

## MCP Server

Build output provides a stdio MCP server at:

```text
dist/tools/daisy-kanban-mcp/server.js
```

Add this to Codex Desktop `config.toml`, adjusting the path to the DAISy checkout or built artifact:

```toml
[mcp_servers.daisy_kanban]
command = "node"
args = ["D:\\CodexWorking\\DAISy-Agency\\DAISy-Agency\\dist\\tools\\daisy-kanban-mcp\\server.js"]
startup_timeout_sec = 20
tool_timeout_sec = 120
```

Optional environment values:

```powershell
$env:DAISY_KANBAN_GATEWAY_URL = "ws://127.0.0.1:18889"
$env:OPENCLAW_GATEWAY_TOKEN = "<gateway token if token auth is enabled>"
$env:DAISY_KANBAN_AGENT_ID = "codex-desktop"
$env:DAISY_KANBAN_AGENT_NAME = "Codex Desktop"
```

The MCP server exposes:

- `kanban_read`
- `kanban_write`
- `kanban_pick_task`
- `kanban_handoff`
- `kanban_complete`

It also exposes the granular tool surface used by the Site and ChatGPT Work:

- `kanban_status`, `kanban_list_cards`, `kanban_get_card`, `kanban_list_activity`
- `kanban_create_card`, `kanban_update_card`, `kanban_move_card`, `kanban_comment_card`, `kanban_archive_card`

These tools call OpenClaw Gateway RPC. They do not accept MongoDB credentials and must not be configured with `KANBAN_MONGODB_URI`.

## Codex Desktop Automation

Create a Codex Desktop recurring automation that runs every 30 minutes with
`worker: "codex"` and agent id `codex-desktop`. ChatGPT Work uses the same
interval with `worker: "work"` and agent id `chatgpt-work` through the private
Secure MCP Tunnel. The Site is owner-only and calls the authenticated bridge
routes server-side; it never receives a gateway token.

Prompt:

```text
Use the daisy-kanban-operator skill. Read DAISy Kanban status, then call `kanban_pick_task` with `worker: "codex"` and `agentId: "codex-desktop"` to claim the next eligible ready card, work it, then reread its current version and complete or hand off with evidence.
```

Expected behavior:

- `kanban_pick_task` claims the next `readyForCodex` card by priority, then oldest.
- Claimed cards move to `in_progress` and are assigned to Codex Desktop.
- `kanban_handoff` moves cards to `review` when human review or input is needed.
- `kanban_complete` moves finished cards to `done`.
- Final summaries should include concrete evidence such as changed files, tests, PR ids, deployment ids, or an explicit unverified note.

## Review-Ready Discord Alert

Enable Review-lane alerts in `openclaw.json`:

```json
{
  "kanban": {
    "notifications": {
      "reviewReady": {
        "discord": {
          "enabled": true,
          "channelId": "1164617434972553278",
          "accountId": "default",
          "kanbanUrl": "http://127.0.0.1:18889/kanban"
        }
      }
    }
  }
}
```

The alert is sent only after a successful `kanban_handoff` moves a card to `review`. Failed Discord delivery does not roll back the Kanban handoff; the gateway response metadata reports the notification failure.

## Trello Retirement

Codex Desktop should use DAISy Kanban as its work intake. Trello links and Trello board access are legacy import context and should not be used to pick or complete current work.
