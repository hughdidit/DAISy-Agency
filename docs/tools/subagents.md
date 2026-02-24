---
summary: "Sub-agents: spawning isolated agent runs that announce results back to the requester chat"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sub-Agents"
---

# Sub-Agents

Sub-agents let you run background tasks without blocking the main conversation. When you spawn a sub-agent, it runs in its own isolated session, does its work, and announces the result back to the chat when finished.

**Use cases:**

<<<<<<< HEAD
Use `/subagents` to inspect or control sub-agent runs for the **current session**:
- `/subagents list`
- `/subagents stop <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
=======
- Research a topic while the main agent continues answering questions
- Run multiple long tasks in parallel (web scraping, code analysis, file processing)
- Delegate tasks to specialized agents in a multi-agent setup

<<<<<<< HEAD
<<<<<<< HEAD
## Quick Start
>>>>>>> 0768fc65d (docs(subagents): simplify page and verify behavior/examples (#12761))

The simplest way to use sub-agents is to ask your agent naturally:
=======
Discord thread binding controls:
=======
Thread binding controls:

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
These commands work on channels that implement thread bindings. Current support is Discord.
>>>>>>> 0b9b9d430 (docs: make subagents thread guidance channel-first)
=======
These commands work on channels that support persistent thread bindings. See **Thread supporting channels** below.
>>>>>>> c95233480 (docs: list thread supporting channels in subagents guide)
=======
These commands work on channels that support persistent thread bindings. Currently only Discord is supported.
>>>>>>> 418e4e32c (docs: clarify thread-bound subagents are Discord-only)
=======
These commands work on channels that support persistent thread bindings. See **Thread supporting channels** below.
>>>>>>> 3308c8600 (docs: keep channel names only in thread-support list)

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session ttl <duration|off>`

`/subagents info` shows run metadata (status, timestamps, session id, transcript path, cleanup).

### Spawn behavior

`/subagents spawn` starts a background sub-agent as a user command, not an internal relay, and it sends one final completion update back to the requester chat when the run finishes.

- The spawn command is non-blocking; it returns a run id immediately.
- On completion, the sub-agent announces a summary/result message back to the requester chat channel.
- For manual spawns, delivery is resilient:
  - OpenClaw tries direct `agent` delivery first with a stable idempotency key.
  - If direct delivery fails, it falls back to queue routing.
  - If queue routing is still not available, the announce is retried with a short exponential backoff before final give-up.
- The completion message is a system message and includes:
  - `Result` (`assistant` reply text, or latest `toolResult` if the assistant reply is empty)
  - `Status` (`completed successfully` / `failed` / `timed out`)
  - compact runtime/token stats
- `--model` and `--thinking` override defaults for that specific run.
- Use `info`/`log` to inspect details and output after completion.
- `/subagents spawn` is one-shot mode (`mode: "run"`). For persistent thread-bound sessions, use `sessions_spawn` with `thread: true` and `mode: "session"`.
>>>>>>> 817905f3a (docs: document thread-bound subagent sessions and remove plan)

<<<<<<< HEAD
Primary goals:
- Parallelize “research / long task / slow tool” work without blocking the main run.
- Keep sub-agents isolated by default (session separation + optional sandboxing).
- Keep the tool surface hard to misuse: sub-agents do **not** get session tools by default.
- Avoid nested fan-out: sub-agents cannot spawn sub-agents.
=======
> "Spawn a sub-agent to research the latest Node.js release notes"

The agent will call the `sessions_spawn` tool behind the scenes. When the sub-agent finishes, it announces its findings back into your chat.
>>>>>>> 0768fc65d (docs(subagents): simplify page and verify behavior/examples (#12761))

You can also be explicit about options:

> "Spawn a sub-agent to analyze the server logs from today. Use gpt-5.2 and set a 5-minute timeout."

<<<<<<< HEAD
Use `sessions_spawn`:
- Starts a sub-agent run (`deliver: false`, global lane: `subagent`)
- Then runs an announce step and posts the announce reply to the requester chat channel
- Default model: inherits the caller unless you set `agents.defaults.subagents.model` (or per-agent `agents.list[].subagents.model`); an explicit `sessions_spawn.model` still wins.
<<<<<<< HEAD
=======
- Default thinking: inherits the caller unless you set `agents.defaults.subagents.thinking` (or per-agent `agents.list[].subagents.thinking`); an explicit `sessions_spawn.thinking` still wins.
- Default run timeout: if `sessions_spawn.runTimeoutSeconds` is omitted, OpenClaw uses `agents.defaults.subagents.runTimeoutSeconds` when set; otherwise it falls back to `0` (no timeout).
>>>>>>> 8c5cf2d5b (docs(subagents): document default runTimeoutSeconds config (#24594) (thanks @mitchmcalister))

Tool params:
- `task` (required)
- `label?` (optional)
- `agentId?` (optional; spawn under another agent id if allowed)
- `model?` (optional; overrides the sub-agent model; invalid values are skipped and the sub-agent runs on the default model with a warning in the tool result)
- `thinking?` (optional; overrides thinking level for the sub-agent run)
- `runTimeoutSeconds?` (defaults to `agents.defaults.subagents.runTimeoutSeconds` when set, otherwise `0`; when set, the sub-agent run is aborted after N seconds)
- `thread?` (default `false`; when `true`, requests channel thread binding for this sub-agent session)
- `mode?` (`run|session`)
  - default is `run`
  - if `thread: true` and `mode` omitted, default becomes `session`
  - `mode: "session"` requires `thread: true`
- `cleanup?` (`delete|keep`, default `keep`)

## Thread-bound sessions

When thread bindings are enabled for a channel, a sub-agent can stay bound to a thread so follow-up user messages in that thread keep routing to the same sub-agent session.

### Thread supporting channels

- Discord (currently the only supported channel): supports persistent thread-bound subagent sessions (`sessions_spawn` with `thread: true`), manual thread controls (`/focus`, `/unfocus`, `/agents`, `/session ttl`), and adapter keys `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.ttlHours`, and `channels.discord.threadBindings.spawnSubagentSessions`.

Quick flow:

1. Spawn with `sessions_spawn` using `thread: true` (and optionally `mode: "session"`).
2. OpenClaw creates or binds a thread to that session target in the active channel.
3. Replies and follow-up messages in that thread route to the bound session.
4. Use `/session ttl` to inspect/update auto-unfocus TTL.
5. Use `/unfocus` to detach manually.

Manual controls:

- `/focus <target>` binds the current thread (or creates one) to a sub-agent/session target.
- `/unfocus` removes the binding for the current bound thread.
- `/agents` lists active runs and binding state (`thread:<id>` or `unbound`).
- `/session ttl` only works for focused bound threads.

Config switches:

- Global default: `session.threadBindings.enabled`, `session.threadBindings.ttlHours`
- Channel override and spawn auto-bind keys are adapter-specific. See **Thread supporting channels** above.

See [Configuration Reference](/gateway/configuration-reference) and [Slash commands](/tools/slash-commands) for current adapter details.

Allowlist:
- `agents.list[].subagents.allowAgents`: list of agent ids that can be targeted via `agentId` (`["*"]` to allow any). Default: only the requester agent.

Discovery:
- Use `agents_list` to see which agent ids are currently allowed for `sessions_spawn`.

Auto-archive:
- Sub-agent sessions are automatically archived after `agents.defaults.subagents.archiveAfterMinutes` (default: 60).
- Archive uses `sessions.delete` and renames the transcript to `*.deleted.<timestamp>` (same folder).
- `cleanup: "delete"` archives immediately after announce (still keeps the transcript via rename).
- Auto-archive is best-effort; pending timers are lost if the gateway restarts.
- `runTimeoutSeconds` does **not** auto-archive; it only stops the run. The session remains until auto-archive.
<<<<<<< HEAD
=======
- Auto-archive applies equally to depth-1 and depth-2 sessions.

## Nested Sub-Agents

By default, sub-agents cannot spawn their own sub-agents (`maxSpawnDepth: 1`). You can enable one level of nesting by setting `maxSpawnDepth: 2`, which allows the **orchestrator pattern**: main → orchestrator sub-agent → worker sub-sub-agents.

### How to enable

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn when omitted (0 = no timeout)
      },
    },
  },
}
```

### Depth levels

| Depth | Session key shape                            | Role                                          | Can spawn?                   |
| ----- | -------------------------------------------- | --------------------------------------------- | ---------------------------- |
| 0     | `agent:<id>:main`                            | Main agent                                    | Always                       |
| 1     | `agent:<id>:subagent:<uuid>`                 | Sub-agent (orchestrator when depth 2 allowed) | Only if `maxSpawnDepth >= 2` |
| 2     | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sub-sub-agent (leaf worker)                   | Never                        |

### Announce chain

Results flow back up the chain:

1. Depth-2 worker finishes → announces to its parent (depth-1 orchestrator)
2. Depth-1 orchestrator receives the announce, synthesizes results, finishes → announces to main
3. Main agent receives the announce and delivers to the user

Each level only sees announces from its direct children.

### Tool policy by depth

- **Depth 1 (orchestrator, when `maxSpawnDepth >= 2`)**: Gets `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` so it can manage its children. Other session/system tools remain denied.
- **Depth 1 (leaf, when `maxSpawnDepth == 1`)**: No session tools (current default behavior).
- **Depth 2 (leaf worker)**: No session tools — `sessions_spawn` is always denied at depth 2. Cannot spawn further children.

### Per-agent spawn limit

Each agent session (at any depth) can have at most `maxChildrenPerAgent` (default: 5) active children at a time. This prevents runaway fan-out from a single orchestrator.

### Cascade stop

Stopping a depth-1 orchestrator automatically stops all its depth-2 children:

- `/stop` in the main chat stops all depth-1 agents and cascades to their depth-2 children.
- `/subagents kill <id>` stops a specific sub-agent and cascades to its children.
- `/subagents kill all` stops all sub-agents for the requester and cascades.
>>>>>>> 8c5cf2d5b (docs(subagents): document default runTimeoutSeconds config (#24594) (thanks @mitchmcalister))

## Authentication

Sub-agent auth is resolved by **agent id**, not by session type:
- The sub-agent session key is `agent:<agentId>:subagent:<uuid>`.
- The auth store is loaded from that agent’s `agentDir`.
- The main agent’s auth profiles are merged in as a **fallback**; agent profiles override main profiles on conflicts.

Note: the merge is additive, so main profiles are always available as fallbacks. Fully isolated auth per agent is not supported yet.

## Announce

Sub-agents report back via an announce step:
- The announce step runs inside the sub-agent session (not the requester session).
- If the sub-agent replies exactly `ANNOUNCE_SKIP`, nothing is posted.
- Otherwise the announce reply is posted to the requester chat channel via a follow-up `agent` call (`deliver=true`).
- Announce replies preserve thread/topic routing when available on channel adapters.
- Announce messages are normalized to a stable template:
  - `Status:` derived from the run outcome (`success`, `error`, `timeout`, or `unknown`).
  - `Result:` the summary content from the announce step (or `(not available)` if missing).
  - `Notes:` error details and other useful context.
- `Status` is not inferred from model output; it comes from runtime outcome signals.

Announce payloads include a stats line at the end (even when wrapped):
- Runtime (e.g., `runtime 5m12s`)
- Token usage (input/output/total)
- Estimated cost when model pricing is configured (`models.providers.*.models[].cost`)
- `sessionKey`, `sessionId`, and transcript path (so the main agent can fetch history via `sessions_history` or inspect the file on disk)

## Tool Policy (sub-agent tools)

By default, sub-agents get **all tools except session tools**:
- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

Override via config:
=======
## How It Works

<Steps>
  <Step title="Main agent spawns">
    The main agent calls `sessions_spawn` with a task description. The call is **non-blocking** — the main agent gets back `{ status: "accepted", runId, childSessionKey }` immediately.
  </Step>
  <Step title="Sub-agent runs in the background">
    A new isolated session is created (`agent:<agentId>:subagent:<uuid>`) on the dedicated `subagent` queue lane.
  </Step>
  <Step title="Result is announced">
    When the sub-agent finishes, it announces its findings back to the requester chat. The main agent posts a natural-language summary.
  </Step>
  <Step title="Session is archived">
    The sub-agent session is auto-archived after 60 minutes (configurable). Transcripts are preserved.
  </Step>
</Steps>

<Tip>
Each sub-agent has its **own** context and token usage. Set a cheaper model for sub-agents to save costs — see [Setting a Default Model](#setting-a-default-model) below.
</Tip>

## Configuration

Sub-agents work out of the box with no configuration. Defaults:

- Model: target agent’s normal model selection (unless `subagents.model` is set)
- Thinking: no sub-agent override (unless `subagents.thinking` is set)
- Max concurrent: 8
- Auto-archive: after 60 minutes

### Setting a Default Model

Use a cheaper model for sub-agents to save on token costs:
>>>>>>> 0768fc65d (docs(subagents): simplify page and verify behavior/examples (#12761))

```json5
{
  agents: {
    defaults: {
      subagents: {
<<<<<<< HEAD
        maxConcurrent: 1
      }
    }
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      }
    }
  }
=======
        model: "minimax/MiniMax-M2.1",
      },
    },
  },
>>>>>>> 0768fc65d (docs(subagents): simplify page and verify behavior/examples (#12761))
}
```

### Setting a Default Thinking Level

<<<<<<< HEAD
Sub-agents use a dedicated in-process queue lane:
- Lane name: `subagent`
- Concurrency: `agents.defaults.subagents.maxConcurrent` (default `8`)
=======
```json5
{
  agents: {
    defaults: {
      subagents: {
        thinking: "low",
      },
    },
  },
}
```

### Per-Agent Overrides
>>>>>>> 0768fc65d (docs(subagents): simplify page and verify behavior/examples (#12761))

In a multi-agent setup, you can set sub-agent defaults per agent:

```json5
{
  agents: {
    list: [
      {
        id: "researcher",
        subagents: {
          model: "anthropic/claude-sonnet-4",
        },
      },
      {
        id: "assistant",
        subagents: {
          model: "minimax/MiniMax-M2.1",
        },
      },
    ],
  },
}
```

### Concurrency

Control how many sub-agents can run at the same time:

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 4, // default: 8
      },
    },
  },
}
```

Sub-agents use a dedicated queue lane (`subagent`) separate from the main agent queue, so sub-agent runs don't block inbound replies.

### Auto-Archive

Sub-agent sessions are automatically archived after a configurable period:

```json5
{
  agents: {
    defaults: {
      subagents: {
        archiveAfterMinutes: 120, // default: 60
      },
    },
  },
}
```

<Note>
Archive renames the transcript to `*.deleted.<timestamp>` (same folder) — transcripts are preserved, not deleted. Auto-archive timers are best-effort; pending timers are lost if the gateway restarts.
</Note>

## The `sessions_spawn` Tool

This is the tool the agent calls to create sub-agents.

### Parameters

| Parameter           | Type                   | Default            | Description                                                    |
| ------------------- | ---------------------- | ------------------ | -------------------------------------------------------------- |
| `task`              | string                 | _(required)_       | What the sub-agent should do                                   |
| `label`             | string                 | —                  | Short label for identification                                 |
| `agentId`           | string                 | _(caller's agent)_ | Spawn under a different agent id (must be allowed)             |
| `model`             | string                 | _(optional)_       | Override the model for this sub-agent                          |
| `thinking`          | string                 | _(optional)_       | Override thinking level (`off`, `low`, `medium`, `high`, etc.) |
| `runTimeoutSeconds` | number                 | `0` (no limit)     | Abort the sub-agent after N seconds                            |
| `cleanup`           | `"delete"` \| `"keep"` | `"keep"`           | `"delete"` archives immediately after announce                 |

### Model Resolution Order

The sub-agent model is resolved in this order (first match wins):

1. Explicit `model` parameter in the `sessions_spawn` call
2. Per-agent config: `agents.list[].subagents.model`
3. Global default: `agents.defaults.subagents.model`
4. Target agent’s normal model resolution for that new session

Thinking level is resolved in this order:

1. Explicit `thinking` parameter in the `sessions_spawn` call
2. Per-agent config: `agents.list[].subagents.thinking`
3. Global default: `agents.defaults.subagents.thinking`
4. Otherwise no sub-agent-specific thinking override is applied

<Note>
Invalid model values are silently skipped — the sub-agent runs on the next valid default with a warning in the tool result.
</Note>

### Cross-Agent Spawning

By default, sub-agents can only spawn under their own agent id. To allow an agent to spawn sub-agents under other agent ids:

```json5
{
  agents: {
    list: [
      {
        id: "orchestrator",
        subagents: {
          allowAgents: ["researcher", "coder"], // or ["*"] to allow any
        },
      },
    ],
  },
}
```

<Tip>
Use the `agents_list` tool to discover which agent ids are currently allowed for `sessions_spawn`.
</Tip>

## Managing Sub-Agents (`/subagents`)

Use the `/subagents` slash command to inspect and control sub-agent runs for the current session:

| Command                                  | Description                                    |
| ---------------------------------------- | ---------------------------------------------- |
| `/subagents list`                        | List all sub-agent runs (active and completed) |
| `/subagents stop <id\|#\|all>`           | Stop a running sub-agent                       |
| `/subagents log <id\|#> [limit] [tools]` | View sub-agent transcript                      |
| `/subagents info <id\|#>`                | Show detailed run metadata                     |
| `/subagents send <id\|#> <message>`      | Send a message to a running sub-agent          |

You can reference sub-agents by list index (`1`, `2`), run id prefix, full session key, or `last`.

<AccordionGroup>
  <Accordion title="Example: list and stop a sub-agent">
    ```
    /subagents list
    ```

    ```
    🧭 Subagents (current session)
    Active: 1 · Done: 2
    1) ✅ · research logs · 2m31s · run a1b2c3d4 · agent:main:subagent:...
    2) ✅ · check deps · 45s · run e5f6g7h8 · agent:main:subagent:...
    3) 🔄 · deploy staging · 1m12s · run i9j0k1l2 · agent:main:subagent:...
    ```

    ```
    /subagents stop 3
    ```

    ```
    ⚙️ Stop requested for deploy staging.
    ```

  </Accordion>
  <Accordion title="Example: inspect a sub-agent">
    ```
    /subagents info 1
    ```

    ```
    ℹ️ Subagent info
    Status: ✅
    Label: research logs
    Task: Research the latest server error logs and summarize findings
    Run: a1b2c3d4-...
    Session: agent:main:subagent:...
    Runtime: 2m31s
    Cleanup: keep
    Outcome: ok
    ```

  </Accordion>
  <Accordion title="Example: view sub-agent log">
    ```
    /subagents log 1 10
    ```

    Shows the last 10 messages from the sub-agent's transcript. Add `tools` to include tool call messages:

    ```
    /subagents log 1 10 tools
    ```

  </Accordion>
  <Accordion title="Example: send a follow-up message">
    ```
    /subagents send 3 "Also check the staging environment"
    ```

    Sends a message into the running sub-agent's session and waits up to 30 seconds for a reply.

  </Accordion>
</AccordionGroup>

## Announce (How Results Come Back)

When a sub-agent finishes, it goes through an **announce** step:

1. The sub-agent's final reply is captured
2. A summary message is sent to the main agent's session with the result, status, and stats
3. The main agent posts a natural-language summary to your chat

Announce replies preserve thread/topic routing when available (Slack threads, Telegram topics, Matrix threads).

### Announce Stats

Each announce includes a stats line with:

- Runtime duration
- Token usage (input/output/total)
- Estimated cost (when model pricing is configured via `models.providers.*.models[].cost`)
- Session key, session id, and transcript path

### Announce Status

The announce message includes a status derived from the runtime outcome (not from model output):

- **successful completion** (`ok`) — task completed normally
- **error** — task failed (error details in notes)
- **timeout** — task exceeded `runTimeoutSeconds`
- **unknown** — status could not be determined

<Tip>
If no user-facing announcement is needed, the main-agent summarize step can return `NO_REPLY` and nothing is posted.
This is different from `ANNOUNCE_SKIP`, which is used in agent-to-agent announce flow (`sessions_send`).
</Tip>

## Tool Policy

By default, sub-agents get **all tools except** a set of denied tools that are unsafe or unnecessary for background tasks:

<AccordionGroup>
  <Accordion title="Default denied tools">
    | Denied tool | Reason |
    |-------------|--------|
    | `sessions_list` | Session management — main agent orchestrates |
    | `sessions_history` | Session management — main agent orchestrates |
    | `sessions_send` | Session management — main agent orchestrates |
    | `sessions_spawn` | No nested fan-out (sub-agents cannot spawn sub-agents) |
    | `gateway` | System admin — dangerous from sub-agent |
    | `agents_list` | System admin |
    | `whatsapp_login` | Interactive setup — not a task |
    | `session_status` | Status/scheduling — main agent coordinates |
    | `cron` | Status/scheduling — main agent coordinates |
    | `memory_search` | Pass relevant info in spawn prompt instead |
    | `memory_get` | Pass relevant info in spawn prompt instead |
  </Accordion>
</AccordionGroup>

### Customizing Sub-Agent Tools

You can further restrict sub-agent tools:

```json5
{
  tools: {
    subagents: {
      tools: {
        // deny always wins over allow
        deny: ["browser", "firecrawl"],
      },
    },
  },
}
```

To restrict sub-agents to **only** specific tools:

```json5
{
  tools: {
    subagents: {
      tools: {
        allow: ["read", "exec", "process", "write", "edit", "apply_patch"],
        // deny still wins if set
      },
    },
  },
}
```

<Note>
Custom deny entries are **added to** the default deny list. If `allow` is set, only those tools are available (the default deny list still applies on top).
</Note>

## Authentication

Sub-agent auth is resolved by **agent id**, not by session type:

- The auth store is loaded from the target agent's `agentDir`
- The main agent's auth profiles are merged in as a **fallback** (agent profiles win on conflicts)
- The merge is additive — main profiles are always available as fallbacks

<Note>
Fully isolated auth per sub-agent is not currently supported.
</Note>

## Context and System Prompt

Sub-agents receive a reduced system prompt compared to the main agent:

- **Included:** Tooling, Workspace, Runtime sections, plus `AGENTS.md` and `TOOLS.md`
- **Not included:** `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`

The sub-agent also receives a task-focused system prompt that instructs it to stay focused on the assigned task, complete it, and not act as the main agent.

## Stopping Sub-Agents

| Method                 | Effect                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| `/stop` in the chat    | Aborts the main session **and** all active sub-agent runs spawned from it |
| `/subagents stop <id>` | Stops a specific sub-agent without affecting the main session             |
| `runTimeoutSeconds`    | Automatically aborts the sub-agent run after the specified time           |

<Note>
`runTimeoutSeconds` does **not** auto-archive the session. The session remains until the normal archive timer fires.
</Note>

## Full Configuration Example

<Accordion title="Complete sub-agent configuration">
```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-sonnet-4" },
      subagents: {
        model: "minimax/MiniMax-M2.1",
        thinking: "low",
        maxConcurrent: 4,
        archiveAfterMinutes: 30,
      },
    },
    list: [
      {
        id: "main",
        default: true,
        name: "Personal Assistant",
      },
      {
        id: "ops",
        name: "Ops Agent",
        subagents: {
          model: "anthropic/claude-sonnet-4",
          allowAgents: ["main"], // ops can spawn sub-agents under "main"
        },
      },
    ],
  },
  tools: {
    subagents: {
      tools: {
        deny: ["browser"], // sub-agents can't use the browser
      },
    },
  },
}
```
</Accordion>

## Limitations

<Warning>
- **Best-effort announce:** If the gateway restarts, pending announce work is lost.
- **No nested spawning:** Sub-agents cannot spawn their own sub-agents.
- **Shared resources:** Sub-agents share the gateway process; use `maxConcurrent` as a safety valve.
- **Auto-archive is best-effort:** Pending archive timers are lost on gateway restart.
</Warning>

## See Also

- [Session Tools](/concepts/session-tool) — details on `sessions_spawn` and other session tools
- [Multi-Agent Sandbox and Tools](/tools/multi-agent-sandbox-tools) — per-agent tool restrictions and sandboxing
- [Configuration](/gateway/configuration) — `agents.defaults.subagents` reference
- [Queue](/concepts/queue) — how the `subagent` lane works
