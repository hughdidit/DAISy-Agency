# GWS Toolkit Skill (Guidance Only)

This skill helps operators and agents use `gws-toolkit-phase1` safely. The
tools are the enforcement layer; this skill is guidance for choosing the right
tool and workflow.

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

1. Run `gws_status` before reads or writes and treat its route, delegated
   identity, transport, and write-readiness fields as the source of truth.
2. Prefer the narrowest tool and action needed.
   For unread Gmail inbox checks by sender, prefer structured filters such as
   `fromEmail`, `fromDomain`, `unread`, and `inbox` over wildcard Gmail search
   strings like `from:*@example.com`.
   For Gmail drafts or sends with files, use `attachments` entries shaped as
   `{ filePath, filename?, mimeType? }`; `filePath` must point inside the active
   workspace, raw MIME passthrough is not supported, and attachments require
   delegated Google API transport rather than legacy gws CLI transport.
   For Drive PDFs or other ordinary files, use `gws_drive_read` with
   `action: "download_file"` and an `outputPath` inside the workspace; for
   shared Drive folders, list with `includeItemsFromAllDrives: true`,
   `corpora: "drive"`, and the target `driveId`.
3. Treat route and policy denials as configuration issues, not retry candidates.
4. Escalate auth or API enablement issues to operators.

## Important

This skill is advisory only. Security enforcement is implemented in plugin code.
For DAISy agent identities, GWS tools should report `transport: "google_api"`
and the effective delegated Google Workspace user before higher-level workflows
use Calendar, Gmail, Drive, Docs, or Sheets.
