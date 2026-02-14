---
name: prepare-pr
description: Script-first PR preparation with structured findings resolution, deterministic push safety, and explicit gate execution.
---

# Prepare PR

## Overview

Prepare the PR head branch for merge after `/review-pr`.

## Inputs

- Ask for PR number or URL.
- If missing, use `.local/pr-meta.env` if present in the PR worktree.

## Safety

- Never push to `main`.
- Only push to PR head with explicit `--force-with-lease` against known head SHA.
- Do not run `git clean -fdx`.
<<<<<<< HEAD
- Do not run `git add -A` or `git add .`. Stage only specific files changed.
=======
- Wrappers are cwd-agnostic; run from repo root or PR worktree.
>>>>>>> 69f809dca (fix: restore deterministic review workflow)

## Execution Contract

1. Run setup:

```sh
scripts/pr-prepare init <PR>
```

2. Resolve findings from structured review:

- `.local/review.json` is mandatory.
- Resolve all `BLOCKER` and `IMPORTANT` items.

3. Commit scoped changes with concise subjects (no PR number/thanks; those belong on the final merge/squash commit).

4. Run gates via wrapper.

5. Push via wrapper (includes pre-push remote verification, one automatic lease-retry path, and post-push API propagation retry).

Optional one-shot path:

```sh
scripts/pr-prepare run <PR>
```

## Steps

1. Setup and artifacts

```sh
scripts/pr-prepare init <PR>

ls -la .local/review.md .local/review.json .local/pr-meta.env .local/prep-context.env
jq . .local/review.json >/dev/null
```

2. Resolve required findings

List required items:

```sh
jq -r '.findings[] | select(.severity=="BLOCKER" or .severity=="IMPORTANT") | "- [\(.severity)] \(.id): \(.title) => \(.fix)"' .local/review.json
```

Fix all required findings. Keep scope tight.

3. Update changelog/docs (changelog is mandatory in this workflow)

```sh
jq -r '.changelog' .local/review.json
jq -r '.docs' .local/review.json
```

4. Commit scoped changes

Use concise, action-oriented subject lines without PR numbers/thanks. The final merge/squash commit is the only place we include PR numbers and contributor thanks.

Use explicit file list:

```sh
scripts/committer "fix: <summary>" <file1> <file2> ...
```

5. Run gates

```sh
scripts/pr-prepare gates <PR>
```

6. Push safely to PR head

```sh
scripts/pr-prepare push <PR>
```

This push step includes:

- robust fork remote resolution from owner/name,
- pre-push remote SHA verification,
- one automatic rebase + gate rerun + retry if lease push fails,
- post-push PR-head propagation retry,
- idempotent behavior when local prep HEAD is already on the PR head,
- post-push SHA verification and `.local/prep.env` generation.

7. Verify handoff artifacts

```sh
ls -la .local/prep.md .local/prep.env
```

8. Output

<<<<<<< HEAD
```sh
pnpm install
pnpm build
pnpm ui:build
pnpm check
pnpm test
```

Require all to pass. If something fails, fix, commit, and rerun. Allow at most 3 fix and rerun cycles. If gates still fail after 3 attempts, stop and report the failures. Do not loop indefinitely.

9. Push updates back to the PR head branch

```sh
# Ensure remote for PR head exists
git remote add prhead "$head_repo_url.git" 2>/dev/null || git remote set-url prhead "$head_repo_url.git"

# Use force with lease after rebase
# Double check: $head must NOT be "main" or "master"
echo "Pushing to branch: $head"
if [ "$head" = "main" ] || [ "$head" = "master" ]; then
  echo "ERROR: head branch is main/master. This is wrong. Stopping."
  exit 1
fi
git push --force-with-lease prhead HEAD:$head
```

10. Verify PR is not behind main (Mandatory)

```sh
git fetch origin main
git fetch origin pull/<PR>/head:pr-<PR>-verify --force
git merge-base --is-ancestor origin/main pr-<PR>-verify && echo "PR is up to date with main" || echo "ERROR: PR is still behind main, rebase again"
git branch -D pr-<PR>-verify 2>/dev/null || true
```

If still behind main, repeat steps 2 through 9.

11. Write prep summary artifacts (Mandatory)

Update `.local/prep.md` with:

- Current HEAD sha from `git rev-parse HEAD`.
- Short bullet list of changes.
- Gate results.
- Push confirmation.
- Rebase verification result.

Create or overwrite `.local/prep.md` and verify it exists and is non-empty:

```sh
git rev-parse HEAD
ls -la .local/prep.md
wc -l .local/prep.md
```

12. Output

Include a diff stat summary:

```sh
git diff --stat origin/main..HEAD
git diff --shortstat origin/main..HEAD
```

Report totals: X files changed, Y insertions(+), Z deletions(-).

If gates passed and push succeeded, print exactly:

```
PR is ready for /mergepr
```

Otherwise, list remaining failures and stop.
=======
- Summarize resolved findings and gate results.
- Print exactly: `PR is ready for /merge-pr`.
>>>>>>> 69f809dca (fix: restore deterministic review workflow)

## Guardrails

- Do not run `gh pr merge` in this skill.
- Do not delete worktree.
