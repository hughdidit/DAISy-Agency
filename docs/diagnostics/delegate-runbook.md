---
summary: "Runbook for standing up and validating a hardened delegate agent"
title: Delegate Runbook
read_when:
  - You are creating a new delegate agent
  - Doctor is reporting unsafe delegate posture
  - You are wiring GWS routes for delegated work
---

# Delegate Runbook

## 1. Create the agent

```bash
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --preset delegate --delegate-tier tier1
```

Use:

- `tier1` for draft/read delegates
- `tier2` for explicit send-on-behalf delegates
- `tier3` for proactive delegates with isolated cron

## 2. Configure GWS routes

Reference plugin posture:

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        googleWorkspace: { email: "daisy.ai@hughdidit.com" },
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
          enabledServices: ["gmail", "calendar"],
          enabledWriteServices: ["gmail", "calendar"],
          approvedCredentialDirs: ["./config/secrets/gws"],
          credentialRoutes: {
            "ops-main": {
              mode: "credentials_file",
              allowedServices: ["gmail", "calendar"],
              allowedTools: ["gws_gmail_read", "gws_calendar_read", "gws_gmail_write"],
              allowedActions: ["draft_message"],
              credentialsFile: "./config/secrets/gws/domain-wide-delegation.json",
            },
          },
          agentCredentialBindings: {
            "agent:ops": "ops-main",
            "subagent:ops": "ops-main",
          },
        },
      },
    },
  },
}
```

The reusable delegated route usually omits `impersonatedUser`; the effective
Google user is `agents.list[].googleWorkspace.email`. If a route does include
`impersonatedUser`, it must match that agent email.

To write the agent identity and bindings together after the route exists:

```bash
openclaw agents google-workspace set \
  --agent ops \
  --email daisy.ai@hughdidit.com \
  --gws-route ops-main
```

If top-level and subagent posture differ:

```bash
openclaw agents google-workspace set \
  --agent ops \
  --email daisy.ai@hughdidit.com \
  --gws-route ops-main \
  --subagent-gws-route ops-subagent
```

## 3. Verify auth isolation

Delegate agents should not inherit auth from `main`.

Expected posture:

- `agents.list[].delegate.authIsolation: "strict"`
- dedicated `auth-profiles.json` under that agent's `agentDir`
- no fallback merge from the main agent

## 4. Verify sandbox posture

Expected posture:

- `sandbox.mode: "all"`
- `sandbox.scope: "agent"`
- per-agent workspace and session isolation

## 5. Verify doctor output

Run:

```bash
openclaw doctor
openclaw security audit --deep
```

Delegate-specific failures usually mean one of these:

- missing `agent:<id>` binding
- missing `subagent:<id>` binding
- missing `agents.list[].googleWorkspace.email`
- Workspace email domain not present in `workspaceIdentityDomains`
- route `impersonatedUser` does not match the agent Workspace email
- `allowUnboundAgents: true`
- legacy synthesized GWS routing still active
- delegate still in `authIsolation: "legacy"`
- tier does not match tool or cron posture

## 6. Tier 3 cron checks

For proactive delegates:

- keep cron jobs on the delegate `agentId`
- require `sessionTarget: "isolated"`
- require `payload.kind: "agentTurn"`

If those conditions are not met, `doctor` reports the jobs as unsafe.
