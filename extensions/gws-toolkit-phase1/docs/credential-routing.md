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

Legacy compatibility mode synthesizes `legacy-default` and enables default
fallback for older single-credential deployments when no explicit routing
config exists.

## Route fields

- `mode`
- `label`
- `allowedServices`
- `allowedTools`
- optional `allowedActions`
- credential pointer field for the chosen auth mode
