---
summary: "CLI reference for `moltbot cron` (schedule and run background jobs)"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
---

# `moltbot cron`

Manage cron jobs for the Gateway scheduler.

Related:

- Cron jobs: [Cron jobs](/automation/cron-jobs)

Tip: run `moltbot cron --help` for the full command surface.

## Common edits

Update delivery settings without changing the message:

```bash
<<<<<<< HEAD
moltbot cron edit <job-id> --deliver --channel telegram --to "123456789"
=======
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
>>>>>>> 511c656cb (feat(cron): introduce delivery modes for isolated jobs)
```

Disable delivery for an isolated job:

```bash
moltbot cron edit <job-id> --no-deliver
```

Deliver full output (instead of announce):

```bash
openclaw cron edit <job-id> --deliver --channel slack --to "channel:C1234567890"
```
