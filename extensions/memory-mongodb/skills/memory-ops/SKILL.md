---
name: memory-ops
description: Delegate-safe long-term memory operations for capture, recall, hygiene, commitments, preferences, and audit.
user-invocable: false
---

# Memory Ops

Use this skill when a reply depends on prior user history, preferences, commitments, or durable decisions.

## Operating Rules

1. Run `memory_recallx` before answering continuity-sensitive prompts. If it is unavailable in the current allowlist, fall back to `memory_recall`.
2. Use `commitment_tracker` for tasks, deadlines, promises, and follow-ups.
3. Use `memory_capture` only for durable non-actionable information, not every turn.
4. Use `preference_miner` for repeated non-secret behavior; do not promote one-off observations.
5. Run `memory_hygiene` in `plan` mode when there are duplicates, conflicts, or stale records. Prioritize `dedupe`, `conflict-review`, and `stale-prune`. Apply only after reviewing actions.
6. Use `memory_audit` after memory config changes or when recall reliability is uncertain.
7. Summarize tool output; do not dump raw memory records unless explicitly requested.

## Default Memory Policy

When memory is relevant, prefer these defaults:

- Recall first with `memory_recallx`. If it is unavailable, fall back to `memory_recall`.
- Track actionable items with `commitment_tracker` instead of generic capture.
- Capture only durable non-actionable facts, decisions, recurring context, and important project state with `memory_capture`.
- Keep capture sparse. Do not store one-off chat noise.
- If the agent decides a durable memory is secret, it must explicitly mark the tool call as secret. Secret-like content is rejected by default.
- Use `preference_miner` only when repeated evidence supports a stable non-secret preference.
- Use `memory_hygiene` in `plan` mode when memory appears noisy, duplicated, conflicting, or stale. Apply only after reviewing the plan.
- Summarize tool output briefly; do not dump raw records unless explicitly requested.

## Capture Format Preference

When capturing durable memory with `memory_capture`, prefer structured entries with:

- `kind`
- `category`
- `tags`
- `confidence`
- `sourceMessageIds`
- `status`
- commitment metadata when applicable
- `supersedesId` for replacements
- `sensitivity` when the agent intentionally stores a secret memory

Keep capture structured and sparse.

## Priority Order

When multiple memory actions are possible, prefer:

1. Recall first
2. Track commitments for actionable items
3. Capture durable non-actionable facts, decisions, and project context
4. Capture secrets only when the agent explicitly marks them as secret in the tool call
5. Mine stable non-secret preferences
6. Run hygiene for reviewed cleanup

## Scope Guardrails

- Memory scope is agent-local by default (`agent:<id>` or `subagent:<id>`).
- Do not assume cross-agent memory visibility.
- Secret-like material must be rejected or redacted unless the agent intentionally marks it as secret before capture.
- Secret memories remain scope-local and must be excluded from ordinary recall and hygiene flows unless the caller explicitly requests them.
