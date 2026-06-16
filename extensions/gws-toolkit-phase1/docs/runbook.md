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
- `token` for controlled short-lived break-glass routes

`oauth` remains an upstream `gws` capability, but it is intentionally not a
first-class route mode in plugin runtime.

For delegated agent Workspace routes, use service-account JSON credentials with
Domain-Wide Delegation. `agents.list[].googleWorkspace.email` controls the
delegated Google subject; it does not automate user OAuth reauthentication.

## 3. Configure named routes, identities, and bindings

For DAISy agent identities, humans configure the route policy first, then bind
agents to that route with a real Workspace email. The service-account JSON is
the credential root; each tool call selects the real Workspace user through the
agent's delegated JWT subject.

Example service-account delegated config:

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
          enabledServices: ["drive", "gmail", "calendar", "docs", "sheets", "contacts", "groups"],
          enabledWriteServices: ["calendar", "gmail", "docs", "sheets", "contacts", "groups"],
          allowWriteOperations: true,
          safeMode: true,
          approvedCredentialDirs: ["./config/secrets/gws"],
          gmailPolicy: {
            whitelistFile: "./gws/gmail-whitelist.json",
            blacklistFile: "./gws/gmail-blacklist.json",
          },
          credentialRoutes: {
            "hughdidit-agent-gws": {
              mode: "credentials_file",
              label: "HughDidIt agent DWD service account",
              credentialsFile: "./config/secrets/gws/domain-wide-delegation.json",
              allowedServices: [
                "drive",
                "gmail",
                "calendar",
                "docs",
                "sheets",
                "contacts",
                "groups",
              ],
              allowedTools: [
                "gws_status",
                "gws_drive_read",
                "gws_gmail_read",
                "gws_calendar_read",
                "gws_docs_read",
                "gws_sheets_read",
                "gws_contacts_read",
                "gws_groups_read",
                "gws_gmail_write",
                "gws_calendar_write",
                "gws_docs_write",
                "gws_sheets_write",
                "gws_contacts_write",
                "gws_groups_write",
              ],
              allowedActions: [
                "gmail:draft_message",
                "gmail:mark_message_read",
                "calendar:list_events",
                "calendar:create_event",
                "docs:append_text",
                "sheets:update_values",
                "contacts:list_contact_groups",
                "contacts:modify_contact_group_members",
                "groups:list_groups",
                "groups:add_group_member",
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

Equivalent CLI binding flow after the route exists:

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

The route above intentionally omits `impersonatedUser` so multiple agents can
share the same service-account route while retaining distinct delegated
subjects. If `impersonatedUser` is present on a route, it must match the active
agent's `googleWorkspace.email`.

For Gmail triage, install the live policy files on the host at
`/opt/DAISy/config/gws/gmail-whitelist.json` and
`/opt/DAISy/config/gws/gmail-blacklist.json`, then point `gmailPolicy` at those
files relative to `/opt/DAISy/config/openclaw.json` as shown above. Keep the
files operator-owned regular JSON files, not symlinks. Mount them read-only
into the gateway, and do not mount `/opt/DAISy/config` wholesale into
sandboxes.
Agents receive the `gmail-triage` workflow automatically when Gmail email is
read through `gws_gmail_read` or delivered via a `hook:gmail:*` webhook session.
The automatic skill requirement is guidance; whitelist/blacklist and write
permission decisions are still enforced by the GWS toolkit.

Staging route pattern:

- bind `agent:ops` and `subagent:ops` separately
- prefer `credentials_file`
- keep `allowUnboundAgents: false`
- enable only the write services actually needed
- set `workspaceIdentityDomains`, for example `["hughdidit.com"]`

Delegate reference posture:

- create the agent with `openclaw agents add --preset delegate`
- bind both `agent:<id>` and `subagent:<id>` even when they use the same route
- keep tier1 routes restricted to read actions plus `draft_message`; add
  `gmail:mark_message_read` only for agents expected to close handled mail
- treat missing explicit bindings as a configuration failure, not a convenience fallback

## 4. Apply OpenClaw tool policy

Use the standard OpenClaw tool allow/deny model to expose only the GWS tools a
given agent should see. The plugin then applies route and write gates on top of
that visibility.

## 5. Verify reads

Run:

```bash
openclaw gws doctor
openclaw gws auth-posture
openclaw gws auth-health
openclaw gws routes
openclaw gws auth-health --subject agent:daisy
openclaw gws auth-health --subject subagent:daisy
```

Optional deeper doctor path:

```bash
openclaw gws doctor --auth-health
```

`openclaw gws auth-status` remains a deprecated alias to `auth-health` for one
release cycle.

`gws_status` and the CLI wrappers include current-session route diagnostics,
including the resolved `bindingSubject`, active route name, delegated Workspace
email, transport (`google_api` for agent identities), enabled services, write
gates, and resolved credentials-file path for `credentials_file` routes when
available.

Read smoke checks:

- `gws_status`
- `gws_calendar_read`
- `gws_gmail_read`
- `gws_drive_read`
- `gws_docs_read`
- `gws_sheets_read`
- `gws_contacts_read`
- `gws_groups_read`

For Calendar, read the user's `primary` calendar after auth-health passes. A
404 for `primary` means the delegated subject is still not a valid readable
Workspace user for that service and should be treated as a configuration
failure.

To inspect recurring Calendar masters and their `recurrence` rules, use
`gws_calendar_read` with `action: "list_events"` and `singleEvents: false`.
The default remains `singleEvents: true`, which returns expanded event
instances for normal scheduling workflows.

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

Calendar writes intentionally expose a curated event surface, not raw Google
Calendar event JSON. Use `recurrence` as Google-compatible RFC5545 strings such
as `RRULE:FREQ=WEEKLY;BYDAY=MO`, `RDATE:20260706T160000Z`, or
`EXDATE:20260713T160000Z`. Supported write fields include date-time or all-day
start/end values, time zones, attendees, recurrence, visibility, transparency,
color, reminders, source, extended properties, attachments, `sendUpdates`,
`supportsAttachments`, and guest permission booleans. Unknown properties remain
schema errors.

Contacts writes also expose a curated People API surface. Create/update contact
groups and add/remove group members with `gws_contacts_write`, but do not
configure delete actions for contacts or groups; they are intentionally out of
scope and fail validation or policy.

Directory Groups use `gws_groups_read` and `gws_groups_write` through delegated
Google API transport and the Admin SDK Directory API. They are separate from
Contact Groups. The delegated subject must have the Workspace admin privileges
required for group and membership management. Legacy token or CLI transport
fails closed for `groups` actions. Group deletion is intentionally not exposed;
membership removal uses `remove_group_member`.

After deploying a new gws-toolkit tool surface, create a new agent session for
sandboxed agents. Existing sessions keep the tool catalog they started with.

## 7. Phase 1 migration

- keep the runtime id `gws-toolkit-phase1`
- old `credentialsFile` config continues to work through a synthesized
  compatibility route
- migrate to named routes and explicit `agent:*` / `subagent:*` bindings
- see `migration-phase1-to-phase2.md` for the exact cutover steps
