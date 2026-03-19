# GWS Toolkit Skill (Guidance Only)

This skill helps operators and agents use `gws-toolkit-phase1` safely.

## Scope

- Read-only Google Workspace access through typed tools.
- Drive read: `list_files`, `get_file_metadata`, `export_file`.
- Gmail read: `list_messages`, `get_message_metadata`.
- Calendar read: `list_events`, `get_event`.

## Guardrails

- No write operations in Phase 1.
- No raw passthrough mode.
- Tool requests are policy-gated and schema-validated.
- Secrets are never supplied in prompts; use runtime env/secret injection.

## Recommended Flow

1. Run `gws_status` before read calls.
2. Use minimal params needed for each action.
3. Handle structured deny/error codes and avoid retries on policy denials.
4. Escalate to operators for auth or API enablement issues.

## Important

This skill is advisory only. Security enforcement is implemented in plugin code.
