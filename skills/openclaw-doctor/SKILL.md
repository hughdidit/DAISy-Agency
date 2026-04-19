---
name: openclaw-doctor
description: Sandbox-safe OpenClaw doctor triage with approval-gated remote repair choices.
metadata: { "openclaw": { "emoji": "🩺", "requires": { "bins": ["node"] } } }
---

# OpenClaw Doctor

Use this skill for sandbox-safe OpenClaw doctor triage only.

## Rule

Do not call `openclaw` directly from the sandbox.

Always use the bundled launcher:

```bash
node skills/openclaw-doctor/scripts/openclaw-doctor-readonly.mjs triage
```

## Supported commands

Only these exact commands are supported:

```bash
node skills/openclaw-doctor/scripts/openclaw-doctor-readonly.mjs triage
node skills/openclaw-doctor/scripts/openclaw-doctor-readonly.mjs status
node skills/openclaw-doctor/scripts/openclaw-doctor-readonly.mjs sandbox explain
node skills/openclaw-doctor/scripts/openclaw-doctor-readonly.mjs skills list
node skills/openclaw-doctor/scripts/openclaw-doctor-readonly.mjs skills check
```

Do not add flags.
Do not add extra args.
Do not call `openclaw doctor`, `openclaw update`, `openclaw config`, or any mutating command from this skill.

## Workflow

1. Run `triage`.
2. Summarize findings instead of dumping raw output unless the user asks for it.
3. Stop after diagnosis and present these numbered choices exactly:
   1. Preview proposed repair steps (`dry-run`, remote only)
   2. Run approved repair now (`apply`, remote only)
   3. Stop after diagnosis
4. Wait for a direct numbered answer. Do not infer consent from vague language.
5. If the user does not directly approve `1` or `2`, do nothing beyond explanation.

## Safety boundary

- Triage is read-only and sandbox-only.
- Preview and apply are both remote-only and approval-gated.
- Never run mutating doctor flows locally from Codex desktop.
- If the remote route is unavailable, say so and stop.

## Environment contract

This skill reuses the readonly sandbox projection and runtime wrapper used by `openclaw-readonly`.
If readonly config/state/workspace mounts are missing, report that as a sandbox setup issue and stop.
