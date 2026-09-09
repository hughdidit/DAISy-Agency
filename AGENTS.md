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

## Fork discipline

- Do not propose branch sync, rebase-on-upstream, or bulk cherry-pick strategies unless explicitly requested for a candidate-review task.
- This repository is an independent fork. Do not optimize changes for upstream contribution.
- Do not prepare, suggest, or assume pushback to OpenClaw upstream unless explicitly requested.
- DAISy-Agency is expected to diverge independently from OpenClaw over time.
- Treat upstream OpenClaw changes as a source of selective candidate improvements only.
- When reviewing upstream changes, identify useful candidates for adoption based on DAISy’s needs, security, maintainability, and compatibility with existing fork-specific behavior.
- Do not merge or mimic upstream behavior by default.
- Preserve DAISy-specific architecture, workflows, and product decisions unless the current task explicitly changes them.
- When adopting an upstream-derived idea or patch, minimize the imported surface area and document any intentional adaptation to DAISy’s divergent design.

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
4. REQUIRED STEP: use `code-review-and-quality` and resolve found issues before proceeding to merge code.
5. Squash-merge the PR with a comment briefly summarising the corrections made during review.
6. Checkout `daisy/dev` and pull to get the merged code and clean the local branch.
7. Trigger a dry-run deploy to staging (`dry_run: true`) with provisioning. Fix any errors and iterate until deploy succeeds.
8. When dry-run succeeds, perform a real deploy to staging (`dry_run: false`) with provisioning and run the `verify.yml` workflow to confirm deployment. Fix any errors and iterate until deploy succeeds.
9. Print a "Synopsis" report with details of the development run, changes made, and deployment results to the terminal.

## Upstream Upgrades

- This file is intentionally different from upstream's AGENTS.md
- On upgrades, discard upstream's version and keep this one

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
