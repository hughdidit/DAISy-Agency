---
summary: "iMessage support via imsg (JSON-RPC over stdio), setup, and chat_id routing"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---
# iMessage (imsg)


<<<<<<< HEAD
Status: external CLI integration. Gateway spawns `imsg rpc` (JSON-RPC over stdio).

## Quick setup (beginner)
1) Ensure Messages is signed in on this Mac.
2) Install `imsg`:
   - `brew install steipete/tap/imsg`
3) Configure Moltbot with `channels.imessage.cliPath` and `channels.imessage.dbPath`.
4) Start the gateway and approve any macOS prompts (Automation + Full Disk Access).

Minimal config:
=======
<Warning>
For new iMessage deployments, use <a href="/channels/bluebubbles">BlueBubbles</a>.

The `imsg` integration is legacy and may be removed in a future release.
</Warning>

Status: legacy external CLI integration. Gateway spawns `imsg rpc` and communicates over JSON-RPC on stdio (no separate daemon/port).

<CardGroup cols={3}>
  <Card title="BlueBubbles (recommended)" icon="message-circle" href="/channels/bluebubbles">
    Preferred iMessage path for new setups.
  </Card>
  <Card title="Pairing" icon="link" href="/channels/pairing">
    iMessage DMs default to pairing mode.
  </Card>
  <Card title="Configuration reference" icon="settings" href="/gateway/configuration-reference#imessage">
    Full iMessage field reference.
  </Card>
</CardGroup>

## Onboarding

<Tabs>
  <Tab title="Local Mac (fast path)">
    <Steps>
      <Step title="Install and verify imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
```

      </Step>

      <Step title="Configure OpenClaw">

>>>>>>> 6758b6bfe (docs(channels): modernize imessage docs page (#14213))
```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<you>/Library/Messages/chat.db"
    }
  }
}
```

<<<<<<< HEAD
## What it is
- iMessage channel backed by `imsg` on macOS.
- Deterministic routing: replies always go back to iMessage.
- DMs share the agent's main session; groups are isolated (`agent:<agentId>:imessage:group:<chat_id>`).
- If a multi-participant thread arrives with `is_group=false`, you can still isolate it by `chat_id` using `channels.imessage.groups` (see “Group-ish threads” below).

## Config writes
By default, iMessage is allowed to write config updates triggered by `/config set|unset` (requires `commands.config: true`).

Disable with:
```json5
{
  channels: { imessage: { configWrites: false } }
}
```

## Requirements
- macOS with Messages signed in.
- Full Disk Access for Moltbot + `imsg` (Messages DB access).
- Automation permission when sending.
- `channels.imessage.cliPath` can point to any command that proxies stdin/stdout (for example, a wrapper script that SSHes to another Mac and runs `imsg rpc`).
=======
      </Step>

      <Step title="Start gateway">

```bash
openclaw gateway
```

      </Step>

      <Step title="Approve first DM pairing (default dmPolicy)">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        Pairing requests expire after 1 hour.
      </Step>
    </Steps>

  </Tab>

  <Tab title="Remote Mac over SSH">
    OpenClaw only requires a stdio-compatible `cliPath`, so you can point `cliPath` at a wrapper script that SSHes to a remote Mac and runs `imsg`.

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    Recommended config when attachments are enabled:

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@gateway-host", // used for SCP attachment fetches
      includeAttachments: true,
    },
  },
}
```

    If `remoteHost` is not set, OpenClaw attempts to auto-detect it by parsing the SSH wrapper script.

  </Tab>
</Tabs>
>>>>>>> 6758b6bfe (docs(channels): modernize imessage docs page (#14213))

## Requirements and permissions (macOS)

- Messages must be signed in on the Mac running `imsg`.
- Full Disk Access is required for the process context running OpenClaw/`imsg` (Messages DB access).
- Automation permission is required to send messages through Messages.app.

<Tip>
Permissions are granted per process context. If gateway runs headless (LaunchAgent/SSH), run a one-time interactive command in that same context to trigger prompts:

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

<<<<<<< HEAD
## Setup (fast path)
1) Ensure Messages is signed in on this Mac.
2) Configure iMessage and start the gateway.

### Dedicated bot macOS user (for isolated identity)
If you want the bot to send from a **separate iMessage identity** (and keep your personal Messages clean), use a dedicated Apple ID + a dedicated macOS user.

1) Create a dedicated Apple ID (example: `my-cool-bot@icloud.com`).
   - Apple may require a phone number for verification / 2FA.
2) Create a macOS user (example: `clawdshome`) and sign into it.
3) Open Messages in that macOS user and sign into iMessage using the bot Apple ID.
4) Enable Remote Login (System Settings → General → Sharing → Remote Login).
5) Install `imsg`:
   - `brew install steipete/tap/imsg`
6) Set up SSH so `ssh <bot-macos-user>@localhost true` works without a password.
7) Point `channels.imessage.accounts.bot.cliPath` at an SSH wrapper that runs `imsg` as the bot user.

<<<<<<< HEAD
First-run note: sending/receiving may require GUI approvals (Automation + Full Disk Access) in the *bot macOS user*. If `imsg rpc` looks stuck or exits, log into that user (Screen Sharing helps), run a one-time `imsg chats --limit 1` / `imsg send ...`, approve prompts, then retry.
=======
First-run note: sending/receiving may require GUI approvals (Automation + Full Disk Access) in the _bot macOS user_. If `imsg rpc` looks stuck or exits, log into that user (Screen Sharing helps), run a one-time `imsg chats --limit 1` / `imsg send ...`, approve prompts, then retry. See [Troubleshooting macOS Privacy and Security TCC](#troubleshooting-macos-privacy-and-security-tcc).
>>>>>>> 93bf75279 (docs(imessage): improve macOS TCC troubleshooting guidance (#10781))

Example wrapper (`chmod +x`). Replace `<bot-macos-user>` with your actual macOS username:
```bash
#!/usr/bin/env bash
set -euo pipefail
=======
## Access control and routing

<Tabs>
  <Tab title="DM policy">
    `channels.imessage.dmPolicy` controls direct messages:

    - `pairing` (default)
    - `allowlist`
    - `open` (requires `allowFrom` to include `"*"`)
    - `disabled`

    Allowlist field: `channels.imessage.allowFrom`.

    Allowlist entries can be handles or chat targets (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`).

  </Tab>

  <Tab title="Group policy + mentions">
    `channels.imessage.groupPolicy` controls group handling:

    - `allowlist` (default when configured)
    - `open`
    - `disabled`
>>>>>>> 6758b6bfe (docs(channels): modernize imessage docs page (#14213))

    Group sender allowlist: `channels.imessage.groupAllowFrom`.

<<<<<<< HEAD
Example config:
```json5
{
  channels: {
    imessage: {
      enabled: true,
      accounts: {
        bot: {
          name: "Bot",
          enabled: true,
          cliPath: "/path/to/imsg-bot",
          dbPath: "/Users/<bot-macos-user>/Library/Messages/chat.db"
        }
      }
    }
  }
}
```
=======
    Runtime fallback: if `groupAllowFrom` is unset, iMessage group sender checks fall back to `allowFrom` when available.

    Mention gating for groups:
>>>>>>> 6758b6bfe (docs(channels): modernize imessage docs page (#14213))

    - iMessage has no native mention metadata
    - mention detection uses regex patterns (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - with no configured patterns, mention gating cannot be enforced

<<<<<<< HEAD
### Remote/SSH variant (optional)
If you want iMessage on another Mac, set `channels.imessage.cliPath` to a wrapper that runs `imsg` on the remote macOS host over SSH. Moltbot only needs stdio.

Example wrapper:
```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

**Remote attachments:** When `cliPath` points to a remote host via SSH, attachment paths in the Messages database reference files on the remote machine. Moltbot can automatically fetch these over SCP by setting `channels.imessage.remoteHost`:

```json5
{
  channels: {
    imessage: {
      cliPath: "~/imsg-ssh",                     // SSH wrapper to remote Mac
      remoteHost: "user@gateway-host",           // for SCP file transfer
      includeAttachments: true
    }
  }
}
```

If `remoteHost` is not set, Moltbot attempts to auto-detect it by parsing the SSH command in your wrapper script. Explicit configuration is recommended for reliability.

#### Remote Mac via Tailscale (example)
If the Gateway runs on a Linux host/VM but iMessage must run on a Mac, Tailscale is the simplest bridge: the Gateway talks to the Mac over the tailnet, runs `imsg` via SSH, and SCPs attachments back.

Architecture:
<<<<<<< HEAD
```
┌──────────────────────────────┐          SSH (imsg rpc)          ┌──────────────────────────┐
│ Gateway host (Linux/VM)      │──────────────────────────────────▶│ Mac with Messages + imsg │
│ - moltbot gateway           │          SCP (attachments)        │ - Messages signed in     │
│ - channels.imessage.cliPath  │◀──────────────────────────────────│ - Remote Login enabled   │
└──────────────────────────────┘                                   └──────────────────────────┘
              ▲
              │ Tailscale tailnet (hostname or 100.x.y.z)
              ▼
        user@gateway-host
=======

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#ffffff',
    'primaryTextColor': '#000000',
    'primaryBorderColor': '#000000',
    'lineColor': '#000000',
    'secondaryColor': '#f9f9fb',
    'tertiaryColor': '#ffffff',
    'clusterBkg': '#f9f9fb',
    'clusterBorder': '#000000',
    'nodeBorder': '#000000',
    'mainBkg': '#ffffff',
    'edgeLabelBackground': '#ffffff'
  }
}}%%
flowchart TB
 subgraph T[" "]
 subgraph Tailscale[" "]
    direction LR
      Gateway["<b>Gateway host (Linux/VM)<br></b><br>openclaw gateway<br>channels.imessage.cliPath"]
      Mac["<b>Mac with Messages + imsg<br></b><br>Messages signed in<br>Remote Login enabled"]
  end
    Gateway -- SSH (imsg rpc) --> Mac
    Mac -- SCP (attachments) --> Gateway
    direction BT
    User["user@gateway-host"] -- "Tailscale tailnet (hostname or 100.x.y.z)" --> Gateway
end
>>>>>>> 24e9b23c4 (Replace text diagrams with mermaid (#7165))
```

Concrete config example (Tailscale hostname):
=======
    Control commands from authorized senders can bypass mention gating in groups.

  </Tab>

  <Tab title="Sessions and deterministic replies">
    - DMs use direct routing; groups use group routing.
    - With default `session.dmScope=main`, iMessage DMs collapse into the agent main session.
    - Group sessions are isolated (`agent:<agentId>:imessage:group:<chat_id>`).
    - Replies route back to iMessage using originating channel/target metadata.

    Group-ish thread behavior:

    Some multi-participant iMessage threads can arrive with `is_group=false`.
    If that `chat_id` is explicitly configured under `channels.imessage.groups`, OpenClaw treats it as group traffic (group gating + group session isolation).

  </Tab>
</Tabs>

## Deployment patterns

<AccordionGroup>
  <Accordion title="Dedicated bot macOS user (separate iMessage identity)">
    Use a dedicated Apple ID and macOS user so bot traffic is isolated from your personal Messages profile.

    Typical flow:

    1. Create/sign in a dedicated macOS user.
    2. Sign into Messages with the bot Apple ID in that user.
    3. Install `imsg` in that user.
    4. Create SSH wrapper so OpenClaw can run `imsg` in that user context.
    5. Point `channels.imessage.accounts.<id>.cliPath` and `.dbPath` to that user profile.

    First run may require GUI approvals (Automation + Full Disk Access) in that bot user session.

  </Accordion>

  <Accordion title="Remote Mac over Tailscale (example)">
    Common topology:

    - gateway runs on Linux/VM
    - iMessage + `imsg` runs on a Mac in your tailnet
    - `cliPath` wrapper uses SSH to run `imsg`
    - `remoteHost` enables SCP attachment fetches

    Example:

>>>>>>> 6758b6bfe (docs(channels): modernize imessage docs page (#14213))
```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.clawdbot/scripts/imsg-ssh",
      remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
      includeAttachments: true,
      dbPath: "/Users/bot/Library/Messages/chat.db"
    }
  }
}
```

<<<<<<< HEAD
Example wrapper (`~/.clawdbot/scripts/imsg-ssh`):
=======
>>>>>>> 6758b6bfe (docs(channels): modernize imessage docs page (#14213))
```bash
#!/usr/bin/env bash
exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
```

<<<<<<< HEAD
Notes:
- Ensure the Mac is signed in to Messages, and Remote Login is enabled.
- Use SSH keys so `ssh bot@mac-mini.tailnet-1234.ts.net` works without prompts.
- `remoteHost` should match the SSH target so SCP can fetch attachments.

Multi-account support: use `channels.imessage.accounts` with per-account config and optional `name`. See [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) for the shared pattern. Don't commit `~/.clawdbot/moltbot.json` (it often contains tokens).

## Access control (DMs + groups)
DMs:
- Default: `channels.imessage.dmPolicy = "pairing"`.
- Unknown senders receive a pairing code; messages are ignored until approved (codes expire after 1 hour).
- Approve via:
  - `moltbot pairing list imessage`
  - `moltbot pairing approve imessage <CODE>`
- Pairing is the default token exchange for iMessage DMs. Details: [Pairing](/start/pairing)

Groups:
- `channels.imessage.groupPolicy = open | allowlist | disabled`.
- `channels.imessage.groupAllowFrom` controls who can trigger in groups when `allowlist` is set.
- Mention gating uses `agents.list[].groupChat.mentionPatterns` (or `messages.groupChat.mentionPatterns`) because iMessage has no native mention metadata.
- Multi-agent override: set per-agent patterns on `agents.list[].groupChat.mentionPatterns`.

## How it works (behavior)
- `imsg` streams message events; the gateway normalizes them into the shared channel envelope.
- Replies always route back to the same chat id or handle.

## Group-ish threads (`is_group=false`)
Some iMessage threads can have multiple participants but still arrive with `is_group=false` depending on how Messages stores the chat identifier.

If you explicitly configure a `chat_id` under `channels.imessage.groups`, Moltbot treats that thread as a “group” for:
- session isolation (separate `agent:<agentId>:imessage:group:<chat_id>` session key)
- group allowlisting / mention gating behavior

Example:
=======
    Use SSH keys so both SSH and SCP are non-interactive.

  </Accordion>

  <Accordion title="Multi-account pattern">
    iMessage supports per-account config under `channels.imessage.accounts`.

    Each account can override fields such as `cliPath`, `dbPath`, `allowFrom`, `groupPolicy`, `mediaMaxMb`, and history settings.

  </Accordion>
</AccordionGroup>

## Media, chunking, and delivery targets

<AccordionGroup>
  <Accordion title="Attachments and media">
    - inbound attachment ingestion is optional: `channels.imessage.includeAttachments`
    - remote attachment paths can be fetched via SCP when `remoteHost` is set
    - outbound media size uses `channels.imessage.mediaMaxMb` (default 16 MB)
  </Accordion>

  <Accordion title="Outbound chunking">
    - text chunk limit: `channels.imessage.textChunkLimit` (default 4000)
    - chunk mode: `channels.imessage.chunkMode`
      - `length` (default)
      - `newline` (paragraph-first splitting)
  </Accordion>

  <Accordion title="Addressing formats">
    Preferred explicit targets:

    - `chat_id:123` (recommended for stable routing)
    - `chat_guid:...`
    - `chat_identifier:...`

    Handle targets are also supported:

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

```bash
imsg chats --limit 20
```

  </Accordion>
</AccordionGroup>

## Config writes

iMessage allows channel-initiated config writes by default (for `/config set|unset` when `commands.config: true`).

Disable:

>>>>>>> 6758b6bfe (docs(channels): modernize imessage docs page (#14213))
```json5
{
  channels: {
    imessage: {
<<<<<<< HEAD
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "42": { "requireMention": false }
      }
    }
  }
}
```
This is useful when you want an isolated personality/model for a specific thread (see [Multi-agent routing](/concepts/multi-agent)). For filesystem isolation, see [Sandboxing](/gateway/sandboxing).

## Media + limits
- Optional attachment ingestion via `channels.imessage.includeAttachments`.
- Media cap via `channels.imessage.mediaMaxMb`.

## Limits
- Outbound text is chunked to `channels.imessage.textChunkLimit` (default 4000).
- Optional newline chunking: set `channels.imessage.chunkMode="newline"` to split on blank lines (paragraph boundaries) before length chunking.
- Media uploads are capped by `channels.imessage.mediaMaxMb` (default 16).

## Addressing / delivery targets
Prefer `chat_id` for stable routing:
- `chat_id:123` (preferred)
- `chat_guid:...`
- `chat_identifier:...`
- direct handles: `imessage:+1555` / `sms:+1555` / `user@example.com`

List chats:
```
imsg chats --limit 20
```

## Configuration reference (iMessage)
Full configuration: [Configuration](/gateway/configuration)

Provider options:
- `channels.imessage.enabled`: enable/disable channel startup.
- `channels.imessage.cliPath`: path to `imsg`.
- `channels.imessage.dbPath`: Messages DB path.
- `channels.imessage.remoteHost`: SSH host for SCP attachment transfer when `cliPath` points to a remote Mac (e.g., `user@gateway-host`). Auto-detected from SSH wrapper if not set.
- `channels.imessage.service`: `imessage | sms | auto`.
- `channels.imessage.region`: SMS region.
- `channels.imessage.dmPolicy`: `pairing | allowlist | open | disabled` (default: pairing).
- `channels.imessage.allowFrom`: DM allowlist (handles, emails, E.164 numbers, or `chat_id:*`). `open` requires `"*"`. iMessage has no usernames; use handles or chat targets.
- `channels.imessage.groupPolicy`: `open | allowlist | disabled` (default: allowlist).
- `channels.imessage.groupAllowFrom`: group sender allowlist.
- `channels.imessage.historyLimit` / `channels.imessage.accounts.*.historyLimit`: max group messages to include as context (0 disables).
- `channels.imessage.dmHistoryLimit`: DM history limit in user turns. Per-user overrides: `channels.imessage.dms["<handle>"].historyLimit`.
- `channels.imessage.groups`: per-group defaults + allowlist (use `"*"` for global defaults).
- `channels.imessage.includeAttachments`: ingest attachments into context.
- `channels.imessage.mediaMaxMb`: inbound/outbound media cap (MB).
- `channels.imessage.textChunkLimit`: outbound chunk size (chars).
- `channels.imessage.chunkMode`: `length` (default) or `newline` to split on blank lines (paragraph boundaries) before length chunking.

Related global options:
- `agents.list[].groupChat.mentionPatterns` (or `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.
=======
      configWrites: false,
    },
  },
}
```

## Troubleshooting

<AccordionGroup>
  <Accordion title="imsg not found or RPC unsupported">
    Validate the binary and RPC support:

```bash
imsg rpc --help
openclaw channels status --probe
```

    If probe reports RPC unsupported, update `imsg`.

  </Accordion>

  <Accordion title="DMs are ignored">
    Check:

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - pairing approvals (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="Group messages are ignored">
    Check:

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` allowlist behavior
    - mention pattern configuration (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="Remote attachments fail">
    Check:

    - `channels.imessage.remoteHost`
    - SSH/SCP key auth from the gateway host
    - remote path readability on the Mac running Messages

  </Accordion>

  <Accordion title="macOS permission prompts were missed">
    Re-run in an interactive GUI terminal in the same user/session context and approve prompts:

```bash
imsg chats --limit 1
imsg send <handle> "test"
```

    Confirm Full Disk Access + Automation are granted for the process context that runs OpenClaw/`imsg`.

  </Accordion>
</AccordionGroup>

## Configuration

- [Configuration reference - iMessage](/gateway/configuration-reference#imessage)
- [Gateway configuration](/gateway/configuration)
- [Pairing](/channels/pairing)
- [BlueBubbles](/channels/bluebubbles)
>>>>>>> 6758b6bfe (docs(channels): modernize imessage docs page (#14213))
