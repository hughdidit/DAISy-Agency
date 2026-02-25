---
summary: "Discord bot support status, capabilities, and configuration"
read_when:
  - Working on Discord channel features
---
# Discord (Bot API)


Status: ready for DM and guild text channels via the official Discord bot gateway.

## Quick setup (beginner)
1) Create a Discord bot and copy the bot token.
2) In the Discord app settings, enable **Message Content Intent** (and **Server Members Intent** if you plan to use allowlists or name lookups).
3) Set the token for OpenClaw:
   - Env: `DISCORD_BOT_TOKEN=...`
   - Or config: `channels.discord.token: "..."`.
   - If both are set, config takes precedence (env fallback is default-account only).
4) Invite the bot to your server with message permissions (create a private server if you just want DMs).
5) Start the gateway.
6) DM access is pairing by default; approve the pairing code on first contact.

Minimal config:
```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN"
    }
  }
}
```

## Goals
- Talk to OpenClaw via Discord DMs or guild channels.
- Direct chats collapse into the agent's main session (default `agent:main:main`); guild channels stay isolated as `agent:<agentId>:discord:channel:<channelId>` (display names use `discord:<guildSlug>#<channelSlug>`).
- Group DMs are ignored by default; enable via `channels.discord.dm.groupEnabled` and optionally restrict by `channels.discord.dm.groupChannels`.
- Keep routing deterministic: replies always go back to the channel they arrived on.

## How it works
1. Create a Discord application → Bot, enable the intents you need (DMs + guild messages + message content), and grab the bot token.
2. Invite the bot to your server with the permissions required to read/send messages where you want to use it.
3. Configure OpenClaw with `channels.discord.token` (or `DISCORD_BOT_TOKEN` as a fallback).
4. Run the gateway; it auto-starts the Discord channel when a token is available (config first, env fallback) and `channels.discord.enabled` is not `false`.
   - If you prefer env vars, set `DISCORD_BOT_TOKEN` (a config block is optional).
5. Direct chats: use `user:<id>` (or a `<@id>` mention) when delivering; all turns land in the shared `main` session. Bare numeric IDs are ambiguous and rejected.
6. Guild channels: use `channel:<channelId>` for delivery. Mentions are required by default and can be set per guild or per channel.
7. Direct chats: secure by default via `channels.discord.dm.policy` (default: `"pairing"`). Unknown senders get a pairing code (expires after 1 hour); approve via `openclaw pairing approve discord <code>`.
   - To keep old “open to anyone” behavior: set `channels.discord.dm.policy="open"` and `channels.discord.dm.allowFrom=["*"]`.
   - To hard-allowlist: set `channels.discord.dm.policy="allowlist"` and list senders in `channels.discord.dm.allowFrom`.
   - To ignore all DMs: set `channels.discord.dm.enabled=false` or `channels.discord.dm.policy="disabled"`.
8. Group DMs are ignored by default; enable via `channels.discord.dm.groupEnabled` and optionally restrict by `channels.discord.dm.groupChannels`.
9. Optional guild rules: set `channels.discord.guilds` keyed by guild id (preferred) or slug, with per-channel rules.
10. Optional native commands: `commands.native` defaults to `"auto"` (on for Discord/Telegram, off for Slack). Override with `channels.discord.commands.native: true|false|"auto"`; `false` clears previously registered commands. Text commands are controlled by `commands.text` and must be sent as standalone `/...` messages. Use `commands.useAccessGroups: false` to bypass access-group checks for commands.
    - Full command list + config: [Slash commands](/tools/slash-commands)
11. Optional guild context history: set `channels.discord.historyLimit` (default 20, falls back to `messages.groupChat.historyLimit`) to include the last N guild messages as context when replying to a mention. Set `0` to disable.
12. Reactions: the agent can trigger reactions via the `discord` tool (gated by `channels.discord.actions.*`).
    - Reaction removal semantics: see [/tools/reactions](/tools/reactions).
    - The `discord` tool is only exposed when the current channel is Discord.
13. Native commands use isolated session keys (`agent:<agentId>:discord:slash:<userId>`) rather than the shared `main` session.

Note: Name → id resolution uses guild member search and requires Server Members Intent; if the bot can’t search members, use ids or `<@id>` mentions.
Note: Slugs are lowercase with spaces replaced by `-`. Channel names are slugged without the leading `#`.
Note: Guild context `[from:]` lines include `author.tag` + `id` to make ping-ready replies easy.

## Config writes
By default, Discord is allowed to write config updates triggered by `/config set|unset` (requires `commands.config: true`).

Disable with:
```json5
{
  channels: { discord: { configWrites: false } }
}
```

## How to create your own bot

This is the “Discord Developer Portal” setup for running OpenClaw in a server (guild) channel like `#help`.

### 1) Create the Discord app + bot user
1. Discord Developer Portal → **Applications** → **New Application**
2. In your app:
   - **Bot** → **Add Bot**
   - Copy the **Bot Token** (this is what you put in `DISCORD_BOT_TOKEN`)

### 2) Enable the gateway intents OpenClaw needs
Discord blocks “privileged intents” unless you explicitly enable them.

In **Bot** → **Privileged Gateway Intents**, enable:
- **Message Content Intent** (required to read message text in most guilds; without it you’ll see “Used disallowed intents” or the bot will connect but not react to messages)
- **Server Members Intent** (recommended; required for some member/user lookups and allowlist matching in guilds)

You usually do **not** need **Presence Intent**.

### 3) Generate an invite URL (OAuth2 URL Generator)
In your app: **OAuth2** → **URL Generator**

**Scopes**
- ✅ `bot`
- ✅ `applications.commands` (required for native commands)

**Bot Permissions** (minimal baseline)
- ✅ View Channels
- ✅ Send Messages
- ✅ Read Message History
- ✅ Embed Links
- ✅ Attach Files
- ✅ Add Reactions (optional but recommended)
- ✅ Use External Emojis / Stickers (optional; only if you want them)

Avoid **Administrator** unless you’re debugging and fully trust the bot.

Copy the generated URL, open it, pick your server, and install the bot.

### 4) Get the ids (guild/user/channel)
Discord uses numeric ids everywhere; OpenClaw config prefers ids.

1. Discord (desktop/web) → **User Settings** → **Advanced** → enable **Developer Mode**
2. Right-click:
   - Server name → **Copy Server ID** (guild id)
   - Channel (e.g. `#help`) → **Copy Channel ID**
   - Your user → **Copy User ID**

### 5) Configure OpenClaw

#### Token
Set the bot token via env var (recommended on servers):
- `DISCORD_BOT_TOKEN=...`

Or via config:

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN"
    }
  }
}
```

Multi-account support: use `channels.discord.accounts` with per-account tokens and optional `name`. See [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) for the shared pattern.

#### Allowlist + channel routing
Example “single server, only allow me, only allow #help”:

```json5
{
  channels: {
    discord: {
      enabled: true,
      dm: { enabled: false },
      guilds: {
        "YOUR_GUILD_ID": {
          users: ["YOUR_USER_ID"],
          requireMention: true,
          channels: {
            help: { allow: true, requireMention: true }
          }
        }
      },
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1
      }
    }
  }
}
```

Notes:
- `requireMention: true` means the bot only replies when mentioned (recommended for shared channels).
- `agents.list[].groupChat.mentionPatterns` (or `messages.groupChat.mentionPatterns`) also count as mentions for guild messages.
- Multi-agent override: set per-agent patterns on `agents.list[].groupChat.mentionPatterns`.
- If `channels` is present, any channel not listed is denied by default.
- Use a `"*"` channel entry to apply defaults across all channels; explicit channel entries override the wildcard.
- Threads inherit parent channel config (allowlist, `requireMention`, skills, prompts, etc.) unless you add the thread channel id explicitly.
- Bot-authored messages are ignored by default; set `channels.discord.allowBots=true` to allow them (own messages remain filtered).
- Warning: If you allow replies to other bots (`channels.discord.allowBots=true`), prevent bot-to-bot reply loops with `requireMention`, `channels.discord.guilds.*.channels.<id>.users` allowlists, and/or clear guardrails in `AGENTS.md` and `SOUL.md`.

### 6) Verify it works
1. Start the gateway.
2. In your server channel, send: `@Krill hello` (or whatever your bot name is).
3. If nothing happens: check **Troubleshooting** below.

### Troubleshooting
- First: run `openclaw doctor` and `openclaw channels status --probe` (actionable warnings + quick audits).
- **“Used disallowed intents”**: enable **Message Content Intent** (and likely **Server Members Intent**) in the Developer Portal, then restart the gateway.
- **Bot connects but never replies in a guild channel**:
  - Missing **Message Content Intent**, or
  - The bot lacks channel permissions (View/Send/Read History), or
  - Your config requires mentions and you didn’t mention it, or
  - Your guild/channel allowlist denies the channel/user.
- **`requireMention: false` but still no replies**:
- `channels.discord.groupPolicy` defaults to **allowlist**; set it to `"open"` or add a guild entry under `channels.discord.guilds` (optionally list channels under `channels.discord.guilds.<id>.channels` to restrict).
  - If you only set `DISCORD_BOT_TOKEN` and never create a `channels.discord` section, the runtime
    defaults `groupPolicy` to `open`. Add `channels.discord.groupPolicy`,
    `channels.defaults.groupPolicy`, or a guild/channel allowlist to lock it down.
- `requireMention` must live under `channels.discord.guilds` (or a specific channel). `channels.discord.requireMention` at the top level is ignored.
- **Permission audits** (`channels status --probe`) only check numeric channel IDs. If you use slugs/names as `channels.discord.guilds.*.channels` keys, the audit can’t verify permissions.
- **DMs don’t work**: `channels.discord.dm.enabled=false`, `channels.discord.dm.policy="disabled"`, or you haven’t been approved yet (`channels.discord.dm.policy="pairing"`).

<<<<<<< HEAD
## Capabilities & limits
- DMs and guild text channels (threads are treated as separate channels; voice not supported).
- Typing indicators sent best-effort; message chunking uses `channels.discord.textChunkLimit` (default 2000) and splits tall replies by line count (`channels.discord.maxLinesPerMessage`, default 17).
- Optional newline chunking: set `channels.discord.chunkMode="newline"` to split on blank lines (paragraph boundaries) before length chunking.
- File uploads supported up to the configured `channels.discord.mediaMaxMb` (default 8 MB).
- Mention-gated guild replies by default to avoid noisy bots.
- Reply context is injected when a message references another message (quoted content + ids).
- Native reply threading is **off by default**; enable with `channels.discord.replyToMode` and reply tags.

## Retry policy
Outbound Discord API calls retry on rate limits (429) using Discord `retry_after` when available, with exponential backoff and jitter. Configure via `channels.discord.retry`. See [Retry policy](/concepts/retry).

## Config
=======
    <Tabs>
      <Tab title="Ask your agent">
        > "Allow my agent to respond on this server without having to be @mentioned"
      </Tab>
      <Tab title="Config">
        Set `requireMention: false` in your guild config:

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: false,
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    By default, long-term memory (MEMORY.md) only loads in DM sessions. Guild channels do not auto-load MEMORY.md.

    <Tabs>
      <Tab title="Ask your agent">
        > "When I ask questions in Discord channels, use memory_search or memory_get if you need long-term context from MEMORY.md."
      </Tab>
      <Tab title="Manual">
        If you need shared context in every channel, put the stable instructions in `AGENTS.md` or `USER.md` (they are injected for every session). Keep long-term notes in `MEMORY.md` and access them on demand with memory tools.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Now create some channels on your Discord server and start chatting. Your agent can see the channel name, and each channel gets its own isolated session — so you can set up `#coding`, `#home`, `#research`, or whatever fits your workflow.

## Runtime model

- Gateway owns the Discord connection.
- Reply routing is deterministic: Discord inbound replies back to Discord.
- By default (`session.dmScope=main`), direct chats share the agent main session (`agent:main:main`).
- Guild channels are isolated session keys (`agent:<agentId>:discord:channel:<channelId>`).
- Group DMs are ignored by default (`channels.discord.dm.groupEnabled=false`).
- Native slash commands run in isolated command sessions (`agent:<agentId>:discord:slash:<userId>`), while still carrying `CommandTargetSessionKey` to the routed conversation session.

## Forum channels

Discord forum and media channels only accept thread posts. OpenClaw supports two ways to create them:

- Send a message to the forum parent (`channel:<forumId>`) to auto-create a thread. The thread title uses the first non-empty line of your message.
- Use `openclaw message thread create` to create a thread directly. Do not pass `--message-id` for forum channels.

Example: send to forum parent to create a thread

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

Example: create a forum thread explicitly

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

Forum parents do not accept Discord components. If you need components, send to the thread itself (`channel:<threadId>`).

## Interactive components

OpenClaw supports Discord components v2 containers for agent messages. Use the message tool with a `components` payload. Interaction results are routed back to the agent as normal inbound messages and follow the existing Discord `replyToMode` settings.

Supported blocks:

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Action rows allow up to 5 buttons or a single select menu
- Select types: `string`, `user`, `role`, `mentionable`, `channel`

By default, components are single use. Set `components.reusable=true` to allow buttons, selects, and forms to be used multiple times until they expire.

To restrict who can click a button, set `allowedUsers` on that button (Discord user IDs, tags, or `*`). When configured, unmatched users receive an ephemeral denial.

The `/model` and `/models` slash commands open an interactive model picker with provider and model dropdowns plus a Submit step. The picker reply is ephemeral and only the invoking user can use it.

File attachments:

- `file` blocks must point to an attachment reference (`attachment://<filename>`)
- Provide the attachment via `media`/`path`/`filePath` (single file); use `media-gallery` for multiple files
- Use `filename` to override the upload name when it should match the attachment reference

Modal forms:

- Add `components.modal` with up to 5 fields
- Field types: `text`, `checkbox`, `radio`, `select`, `role-select`, `user-select`
- OpenClaw adds a trigger button automatically

Example:

```json5
{
  channel: "discord",
  action: "send",
  to: "channel:123456789012345678",
  message: "Optional fallback text",
  components: {
    reusable: true,
    text: "Choose a path",
    blocks: [
      {
        type: "actions",
        buttons: [
          {
            label: "Approve",
            style: "success",
            allowedUsers: ["123456789012345678"],
          },
          { label: "Decline", style: "danger" },
        ],
      },
      {
        type: "actions",
        select: {
          type: "string",
          placeholder: "Pick an option",
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
      },
    ],
    modal: {
      title: "Details",
      triggerLabel: "Open form",
      fields: [
        { type: "text", label: "Requester" },
        {
          type: "select",
          label: "Priority",
          options: [
            { label: "Low", value: "low" },
            { label: "High", value: "high" },
          ],
        },
      ],
    },
  },
}
```

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
    - optional sender allowlists: `users` (stable IDs recommended) and `roles` (role IDs only); if either is configured, senders are allowed when they match `users` OR `roles`
    - direct name/tag matching is disabled by default; enable `channels.discord.dangerouslyAllowNameMatching: true` only as break-glass compatibility mode
    - names/tags are supported for `users`, but IDs are safer; `openclaw security audit` warns when name/tag entries are used
    - if a guild has `channels` configured, non-listed channels are denied
    - if a guild has no `channels` block, all channels in that allowlisted guild are allowed

    Example:
>>>>>>> f97c45c5b (fix(security): warn on Discord name-based allowlists in audit)

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "abc.123",
      groupPolicy: "allowlist",
      guilds: {
        "*": {
          channels: {
            general: { allow: true }
          }
        }
      },
      mediaMaxMb: 8,
      actions: {
        reactions: true,
        stickers: true,
        emojiUploads: true,
        stickerUploads: true,
        polls: true,
        permissions: true,
        messages: true,
        threads: true,
        pins: true,
        search: true,
        memberInfo: true,
        roleInfo: true,
        roles: false,
        channelInfo: true,
        channels: true,
        voiceStatus: true,
        events: true,
        moderation: false
      },
      replyToMode: "off",
      dm: {
        enabled: true,
        policy: "pairing", // pairing | allowlist | open | disabled
        allowFrom: ["123456789012345678", "steipete"],
        groupEnabled: false,
        groupChannels: ["openclaw-dm"]
      },
      guilds: {
        "*": { requireMention: true },
        "123456789012345678": {
          slug: "friends-of-openclaw",
          requireMention: false,
          reactionNotifications: "own",
          users: ["987654321098765432", "steipete"],
          channels: {
            general: { allow: true },
            help: {
              allow: true,
              requireMention: true,
              users: ["987654321098765432"],
              skills: ["search", "docs"],
              systemPrompt: "Keep answers short."
            }
          }
        }
      }
    }
  }
}
```

<<<<<<< HEAD
Ack reactions are controlled globally via `messages.ackReaction` +
`messages.ackReactionScope`. Use `messages.removeAckAfterReply` to clear the
ack reaction after the bot replies.

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
- `guilds.<id>.channels.<channel>.systemPrompt`: extra system prompt for the channel (combined with channel topic).
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
- `actions`: per-action tool gates; omit to allow all (set `false` to disable).
  - `reactions` (covers react + read reactions)
  - `stickers`, `emojiUploads`, `stickerUploads`, `polls`, `permissions`, `messages`, `threads`, `pins`, `search`
  - `memberInfo`, `roleInfo`, `channelInfo`, `voiceStatus`, `events`
  - `channels` (create/edit/delete channels + categories + permissions)
  - `roles` (role add/remove, default `false`)
  - `moderation` (timeout/kick/ban, default `false`)

Reaction notifications use `guilds.<id>.reactionNotifications`:
- `off`: no reaction events.
- `own`: reactions on the bot's own messages (default).
- `all`: all reactions on all messages.
- `allowlist`: reactions from `guilds.<id>.users` on all messages (empty list disables).

### Tool action defaults

| Action group | Default | Notes |
| --- | --- | --- |
| reactions | enabled | React + list reactions + emojiList |
| stickers | enabled | Send stickers |
| emojiUploads | enabled | Upload emojis |
| stickerUploads | enabled | Upload stickers |
| polls | enabled | Create polls |
| permissions | enabled | Channel permission snapshot |
| messages | enabled | Read/send/edit/delete |
| threads | enabled | Create/list/reply |
| pins | enabled | Pin/unpin/list |
| search | enabled | Message search (preview feature) |
| memberInfo | enabled | Member info |
| roleInfo | enabled | Role list |
| channelInfo | enabled | Channel info + list |
| channels | enabled | Channel/category management |
| voiceStatus | enabled | Voice state lookup |
| events | enabled | List/create scheduled events |
| roles | disabled | Role add/remove |
| moderation | disabled | Timeout/kick/ban |
- `replyToMode`: `off` (default), `first`, or `all`. Applies only when the model includes a reply tag.

## Reply tags
To request a threaded reply, the model can include one tag in its output:
- `[[reply_to_current]]` — reply to the triggering Discord message.
- `[[reply_to:<id>]]` — reply to a specific message id from context/history.
Current message ids are appended to prompts as `[message_id: …]`; history entries already include ids.

Behavior is controlled by `channels.discord.replyToMode`:
- `off`: ignore tags.
- `first`: only the first outbound chunk/attachment is a reply.
- `all`: every outbound chunk/attachment is a reply.

Allowlist matching notes:
- `allowFrom`/`users`/`groupChannels` accept ids, names, tags, or mentions like `<@id>`.
- Prefixes like `discord:`/`user:` (users) and `channel:` (group DMs) are supported.
- Use `*` to allow any sender/channel.
- When `guilds.<id>.channels` is present, channels not listed are denied by default.
- When `guilds.<id>.channels` is omitted, all channels in the allowlisted guild are allowed.
- To allow **no channels**, set `channels.discord.groupPolicy: "disabled"` (or keep an empty allowlist).
- The configure wizard accepts `Guild/Channel` names (public + private) and resolves them to IDs when possible.
- On startup, OpenClaw resolves channel/user names in allowlists to IDs (when the bot can search members)
  and logs the mapping; unresolved entries are kept as typed.

Native command notes:
- The registered commands mirror OpenClaw’s chat commands.
- Native commands honor the same allowlists as DMs/guild messages (`channels.discord.dm.allowFrom`, `channels.discord.guilds`, per-channel rules).
- Slash commands may still be visible in Discord UI to users who aren’t allowlisted; OpenClaw enforces allowlists on execution and replies “not authorized”.

## Tool actions
The agent can call `discord` with actions like:
- `react` / `reactions` (add or list reactions)
- `sticker`, `poll`, `permissions`
- `readMessages`, `sendMessage`, `editMessage`, `deleteMessage`
- Read/search/pin tool payloads include normalized `timestampMs` (UTC epoch ms) and `timestampUtc` alongside raw Discord `timestamp`.
- `threadCreate`, `threadList`, `threadReply`
- `pinMessage`, `unpinMessage`, `listPins`
- `searchMessages`, `memberInfo`, `roleInfo`, `roleAdd`, `roleRemove`, `emojiList`
- `channelInfo`, `channelList`, `voiceStatus`, `eventList`, `eventCreate`
- `timeout`, `kick`, `ban`

Discord message ids are surfaced in the injected context (`[discord message id: …]` and history lines) so the agent can target them.
Emoji can be unicode (e.g., `✅`) or custom emoji syntax like `<:party_blob:1234567890>`.

## Safety & ops
- Treat the bot token like a password; prefer the `DISCORD_BOT_TOKEN` env var on supervised hosts or lock down the config file permissions.
- Only grant the bot permissions it needs (typically Read/Send Messages).
- If the bot is stuck or rate limited, restart the gateway (`openclaw gateway --force`) after confirming no other processes own the Discord session.
=======
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

### Role-based agent routing

Use `bindings[].match.roles` to route Discord guild members to different agents by role ID. Role-based bindings accept role IDs only and are evaluated after peer or parent-peer bindings and before guild-only bindings. If a binding also sets other match fields (for example `peer` + `guildId` + `roles`), all configured fields must match.

```json5
{
  bindings: [
    {
      agentId: "opus",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
        roles: ["111111111111111111"],
      },
    },
    {
      agentId: "sonnet",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
      },
    },
  ],
}
```

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

    Note: `off` disables implicit reply threading. Explicit `[[reply_to_*]]` tags are still honored.

    Message IDs are surfaced in context/history so agents can target specific messages.

  </Accordion>

  <Accordion title="Live stream preview">
    OpenClaw can stream draft replies by sending a temporary message and editing it as text arrives.

    - `channels.discord.streamMode` controls preview streaming (`off` | `partial` | `block`, default: `off`).
    - `partial` edits a single preview message as tokens arrive.
    - `block` emits draft-sized chunks (use `draftChunk` to tune size and breakpoints).

    Example:

```json5
{
  channels: {
    discord: {
      streamMode: "partial",
    },
  },
}
```

    `block` mode chunking defaults (clamped to `channels.discord.textChunkLimit`):

```json5
{
  channels: {
    discord: {
      streamMode: "block",
      draftChunk: {
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph",
      },
    },
  },
}
```

    Preview streaming is text-only; media replies fall back to normal delivery.

    Note: preview streaming is separate from block streaming. When block streaming is explicitly
    enabled for Discord, OpenClaw skips the preview stream to avoid double streaming.

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

  <Accordion title="Ack reactions">
    `ackReaction` sends an acknowledgement emoji while OpenClaw is processing an inbound message.

    Resolution order:

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - agent identity emoji fallback (`agents.list[].identity.emoji`, else "👀")

    Notes:

    - Discord accepts unicode emoji or custom emoji names.
    - Use `""` to disable the reaction for a channel or account.

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

  <Accordion title="Gateway proxy">
    Route Discord gateway WebSocket traffic and startup REST lookups (application ID + allowlist resolution) through an HTTP(S) proxy with `channels.discord.proxy`.

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    Per-account override:

```json5
{
  channels: {
    discord: {
      accounts: {
        primary: {
          proxy: "http://proxy.example:8080",
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="PluralKit support">
    Enable PluralKit resolution to map proxied messages to system member identity:

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
    - member display names are matched by name/slug only when `channels.discord.dangerouslyAllowNameMatching: true`
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
    Discord supports button-based exec approvals in DMs and can optionally post approval prompts in the originating channel.

    Config path:

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, default: `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    When `target` is `channel` or `both`, the approval prompt is visible in the channel. Only configured approvers can use the buttons; other users receive an ephemeral denial. Approval prompts include the command text, so only enable channel delivery in trusted channels. If the channel ID cannot be derived from the session key, OpenClaw falls back to DM delivery.

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

## Components v2 UI

OpenClaw uses Discord components v2 for exec approvals and cross-context markers. Discord message actions can also accept `components` for custom UI (advanced; requires Carbon component instances), while legacy `embeds` remain available but are not recommended.

- `channels.discord.ui.components.accentColor` sets the accent color used by Discord component containers (hex).
- Set per account with `channels.discord.accounts.<id>.ui.components.accentColor`.
- `embeds` are ignored when components v2 are present.

Example:

```json5
{
  channels: {
    discord: {
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
    },
  },
}
```

## Voice channels

OpenClaw can join Discord voice channels for realtime, continuous conversations. This is separate from voice message attachments.

Requirements:

- Enable native commands (`commands.native` or `channels.discord.commands.native`).
- Configure `channels.discord.voice`.
- The bot needs Connect + Speak permissions in the target voice channel.

Use the Discord-only native command `/vc join|leave|status` to control sessions. The command uses the account default agent and follows the same allowlist and group policy rules as other Discord commands.

Auto-join example:

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        tts: {
          provider: "openai",
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

Notes:

- `voice.tts` overrides `messages.tts` for voice playback only.
- Voice is enabled by default; set `channels.discord.voice.enabled=false` to disable it.
- `voice.daveEncryption` and `voice.decryptionFailureTolerance` pass through to `@discordjs/voice` join options.
- If receive logs repeatedly show `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`, this may be the upstream `@discordjs/voice` receive bug tracked in [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419).

## Voice messages

Discord voice messages show a waveform preview and require OGG/Opus audio plus metadata. OpenClaw generates the waveform automatically, but it needs `ffmpeg` and `ffprobe` available on the gateway host to inspect and convert audio files.

Requirements and constraints:

- Provide a **local file path** (URLs are rejected).
- Omit text content (Discord does not allow text + voice message in the same payload).
- Any audio format is accepted; OpenClaw converts to OGG/Opus when needed.

Example:

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

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
- streaming: `streamMode`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb`, `retry`
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## Safety and operations

- Treat bot tokens as secrets (`DISCORD_BOT_TOKEN` preferred in supervised environments).
- Grant least-privilege Discord permissions.
- If command deploy/state is stale, restart gateway and re-check with `openclaw channels status --probe`.

## Related

- [Pairing](/channels/pairing)
- [Channel routing](/channels/channel-routing)
- [Multi-agent routing](/concepts/multi-agent)
- [Troubleshooting](/channels/troubleshooting)
- [Slash commands](/tools/slash-commands)
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))
