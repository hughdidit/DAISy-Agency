---
name: prepare-pr
<<<<<<< HEAD
description: Prepare a GitHub PR for merge by rebasing onto main, fixing review findings, running gates, committing fixes, and pushing to the PR head branch. Use after /reviewpr. Never merge or push to main.
=======
description: Script-first PR preparation with structured findings resolution, deterministic push safety, and explicit gate execution.
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)
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
- Wrappers are cwd-agnostic; run from repo root or PR worktree.

## Execution Contract

<<<<<<< HEAD
- Execute the workflow. Do not stop after printing the TODO checklist.
- If delegating, require the delegate to run commands and capture outputs.

## Known Footguns

- If you see "fatal: not a git repository", you are in the wrong directory. Use `~/dev/openclaw` if available; otherwise ask user.
- Do not run `git clean -fdx`.
- Do not run `git add -A` or `git add .`.

## Completion Criteria

- Rebase PR commits onto `origin/main`.
- Fix all BLOCKER and IMPORTANT items from `.local/review.md`.
- Run gates and pass.
- Commit prep changes.
- Push the updated HEAD back to the PR head branch.
- Write `.local/prep.md` with a prep summary.
- Output exactly: `PR is ready for /mergepr`.

## First: Create a TODO Checklist

Create a checklist of all prep steps, print it, then continue and execute the commands.

## Setup: Use a Worktree

Use an isolated worktree for all prep work.
=======
1. Run setup:
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)

```sh
scripts/pr-prepare init <PR>
```

2. Resolve findings from structured review:

- `.local/review.json` is mandatory.
- Resolve all `BLOCKER` and `IMPORTANT` items.

3. Commit with required subject format and validate it.

4. Run gates via wrapper.

5. Push via wrapper (includes pre-push remote verification, one automatic lease-retry path, and post-push API propagation retry).

Optional one-shot path:

```sh
<<<<<<< HEAD
if [ -f .local/review.md ]; then
  echo "Found review findings from /reviewpr"
else
  echo "Missing .local/review.md. Run /reviewpr first and save findings."
  exit 1
fi

# Read it
sed -n '1,200p' .local/review.md
=======
scripts/pr-prepare run <PR>
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)
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

Changelog gate requirement:

- `CHANGELOG.md` must include a newly added changelog entry line.
- When PR author metadata is available, that same changelog entry line must include `(#<PR>) thanks @<pr-author>`.

4. Commit scoped changes

Required commit subject format:

- `fix: <summary> (openclaw#<PR>) thanks @<pr-author>`

Use explicit file list:

```sh
source .local/pr-meta.env
scripts/committer "fix: <summary> (openclaw#$PR_NUMBER) thanks @$PR_AUTHOR" <file1> <file2> ...
```

Validate commit subject:

```sh
scripts/pr-prepare validate-commit <PR>
```

5. Run gates

```sh
scripts/pr-prepare gates <PR>
```

6. Push safely to PR head

```sh
scripts/pr-prepare push <PR>
```

<<<<<<< HEAD
8. Run full gates before pushing

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

## Guardrails

- Worktree only.
- Do not delete the worktree on success. `/mergepr` may reuse it.
- Do not run `gh pr merge`.
- Never push to main. Only push to the PR head branch.
- Run and pass all gates before pushing.
=======
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

- Summarize resolved findings and gate results.
- Print exactly: `PR is ready for /merge-pr`.

## Guardrails

- Do not run `gh pr merge` in this skill.
- Do not delete worktree.
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)
