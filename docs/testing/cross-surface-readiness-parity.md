# Cross-Surface Readiness Parity

SBX-207 adds a shared parity matrix for readiness assertions across gateway, readonly, CLI, doctor, and Control UI payload tests.

## Canonical Row Shape

All parity assertions normalize surface output to:

```ts
{
  subject: string;
  kind: "skill" | "tool";
  capabilityClass:
    | "sandbox-local"
    | "gateway-brokered"
    | "remote-node-assisted"
    | "configured-but-blocked"
    | "unsupported-in-current-runtime";
  primaryReasonCategory:
    | null
    | "policy-block"
    | "config-gap"
    | "runtime-profile-gap"
    | "projection-defect"
    | "remote-assisted-availability"
    | "gateway-brokered-availability";
}
```

`primaryReasonCategory` is `null` for `sandbox-local`.

## Required Parity Matrix

The shared matrix lives in `src/test-utils/capability-readiness-parity.ts`.

Representative rows:

- `local-skill` -> `sandbox-local`
- `web_fetch` -> `gateway-brokered` + `gateway-brokered-availability`
- `remote-mac-skill` -> `remote-node-assisted` + `remote-assisted-availability`
- `env-blocked-skill` -> `configured-but-blocked` + `config-gap`
- `browser` -> `configured-but-blocked` + `policy-block`
- `projection-defect-skill` -> `unsupported-in-current-runtime` + `projection-defect`
- `unsupported-runtime-skill` -> `unsupported-in-current-runtime` + `runtime-profile-gap`

## Expected Usage

- Gateway `skills.status` tests should compare skill rows against the gateway skill subset of the matrix.
- Readonly collection and resolver tests should compare readonly-visible skill and tool rows against the readonly subset.
- `status`, `sandbox explain`, and doctor-oriented tests should compare normalized snapshot rows against the full matrix.
- Control UI payload tests should compare `skills.status` payload rows against the shared skill subset instead of re-encoding expectations locally.

If a new readiness surface is added, add a normalization helper for that surface and compare it against the shared matrix instead of creating a new snapshot-only expectation set.
