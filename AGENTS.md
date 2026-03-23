# DAISy-Agency

Fork of OpenClaw. Branded as **DAISy**.

## Critical Rules

- Enforce Zero Trust and Least Privilege policies in planning and code.
- Use Git for Windows for all git operations: `"/mnt/c/Program Files/Git/bin/git.exe" <command>`
- Never use WSL git on /mnt/g/ paths (causes NTFS corruption)
- Never build, install, or run the bot locally — all dev/build/test happens on the GCP VM, containerized
- Never commit directly to `daisy/dev` — always use a feature branch and PR
- Always create feature branches from `daisy/dev` — fetch and checkout `daisy/dev` first, then `git checkout -b feature-branch daisy/dev` to avoid pulling in commits from other branches. Do your development on the feature branch, not on `daisy/dev`.
- Commit all changes to the feature branch, push to origin, and submit a PR for merging back to `daisy/dev`. Following "Closing a PR (merge checklist)" to finish.
- Fix errors by adjusting the codebase - not tests, CI checks or deployment scripts (last resort).

## Branch Model

- `daisy/dev` — integration/staging (protected, PRs required)
- `daisy/main` — production

## GitHub Actions

- `GITHUB_TOKEN` cannot push commits containing `.github/workflows/*` changes — use `UPSYNC_PAT`

## Closing a PR (merge checklist)

1. Wait for CI to finish checks. Fix any failed checks, push fixes, and repeat until CI is green.
2. Read all code review conversations on the PR. For each conversation:
   - Make the requested fix, defer with justification, or reject with reasoning.
   - Leave a reply comment detailing your action, then resolve the conversation.
3. After all conversations are resolved, do one more CI pass — fix any new failures until green.
   3.5. Get human approval before proceeding.
4. Squash-merge the PR with a comment briefly summarising the corrections made during review.
5. Checkout `daisy/dev` and pull to get the merged result.
6. Trigger a dry-run deploy to staging (`dry_run: true`) with provisioning. Fix any errors and iterate until deploy succeeds.
7. When dry-run succeeds, perform a real deploy to staging (`dry_run: false`) with provisioning and run the `verify.yml` workflow to confirm deployment. Fix any errors and iterate until deploy succeeds.
8. Print a "Synopsis" report with details of the development run and results to the terminal.

## Upstream Upgrades

- This file is intentionally different from upstream's AGENTS.md
- On upgrades, discard upstream's version and keep this one
