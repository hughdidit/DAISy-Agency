---
name: tmux
description: Remote-control tmux sessions for interactive CLIs by sending keystrokes and scraping pane output.
metadata: {"moltbot":{"emoji":"🧵","os":["darwin","linux"],"requires":{"bins":["tmux"]}}}
---

<<<<<<< HEAD
# tmux Skill (Moltbot)
=======
# tmux Session Control
>>>>>>> 9cce40d12 (feat(skills): Add 'Use when / Don't use when' routing blocks (#14521))

Control tmux sessions by sending keystrokes and reading output. Essential for managing Claude Code sessions.

## When to Use

✅ **USE this skill when:**

- Monitoring Claude/Codex sessions in tmux
- Sending input to interactive terminal applications
- Scraping output from long-running processes in tmux
- Navigating tmux panes/windows programmatically
- Checking on background work in existing sessions

## When NOT to Use

❌ **DON'T use this skill when:**

- Running one-off shell commands → use `exec` tool directly
- Starting new background processes → use `exec` with `background:true`
- Non-interactive scripts → use `exec` tool
- The process isn't in tmux
- You need to create a new tmux session → use `exec` with `tmux new-session`

## Example Sessions

| Session                 | Purpose                     |
| ----------------------- | --------------------------- |
| `shared`                | Primary interactive session |
| `worker-2` - `worker-8` | Parallel worker sessions    |

## Common Commands

### List Sessions

```bash
<<<<<<< HEAD
SOCKET_DIR="${CLAWDBOT_TMUX_SOCKET_DIR:-${TMPDIR:-/tmp}/moltbot-tmux-sockets}"
mkdir -p "$SOCKET_DIR"
SOCKET="$SOCKET_DIR/moltbot.sock"
SESSION=moltbot-python

tmux -S "$SOCKET" new -d -s "$SESSION" -n shell
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -- 'PYTHON_BASIC_REPL=1 python3 -q' Enter
tmux -S "$SOCKET" capture-pane -p -J -t "$SESSION":0.0 -S -200
```

After starting a session, always print monitor commands:

```
To monitor:
  tmux -S "$SOCKET" attach -t "$SESSION"
  tmux -S "$SOCKET" capture-pane -p -J -t "$SESSION":0.0 -S -200
```

## Socket convention

- Use `CLAWDBOT_TMUX_SOCKET_DIR` (default `${TMPDIR:-/tmp}/moltbot-tmux-sockets`).
- Default socket path: `"$CLAWDBOT_TMUX_SOCKET_DIR/moltbot.sock"`.

## Targeting panes and naming

- Target format: `session:window.pane` (defaults to `:0.0`).
- Keep names short; avoid spaces.
- Inspect: `tmux -S "$SOCKET" list-sessions`, `tmux -S "$SOCKET" list-panes -a`.

## Finding sessions

- List sessions on your socket: `{baseDir}/scripts/find-sessions.sh -S "$SOCKET"`.
- Scan all sockets: `{baseDir}/scripts/find-sessions.sh --all` (uses `CLAWDBOT_TMUX_SOCKET_DIR`).

## Sending input safely

- Prefer literal sends: `tmux -S "$SOCKET" send-keys -t target -l -- "$cmd"`.
- Control keys: `tmux -S "$SOCKET" send-keys -t target C-c`.
- For interactive TUI apps like Claude Code/Codex, this guidance covers **how to send commands**.
  Do **not** append `Enter` in the same `send-keys`. These apps may treat a fast text+Enter
  sequence as paste/multi-line input and not submit; this is timing-dependent. Send text and
  `Enter` as separate commands with a small delay (tune per environment; increase if needed,
  or use `sleep 1` if sub-second sleeps aren't supported):
=======
tmux list-sessions
tmux ls
```

### Capture Output
>>>>>>> 9cce40d12 (feat(skills): Add 'Use when / Don't use when' routing blocks (#14521))

```bash
# Last 20 lines of pane
tmux capture-pane -t shared -p | tail -20

# Entire scrollback
tmux capture-pane -t shared -p -S -

# Specific pane in window
tmux capture-pane -t shared:0.0 -p
```

### Send Keys

```bash
# Send text (doesn't press Enter)
tmux send-keys -t shared "hello"

# Send text + Enter
tmux send-keys -t shared "y" Enter

# Send special keys
tmux send-keys -t shared Enter
tmux send-keys -t shared Escape
tmux send-keys -t shared C-c          # Ctrl+C
tmux send-keys -t shared C-d          # Ctrl+D (EOF)
tmux send-keys -t shared C-z          # Ctrl+Z (suspend)
```

### Window/Pane Navigation

```bash
# Select window
tmux select-window -t shared:0

# Select pane
tmux select-pane -t shared:0.1

# List windows
tmux list-windows -t shared
```

### Session Management

```bash
# Create new session
tmux new-session -d -s newsession

# Kill session
tmux kill-session -t sessionname

# Rename session
tmux rename-session -t old new
```

## Sending Input Safely

For interactive TUIs (Claude Code, Codex, etc.), split text and Enter into separate sends to avoid paste/multiline edge cases:

```bash
tmux send-keys -t shared -l -- "Please apply the patch in src/foo.ts"
sleep 0.1
tmux send-keys -t shared Enter
```

## Claude Code Session Patterns

### Check if Session Needs Input

```bash
# Look for prompts
tmux capture-pane -t worker-3 -p | tail -10 | grep -E "❯|Yes.*No|proceed|permission"
```

### Approve Claude Code Prompt

```bash
# Send 'y' and Enter
tmux send-keys -t worker-3 'y' Enter

# Or select numbered option
tmux send-keys -t worker-3 '2' Enter
```

### Check All Sessions Status

```bash
for s in shared worker-2 worker-3 worker-4 worker-5 worker-6 worker-7 worker-8; do
  echo "=== $s ==="
  tmux capture-pane -t $s -p 2>/dev/null | tail -5
done
```

<<<<<<< HEAD
**Tips:**
- Use separate git worktrees for parallel fixes (no branch conflicts)
- `pnpm install` first before running codex in fresh clones
- Check for shell prompt (`❯` or `$`) to detect completion
- Codex needs `--yolo` or `--full-auto` for non-interactive fixes

## Cleanup

- Kill a session: `tmux -S "$SOCKET" kill-session -t "$SESSION"`.
- Kill all sessions on a socket: `tmux -S "$SOCKET" list-sessions -F '#{session_name}' | xargs -r -n1 tmux -S "$SOCKET" kill-session -t`.
- Remove everything on the private socket: `tmux -S "$SOCKET" kill-server`.

## Helper: wait-for-text.sh

`{baseDir}/scripts/wait-for-text.sh` polls a pane for a regex (or fixed string) with a timeout.
=======
### Send Task to Session
>>>>>>> 9cce40d12 (feat(skills): Add 'Use when / Don't use when' routing blocks (#14521))

```bash
tmux send-keys -t worker-4 "Fix the bug in auth.js" Enter
```

## Notes

- Use `capture-pane -p` to print to stdout (essential for scripting)
- `-S -` captures entire scrollback history
- Target format: `session:window.pane` (e.g., `shared:0.0`)
- Sessions persist across SSH disconnects
