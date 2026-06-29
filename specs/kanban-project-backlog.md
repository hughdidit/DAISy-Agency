# DAISy Kanban Board Project Backlog

## Project

- Name: DAISy Kanban Board
- Repo: `hughdidit/DAISy-Agency`
- Base branch: `daisy/dev`
- Architecture: `kanban-architecture-specification.md`
- Product owner: Hughdidit LLC / DAISy operations
- Delivery rule: PRDs are delivery units; PRs must remain issue-sized and may split a PRD into multiple independently reviewable slices.
- Closeout rule: every slice follows DAISy PR, CI, review, merge, staging dry-run, staging deploy, and `verify.yml` workflow.

## PRD Queue

| Order | PRD                                                      | Title                                           | Status   | Dependencies              | Issue-sized PR guidance                                  |
| ----- | -------------------------------------------------------- | ----------------------------------------------- | -------- | ------------------------- | -------------------------------------------------------- |
| 0     | `kanban-000-specs-and-backlog-prd.md`                    | Specs, backlog, and PRD package                 | Complete | Approved user plan        | Completed by PR #462                                     |
| 1     | `kanban-001-mongodb-foundation-prd.md`                   | MongoDB foundation                              | Complete | PRD-000                   | Completed by PRs #467, #468, #469, and #470              |
| 2     | `kanban-002-gateway-rpc-api-prd.md`                      | Gateway RPC API                                 | Complete | PRD-001                   | Completed by PRs #471, #472, #473, and #474              |
| 3     | `kanban-003-control-ui-board-prd.md`                     | Control UI board                                | Complete | PRD-001, PRD-002          | Completed by PRs #475, #479, and #480                    |
| 4     | `kanban-004-agent-tools-and-codex-skill-prd.md`          | Agent tools and Codex skill                     | Complete | PRD-002                   | Completed by PR #476                                     |
| 5     | `kanban-005-trello-import-and-full-card-features-prd.md` | Trello import and full card features            | Complete | PRD-001, PRD-002, PRD-003 | Completed by PRs #477, #478, #479, and #480              |
| 6     | `kanban-006-hardening-and-staging-closeout-prd.md`       | Hardening, reconciliation, and staging closeout | Complete | PRD-001 through PRD-005   | Completed by PR #481 and the final reconciliation report |

## Epics

### Epic A: Planning And Governance

- Create architecture specification and backlog under `/specs`.
- Create PRDs under `../prd` using the attached One-Shot template supplied with the project brief.
- Record issue-sized PR boundaries in each PRD.
- Ignore prior unmerged Kanban remote-branch work because the approved scope supersedes it.

Acceptance:

- All requested docs are committed.
- PRD queue is unambiguous.
- No PRD references obsolete seven-lane or JSON-file storage designs.

### Epic B: MongoDB Source Of Truth

- Add dedicated Kanban MongoDB configuration.
- Implement connection, status, indexes, repository, GridFS attachment plumbing, and redacted error handling.
- Implement board bootstrap and fixed four-lane model.
- Add real MongoDB integration tests.

Acceptance:

- Kanban reports unavailable when MongoDB is not configured.
- Data is stored under Kanban-specific database/collections.
- Activity is append-only and cards are archived, not hard deleted.

### Epic C: Gateway API

- Add protocol schemas and validators.
- Register method list and method scopes.
- Implement card, activity, import, and Codex RPC handlers.
- Enforce bounded list responses and optimistic concurrency where needed.

Acceptance:

- RPC methods match the architecture spec.
- Mutations return card plus activity event.
- Auth/scope failures are covered by tests.

### Epic D: Control UI

- Add `Agent > Kanban` navigation.
- Build the board shell, lanes, cards, Activity rail, and empty/error states.
- Add card detail editing, filtering, movement, archive, and import flows.
- Verify responsive layout and browser screenshots.

Acceptance:

- UI matches Control UI design while following the supplied Linear-style structure.
- Four lanes are visible left-to-right.
- Activity rail updates after mutations.

### Epic E: Agent And Codex Operation

- Add Kanban tools to the agent tool catalog.
- Implement gateway-brokered read/write/pickup/handoff/complete tools.
- Add `../skills/kanban-codex/SKILL.md`.
- Support scheduled Codex pickup for `readyForCodex` cards by priority then age.

Acceptance:

- Agents operate through tools only.
- Codex pickup is atomic.
- Completion moves to `Done`; review/input handoff moves to `Review`.

### Epic F: Trello Replacement Completeness

- Add Trello JSON/CSV preview and import.
- Preserve Trello labels, due dates, checklists, comments/actions, links, attachments, members, and source ids where present.
- Implement advanced card fields, watchers, and custom fields.
- Store included/uploaded binary attachments in MongoDB GridFS.

Acceptance:

- Trello export can seed the DAISy board without live Trello sync.
- Re-import is idempotent.
- Activity records import actions.

### Epic G: Final Quality And Deployment

- Reconcile PRD queue and merged/deployed evidence.
- Execute any skipped or partially completed Kanban PRDs/slices.
- Run final `code-review-and-quality` across the whole Kanban implementation.
- Address all Critical and required findings in issue-sized PRs.
- Deploy and verify staging after final fixes.

Acceptance:

- No Kanban PRD or issue-sized PR slice remains unexecuted.
- CI, review, staging deploy, and `verify.yml` evidence exists.
- Final synopsis states changed, verified, unverified, risks, and follow-up improvements.

## Acceptance Matrix

| Requirement                            | PRDs          | Evidence                        |
| -------------------------------------- | ------------- | ------------------------------- |
| Specs and PRDs committed               | 000           | Git commit, PR, docs paths      |
| Dedicated MongoDB database/collections | 001           | Config tests, integration tests |
| Four fixed lanes                       | 001, 002, 003 | Schema/service/UI tests         |
| Gateway RPC API                        | 002           | Protocol and handler tests      |
| `Agent > Kanban` navigation            | 003           | UI browser tests                |
| Board and Activity layout              | 003           | Browser tests and screenshots   |
| Trello-like card fields                | 003, 005      | UI/service tests                |
| Agent tools                            | 004           | Tool contract tests             |
| Codex scheduled pickup                 | 004           | Pickup/handoff/complete tests   |
| Trello JSON/CSV import                 | 005           | Import tests                    |
| GridFS attachments                     | 005           | Attachment integration tests    |
| No hard delete                         | 001, 002, 006 | Negative tests and review       |
| Final queue reconciliation             | 006           | Closeout report                 |
| Final code-review-and-quality pass     | 006           | Review findings and fixes       |

## Queue Runner Instructions

For each selected PRD, `prd-queue-runner` must create the required plan prompt:

```text
[PRD TITLE]

Make a plan to implement [PRD FILENAME] attached. Refer to the other attached files for context.
```

Attach or reference:

- `../AGENTS.md`
- `kanban-architecture-specification.md`
- `kanban-project-backlog.md`
- the selected PRD
- directly relevant repo docs or code discovered for that PRD

Do not infer completion from filenames. Completion requires merged PR, CI/review/deploy evidence, or explicit repo records. After PRD-006, run a reconciliation pass and execute any missing Kanban PRD/slice before the final global review.

## Final Reconciliation

The final reconciliation report is recorded in [kanban-final-reconciliation-report.md](kanban-final-reconciliation-report.md).
