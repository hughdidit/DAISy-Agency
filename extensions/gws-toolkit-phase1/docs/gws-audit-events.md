# GWS Audit Events (Phase 1)

Every tool invocation emits a normalized audit event, including allow and deny outcomes.

## Event Schema

```json
{
  "timestamp": "2026-03-17T00:00:00.000Z",
  "agentId": "optional-agent-id",
  "sessionId": "optional-session-id",
  "toolName": "gws_drive_read",
  "action": "list_files",
  "targetService": "drive",
  "readOnly": true,
  "decision": "allow",
  "denyReason": "optional deny reason",
  "credentialMode": "token",
  "latencyMs": 143,
  "exitCode": 0,
  "resultCode": "OK"
}
```

## Redaction Rules

The plugin redacts or suppresses:

- OAuth tokens and access tokens
- Authorization header values
- Credentials file contents
- Sensitive credential-like key fields in metadata
- Full content payloads (email bodies/file contents) from logs by default
- Sensitive path values in surfaced logs/errors (path basenames may be emitted for diagnostics)

Structured errors returned to tools are also redacted before surfacing to agents/operators.

## Credential Path Hardening Signals

For `credentials_file` mode failures, deny outcomes may include generic reasons such as:

- file missing
- path outside approved directories
- symlink denied
- permissions too open

The event/error payload does not include raw credential content and must not include full sensitive path disclosure.

## Config Source Context

Audit and status events can include safe config-source posture details for `OPENCLAW_CONFIG_FILE` troubleshooting:

- Whether env var is present
- Path basename only (not full sensitive path)
- Whether plugin config block was provided/validated

## Examples

Allow:

```json
{
  "toolName": "gws_status",
  "action": "status",
  "targetService": "status",
  "decision": "allow",
  "resultCode": "OK"
}
```

Deny:

```json
{
  "toolName": "gws_gmail_read",
  "action": "send_message",
  "targetService": "gmail",
  "decision": "deny",
  "denyReason": "action not allowed in phase1: send_message",
  "resultCode": "DENY_POLICY"
}
```
