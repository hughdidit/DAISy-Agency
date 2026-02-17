---
summary: "Discord bot support status, capabilities, and configuration"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

Status: ready for DMs and guild channels via the official Discord gateway.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/channels/pairing">
    Discord DMs default to pairing mode.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/tools/slash-commands">
    Native command behavior and command catalog.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/channels/troubleshooting">
    Cross-channel diagnostics and repair flow.
  </Card>
</CardGroup>

## Quick setup

<Steps>
  <Step title="Create a Discord bot and enable intents">
    Create an application in the Discord Developer Portal, add a bot, then enable:

    - **Message Content Intent**
    - **Server Members Intent** (recommended for name-to-ID lookups and allowlist matching)

  </Step>

  <Step title="Configure token">

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN",
    },
  },
}
```

    Env fallback for the default account:

```bash
DISCORD_BOT_TOKEN=...
```

  </Step>

  <Step title="Invite the bot and start gateway">
    Invite the bot to your server with message permissions.

```bash
openclaw gateway
```

  </Step>

  <Step title="Approve first DM pairing">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

    Pairing codes expire after 1 hour.

  </Step>
</Steps>

<Note>
Token resolution is account-aware. Config token values win over env fallback. `DISCORD_BOT_TOKEN` is only used for the default account.
</Note>

## Runtime model

- Gateway owns the Discord connection.
- Reply routing is deterministic: Discord inbound replies back to Discord.
- By default (`session.dmScope=main`), direct chats share the agent main session (`agent:main:main`).
- Guild channels are isolated session keys (`agent:<agentId>:discord:channel:<channelId>`).
- Group DMs are ignored by default (`channels.discord.dm.groupEnabled=false`).
- Native slash commands run in isolated command sessions (`agent:<agentId>:discord:slash:<userId>`), while still carrying `CommandTargetSessionKey` to the routed conversation session.

## Access control and routing

<Tabs>
  <Tab title="DM policy">
    `channels.discord.dmPolicy` controls DM access (legacy: `channels.discord.dm.policy`):

    - `pairing` (default)
    - `allowlist`
    - `open` (requires `channels.discord.allowFrom` to include `"*"`; legacy: `channels.discord.dm.allowFrom`)
    - `disabled`

    If DM policy is not open, unknown users are blocked (or prompted for pairing in `pairing` mode).

    DM target format for delivery:

    - `user:<id>`
    - `<@id>` mention

    Bare numeric IDs are ambiguous and rejected unless an explicit user/channel target kind is provided.

  </Tab>

  <Tab title="Guild policy">
    Guild handling is controlled by `channels.discord.groupPolicy`:

    - `open`
    - `allowlist`
    - `disabled`

    Secure baseline when `channels.discord` exists is `allowlist`.

    `allowlist` behavior:

    - guild must match `channels.discord.guilds` (`id` preferred, slug accepted)
    - if a guild has `channels` configured, non-listed channels are denied
    - if a guild has no `channels` block, all channels in that allowlisted guild are allowed

    Example:

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          users: ["987654321098765432"],
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

    If you only set `DISCORD_BOT_TOKEN` and do not create a `channels.discord` block, runtime fallback is `groupPolicy="open"` (with a warning in logs).

  </Tab>

  <Tab title="Mentions and group DMs">
    Guild messages are mention-gated by default.

    Mention detection includes:

    - explicit bot mention
    - configured mention patterns (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - implicit reply-to-bot behavior in supported cases

    `requireMention` is configured per guild/channel (`channels.discord.guilds...`).

    Group DMs:

    - default: ignored (`dm.groupEnabled=false`)
    - optional allowlist via `dm.groupChannels` (channel IDs or slugs)

  </Tab>
</Tabs>

## Developer Portal setup

<AccordionGroup>
  <Accordion title="Create app and bot">

    1. Discord Developer Portal -> **Applications** -> **New Application**
    2. **Bot** -> **Add Bot**
    3. Copy bot token

  </Accordion>

  <Accordion title="Privileged intents">
    In **Bot -> Privileged Gateway Intents**, enable:

    - Message Content Intent
    - Server Members Intent (recommended)

    Presence intent is optional and only required if you want to receive presence updates. Setting bot presence (`setPresence`) does not require enabling presence updates for members.

  </Accordion>

  <Accordion title="OAuth scopes and baseline permissions">
    OAuth URL generator:

    - scopes: `bot`, `applications.commands`

    Typical baseline permissions:

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions (optional)

    Avoid `Administrator` unless explicitly needed.

  </Accordion>

  <Accordion title="Copy IDs">
    Enable Discord Developer Mode, then copy:

    - server ID
    - channel ID
    - user ID

    Prefer numeric IDs in OpenClaw config for reliable audits and probes.

  </Accordion>
</AccordionGroup>

## Native commands and command auth

- `commands.native` defaults to `"auto"` and is enabled for Discord.
- Per-channel override: `channels.discord.commands.native`.
- `commands.native=false` explicitly clears previously registered Discord native commands.
- Native command auth uses the same Discord allowlists/policies as normal message handling.
- Commands may still be visible in Discord UI for users who are not authorized; execution still enforces OpenClaw auth and returns "not authorized".

See [Slash commands](/tools/slash-commands) for command catalog and behavior.

## Feature details

<AccordionGroup>
  <Accordion title="Reply tags and native replies">
    Discord supports reply tags in agent output:

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    Controlled by `channels.discord.replyToMode`:

    - `off` (default)
    - `first`
    - `all`

    Message IDs are surfaced in context/history so agents can target specific messages.

  </Accordion>

  <Accordion title="History, context, and thread behavior">
    Guild history context:

    - `channels.discord.historyLimit` default `20`
    - fallback: `messages.groupChat.historyLimit`
    - `0` disables

    DM history controls:

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    Thread behavior:

    - Discord threads are routed as channel sessions
    - parent thread metadata can be used for parent-session linkage
    - thread config inherits parent channel config unless a thread-specific entry exists

    Channel topics are injected as **untrusted** context (not as system prompt).

  </Accordion>

  <Accordion title="Reaction notifications">
    Per-guild reaction notification mode:

    - `off`
    - `own` (default)
    - `all`
    - `allowlist` (uses `guilds.<id>.users`)

    Reaction events are turned into system events and attached to the routed Discord session.

  </Accordion>

  <Accordion title="Config writes">
    Channel-initiated config writes are enabled by default.

    This affects `/config set|unset` flows (when command features are enabled).

    Disable:

```json5
{
  channels: {
    discord: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

<<<<<<< HEAD
<<<<<<< HEAD
- `dm.enabled`: set `false` to ignore all DMs (default `true`).
- `dm.policy`: DM access control (`pairing` recommended). `"open"` requires `dm.allowFrom=["*"]`.
- `dm.allowFrom`: DM allowlist (user ids or names). Used by `dm.policy="allowlist"` and for `dm.policy="open"` validation. The wizard accepts usernames and resolves them to ids when the bot can search members.
- `dm.groupEnabled`: enable group DMs (default `false`).
- `dm.groupChannels`: optional allowlist for group DM channel ids or slugs.
- `groupPolicy`: controls guild channel handling (`open|disabled|allowlist`); `allowlist` requires channel allowlists.
- `guilds`: per-guild rules keyed by guild id (preferred) or slug.
- `guilds."*"`: default per-guild settings applied when no explicit entry exists.
- `guilds.<id>.slug`: optional friendly slug used for display names.
- `guilds.<id>.users`: optional per-guild user allowlist (ids or names).
- `guilds.<id>.tools`: optional per-guild tool policy overrides (`allow`/`deny`/`alsoAllow`) used when the channel override is missing.
- `guilds.<id>.toolsBySender`: optional per-sender tool policy overrides at the guild level (applies when the channel override is missing; `"*"` wildcard supported).
- `guilds.<id>.channels.<channel>.allow`: allow/deny the channel when `groupPolicy="allowlist"`.
- `guilds.<id>.channels.<channel>.requireMention`: mention gating for the channel.
- `guilds.<id>.channels.<channel>.tools`: optional per-channel tool policy overrides (`allow`/`deny`/`alsoAllow`).
- `guilds.<id>.channels.<channel>.toolsBySender`: optional per-sender tool policy overrides within the channel (`"*"` wildcard supported).
- `guilds.<id>.channels.<channel>.users`: optional per-channel user allowlist.
- `guilds.<id>.channels.<channel>.skills`: skill filter (omit = all skills, empty = none).
- `guilds.<id>.channels.<channel>.systemPrompt`: extra system prompt for the channel. Discord channel topics are injected as **untrusted** context (not system prompt).
- `guilds.<id>.channels.<channel>.enabled`: set `false` to disable the channel.
- `guilds.<id>.channels`: channel rules (keys are channel slugs or ids).
- `guilds.<id>.requireMention`: per-guild mention requirement (overridable per channel).
- `guilds.<id>.reactionNotifications`: reaction system event mode (`off`, `own`, `all`, `allowlist`).
- `textChunkLimit`: outbound text chunk size (chars). Default: 2000.
- `chunkMode`: `length` (default) splits only when exceeding `textChunkLimit`; `newline` splits on blank lines (paragraph boundaries) before length chunking.
- `maxLinesPerMessage`: soft max line count per message. Default: 17.
- `mediaMaxMb`: clamp inbound media saved to disk.
- `historyLimit`: number of recent guild messages to include as context when replying to a mention (default 20; falls back to `messages.groupChat.historyLimit`; `0` disables).
- `dmHistoryLimit`: DM history limit in user turns. Per-user overrides: `dms["<user_id>"].historyLimit`.
- `retry`: retry policy for outbound Discord API calls (attempts, minDelayMs, maxDelayMs, jitter).
- `pluralkit`: resolve PluralKit proxied messages so system members appear as distinct senders.
- `actions`: per-action tool gates; omit to allow all (set `false` to disable).
  - `reactions` (covers react + read reactions)
  - `stickers`, `emojiUploads`, `stickerUploads`, `polls`, `permissions`, `messages`, `threads`, `pins`, `search`
  - `memberInfo`, `roleInfo`, `channelInfo`, `voiceStatus`, `events`
  - `channels` (create/edit/delete channels + categories + permissions)
  - `roles` (role add/remove, default `false`)
  - `moderation` (timeout/kick/ban, default `false`)
  - `presence` (bot status/activity, default `false`)
- `execApprovals`: Discord-only exec approval DMs (button UI). Supports `enabled`, `approvers`, `agentFilter`, `sessionFilter`.
=======
  <Accordion title="Gateway proxy">
    Route Discord gateway WebSocket traffic and startup REST lookups (application ID + allowlist resolution) through an HTTP(S) proxy with `channels.discord.proxy`.
>>>>>>> c0c367fde (docs: clarify discord proxy scope for startup REST calls)

Reaction notifications use `guilds.<id>.reactionNotifications`:

- `off`: no reaction events.
- `own`: reactions on the bot's own messages (default).
- `all`: all reactions on all messages.
- `allowlist`: reactions from `guilds.<id>.users` on all messages (empty list disables).

### PluralKit (PK) support

Enable PK lookups so proxied messages resolve to the underlying system + member.
When enabled, OpenClaw uses the member identity for allowlists and labels the
sender as `Member (PK:System)` to avoid accidental Discord pings.
=======
  <Accordion title="PluralKit support">
    Enable PluralKit resolution to map proxied messages to system member identity:
>>>>>>> 6bee63864 (docs(channels): modernize discord docs page (#14190))

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // optional; needed for private systems
      },
    },
  },
}
```

    Notes:

    - allowlists can use `pk:<memberId>`
    - member display names are matched by name/slug
    - lookups use original message ID and are time-window constrained
    - if lookup fails, proxied messages are treated as bot messages and dropped unless `allowBots=true`

  </Accordion>

  <Accordion title="Presence configuration">
    Presence updates are applied only when you set a status or activity field.

    Status only example:

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    Activity example (custom status is the default activity type):

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    Streaming example:

```json5
{
  channels: {
    discord: {
      activity: "Live coding",
      activityType: 1,
      activityUrl: "https://twitch.tv/openclaw",
    },
  },
}
```

    Activity type map:

    - 0: Playing
    - 1: Streaming (requires `activityUrl`)
    - 2: Listening
    - 3: Watching
    - 4: Custom (uses the activity text as the status state; emoji is optional)
    - 5: Competing

  </Accordion>

  <Accordion title="Exec approvals in Discord">
    Discord supports button-based exec approvals in DMs.

    Config path:

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    If approvals fail with unknown approval IDs, verify approver list and feature enablement.

    Related docs: [Exec approvals](/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## Tools and action gates

Discord message actions include messaging, channel admin, moderation, presence, and metadata actions.

Core examples:

- messaging: `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- reactions: `react`, `reactions`, `emojiList`
- moderation: `timeout`, `kick`, `ban`
- presence: `setPresence`

Action gates live under `channels.discord.actions.*`.

Default gate behavior:

| Action group                                                                                                                                                             | Default  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | enabled  |
| roles                                                                                                                                                                    | disabled |
| moderation                                                                                                                                                               | disabled |
| presence                                                                                                                                                                 | disabled |

## Troubleshooting

<AccordionGroup>
  <Accordion title="Used disallowed intents or bot sees no guild messages">

    - enable Message Content Intent
    - enable Server Members Intent when you depend on user/member resolution
    - restart gateway after changing intents

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - verify `groupPolicy`
    - verify guild allowlist under `channels.discord.guilds`
    - if guild `channels` map exists, only listed channels are allowed
    - verify `requireMention` behavior and mention patterns

    Useful checks:

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention false but still blocked">
    Common causes:

    - `groupPolicy="allowlist"` without matching guild/channel allowlist
    - `requireMention` configured in the wrong place (must be under `channels.discord.guilds` or channel entry)
    - sender blocked by guild/channel `users` allowlist

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    `channels status --probe` permission checks only work for numeric channel IDs.

    If you use slug keys, runtime matching can still work, but probe cannot fully verify permissions.

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM disabled: `channels.discord.dm.enabled=false`
    - DM policy disabled: `channels.discord.dmPolicy="disabled"` (legacy: `channels.discord.dm.policy`)
    - awaiting pairing approval in `pairing` mode

  </Accordion>

  <Accordion title="Bot to bot loops">
    By default bot-authored messages are ignored.

    If you set `channels.discord.allowBots=true`, use strict mention and allowlist rules to avoid loop behavior.

  </Accordion>
</AccordionGroup>

## Configuration reference pointers

Primary reference:

- [Configuration reference - Discord](/gateway/configuration-reference#discord)

High-signal Discord fields:

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- media/retry: `mediaMaxMb`, `retry`
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- features: `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## Safety and operations

- Treat bot tokens as secrets (`DISCORD_BOT_TOKEN` preferred in supervised environments).
- Grant least-privilege Discord permissions.
- If command deploy/state is stale, restart gateway and re-check with `openclaw channels status --probe`.

## Related

- [Pairing](/channels/pairing)
- [Channel routing](/channels/channel-routing)
- [Troubleshooting](/channels/troubleshooting)
- [Slash commands](/tools/slash-commands)
