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
openclaw agents google-workspace set --agent ops --email daisy.ai@hughdidit.com --gws-route ops-main
openclaw agents bind --agent ops --gws-route ops-main
openclaw agents bind --agent ops --gws-route ops-main --subagent-gws-route ops-subagent
```

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
