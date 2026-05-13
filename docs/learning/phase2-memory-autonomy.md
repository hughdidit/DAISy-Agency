# DAISy Phase 2 Memory Autonomy

Phase 2 makes DAISy memory self-administering for ordinary, non-secret operational memory. It does not create a new memory record class. Existing memory records remain the durable unit of memory, and Phase 2 adds optional metadata under `metadata.ops`.

## Authority Boundary

DAISy may autonomously capture, score, dedupe, compact, and promote recall precedence for ordinary non-secret memories when scope and confidence are available. DAISy may also generate learning proposals and open draft proposal PRs.

DAISy may not approve, merge, deploy, canonize itself, grant permissions, alter branch protection, bypass CI, mutate deployment workflows, mutate production config, rewrite security policy, or change system prompts without normal human review.

## Metadata Contract

Usefulness and maintenance state lives under existing memory metadata:

- `metadata.ops.usefulness`
- `metadata.ops.agentUsefulness`
- `metadata.ops.dedupe`
- `metadata.ops.compaction`

Records without these fields remain valid and receive conservative default precedence during recall. There is no `usefulness_memory` kind and no separate score collection in Phase 2.

## Usefulness Scoring

Global and per-agent usefulness use bounded scores from `0` to `1`.

Positive signals include retrieval use, successful task association, freshness, confidence, stable repeated evidence, and high importance. Negative signals include corrections, secret status, duplicate status, stale age, and compaction state.

Recall ranking combines vector similarity with global precedence and requesting-agent precedence. This lets the same memory be highly useful to one agent without promoting it equally for unrelated agents.

## Backfill

Existing database records are initialized through:

```bash
openclaw memory autonomy backfill-scores --dry-run --scope agent:daisy --limit 100
```

After review of the dry-run output, omit `--dry-run` to write additive metadata. Backfill is idempotent by `metadata.ops.usefulness.backfillVersion`, skips secret records for broad recall promotion, and writes `memory_usefulness_backfilled` to `memory_events`.

## Dedupe And Compaction

Dedupe marks duplicate records through additive metadata and demotes duplicates from ordinary recall. It does not hard-delete records.

Compaction creates a summary memory for stale or low-usefulness non-secret records, preserves source IDs and score history, and marks source records with `metadata.ops.compaction`. Secret records are not compacted into non-secret summaries.

Hard deletion remains disabled by default. Deletion candidates should continue through hygiene review unless a maintainer explicitly enables deletion behavior.

## Live LLM Evolution And Proposal PRs

Live LLM evolution is explicit configuration only. LLM output is untrusted candidate material: schemas, secret scanning, forbidden mutation checks, fitness scoring, trace capture, and security gates still apply.

Automatic GitHub PR creation creates draft, reviewable proposal containers. Proposal PRs can include Markdown exports, MAPE-K traces, scores, risk findings, memory-usefulness evidence, candidate schemas, negative tests, and docs/runbook patches. They cannot approve or merge themselves.
