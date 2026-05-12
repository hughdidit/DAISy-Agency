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
6. Use `memory_hygiene` in `apply` mode only with the `planId`, `planHash`, and exact approved action IDs from a reviewed plan.
7. Use `memory_audit` after memory config changes, recall-related deploys, or when recall reliability is uncertain. It runs probe capture and recall checks and can optionally clean up successful probes.
8. Summarize tool output; do not dump raw memory records unless explicitly requested.

## Default Memory Policy

When memory is relevant, prefer these defaults:

- Recall first with `memory_recallx`. If it is unavailable, fall back to `memory_recall`.
- Pass only documented fields to memory tools; their schemas are strict and reject ad hoc keys.
- Track actionable items with `commitment_tracker` instead of generic capture.
- Capture only durable non-actionable facts, decisions, recurring context, and important project state with `memory_capture`.
- Keep capture sparse. Do not store one-off chat noise.
- Do not store raw transcripts, temporary troubleshooting chatter, speculative guesses, duplicated rewrites of existing memory, or secrets that are not intentionally classified for later agent use.
- If the agent decides a durable memory is secret, it must explicitly set `sensitivity: "secret"` on the relevant tool call. Secret-like content is rejected by default.
- Use `preference_miner` only when repeated evidence supports a stable non-secret preference.
- Use `memory_hygiene` in `plan` mode when memory appears noisy, duplicated, conflicting, or stale. Apply only after reviewing the plan and passing its matching approval fields.
- Summarize tool output briefly; do not dump raw records unless explicitly requested.

## Capture Format Preference

When capturing durable memory with `memory_capture`, prefer structured entries with:

- `text`
- `kind`
- `importance`
- `category`
- `tags`
- `confidence`
- `sourceMessageIds`
- `status`
- commitment metadata when applicable
- `supersedesId` for replacements
- `sensitivity` when the agent intentionally stores a secret memory

Keep capture structured and sparse.

Default shape:

- `{ text, kind, importance, category, tags, confidence, sourceMessageIds, status }`

## Cleanup Strategies

When using `memory_hygiene`, prefer explicit cleanup strategies over vague cleanup requests:

- `dedupe` for repeated records that say the same thing
- `conflict-review` for records that disagree and need human-reviewed resolution
- `stale-prune` for expired, obsolete, or low-value old records
- `promote` only for repeated non-secret observations that should become durable preferences

For noisy memory, start with `dedupe`, `conflict-review`, and `stale-prune`. Use `promote` only when the plan shows stable repeated evidence.

`apply` is intentionally strict. Pass only a reviewed plan's `planId`,
`planHash`, and full approved action ID list. Do not ask the tool to generate and
apply a plan in the same call.

## Audit Guidance

Use `memory_audit` when memory behavior itself is in question, not as a routine step on every prompt.

- Run it after memory configuration changes, recall-related deploys, scope/routing fixes, or when expected memories are missing, inconsistent, or suspiciously slow to return.
- Inspect whether the probe was stored, whether recall found the same memory in the same scope, whether recall latency looks abnormal, and whether probe cleanup succeeded or left stale audit records behind.
- Raw audit output can include debug fields such as `token`, `storedId`, `resolvedStoredId`, `recallEvidenceIds`, `recallAttempts`, and `cleanupReason`, plus `reason` on failure. Treat those as diagnostic fields, not routine summary text.
- A good summary is short and operational: report `pass: true|false`, `runId`, `recallHits`, `latencyMs`, `cleanupResult`, and the next action if follow-up is needed. If the audit fails, include `reason` when present; otherwise interpret the failure from whether `storedId` or `resolvedStoredId` is missing from `recallEvidenceIds`. Do not repeat the raw probe token unless you are debugging the audit itself.

## What Not To Store

Do not store:

- one-off chat chatter
- raw transcript dumps
- temporary debugging output or transient errors
- speculative inferences that are not established facts or decisions
- duplicate restatements of memory that already exists
- secrets unless the agent intentionally stores them with `sensitivity: "secret"`

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
- Shared/project memory requires explicit visibility and routing policy. Never rely on fallback to another agent or the main agent.
- Sandboxed and unsandboxed delegates should use the same plugin-backed memory tools; do not use direct MongoDB or filesystem access as a memory workaround.
- Secret-like material must be rejected or redacted unless the agent intentionally marks it as secret before capture.
- Secret memories remain scope-local and must be excluded from ordinary recall and hygiene flows unless the caller explicitly requests them.
