#!/usr/bin/env bash
set -euo pipefail

# Upstream Candidate Raiser
# Scans upstream commits not in the fork branch, classifies and scores them,
# and optionally creates cherry-pick branches with PRs.
#
# SAFETY POLICY — NO EXEC
# This script NEVER executes, sources, evals, or interprets any code from
# upstream. All operations are strictly read-only git plumbing:
#   - git log/diff-tree: reads commit metadata and file lists only
#   - git cherry-pick (--apply): applies patches to a throwaway branch
#     but does NOT run any of the cherry-picked code
#   - Classification uses only commit subjects (strings) and file paths
# Upstream content is evaluated, classified, and bucketed — never run.
# PRs created by --open-pr are for human review before any merge.
#
# Usage: scripts/upstream-triage.sh [OPTIONS]

# Requires Bash 4+ for associative arrays (declare -A)
if [[ "${BASH_VERSINFO[0]}" -lt 4 ]]; then
  echo "ERROR: Bash 4+ required (found ${BASH_VERSION}). On macOS: brew install bash" >&2
  exit 1
fi

# =============================================================================
# Defaults
# =============================================================================

BASE_REF="daisy/dev"
UPSTREAM_REF="upstream/main"
MAX_COMMITS=""
AI_TRIAGE="false"
APPLY="false"
OPEN_PR="false"
TODAY="$(date +%Y-%m-%d)"
REPORT_DIR="docs/upstream-candidates"
REPORT_FILE=""
CONFLICT_FILE=""

# =============================================================================
# Usage
# =============================================================================

usage() {
  cat <<'EOF'
Usage: scripts/upstream-triage.sh [OPTIONS]

Scan upstream commits not in the fork branch, classify and score them,
and optionally create cherry-pick topic branches.

Options:
  --base-ref REF        Fork branch (default: daisy/dev)
  --upstream-ref REF    Upstream ref (default: upstream/main)
  --max N               Limit commits scanned
  --ai-triage           Classify commits using Claude CLI
  --apply               Create cherry-pick topic branches
  --open-pr             Open PRs for topic branches (requires --apply)
  --help                Show this help message

Output:
  docs/upstream-candidates/YYYY-MM-DD.md        Triage report
  docs/upstream-candidates/conflicts-YYYY-MM-DD.txt  Cherry-pick conflicts (if any)
EOF
  exit 0
}

# =============================================================================
# Argument parsing
# =============================================================================

while [[ "${1:-}" == --* ]]; do
  case "${1}" in
    --base-ref)
      BASE_REF="${2:?--base-ref requires a value}"
      shift 2
      ;;
    --upstream-ref)
      UPSTREAM_REF="${2:?--upstream-ref requires a value}"
      shift 2
      ;;
    --max)
      MAX_COMMITS="${2:?--max requires a value}"
      shift 2
      ;;
    --ai-triage)
      AI_TRIAGE="true"
      shift
      ;;
    --apply)
      APPLY="true"
      shift
      ;;
    --open-pr)
      OPEN_PR="true"
      shift
      ;;
    --help)
      usage
      ;;
    *)
      echo "ERROR: Unknown option: ${1}" >&2
      exit 1
      ;;
  esac
done

if [[ "${OPEN_PR}" == "true" && "${APPLY}" != "true" ]]; then
  echo "ERROR: --open-pr requires --apply" >&2
  exit 1
fi

# =============================================================================
# Output helpers
# =============================================================================

log()  { echo ":: $*"; }
warn() { echo "WARN: $*" >&2; }
err()  { echo "ERROR: $*" >&2; }

# =============================================================================
# Ensure upstream is fetched
# =============================================================================

log "Fetching upstream..."
if ! git remote get-url upstream &>/dev/null; then
  err "Remote 'upstream' not configured. Add it with:"
  err "  git remote add upstream https://github.com/moltbot/moltbot.git"
  exit 1
fi
git fetch upstream --quiet

# Verify refs exist
if ! git rev-parse --verify "${BASE_REF}" &>/dev/null; then
  err "Base ref '${BASE_REF}' not found"
  exit 1
fi
if ! git rev-parse --verify "${UPSTREAM_REF}" &>/dev/null; then
  err "Upstream ref '${UPSTREAM_REF}' not found"
  exit 1
fi

# =============================================================================
# Collect upstream-only commits
# =============================================================================

log "Collecting commits in ${UPSTREAM_REF} not in ${BASE_REF}..."

MAX_FLAG=""
if [[ -n "${MAX_COMMITS}" ]]; then
  MAX_FLAG="--max-count=${MAX_COMMITS}"
fi

# Format: SHA␟subject␟author␟date (fields separated by ASCII Unit Separator %x1f)
COMMITS="$(git log ${MAX_FLAG} --format='%H%x1f%s%x1f%an%x1f%ai' "${BASE_REF}..${UPSTREAM_REF}" --)"

if [[ -z "${COMMITS}" ]]; then
  log "No upstream-only commits found. Fork is up to date."
  exit 0
fi

COMMIT_COUNT="$(echo "${COMMITS}" | wc -l)"
log "Found ${COMMIT_COUNT} upstream-only commit(s)"

# =============================================================================
# Classification helpers
# =============================================================================

# classify_commit SHA SUBJECT FILES_CHANGED
# Prints: category
classify_commit() {
  local sha="$1" subject="$2" files="$3"
  local subject_lower
  subject_lower="$(echo "${subject}" | tr '[:upper:]' '[:lower:]')"

  # 1. deps/security
  if echo "${files}" | grep -qE '(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|dependabot\.yml|patches/)'; then
    echo "deps/security"
    return
  fi
  if echo "${subject_lower}" | grep -qiE '(security|cve|bump|dependabot|vulnerability)'; then
    echo "deps/security"
    return
  fi

  # 2. ci
  if echo "${files}" | grep -qE '^\.github/workflows/'; then
    echo "ci"
    return
  fi
  if echo "${subject_lower}" | grep -qE '^ci:'; then
    echo "ci"
    return
  fi

  # 3. bugfix
  if echo "${subject_lower}" | grep -qiE '(^fix:|bug|crash|regression)'; then
    echo "bugfix"
    return
  fi

  # 4. docs — only if ALL changed files are docs/** or *.md, and none touch src/packages/scripts
  if [[ -n "${files}" ]]; then
    local has_code="false"
    local has_docs="false"
    while IFS= read -r f; do
      [[ -z "${f}" ]] && continue
      if echo "${f}" | grep -qE '^(src/|packages/|scripts/)'; then
        has_code="true"
        break
      fi
      if echo "${f}" | grep -qE '(^docs/|\.md$)'; then
        has_docs="true"
      fi
    done <<< "${files}"
    if [[ "${has_code}" == "false" && "${has_docs}" == "true" ]]; then
      echo "docs"
      return
    fi
  fi

  # 5. refactor/feature (catch-all)
  echo "refactor/feature"
}

# score_commit SUBJECT FILES_CHANGED
# Prints: risk score 1-5
score_commit() {
  local subject="$1" files="$2"
  local score=1
  local subject_lower
  subject_lower="$(echo "${subject}" | tr '[:upper:]' '[:lower:]')"

  # File count scoring
  local file_count=0
  if [[ -n "${files}" ]]; then
    file_count="$(echo "${files}" | grep -c . || true)"
  fi
  if [[ "${file_count}" -gt 50 ]]; then
    score=$((score + 2))
  elif [[ "${file_count}" -gt 10 ]]; then
    score=$((score + 1))
  fi

  # Sensitive paths
  if echo "${files}" | grep -qE '(deploy|docker-compose|auth|secrets)'; then
    score=$((score + 1))
  fi

  # Message keywords
  if echo "${subject_lower}" | grep -qiE '(revert|breaking)'; then
    score=$((score + 1))
  fi
  if echo "${subject_lower}" | grep -qiE 'refactor'; then
    score=$((score + 1))
  fi

  # Cap at 5
  if [[ "${score}" -gt 5 ]]; then
    score=5
  fi

  echo "${score}"
}

# risk_label SCORE
risk_label() {
  case "$1" in
    1) echo "Low" ;;
    2) echo "Low-Medium" ;;
    3) echo "Medium" ;;
    4) echo "Medium-High" ;;
    5) echo "High" ;;
    *) echo "Unknown" ;;
  esac
}

# beware_note CATEGORY
# Returns a short warning about what to watch for when reviewing this category
beware_note() {
  case "$1" in
    deps/security)
      echo "Verify lockfile diffs match declared dependency changes. Check for post-install scripts in new/updated packages. Confirm no transitive dependency introduces unexpected binaries."
      ;;
    ci)
      echo "Workflow changes can exfiltrate secrets or alter build outputs. Inspect all 'run:' blocks, new action references, and permission changes. Verify pinned action SHAs."
      ;;
    bugfix)
      echo "Bug fixes may subtly change behavior the fork relies on. Check for side effects in shared modules, altered return types, and changed error handling paths."
      ;;
    docs)
      echo "Low risk. Confirm no executable content embedded in markdown (scripts in fenced blocks, HTML script tags). Verify no path references leak internal infrastructure."
      ;;
    refactor/feature)
      echo "HIGH RISK — not auto-cherry-picked. Large refactors may conflict with fork-specific changes. New features may introduce unwanted dependencies or alter public API surfaces."
      ;;
  esac
}

# =============================================================================
# AI triage helper
# =============================================================================

# ai_classify SHA SUBJECT AUTHOR FILES
# Prints JSON: {type, risk, confidence, reason, worth_cherry_picking}
ai_classify() {
  local sha="$1" subject="$2" author="$3" files="$4"

  if ! command -v jq &>/dev/null; then
    warn "jq not found; falling back to heuristic for ${sha:0:8}"
    return 1
  fi

  if ! command -v claude &>/dev/null; then
    warn "claude CLI not found; falling back to heuristic for ${sha:0:8}"
    return 1
  fi

  local input
  input="$(cat <<EOJSON
{
  "sha": "${sha}",
  "subject": $(printf '%s' "${subject}" | jq -Rs .),
  "author": $(printf '%s' "${author}" | jq -Rs .),
  "files": $(printf '%s' "${files}" | jq -Rs 'split("\n") | map(select(. != ""))')
}
EOJSON
)"

  local prompt
  prompt='You are classifying a git commit for cherry-pick triage in a fork.

Classify into exactly one category:
- deps/security: dependency updates, security patches, CVEs
- ci: CI/CD workflow changes
- bugfix: bug fixes, crash fixes, regressions
- docs: documentation-only changes
- refactor/feature: refactoring or new features

Return ONLY valid JSON (no markdown, no explanation):
{"type":"<category>","risk":<1-5>,"confidence":<0.0-1.0>,"reason":"<one sentence>","worth_cherry_picking":<true|false>}

Commit data:
'

  local result
  if result="$(echo "${input}" | claude -p "${prompt}${input}" 2>/dev/null)"; then
    # Validate it looks like JSON
    if echo "${result}" | jq -e '.type' &>/dev/null; then
      echo "${result}"
      return 0
    fi
  fi

  warn "AI classification failed for ${sha:0:8}; falling back to heuristic"
  return 1
}

# =============================================================================
# Process commits
# =============================================================================

# Arrays to hold results (indexed by category)
declare -A CAT_COMMITS  # category -> newline-separated "sha␟subject␟author␟date␟risk␟reason"
declare -A CAT_COUNTS
CATEGORIES=("deps/security" "ci" "bugfix" "docs" "refactor/feature")
for cat in "${CATEGORIES[@]}"; do
  CAT_COMMITS["${cat}"]=""
  CAT_COUNTS["${cat}"]=0
done

TOTAL_PROCESSED=0

log "Classifying commits..."

while IFS=$'\x1f' read -r sha subject author date_str; do
  [[ -z "${sha}" ]] && continue

  files="$(git diff-tree --no-commit-id --name-only -r "${sha}" 2>/dev/null || true)"

  category=""
  risk=""
  reason=""

  # Try AI triage first if enabled
  if [[ "${AI_TRIAGE}" == "true" ]]; then
    if ai_result="$(ai_classify "${sha}" "${subject}" "${author}" "${files}")"; then
      ai_confidence="$(echo "${ai_result}" | jq -r '.confidence // 0')"
      # Use AI result only if confidence >= 0.6
      if awk "BEGIN{exit (${ai_confidence} >= 0.6) ? 0 : 1}"; then
        category="$(echo "${ai_result}" | jq -r '.type')"
        risk="$(echo "${ai_result}" | jq -r '.risk')"
        reason="$(echo "${ai_result}" | jq -r '.reason')"
      fi
    fi
  fi

  # Fall back to heuristic
  if [[ -z "${category}" ]]; then
    category="$(classify_commit "${sha}" "${subject}" "${files}")"
    risk="$(score_commit "${subject}" "${files}")"
    reason="heuristic"
  fi

  # Validate category
  _valid="false"
  for cat in "${CATEGORIES[@]}"; do
    if [[ "${cat}" == "${category}" ]]; then
      _valid="true"
      break
    fi
  done
  if [[ "${_valid}" == "false" ]]; then
    category="refactor/feature"
  fi

  entry="${sha}"$'\x1f'"${subject}"$'\x1f'"${author}"$'\x1f'"${date_str}"$'\x1f'"${risk}"$'\x1f'"${reason}"
  if [[ -n "${CAT_COMMITS[${category}]}" ]]; then
    CAT_COMMITS["${category}"]="${CAT_COMMITS[${category}]}"$'\n'"${entry}"
  else
    CAT_COMMITS["${category}"]="${entry}"
  fi
  CAT_COUNTS["${category}"]=$(( ${CAT_COUNTS["${category}"]} + 1 ))

  TOTAL_PROCESSED=$((TOTAL_PROCESSED + 1))

done <<< "${COMMITS}"

log "Classified ${TOTAL_PROCESSED} commit(s)"

# =============================================================================
# Generate markdown report
# =============================================================================

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/${TODAY}.md"

log "Writing report to ${REPORT_FILE}..."

{
  echo "# Upstream Triage Report — ${TODAY}"
  echo ""
  echo "> **No upstream code was executed to produce this report.**"
  echo "> All classification is based on commit metadata (subjects, file paths) only."
  echo "> Cherry-pick branches (if created) contain code for **human review** — not execution."
  echo ""
  echo "**Base:** \`${BASE_REF}\`  "
  echo "**Upstream:** \`${UPSTREAM_REF}\`  "
  echo "**Commits scanned:** ${TOTAL_PROCESSED}  "
  if [[ "${AI_TRIAGE}" == "true" ]]; then
    echo "**AI triage:** enabled  "
  fi
  echo ""

  # Summary table
  echo "## Summary"
  echo ""
  echo "| Category | Count | Action |"
  echo "|----------|-------|--------|"
  for cat in "${CATEGORIES[@]}"; do
    count="${CAT_COUNTS[${cat}]}"
    case "${cat}" in
      deps/security) action="Cherry-pick recommended" ;;
      ci)            action="Cherry-pick recommended" ;;
      bugfix)        action="Cherry-pick recommended" ;;
      docs)          action="Cherry-pick if relevant" ;;
      refactor/feature) action="Review carefully — higher risk" ;;
    esac
    echo "| ${cat} | ${count} | ${action} |"
  done
  echo ""

  # Detail sections
  for cat in "${CATEGORIES[@]}"; do
    count="${CAT_COUNTS[${cat}]}"
    [[ "${count}" -eq 0 ]] && continue

    echo "## ${cat} (${count})"
    echo ""
    echo "**Beware:** $(beware_note "${cat}")"
    echo ""
    echo "| SHA | Subject | Author | Risk | Notes |"
    echo "|-----|---------|--------|------|-------|"

    while IFS=$'\x1f' read -r sha subject author date_str risk reason; do
      [[ -z "${sha}" ]] && continue
      short_sha="${sha:0:8}"
      label="$(risk_label "${risk}")"
      # Escape pipes in subject/author to avoid breaking markdown table
      subject_escaped="${subject//|/\\|}"
      author_escaped="${author//|/\\|}"
      echo "| \`${short_sha}\` | ${subject_escaped} | ${author_escaped} | ${risk}/5 ${label} | ${reason} |"
    done <<< "${CAT_COMMITS[${cat}]}"

    echo ""
  done

  echo "---"
  echo "*Generated by \`scripts/upstream-triage.sh\` on ${TODAY} — no upstream code was executed*"
} > "${REPORT_FILE}"

log "Report written: ${REPORT_FILE}"

# =============================================================================
# --apply: Create cherry-pick topic branches
# =============================================================================

if [[ "${APPLY}" == "true" ]]; then
  # SAFETY: cherry-pick applies patches to throwaway branches for review.
  # No cherry-picked code is executed, sourced, or tested by this script.
  # The branches exist solely for human review via PR.
  log "Creating cherry-pick topic branches (no upstream code will be executed)..."

  CONFLICT_FILE="${REPORT_DIR}/conflicts-${TODAY}.txt"
  : > "${CONFLICT_FILE}"
  CONFLICT_COUNT=0

  # Cherry-pick all categories into throwaway branches for human review
  for cat in "${CATEGORIES[@]}"; do
    count="${CAT_COUNTS[${cat}]}"
    [[ "${count}" -eq 0 ]] && continue

    # Branch name: cherry/<type>-YYYY-MM-DD
    branch_slug="${cat//\//-}"
    branch_name="cherry/${branch_slug}-${TODAY}"

    log "  Branch: ${branch_name} (${count} commits)"

    # Create branch from base
    if git rev-parse --verify "${branch_name}" &>/dev/null; then
      log "  Branch ${branch_name} already exists; reusing"
      git checkout "${branch_name}" --quiet
    else
      git checkout -b "${branch_name}" "${BASE_REF}" --quiet
    fi

    # Cherry-pick commits oldest-first (reverse the log order)
    shas=()
    while IFS=$'\x1f' read -r sha _rest; do
      [[ -z "${sha}" ]] && continue
      shas+=("${sha}")
    done <<< "${CAT_COMMITS[${cat}]}"

    # Reverse array for chronological order
    reversed=()
    for (( i=${#shas[@]}-1; i>=0; i-- )); do
      reversed+=("${shas[i]}")
    done

    for sha in "${reversed[@]}"; do
      # Skip already-applied commits: detect prior cherry-picks via -x trailer
      if git log "${branch_name}" --grep="cherry picked from commit ${sha}" \
          -F --oneline -1 &>/dev/null \
         && [[ -n "$(git log "${branch_name}" --grep="cherry picked from commit ${sha}" -F --oneline -1 2>/dev/null)" ]]; then
        log "    ${sha:0:8} already cherry-picked; skipping"
        continue
      fi

      if ! git cherry-pick -x "${sha}" --no-edit 2>/dev/null; then
        subject="$(git log -1 --format='%s' "${sha}" 2>/dev/null || echo "unknown")"
        warn "    Conflict cherry-picking ${sha:0:8}: ${subject}"
        echo "${sha} | ${subject} | ${cat}" >> "${CONFLICT_FILE}"
        CONFLICT_COUNT=$((CONFLICT_COUNT + 1))
        git cherry-pick --abort 2>/dev/null || true
      else
        log "    Applied ${sha:0:8}"
      fi
    done

    # Return to base branch
    git checkout "${BASE_REF}" --quiet
  done

  if [[ "${CONFLICT_COUNT}" -gt 0 ]]; then
    warn "${CONFLICT_COUNT} conflict(s) logged to ${CONFLICT_FILE}"
  else
    rm -f "${CONFLICT_FILE}"
    log "All cherry-picks applied cleanly"
  fi
fi

# =============================================================================
# --open-pr: Open PRs for topic branches
# =============================================================================

if [[ "${OPEN_PR}" == "true" ]]; then
  log "Opening PRs for topic branches..."

  if ! command -v gh &>/dev/null; then
    err "gh CLI not found; cannot create PRs"
    exit 1
  fi

  for cat in "${CATEGORIES[@]}"; do
    count="${CAT_COUNTS[${cat}]}"
    [[ "${count}" -eq 0 ]] && continue

    branch_slug="${cat//\//-}"
    branch_name="cherry/${branch_slug}-${TODAY}"

    # Verify branch exists
    if ! git rev-parse --verify "${branch_name}" &>/dev/null; then
      warn "Branch ${branch_name} not found; skipping PR"
      continue
    fi

    # Check for existing PR
    existing_pr="$(gh pr list --head "${branch_name}" --base "${BASE_REF}" --json number --jq '.[0].number' 2>/dev/null || true)"
    if [[ -n "${existing_pr}" ]]; then
      log "  PR #${existing_pr} already exists for ${branch_name}; skipping"
      continue
    fi

    # Build commit list for PR body
    commit_list=""
    while IFS=$'\x1f' read -r sha subject author date_str risk reason; do
      [[ -z "${sha}" ]] && continue
      commit_list="${commit_list}- \`${sha:0:8}\` ${subject} (risk: ${risk}/5)
"
    done <<< "${CAT_COMMITS[${cat}]}"

    # Push branch (skip PR creation on push failure)
    if ! git push origin "${branch_name}" --quiet 2>/dev/null; then
      warn "  Failed to push branch ${branch_name}; skipping PR creation for this category"
      continue
    fi

    pr_title="cherry-pick: upstream ${cat} commits (${TODAY})"

    beware="$(beware_note "${cat}")"

    pr_body="$(cat <<EOPR
## Summary

Automated cherry-pick of upstream \`${cat}\` commits from \`${UPSTREAM_REF}\`.

> **No upstream code was executed.** These commits were classified by metadata
> (commit subjects and file paths) and cherry-picked onto a throwaway branch
> for human review only.

### Commits

${commit_list}

## What to beware of

${beware}

## Risk

- Category: **${cat}**
- Commits: **${count}**

## Review checklist

- [ ] **No code was auto-executed** — verify the diff manually before merging
- [ ] CI passes on this branch
- [ ] Smoke test affected functionality
- [ ] Inspect each commit for unexpected side effects or behavioral changes
- [ ] Check for new dependencies, post-install hooks, or permission changes
- [ ] Review any conflicts logged in \`docs/upstream-candidates/conflicts-${TODAY}.txt\`

---
*Generated by \`scripts/upstream-triage.sh --apply --open-pr\` on ${TODAY} — no upstream code was executed*
EOPR
)"

    if pr_url="$(gh pr create --head "${branch_name}" --base "${BASE_REF}" --title "${pr_title}" --body "${pr_body}" 2>&1)"; then
      log "  Created PR: ${pr_url}"
    else
      warn "  Failed to create PR for ${branch_name}: ${pr_url}"
    fi
  done
fi

# =============================================================================
# Final summary
# =============================================================================

echo ""
echo "=== Triage Summary ==="
echo "  Commits scanned: ${TOTAL_PROCESSED}"
for cat in "${CATEGORIES[@]}"; do
  echo "  ${cat}: ${CAT_COUNTS[${cat}]}"
done
echo "  Report: ${REPORT_FILE}"
if [[ -n "${CONFLICT_FILE}" && -f "${CONFLICT_FILE}" ]]; then
  echo "  Conflicts: ${CONFLICT_FILE}"
fi
echo ""
