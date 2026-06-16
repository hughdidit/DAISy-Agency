# GWS Scope Matrix

## Default profiles

- `minimal`: read-only scopes for enabled services
- `service-set`: read-only scopes for read services and write scopes for
  services listed in `enabledWriteServices`
- `custom`: operator-supplied scopes

## Service mapping

| Service  | Read scope                                              | Write scope                                    |
| -------- | ------------------------------------------------------- | ---------------------------------------------- |
| Drive    | `https://www.googleapis.com/auth/drive.readonly`        | `https://www.googleapis.com/auth/drive`        |
| Gmail    | `https://www.googleapis.com/auth/gmail.readonly`        | `https://mail.google.com/`                     |
| Calendar | `https://www.googleapis.com/auth/calendar.readonly`     | `https://www.googleapis.com/auth/calendar`     |
| Docs     | `https://www.googleapis.com/auth/documents.readonly`    | `https://www.googleapis.com/auth/documents`    |
| Sheets   | `https://www.googleapis.com/auth/spreadsheets.readonly` | `https://www.googleapis.com/auth/spreadsheets` |
| Contacts | `https://www.googleapis.com/auth/contacts.readonly`     | `https://www.googleapis.com/auth/contacts`     |
| Groups   | `https://www.googleapis.com/auth/admin.directory.group.readonly` and `https://www.googleapis.com/auth/admin.directory.group.member.readonly` | `https://www.googleapis.com/auth/admin.directory.group` and `https://www.googleapis.com/auth/admin.directory.group.member` |

## Notes

- scopes alone do not authorize writes
- route policy and `confirm: true` are still required
- Contacts use the People API and intentionally exclude delete operations
- Directory Groups use the Admin SDK Directory API, require delegated Google API
  transport, and intentionally exclude group deletion
- local validation is advisory; CI/CD remains the authoritative release gate
