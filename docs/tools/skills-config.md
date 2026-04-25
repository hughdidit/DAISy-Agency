---
summary: "Skills config schema and examples"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills Config"
---

# Skills Config

All skills-related configuration lives under `skills` in `~/.openclaw/openclaw.json`.

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun (Gateway runtime still Node; bun not recommended)
    },
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

## Fields

- `allowBundled`: optional allowlist for **bundled** skills only. When set, only
  bundled skills in the list are eligible (managed/workspace skills unaffected).
- `load.extraDirs`: additional skill directories to scan (lowest precedence).
- `load.watch`: watch skill folders and refresh the skills snapshot (default: true).
- `load.watchDebounceMs`: debounce for skill watcher events in milliseconds (default: 250).
- `install.preferBrew`: prefer brew installers when available (default: true).
- `install.nodeManager`: node installer preference (`npm` | `pnpm` | `yarn` | `bun`, default: npm).
  This only affects **skill installs**; the Gateway runtime should still be Node
  (Bun not recommended for WhatsApp/Telegram).
- `entries.<skillKey>`: per-skill overrides.

Per-skill fields:

- `enabled`: set `false` to disable a skill even if it’s bundled/installed.
- `env`: environment variables injected for the agent run (only if not already set).
- `apiKey`: optional convenience for skills that declare a primary env var.
  Supports plaintext string or SecretRef object (`{ source, provider, id }`).

## Notes

- Keys under `entries` map to the skill name by default. If a skill defines
  `metadata.openclaw.skillKey`, use that key instead.
- Changes to skills are picked up on the next agent turn when the watcher is enabled.

### Sandboxed skills + env vars

When a session is **sandboxed**, skill processes run inside Docker. The sandbox
does **not** inherit the host `process.env`.

Use one of:

- `agents.defaults.sandbox.docker.env` (or per-agent `agents.list[].sandbox.docker.env`)
- bake the env into your custom sandbox image

Global `env` and `skills.entries.<skill>.env/apiKey` apply to **host** runs only.

This config can make a skill runnable inside a container, but it does not by
itself declare official support for the selected sandbox runtime profile. Use
`openclaw sandbox explain`, `openclaw status`, or `openclaw doctor` when you
need the runtime-aware support/readiness answer.

For the bundled `openclaw-readonly` sandbox skill, use sandbox Docker env vars
instead of `skills.entries` overrides:

- `OPENCLAW_READONLY_CONFIG_PATH`
- `OPENCLAW_READONLY_STATE_DIR`
- `OPENCLAW_READONLY_AGENT_ID`
- `OPENCLAW_READONLY_WORKSPACE_DIR`

Those env vars are consumed by the sandbox-local `openclaw-readonly` runtime and
should point only at read-only binds or sandbox-visible workspace mounts.

If they are omitted, `openclaw-readonly` falls back to `OPENCLAW_CONFIG_PATH`
and `OPENCLAW_STATE_DIR`, then to the sandbox projection root advertised
through `OPENCLAW_READONLY_PROJECTION_ROOT`. In `ro` and `none` sandboxes that
is usually `<sandbox workdir>/.openclaw-readonly/agents/<agentId>/` (for
example `/workspace/.openclaw-readonly/agents/main/`). In `rw` sandboxes the
projection is exposed through a synthetic read-only bind so it is not written
into the real workspace.
