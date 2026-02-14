---
name: merge-pr
<<<<<<< HEAD
description: Merge a GitHub PR via squash after /prepare-pr. Use when asked to merge a ready PR. Do not push to main or modify code. Ensure the PR ends in MERGED state and clean up worktrees after success.
=======
description: Merge a GitHub PR via squash after /preparepr. Use when asked to merge a ready PR. Do not push to main or modify code. Ensure the PR ends in MERGED state and clean up worktrees after success.
>>>>>>> 01d2ad205 (docs: harden maintainer and advisory workflow (#16173))
---

# Merge PR

## Overview

Merge a prepared PR via `gh pr merge --squash` and clean up the worktree after success.

## Inputs

- Ask for PR number or URL.
- If missing, auto-detect from conversation.
- If ambiguous, ask.

## Safety

- Use `gh pr merge --squash` as the only path to `main`.
- Do not run `git push` at all during merge.
- Do not run gateway stop commands. Do not kill processes. Do not touch port 18792.
<<<<<<< HEAD
=======
- Do not execute merge or PR-comment GitHub write actions until maintainer explicitly approves.
>>>>>>> 01d2ad205 (docs: harden maintainer and advisory workflow (#16173))

## Execution Rule

- Execute the workflow. Do not stop after printing the TODO checklist.
- If delegating, require the delegate to run commands and capture outputs.

## Known Footguns

- If you see "fatal: not a git repository", you are in the wrong directory. Use `~/dev/openclaw` if available; otherwise ask user.
- Read `.local/review.md` and `.local/prep.md` in the worktree. Do not skip.
- Clean up the real worktree directory `.worktrees/pr-<PR>` only after a successful merge.
- Expect cleanup to remove `.local/` artifacts.

## Completion Criteria

- Ensure `gh pr merge` succeeds.
- Ensure PR state is `MERGED`, never `CLOSED`.
- Record the merge SHA.
- Run cleanup only after merge success.

## First: Create a TODO Checklist

Create a checklist of all merge steps, print it, then continue and execute the commands.

## Setup: Use a Worktree

Use an isolated worktree for all merge work.

```sh
cd ~/dev/openclaw
# Sanity: confirm you are in the repo
git rev-parse --show-toplevel

WORKTREE_DIR=".worktrees/pr-<PR>"
```

Run all commands inside the worktree directory.

## Load Local Artifacts (Mandatory)

Expect these files from earlier steps:

- `.local/review.md` from `/reviewpr`
<<<<<<< HEAD
- `.local/prep.md` from `/prepare-pr`
=======
- `.local/prep.md` from `/preparepr`
>>>>>>> 01d2ad205 (docs: harden maintainer and advisory workflow (#16173))

```sh
ls -la .local || true

if [ -f .local/review.md ]; then
  echo "Found .local/review.md"
  sed -n '1,120p' .local/review.md
else
<<<<<<< HEAD
  echo "Missing .local/review.md. Stop and run /reviewpr, then /prepare-pr."
=======
  echo "Missing .local/review.md. Stop and run /reviewpr, then /preparepr."
>>>>>>> 01d2ad205 (docs: harden maintainer and advisory workflow (#16173))
  exit 1
fi

if [ -f .local/prep.md ]; then
  echo "Found .local/prep.md"
  sed -n '1,120p' .local/prep.md
else
<<<<<<< HEAD
  echo "Missing .local/prep.md. Stop and run /prepare-pr first."
=======
  echo "Missing .local/prep.md. Stop and run /preparepr first."
>>>>>>> 01d2ad205 (docs: harden maintainer and advisory workflow (#16173))
  exit 1
fi
```

## Steps

1. Identify PR meta

```sh
gh pr view <PR> --json number,title,state,isDraft,author,headRefName,baseRefName,headRepository,body --jq '{number,title,state,isDraft,author:.author.login,head:.headRefName,base:.baseRefName,headRepo:.headRepository.nameWithOwner,body}'
contrib=$(gh pr view <PR> --json author --jq .author.login)
head=$(gh pr view <PR> --json headRefName --jq .headRefName)
head_repo_url=$(gh pr view <PR> --json headRepository --jq .headRepository.url)
```

2. Run sanity checks

Stop if any are true:

- PR is a draft.
- Required checks are failing.
- Branch is behind main.
<<<<<<< HEAD

If `.local/prep.md` contains `Docs-only change detected with high confidence; skipping pnpm test.`, that local test skip is allowed. CI checks still must be green.
=======
>>>>>>> 01d2ad205 (docs: harden maintainer and advisory workflow (#16173))

```sh
# Checks
gh pr checks <PR>

# Check behind main
git fetch origin main
git fetch origin pull/<PR>/head:pr-<PR>
<<<<<<< HEAD
git merge-base --is-ancestor origin/main pr-<PR> || echo "PR branch is behind main, run /prepare-pr"
```

If anything is failing or behind, stop and say to run `/prepare-pr`.
=======
git merge-base --is-ancestor origin/main pr-<PR> || echo "PR branch is behind main, run /preparepr"
```

If anything is failing or behind, stop and say to run `/preparepr`.
>>>>>>> 01d2ad205 (docs: harden maintainer and advisory workflow (#16173))

3. Merge PR and delete branch

If checks are still running, use `--auto` to queue the merge.

```sh
# Check status first
check_status=$(gh pr checks <PR> 2>&1)
if echo "$check_status" | grep -q "pending\|queued"; then
  echo "Checks still running, using --auto to queue merge"
  gh pr merge <PR> --squash --delete-branch --auto
  echo "Merge queued. Monitor with: gh pr checks <PR> --watch"
else
  gh pr merge <PR> --squash --delete-branch
fi
```

<<<<<<< HEAD
If merge fails, report the error and stop. Do not retry in a loop.
If the PR needs changes beyond what `/prepare-pr` already did, stop and say to run `/prepare-pr` again.

=======
Before running merge command, pause and ask for explicit maintainer go-ahead.

If merge fails, report the error and stop. Do not retry in a loop.
If the PR needs changes beyond what `/preparepr` already did, stop and say to run `/preparepr` again.

>>>>>>> 01d2ad205 (docs: harden maintainer and advisory workflow (#16173))
4. Get merge SHA

```sh
merge_sha=$(gh pr view <PR> --json mergeCommit --jq '.mergeCommit.oid')
echo "merge_sha=$merge_sha"
```

<<<<<<< HEAD
5. PR comment
=======
5. Optional comment
>>>>>>> 01d2ad205 (docs: harden maintainer and advisory workflow (#16173))

Use a literal multiline string or heredoc for newlines.

```sh
gh pr comment <PR> --body "$(printf 'Merged via squash.\n\n- Merge commit: %s\n\nThanks @%s!\n' \"$merge_sha\" \"$contrib\")"
```

6. Verify PR state is MERGED

```sh
gh pr view <PR> --json state --jq .state
```

7. Clean up worktree only on success

Run cleanup only if step 6 returned `MERGED`.

```sh
cd ~/dev/openclaw

git worktree remove ".worktrees/pr-<PR>" --force

git branch -D temp/pr-<PR> 2>/dev/null || true
git branch -D pr-<PR> 2>/dev/null || true
```

## Guardrails

- Worktree only.
- Do not close PRs.
- End in MERGED state.
- Clean up only after merge success.
- Never push to main. Use `gh pr merge --squash` only.
- Do not run `git push` at all in this command.
