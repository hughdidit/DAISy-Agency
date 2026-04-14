# Credential Rotation Runbook

## Goals

- rotate tokens or credential files without widening route permissions
- preserve least privilege and explicit subject bindings

## Steps

1. provision the new secret material outside plugin config
2. update the route pointer or referenced env var
3. verify `openclaw gws routes` and `openclaw gws auth-health`
4. run read smoke checks first
5. run write smoke checks only for the routes and services that require them
6. remove old secret material after staged verification

## Notes

- never store secret payloads in plugin config
- keep `allowUnboundAgents: false` during rotation unless there is a specific
  break-glass need
