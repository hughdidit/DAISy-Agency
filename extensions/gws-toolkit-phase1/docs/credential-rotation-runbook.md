# Credential Rotation Runbook

## Goals

- rotate service-account keys or credential files without widening route permissions
- preserve least privilege and explicit subject bindings

## Steps

1. provision the new `GWS_CREDENTIALS` service-account JSON secret outside plugin config
2. update route pointer or impersonation env var reference (`impersonatedUser` or `impersonatedUserEnvVar`)
3. redeploy with provisioning so `${DEPLOY_DIR}/config/secrets/gws/credentials.json` is refreshed
4. verify:
   - `openclaw gws auth-posture --subject agent:main`
   - `openclaw gws auth-health --subject agent:main`
   - `openclaw gws auth-health --subject <delegate subject>`
5. run delegated API smoke checks for required services
6. remove old key material after staged verification completes

## Cadence

- rotate service-account key material every 60-90 days
- run `GWS Auth Smoke` workflow daily to detect credential drift and token health regressions

## Notes

- never store secret payloads in plugin config
- keep `allowUnboundAgents: false` during rotation unless there is a specific
  break-glass need
- impersonation is delegate identity routing, not a token refresh mechanism
