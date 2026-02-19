---
name: merge-pr
<<<<<<< HEAD
description: Merge a GitHub PR via squash after /preparepr. Use when asked to merge a ready PR. Do not push to main or modify code. Ensure the PR ends in MERGED state and clean up worktrees after success.
=======
description: Script-first deterministic squash merge with strict required-check gating, head-SHA pinning, and reliable attribution/commenting.
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)
---

# Merge PR

## Overview

Merge a prepared PR only after deterministic validation.

## Inputs

- Ask for PR number or URL.
- If missing, use `.local/prep.env` from the PR worktree.

## Safety

- Never use `gh pr merge --auto` in this flow.
- Never run `git push` directly.
- Require `--match-head-commit` during merge.
- Wrapper commands are cwd-agnostic; you can run them from repo root or inside the PR worktree.

## Execution Contract

1. Validate merge readiness:

```sh
scripts/pr-merge verify <PR>
```

<<<<<<< HEAD
Run all commands inside the worktree directory.

## Load Local Artifacts (Mandatory)

Expect these files from earlier steps:

- `.local/review.md` from `/reviewpr`
- `.local/prep.md` from `/preparepr`

```sh
ls -la .local || true

if [ -f .local/review.md ]; then
  echo "Found .local/review.md"
  sed -n '1,120p' .local/review.md
else
  echo "Missing .local/review.md. Stop and run /reviewpr, then /preparepr."
  exit 1
fi

if [ -f .local/prep.md ]; then
  echo "Found .local/prep.md"
  sed -n '1,120p' .local/prep.md
else
  echo "Missing .local/prep.md. Stop and run /preparepr first."
  exit 1
fi
=======
Backward-compatible verify form also works:

```sh
scripts/pr-merge <PR>
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)
```

2. Run one-shot deterministic merge:

```sh
scripts/pr-merge run <PR>
```

3. Capture and report these values in a human-readable summary (not raw `key=value` lines):

- Merge commit SHA
- Merge author email
- Merge completion comment URL
- PR URL

## Steps

1. Validate artifacts

```sh
require=(.local/review.md .local/review.json .local/prep.md .local/prep.env)
for f in "${require[@]}"; do
  [ -s "$f" ] || { echo "Missing artifact: $f"; exit 1; }
done
```

<<<<<<< HEAD
2. Run sanity checks

Stop if any are true:

- PR is a draft.
- Required checks are failing.
- Branch is behind main.

```sh
# Checks
gh pr checks <PR>

# Check behind main
git fetch origin main
git fetch origin pull/<PR>/head:pr-<PR>
git merge-base --is-ancestor origin/main pr-<PR> || echo "PR branch is behind main, run /preparepr"
```

If anything is failing or behind, stop and say to run `/preparepr`.
=======
2. Validate checks and branch status

```sh
scripts/pr-merge verify <PR>
source .local/prep.env
```

`scripts/pr-merge` treats “no required checks configured” as acceptable (`[]`), but fails on any required `fail` or `pending`.
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)

3. Merge deterministically (wrapper-managed)

```sh
scripts/pr-merge run <PR>
```

<<<<<<< HEAD
If merge fails, report the error and stop. Do not retry in a loop.
If the PR needs changes beyond what `/preparepr` already did, stop and say to run `/preparepr` again.
=======
`scripts/pr-merge run` performs:
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)

- deterministic squash merge pinned to `PREP_HEAD_SHA`
- reviewer merge author email selection with fallback candidates
- one retry only when merge fails due to author-email validation
- co-author trailers for PR author and reviewer
- post-merge verification of both co-author trailers on commit message
- PR comment retry (3 attempts), then comment URL extraction
- cleanup after confirmed `MERGED`

4. Manual fallback (only if wrapper is unavailable)

```sh
scripts/pr merge-run <PR>
```

<<<<<<< HEAD
5. Optional comment
=======
5. Cleanup
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)

Cleanup is handled by `run` after merge success.

## Guardrails

- End in `MERGED`, never `CLOSED`.
- Cleanup only after confirmed merge.
- In final chat output, use labeled lines or bullets; do not paste raw wrapper diagnostics unless debugging.
