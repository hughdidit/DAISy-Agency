---
summary: "Unified GWS Toolkit plugin: hardened Google Workspace tools with route-aware writes"
read_when:
  - You are configuring gws-toolkit-phase1 in OPENCLAW_CONFIG_FILE
  - You need the unified Phase 1 + Phase 2 behavior
title: "GWS Toolkit"
---

# GWS Toolkit

`gws-toolkit-phase1` is the canonical runtime plugin id for the Google Workspace
toolkit. The implementation now covers:

- Phase 1 legacy-compatible read tools
- Phase 2 route-aware writes for Drive, Gmail, Calendar, Docs, and Sheets
- per-agent and per-sub-agent credential routing
- deny-by-default write gates and structured audit events

## Architecture

- Manifest-driven config validation through `openclaw.plugin.json`
- typed tool registration through the native plugin system
- centralized config, routing, auth, policy, command building, execution,
  normalization, and audit logging
- argv-only subprocess execution to `gws`; no shell interpolation and no raw
  passthrough tool
- plugin-owned runtime directories under the OpenClaw state directory for
  hardened read-only container roots

## Tool Families

Read tools:

- `gws_status`
- `gws_drive_read`
- `gws_gmail_read`
- `gws_calendar_read`
- `gws_docs_read`
- `gws_sheets_read`

Write tools:

- `gws_drive_write`
- `gws_gmail_write`
- `gws_calendar_write`
- `gws_docs_write`
- `gws_sheets_write`

## Security Model

- services are disabled unless explicitly enabled
- writes are disabled unless `allowWriteOperations: true`
- write services require explicit inclusion in `enabledWriteServices`
- writes require route permission plus `confirm: true`
- unbound agents are denied unless `allowUnboundAgents: true` and
  `defaultCredentialRoute` is configured
- no parent-agent route inheritance for sub-agents
- delegate agents should use `allowUnboundAgents: false` plus explicit
  bindings for both `agent:<id>` and `subagent:<id>`
- credential files must exist, be regular files, stay inside approved
  credential directories, and cannot be symlinks
- legacy single-credential compatibility mode synthesizes a default route to
  preserve older read-only deployments until explicit bindings are configured

## Credential Routing

Bindings use explicit subjects:

- `agent:<agentId>`
- `subagent:<agentId>`

Delegate posture requires both bindings to exist, even when they point to the
same named route.

Each subject resolves to exactly one named route. A route declares:

- auth mode
- label
- allowed services
- allowed tools
- optional allowed actions
- credential source pointer

Phase 1 single-credential config still works through an auto-generated legacy
compatibility route. When no explicit routing config exists, the plugin
preserves the prior single-identity behavior and surfaces a warning
recommending named routes.

## Config Shape

Core Phase 2 fields:

- `enabledServices`
- `enabledWriteServices`
- `allowWriteOperations`
- `approvedCredentialDirs`
- `allowedCredentialModes`
- `credentialRoutes`
- `agentCredentialBindings`
- `defaultCredentialRoute`
- `allowUnboundAgents`
- `credentialsFile` for Phase 1 compatibility
- `tokenEnvVar`
- `safeMode`
- `defaultScopesProfile`
- `customScopes`
- `timeoutMs`
- `maxStdoutBytes`
- `maxStderrBytes`
- `requireHumanApprovalFor`

## Migration

- keep the runtime plugin id as `gws-toolkit-phase1`
- old read-only deployments continue to work with legacy single-credential
  config through a synthesized default route
- move toward named routes and explicit `agent:*` / `subagent:*` bindings
- for delegates, treat named routes plus dual explicit bindings as required
- use the extension-local migration notes for the exact Phase 1 to Phase 2
  conversion steps

## Local vs CI/CD

Local test, lint, and build commands are for developer iteration only.

Passing local commands does **not** constitute final acceptance.

Authoritative lint, regression, and release gating for this toolkit lives in
CI/CD workflow checks.

## Extension Docs

- `extensions/gws-toolkit-phase1/docs/runbook.md`
- `extensions/gws-toolkit-phase1/docs/gws-scope-matrix.md`
- `extensions/gws-toolkit-phase1/docs/gws-audit-events.md`
- `extensions/gws-toolkit-phase1/docs/credential-routing.md`
- `extensions/gws-toolkit-phase1/docs/credential-rotation-runbook.md`
- `extensions/gws-toolkit-phase1/docs/agent-identity-binding-matrix.md`
- `extensions/gws-toolkit-phase1/docs/migration-phase1-to-phase2.md`
