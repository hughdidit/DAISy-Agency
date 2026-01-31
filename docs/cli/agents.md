---
summary: "CLI reference for `moltbot agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
---

# `moltbot agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
moltbot agents list
moltbot agents add work --workspace ~/clawd-work
moltbot agents set-identity --workspace ~/clawd --from-identity
moltbot agents set-identity --agent main --avatar avatars/clawd.png
moltbot agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:
<<<<<<< HEAD
- Example path: `~/clawd/IDENTITY.md`
=======

- Example path: `~/.openclaw/workspace/IDENTITY.md`
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
moltbot agents set-identity --workspace ~/clawd --from-identity
```

Override fields explicitly:

```bash
moltbot agents set-identity --agent main --name "Clawd" --emoji "🦞" --avatar avatars/clawd.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Clawd",
          theme: "space lobster",
          emoji: "🦞",
<<<<<<< HEAD
          avatar: "avatars/clawd.png"
        }
      }
    ]
  }
=======
          avatar: "avatars/openclaw.png",
        },
      },
    ],
  },
>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
}
```
