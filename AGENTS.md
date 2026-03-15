# DAISy-Agency

Fork of OpenClaw. Branded as **DAISy**.

## Critical Rules

- Use Git for Windows for all git operations: `"/mnt/c/Program Files/Git/bin/git.exe" <command>`
- Never use WSL git on /mnt/g/ paths (causes NTFS corruption)
- Never build, install, or run the bot locally — all dev/build/test happens on the GCP VM, containerized
- Never commit directly to `daisy/dev` — always use a feature branch and PR
- Always create feature branches from `daisy/dev` — fetch and checkout `daisy/dev` first, then `git checkout -b feature-branch daisy/dev` to avoid pulling in commits from other branches

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
4. Squash-merge the PR with a comment briefly summarising the corrections made during review.
5. Checkout `daisy/dev` and pull to get the merged result.
6. Trigger a dry-run deploy to staging (`dry_run: true`). Fix any errors and re-run until it succeeds.
7. When dry-run succeeds, perform a real deploy to staging (`dry_run: false`) and run the `verify.yml` workflow to confirm deployment.
8. Print a short summary report to the terminal.

## Upstream Upgrades

- This file is intentionally different from upstream's AGENTS.md
- On upgrades, discard upstream's version and keep this one
