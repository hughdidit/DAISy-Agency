---
name: apple-reminders
description: Manage Apple Reminders via remindctl CLI (list, add, edit, complete, delete). Supports lists, date filters, and JSON/plain output.
homepage: https://github.com/steipete/remindctl
metadata: {"moltbot":{"emoji":"⏰","os":["darwin"],"requires":{"bins":["remindctl"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/remindctl","bins":["remindctl"],"label":"Install remindctl via Homebrew"}]}}
---

# Apple Reminders CLI (remindctl)

Use `remindctl` to manage Apple Reminders directly from the terminal.

<<<<<<< HEAD
Setup
- Install (Homebrew): `brew install steipete/tap/remindctl`
- From source: `pnpm install && pnpm build` (binary at `./bin/remindctl`)
- macOS-only; grant Reminders permission when prompted.

Permissions
- Check status: `remindctl status`
- Request access: `remindctl authorize`

View Reminders
- Default (today): `remindctl`
- Today: `remindctl today`
- Tomorrow: `remindctl tomorrow`
- Week: `remindctl week`
- Overdue: `remindctl overdue`
- Upcoming: `remindctl upcoming`
- Completed: `remindctl completed`
- All: `remindctl all`
- Specific date: `remindctl 2026-01-04`

Manage Lists
- List all lists: `remindctl list`
- Show list: `remindctl list Work`
- Create list: `remindctl list Projects --create`
- Rename list: `remindctl list Work --rename Office`
- Delete list: `remindctl list Work --delete`

Create Reminders
- Quick add: `remindctl add "Buy milk"`
- With list + due: `remindctl add --title "Call mom" --list Personal --due tomorrow`

Edit Reminders
- Edit title/due: `remindctl edit 1 --title "New title" --due 2026-01-04`

Complete Reminders
- Complete by id: `remindctl complete 1 2 3`

Delete Reminders
- Delete by id: `remindctl delete 4A83 --force`

Output Formats
- JSON (scripting): `remindctl today --json`
- Plain TSV: `remindctl today --plain`
- Counts only: `remindctl today --quiet`

Date Formats
=======
## When to Use

✅ **USE this skill when:**

- User explicitly mentions "reminder" or "Reminders app"
- Creating personal to-dos with due dates that sync to iOS
- Managing Apple Reminders lists
- User wants tasks to appear in their iPhone/iPad Reminders app

## When NOT to Use

❌ **DON'T use this skill when:**

- Scheduling Clawdbot tasks or alerts → use `cron` tool with systemEvent instead
- Calendar events or appointments → use Apple Calendar
- Project/work task management → use Notion, GitHub Issues, or task queue
- One-time notifications → use `cron` tool for timed alerts
- User says "remind me" but means a Clawdbot alert → clarify first

## Setup

- Install: `brew install steipete/tap/remindctl`
- macOS-only; grant Reminders permission when prompted
- Check status: `remindctl status`
- Request access: `remindctl authorize`

## Common Commands

### View Reminders

```bash
remindctl                    # Today's reminders
remindctl today              # Today
remindctl tomorrow           # Tomorrow
remindctl week               # This week
remindctl overdue            # Past due
remindctl all                # Everything
remindctl 2026-01-04         # Specific date
```

### Manage Lists

```bash
remindctl list               # List all lists
remindctl list Work          # Show specific list
remindctl list Projects --create    # Create list
remindctl list Work --delete        # Delete list
```

### Create Reminders

```bash
remindctl add "Buy milk"
remindctl add --title "Call mom" --list Personal --due tomorrow
remindctl add --title "Meeting prep" --due "2026-02-15 09:00"
```

### Complete/Delete

```bash
remindctl complete 1 2 3     # Complete by ID
remindctl delete 4A83 --force  # Delete by ID
```

### Output Formats

```bash
remindctl today --json       # JSON for scripting
remindctl today --plain      # TSV format
remindctl today --quiet      # Counts only
```

## Date Formats

>>>>>>> 9cce40d12 (feat(skills): Add 'Use when / Don't use when' routing blocks (#14521))
Accepted by `--due` and date filters:
- `today`, `tomorrow`, `yesterday`
- `YYYY-MM-DD`
- `YYYY-MM-DD HH:mm`
- ISO 8601 (`2026-01-04T12:34:56Z`)

<<<<<<< HEAD
Notes
- macOS-only.
- If access is denied, enable Terminal/remindctl in System Settings → Privacy & Security → Reminders.
- If running over SSH, grant access on the Mac that runs the command.
=======
## Example: Clarifying User Intent

User: "Remind me to check on the deploy in 2 hours"

**Ask:** "Do you want this in Apple Reminders (syncs to your phone) or as a Clawdbot alert (I'll message you here)?"

- Apple Reminders → use this skill
- Clawdbot alert → use `cron` tool with systemEvent
>>>>>>> 9cce40d12 (feat(skills): Add 'Use when / Don't use when' routing blocks (#14521))
