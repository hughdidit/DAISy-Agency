---
name: kody-software-factory
description: Operate Kody as a project-scoped virtual software factory manager. Use when Kody is asked to interview Hugh about a product request, create an architectural specification, build a project backlog and issue-sized PRDs, create or manage a private GitHub repo under hughdidit, run Codex CLI one PRD at a time, coordinate GitHub Actions CI/CD, provision staging or production through approval-gated workflows, hand off to Hugh for smoke testing, and close out branches after review, deploy, and verification.
---

# Kody Software Factory

## Operating Boundary

Use this skill only for Kody's software-factory work. Kody already exists as a DAISy delegate; do not create a new agent or customer-facing UI.

Keep work project-scoped:

- Kody may manage up to five active projects concurrently by default.
- Override the cap only with an explicit project or workspace setting such as `KODY_MAX_ACTIVE_PROJECTS`.
- Within one project, run development sequentially: exactly one PRD may be in planning, implementation, review-fix, smoke-fix, or closeout at a time.
- Do not let one project's PRD queue, branches, worktrees, credentials, or smoke-test notes leak into another project.
- Record active project state in Kody's workspace under `.kody-factory/projects/<project-slug>/`.

Operate from Kody's sandbox workspace. If required tools, skills, templates, clone paths, worktree paths, or artifact paths are not visible from the sandbox, stop and report the missing capability. Do not fall back to broad host filesystem access.

## Bootstrap

Before factory work starts:

1. Verify Kody's sandbox can read this skill and the `templates/` directory.
2. Verify Kody's workspace has a project area under `.kody-factory/projects/`.
3. Install Codex CLI into Kody's workspace-local tool prefix only:

   ```bash
   sh skills/kody-software-factory/scripts/install-codex-cli-local.sh "$KODY_WORKSPACE"
   . "$KODY_WORKSPACE/.kody-tools/codex-env.sh"
   codex --version
   ```

4. Record install path, package name, package version when available, and `codex --version` output in the project closeout.

Rules for Codex CLI:

- Install the `@openai/codex` package only into `<kody-workspace>/.kody-tools/` or another Kody-owned workspace-local prefix.
- Never install Codex CLI globally on the host.
- Never install Codex CLI into another agent's workspace.
- Do not expose Hugh's host-level Codex auth/config unless it is explicitly approved and mounted read-only.

## Kody AGENTS Trigger

Kody's own sandbox `AGENTS.md` should include a narrow trigger. If the path is not known, locate it through OpenClaw's active agent workspace configuration or the Kody agent workspace file manager. Do not update this repository's root `AGENTS.md` for Kody-only behavior.

Use this trigger text:

```markdown
## Kody Software Factory

When Hugh asks Kody to build a product, manage a software factory, create a repo, create specs/backlog/PRDs, run a PRD queue, coordinate Codex CLI, manage staging/production deployment, or run a smoke-test/hotfix loop, use the `kody-software-factory` skill.

Kody may manage multiple projects concurrently, default maximum 5 active projects unless configured otherwise. For each individual project, process exactly one issue-sized PRD at a time. Keep project workspaces, branches, worktrees, PRD state, approval records, and smoke-test feedback isolated per project.

Approval routing:
- Finance or compute-cost actions, including GCP VMs and paid compute, require Finn-mediated approval from Hugh.
- Other approval pauses go directly to Hugh by DM.
- Never bypass repository AGENTS.md, branch protection, CI/CD, security, or sandbox policy.
```

## Project Artifacts

For each new project repo, create these root directories:

- `/specs`: Architectural Specification and Project Backlog.
- `/prd`: one issue-sized PRD file per backlog item.
- `/docs`: thorough project documentation, including development, stack, procedures, design, references, operations, and build notes.

Use the bundled templates:

- `templates/architectural-specification.md`
- `templates/project-backlog.md`
- `templates/prd.md`
- `templates/codex-plan-prompt.md`
- `templates/smoke-test-handoff.md`
- `templates/hotfix-intake.md`
- `templates/factory-closeout.md`

Every PRD must be small enough for one Codex CLI plan/implementation cycle. If a PRD is too large, split it before implementation.

## Factory Workflow

### 1. Interview

Use `interview-me` before writing specs. Ask Hugh questions until intent is confirmed. The output is a confirmed intent statement with outcome, user, why now, success, constraint, and out of scope.

### 2. Specify

Create:

- `/specs/architectural-specification.md`
- `/specs/project-backlog.md`
- `/prd/PRD-###-slug.md` files for each backlog item

The architectural specification is the acceptance source for later review. The backlog must include every PRD and an explicit implementation order.

### 3. Prepare Repo And Workspace

Defaults for new repos under `hughdidit`:

- Private by default.
- Protected `dev` and `main`.
- PR-only merges.
- Required GitHub Actions checks.
- Staging deploys from `dev`.
- Production deploys from `main`.

Kody creates the project folder inside Kody's sandbox workspace, clones the repo there, and creates worktrees only inside approved project workspace boundaries.

### 4. Run PRD Queue

Use `prd-queue-runner` for backlog execution. For each project:

1. Select the first incomplete, unblocked PRD.
2. Generate the Codex plan prompt from `templates/codex-plan-prompt.md`.
3. Run one Codex CLI planning/implementation cycle for that PRD.
4. Record PRD evidence before selecting the next PRD.
5. Do not start another PRD for the same project until the current PRD is merged, deployed or otherwise closed according to that repo's rules.

Across different projects, Kody may keep up to the configured active-project limit, default 5, as long as each project remains internally sequential.

### 5. Review And Fix

After all queued PRDs for a project are completed, use `code-review-and-quality` to review the codebase against the architectural specification acceptance criteria.

Use Codex CLI Goal mode to fix one issue at a time. Record each issue, fix branch or commit, verification, and remaining risk.

### 6. Smoke Test

Send Hugh a DM smoke-test packet from `templates/smoke-test-handoff.md`. Include deployed URLs, expected behavior, acceptance checklist, known risks, and the requested feedback format. Do not include secrets.

Wait for Hugh's explicit pass/fail notes. If Hugh reports hotfixes, use `templates/hotfix-intake.md`, plan and implement one hotfix at a time, then return to smoke test.

### 7. Close Out

Use `templates/factory-closeout.md`. Record:

- Architecture and backlog paths.
- PRD queue completion evidence.
- PR URLs, commits, CI runs, deploy workflow runs, and verify workflow runs.
- Codex CLI local install path and version evidence.
- Approval evidence.
- Smoke-test result.
- Remaining blockers or follow-up work.

Clean branches according to the target repo rules, then fast-forward the local workspace branch to the latest integrated branch.

## Approval Routing

- Use Finn approval only for finance or compute-cost actions, including GCP VMs, paid compute, and cost-bearing Cloud Run or infrastructure changes.
- Use direct DM to Hugh for non-finance approvals, including PRD plan approvals, PR readiness, smoke-test handoff, and non-cost operational pauses.
- Express GCP VM and Cloud Run provisioning as repo-owned IaC and GitHub Actions workflow changes. Do not use ad-hoc `gcloud` provisioning as the normal path.
- Read-only GCP diagnostics are allowed when needed to plan or verify, subject to the active repo's instructions.

## Acceptance Criteria

Kody's factory workflow is acceptable only when:

- Kody can run it from a sandboxed agent workspace.
- Required skills and templates are visible inside Kody's sandbox.
- Codex CLI is installed and callable from Kody's workspace-local tool prefix only.
- Kody can manage multiple active projects up to the configured cap, default 5.
- Each project processes one issue-sized PRD at a time.
- Repo cloning, worktree setup, PRD execution, and evidence capture stay inside configured sandbox filesystem boundaries.
- GitHub repos default private with protected `dev` and `main`, PR-only merges, and required GitHub Actions checks.
- CI/CD, testing, staging deploys, production deploys, and GCP provisioning run through GitHub Actions as the normal path.
- Cost-bearing compute actions are approved through Finn; other approvals go by DM to Hugh.
- Missing sandbox capabilities produce a clear blocker with the exact missing capability or approval path.

