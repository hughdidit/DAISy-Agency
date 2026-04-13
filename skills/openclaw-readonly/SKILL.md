---
name: openclaw-readonly
description: Sandbox-safe OpenClaw diagnostics through a tightly scoped read-only launcher.
metadata: { "openclaw": { "emoji": "🔒", "requires": { "bins": ["node"] } } }
---

# OpenClaw Readonly

Use this skill only for sandbox-safe OpenClaw diagnostics.

## Rule

Do not call `openclaw` directly from the sandbox.

Always use the bundled launcher:

```bash
node skills/openclaw-readonly/scripts/openclaw-readonly.mjs <command>
```

## Supported commands

Only these exact commands are supported:

```bash
node skills/openclaw-readonly/scripts/openclaw-readonly.mjs status
node skills/openclaw-readonly/scripts/openclaw-readonly.mjs sandbox explain
node skills/openclaw-readonly/scripts/openclaw-readonly.mjs skills list
node skills/openclaw-readonly/scripts/openclaw-readonly.mjs skills check
```

Do not add flags.
Do not add extra args.
Do not substitute nearby commands like `doctor`, `skills info`, `gateway`, `config`, `models auth`, `secrets`, or `update`.

## Response style

- Summarize results by default.
- Show raw command output only when the user explicitly asks for it.
- If the user asks for host-side control, setup, repair, writes, approval flows, or any mutating action, stop and explain that this skill is read-only and sandbox-only.

## Environment contract

The launcher prefers this order:

- explicit readonly env from the sandbox:
  - `OPENCLAW_READONLY_CONFIG_PATH`
  - `OPENCLAW_READONLY_STATE_DIR`
  - `OPENCLAW_READONLY_AGENT_ID` (optional; defaults to `main`)
  - `OPENCLAW_READONLY_WORKSPACE_DIR` for `skills list` and `skills check`
- standard OpenClaw sandbox env when present:
  - `OPENCLAW_CONFIG_PATH`
  - `OPENCLAW_STATE_DIR`
- the sandbox readonly projection root advertised through `OPENCLAW_READONLY_PROJECTION_ROOT`
  - in `ro` / `none`, this is usually `<sandbox workdir>/.openclaw-readonly/agents/main/`
  - in `rw`, this is a synthetic internal read-only mount, not a path written into the real workspace

For skills diagnostics, the launcher will prefer `/agent` and then `/workspace` when `OPENCLAW_READONLY_WORKSPACE_DIR` is unset.

If those paths are still missing, report the launcher error as a sandbox setup issue instead of guessing.
