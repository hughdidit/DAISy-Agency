# Upstream Triage

Automated scanning and classification of upstream (`moltbot/moltbot`) commits that haven't been synced into the fork. Identifies cherry-pick candidates by category and risk, and optionally creates topic branches with PRs for human review.

## Branch model

The triage system uses three refs:

| Ref | Role |
|-----|------|
| `upstream/main` | Upstream source of truth (`moltbot/moltbot`) |
| `origin/main` | Mirror of upstream on the fork — tracks what we've synced so far |
| `daisy/dev` | Fork integration branch — PR target for cherry-pick branches |

**Scan range:** `origin/main..upstream/main` — only commits not yet synced.

**Apply mode flow:**
1. Scan `origin/main..upstream/main` for all unsynced commits (oldest-first)
2. Classify each commit by category and risk
3. Create cherry-pick branches from `origin/main` (one per category)
4. Push branches and create PRs targeting `daisy/dev`
5. Advance `origin/main` to `upstream/main` (sync happens **last** so a mid-run failure doesn't skip commits)

Cherry-picks apply cleanly because they're replayed on their own upstream lineage. Fork divergence is resolved naturally when the PR is merged into `daisy/dev`.

## Safety policy

**No upstream code is ever executed by this tool.** All classification is based on commit metadata (subjects, file paths). Cherry-pick branches contain code for human review only — the script never runs, sources, or evals any upstream content.

## Quick start

```bash
# Generate a triage report
scripts/upstream-triage.sh

# With AI-assisted classification
scripts/upstream-triage.sh --ai-triage

# Create cherry-pick branches + open PRs
scripts/upstream-triage.sh --apply --open-pr
```

## CLI reference

```
scripts/upstream-triage.sh [OPTIONS]

  --base-ref REF        Fork branch to compare against (default: daisy/dev)
  --upstream-ref REF    Upstream ref to scan (default: upstream/main)
  --ai-triage           Use Claude CLI for semantic classification (falls back to heuristic)
  --apply               Create cherry-pick topic branches (throwaway, for review only)
  --open-pr             Open PRs for topic branches (requires --apply)
  --help                Show help
```

## Classification categories

Commits are classified using a first-match-wins priority:

| Priority | Category | Trigger | Auto cherry-pick? |
|----------|----------|---------|-------------------|
| 1 | **deps/security** | Lockfiles, `dependabot.yml`, `patches/`; or message matches `security\|cve\|bump\|dependabot\|vulnerability` | Yes |
| 2 | **ci** | `.github/workflows/**`; or message matches `^ci:` | Yes |
| 3 | **bugfix** | Message matches `^fix:\|bug\|crash\|regression` | Yes |
| 4 | **docs** | Only `docs/**` or `*.md` changed (no `src/`/`packages/`/`scripts/`) | Yes |
| 5 | **refactor/feature** | Everything else | Yes — review carefully |

## Risk scoring (1–5)

| Condition | Score impact |
|-----------|-------------|
| Base score | +1 |
| >10 files changed | +1 |
| >50 files changed | +2 (replaces above) |
| Touches deploy/docker-compose/auth/secrets paths | +1 |
| Message contains `revert` or `breaking` | +1 |
| Message contains `refactor` | +1 |

Score is capped at 5.

## What to beware of (per category)

- **deps/security**: Verify lockfile diffs match declared changes. Check for post-install scripts in new packages. Confirm no unexpected transitive dependencies.
- **ci**: Workflow changes can exfiltrate secrets. Inspect all `run:` blocks, new action references, and permission changes. Verify pinned action SHAs.
- **bugfix**: May subtly change behavior the fork relies on. Check side effects in shared modules, altered return types, changed error handling.
- **docs**: Low risk. Confirm no executable content in markdown, no leaked infrastructure paths.
- **refactor/feature**: HIGH RISK. Cherry-picked for review but requires extra scrutiny. May conflict with fork changes or introduce unwanted dependencies.

## AI triage (`--ai-triage`)

When enabled, each commit's metadata (SHA, subject, author, file list) is sent to `claude -p` for semantic classification. The AI returns a structured response with category, risk score, confidence, and reasoning.

- Only used when confidence >= 0.6; otherwise falls back to heuristic
- Gracefully degrades if `claude` CLI is not installed or API key is missing
- Requires `ANTHROPIC_API_KEY` environment variable

## Apply mode (`--apply`)

Apply mode creates cherry-pick branches from `origin/main` for each category, then advances `origin/main` to `upstream/main` after all branches and PRs are created. The sync happens last so that a mid-run failure leaves the bookmark unchanged and the next run re-processes the same batch.

### Cherry-pick branches

Creates throwaway branches per category, all rooted at `origin/main`:

- `cherry/deps-security-YYYY-MM-DD-HHMM`
- `cherry/ci-YYYY-MM-DD-HHMM`
- `cherry/bugfix-YYYY-MM-DD-HHMM`
- `cherry/docs-YYYY-MM-DD-HHMM`
- `cherry/refactor-feature-YYYY-MM-DD-HHMM`

Behavior:
- Branch names include date+time (HHMM) for uniqueness; a serial suffix (`_2`, `_3`, ...) is appended on rare same-minute collisions
- Each run creates new branches — prior runs' branches and PRs are left untouched
- Cherry-picks oldest-first (chronological order)
- Conflicts are committed with markers intact — visible in the PR diff for manual resolution
- No force pushes

### About conflicts

Cherry-picks may conflict due to structural issues in upstream history (delete/modify, rename/rename). When this happens, the conflict markers are committed as-is so they are visible in the PR diff for the reviewer to resolve.

Fork divergence (differences between `daisy/dev` and upstream) is handled naturally when the PR is merged. The PR merge UI will show any conflicts between the cherry-pick branch and `daisy/dev`, which can be resolved there or locally with `git merge`.

## Open PR mode (`--open-pr`)

Requires `--apply`. Creates one PR per topic branch via `gh pr create --base daisy/dev`.

Each PR includes:
- Commit list with risk scores
- Category-specific "what to beware of" guidance
- Review checklist (manual verification required before merge)
- Explicit notice that no upstream code was executed

Skips branches that already have an open PR.

## GitHub Actions workflow

The workflow runs on schedule and manual dispatch.

### Scheduled (Monday 08:00 UTC)

Report-only: generates the triage report, uploads it as an artifact, and creates a GitHub issue with the summary.

### Manual dispatch

Supports all flags via inputs:

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `apply` | boolean | false | Create cherry-pick branches |
| `open_pr` | boolean | false | Open PRs (requires apply) |
| `ai_triage` | boolean | false | AI classification |

### Triggering manually

```bash
# Report only
gh workflow run upstream-triage.yml

# With cherry-pick branches and PRs
gh workflow run upstream-triage.yml -f apply=true -f open_pr=true

# With AI triage
gh workflow run upstream-triage.yml -f ai_triage=true
```

### Required secrets

| Secret | When needed |
|--------|-------------|
| `UPSYNC_PAT` | Apply mode — fine-grained PAT with Contents + Workflows permissions. Required because cherry-pick branches may contain upstream workflow file changes that `GITHUB_TOKEN` cannot push. |
| `ANTHROPIC_API_KEY` | Only when `ai_triage` is true |

## Output files

| File | Description |
|------|-------------|
| `docs/upstream-candidates/YYYY-MM-DD-HHMM.md` | Triage report (report mode only; unique per run) |

Reports are derived artifacts and are not committed by default.

## Prerequisites

- Bash 4+ (required for associative arrays; on macOS: `brew install bash`)
- `upstream` remote configured: `git remote add upstream https://github.com/moltbot/moltbot.git`
- `jq` installed (for AI triage JSON processing)
- `gh` CLI authenticated (for `--open-pr`)
- `claude` CLI installed with `ANTHROPIC_API_KEY` (for `--ai-triage`, optional)

## Troubleshooting

**"Remote 'upstream' not configured"**
```bash
git remote add upstream https://github.com/moltbot/moltbot.git
git remote set-url --push upstream DISABLE
```

**"No new upstream commits found"**
`origin/main` is already at `upstream/main`. Nothing to scan.

**"origin/main is not an ancestor of upstream/main"**
`origin/main` has diverged from upstream. This should not happen under normal operation. Manual intervention is required to reconcile the two branches.

**AI triage falls back to heuristic**
Check that `claude` CLI is installed and `ANTHROPIC_API_KEY` is set. The script continues with heuristic classification on failure.

**Cherry-pick conflicts in PR diff**
Some cherry-picks may conflict due to structural issues in upstream history. These are committed with conflict markers intact and visible in the PR diff for manual resolution.

**PR merge conflicts**
These represent divergence between `daisy/dev` and upstream. Resolve in the GitHub merge UI or locally with `git merge`. This is expected and normal.
