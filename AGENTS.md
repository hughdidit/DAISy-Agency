# DAISy-Agency

Fork of OpenClaw. Branded as **DAISy**.

## Critical Rules

- Enforce Zero Trust, Least Privilege, and Test Driven (TDD) with Anti-Mock policies in planning and code development.
- Use Git for Windows for all git operations: `"/mnt/c/Program Files/Git/bin/git.exe" <command>`
- Never use WSL git on /mnt/g/ paths (causes NTFS corruption)
- Never build, install, or run the bot locally — all dev/build/test happens on the GCP VM, containerized
- Never commit directly to `daisy/dev` — always use a feature branch and PR.
- Never work in the `daisy/main` branch. That is reserved solely for promoted branches from `daisy/dev`.
- Do not dirty the development branch. Always create feature branches from `daisy/dev` — fetch and checkout `daisy/dev` first, then `git checkout -b feature-branch daisy/dev` to avoid pulling in commits from other branches. Do your development on the feature branch, not on `daisy/dev`.
- Commit all changes to the feature branch, push to origin, and submit a PR for merging back to `daisy/dev`. Always follow the "Closing a PR (merge checklist)" instructions to merge and deploy any code.
- Do not attempt to work around the GitHub CI/CD workflow. It is required.
- Fix errors by adjusting the codebase - not tests, CI checks or deployment scripts (last resort).
- Tests are read-only unless the user explicitly asks to modify tests (TDD).
- If production/staging code breaks tests, stop and ask before changing any test.
- Prefer real-behavior tests over mocks, stubs, spies, fake harnesses, and fake service layers.
- Do not add new mock-based tests or new files/directories whose names match the anti-mock CI pattern, including `*.mock.*`, `*.mocks.*`, `mocks/`, `__mocks__/`, and filenames like `foo-mock.ts` or `mock-server.ts`, unless the user explicitly asks for them.
- Do not weaken real or integration coverage into mocked coverage to make tests pass; if mocks appear necessary, stop and ask before changing tests or adding mock infrastructure.
- The anti-mock CI gate may only be bypassed with explicit maintainer approval via the `allow-new-mock-files` PR label.

## Branch Model

- `daisy/dev` — integration/staging (protected, PRs required)
- `daisy/main` — production

## GitHub Actions

- `GITHUB_TOKEN` cannot push commits containing `.github/workflows/*` changes — use `UPSYNC_PAT`

## Closing a PR (merge checklist)

1. Wait for CI to finish checks. Fix any failed checks, push fixes, and repeat until CI is green.
2. Read all code review conversations on the PR. For each conversation:
   - Make the requested fix, defer with justification, or reject with reasoning.
   - Commit the hotfixes.
   - Leave a reply comment detailing your action, with references to relevant commits, then resolve the conversation.
3. Iterate until CI/CD checks all pass "green" and all review conversations are resolved.
4. REQUIRED STEP: Hold for human approval before proceeding to merge code.
4. Squash-merge the PR with a comment briefly summarising the corrections made during review.
5. Checkout `daisy/dev` and pull to get the merged code and clean the local branch.
6. Trigger a dry-run deploy to staging (`dry_run: true`) with provisioning. Fix any errors and iterate until deploy succeeds.
7. When dry-run succeeds, perform a real deploy to staging (`dry_run: false`) with provisioning and run the `verify.yml` workflow to confirm deployment. Fix any errors and iterate until deploy succeeds.
8. Print a "Synopsis" report with details of the development run, changes made, and deployment results to the terminal.

## Upstream Upgrades

- This file is intentionally different from upstream's AGENTS.md
- On upgrades, discard upstream's version and keep this one
