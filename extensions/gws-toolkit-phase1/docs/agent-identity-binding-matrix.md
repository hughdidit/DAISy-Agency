# Agent Identity Binding Matrix

| Subject | Typical use | Route requirement |
| --- | --- | --- |
| `agent:main` | default top-level agent | explicit binding recommended |
| `agent:ops` | operator automation agent | explicit binding required for production |
| `subagent:ops` | subagent spawned from `ops` | separate explicit binding; no inheritance |
| `agent:research` | read-focused agent | bind to read-only route |

Use read-only routes for subjects that do not need writes, even if the plugin
globally enables write services for other identities.
