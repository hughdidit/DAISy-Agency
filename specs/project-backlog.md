# Project Backlog: Agent Kanban Board

## Project

- Name: Agent Kanban Board for DAISy Control UI
- Repo: `hughdidit/DAISy-Agency`
- Base branch: `daisy/dev`
- Feature branch pattern: `kody/kanban-prd-###-*`
- Staging: Existing DAISy-Agency staging workflow from `daisy/dev`
- Production: Existing DAISy-Agency production promotion from `daisy/main`
- Active project cap setting: `${KODY_MAX_ACTIVE_PROJECTS:-5}`
- Architecture: [Architectural specification](architectural-specification.md)
- Ownership note: DAISy is responsible for Kanban operations and due-date calendar sync ownership; default Discord channel/webhook is the notification destination.
- Agent/API docs: [API and agent operations](../docs/agent-kanban/api-and-agent-operations.md)

## PRD Queue

| Order | PRD ID  | Title                                                                             | Status  | Dependencies              | Notes                                               |
| ----- | ------- | --------------------------------------------------------------------------------- | ------- | ------------------------- | --------------------------------------------------- |
| 1     | PRD-001 | Domain model, persistence, and gateway RPC foundation                             | Planned | Architectural spec        | Establish source of truth before UI/tooling         |
| 2     | PRD-002 | Control UI navigation, board view, and lane/card rendering                        | Planned | PRD-001                   | Add Agent > Kanban route and snapshot-aligned board |
| 3     | PRD-003 | Card detail, comments, checklist subtasks, links, and assignees                   | Planned | PRD-001, PRD-002          | Trello-like card modal/panel                        |
| 4     | PRD-004 | Drag/drop movement, ordering, canonical card links, and reload persistence        | Planned | PRD-002, PRD-003          | Core board operation                                |
| 5     | PRD-005 | Agent API tooling and bundled Kanban skill                                        | Planned | PRD-001, PRD-003, PRD-004 | Sandbox-safe agent operation                        |
| 6     | PRD-006 | Permissions, scoped API credentials, admin destructive gates, and audit hardening | Planned | PRD-001, PRD-005          | Privacy/security completion                         |
| 7     | PRD-007 | Automation engine for checklist completion and due-date reminders                 | Planned | PRD-001, PRD-003, PRD-006 | Move completed cards and schedule reminders         |
| 8     | PRD-008 | Notification delivery: in-app, email, and Discord                                 | Planned | PRD-007                   | Uses configured private destinations                |
| 9     | PRD-009 | Google Calendar due-date sync                                                     | Planned | PRD-001, PRD-003, PRD-006 | All-day events on group calendar                    |
| 10    | PRD-010 | End-to-end quality pass, docs, staging verification, and smoke-test handoff       | Planned | PRD-001 through PRD-009   | Final product acceptance                            |

## Queue Rules

- Each PRD must be issue-sized for one Codex planning/implementation cycle.
- Only one PRD may be active for this project at a time.
- Do not start the next PRD until the current PRD is closed by the repo workflow.
- Follow repo `AGENTS.md`: feature branch from `daisy/dev`, PR-only merge, CI/CD required, no direct work on `daisy/main`, no direct commits to `daisy/dev`.
- Use `/workspace/.kody-tools/codex-env.sh` before invoking Codex.
- Keep clones, worktrees, evidence, and generated artifacts inside `/workspace/.kody-factory/projects/kanban-control-ui/`.
- Record CI, PR, deploy, verify, and approval evidence before advancing.
- Finance or compute-cost approvals require Finn-mediated approval. Non-finance approvals go to Hugh.

## Acceptance Coverage

| Acceptance criterion                                                                                         | Covered by PRD(s) | Evidence                                          |
| ------------------------------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------------- |
| Kanban data model and persistence exist                                                                      | PRD-001           | Migration/service tests, typed RPC contract tests |
| Agent > Kanban route appears in Control UI                                                                   | PRD-002           | Navigation/browser tests, screenshot evidence     |
| Board structurally matches Trello board snapshot while matching Control UI design                            | PRD-002           | Browser tests and smoke-test screenshots          |
| Card detail structurally matches Trello detail snapshot                                                      | PRD-003           | Browser tests and smoke-test screenshots          |
| Cards support title, description, due date, labels, assignees, links, checklist subtasks, comments, activity | PRD-001, PRD-003  | Service/controller/UI tests                       |
| Cards can be dragged/reordered between lanes and persisted                                                   | PRD-004           | Browser and service tests                         |
| Cards have stable canonical links                                                                            | PRD-004           | Navigation/deep-link tests                        |
| Agents can operate board through sandbox-safe API/tools/skill                                                | PRD-005           | Tool contract tests and skill docs                |
| Board private to Hughdidit/DAISy team                                                                        | PRD-006           | Permission tests                                  |
| Admin-only destructive operations                                                                            | PRD-006           | Negative/positive authorization tests             |
| Checklist completion can move card to Completed                                                              | PRD-007           | Automation tests                                  |
| Due-date reminders generated                                                                                 | PRD-007           | Scheduler/service tests                           |
| In-app, email, and Discord notifications delivered when configured                                           | PRD-008           | Notification integration tests/harness evidence   |
| Due-date cards sync to group Google Calendar as all-day events                                               | PRD-009           | Calendar integration tests/harness evidence       |
| Final product has docs, tests, CI, staging verification, smoke handoff                                       | PRD-010           | Closeout report, CI/deploy/verify links           |
