---
summary: "Delegate agents: hardened multi-agent specialization with strict auth isolation and explicit GWS routing"
title: Delegate Architecture
read_when:
  - You are configuring a delegate agent
  - You need strict auth isolation from the main agent
  - You are wiring Google Workspace routing for delegated runs
---

# Delegate Architecture

Delegate agents are a hardened specialization of the existing multi-agent model.
They do not introduce a second runtime. Instead, they tighten the existing
agent, sandbox, auth, tool, and routing surfaces around a least-privilege
posture.

## What makes a delegate different

A delegate agent is still a normal agent with its own:

- workspace
- `agentDir`
- session store
- identity

What changes is the posture:

- strict auth isolation by default
- agent-scoped sandboxing
- explicit tool allow/deny posture by tier
- explicit GWS bindings for both `agent:<id>` and `subagent:<id>`
- no implicit fallback to the main agent's credentials

## Config shape

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        workspace: "~/.openclaw/workspace-ops",
        delegate: {
          enabled: true,
          tier: "tier1",
          authIsolation: "strict",
          gwsRouting: {
            requireExplicitBindings: true,
          },
          cron: {
            allowed: false,
          },
        },
      },
    ],
  },
}
```

`delegate.authIsolation` supports:

- `strict`: no main-agent auth inheritance, cloning, or OAuth adoption
- `legacy`: compatibility mode only; `doctor` flags this as unsafe for delegates

## Tiers

### Tier 1

Read-mostly delegate posture:

- sandbox required
- `sandbox.scope: "agent"`
- read/status tools plus session coordination tools
- Gmail draft capability only when the bound route restricts actions to `draft_message`
- no cron

### Tier 2

Send-on-behalf posture:

- same hardened sandbox baseline as Tier 1
- explicit write tools and write-capable routes allowed when approved
- no cron by default

### Tier 3

Proactive delegate posture:

- same write posture as Tier 2
- explicit cron allowance
- cron jobs must stay agent-scoped and isolated

## CLI

Create a delegate agent:

```bash
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --preset delegate --delegate-tier tier1
```

Bind GWS routes:

```bash
openclaw agents bind --agent ops --gws-route ops-main
openclaw agents bind --agent ops --gws-route ops-main --subagent-gws-route ops-subagent
```

The bind command writes both subjects by default:

- `agent:ops`
- `subagent:ops`

## GWS routing requirements

Delegate posture assumes:

- `allowUnboundAgents: false`
- named `credentialRoutes`
- explicit `agentCredentialBindings`
- no synthesized legacy default route

If any of those are missing, `openclaw doctor` reports the delegate as unsafe.

## Cron requirements

Tier 3 delegates may use cron only when:

- `delegate.cron.allowed: true`
- the agent tool posture allows `cron`
- cron jobs run as that delegate agent
- jobs use `sessionTarget: "isolated"`
- payload kind is `agentTurn`

## Workspace scaffold

The delegate preset seeds a delegate-specific `AGENTS.md` and `IDENTITY.md`
when those files do not already exist in the target workspace. Existing
workspace content is left in place.
