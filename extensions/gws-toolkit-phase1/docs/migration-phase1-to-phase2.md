# Migration: Phase 1 to Phase 2

## What stays the same

- runtime plugin id remains `gws-toolkit-phase1`
- legacy `credentialsFile` and `tokenEnvVar` config still work
- existing read tools stay available

## What changes

- writes are now available through separate write tools
- per-agent and per-sub-agent credential routing is supported
- one canonical plugin doc replaces the old split Phase 1-only docs

## Recommended migration steps

1. keep existing read-only config in place and verify `gws_status`
2. define `credentialRoutes`
3. add explicit `agent:*` and `subagent:*` bindings
4. enable only the services that should write
5. set `allowWriteOperations: true` only after route policy is in place
6. stage write validation with `confirm: true`

## Documentation redirects

- old canonical doc: `docs/plugins/gws-toolkit-phase1.md`
- new canonical doc: `docs/plugins/gws-toolkit.md`
