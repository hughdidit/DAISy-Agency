---
name: review-pr
description: Script-first review-only GitHub pull request analysis. Use for deterministic PR review with structured findings handoff to /prepare-pr.
---

# Review PR

## Overview

<<<<<<< HEAD
Perform a thorough review-only PR assessment and return a structured recommendation on readiness for /preparepr.
=======
Perform a read-only review and produce both human and machine-readable outputs.
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)

## Inputs

- Ask for PR number or URL.
- If missing, always ask.

## Safety

- Never push, merge, or modify code intended to keep.
- Work only in `.worktrees/pr-<PR>`.
- Wrapper commands are cwd-agnostic; you can run them from repo root or inside the PR worktree.

## Execution Contract

1. Run wrapper setup:

```sh
<<<<<<< HEAD
cd ~/dev/openclaw
# Sanity: confirm you are in the repo
git rev-parse --show-toplevel

WORKTREE_DIR=".worktrees/pr-<PR>"
git fetch origin main

# Reuse existing worktree if it exists, otherwise create new
if [ -d "$WORKTREE_DIR" ]; then
  cd "$WORKTREE_DIR"
  git checkout temp/pr-<PR> 2>/dev/null || git checkout -b temp/pr-<PR>
  git fetch origin main
  git reset --hard origin/main
else
  git worktree add "$WORKTREE_DIR" -b temp/pr-<PR> origin/main
  cd "$WORKTREE_DIR"
fi

# Create local scratch space that persists across /reviewpr to /preparepr to /mergepr
mkdir -p .local
=======
scripts/pr-review <PR>
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)
```

2. Use explicit branch mode switches:

- Main baseline mode: `scripts/pr review-checkout-main <PR>`
- PR-head mode: `scripts/pr review-checkout-pr <PR>`

3. Before writing review outputs, run branch guard:

```sh
scripts/pr review-guard <PR>
```

4. Write both outputs:

- `.local/review.md` with sections A through J.
- `.local/review.json` with structured findings.

5. Validate artifacts semantically:

```sh
scripts/pr review-validate-artifacts <PR>
```

## Steps

1. Setup and metadata

```sh
scripts/pr-review <PR>
ls -la .local/pr-meta.json .local/pr-meta.env .local/review-context.env .local/review-mode.env
```

2. Existing implementation check on main

```sh
scripts/pr review-checkout-main <PR>
rg -n "<keyword>" -S src extensions apps || true
git log --oneline --all --grep "<keyword>" | head -20
```

3. Claim PR

```sh
gh_user=$(gh api user --jq .login)
gh pr edit <PR> --add-assignee "$gh_user" || echo "Could not assign reviewer, continuing"
```

4. Read PR description and diff

```sh
scripts/pr review-checkout-pr <PR>
gh pr diff <PR>

source .local/review-context.env
git diff --stat "$MERGE_BASE"..pr-<PR>
git diff "$MERGE_BASE"..pr-<PR>
```

5. Optional local tests

Use the wrapper for target validation and executed-test verification:

```sh
scripts/pr review-tests <PR> <test-file> [<test-file> ...]
```

6. Initialize review artifact templates

```sh
scripts/pr review-artifacts-init <PR>
```

7. Produce review outputs

- Fill `.local/review.md` sections A through J.
- Fill `.local/review.json`.

Minimum JSON shape:

```json
{
  "recommendation": "READY FOR /prepare-pr",
  "findings": [
    {
      "id": "F1",
      "severity": "IMPORTANT",
      "title": "...",
      "area": "path/or/component",
      "fix": "Actionable fix"
    }
  ],
  "tests": {
    "ran": [],
    "gaps": [],
    "result": "pass"
  },
  "docs": "up_to_date|missing|not_applicable",
  "changelog": "required"
}
```

<<<<<<< HEAD
8. Perform a security review

Assume OpenClaw subagents run with full disk access, including git, gh, and shell. Check auth, input validation, secrets, dependencies, tool safety, and privacy.

9. Review tests and verification

Identify what exists, what is missing, and what would be a minimal regression test.

10. Check docs

Check if the PR touches code with related documentation such as README, docs, inline API docs, or config examples.

- If docs exist for the changed area and the PR does not update them, flag as IMPORTANT.
- If the PR adds a new feature or config option with no docs, flag as IMPORTANT.
- If the change is purely internal with no user-facing impact, skip this.

11. Check changelog

Check if `CHANGELOG.md` exists and whether the PR warrants an entry.

- If the project has a changelog and the PR is user-facing, flag missing entry as IMPORTANT.
- Leave the change for /preparepr, only flag it here.

12. Answer the key question

Decide if /preparepr can fix issues or the contributor must update the PR.

13. Save findings to the worktree

Write the full structured review sections A through J to `.local/review.md`.
Create or overwrite the file and verify it exists and is non-empty.
=======
8. Guard + validate before final output
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)

```sh
scripts/pr review-guard <PR>
scripts/pr review-validate-artifacts <PR>
```

<<<<<<< HEAD
14. Output the structured review

Produce a review that matches what you saved to `.local/review.md`.

A) TL;DR recommendation

- One of: READY FOR /preparepr | NEEDS WORK | NEEDS DISCUSSION | NOT USEFUL (CLOSE)
- 1 to 3 sentences.

B) What changed

C) What is good

D) Security findings

E) Concerns or questions (actionable)

- Numbered list.
- Mark each item as BLOCKER, IMPORTANT, or NIT.
- For each, point to file or area and propose a concrete fix.

F) Tests

G) Docs status

- State if related docs are up to date, missing, or not applicable.

H) Changelog

- State if `CHANGELOG.md` needs an entry and which category.

I) Follow ups (optional)

J) Suggested PR comment (optional)

=======
>>>>>>> 72fbfaa75 (chore: making PR review chores deterministic + less token hungry)
## Guardrails

- Keep review read-only.
- Do not delete worktree.
- Use merge-base scoped diff for local context to avoid stale branch drift.
