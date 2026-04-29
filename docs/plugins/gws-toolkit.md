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
- first-class DAISy agent Google Workspace identities for delegated Google API
  calls
- deny-by-default write gates and structured audit events

## Architecture

- Manifest-driven config validation through `openclaw.plugin.json`
- typed tool registration through the native plugin system
- centralized config, routing, auth, policy, command building, execution,
  normalization, and audit logging
- delegated Google API transport for agent Workspace identities; legacy routes
  can still use argv-only subprocess execution to `gws`
- no shell interpolation and no raw passthrough tool
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
- real DAISy agent Workspace users are configured at
  `agents.list[].googleWorkspace.email`
- `credentialRoutes[].impersonatedUser` is compatibility-only and must match
  the agent Workspace email when present
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
- optional impersonation pointer (`impersonatedUser` or `impersonatedUserEnvVar`)
- optional Workspace identity domain allowlist (`workspaceIdentityDomains`)

For delegated DAISy agents, the Google API subject comes from
`agents.list[].googleWorkspace.email`. The route still controls which
credentials, services, tools, and actions are allowed.

## Human Setup For Agent Workspace Identities

Use this flow when an agent such as `daisy` or `finn` should act as a real
Google Workspace user such as `daisy.ai@hughdidit.com`.

1. In Google Workspace Admin, authorize the service account for Domain-Wide
   Delegation with only the scopes required by the enabled services.
2. Store the service-account JSON as `GWS_CREDENTIALS` for deploy-managed
   environments, or place it inside an approved credential directory for manual
   environments.
3. Configure `workspaceIdentityDomains` so only expected Workspace domains are
   accepted.
4. Create named `credentials_file` routes that point at the service-account JSON
   and declare the allowed GWS services, tools, and actions.
5. Set each agent's Workspace identity and explicit route binding with
   `openclaw agents google-workspace set`.
6. Validate with route-bound `openclaw gws auth-health --subject agent:<id>`
   and `gws_status` before using higher-level workflows.

Recommended reusable-route shape:

```json5
{
  agents: {
    list: [
      {
        id: "daisy",
        googleWorkspace: { email: "daisy.ai@hughdidit.com" },
      },
      {
        id: "finn",
        googleWorkspace: { email: "finn.ai@hughdidit.com" },
      },
    ],
  },
  plugins: {
    entries: {
      "gws-toolkit-phase1": {
        enabled: true,
        config: {
          workspaceIdentityDomains: ["hughdidit.com"],
          allowUnboundAgents: false,
          allowWriteOperations: true,
          enabledServices: ["calendar", "gmail", "drive", "docs", "sheets"],
          enabledWriteServices: ["calendar", "gmail", "drive", "docs", "sheets"],
          approvedCredentialDirs: ["./config/secrets/gws"],
          credentialRoutes: {
            "hughdidit-agent-gws": {
              mode: "credentials_file",
              label: "HughDidIt agent DWD service account",
              credentialsFile: "./config/secrets/gws/domain-wide-delegation.json",
              allowedServices: ["calendar", "gmail", "drive", "docs", "sheets"],
              allowedTools: [
                "gws_status",
                "gws_calendar_read",
                "gws_calendar_write",
                "gws_gmail_read",
                "gws_gmail_write",
                "gws_drive_read",
                "gws_drive_write",
                "gws_docs_read",
                "gws_docs_write",
                "gws_sheets_read",
                "gws_sheets_write",
              ],
              allowedActions: [
                "calendar:list_events",
                "calendar:create_event",
                "gmail:list_messages",
                "gmail:draft_message",
                "drive:list_files",
                "drive:upload_file",
                "docs:get_document",
                "docs:append_text",
                "sheets:get_values",
                "sheets:update_values",
              ],
            },
          },
          agentCredentialBindings: {
            "agent:daisy": "hughdidit-agent-gws",
            "subagent:daisy": "hughdidit-agent-gws",
            "agent:finn": "hughdidit-agent-gws",
            "subagent:finn": "hughdidit-agent-gws",
          },
        },
      },
    },
  },
}
```

The reusable route intentionally omits `impersonatedUser`; each tool call uses
the active agent's `googleWorkspace.email` as the delegated JWT subject. If a
route does include `impersonatedUser` or `impersonatedUserEnvVar`, it is only a
compatibility/projection check and must resolve to the same email as the active
agent, so per-user routes are required.

CLI helper:

```bash
openclaw agents google-workspace set \
  --agent daisy \
  --email daisy.ai@hughdidit.com \
  --gws-route hughdidit-agent-gws

openclaw agents google-workspace set \
  --agent finn \
  --email finn.ai@hughdidit.com \
  --gws-route hughdidit-agent-gws
```

The helper writes agent metadata and explicit `agent:<id>` /
`subagent:<id>` bindings together. It does not create routes, broaden route
policy, or weaken the domain allowlist.

## Auth Workflow Matrix

Upstream `gws` workflows:

- Interactive OAuth2
- Headless OAuth2
- Service Account
- Pre-obtained Access Token

Repository posture for `gws-toolkit-phase1`:

- `credentials_file`: first-class for Headless OAuth2 exported credentials
- `credentials_file`: first-class for service-account JSON
- agent Workspace identity: supported via `agents.list[].googleWorkspace.email`
  on explicitly bound `credentials_file` routes
- route-level impersonation fields are accepted only as compatibility checks
  against the agent Workspace email
- `token`: supported for transient pre-obtained token break-glass routes
- interactive OAuth2: upstream capability, not first-class in plugin runtime

In enforced runtime environments (`staging`, `production`), delegated agent
`credentials_file` routes must resolve to service-account JSON. User OAuth
export credentials (`authorized_user` / headless exports) are rejected for
routes that resolve an agent Workspace identity.

## Diagnostics Commands

- `openclaw gws auth-posture`: route posture and auth-source diagnostics
- `openclaw gws auth-health`: route-bound health; delegated agent identities
  use direct Google API smoke checks instead of `gws auth status`
- add `--subject agent:<id>` or `--subject subagent:<id>` to run diagnostics for
  an explicit binding subject
- `openclaw gws auth-status`: deprecated alias to `auth-health` for one release
  cycle
- `openclaw gws doctor`: posture-first checks; pass `--auth-health` for live
  auth health probing

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
- `workspaceIdentityDomains`
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
