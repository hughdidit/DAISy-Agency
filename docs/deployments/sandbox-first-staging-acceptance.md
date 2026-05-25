# Sandbox-First Staging Acceptance Checklist

This runbook is the manual acceptance baseline for `sandbox.mode="all"` on
staging. Run it after a successful staging deploy and a green Verify workflow.
It does not replace Deploy or Verify. It confirms that the sandbox-first path is
credible for day-to-day operator use, with concrete evidence captured for each
check.

Use this runbook as written:

- run only against staging
- do not disable sandboxing or switch to host-only shortcuts to make a check
  pass
- do not mutate config, container images, or workflow settings during the
  checklist
- if a step depends on an integration that is intentionally disabled, record
  `N/A` with evidence instead of silently skipping it

Related docs:

- [Staging VM Setup Guide](./staging-setup.md)
- [Deployments](../deployments.md)
- [Host-Only Workflows Inventory](../gateway/host-only-workflows-inventory.md)
- [Sandbox CLI](../cli/sandbox.md)
- [Doctor](../cli/doctor.md)
- [Skills](../cli/skills.md)
- [Sub-Agents](../tools/subagents.md)
- [Cron Jobs](../automation/cron-jobs.md)

## Entry Criteria

Do not start SBX-401 until all of the following are true:

- the staging deploy completed successfully
- the corresponding Verify workflow completed successfully
- the deployed gateway container is healthy
- you have one staging-only allowlisted chat target available for a live agent
  check
- you know which deployed config file staging is using

Green Verify is required, but it is not sufficient evidence for sandbox-first
acceptance. SBX-401 is the manual operator closeout step that confirms the live
chat, readonly, subagent, and cron paths still behave truthfully under
`sandbox.mode="all"`.

## Evidence Kit

Use one evidence directory per run so later automation can map back to the same
artifacts.

```bash
export GATEWAY_CONTAINER="${GATEWAY_CONTAINER:-openclaw-gateway}"
export CONFIG_FILE="${CONFIG_FILE:-openclaw.json}"
export EVIDENCE_DIR="${EVIDENCE_DIR:-/tmp/sbx-401-$(date -u +%Y%m%dT%H%M%SZ)}"

mkdir -p "$EVIDENCE_DIR"
date -u +"%Y-%m-%dT%H:%M:%SZ" | tee "$EVIDENCE_DIR/timestamp.txt"

printf '%s\n' '<release_run_id>' | tee "$EVIDENCE_DIR/release_run_id.txt"
printf '%s\n' '<dry_run_deploy_run_id-or-n/a>' \
  | tee "$EVIDENCE_DIR/dry_run_deploy_run_id.txt"
printf '%s\n' '<real_deploy_run_id>' | tee "$EVIDENCE_DIR/real_deploy_run_id.txt"
printf '%s\n' '<verify_run_id>' | tee "$EVIDENCE_DIR/verify_run_id.txt"
printf '%s\n' '<deployed_ref-or-image_tag>' | tee "$EVIDENCE_DIR/deployed_ref.txt"
printf '%s\n' "$GATEWAY_CONTAINER" | tee "$EVIDENCE_DIR/gateway_container.txt"
printf '%s\n' "$CONFIG_FILE" | tee "$EVIDENCE_DIR/config_file.txt"
printf '%s\n' '<chat_target>' | tee "$EVIDENCE_DIR/chat_target.txt"

sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' \
  | tee "$EVIDENCE_DIR/docker-ps.txt"
```

Record these items alongside the command outputs:

- release run id
- dry-run deploy run id, if one was used in the rollout
- real deploy run id
- verify run id
- deployed ref or image tag
- timestamp in UTC
- gateway container name
- deployed config filename
- live chat target used for direct-agent, subagent, and cron delivery checks

## Checklist

### SBX-401-01 Entry Criteria And Evidence Capture

- Objective: prove the acceptance run is tied to a specific staging rollout and
  live container.
- Preconditions: successful staging deploy, successful Verify, SSH access to the
  staging VM.
- Exact commands:

```bash
sudo test -f "/opt/DAISy/config/$CONFIG_FILE"
sudo docker inspect "$GATEWAY_CONTAINER" \
  --format '{{.Name}} {{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}' \
  | tee "$EVIDENCE_DIR/container-health.txt"
```

- Expected result: the config file exists, the gateway container is running, and
  health is `healthy`.
- Evidence to capture: `container-health.txt`, `docker-ps.txt`, run ids, and
  timestamp files from the evidence kit.
- Failure classification / escalation:
  - `deployment-baseline-gap`: deploy or Verify did not actually finish the
    rollout; stop and fix that first.
  - `container-health-gap`: container is not healthy; use the normal deploy +
    Verify incident path before running SBX-401.

### SBX-401-02 Runtime / Profile Sanity

- Objective: confirm the deployed runtime still reports sandbox-first truth
  through the shared capability-aware CLI surfaces.
- Preconditions: `SBX-401-01` passed.
- Exact commands:

```bash
sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js status --json | jq .' \
  | tee "$EVIDENCE_DIR/status.json"

sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js sandbox explain --json | jq .' \
  | tee "$EVIDENCE_DIR/sandbox-explain.json"

sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js doctor --non-interactive' \
  | tee "$EVIDENCE_DIR/doctor.txt"
```

- Expected result:
  - `sandbox explain` shows sandbox mode enabled and identifies the effective
    runtime profile
  - `status` and `sandbox explain` both surface capability-class data rather
    than a single flat ready flag
  - `doctor` does not recommend disabling sandboxing as the normal fix path
- Evidence to capture: `status.json`, `sandbox-explain.json`, `doctor.txt`.
- Failure classification / escalation:
  - `runtime-profile-mismatch`: declared profile does not match the deployed
    image/runtime
  - `capability-consistency-gap`: status and sandbox explain disagree on
    readiness or capability class
  - `doctor-usefulness-gap`: doctor falls back to existence-only guidance or
    misses an obvious profile/projection problem

### SBX-401-03 Readonly Diagnostics Truthfulness

- Objective: prove the readonly sandbox diagnostic path still works as a real
  sandbox-aware surface, not a host-side fallback.
- Preconditions: `SBX-401-02` passed.
- Exact commands:

```bash
sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs status' \
  | tee "$EVIDENCE_DIR/readonly-status.txt"

sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs sandbox explain' \
  | tee "$EVIDENCE_DIR/readonly-sandbox-explain.txt"

sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs skills check' \
  | tee "$EVIDENCE_DIR/readonly-skills-check.txt"
```

- Expected result:
  - readonly commands succeed without host-only fallback behavior
  - failures, if any, name projection/runtime gaps explicitly
  - readonly output does not report container-loopback false negatives as if the
    gateway were down
- Evidence to capture: `readonly-status.txt`,
  `readonly-sandbox-explain.txt`, `readonly-skills-check.txt`.
- Failure classification / escalation:
  - `projection-defect`: readonly path reports missing projected assets or
    boundary-safe paths
  - `readonly-runtime-gap`: readonly runtime or launcher is missing from the
    deployed image
  - `truthfulness-gap`: readonly output claims readiness that does not match the
    actual sandbox boundary

### SBX-401-04 Skill And Tool Readiness Under Sandbox-First Mode

- Objective: capture the sandbox-aware skill/tool readiness picture that an
  operator or agent would actually see.
- Preconditions: `SBX-401-02` passed.
- Exact commands:

```bash
sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js skills check' \
  | tee "$EVIDENCE_DIR/skills-check.txt"

sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js skills info openclaw-readonly' \
  | tee "$EVIDENCE_DIR/skills-info-openclaw-readonly.txt"
```

- Expected result:
  - unsupported or blocked capabilities are called out explicitly instead of
    looking silently ready
  - `openclaw-readonly` is described as the sandbox-safe readonly diagnostic
    contract
- Evidence to capture: `skills-check.txt`,
  `skills-info-openclaw-readonly.txt`.
- Failure classification / escalation:
  - `readiness-reporting-gap`: skill/tool output hides why a capability is
    blocked or unsupported
  - `sandbox-contract-gap`: `openclaw-readonly` is missing or described in a
    way that would encourage host-side bypasses

### SBX-401-05 Conditional Plugin Or Delegated Capability Check

- Objective: validate one staging-relevant integration or delegated capability
  path and record why the check was selected.
- Preconditions: `SBX-401-02` passed.
- Exact discovery command:

```bash
sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js plugins list' \
  | tee "$EVIDENCE_DIR/plugins-list.txt"
```

- Branch A: `gws-toolkit-phase1` is enabled.
  - Additional preconditions: one known delegated binding subject from the
    staging config, for example `subagent:main`, `subagent:ops`, or another
    configured non-`agent:main` subject.
  - Exact commands:

```bash
sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node scripts/gws/run-auth-health.mjs --subject agent:main' \
  | tee "$EVIDENCE_DIR/gws-auth-health-agent-main.json"

sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node scripts/gws/run-auth-health.mjs --subject <delegated-subject>' \
  | tee "$EVIDENCE_DIR/gws-auth-health-delegated.json"
```

- Expected result: both routes resolve cleanly, stay on the intended
  credential source, and do not report `token_error`.
- Evidence to capture: `plugins-list.txt`,
  `gws-auth-health-agent-main.json`,
  `gws-auth-health-delegated.json`.
- Failure classification / escalation:
  - `secret-or-route-gap`: missing or broken staging credentials or route
    bindings
  - `delegated-capability-gap`: delegated subject health differs from
    `agent:main`

- Branch B: `gws-toolkit-phase1` is not enabled and the active memory slot is
  `memory-mongodb`.
  - Exact command:

```bash
sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js memory status --deep --agent main' \
  | tee "$EVIDENCE_DIR/memory-status-main.txt"
```

- Expected result: memory status completes and reports the active plugin path
  without startup or readiness errors.
- Evidence to capture: `plugins-list.txt`, `memory-status-main.txt`.
- Failure classification / escalation:
  - `memory-plugin-gap`: memory plugin startup or readiness is unhealthy
  - `integration-config-gap`: required memory secret or dependency is missing

- Branch C: neither `gws-toolkit-phase1` nor `memory-mongodb` is active for
  this staging environment.
  - Action: mark this item `N/A`.
  - Evidence to capture: `plugins-list.txt` plus a note in the closeout summary
    stating which staging-relevant plugin/delegated capability path is absent.

### SBX-401-06 Direct Agent Session Behavior Under `sandbox.mode="all"`

- Objective: confirm a real staging chat session behaves like a sandboxed agent
  session and gives runtime-aware answers instead of host-mode assumptions.
- Preconditions:
  - `SBX-401-02` passed
  - one staging-only allowlisted chat target is available
  - Discord DM with the staging bot is the primary example because the session
    key is stable as `agent:main:main`
- Exact chat action:

> Use the sandbox-safe readonly diagnostic path only. Report the current sandbox
> mode, resolved runtime profile, and whether `openclaw-readonly` is supported
> in this session. Do not mutate config, files, plugins, or scheduled jobs.

- Exact corroboration command for the Discord DM path:

```bash
sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js sandbox explain --session agent:main:main --json | jq .' \
  | tee "$EVIDENCE_DIR/direct-session-sandbox-explain.json"
```

- Expected result:
  - the live agent reply is consistent with the sandbox-first runtime
  - the corroboration output shows sandbox mode enabled for the same session
  - the response does not recommend host-only shortcuts as the normal path
- Evidence to capture:
  - screenshot or transcript of the chat reply
  - `direct-session-sandbox-explain.json`
- Failure classification / escalation:
  - `session-routing-gap`: live chat is not landing on the expected session
  - `unsandboxed-session-gap`: the routed session is not actually sandboxed
  - `agent-facing-messaging-gap`: the response hides or misstates sandbox truth

If you use a guild channel instead of a DM, replace `agent:main:main` with the
actual routed session key for that staging channel before running the
corroboration command.

### SBX-401-07 Subagent Path

- Objective: prove that a real subagent run still works under sandbox-first
  constraints and reports back to the requester cleanly.
- Preconditions:
  - `SBX-401-06` passed
  - the chat target supports `/subagents`
- Exact chat / UI actions:
  - send:

> /subagents spawn main Use only sandbox-safe readonly diagnostics to report
> sandbox mode, runtime profile, and whether openclaw-readonly is supported. Do
> not mutate anything.

- after the run id is returned, send:

> /subagents info `<run-id-or-#>`

- Expected result:
  - spawn returns a run id immediately
  - a completion message is announced back to the requester
  - `/subagents info` shows a coherent run state, timestamps, and transcript
    metadata
- Evidence to capture:
  - screenshot of the spawn acknowledgement
  - screenshot of the completion announcement
  - screenshot of `/subagents info`
- Failure classification / escalation:
  - `sandbox-inheritance-gap`: subagent fails because sandbox inheritance or
    tool policy is wrong
  - `routing-or-delivery-gap`: run completes but the announcement does not land
    in the requester chat
  - `subagent-policy-gap`: allowed tools or agent targeting are wrong for the
    staging policy

### SBX-401-08 Cron-Oriented Path

- Objective: prove that an isolated cron run can execute a sandbox-safe task and
  deliver the result back to a staging chat target.
- Preconditions:
  - `SBX-401-06` passed
  - the gateway is running continuously
  - you have a staging-only delivery target, with Discord `channel:<id>` used as
    the primary example
- Exact command to create the one-shot job inside the deployed container:

```bash
sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js cron add \
    --name "SBX-401 sandbox smoke" \
    --at "<future-iso-timestamp-utc>" \
    --session isolated \
    --message "Report the current sandbox mode, runtime profile, and whether openclaw-readonly is supported. Do not mutate anything." \
    --announce \
    --channel discord \
    --to "channel:<staging-channel-id>" \
    --delete-after-run' \
  | tee "$EVIDENCE_DIR/cron-add.txt"
```

- Exact follow-up commands:

```bash
sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js cron run <job-id>' \
  | tee "$EVIDENCE_DIR/cron-run.txt"

sudo docker exec "$GATEWAY_CONTAINER" bash -lc \
  'cd /app && node dist/index.js cron runs --id <job-id> --limit 20' \
  | tee "$EVIDENCE_DIR/cron-runs.txt"
```

- Expected result:
  - the add command returns a job id
  - the forced run finishes without sandbox/runtime failure
  - the run history shows a successful isolated execution
  - the delivery target receives the announced result
- Evidence to capture:
  - `cron-add.txt`, `cron-run.txt`, `cron-runs.txt`
  - screenshot of the delivered chat message
- Failure classification / escalation:
  - `scheduler-gap`: cron job cannot be created, run, or stored
  - `sandbox-runtime-gap`: job runs but fails because the isolated runtime is not
    usable under sandbox-first mode
  - `delivery-gap`: cron run succeeds but the announced result does not reach the
    staging target

If staging is not using Discord for operator delivery, replace `--channel` and
`--to` with the equivalent allowlisted target for that environment.

### SBX-401-09 Closeout Summary

- Objective: produce a pass/fail record that can be attached to the rollout.
- Preconditions: all prior applicable items completed.
- Exact action: fill in the following matrix before closing the staging rollout.

| Checklist ID | Status (`pass` / `fail` / `n/a`) | Evidence | Failure class / note |
| ------------ | -------------------------------- | -------- | -------------------- |
| `SBX-401-01` |                                  |          |                      |
| `SBX-401-02` |                                  |          |                      |
| `SBX-401-03` |                                  |          |                      |
| `SBX-401-04` |                                  |          |                      |
| `SBX-401-05` |                                  |          |                      |
| `SBX-401-06` |                                  |          |                      |
| `SBX-401-07` |                                  |          |                      |
| `SBX-401-08` |                                  |          |                      |

- Expected result: every applicable item is recorded with evidence and any
  failure is classified into one of these buckets:
  - `runtime-profile-mismatch`: deployed container health, effective runtime
    profile, or sandbox-capable runtime surfaces disagree with the expected
    staging state
  - `policy-block`: tool policy, subagent policy, or operator-facing messaging
    blocks the intended sandbox-safe path
  - `projection-defect`: readonly projection, boundary-safe assets, or
    diagnostics truthfulness do not match the real sandbox boundary
  - `secret-or-integration-gap`: required secrets, route bindings, delegated
    capabilities, or plugin configuration are missing or unhealthy
  - `routing-or-delivery-gap`: chat/session routing, scheduler behavior, or
    result delivery does not reach the intended staging target
  - `unsupported-host-only-behavior`: the only apparent success path depends on
    an unsandboxed session or host-only fallback
- Canonical mapping for the exact step-level failure classes used above:

| Step-level failure class     | Canonical closeout bucket        |
| ---------------------------- | -------------------------------- |
| `deployment-baseline-gap`    | `runtime-profile-mismatch`       |
| `container-health-gap`       | `runtime-profile-mismatch`       |
| `runtime-profile-mismatch`   | `runtime-profile-mismatch`       |
| `capability-consistency-gap` | `runtime-profile-mismatch`       |
| `doctor-usefulness-gap`      | `runtime-profile-mismatch`       |
| `projection-defect`          | `projection-defect`              |
| `readonly-runtime-gap`       | `runtime-profile-mismatch`       |
| `truthfulness-gap`           | `projection-defect`              |
| `readiness-reporting-gap`    | `policy-block`                   |
| `sandbox-contract-gap`       | `unsupported-host-only-behavior` |
| `secret-or-route-gap`        | `secret-or-integration-gap`      |
| `delegated-capability-gap`   | `secret-or-integration-gap`      |
| `memory-plugin-gap`          | `secret-or-integration-gap`      |
| `integration-config-gap`     | `secret-or-integration-gap`      |
| `session-routing-gap`        | `routing-or-delivery-gap`        |
| `unsandboxed-session-gap`    | `unsupported-host-only-behavior` |
| `agent-facing-messaging-gap` | `policy-block`                   |
| `sandbox-inheritance-gap`    | `policy-block`                   |
| `routing-or-delivery-gap`    | `routing-or-delivery-gap`        |
| `subagent-policy-gap`        | `policy-block`                   |
| `scheduler-gap`              | `routing-or-delivery-gap`        |
| `sandbox-runtime-gap`        | `runtime-profile-mismatch`       |
| `delivery-gap`               | `routing-or-delivery-gap`        |

- Closeout recording rule: keep the exact step-level failure class in the
  matrix, then use the table above to roll it into the required canonical
  closeout bucket for escalation and reporting.
- Evidence to capture: the completed matrix plus the evidence directory path.
- Failure classification / escalation:
  - if any applicable item fails, do not mark sandbox-first staging acceptance
    complete
  - attach the completed matrix and the relevant evidence files to the rollout,
    then hand off to the owning runtime / diagnostics / deployment thread

## SBX-402 Verify Mapping

SBX-402 adds a selective automation layer to Verify. Verify now publishes a
`sandbox-first-acceptance-summary.json` artifact plus per-scenario evidence
files under the sandbox-first acceptance artifact directory. Those artifacts are
evidence for the automated subset below; they do not replace the remaining
manual checklist items.

| SBX-401 item | Verify scenario id                  | Automated scope                                                                                                                                                                                                    | Manual remainder                                                                                                                   |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `SBX-401-02` | `sbx-401-02-runtime-profile-sanity` | `status --json`, `sandbox explain --json`, and `doctor --non-interactive` are checked automatically in staging Verify.                                                                                             | None, unless the rollout needs deeper operator investigation after a failure.                                                      |
| `SBX-401-03` | `sbx-401-03-readonly-diagnostics`   | Readonly `status`, `sandbox explain`, and `skills check` truthfulness are checked automatically.                                                                                                                   | None for the baseline readonly smoke.                                                                                              |
| `SBX-401-04` | `sbx-401-04-readiness-snapshot`     | `skills check` and `skills info openclaw-readonly` are checked automatically.                                                                                                                                      | None for the readiness snapshot baseline.                                                                                          |
| `SBX-401-05` | `sbx-401-05-integration-path`       | Verify automatically chooses the highest-value configured branch: `gws-toolkit-phase1` auth-health if present, otherwise `memory-mongodb` deep status if that slot is active, otherwise explicit skip with reason. | Any staging-only integration not selected by the active branch, plus deeper operator evidence when a configured integration fails. |
| `SBX-401-06` | not automated                       | Not automated in Verify.                                                                                                                                                                                           | Full item remains manual: live direct-agent chat reply plus session corroboration.                                                 |
| `SBX-401-07` | not automated                       | Not automated in Verify.                                                                                                                                                                                           | Full item remains manual: requester-facing subagent spawn, completion announcement, and `/subagents info`.                         |
| `SBX-401-08` | `sbx-401-08-isolated-cron`          | Verify creates, force-runs, inspects, and cleans up an isolated cron job plus its per-run and base cron session records with `--no-deliver`.                                                                       | Delivery-target confirmation remains manual.                                                                                       |

When Verify reports a failure for one of the scenario ids above, keep the
scenario id and step-level failure class in the rollout notes so it still maps
cleanly back to the SBX-401 checklist language.

## SBX-404 Operational Validation Mapping

SBX-404 extends the same Verify artifact contract with operational scenarios for
direct, grouped, delegated, recurring, and expected-blocked sandbox-first paths.
These scenarios are additive to the SBX-401/SBX-402 baseline and continue to
write into `sandbox-first-acceptance-summary.json`.

| SBX-404 item | Verify scenario id                             | Expected result  | Automated scope                                                                                                                     | Manual remainder                                                                           |
| ------------ | ---------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `SBX-404-01` | `sbx-404-01-direct-session-runtime`            | expected pass    | `sandbox explain --session agent:main:main --json` reports `sandbox.mode=all`.                                                      | Live direct-agent reply/transcript showing the same runtime truth.                         |
| `SBX-404-02` | `sbx-404-02-group-session-runtime`             | expected pass    | Representative group/channel session reports sandboxed runtime and channel data.                                                    | Live group/channel activation and transcript evidence.                                     |
| `SBX-404-03` | `sbx-404-03-subagent-sandbox-inheritance`      | expected pass    | Representative subagent session key reports sandboxed child runtime metadata.                                                       | Requester-facing subagent spawn acknowledgement, completion announcement, and info output. |
| `SBX-404-04` | `sbx-404-04-cron-isolation-and-subagent-model` | expected pass    | Verify creates and force-runs an isolated cron job, checks per-run key data, then deletes the probe's cron job and session records. | Delivery-target screenshot when announce delivery is part of the rollout.                  |
| `SBX-404-05` | `sbx-404-05-host-only-blocks`                  | expected blocked | ACP host-only spawn from a sandboxed requester returns the sandbox policy block.                                                    | None for the ACP policy block baseline.                                                    |

Use `SBX404_DIRECT_SESSION_KEY`, `SBX404_GROUP_SESSION_KEY`,
`SBX404_SUBAGENT_SESSION_KEY`, and `SBX404_CRON_MODEL` only when the staging
environment needs a specific representative session or model override. Do not
set these to make a failing sandbox-first path pass through host-mode fallback.

## Pass / Fail Rule

Mark SBX-401 complete only when:

- Verify is green
- every applicable checklist item above is `pass`
- any intentionally inapplicable integration check is recorded as `n/a` with an
  explicit reason
- the evidence directory is preserved long enough to support SBX-402 automation
  work

SBX-401 still includes manual closeout steps. Use this runbook to gather
concrete staging evidence for the remaining live chat, subagent, and
delivery-target checks without widening scope into unrelated runtime or
deployment changes during acceptance.
