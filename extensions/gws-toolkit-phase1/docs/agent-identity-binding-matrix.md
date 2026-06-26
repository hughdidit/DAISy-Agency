# Agent Identity Binding Matrix

| Subject          | Typical use                 | Workspace identity source                            | Route requirement                         |
| ---------------- | --------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `agent:main`     | default top-level agent     | `agents.list[id="main"].googleWorkspace.email`       | explicit binding recommended              |
| `agent:daisy`    | DAISy Workspace agent       | `agents.list[id="daisy"].googleWorkspace.email`      | explicit binding required for production  |
| `subagent:daisy` | subagent spawned from Daisy | same `agents.list[id="daisy"].googleWorkspace.email` | separate explicit binding; no inheritance |
| `agent:research` | read-focused agent          | agent-specific Workspace email when GWS is enabled   | bind to read-only route                   |

Use read-only routes for subjects that do not need writes, even if the plugin
globally enables write services for other identities.

Contacts and Directory Groups follow the same subject binding rules as Drive,
Gmail, Calendar, Docs, and Sheets. Grant `gws_contacts_read` to read-only routes
when agents only need to inspect people or Contact Groups; add
`gws_contacts_write` only for routes that should create/update contacts or
Contact Groups and modify Contact Group members. Directory Groups are a
separate Admin SDK Directory API surface: grant `gws_groups_read` for Workspace
group and member inspection, and `gws_groups_write` only for delegated routes
whose subject has the required Workspace admin privileges.

Subagents do not inherit route access from their parent. A subagent can use the
same delegated Workspace email as its parent agent, but it still needs its own
`subagent:<id>` binding.

Recommended HughDidIt bindings:

```json5
{
  agents: {
    list: [
      { id: "daisy", googleWorkspace: { email: "daisy.ai@hughdidit.com" } },
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
          },
        },
      },
    },
  },
}
```
