# PRD-004 Kanban Agent Tools And Codex Skill

Target executor: Codex Desktop, model: gpt-5.5 High thinking

## 1) Mission

Build: gateway-brokered Kanban tools and Codex operating skill.

Primary outcome: DAISy agents and Codex can safely operate the Kanban board without direct database access.

Success metrics:

- Tool catalog exposes Kanban read/write/pickup/handoff/complete capabilities.
- Tools call gateway RPC methods and preserve auth, scopes, validation, and activity logging.
- `skills/kanban-codex/SKILL.md` instructs manual and scheduled Codex workflows.
- Scheduled pickup claims only `readyForCodex` cards by priority then oldest.

## 2) Context

Depends on PRD-002. The repo already has agent tool catalog, gateway-brokered tools, system prompt guidance, and local skills.

## 3) Hard Requirements

- Add Kanban tool definitions to the tool catalog.
- Implement gateway-brokered tools:
  - `kanban_read`
  - `kanban_write`
  - `kanban_pick_task`
  - `kanban_handoff`
  - `kanban_complete`
- Add concise tool guidance to agent/system prompt surfaces.
- Add `skills/kanban-codex/SKILL.md`.
- Skill must instruct Codex to:
  - read board/card context through tools,
  - pick up only `readyForCodex` cards,
  - work the card,
  - move complete work to `Done`,
  - move review/input work to `Review`,
  - assign reviewer/input owner when applicable,
  - add concise activity/comment evidence,
  - never access MongoDB directly.
- Add tests for tool parameter validation and gateway-backed behavior.

## 4) Non-Goals

- New scheduler infrastructure beyond using existing cron/schedule mechanisms.
- Direct DB tools.
- Hard delete tools.

## 5) Inputs You Can Assume

- Users: configured DAISy agents and Codex Desktop.
- Interfaces: gateway RPC from PRD-002, existing tool runtime.
- Security: tool policy and method scopes.
- Data/storage: Kanban service via gateway only.

## 6) Required Deliverables

1. Tool catalog entries.
2. Tool implementations.
3. System prompt/tool guidance.
4. `skills/kanban-codex/SKILL.md`.
5. Tool tests.
6. Scheduled pickup usage notes.

## 7) Output Format

Closeout must include assumptions, implementation plan, changed files, test commands and expected/actual output, and acceptance criteria table.

## 8) Quality Bar

- Tools are narrow and auditable.
- Every write produces board activity via gateway RPC.
- Agents cannot bypass auth or datastore boundaries.
- Skill is operational, not aspirational.

## 9) Acceptance Criteria

| Criterion      | Required result                                             |
| -------------- | ----------------------------------------------------------- |
| Tools          | Read/write/pickup/handoff/complete registered               |
| Gateway backed | Tools use RPC, not MongoDB                                  |
| Pickup         | Priority then oldest `readyForCodex` claim                  |
| Skill          | Codex workflow documented in `skills/kanban-codex/SKILL.md` |
| Tests          | Tool behavior covered                                       |

## 10) Project-Specific Details

If this PRD is too broad for one PR, split tool definitions/implementation from skill and prompt guidance.
