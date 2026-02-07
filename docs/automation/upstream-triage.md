# Upstream Triage

Automated scanning and classification of upstream (`moltbot/moltbot`) commits that haven't been merged into the fork (`daisy/dev`). Identifies cherry-pick candidates by category and risk, and optionally creates topic branches with PRs for human review.

## Safety policy

**No upstream code is ever executed by this tool.** All classification is based on commit metadata (subjects, file paths). Cherry-pick branches contain code for human review only — the script never runs, sources, or evals any upstream content.

## Quick start

```bash
# Generate a triage report (last 20 commits)
scripts/upstream-triage.sh --max 20

# With AI-assisted classification
scripts/upstream-triage.sh --max 50 --ai-triage

# Create cherry-pick branches + open PRs
scripts/upstream-triage.sh --max 50 --apply --open-pr
```

## CLI reference

```
scripts/upstream-triage.sh [OPTIONS]

  --base-ref REF        Fork branch to compare against (default: daisy/dev)
  --upstream-ref REF    Upstream ref to scan (default: upstream/main)
  --max N               Limit number of commits scanned
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
- **refactor/feature**: HIGH RISK. Not auto-cherry-picked. May conflict with fork changes or introduce unwanted dependencies.

## AI triage (`--ai-triage`)

When enabled, each commit's metadata (SHA, subject, author, file list) is sent to `claude -p` for semantic classification. The AI returns a structured response with category, risk score, confidence, and reasoning.

- Only used when confidence >= 0.6; otherwise falls back to heuristic
- Gracefully degrades if `claude` CLI is not installed or API key is missing
- Requires `ANTHROPIC_API_KEY` environment variable

## Apply mode (`--apply`)

Creates throwaway branches per category:

- `cherry/deps-security-YYYY-MM-DD`
- `cherry/ci-YYYY-MM-DD`
- `cherry/bugfix-YYYY-MM-DD`
- `cherry/docs-YYYY-MM-DD`

Behavior:
- Cherry-picks oldest-first (chronological order)
- Skips already-applied SHAs (`git merge-base --is-ancestor`)
- Aborts and logs conflicting picks to `docs/upstream-candidates/conflicts-YYYY-MM-DD.txt`
- Refactor/feature commits get their own branch — review with extra scrutiny
- No force pushes

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
| `max` | string | 200 | Max commits to scan |

### Triggering manually

```bash
# Report only
gh workflow run upstream-triage.yml

# With cherry-pick branches and PRs
gh workflow run upstream-triage.yml -f apply=true -f open_pr=true -f max=100

# With AI triage
gh workflow run upstream-triage.yml -f ai_triage=true
```

### Required secrets

| Secret | When needed |
|--------|-------------|
| `ANTHROPIC_API_KEY` | Only when `ai_triage` is true |

## Output files

| File | Description |
|------|-------------|
| `docs/upstream-candidates/YYYY-MM-DD.md` | Triage report (regenerated each run) |
| `docs/upstream-candidates/conflicts-YYYY-MM-DD.txt` | Cherry-pick conflicts (only if `--apply` encounters conflicts) |

Reports are derived artifacts (idempotent, overwritten on re-run) and are not committed by default.

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

**"No upstream-only commits found"**
The fork is up to date with upstream. Nothing to do.

**AI triage falls back to heuristic**
Check that `claude` CLI is installed and `ANTHROPIC_API_KEY` is set. The script continues with heuristic classification on failure.

**Cherry-pick conflicts**
Check `docs/upstream-candidates/conflicts-YYYY-MM-DD.txt` for the list of conflicting SHAs. These need manual resolution.
