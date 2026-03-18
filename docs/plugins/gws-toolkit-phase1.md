---
summary: "GWS Toolkit Phase 1 plugin: hardened read-only Google Workspace tools via gws CLI"
read_when:
  - You want to enable Google Workspace read-only tools for agents
  - You are configuring gws-toolkit-phase1 in OPENCLAW_CONFIG_FILE
  - You need secure auth options for long-running autonomous agents
title: "GWS Toolkit Phase 1"
---

# GWS Toolkit Phase 1 (plugin)

`gws-toolkit-phase1` is a bundled native plugin that exposes a narrow, read-only Google Workspace tool surface for agents.

This plugin is intentionally constrained:

- deny-by-default policy
- no write tools
- no raw passthrough tool
- strict schema validation
- argv-only subprocess execution to `gws` (no shell interpolation)

## Upstream gws CLI references

- Repository: [googleworkspace/cli](https://github.com/googleworkspace/cli)
- Install + quick start: [README: Installation](https://github.com/googleworkspace/cli#installation), [README: Quick Start](https://github.com/googleworkspace/cli#quick-start)
- Auth modes + precedence: [README: Authentication](https://github.com/googleworkspace/cli#authentication)
- Headless export flow: [README: Headless / CI (export flow)](https://github.com/googleworkspace/cli#headless--ci-export-flow)
- Pre-obtained token mode: [README: Pre-obtained Access Token](https://github.com/googleworkspace/cli#pre-obtained-access-token)
- Structured exit/result model: [README: Exit Codes](https://github.com/googleworkspace/cli#exit-codes)

## Tool surface (Phase 1)

- `gws_status`
- `gws_drive_read`
  - `list_files`
  - `get_file_metadata`
  - `export_file`
- `gws_gmail_read`
  - `list_messages`
  - `get_message_metadata`
- `gws_calendar_read`
  - `list_events`
  - `get_event`

Not available in Phase 1:

- send/create/update/delete flows
- raw passthrough commands
- service-account mode in plugin code

## Enable plugin

Enable in your config file under `plugins.entries.gws-toolkit-phase1`:

```json5
{
  plugins: {
    entries: {
      "gws-toolkit-phase1": {
        enabled: true,
        config: {
          enabledServices: ["drive", "gmail", "calendar"],
          safeMode: true,
          timeoutMs: 15000,
          maxStdoutBytes: 1048576,
          maxStderrBytes: 262144,
          allowedCredentialModes: ["oauth", "credentials_file", "token"],
          defaultScopesProfile: "minimal",
          tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
          approvedCredentialDirs: ["/home/node/.openclaw/secrets/gws"],
          credentialsFile: "/home/node/.openclaw/secrets/gws/credentials.json",
        },
      },
    },
  },
}
```

## Auth options

This plugin supports:

- `oauth` (interactive workstation)
- `credentials_file` (recommended for long-running autonomous agents)
- `token` (short-lived env token, best for short-lived/manual flows)

For autonomous operation, prefer `credentials_file` mode using exported credentials (see upstream export flow link above).

## Credential hardening

When `credentials_file` mode is used, the plugin enforces:

- file must exist and be a regular file
- symlink credential paths are denied
- canonical path must stay inside `approvedCredentialDirs`
- POSIX deployments require owner-only credential file permissions (`0600`-style)

## Multi-agent credential scope

Phase 1 does not multiplex credentials for multiple agents inside one plugin instance.

Current recommended pattern:

- isolate each agent identity with a dedicated runtime profile (`OPENCLAW_CONFIG_FILE` + secrets)
- assign one credential source per deployed agent runtime

True in-process multi-agent credential routing is deferred to Phase 2.

## Deploy secrets

DAISy deploy supports both:

- `GOOGLE_WORKSPACE_CLI_TOKEN` (token mode)
- `GWS_CREDENTIALS` (credentials JSON payload for `credentials_file` mode; materialized during deploy to `config/secrets/gws/credentials.json`)

## Policy and audit docs

Detailed plugin-specific docs live with the extension source:

- `extensions/gws-toolkit-phase1/docs/runbook.md`
- `extensions/gws-toolkit-phase1/docs/gws-scope-matrix.md`
- `extensions/gws-toolkit-phase1/docs/gws-audit-events.md`
