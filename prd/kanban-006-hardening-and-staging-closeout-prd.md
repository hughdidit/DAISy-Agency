# PRD-006 Kanban Hardening, Reconciliation, And Staging Closeout

Target executor: Codex Desktop, model: gpt-5.5 High thinking

## 1) Mission

Build: final Kanban hardening, queue reconciliation, deployment verification, and quality closeout.

Primary outcome: prove the finished Kanban product is merged, deployed, verified, and free of unresolved blocking review findings.

Success metrics:

- Every Kanban PRD and issue-sized PR slice has concrete completion evidence.
- Skipped or partial Kanban PRDs/slices are executed before final review.
- Final `code-review-and-quality` runs across the completed implementation.
- All Critical and required issues are fixed through issue-sized PRs.
- Staging dry-run, staging deploy, and `verify.yml` pass after final fixes.

## 2) Context

Depends on PRD-001 through PRD-005. This PRD is the final reconciliation and operational proof step.

## 3) Hard Requirements

- Compare `../prd/kanban-*.md`, `../specs/kanban-architecture-specification.md`, `../specs/kanban-project-backlog.md`, merged PRs, local code, and deployment evidence.
- Identify any skipped, partial, or undeployed Kanban PRD or PRD slice.
- Execute missed work through `prd-queue-runner` and the standard PR workflow.
- Run final `code-review-and-quality` across the whole Kanban implementation.
- Address all Critical and required findings.
- Document any explicitly deferred non-blocking findings with justification.
- Run relevant tests, CI, staging dry-run deploy, staging deploy, and `verify.yml`.
- Produce final synopsis with changed, verified, unverified, risks, assumptions, and follow-up improvements.

## 4) Non-Goals

- Add unrelated product features.
- Skip repo workflow gates.
- Batch unrelated fixes into broad PRs.

## 5) Inputs You Can Assume

- Users: DAISy maintainers and operators.
- Environment: merged Kanban implementation on `daisy/dev`.
- Interfaces: GitHub PRs/checks/workflows, staging deploy workflows, `verify.yml`.
- Security: final review must cover auth, audit, storage, import, and agent boundaries.
- Performance: final review must check bounded board/activity/import behavior.

## 6) Required Deliverables

1. PRD reconciliation report.
2. Missing-slice execution if needed.
3. Final code-review-and-quality findings.
4. Follow-up PRs for blocking findings.
5. Verification evidence.
6. Final synopsis.

## 7) Output Format

Closeout must include:

1. Assumptions.
2. Reconciliation summary.
3. Code review findings and resolutions.
4. Test/deploy/verify commands and evidence.
5. Acceptance criteria pass/fail table.
6. Remaining unverified areas, if any.

## 8) Quality Bar

- No rubber-stamp review.
- Critical and required issues are fixed before done.
- Deferred issues have explicit justification.
- Final evidence is concrete, not inferred.

## 9) Acceptance Criteria

| Criterion            | Required result                          |
| -------------------- | ---------------------------------------- |
| Queue reconciliation | No Kanban PRD/slice skipped              |
| Final review         | `code-review-and-quality` complete       |
| Blocking issues      | Critical/required issues resolved        |
| Deployment           | Staging dry-run and real deploy complete |
| Verification         | `verify.yml` passes                      |
| Synopsis             | Final terminal/report synopsis produced  |

## 10) Project-Specific Details

This PRD is not complete until any review-generated blocking fixes are merged, deployed, and verified.
