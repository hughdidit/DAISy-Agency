# CI/CD Inventory and Patchbot Refactor Roadmap

## At a glance

| Workflow file | Workflow name | Triggers | Key jobs (job name strings) | Classification | Notes / risks |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/ci.yml` | CI | `push` + `pull_request` (daisy/main, daisy/dev) | `Install Check`, `Linux / <runtime> / <task>`, `Secrets Scan`, `Windows / <runtime> / <task>`, `macOS / node / <task>`, `macOS App / <task>`, `iOS`, `Android / <task>` | Needs refactor | Multi-OS matrix load; job names are matrix-derived (required-check churn); shared concurrency group with other workflows can cancel runs; iOS job is disabled (`if: false`). |
| `.github/workflows/codeql.yml` | CodeQL Advanced | `push` + `pull_request` (daisy/main, daisy/dev), `schedule` | `Analyze (<language>)` | Needs refactor | Broad language matrix; macOS runners for Swift; scheduled load; actions not pinned to SHAs. |
| `.github/workflows/docker-release.yml` | Docker Release | `push` (main + tags `v*`) | `build-amd64`, `build-arm64`, `create-manifest` | Needs refactor | Branch trigger uses `main` (not `daisy/main`); assumes GHCR publish with `GITHUB_TOKEN`; no workflow_dispatch; provenance + SBOM enabled on push. |
| `.github/workflows/install-smoke.yml` | Install Smoke | `push` + `pull_request` (daisy/main, daisy/dev), `workflow_dispatch` | `install-smoke` | Useful | Uses public installer URLs; runs Docker smoke tests; shares `ci-` concurrency group with other workflows (risk of cross-cancel). |
| `.github/workflows/labeler.yml` | Labeler | `pull_request_target` | `label` | Useful | Requires `GH_APP_PRIVATE_KEY` and app id; runs on fork PRs with elevated token; action versions not SHA-pinned. |
| `.github/workflows/auto-response.yml` | Auto response | `issues` + `pull_request_target` (labeled) | `auto-response` | Useful | Requires `GH_APP_PRIVATE_KEY`; closes issues/PRs based on labels; action versions not SHA-pinned. |
| `.github/workflows/workflow-sanity.yml` | Workflow Sanity | `push` + `pull_request` (daisy/main, daisy/dev) | `no-tabs` | Useful | Shares `ci-` concurrency group with other workflows (risk of cross-cancel). |

## Per-workflow deep dive

### CI (`.github/workflows/ci.yml`)

**What it does**
- Primary CI gate for the repo: installs deps, runs lint/tests/build/protocol/format on Linux and Windows, macOS tests, macOS app checks, Android unit tests/builds, plus detect-secrets scanning.

**When it runs**
- `push` to `daisy/main` or `daisy/dev`.
- `pull_request` targeting `daisy/main` or `daisy/dev`.
- Concurrency group: `ci-${{ github.event.pull_request.number || github.ref }}` with cancel-in-progress.

**Permissions / secrets / environment**
- No workflow-level permissions block.
- No explicit secrets; relies on default `GITHUB_TOKEN` for checkout.

**Jobs inventory**
- `install-check` (`Install Check`, `blacksmith-4vcpu-ubuntu-2404`): checkout + submodules, setup node 22 + pnpm, install deps.
- `checks` (`Linux / <runtime> / <task>`, `blacksmith-4vcpu-ubuntu-2404`, matrix):
  - Node tasks: `pnpm lint`, `pnpm test -- --no-file-parallelism`, `pnpm build`, `pnpm protocol:check`, `pnpm format`.
  - Bun tasks: `bunx vitest run --no-file-parallelism`, `bunx tsc -p tsconfig.json`.
- `secrets` (`Secrets Scan`, `blacksmith-4vcpu-ubuntu-2404`): detect-secrets baseline scan.
- `checks-windows` (`Windows / <runtime> / <task>`, `blacksmith-4vcpu-windows-2025`, matrix): node lint/test/build/protocol.
- `checks-macos` (`macOS / node / <task>`, `macos-latest`, PR-only): node test.
- `macos-app` (`macOS App / <task>`, `macos-latest`, PR-only): Swift lint/build/test for macOS app.
- `ios` (`iOS`, `macos-latest`, **disabled via `if: false`**): XcodeGen + iOS sim tests + coverage gate.
- `android` (`Android / <task>`, `blacksmith-4vcpu-ubuntu-2404`, matrix): gradle unit tests + assemble.

**Risks / issues found**
- **Required-check churn risk**: job names are matrix-derived (e.g., `Linux / node / test`), so changing matrix items can break required checks if those names are pinned in branch protection.
- **Required-check deadlock risk**: if branch protection requires jobs that only run on PRs (`macOS / node / <task>`, `macOS App / <task>`) or the disabled `iOS` job, pushes to `daisy/main` could be blocked with pending checks.
- **Runner load risk**: wide OS matrix (Linux + Windows + macOS + Android) makes every PR heavy; Swift + Android adds long runners.
- **Concurrency cross-cancel**: shared `ci-` group with other workflows can cancel CI if another workflow starts with the same key.
- **Unpinned actions**: `actions/checkout@v4`, `setup-node@v4`, `setup-bun@v2`, etc. use version tags not SHAs.

**Recommendation**
- **Needs refactor.** Keep Linux checks as the core required gate. Consider isolating Windows/macOS/Android/iOS into optional or scheduled workflows with explicit required-check policy to avoid deadlocks.

### CodeQL Advanced (`.github/workflows/codeql.yml`)

**What it does**
- CodeQL security scans for multiple languages, including Swift and Java/Kotlin.

**When it runs**
- `push` and `pull_request` on `daisy/main`/`daisy/dev`.
- `schedule` cron weekly.

**Permissions / secrets / environment**
- Job-level permissions: `security-events: write`, `packages: read`, `actions: read`, `contents: read`.
- No explicit secrets.

**Jobs inventory**
- `analyze` (`Analyze (<language>)`): matrix over actions, java-kotlin, javascript-typescript, python, ruby, swift. Runs `github/codeql-action/init@v4` and `github/codeql-action/analyze@v4`. Swift uses `macos-latest` runner; others use `ubuntu-latest`.

**Risks / issues found**
- **Runner load risk**: multiple language scans plus macOS for Swift, plus schedule.
- **Coverage mismatch risk**: matrix includes languages that may not exist; increases runtime without benefit.
- **Unpinned actions**: GitHub CodeQL actions pinned to `@v4` tag only.

**Recommendation**
- **Needs refactor.** Limit languages to what’s in-repo, reduce matrix size, and consider moving to a dedicated security workflow with explicit scheduling and permissions hardening.

### Docker Release (`.github/workflows/docker-release.yml`)

**What it does**
- Builds and publishes multi-arch container images to GHCR, then creates a manifest.

**When it runs**
- `push` to `main` and tags `v*`.

**Permissions / secrets / environment**
- Job-level permissions: `packages: write`, `contents: read`.
- Uses `GITHUB_TOKEN` for registry auth.

**Jobs inventory**
- `build-amd64` (ubuntu-latest): build/push amd64 image via Buildx.
- `build-arm64` (ubuntu-24.04-arm): build/push arm64 image via Buildx.
- `create-manifest` (ubuntu-latest): create multi-arch manifest.

**Risks / issues found**
- **Branch model mismatch**: triggers on `main`, while repo uses `daisy/main` and `daisy/dev` for integration/production branches.
- **Missing manual trigger**: no `workflow_dispatch` for controlled releases.
- **Unpinned actions**: docker actions pinned to tags only.

**Recommendation**
- **Needs refactor.** Align triggers with `daisy/main` (production) and/or tag-based releases, add manual dispatch for controlled deploys, and align with CD phase split.

### Install Smoke (`.github/workflows/install-smoke.yml`)

**What it does**
- Runs installer smoke tests via Docker against `clawd.bot` installer endpoints.

**When it runs**
- `push` and `pull_request` on `daisy/main`/`daisy/dev`.
- `workflow_dispatch`.
- Concurrency group: `ci-${{ github.event.pull_request.number || github.ref }}` with cancel-in-progress.

**Permissions / secrets / environment**
- No permissions block.
- No secrets; uses env vars for installer URLs and smoke-test behavior.

**Jobs inventory**
- `install-smoke` (ubuntu-latest): checkout, setup pnpm, minimal install, run `pnpm test:install:smoke`.

**Risks / issues found**
- **External dependency risk**: depends on `https://clawd.bot/install.sh` endpoints.
- **Concurrency cross-cancel**: same `ci-` group as CI/workflow-sanity; a smoke run can cancel CI.
- **Unpinned actions**: `actions/checkout@v4` only.

**Recommendation**
- **Useful.** Keep, but isolate concurrency group and align with Patchbot gating rules.

### Labeler (`.github/workflows/labeler.yml`)

**What it does**
- Applies labels to PRs based on `.github/labeler.yml` rules.

**When it runs**
- `pull_request_target` for opened/synchronize/reopened events.

**Permissions / secrets / environment**
- Workflow permissions: `contents: read`, `pull-requests: write`.
- Uses GitHub App token; requires `secrets.GH_APP_PRIVATE_KEY`.

**Jobs inventory**
- `label` (ubuntu-latest): create app token, run `actions/labeler@v5`.

**Risks / issues found**
- **Secret dependency**: workflow fails without `GH_APP_PRIVATE_KEY`.
- **PR security**: `pull_request_target` is elevated; must ensure labeler config is safe.
- **Unpinned actions**: `create-github-app-token@v1`, `labeler@v5`.

**Recommendation**
- **Useful.** Keep, but confirm secret availability and consider pinning actions.

### Auto response (`.github/workflows/auto-response.yml`)

**What it does**
- Auto-responds and optionally closes issues/PRs based on labels.

**When it runs**
- `issues` (labeled), `pull_request_target` (labeled).

**Permissions / secrets / environment**
- Workflow permissions: `issues: write`, `pull-requests: write`.
- Uses GitHub App token; requires `secrets.GH_APP_PRIVATE_KEY`.

**Jobs inventory**
- `auto-response` (ubuntu-latest): create app token, run `actions/github-script@v7` to comment/close.

**Risks / issues found**
- **Secret dependency**: workflow fails without `GH_APP_PRIVATE_KEY`.
- **PR security**: `pull_request_target` with write permissions; script needs careful maintenance.
- **Unpinned actions**: `create-github-app-token@v1`, `github-script@v7`.

**Recommendation**
- **Useful.** Keep with hardened permissions + pinned actions in a later refactor.

### Workflow Sanity (`.github/workflows/workflow-sanity.yml`)

**What it does**
- Ensures no workflow files contain tabs.
- Runs actionlint to validate workflow YAML and job structure.

**When it runs**
- `push` and `pull_request` on `daisy/main`/`daisy/dev`.
- Concurrency group: `workflow-sanity-${{ github.event.pull_request.number || github.ref }}` with cancel-in-progress.

**Permissions / secrets / environment**
- No permissions block, no secrets.

**Jobs inventory**
- `no-tabs` (ubuntu-latest): scans workflow YAML for tabs and runs actionlint.

**Risks / issues found**
- **Redundant gate**: could be folded into a reusable lint job.

**Recommendation**
- **Useful.** Keep, but consider merging into a shared workflow or CI lint job when refactoring.

## Required-check notes

- **Linux gate model (current)**: The closest required-check candidate is the Linux `checks` matrix in `ci.yml`. This is the likely required gate for PRs into `daisy/dev` and `daisy/main` and should remain the single required gate in Phase 1.
- **Deadlock risks**: If branch protection requires any of the PR-only jobs (`macOS / node / <task>`, `macOS App / <task>`) or the disabled `iOS` job, pushes to `daisy/main` will hang with pending checks. Ensure required checks are limited to always-running jobs.

## Patchbot refactor roadmap

### Phase 1: Normalize CI (done/verified)
**Objective**: Document the existing Linux gate and ensure required checks map to stable job names.

**Concrete next PR tasks**
- Document required checks tied to Linux matrix job names (no workflow changes in this PR).
- Capture current branch model: `daisy/dev` (integration) and `daisy/main` (production).

**Expected outcomes / acceptance criteria**
- Required checks point to Linux jobs that run on both PRs and pushes.
- No workflow changes; inventory doc accepted.

**Commands (for Codex)**
- `ls -la .github/workflows`
- `rg -n "^(name:|on:|jobs:|permissions:|concurrency:)" .github/workflows`

### Phase 2: Split CI from CD
**Objective**: Separate PR validation (CI) from release/build (CD) and reduce runner load.

**Concrete next PR tasks**
- Split `ci.yml` into reusable workflows (e.g., `ci-linux.yml`, `ci-platform.yml`) using `workflow_call`.
- Add explicit required Linux gate with stable, non-matrix job name to avoid required-check churn.
- Move release-related jobs (Docker build, app packaging) into CD workflows triggered by `workflow_dispatch` or tags.

**Expected outcomes / acceptance criteria**
- PRs run Linux gate by default; macOS/Windows/Android run as opt-in or scheduled.
- Release workflows do not run on every PR/push.

**Commands (for Codex)**
- `ls -la .github/workflows`
- `rg -n "^(name:|on:|jobs:|permissions:|concurrency:)" .github/workflows`

### Phase 3: Environments and secrets
**Objective**: Establish environment protections and least-privilege secrets.

**Concrete next PR tasks**
- Define `staging` and `prod` environments with approvals.
- Move deploy tokens to environment-scoped secrets; restrict permissions on workflows.
- Harden `pull_request_target` workflows with tight permissions and token scopes.

**Expected outcomes / acceptance criteria**
- Deploy workflows require approvals.
- Secrets limited to the minimum workflow scope.

**Commands (for Codex)**
- `rg -n "secrets|environment|permissions" .github/workflows/*.yml`

### Phase 4: Artifacts and provenance
**Objective**: Define what artifacts are built, stored, and versioned.

**Concrete next PR tasks**
- Decide artifact types (CLI bundles, Docker images, mac app outputs) and storage.
- Enable provenance/SBOM where appropriate (e.g., Buildx provenance, CodeQL artifacts).

**Expected outcomes / acceptance criteria**
- Artifacts are versioned and traceable to commits/tags.

**Commands (for Codex)**
- `rg -n "artifact|buildx|provenance" .github/workflows/*.yml`

### Phase 5: Patchbot agent responsibilities
**Objective**: Move orchestration to Patchbot and define human approval points.

**Concrete next PR tasks**
- Define Patchbot roles for PR triage, CI summaries, and required-check validation.
- Outline Discord-driven approvals for deploy steps; DAISy to orchestrate release + deploy + verify + rollback.

**Expected outcomes / acceptance criteria**
- Clear division between GitHub Actions automation, Discord approvals, and Patchbot/DAISy orchestration.

**Commands (for Codex)**
- `rg -n "workflow_dispatch|environment" .github/workflows/*.yml`

## Patchbot next-PR checklist

- [ ] Confirm required checks only include always-on Linux gate jobs.
- [ ] Split CI into reusable workflows; make macOS/Windows/Android optional or scheduled.
- [ ] Add explicit release/deploy workflows with `workflow_dispatch` and tag triggers.
- [ ] Configure `staging`/`prod` environments with approvals and scoped secrets.
- [ ] Define artifact storage/versioning and enable provenance.
- [ ] Document Patchbot + Discord approval responsibilities and rollback playbooks.
