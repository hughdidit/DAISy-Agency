---
summary: "CLI reference for `moltbot logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
---

# `moltbot logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Logging overview: [Logging](/logging)

## Examples

```bash
<<<<<<< HEAD
moltbot logs
moltbot logs --follow
moltbot logs --json
moltbot logs --limit 500
=======
openclaw logs
openclaw logs --follow
openclaw logs --json
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
>>>>>>> 851fcb261 (feat: Add --localTime option to logs command for local timezone display (#13818))
```

Use `--local-time` to render timestamps in your local timezone.
