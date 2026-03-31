# GWS Toolkit Skill (Guidance Only)

This skill helps operators and agents use `gws-toolkit-phase1` safely after the
Phase 2 upgrade.

## Scope

- Read tools for Drive, Gmail, Calendar, Docs, and Sheets.
- Write tools for the same families when the plugin, route, and confirmation
  gates all allow the action.

## Guardrails

- No raw passthrough mode.
- Tool requests are policy-gated and schema-validated.
- Writes require `confirm: true`.
- Secrets are never supplied in prompts; use runtime env/secret injection.

## Recommended Flow

1. Run `gws_status` before reads or writes.
2. Prefer the narrowest tool and action needed.
3. Treat route and policy denials as configuration issues, not retry candidates.
4. Escalate auth or API enablement issues to operators.

## Important

This skill is advisory only. Security enforcement is implemented in plugin code.
