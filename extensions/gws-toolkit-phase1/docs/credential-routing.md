# Credential Routing

The plugin routes requests by explicit subject:

- normal agent sessions resolve to `agent:<agentId>`
- subagent sessions resolve to `subagent:<agentId>`

## Resolution rules

1. resolve the subject from the tool context
2. look for an exact binding in `agentCredentialBindings`
3. if none exists, use `defaultCredentialRoute` only when `allowUnboundAgents: true`
4. otherwise deny the request

There is no implicit parent-route inheritance for subagents.

For DAISy delegated Google Workspace routes, the effective Google user comes
from the agent entry:

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "daisy",
        "googleWorkspace": {
          "email": "daisy.ai@hughdidit.com",
        },
      },
    ],
  },
}
```

`credentialRoutes[].impersonatedUser` is now a compatibility/projection field.
When present, it must match `agents.list[].googleWorkspace.email`; when absent,
the direct Google API transport uses the agent email as the delegated JWT
subject. Impersonated routes without an agent Workspace email fail closed.

Delegate posture should treat step 3 as disabled:

- keep `allowUnboundAgents: false`
- bind both `agent:<agentId>` and `subagent:<agentId>`
- avoid synthesized legacy routing

Legacy compatibility mode synthesizes `legacy-default` and enables default
fallback for older single-credential deployments when no explicit routing
config exists.

Recommended CLI flow:

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

`google-workspace set` writes the agent metadata and explicit GWS bindings in
one config update. Use `agents bind --gws-route` only when you intentionally
want to update route bindings without changing the agent's Workspace identity.

## Route fields

- `mode`
- `label`
- `allowedServices`
- `allowedTools`
- optional `allowedActions`
- credential pointer field for the chosen auth mode
- optional impersonation field (`impersonatedUser` or `impersonatedUserEnvVar`)
  for `credentials_file` routes
- optional `workspaceIdentityDomains` allowlist at plugin config level

## Configuration examples

Reusable service-account route for multiple Workspace identities:

```json5
{
  plugins: {
    entries: {
      "gws-toolkit-phase1": {
        enabled: true,
        config: {
          workspaceIdentityDomains: ["hughdidit.com"],
          allowUnboundAgents: false,
          approvedCredentialDirs: ["./config/secrets/gws"],
          credentialRoutes: {
            "hughdidit-agent-gws": {
              mode: "credentials_file",
              label: "HughDidIt delegated Google API route",
              credentialsFile: "./config/secrets/gws/domain-wide-delegation.json",
              allowedServices: ["calendar", "gmail", "drive"],
              allowedTools: ["gws_status", "gws_calendar_read", "gws_gmail_read", "gws_drive_read"],
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

Use a per-user route only when route policy or compatibility projection must be
different:

```json5
{
  credentialRoutes: {
    "daisy-gws": {
      mode: "credentials_file",
      credentialsFile: "./config/secrets/gws/domain-wide-delegation.json",
      impersonatedUser: "daisy.ai@hughdidit.com",
      allowedServices: ["calendar", "gmail"],
      allowedTools: ["gws_status", "gws_calendar_read", "gws_gmail_read"],
    },
  },
  agentCredentialBindings: {
    "agent:daisy": "daisy-gws",
    "subagent:daisy": "daisy-gws",
  },
}
```

If `agent:daisy` has `googleWorkspace.email: "finn.ai@hughdidit.com"` while the
route has `impersonatedUser: "daisy.ai@hughdidit.com"`, the request fails
closed before any Google API call.
