---
summary: "Official supported sandbox runtime profiles and what each one is for"
title: Sandbox Runtime Profiles
read_when: "You need to choose or document the supported sandbox runtime profile for an agent or deployment."
status: active
---

# Sandbox Runtime Profiles

OpenClaw supports a small, explicit set of sandbox runtime profiles. These
profiles define the intended identity of a sandbox runtime so maintainers do
not have to reverse-engineer Dockerfiles, setup scripts, or package accidents.

Set the profile with `agents.defaults.sandbox.profile` or
`agents.list[].sandbox.profile`.

## Official profiles

| Profile id | Intended workload | Trust posture | Assistance |
| --- | --- | --- | --- |
| `ops-readonly` | Read-only diagnostics, inspection, and sandbox-safe operator triage | Minimal authority, read-only projection-focused runtime | sandbox-local + gateway-brokered |
| `coding-base` | Normal coding, editing, and command execution inside the declared workspace boundary | Default sandbox-first coding runtime with explicit workspace access and no implied direct network guarantee | sandbox-local + gateway-brokered + remote-node-assisted |
| `browser-automation` | Browser and CDP-driven workflows when sandbox browser support is enabled | Sandbox runtime paired with the dedicated browser runtime; browser support must be explicitly enabled | sandbox-local + gateway-brokered + browser |

## Profile details

### `ops-readonly`

Use this for runtimes intended to support readonly diagnostics such as `status`,
`sandbox explain`, projection inspection, and other non-mutating workflows.

Baseline expectations:

- projected config/state/workspace inputs are present and truthful
- readonly skills work without mutable workspace assumptions
- browser support is not implied

### `coding-base`

This is the default profile for normal sandboxed coding work. It describes the
ordinary DAISy sandbox posture for reading, editing, patching, and running
approved commands inside the configured workspace boundary.

Baseline expectations:

- coding workflows happen inside the sandbox boundary
- workspace access is explicit through sandbox config
- brokered or remote-assisted capabilities remain explicit rather than ambient

### `browser-automation`

Use this when the runtime is intended to support browser/CDP workflows through
the dedicated sandbox browser runtime.

Baseline expectations:

- browser support is enabled through `agents.defaults.sandbox.browser`
- browser capability depends on the dedicated sandbox browser runtime, not on
  arbitrary packages in the base sandbox image
- non-browser capabilities still follow normal sandbox and gateway policy

## Custom images and setupCommand

Custom images are allowed, but they do not create new official profile ids.
Choose the official profile your custom image is intended to satisfy and set
that profile explicitly in config.

`setupCommand`, extra packages, or local image variations may help a runtime
meet one of the official profiles, but they do not expand the supported
profile catalog by themselves.

## Example

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all",
        "scope": "session",
        "profile": "coding-base"
      }
    }
  }
}
```

See also:

- [Sandboxing](/gateway/sandboxing)
- [Sandbox CLI](/cli/sandbox)

