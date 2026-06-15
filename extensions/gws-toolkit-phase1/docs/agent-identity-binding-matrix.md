# Agent Identity Binding Matrix

| Subject          | Typical use                 | Workspace identity source                            | Route requirement                         |
| ---------------- | --------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `agent:main`     | default top-level agent     | `agents.list[id="main"].googleWorkspace.email`       | explicit binding recommended              |
| `agent:daisy`    | DAISy Workspace agent       | `agents.list[id="daisy"].googleWorkspace.email`      | explicit binding required for production  |
| `subagent:daisy` | subagent spawned from Daisy | same `agents.list[id="daisy"].googleWorkspace.email` | separate explicit binding; no inheritance |
| `agent:finn`     | Finn Workspace agent        | `agents.list[id="finn"].googleWorkspace.email`       | explicit binding required for production  |
| `agent:research` | read-focused agent          | agent-specific Workspace email when GWS is enabled   | bind to read-only route                   |

Use read-only routes for subjects that do not need writes, even if the plugin
globally enables write services for other identities.

Contacts follow the same subject binding rules as Drive, Gmail, Calendar, Docs,
and Sheets. Grant `gws_contacts_read` to read-only routes when agents only need
to inspect people or contact groups; add `gws_contacts_write` only for routes
that should create/update contacts or contact groups and modify group members.

Subagents do not inherit route access from their parent. A subagent can use the
same delegated Workspace email as its parent agent, but it still needs its own
`subagent:<id>` binding.

Recommended HughDidIt bindings:

```json5
{
  agents: {
    list: [
      { id: "daisy", googleWorkspace: { email: "daisy.ai@hughdidit.com" } },
      { id: "finn", googleWorkspace: { email: "finn.ai@hughdidit.com" } },
    ],
  },
  plugins: {
    entries: {
      "gws-toolkit-phase1": {
        config: {
          workspaceIdentityDomains: ["hughdidit.com"],
          agentCredentialBindings: {
            "agent:daisy": "hughdidit-agent-gws",
            "subagent:daisy": "hughdidit-agent-gws",
            "agent:finn": "hughdidit-agent-gws",
            "subagent:finn": "hughdidit-agent-gws",
          },
        },
      },
    },
  },
}
```
