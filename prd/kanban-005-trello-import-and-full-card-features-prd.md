# PRD-005 Kanban Trello Import And Full Card Features

Target executor: Codex Desktop, model: gpt-5.5 High thinking

## 1) Mission

Build: Trello export import and complete Trello-like card capability set.

Primary outcome: DAISy Kanban can replace the user’s Trello workflow by importing exported Trello data and supporting rich card fields.

Success metrics:

- Trello JSON and CSV imports support preview and run.
- Re-import is idempotent by source card id/hash where available.
- Cards support labels, due dates, checklists, comments, links, watchers, custom fields, attachments, priority, assignees, reviewer/input owner, and `readyForCodex`.
- Included/uploaded binary attachments use MongoDB GridFS.

## 2) Context

Depends on PRD-001 through PRD-004. PRD-002 exposes import RPC contracts; PRD-004 defines the agent/Codex contract needed for `readyForCodex`; this PRD completes import and rich card behavior across service/API/UI as needed.

## 3) Hard Requirements

- Implement Trello JSON export parser.
- Implement Trello CSV export parser.
- Implement import preview with lane mapping.
- Implement import run with idempotency and activity generation.
- Preserve Trello source metadata.
- Complete card field support for:
  - labels,
  - due dates,
  - priority,
  - assignee,
  - reviewer/input owner,
  - watchers,
  - checklists,
  - comments,
  - links,
  - attachments,
  - custom fields,
  - `readyForCodex`.
- Store binary attachment content in GridFS when content is included/uploaded.
- Keep URL-only attachments as metadata/links.
- Add service, gateway, UI, and import tests as applicable.

## 4) Non-Goals

- Live Trello sync.
- Trello API credential storage.
- Hard delete.

## 5) Inputs You Can Assume

- Users: Hugh, DAISy operators, agents.
- Interfaces: gateway RPC and Control UI import flow.
- Data/storage: MongoDB collections and GridFS.
- Security: import content is sensitive and must not be logged unnecessarily.
- Compatibility: Trello JSON/CSV export shapes may vary; parser should handle missing optional fields.

## 6) Required Deliverables

1. Trello import parsers.
2. Preview and run service behavior.
3. Idempotency and mapping logic.
4. Full card field persistence/API/UI completion.
5. GridFS attachment storage.
6. Tests and docs.

## 7) Output Format

Closeout must include assumptions, implementation plan, changed files, test commands and expected/actual output, import sample coverage, and acceptance criteria table.

## 8) Quality Bar

- Import is deterministic and safe to retry.
- Import errors are actionable but do not leak private data.
- Attachment handling is bounded.
- Rich card fields remain coherent across UI/API/tools.

## 9) Acceptance Criteria

| Criterion   | Required result                         |
| ----------- | --------------------------------------- |
| JSON import | Trello JSON preview/run works           |
| CSV import  | Trello CSV preview/run works            |
| Idempotency | Re-import does not duplicate cards      |
| Card fields | Full Trello-like card fields supported  |
| Attachments | GridFS stores binary content            |
| Activity    | Import/card changes create audit events |

## 10) Project-Specific Details

If this PRD is too broad for one PR, split import parsers, full card fields, and GridFS attachments into separate issue-sized PRs.
