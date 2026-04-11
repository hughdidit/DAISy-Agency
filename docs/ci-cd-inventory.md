# CI/CD Inventory and Patchbot Refactor Roadmap

## At a glance

| Workflow file                          | Workflow name   | Triggers                                                    | Key jobs (job name strings)                                                                                                             | Classification | Notes / risks                                                                                                                                                                |
| -------------------------------------- | --------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`             | CI              | `pull_request` (daisy/main, daisy/dev) + `workflow_dispatch` | `check`, `checks`, `skills-python`, `ios`, `android`, `CI / Linux Required`, `CI / iOS Required`, `CI / Android Required`               | Active         | PR-only CI with docs/scope front door, iOS and Android as supported mobile lanes, and stable required-check names that do not depend on matrix labels.                    |
| `.github/workflows/codeql.yml`         | CodeQL Advanced | `push` + `pull_request` (daisy/main, daisy/dev), `schedule` | `Analyze (<language>)`                                                                                                                  | Needs refactor | Broad language matrix; macOS runners for Swift; scheduled load; actions not pinned to SHAs.                                                                                  |
| `.github/workflows/docker-release.yml` | Docker Release  | `push` (main + tags `v*`)                                   | `build-amd64`, `build-arm64`, `create-manifest`                                                                                         | Needs refactor | Branch trigger uses `main` (not `daisy/main`); assumes GHCR publish with `GITHUB_TOKEN`; no workflow_dispatch; provenance + SBOM enabled on push.                            |

| `.github/workflows/auto-response.yml` | Auto response | `issues` + `pull_request_target` (labeled) | `auto-response` | Useful | Requires `GH_APP_PRIVATE_KEY`; closes issues/PRs based on labels; action versions not SHA-pinned. |
| `.github/workflows/workflow-sanity.yml` | Workflow Sanity | `push` + `pull_request` (daisy/main, daisy/dev) | `no-tabs` | Useful | Shares `ci-` concurrency group with other workflows (risk of cross-cancel). |

## Per-workflow deep dive

### CI (`.github/workflows/ci.yml`)

**What it does**

- Primary PR validation gate for the repo: runs Linux lint/build/test/protocol checks, iOS validation, Android validation, anti-mock enforcement, and detect-secrets scanning.

**When it runs**

- `pull_request` targeting `daisy/main` or `daisy/dev`.
- `workflow_dispatch` for manual runs.
- Concurrency group: `ci-${{ github.event.pull_request.number || github.ref }}` with cancel-in-progress.

**Permissions / secrets / environment**

- No workflow-level permissions block.
- No explicit secrets; relies on default `GITHUB_TOKEN` for checkout.

**Jobs inventory**

- `docs-scope` / `changed-scope` (`ubuntu-latest`): cheap front-door gating for docs-only, Node, iOS, and Android scope.
- `check` (`check`, `ubuntu-latest`): TypeScript lint/type/build-smoke gate for Node-relevant changes.
- `build-artifacts` (`ubuntu-latest`): builds `dist/` once for Linux downstream jobs.
- `checks` (`ubuntu-latest`, matrix): two Node test shards plus protocol, GWS toolkit, and Bun validation.
- `skills-python` (`ubuntu-latest`): `ruff` + `pytest` for Python skill scripts.
- `secrets` (`ubuntu-latest`): detect-secrets, private-key checks, workflow audit, and production dependency audit.
- `ios` (`macos-latest`): XcodeGen + iOS simulator tests + coverage gate for supported Apple mobile changes.
- `android` (`ubuntu-latest`, matrix): gradle unit tests + assemble for Android changes.
- `CI / Linux Required`, `CI / iOS Required`, `CI / Android Required` (`ubuntu-latest`): stable PR gate jobs for branch protection.

**Risks / issues found**

- **Runner load risk**: iOS still requires `macos-latest`, so Apple-mobile coverage remains the slowest and most capacity-constrained lane.
- **Minutes tradeoff**: two Node test shards reduce wall-clock time but can increase total Actions minutes.
- **Concurrency cross-cancel**: shared `ci-` group with other workflows can cancel CI if another workflow starts with the same key.
- **Unpinned actions**: `actions/checkout@v4`, `setup-node@v4`, `setup-bun@v2`, etc. use version tags not SHAs.

**Recommendation**

- **Active.** Required checks should point at the stable gate jobs (`CI / Linux Required`, `CI / iOS Required`, `CI / Android Required`) plus any always-on non-gate checks such as `anti-mock` and `secrets`.

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

- **Stable gate model (current)**: Branch protection should require the stable jobs `CI / Linux Required`, `CI / iOS Required`, and `CI / Android Required` instead of matrix-derived task names.
- **Deadlock avoidance**: Do not require conditionally absent task labels or unsupported product lanes. The stable gate jobs are always present on pull requests and short-circuit success when a platform is out of scope.

## Patchbot refactor roadmap

### Phase 1: Normalize CI (done/verified)

**Objective**: Align CI with shipped platforms and ensure required checks map to stable job names.

**Concrete next PR tasks**

- Keep required checks on the stable gate jobs instead of matrix-derived task names.
- Capture current branch model: `daisy/dev` (integration) and `daisy/main` (production).

**Expected outcomes / acceptance criteria**

- Required checks point to stable gate jobs that are always present on pull requests.
- CI reflects the supported mobile platforms: iOS and Android.

**Commands (for Codex)**

- `ls -la .github/workflows`
- `rg -n "^(name:|on:|jobs:|permissions:|concurrency:)" .github/workflows`

### Phase 2: Split CI from CD

**Objective**: Separate PR validation (CI) from release/build (CD) and reduce runner load further.

**Concrete next PR tasks**

- Split `ci.yml` into reusable workflows (e.g., `ci-linux.yml`, `ci-platform.yml`) using `workflow_call`.
- Keep the existing stable required gate jobs and evaluate whether any should move into reusable workflows.
- Move release-related jobs (Docker build, app packaging) into CD workflows triggered by `workflow_dispatch` or tags.

**Expected outcomes / acceptance criteria**

- PRs keep Linux, iOS, and Android validation under the scoped CI workflow.
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
- [ ] Split CI into reusable workflows; make macOS/Android optional or scheduled.
- [ ] Add explicit release/deploy workflows with `workflow_dispatch` and tag triggers.
- [ ] Configure `staging`/`prod` environments with approvals and scoped secrets.
- [ ] Define artifact storage/versioning and enable provenance.
- [ ] Document Patchbot + Discord approval responsibilities and rollback playbooks.
