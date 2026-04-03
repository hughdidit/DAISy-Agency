# Approval Flow

`pending -> modified -> approved -> applied`

Terminal paths:

- `pending|modified -> denied`
- `pending|modified -> expired`
- `approved -> failed`

Every transition is written to the cron-guard audit history with actor, timestamp, and resulting status.
