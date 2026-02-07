---
summary: "Cron jobs + wakeups for the Gateway scheduler"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
---
# Cron jobs (Gateway scheduler)

> **Cron vs Heartbeat?** See [Cron vs Heartbeat](/automation/cron-vs-heartbeat) for guidance on when to use each.

Cron is the Gateway’s built-in scheduler. It persists jobs, wakes the agent at
the right time, and can optionally deliver output back to a chat.

If you want *“run this every morning”* or *“poke the agent in 20 minutes”*,
cron is the mechanism.

## TL;DR
- Cron runs **inside the Gateway** (not inside the model).
- Jobs persist under `~/.clawdbot/cron/` so restarts don’t lose schedules.
- Two execution styles:
  - **Main session**: enqueue a system event, then run on the next heartbeat.
  - **Isolated**: run a dedicated agent turn in `cron:<jobId>`, optionally deliver output.
- Wakeups are first-class: a job can request “wake now” vs “next heartbeat”.

<<<<<<< HEAD
=======
## Quick start (actionable)

Create a one-shot reminder, verify it exists, and run it immediately:

```bash
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

openclaw cron list
openclaw cron run <job-id>
openclaw cron runs --id <job-id>
```

Schedule a recurring isolated job with delivery:

```bash
openclaw cron add \
  --name "Morning brief" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize overnight updates." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

## Tool-call equivalents (Gateway cron tool)

For the canonical JSON shapes and examples, see [JSON schema for tool calls](/automation/cron-jobs#json-schema-for-tool-calls).

## Where cron jobs are stored

Cron jobs are persisted on the Gateway host at `~/.openclaw/cron/jobs.json` by default.
The Gateway loads the file into memory and writes it back on changes, so manual edits
are only safe when the Gateway is stopped. Prefer `openclaw cron add/edit` or the cron
tool call API for changes.

>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
## Beginner-friendly overview
Think of a cron job as: **when** to run + **what** to do.

1) **Choose a schedule**
   - One-shot reminder → `schedule.kind = "at"` (CLI: `--at`)
   - Repeating job → `schedule.kind = "every"` or `schedule.kind = "cron"`
   - If your ISO timestamp omits a timezone, it is treated as **UTC**.

2) **Choose where it runs**
   - `sessionTarget: "main"` → run during the next heartbeat with main context.
   - `sessionTarget: "isolated"` → run a dedicated agent turn in `cron:<jobId>`.

3) **Choose the payload**
   - Main session → `payload.kind = "systemEvent"`
   - Isolated session → `payload.kind = "agentTurn"`

Optional: `deleteAfterRun: true` removes successful one-shot jobs from the store.

## Concepts

### Jobs
A cron job is a stored record with:
- a **schedule** (when it should run),
- a **payload** (what it should do),
- optional **delivery** (where output should be sent).
- optional **agent binding** (`agentId`): run the job under a specific agent; if
  missing or unknown, the gateway falls back to the default agent.

Jobs are identified by a stable `jobId` (used by CLI/Gateway APIs).
In agent tool calls, `jobId` is canonical; legacy `id` is accepted for compatibility.
Jobs can optionally auto-delete after a successful one-shot run via `deleteAfterRun: true`.

### Schedules
Cron supports three schedule kinds:
- `at`: one-shot timestamp (ms since epoch). Gateway accepts ISO 8601 and coerces to UTC.
- `every`: fixed interval (ms).
- `cron`: 5-field cron expression with optional IANA timezone.

Cron expressions use `croner`. If a timezone is omitted, the Gateway host’s
local timezone is used.

### Main vs isolated execution

#### Main session jobs (system events)
Main jobs enqueue a system event and optionally wake the heartbeat runner.
They must use `payload.kind = "systemEvent"`.

- `wakeMode: "now"` (default): event triggers an immediate heartbeat run.
- `wakeMode: "next-heartbeat"`: event waits for the next scheduled heartbeat.

This is the best fit when you want the normal heartbeat prompt + main-session context.
See [Heartbeat](/gateway/heartbeat).

#### Isolated jobs (dedicated cron sessions)
Isolated jobs run a dedicated agent turn in session `cron:<jobId>`.

Key behaviors:
- Prompt is prefixed with `[cron:<jobId> <job name>]` for traceability.
- Each run starts a **fresh session id** (no prior conversation carry-over).
<<<<<<< HEAD
- A summary is posted to the main session (prefix `Cron`, configurable).
- `wakeMode: "now"` triggers an immediate heartbeat after posting the summary.
- If `payload.deliver: true`, output is delivered to a channel; otherwise it stays internal.
=======
- Default behavior: if `delivery` is omitted, isolated jobs announce a summary (`delivery.mode = "announce"`).
- `delivery.mode` (isolated-only) chooses what happens:
  - `announce`: deliver a summary to the target channel and post a brief summary to the main session.
  - `none`: internal only (no delivery, no main-session summary).
- `wakeMode` controls when the main-session summary posts:
  - `now`: immediate heartbeat.
  - `next-heartbeat`: waits for the next scheduled heartbeat.
>>>>>>> 6341819d7 (fix: cron announce delivery path (#8540) (thanks @tyler6204))

Use isolated jobs for noisy, frequent, or "background chores" that shouldn't spam
your main chat history.

### Payload shapes (what runs)
Two payload kinds are supported:
- `systemEvent`: main-session only, routed through the heartbeat prompt.
- `agentTurn`: isolated-session only, runs a dedicated agent turn.

Common `agentTurn` fields:
- `message`: required text prompt.
- `model` / `thinking`: optional overrides (see below).
- `timeoutSeconds`: optional timeout override.
- `deliver`: `true` to send output to a channel target.
- `channel`: `last` or a specific channel.
- `to`: channel-specific target (phone/chat/channel id).
- `bestEffortDeliver`: avoid failing the job if delivery fails.

<<<<<<< HEAD
Isolation options (only for `session=isolated`):
- `postToMainPrefix` (CLI: `--post-prefix`): prefix for the system event in main.
- `postToMainMode`: `summary` (default) or `full`.
- `postToMainMaxChars`: max chars when `postToMainMode=full` (default 8000).
=======
Delivery config (isolated jobs only):

- `delivery.mode`: `none` | `announce`.
- `delivery.channel`: `last` or a specific channel.
- `delivery.to`: channel-specific target (phone/chat/channel id).
- `delivery.bestEffort`: avoid failing the job if announce delivery fails.

Announce delivery suppresses messaging tool sends for the run; use `delivery.channel`/`delivery.to`
to target the chat instead. When `delivery.mode = "none"`, no summary is posted to the main session.

If `delivery` is omitted for isolated jobs, OpenClaw defaults to `announce`.
>>>>>>> 6341819d7 (fix: cron announce delivery path (#8540) (thanks @tyler6204))

#### Announce delivery flow

When `delivery.mode = "announce"`, cron delivers directly via the outbound channel adapters.
The main agent is not spun up to craft or forward the message.

Behavior details:

- Content: delivery uses the isolated run's outbound payloads (text/media) with normal chunking and
  channel formatting.
- Heartbeat-only responses (`HEARTBEAT_OK` with no real content) are not delivered.
- If the isolated run already sent a message to the same target via the message tool, delivery is
  skipped to avoid duplicates.
- Missing or invalid delivery targets fail the job unless `delivery.bestEffort = true`.
- A short summary is posted to the main session only when `delivery.mode = "announce"`.
- The main-session summary respects `wakeMode`: `now` triggers an immediate heartbeat and
  `next-heartbeat` waits for the next scheduled heartbeat.

### Model and thinking overrides
Isolated jobs (`agentTurn`) can override the model and thinking level:
- `model`: Provider/model string (e.g., `anthropic/claude-sonnet-4-20250514`) or alias (e.g., `opus`)
- `thinking`: Thinking level (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`; GPT-5.2 + Codex models only)

Note: You can set `model` on main-session jobs too, but it changes the shared main
session model. We recommend model overrides only for isolated jobs to avoid
unexpected context shifts.

Resolution priority:
1. Job payload override (highest)
2. Hook-specific defaults (e.g., `hooks.gmail.model`)
3. Agent config default

### Delivery (channel + target)
Isolated jobs can deliver output to a channel. The job payload can specify:
- `channel`: `whatsapp` / `telegram` / `discord` / `slack` / `mattermost` (plugin) / `signal` / `imessage` / `last`
- `to`: channel-specific recipient target

If `channel` or `to` is omitted, cron can fall back to the main session’s “last route”
(the last place the agent replied).

<<<<<<< HEAD
Delivery notes:
- If `to` is set, cron auto-delivers the agent’s final output even if `deliver` is omitted.
- Use `deliver: true` when you want last-route delivery without an explicit `to`.
- Use `deliver: false` to keep output internal even if a `to` is present.
=======
- `delivery.mode`: `announce` (deliver a summary) or `none`.
- `delivery.channel`: `whatsapp` / `telegram` / `discord` / `slack` / `mattermost` (plugin) / `signal` / `imessage` / `last`.
- `delivery.to`: channel-specific recipient target.

Delivery config is only valid for isolated jobs (`sessionTarget: "isolated"`).

If `delivery.channel` or `delivery.to` is omitted, cron can fall back to the main session’s
“last route” (the last place the agent replied).
>>>>>>> 6341819d7 (fix: cron announce delivery path (#8540) (thanks @tyler6204))

Target format reminders:
- Slack/Discord/Mattermost (plugin) targets should use explicit prefixes (e.g. `channel:<id>`, `user:<id>`) to avoid ambiguity.
- Telegram topics should use the `:topic:` form (see below).

#### Telegram delivery targets (topics / forum threads)
Telegram supports forum topics via `message_thread_id`. For cron delivery, you can encode
the topic/thread into the `to` field:

- `-1001234567890` (chat id only)
- `-1001234567890:topic:123` (preferred: explicit topic marker)
- `-1001234567890:123` (shorthand: numeric suffix)

Prefixed targets like `telegram:...` / `telegram:group:...` are also accepted:
- `telegram:group:-1001234567890:topic:123`

<<<<<<< HEAD
=======
## JSON schema for tool calls

Use these shapes when calling Gateway `cron.*` tools directly (agent tool calls or RPC).
CLI flags accept human durations like `20m`, but tool calls should use an ISO 8601 string
for `schedule.at` and milliseconds for `schedule.everyMs`.

### cron.add params

One-shot, main session job (system event):

```json
{
  "name": "Reminder",
  "schedule": { "kind": "at", "at": "2026-02-01T16:00:00Z" },
  "sessionTarget": "main",
  "wakeMode": "now",
  "payload": { "kind": "systemEvent", "text": "Reminder text" },
  "deleteAfterRun": true
}
```

Recurring, isolated job with delivery:

```json
{
  "name": "Morning brief",
  "schedule": { "kind": "cron", "expr": "0 7 * * *", "tz": "America/Los_Angeles" },
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize overnight updates."
  },
  "delivery": {
    "mode": "announce",
    "channel": "slack",
    "to": "channel:C1234567890",
    "bestEffort": true
  }
}
```

Notes:

- `schedule.kind`: `at` (`at`), `every` (`everyMs`), or `cron` (`expr`, optional `tz`).
- `schedule.at` accepts ISO 8601 (timezone optional; treated as UTC when omitted).
- `everyMs` is milliseconds.
- `sessionTarget` must be `"main"` or `"isolated"` and must match `payload.kind`.
- Optional fields: `agentId`, `description`, `enabled`, `deleteAfterRun` (defaults to true for `at`),
  `delivery`.
- `wakeMode` defaults to `"now"` when omitted.

### cron.update params

```json
{
  "jobId": "job-123",
  "patch": {
    "enabled": false,
    "schedule": { "kind": "every", "everyMs": 3600000 }
  }
}
```

Notes:

- `jobId` is canonical; `id` is accepted for compatibility.
- Use `agentId: null` in the patch to clear an agent binding.

### cron.run and cron.remove params

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
## Storage & history
- Job store: `~/.clawdbot/cron/jobs.json` (Gateway-managed JSON).
- Run history: `~/.clawdbot/cron/runs/<jobId>.jsonl` (JSONL, auto-pruned).
- Override store path: `cron.store` in config.

## Configuration

```json5
{
  cron: {
    enabled: true, // default true
    store: "~/.clawdbot/cron/jobs.json",
    maxConcurrentRuns: 1 // default 1
  }
}
```

Disable cron entirely:
- `cron.enabled: false` (config)
- `CLAWDBOT_SKIP_CRON=1` (env)

## CLI quickstart

One-shot reminder (UTC ISO, auto-delete after success):
```bash
moltbot cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

One-shot reminder (main session, wake immediately):
```bash
moltbot cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

Recurring isolated job (deliver to WhatsApp):
```bash
moltbot cron add \
  --name "Morning status" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize inbox + calendar for today." \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"
```

Recurring isolated job (deliver to a Telegram topic):
```bash
moltbot cron add \
  --name "Nightly summary (topic)" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize today; send to the nightly topic." \
  --deliver \
  --channel telegram \
  --to "-1001234567890:topic:123"
```

Isolated job with model and thinking override:
```bash
moltbot cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"

Agent selection (multi-agent setups):
```bash
# Pin a job to agent "ops" (falls back to default if that agent is missing)
moltbot cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# Switch or clear the agent on an existing job
moltbot cron edit <jobId> --agent ops
moltbot cron edit <jobId> --clear-agent
```
```

<<<<<<< HEAD
Manual run (debug):
```bash
moltbot cron run <jobId> --force
=======
Manual run (force is the default, use `--due` to only run when due):

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
```

Edit an existing job (patch fields):
```bash
moltbot cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

Run history:
```bash
moltbot cron runs --id <jobId> --limit 50
```

Immediate system event without creating a job:
```bash
moltbot system event --mode now --text "Next heartbeat: check battery."
```

## Gateway API surface
- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run` (force or due), `cron.runs`
For immediate system events without a job, use [`moltbot system event`](/cli/system).

## Troubleshooting

### “Nothing runs”
- Check cron is enabled: `cron.enabled` and `CLAWDBOT_SKIP_CRON`.
- Check the Gateway is running continuously (cron runs inside the Gateway process).
- For `cron` schedules: confirm timezone (`--tz`) vs the host timezone.

### Telegram delivers to the wrong place
- For forum topics, use `-100…:topic:<id>` so it’s explicit and unambiguous.
- If you see `telegram:...` prefixes in logs or stored “last route” targets, that’s normal;
  cron delivery accepts them and still parses topic IDs correctly.
