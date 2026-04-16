---
name: memory-ops
description: Delegate-safe long-term memory operations for capture, recall, hygiene, commitments, preferences, and audit.
user-invocable: false
---

# Memory Ops

Use this skill when a reply depends on prior user history, preferences, commitments, or durable decisions.

## Operating Rules

1. Run `memory_recallx` before answering continuity-sensitive prompts.
2. Use `memory_capture` only for durable information, not every turn.
3. Use `commitment_tracker` for tasks, deadlines, and promises.
4. Use `preference_miner` for repeated behavior; do not promote one-off observations.
5. Run `memory_hygiene` in `plan` mode first. Apply only after reviewing actions.
6. Use `memory_audit` after memory config changes or when recall reliability is uncertain.
7. Summarize tool output; do not dump raw memory records unless explicitly requested.

## Scope Guardrails

- Memory scope is agent-local by default (`agent:<id>` or `subagent:<id>`).
- Do not assume cross-agent memory visibility.
- Secret-like material must be rejected or redacted before capture.
