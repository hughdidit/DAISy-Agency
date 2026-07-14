# DAISy Kanban worker schedules

The board is the existing DAISy `Team Agents` board. No Site database or worker
cache is authoritative.

Configure both recurring automations at a 30-minute interval:

| Worker | Agent id | Pickup call |
| --- | --- | --- |
| Codex Desktop | `codex-desktop` | `kanban_pick_task({ worker: "codex", agentId: "codex-desktop" })` |
| ChatGPT Work | `chatgpt-work` | `kanban_pick_task({ worker: "work", agentId: "chatgpt-work" })` |

Each run follows `status → pick → get card → work → reread version → complete or
handoff`. A null pickup is a normal no-work result. An unavailable status ends
the run without retries that could amplify an outage.

The private Site connects to `/v1/*` over an authenticated outbound HTTPS
reverse tunnel. ChatGPT Work connects only to `/mcp` through OpenAI Secure MCP
Tunnel. The bridge binds to `127.0.0.1`, calls Gateway RPC at
`ws://127.0.0.1:18889`, and never has MongoDB credentials.

Required server-only environment values:

```text
DAISY_KANBAN_GATEWAY_URL=ws://127.0.0.1:18889
OPENCLAW_GATEWAY_TOKEN=<gateway credential>
DAISY_KANBAN_BRIDGE_TOKEN=<Sites transport credential>
DAISY_KANBAN_MCP_TOKEN=<Secure MCP Tunnel upstream credential>
DAISY_KANBAN_AGENT_ID=codex-desktop
DAISY_KANBAN_AGENT_NAME=Codex Desktop
```

Store each value in its deployment secret manager. Never put any of these
values in Site client code, browser storage, model context, or card content.
