---
summary: "WhatsApp channel support, access controls, delivery behavior, and operations"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---
<<<<<<< HEAD
# WhatsApp (web channel)


Status: WhatsApp Web via Baileys only. Gateway owns the session(s).

## Quick setup (beginner)
1) Use a **separate phone number** if possible (recommended).
2) Configure WhatsApp in `~/.clawdbot/moltbot.json`.
3) Run `moltbot channels login` to scan the QR code (Linked Devices).
4) Start the gateway.

Minimal config:
=======

# WhatsApp (Web channel)

Status: production-ready via WhatsApp Web (Baileys). Gateway owns linked session(s).

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/channels/pairing">
    Default DM policy is pairing for unknown senders.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/channels/troubleshooting">
    Cross-channel diagnostics and repair playbooks.
  </Card>
  <Card title="Gateway configuration" icon="settings" href="/gateway/configuration">
    Full channel config patterns and examples.
  </Card>
</CardGroup>

## Quick setup

<Steps>
  <Step title="Configure WhatsApp access policy">

>>>>>>> 8c963dc5a (docs(channels): modernize whatsapp docs page (#14202))
```json5
{
  channels: {
    whatsapp: {
<<<<<<< HEAD
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"]
    }
  }
}
```

## Goals
- Multiple WhatsApp accounts (multi-account) in one Gateway process.
- Deterministic routing: replies return to WhatsApp, no model routing.
- Model sees enough context to understand quoted replies.

## Config writes
By default, WhatsApp is allowed to write config updates triggered by `/config set|unset` (requires `commands.config: true`).

Disable with:
```json5
{
  channels: { whatsapp: { configWrites: false } }
}
```

## Architecture (who owns what)
- **Gateway** owns the Baileys socket and inbox loop.
- **CLI / macOS app** talk to the gateway; no direct Baileys use.
- **Active listener** is required for outbound sends; otherwise send fails fast.
=======
      dmPolicy: "pairing",
      allowFrom: ["+15551234567"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

  </Step>

  <Step title="Link WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    For a specific account:

```bash
openclaw channels login --channel whatsapp --account work
```
>>>>>>> 8c963dc5a (docs(channels): modernize whatsapp docs page (#14202))

  </Step>

<<<<<<< HEAD
WhatsApp requires a real mobile number for verification. VoIP and virtual numbers are usually blocked. There are two supported ways to run Moltbot on WhatsApp:

### Dedicated number (recommended)
Use a **separate phone number** for Moltbot. Best UX, clean routing, no self-chat quirks. Ideal setup: **spare/old Android phone + eSIM**. Leave it on Wi‑Fi and power, and link it via QR.

**WhatsApp Business:** You can use WhatsApp Business on the same device with a different number. Great for keeping your personal WhatsApp separate — install WhatsApp Business and register the Moltbot number there.

**Sample config (dedicated number, single-user allowlist):**
=======
  <Step title="Start the gateway">

```bash
openclaw gateway
```

  </Step>

  <Step title="Approve first pairing request (if using pairing mode)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    Pairing requests expire after 1 hour. Pending requests are capped at 3 per channel.

  </Step>
</Steps>

<Note>
OpenClaw recommends running WhatsApp on a separate number when possible. (The channel metadata and onboarding flow are optimized for that setup, but personal-number setups are also supported.)
</Note>

## Deployment patterns

<AccordionGroup>
  <Accordion title="Dedicated number (recommended)">
    This is the cleanest operational mode:

    - separate WhatsApp identity for OpenClaw
    - clearer DM allowlists and routing boundaries
    - lower chance of self-chat confusion

    Minimal policy pattern:

    ```json5
    {
      channels: {
        whatsapp: {
          dmPolicy: "allowlist",
          allowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Personal-number fallback">
    Onboarding supports personal-number mode and writes a self-chat-friendly baseline:

    - `dmPolicy: "allowlist"`
    - `allowFrom` includes your personal number
    - `selfChatMode: true`

    In runtime, self-chat protections key off the linked self number and `allowFrom`.

  </Accordion>

  <Accordion title="WhatsApp Web-only channel scope">
    The messaging platform channel is WhatsApp Web-based (`Baileys`) in current OpenClaw channel architecture.

    There is no separate Twilio WhatsApp messaging channel in the built-in chat-channel registry.

  </Accordion>
</AccordionGroup>

## Runtime model

- Gateway owns the WhatsApp socket and reconnect loop.
- Outbound sends require an active WhatsApp listener for the target account.
- Status and broadcast chats are ignored (`@status`, `@broadcast`).
- Direct chats use DM session rules (`session.dmScope`; default `main` collapses DMs to the agent main session).
- Group sessions are isolated (`agent:<agentId>:whatsapp:group:<jid>`).

## Access control and activation

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` controls direct chat access:

    - `pairing` (default)
    - `allowlist`
    - `open` (requires `allowFrom` to include `"*"`)
    - `disabled`

    `allowFrom` accepts E.164-style numbers (normalized internally).

    Multi-account override: `channels.whatsapp.accounts.<id>.dmPolicy` (and `allowFrom`) take precedence over channel-level defaults for that account.

    Runtime behavior details:

    - pairings are persisted in channel allow-store and merged with configured `allowFrom`
    - if no allowlist is configured, the linked self number is allowed by default
    - outbound `fromMe` DMs are never auto-paired

  </Tab>

  <Tab title="Group policy + allowlists">
    Group access has two layers:

    1. **Group membership allowlist** (`channels.whatsapp.groups`)
       - if `groups` is omitted, all groups are eligible
       - if `groups` is present, it acts as a group allowlist (`"*"` allowed)

    2. **Group sender policy** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`: sender allowlist bypassed
       - `allowlist`: sender must match `groupAllowFrom` (or `*`)
       - `disabled`: block all group inbound

    Sender allowlist fallback:

    - if `groupAllowFrom` is unset, runtime falls back to `allowFrom` when available
    - sender allowlists are evaluated before mention/reply activation

    Note: if no `channels.whatsapp` block exists at all, runtime group-policy fallback is effectively `open`.

  </Tab>

  <Tab title="Mentions + /activation">
    Group replies require mention by default.

    Mention detection includes:

    - explicit WhatsApp mentions of the bot identity
    - configured mention regex patterns (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - implicit reply-to-bot detection (reply sender matches bot identity)

    Security note:

    - quote/reply only satisfies mention gating; it does **not** grant sender authorization
    - with `groupPolicy: "allowlist"`, non-allowlisted senders are still blocked even if they reply to an allowlisted user's message

    Session-level activation command:

    - `/activation mention`
    - `/activation always`

    `activation` updates session state (not global config). It is owner-gated.

  </Tab>
</Tabs>

## Personal-number and self-chat behavior

When the linked self number is also present in `allowFrom`, WhatsApp self-chat safeguards activate:

- skip read receipts for self-chat turns
- ignore mention-JID auto-trigger behavior that would otherwise ping yourself
- if `messages.responsePrefix` is unset, self-chat replies default to `[{identity.name}]` or `[openclaw]`

## Message normalization and context

<AccordionGroup>
  <Accordion title="Inbound envelope + reply context">
    Incoming WhatsApp messages are wrapped in the shared inbound envelope.

    If a quoted reply exists, context is appended in this form:

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    Reply metadata fields are also populated when available (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, sender JID/E.164).

  </Accordion>

  <Accordion title="Media placeholders and location/contact extraction">
    Media-only inbound messages are normalized with placeholders such as:

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Location and contact payloads are normalized into textual context before routing.

  </Accordion>

  <Accordion title="Pending group history injection">
    For groups, unprocessed messages can be buffered and injected as context when the bot is finally triggered.

    - default limit: `50`
    - config: `channels.whatsapp.historyLimit`
    - fallback: `messages.groupChat.historyLimit`
    - `0` disables

    Injection markers:

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Read receipts">
    Read receipts are enabled by default for accepted inbound WhatsApp messages.

    Disable globally:

    ```json5
    {
      channels: {
        whatsapp: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    Per-account override:

    ```json5
    {
      channels: {
        whatsapp: {
          accounts: {
            work: {
              sendReadReceipts: false,
            },
          },
        },
      },
    }
    ```

    Self-chat turns skip read receipts even when globally enabled.

  </Accordion>
</AccordionGroup>

## Delivery, chunking, and media

<AccordionGroup>
  <Accordion title="Text chunking">
    - default chunk limit: `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` mode prefers paragraph boundaries (blank lines), then falls back to length-safe chunking
  </Accordion>

  <Accordion title="Outbound media behavior">
    - supports image, video, audio (PTT voice-note), and document payloads
    - `audio/ogg` is rewritten to `audio/ogg; codecs=opus` for voice-note compatibility
    - animated GIF playback is supported via `gifPlayback: true` on video sends
    - captions are applied to the first media item when sending multi-media reply payloads
    - media source can be HTTP(S), `file://`, or local paths
  </Accordion>

  <Accordion title="Media size limits and fallback behavior">
    - inbound media save cap: `channels.whatsapp.mediaMaxMb` (default `50`)
    - outbound media cap for auto-replies: `agents.defaults.mediaMaxMb` (default `5MB`)
    - images are auto-optimized (resize/quality sweep) to fit limits
    - on media send failure, first-item fallback sends text warning instead of dropping the response silently
  </Accordion>
</AccordionGroup>

## Acknowledgment reactions

WhatsApp supports immediate ack reactions on inbound receipt via `channels.whatsapp.ackReaction`.

>>>>>>> 8c963dc5a (docs(channels): modernize whatsapp docs page (#14202))
```json5
{
  channels: {
    whatsapp: {
<<<<<<< HEAD
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"]
    }
  }
}
```

**Pairing mode (optional):**
If you want pairing instead of allowlist, set `channels.whatsapp.dmPolicy` to `pairing`. Unknown senders get a pairing code; approve with:
`moltbot pairing approve whatsapp <code>`

### Personal number (fallback)
Quick fallback: run Moltbot on **your own number**. Message yourself (WhatsApp “Message yourself”) for testing so you don’t spam contacts. Expect to read verification codes on your main phone during setup and experiments. **Must enable self-chat mode.**
When the wizard asks for your personal WhatsApp number, enter the phone you will message from (the owner/sender), not the assistant number.

**Sample config (personal number, self-chat):**
```json
{
  "whatsapp": {
    "selfChatMode": true,
    "dmPolicy": "allowlist",
    "allowFrom": ["+15551234567"]
  }
}
```

Self-chat replies default to `[{identity.name}]` when set (otherwise `[moltbot]`)
if `messages.responsePrefix` is unset. Set it explicitly to customize or disable
the prefix (use `""` to remove it).

### Number sourcing tips
- **Local eSIM** from your country's mobile carrier (most reliable)
  - Austria: [hot.at](https://www.hot.at)
  - UK: [giffgaff](https://www.giffgaff.com) — free SIM, no contract
- **Prepaid SIM** — cheap, just needs to receive one SMS for verification

**Avoid:** TextNow, Google Voice, most "free SMS" services — WhatsApp blocks these aggressively.

**Tip:** The number only needs to receive one verification SMS. After that, WhatsApp Web sessions persist via `creds.json`.

## Why Not Twilio?
- Early Moltbot builds supported Twilio’s WhatsApp Business integration.
- WhatsApp Business numbers are a poor fit for a personal assistant.
- Meta enforces a 24‑hour reply window; if you haven’t responded in the last 24 hours, the business number can’t initiate new messages.
- High-volume or “chatty” usage triggers aggressive blocking, because business accounts aren’t meant to send dozens of personal assistant messages.
- Result: unreliable delivery and frequent blocks, so support was removed.

## Login + credentials
- Login command: `moltbot channels login` (QR via Linked Devices).
- Multi-account login: `moltbot channels login --account <id>` (`<id>` = `accountId`).
- Default account (when `--account` is omitted): `default` if present, otherwise the first configured account id (sorted).
- Credentials stored in `~/.clawdbot/credentials/whatsapp/<accountId>/creds.json`.
- Backup copy at `creds.json.bak` (restored on corruption).
- Legacy compatibility: older installs stored Baileys files directly in `~/.clawdbot/credentials/`.
- Logout: `moltbot channels logout` (or `--account <id>`) deletes WhatsApp auth state (but keeps shared `oauth.json`).
- Logged-out socket => error instructs re-link.

## Inbound flow (DM + group)
- WhatsApp events come from `messages.upsert` (Baileys).
- Inbox listeners are detached on shutdown to avoid accumulating event handlers in tests/restarts.
- Status/broadcast chats are ignored.
- Direct chats use E.164; groups use group JID.
- **DM policy**: `channels.whatsapp.dmPolicy` controls direct chat access (default: `pairing`).
  - Pairing: unknown senders get a pairing code (approve via `moltbot pairing approve whatsapp <code>`; codes expire after 1 hour).
  - Open: requires `channels.whatsapp.allowFrom` to include `"*"`.
  - Your linked WhatsApp number is implicitly trusted, so self messages skip ⁠`channels.whatsapp.dmPolicy` and `channels.whatsapp.allowFrom` checks.

### Personal-number mode (fallback)
If you run Moltbot on your **personal WhatsApp number**, enable `channels.whatsapp.selfChatMode` (see sample above).

Behavior:
- Outbound DMs never trigger pairing replies (prevents spamming contacts).
- Inbound unknown senders still follow `channels.whatsapp.dmPolicy`.
- Self-chat mode (allowFrom includes your number) avoids auto read receipts and ignores mention JIDs.
- Read receipts sent for non-self-chat DMs.

## Read receipts
By default, the gateway marks inbound WhatsApp messages as read (blue ticks) once they are accepted.

Disable globally:
```json5
{
  channels: { whatsapp: { sendReadReceipts: false } }
}
```

Disable per account:
```json5
{
  channels: {
    whatsapp: {
      accounts: {
        personal: { sendReadReceipts: false }
      }
    }
  }
}
```

Notes:
- Self-chat mode always skips read receipts.
=======
      ackReaction: {
        emoji: "👀",
        direct: true,
        group: "mentions", // always | mentions | never
      },
    },
  },
}
```

Behavior notes:

- sent immediately after inbound is accepted (pre-reply)
- failures are logged but do not block normal reply delivery
- group mode `mentions` reacts on mention-triggered turns; group activation `always` acts as bypass for this check
- WhatsApp uses `channels.whatsapp.ackReaction` (legacy `messages.ackReaction` is not used here)
>>>>>>> 8c963dc5a (docs(channels): modernize whatsapp docs page (#14202))

## Multi-account and credentials

<<<<<<< HEAD
**Will Moltbot message random contacts when I link WhatsApp?**  
No. Default DM policy is **pairing**, so unknown senders only get a pairing code and their message is **not processed**. Moltbot only replies to chats it receives, or to sends you explicitly trigger (agent/CLI).

**How does pairing work on WhatsApp?**  
Pairing is a DM gate for unknown senders:
- First DM from a new sender returns a short code (message is not processed).
- Approve with: `moltbot pairing approve whatsapp <code>` (list with `moltbot pairing list whatsapp`).
- Codes expire after 1 hour; pending requests are capped at 3 per channel.

**Can multiple people use different Moltbots on one WhatsApp number?**  
Yes, by routing each sender to a different agent via `bindings` (peer `kind: "dm"`, sender E.164 like `+15551234567`). Replies still come from the **same WhatsApp account**, and direct chats collapse to each agent’s main session, so use **one agent per person**. DM access control (`dmPolicy`/`allowFrom`) is global per WhatsApp account. See [Multi-Agent Routing](/concepts/multi-agent).
=======
<AccordionGroup>
  <Accordion title="Account selection and defaults">
    - account ids come from `channels.whatsapp.accounts`
    - default account selection: `default` if present, otherwise first configured account id (sorted)
    - account ids are normalized internally for lookup
  </Accordion>

  <Accordion title="Credential paths and legacy compatibility">
    - current auth path: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - backup file: `creds.json.bak`
    - legacy default auth in `~/.openclaw/credentials/` is still recognized/migrated for default-account flows
  </Accordion>

  <Accordion title="Logout behavior">
    `openclaw channels logout --channel whatsapp [--account <id>]` clears WhatsApp auth state for that account.

    In legacy auth directories, `oauth.json` is preserved while Baileys auth files are removed.
>>>>>>> 8c963dc5a (docs(channels): modernize whatsapp docs page (#14202))

  </Accordion>
</AccordionGroup>

<<<<<<< HEAD
## Message normalization (what the model sees)
- `Body` is the current message body with envelope.
- Quoted reply context is **always appended**:
=======
## Tools, actions, and config writes

- Agent tool support includes WhatsApp reaction action (`react`).
- Action gates:
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Channel-initiated config writes are enabled by default (disable via `channels.whatsapp.configWrites=false`).
>>>>>>> 8c963dc5a (docs(channels): modernize whatsapp docs page (#14202))

## Troubleshooting

<AccordionGroup>
  <Accordion title="Not linked (QR required)">
    Symptom: channel status reports not linked.

<<<<<<< HEAD
## Groups
- Groups map to `agent:<agentId>:whatsapp:group:<jid>` sessions.
- Group policy: `channels.whatsapp.groupPolicy = open|disabled|allowlist` (default `allowlist`).
- Activation modes:
  - `mention` (default): requires @mention or regex match.
  - `always`: always triggers.
- `/activation mention|always` is owner-only and must be sent as a standalone message.
- Owner = `channels.whatsapp.allowFrom` (or self E.164 if unset).
- **History injection** (pending-only):
  - Recent *unprocessed* messages (default 50) inserted under:
    `[Chat messages since your last reply - for context]` (messages already in the session are not re-injected)
  - Current message under:
    `[Current message - respond to this]`
  - Sender suffix appended: `[from: Name (+E164)]`
- Group metadata cached 5 min (subject + participants).

## Reply delivery (threading)
- WhatsApp Web sends standard messages (no quoted reply threading in the current gateway).
- Reply tags are ignored on this channel.
=======
    Fix:

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="Linked but disconnected / reconnect loop">
    Symptom: linked account with repeated disconnects or reconnect attempts.
>>>>>>> 8c963dc5a (docs(channels): modernize whatsapp docs page (#14202))

    Fix:

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

<<<<<<< HEAD
**Configuration:**
```json
{
  "whatsapp": {
    "ackReaction": {
      "emoji": "👀",
      "direct": true,
      "group": "mentions"
    }
  }
}
```

**Options:**
- `emoji` (string): Emoji to use for acknowledgment (e.g., "👀", "✅", "📨"). Empty or omitted = feature disabled.
- `direct` (boolean, default: `true`): Send reactions in direct/DM chats.
- `group` (string, default: `"mentions"`): Group chat behavior:
  - `"always"`: React to all group messages (even without @mention)
  - `"mentions"`: React only when bot is @mentioned
  - `"never"`: Never react in groups

**Per-account override:**
```json
{
  "whatsapp": {
    "accounts": {
      "work": {
        "ackReaction": {
          "emoji": "✅",
          "direct": false,
          "group": "always"
        }
      }
    }
  }
}
```

**Behavior notes:**
- Reactions are sent **immediately** upon message receipt, before typing indicators or bot replies.
- In groups with `requireMention: false` (activation: always), `group: "mentions"` will react to all messages (not just @mentions).
- Fire-and-forget: reaction failures are logged but don't prevent the bot from replying.
- Participant JID is automatically included for group reactions.
- WhatsApp ignores `messages.ackReaction`; use `channels.whatsapp.ackReaction` instead.

## Agent tool (reactions)
- Tool: `whatsapp` with `react` action (`chatJid`, `messageId`, `emoji`, optional `remove`).
- Optional: `participant` (group sender), `fromMe` (reacting to your own message), `accountId` (multi-account).
- Reaction removal semantics: see [/tools/reactions](/tools/reactions).
- Tool gating: `channels.whatsapp.actions.reactions` (default: enabled).

## Limits
- Outbound text is chunked to `channels.whatsapp.textChunkLimit` (default 4000).
- Optional newline chunking: set `channels.whatsapp.chunkMode="newline"` to split on blank lines (paragraph boundaries) before length chunking.
- Inbound media saves are capped by `channels.whatsapp.mediaMaxMb` (default 50 MB).
- Outbound media items are capped by `agents.defaults.mediaMaxMb` (default 5 MB).

## Outbound send (text + media)
- Uses active web listener; error if gateway not running.
- Text chunking: 4k max per message (configurable via `channels.whatsapp.textChunkLimit`, optional `channels.whatsapp.chunkMode`).
- Media:
  - Image/video/audio/document supported.
  - Audio sent as PTT; `audio/ogg` => `audio/ogg; codecs=opus`.
  - Caption only on first media item.
  - Media fetch supports HTTP(S) and local paths.
  - Animated GIFs: WhatsApp expects MP4 with `gifPlayback: true` for inline looping.
    - CLI: `moltbot message send --media <mp4> --gif-playback`
    - Gateway: `send` params include `gifPlayback: true`

## Voice notes (PTT audio)
WhatsApp sends audio as **voice notes** (PTT bubble).
- Best results: OGG/Opus. Moltbot rewrites `audio/ogg` to `audio/ogg; codecs=opus`.
- `[[audio_as_voice]]` is ignored for WhatsApp (audio already ships as voice note).

## Media limits + optimization
- Default outbound cap: 5 MB (per media item).
- Override: `agents.defaults.mediaMaxMb`.
- Images are auto-optimized to JPEG under cap (resize + quality sweep).
- Oversize media => error; media reply falls back to text warning.

## Heartbeats
- **Gateway heartbeat** logs connection health (`web.heartbeatSeconds`, default 60s).
- **Agent heartbeat** can be configured per agent (`agents.list[].heartbeat`) or globally
  via `agents.defaults.heartbeat` (fallback when no per-agent entries are set).
  - Uses the configured heartbeat prompt (default: `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`) + `HEARTBEAT_OK` skip behavior.
  - Delivery defaults to the last used channel (or configured target).

## Reconnect behavior
- Backoff policy: `web.reconnect`:
  - `initialMs`, `maxMs`, `factor`, `jitter`, `maxAttempts`.
- If maxAttempts reached, web monitoring stops (degraded).
- Logged-out => stop and require re-link.

## Config quick map
- `channels.whatsapp.dmPolicy` (DM policy: pairing/allowlist/open/disabled).
- `channels.whatsapp.selfChatMode` (same-phone setup; bot uses your personal WhatsApp number).
- `channels.whatsapp.allowFrom` (DM allowlist). WhatsApp uses E.164 phone numbers (no usernames).
- `channels.whatsapp.mediaMaxMb` (inbound media save cap).
- `channels.whatsapp.ackReaction` (auto-reaction on message receipt: `{emoji, direct, group}`).
- `channels.whatsapp.accounts.<accountId>.*` (per-account settings + optional `authDir`).
- `channels.whatsapp.accounts.<accountId>.mediaMaxMb` (per-account inbound media cap).
- `channels.whatsapp.accounts.<accountId>.ackReaction` (per-account ack reaction override).
- `channels.whatsapp.groupAllowFrom` (group sender allowlist).
- `channels.whatsapp.groupPolicy` (group policy).
- `channels.whatsapp.historyLimit` / `channels.whatsapp.accounts.<accountId>.historyLimit` (group history context; `0` disables).
- `channels.whatsapp.dmHistoryLimit` (DM history limit in user turns). Per-user overrides: `channels.whatsapp.dms["<phone>"].historyLimit`.
- `channels.whatsapp.groups` (group allowlist + mention gating defaults; use `"*"` to allow all)
- `channels.whatsapp.actions.reactions` (gate WhatsApp tool reactions).
- `agents.list[].groupChat.mentionPatterns` (or `messages.groupChat.mentionPatterns`)
- `messages.groupChat.historyLimit`
- `channels.whatsapp.messagePrefix` (inbound prefix; per-account: `channels.whatsapp.accounts.<accountId>.messagePrefix`; deprecated: `messages.messagePrefix`)
- `messages.responsePrefix` (outbound prefix)
- `agents.defaults.mediaMaxMb`
- `agents.defaults.heartbeat.every`
- `agents.defaults.heartbeat.model` (optional override)
- `agents.defaults.heartbeat.target`
- `agents.defaults.heartbeat.to`
- `agents.defaults.heartbeat.session`
- `agents.list[].heartbeat.*` (per-agent overrides)
- `session.*` (scope, idle, store, mainKey)
- `web.enabled` (disable channel startup when false)
- `web.heartbeatSeconds`
- `web.reconnect.*`

## Logs + troubleshooting
- Subsystems: `whatsapp/inbound`, `whatsapp/outbound`, `web-heartbeat`, `web-reconnect`.
- Log file: `/tmp/moltbot/moltbot-YYYY-MM-DD.log` (configurable).
- Troubleshooting guide: [Gateway troubleshooting](/gateway/troubleshooting).

## Troubleshooting (quick)

**Not linked / QR login required**
- Symptom: `channels status` shows `linked: false` or warns “Not linked”.
- Fix: run `moltbot channels login` on the gateway host and scan the QR (WhatsApp → Settings → Linked Devices).

**Linked but disconnected / reconnect loop**
- Symptom: `channels status` shows `running, disconnected` or warns “Linked but disconnected”.
- Fix: `moltbot doctor` (or restart the gateway). If it persists, relink via `channels login` and inspect `moltbot logs --follow`.

**Bun runtime**
- Bun is **not recommended**. WhatsApp (Baileys) and Telegram are unreliable on Bun.
  Run the gateway with **Node**. (See Getting Started runtime note.)
=======
    If needed, re-link with `channels login`.

  </Accordion>

  <Accordion title="No active listener when sending">
    Outbound sends fail fast when no active gateway listener exists for the target account.

    Make sure gateway is running and the account is linked.

  </Accordion>

  <Accordion title="Group messages unexpectedly ignored">
    Check in this order:

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` allowlist entries
    - mention gating (`requireMention` + mention patterns)
    - duplicate keys in `openclaw.json` (JSON5): later entries override earlier ones, so keep a single `groupPolicy` per scope

  </Accordion>

  <Accordion title="Bun runtime warning">
    WhatsApp gateway runtime should use Node. Bun is flagged as incompatible for stable WhatsApp/Telegram gateway operation.
  </Accordion>
</AccordionGroup>

## Configuration reference pointers

Primary reference:

- [Configuration reference - WhatsApp](/gateway/configuration-reference#whatsapp)

High-signal WhatsApp fields:

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, account-level overrides
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- session behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## Related

- [Pairing](/channels/pairing)
- [Channel routing](/channels/channel-routing)
- [Multi-agent routing](/concepts/multi-agent)
- [Troubleshooting](/channels/troubleshooting)
>>>>>>> 8c963dc5a (docs(channels): modernize whatsapp docs page (#14202))
