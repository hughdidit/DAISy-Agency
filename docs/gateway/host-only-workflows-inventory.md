---
title: Host-Only Workflows Inventory
summary: "SBX-503 inventory of remaining host-only, break-glass, and stale host-assumption workflows"
read_when:
  - Planning SBX-504 break-glass conversion work
  - Updating sandbox-first defaults for SBX-505
  - Reviewing whether a workflow still needs host execution
status: active
---

# Host-only workflows inventory

This is the SBX-503 inventory of workflows that still depend on host execution,
host-managed control-plane behavior, or explicit break-glass authority. It is an
input to SBX-504 and SBX-505. It is not a conversion plan and does not change
runtime behavior.

## Architecture summary

DAISy is sandbox-first for normal tool-enabled agent work:

- The sandbox execution plane runs normal agent tools inside the declared Docker
  boundary.
- The Gateway remains on the host as the control plane for routing, policy,
  credentials, delivery, diagnostics, cron scheduling, and deployment
  orchestration.
- Break-glass host authority is exceptional. It must be explicit, gated, and
  visible to operators rather than treated as normal sandbox readiness.

Related references:

- [Sandboxing](./sandboxing.md)
- [Sandbox vs Tool Policy vs Elevated](./sandbox-vs-tool-policy-vs-elevated.md)
- [Elevated Mode](../tools/elevated.md)
- [Slash Commands](../tools/slash-commands.md)
- [ACP Agents](../tools/acp-agents.md)
- [Sandbox-First Staging Acceptance Checklist](../deployments/sandbox-first-staging-acceptance.md)

## Classification values

| Classification            | Meaning                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| `clearly-host-only-today` | Current behavior genuinely runs on, or directly controls, the host.    |
| `likely-convertible`      | Current host dependence looks operational or historical, not inherent. |
| `explicit-break-glass`    | Host authority is already deliberately gated and described as special. |
| `stale-host-assumption`   | Evidence shows the flow is sandbox-first or expected-blocked today.    |

## Inventory

| ID        | Workflow                                   | User/operator surface                                                                               | Code or doc evidence                                                                                                                                     | Classification            | Host rationale                                                                                                                           | Need type     | Owner/subsystem        | Recommended next step                                                                                         | SBX-504/SBX-505 input                                                                                                |
| --------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `HWI-001` | Host shell chat command                    | `/bash <command>`, `! <command>`, `!poll`, `!stop`                                                  | `docs/tools/slash-commands.md`; `src/auto-reply/commands-registry.data.ts`                                                                               | `clearly-host-only-today` | The command is documented and registered as host-only shell execution. It requires `commands.bash=true` and elevated allowlists.         | Technical     | Chat commands + exec   | Keep disabled by default; move legitimate operational use into explicit break-glass guidance.                 | SBX-504 should decide whether each retained use becomes audited break-glass or is removed from normal chat guidance. |
| `HWI-002` | Elevated host exec                         | `/elevated on`, `/elevated ask`, `/elevated full`, `tools.elevated`, and `exec` with host authority | `docs/tools/elevated.md`; `docs/gateway/sandbox-vs-tool-policy-vs-elevated.md`; `src/auto-reply/reply/reply-elevated.ts`                                 | `explicit-break-glass`    | Elevated exec intentionally runs on the Gateway host when the requester is sandboxed and all gates pass.                                 | Policy        | Tool policy + exec     | Preserve as break-glass only; ensure audit and docs keep it visibly exceptional.                              | SBX-504 can make this the model for any retained host-only execution path.                                           |
| `HWI-003` | Exec host routing to gateway/node          | `/exec` host selection for sandbox, gateway, or node execution                                      | `docs/refactor/exec-host.md`; `docs/gateway/sandbox-vs-tool-policy-vs-elevated.md`; `src/infra/exec-host.ts`; `src/auto-reply/commands-registry.data.ts` | `likely-convertible`      | The routing model has host and node targets, but safe defaults keep cross-host execution denied unless explicitly enabled.               | Technical     | Exec host routing      | Keep sandbox as the default host; require explicit security/ask policy for gateway or node execution.         | SBX-504 should classify gateway/node targets as break-glass or brokered capabilities, not ambient host mode.         |
| `HWI-004` | ACP harness runtime                        | `/acp spawn ...`; `sessions_spawn runtime="acp"`                                                    | `docs/tools/acp-agents.md`; `src/agents/acp-spawn.ts`; `src/verify/sandbox-first-acceptance.mjs`                                                         | `clearly-host-only-today` | ACP sessions currently run outside the OpenClaw sandbox. Sandboxed requesters are blocked from spawning ACP sessions.                    | Technical     | ACP runtime            | Keep ACP blocked from sandboxed requesters; prefer `runtime="subagent"` when sandbox enforcement is required. | SBX-504 should decide whether ACP remains break-glass host authority or gains a sandboxed backend path.              |
| `HWI-005` | ACP sandbox-required request               | `sessions_spawn runtime="acp" sandbox="require"`                                                    | `docs/tools/acp-agents.md`; `src/agents/acp-spawn.ts`                                                                                                    | `stale-host-assumption`   | The request is not a supported host fallback. It is rejected because ACP cannot satisfy required sandboxing today.                       | Policy        | ACP runtime            | Keep the expected block and error text; do not treat this as a missing host-mode capability.                  | SBX-504 should preserve explicit rejection unless ACP runtime architecture changes.                                  |
| `HWI-006` | Config writes from chat                    | `/config` show, get, set, and unset actions                                                         | `docs/tools/slash-commands.md`; `src/auto-reply/commands-registry.data.ts`                                                                               | `likely-convertible`      | Config writes are Gateway-host control-plane mutations, not normal sandbox tool execution. They are owner-only and disabled by default.  | Policy        | Chat commands + config | Keep owner-only and disabled unless intentionally enabled; document as control-plane mutation.                | SBX-505 should avoid presenting config writes as routine sandbox-agent capability.                                   |
| `HWI-007` | Runtime debug overrides                    | `/debug` show, set, unset, and reset actions                                                        | `docs/tools/slash-commands.md`; `src/auto-reply/commands-registry.data.ts`                                                                               | `likely-convertible`      | Debug overrides mutate Gateway runtime state in memory and are explicitly owner-only and disabled by default.                            | Environmental | Chat commands + config | Keep disabled by default; use only for operator diagnostics, not agent task execution.                        | SBX-504 can classify retained use as operator-only control-plane break-glass if needed.                              |
| `HWI-008` | Gateway restart command                    | `/restart`                                                                                          | `docs/tools/slash-commands.md`; `src/auto-reply/commands-registry.data.ts`                                                                               | `clearly-host-only-today` | Restart controls the Gateway host process rather than a sandboxed session.                                                               | Environmental | Chat commands + ops    | Keep gated and documented as operational control, separate from sandbox readiness.                            | SBX-504 should decide whether restart remains command-accessible or moves behind a stricter operator path.           |
| `HWI-009` | Deployment and maintenance runbooks        | Docker Release, staging deploy, Verify, host VM inspection                                          | `AGENTS.md`; `docs/deployments/sandbox-first-staging-acceptance.md`; `docs/install/docker.md`                                                            | `clearly-host-only-today` | Release, deploy, Verify, Docker, and VM/container inspection operate outside agent sandboxes by design.                                  | Environmental | Release + platform     | Keep as operator workflow; do not convert normal agent sessions into deployment hosts.                        | SBX-505 should describe sandbox-first agent defaults without obscuring that deployment is host/platform work.        |
| `HWI-010` | Direct agent session under sandbox-first   | Direct chat session such as `agent:main:main`                                                       | `docs/deployments/sandbox-first-staging-acceptance.md`; `src/verify/sandbox-first-acceptance.mjs`                                                        | `stale-host-assumption`   | SBX-404 validates direct session runtime truth under `sandbox.mode="all"`; host fallback is not the acceptance path.                     | Policy        | Sandbox acceptance     | Treat direct chat as sandbox-first unless `sandbox explain` proves otherwise.                                 | SBX-505 can use this as evidence that direct sessions should default to sandbox-first.                               |
| `HWI-011` | Group/channel sessions under sandbox-first | Group or channel chat sessions                                                                      | `docs/deployments/sandbox-first-staging-acceptance.md`; `src/verify/sandbox-first-acceptance.mjs`                                                        | `stale-host-assumption`   | Group sessions are validated as non-main operational contexts under sandbox-first acceptance.                                            | Policy        | Sandbox acceptance     | Keep group operation on sandbox-first path; do not add group-specific host fallback guidance.                 | SBX-505 can use this as evidence for sandbox-first group defaults.                                                   |
| `HWI-012` | Native subagent runtime                    | `/subagents ...`; `sessions_spawn runtime="subagent"`                                               | `docs/deployments/sandbox-first-staging-acceptance.md`; `docs/tools/subagents.md`; `src/verify/sandbox-first-acceptance.mjs`                             | `stale-host-assumption`   | SBX-404 validates subagent sandbox inheritance; sandboxed sessions should use subagents rather than ACP for sandbox-enforced delegation. | Policy        | Subagents + sandbox    | Preserve subagent as the sandbox-compatible delegation path.                                                  | SBX-505 can point delegated workflows at subagents instead of ACP where sandboxing is required.                      |
| `HWI-013` | Isolated cron execution                    | `openclaw cron add --session isolated`; Gateway `cron.*` tools                                      | `docs/deployments/sandbox-first-staging-acceptance.md`; `docs/automation/cron-jobs.md`; `src/verify/sandbox-first-acceptance.mjs`                        | `stale-host-assumption`   | The scheduler is Gateway-host-managed, but isolated cron agent execution is verified as sandbox-first.                                   | Environmental | Cron + sandbox         | Distinguish host-managed scheduling from sandboxed run execution.                                             | SBX-505 should keep cron scheduling as Gateway control-plane work while defaulting isolated runs to sandbox-first.   |
| `HWI-014` | Docker bind mounts and host control        | `agents.defaults.sandbox.docker.binds`; browser host control flags                                  | `docs/gateway/sandboxing.md`; `docs/gateway/sandbox-vs-tool-policy-vs-elevated.md`                                                                       | `explicit-break-glass`    | Bind mounts and host-control flags intentionally pierce or widen sandbox boundaries when configured.                                     | Policy        | Sandbox runtime        | Keep explicit and reviewed; prefer read-only binds and deny dangerous host mounts.                            | SBX-504 should treat any writable or sensitive bind as break-glass host authority.                                   |

## Verification checklist

Use this checklist when updating the inventory:

| Requirement                                       | Evidence source                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Host shell chat commands are listed               | `docs/tools/slash-commands.md`; `src/auto-reply/commands-registry.data.ts`                                   |
| Elevated and exec host authority are listed       | `docs/tools/elevated.md`; `docs/refactor/exec-host.md`; `docs/gateway/sandbox-vs-tool-policy-vs-elevated.md` |
| ACP host runtime and expected sandbox block exist | `docs/tools/acp-agents.md`; `src/agents/acp-spawn.ts`; SBX-404 `host-only-blocks` Verify scenario            |
| Maintenance workflows are separated from agents   | `AGENTS.md`; deployment and Docker docs                                                                      |
| Stale host assumptions are called out             | SBX-401/SBX-404 acceptance mappings in `docs/deployments/sandbox-first-staging-acceptance.md`                |

## Follow-up use

- SBX-504 should start with `clearly-host-only-today` and
  `explicit-break-glass` rows and decide whether each retained case is
  auditable break-glass, brokered, or removable.
- SBX-505 should start with `stale-host-assumption` rows and make sandbox-first
  defaults natural for those workflows.
- Do not add a new host-only workflow without adding an inventory row, owner,
  rationale, and recommended next step.
