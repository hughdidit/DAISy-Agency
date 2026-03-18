# GWS Scope Matrix (Phase 1)

All scopes below are read-only and minimized for the exposed Phase 1 tool surface.

| Tool Family | Action | Required Scopes | Read/Write | Sensitivity | Justification | Enabled In Phase 1 |
|---|---|---|---|---|---|---|
| gws_status | status | none (local diagnostic) | read-only | low | Local binary/auth/config posture check only | yes |
| gws_drive_read | list_files | https://www.googleapis.com/auth/drive.readonly | read-only | restricted by Workspace data | Lists metadata-only Drive files | yes |
| gws_drive_read | get_file_metadata | https://www.googleapis.com/auth/drive.readonly | read-only | restricted by Workspace data | Reads file metadata without mutation | yes |
| gws_drive_read | export_file | https://www.googleapis.com/auth/drive.readonly | read-only | restricted by Workspace data | Exports existing content without writes | yes |
| gws_gmail_read | list_messages | https://www.googleapis.com/auth/gmail.readonly | read-only | restricted by mailbox data | Lists message metadata/ids only | yes |
| gws_gmail_read | get_message_metadata | https://www.googleapis.com/auth/gmail.readonly | read-only | restricted by mailbox data | Reads message metadata only | yes |
| gws_calendar_read | list_events | https://www.googleapis.com/auth/calendar.readonly | read-only | restricted by calendar data | Lists calendar events without modifications | yes |
| gws_calendar_read | get_event | https://www.googleapis.com/auth/calendar.readonly | read-only | restricted by calendar data | Reads single event details without modification | yes |

## Scope Rules

- `defaultScopesProfile=minimal` is required by default.
- `defaultScopesProfile=custom` is allowed only when every custom scope remains read-only.
- Broader write-oriented scopes are rejected in Phase 1.
- If a narrower scope can satisfy an action, broader scope use is denied.
