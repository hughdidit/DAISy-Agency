# GWS Toolkit Runbook

## Purpose

This runbook covers the unified `gws-toolkit-phase1` plugin after the Phase 2
upgrade.

Local test, lint, and build commands are for development iteration only.
Authoritative acceptance remains in CI/CD workflow gates.

## 1. Install or update `gws`

```bash
npm install -g @googleworkspace/cli
gws --version
```

Set `binaryPath` in plugin config if `gws` is not on `PATH`.

## 2. Choose auth mode

Supported modes:

- `credentials_file` for production-capable route bindings
- `token` for controlled short-lived routes
- `oauth` for local/dev convenience only

## 3. Configure named routes and bindings

Example local/dev config:

```json5
{
  plugins: {
    entries: {
      "gws-toolkit-phase1": {
        enabled: true,
        config: {
          enabledServices: ["drive", "gmail", "calendar", "docs", "sheets"],
          enabledWriteServices: ["docs", "sheets"],
          allowWriteOperations: true,
          safeMode: true,
          approvedCredentialDirs: ["./config/secrets/gws"],
          credentialRoutes: {
            "local-main": {
              mode: "token",
              label: "Local dev token",
              allowedServices: ["drive", "gmail", "calendar", "docs", "sheets"],
              allowedTools: [
                "gws_drive_read",
                "gws_gmail_read",
                "gws_calendar_read",
                "gws_docs_read",
                "gws_sheets_read",
                "gws_docs_write",
                "gws_sheets_write"
              ],
              allowedActions: ["docs:append_text", "sheets:update_values"],
              tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN"
            }
          },
          agentCredentialBindings: {
            "agent:main": "local-main"
          }
        }
      }
    }
  }
}
```

Example staging route pattern:

- bind `agent:ops` and `subagent:ops` separately
- prefer `credentials_file`
- keep `allowUnboundAgents: false`
- enable only the write services actually needed

## 4. Apply OpenClaw tool policy

Use the standard OpenClaw tool allow/deny model to expose only the GWS tools a
given agent should see. The plugin then applies route and write gates on top of
that visibility.

## 5. Verify reads

Run:

```bash
openclaw gws doctor
openclaw gws auth-status
openclaw gws routes
```

Read smoke checks:

- `gws_status`
- `gws_drive_read`
- `gws_gmail_read`
- `gws_calendar_read`
- `gws_docs_read`
- `gws_sheets_read`

## 6. Verify writes intentionally

Before any write succeeds, all of these must pass:

1. plugin enabled
2. service enabled
3. global writes enabled
4. service listed in `enabledWriteServices`
5. route allows the service/tool/action
6. `confirm: true`

Run deny checks as part of staging validation:

- write with `confirm: false`
- write from a subject with no binding
- write from a route that only allows reads
- credentials file outside approved directory

## 7. Phase 1 migration

- keep the runtime id `gws-toolkit-phase1`
- old `credentialsFile` config continues to work through a synthesized
  compatibility route
- migrate to named routes and explicit `agent:*` / `subagent:*` bindings
- see `migration-phase1-to-phase2.md` for the exact cutover steps
