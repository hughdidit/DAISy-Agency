---
summary: "Telegram bot support status, capabilities, and configuration"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---
# Telegram (Bot API)

<<<<<<< HEAD

Status: production-ready for bot DMs + groups via grammY. Long-polling by default; webhook optional.

## Quick setup (beginner)
<<<<<<< HEAD
<<<<<<< HEAD
1) Create a bot with **@BotFather** and copy the token.
2) Set the token:
=======
=======

>>>>>>> 443ee26af (chore: oxfmt fixes)
1. Create a bot with **@BotFather** ([direct link](https://t.me/BotFather)). Confirm the handle is exactly `@BotFather`, then copy the token.
2. Set the token:
>>>>>>> 8ff75eaf1 (Docs: Direct link to BotFather on Telegram (#4064))
   - Env: `TELEGRAM_BOT_TOKEN=...`
   - Or config: `channels.telegram.botToken: "..."`.
   - If both are set, config takes precedence (env fallback is default-account only).
3) Start the gateway.
4) DM access is pairing by default; approve the pairing code on first contact.

Minimal config:
```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing"
    }
  }
}
```

## What it is
- A Telegram Bot API channel owned by the Gateway.
- Deterministic routing: replies go back to Telegram; the model never chooses channels.
- DMs share the agent's main session; groups stay isolated (`agent:<agentId>:telegram:group:<chatId>`).

## Setup (fast path)
### 1) Create a bot token (BotFather)
<<<<<<< HEAD
<<<<<<< HEAD
1) Open Telegram and chat with **@BotFather**.
2) Run `/newbot`, then follow the prompts (name + username ending in `bot`).
3) Copy the token and store it safely.
=======
=======

>>>>>>> 443ee26af (chore: oxfmt fixes)
1. Open Telegram and chat with **@BotFather** ([direct link](https://t.me/BotFather)). Confirm the handle is exactly `@BotFather`.
2. Run `/newbot`, then follow the prompts (name + username ending in `bot`).
3. Copy the token and store it safely.
>>>>>>> 8ff75eaf1 (Docs: Direct link to BotFather on Telegram (#4064))

Optional BotFather settings:
- `/setjoingroups` — allow/deny adding the bot to groups.
- `/setprivacy` — control whether the bot sees all group messages.

### 2) Configure the token (env or config)
Example:
=======
Status: production-ready for bot DMs + groups via grammY. Long polling is the default mode; webhook mode is optional.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/channels/pairing">
    Default DM policy for Telegram is pairing.
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
  <Step title="Create the bot token in BotFather">
    Open Telegram and chat with **@BotFather** (confirm the handle is exactly `@BotFather`).

    Run `/newbot`, follow prompts, and save the token.

  </Step>

  <Step title="Configure token and DM policy">
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } }
    }
  }
}
```

    Env fallback: `TELEGRAM_BOT_TOKEN=...` (default account only).

  </Step>

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
3) Start the gateway. Telegram starts when a token is resolved (config first, env fallback).
4) DM access defaults to pairing. Approve the code when the bot is first contacted.
5) For groups: add the bot, decide privacy/admin behavior (below), then set `channels.telegram.groups` to control mention gating + allowlists.
=======
1. Start the gateway. Telegram starts when a token is resolved (config first, env fallback).
2. DM access defaults to pairing. Approve the code when the bot is first contacted.
3. For groups: add the bot, decide privacy/admin behavior (below), then set `channels.telegram.groups` to control mention gating + allowlists.
>>>>>>> c7aec0660 (docs(markdownlint): enable autofixable rules and normalize links)
=======
3. Start the gateway. Telegram starts when a token is resolved (config first, env fallback).
4. DM access defaults to pairing. Approve the code when the bot is first contacted.
5. For groups: add the bot, decide privacy/admin behavior (below), then set `channels.telegram.groups` to control mention gating + allowlists.
>>>>>>> 0a1f4f666 (revert(docs): undo markdownlint autofix churn)
=======
  <Step title="Start gateway and approve first DM">
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

<<<<<<< HEAD
### Token creation (BotFather)
- `/newbot` creates the bot and returns the token (keep it secret).
- If a token leaks, revoke/regenerate it via @BotFather and update your config.

### Group message visibility (Privacy Mode)
Telegram bots default to **Privacy Mode**, which limits which group messages they receive.
If your bot must see *all* group messages, you have two options:
- Disable privacy mode with `/setprivacy` **or**
- Add the bot as a group **admin** (admin bots receive all messages).
=======
    Pairing codes expire after 1 hour.

  </Step>

  <Step title="Add the bot to a group">
    Add the bot to your group, then set `channels.telegram.groups` and `groupPolicy` to match your access model.
  </Step>
</Steps>

<Note>
Token resolution order is account-aware. In practice, config values win over env fallback, and `TELEGRAM_BOT_TOKEN` only applies to the default account.
</Note>

## Telegram side settings
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

<AccordionGroup>
  <Accordion title="Privacy mode and group visibility">
    Telegram bots default to **Privacy Mode**, which limits what group messages they receive.

<<<<<<< HEAD
### Group permissions (admin rights)
Admin status is set inside the group (Telegram UI). Admin bots always receive all
group messages, so use admin if you need full visibility.

## How it works (behavior)
- Inbound messages are normalized into the shared channel envelope with reply context and media placeholders.
- Group replies require a mention by default (native @mention or `agents.list[].groupChat.mentionPatterns` / `messages.groupChat.mentionPatterns`).
- Multi-agent override: set per-agent patterns on `agents.list[].groupChat.mentionPatterns`.
- Replies always route back to the same Telegram chat.
- Long-polling uses grammY runner with per-chat sequencing; overall concurrency is capped by `agents.defaults.maxConcurrent`.
- Telegram Bot API does not support read receipts; there is no `sendReadReceipts` option.

## Formatting (Telegram HTML)
- Outbound Telegram text uses `parse_mode: "HTML"` (Telegram’s supported tag subset).
- Markdown-ish input is rendered into **Telegram-safe HTML** (bold/italic/strike/code/links); block elements are flattened to text with newlines/bullets.
- Raw HTML from models is escaped to avoid Telegram parse errors.
- If Telegram rejects the HTML payload, Moltbot retries the same message as plain text.

## Commands (native + custom)
Moltbot registers native commands (like `/status`, `/reset`, `/model`) with Telegram’s bot menu on startup.
You can add custom commands to the menu via config:
=======
    If the bot must see all group messages, either:

    - disable privacy mode via `/setprivacy`, or
    - make the bot a group admin.

    When toggling privacy mode, remove + re-add the bot in each group so Telegram applies the change.

  </Accordion>

  <Accordion title="Group permissions">
    Admin status is controlled in Telegram group settings.

    Admin bots receive all group messages, which is useful for always-on group behavior.

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` to allow/deny group adds
    - `/setprivacy` for group visibility behavior

  </Accordion>
</AccordionGroup>

## Access control and activation

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` controls direct message access:

    - `pairing` (default)
    - `allowlist`
    - `open` (requires `allowFrom` to include `"*"`)
    - `disabled`

<<<<<<< HEAD
    `channels.telegram.allowFrom` accepts numeric IDs and usernames. `telegram:` / `tg:` prefixes are accepted and normalized.
=======
    `channels.telegram.allowFrom` accepts numeric Telegram user IDs. `telegram:` / `tg:` prefixes are accepted and normalized.
    The onboarding wizard accepts `@username` input and resolves it to numeric IDs.
    If you upgraded and your config contains `@username` allowlist entries, run `openclaw doctor --fix` to resolve them (best-effort; requires a Telegram bot token).
>>>>>>> 226bf7463 (docs(telegram): document allowlist id requirement)

    ### Finding your Telegram user ID

    Safer (no third-party bot):

    1. DM your bot.
    2. Run `openclaw logs --follow`.
    3. Read `from.id`.

    Official Bot API method:

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    Third-party method (less private): `@userinfobot` or `@getidsbot`.

  </Tab>

  <Tab title="Group policy and allowlists">
    There are two independent controls:

    1. **Which groups are allowed** (`channels.telegram.groups`)
       - no `groups` config: all groups allowed
       - `groups` configured: acts as allowlist (explicit IDs or `"*"`)

    2. **Which senders are allowed in groups** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (default)
       - `disabled`

    `groupAllowFrom` is used for group sender filtering. If not set, Telegram falls back to `allowFrom`.
    `groupAllowFrom` entries must be numeric Telegram user IDs.

    Example: allow any member in one specific group:

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

  </Tab>

  <Tab title="Mention behavior">
    Group replies require mention by default.

    Mention can come from:

    - native `@botusername` mention, or
    - mention patterns in:
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Session-level command toggles:

    - `/activation always`
    - `/activation mention`

    These update session state only. Use config for persistence.

    Persistent config example:

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false },
      },
    },
  },
}
```

    Getting the group chat ID:

    - forward a group message to `@userinfobot` / `@getidsbot`
    - or read `chat.id` from `openclaw logs --follow`
    - or inspect Bot API `getUpdates`

  </Tab>
</Tabs>

## Runtime behavior

- Telegram is owned by the gateway process.
- Routing is deterministic: Telegram inbound replies back to Telegram (the model does not pick channels).
- Inbound messages normalize into the shared channel envelope with reply metadata and media placeholders.
- Group sessions are isolated by group ID. Forum topics append `:topic:<threadId>` to keep topics isolated.
- DM messages can carry `message_thread_id`; OpenClaw routes them with thread-aware session keys and preserves thread ID for replies.
- Long polling uses grammY runner with per-chat/per-thread sequencing. Overall runner sink concurrency uses `agents.defaults.maxConcurrent`.
- Telegram Bot API has no read-receipt support (`sendReadReceipts` does not apply).

## Feature reference

<AccordionGroup>
  <Accordion title="Draft streaming in Telegram DMs">
    OpenClaw can stream partial replies with Telegram draft bubbles (`sendMessageDraft`).

    Requirements:

    - `channels.telegram.streamMode` is not `"off"` (default: `"partial"`)
    - private chat
    - inbound update includes `message_thread_id`
    - bot topics are enabled (`getMe().has_topics_enabled`)

    Modes:

    - `off`: no draft streaming
    - `partial`: frequent draft updates from partial text
    - `block`: chunked draft updates using `channels.telegram.draftChunk`

    `draftChunk` defaults for block mode:

    - `minChars: 200`
    - `maxChars: 800`
    - `breakPreference: "paragraph"`

    `maxChars` is clamped by `channels.telegram.textChunkLimit`.

    Draft streaming is DM-only; groups/channels do not use draft bubbles.

    If you want early real Telegram messages instead of draft updates, use block streaming (`channels.telegram.blockStreaming: true`).

    Telegram-only reasoning stream:

    - `/reasoning stream` sends reasoning to the draft bubble while generating
    - final answer is sent without reasoning text

  </Accordion>

  <Accordion title="Formatting and HTML fallback">
    Outbound text uses Telegram `parse_mode: "HTML"`.

    - Markdown-ish text is rendered to Telegram-safe HTML.
    - Raw model HTML is escaped to reduce Telegram parse failures.
    - If Telegram rejects parsed HTML, OpenClaw retries as plain text.

    Link previews are enabled by default and can be disabled with `channels.telegram.linkPreview: false`.

  </Accordion>

  <Accordion title="Native commands and custom commands">
    Telegram command menu registration is handled at startup with `setMyCommands`.

    Native command defaults:

    - `commands.native: "auto"` enables native commands for Telegram

    Add custom command menu entries:
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" }
      ]
    }
  }
}
```

    Rules:

    - names are normalized (strip leading `/`, lowercase)
    - valid pattern: `a-z`, `0-9`, `_`, length `1..32`
    - custom commands cannot override native commands
    - conflicts/duplicates are skipped and logged

    Notes:

<<<<<<< HEAD
Notes:
- Custom commands are **menu entries only**; Moltbot does not implement them unless you handle them elsewhere.
- Command names are normalized (leading `/` stripped, lowercased) and must match `a-z`, `0-9`, `_` (1–32 chars).
- Custom commands **cannot override native commands**. Conflicts are ignored and logged.
- If `commands.native` is disabled, only custom commands are registered (or cleared if none).

## Limits
- Outbound text is chunked to `channels.telegram.textChunkLimit` (default 4000).
- Optional newline chunking: set `channels.telegram.chunkMode="newline"` to split on blank lines (paragraph boundaries) before length chunking.
- Media downloads/uploads are capped by `channels.telegram.mediaMaxMb` (default 5).
- Telegram Bot API requests time out after `channels.telegram.timeoutSeconds` (default 500 via grammY). Set lower to avoid long hangs.
- Group history context uses `channels.telegram.historyLimit` (or `channels.telegram.accounts.*.historyLimit`), falling back to `messages.groupChat.historyLimit`. Set `0` to disable (default 50).
- DM history can be limited with `channels.telegram.dmHistoryLimit` (user turns). Per-user overrides: `channels.telegram.dms["<user_id>"].historyLimit`.
=======
    - custom commands are menu entries only; they do not auto-implement behavior
    - plugin/skill commands can still work when typed even if not shown in Telegram menu

    If native commands are disabled, built-ins are removed. Custom/plugin commands may still register if configured.

    Common setup failure:

    - `setMyCommands failed` usually means outbound DNS/HTTPS to `api.telegram.org` is blocked.

    ### Device pairing commands (`device-pair` plugin)

    When the `device-pair` plugin is installed:

    1. `/pair` generates setup code
    2. paste code in iOS app
    3. `/pair approve` approves latest pending request

    More details: [Pairing](/channels/pairing#pair-via-telegram-recommended-for-ios).
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

  </Accordion>

<<<<<<< HEAD
By default, the bot only responds to mentions in groups (`@botname` or patterns in `agents.list[].groupChat.mentionPatterns`). To change this behavior:

### Via config (recommended)

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": { requireMention: false }  // always respond in this group
      }
    }
  }
}
```

**Important:** Setting `channels.telegram.groups` creates an **allowlist** - only listed groups (or `"*"`) will be accepted.
Forum topics inherit their parent group config (allowFrom, requireMention, skills, prompts) unless you add per-topic overrides under `channels.telegram.groups.<groupId>.topics.<topicId>`.

To allow all groups with always-respond:
```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false }  // all groups, always respond
      }
    }
  }
}
```

To keep mention-only for all groups (default behavior):
```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: true }  // or omit groups entirely
      }
    }
  }
}
```

### Via command (session-level)

Send in the group:
- `/activation always` - respond to all messages
- `/activation mention` - require mentions (default)

**Note:** Commands update session state only. For persistent behavior across restarts, use config.

### Getting the group chat ID

Forward any message from the group to `@userinfobot` or `@getidsbot` on Telegram to see the chat ID (negative number like `-1001234567890`).

**Tip:** For your own user ID, DM the bot and it will reply with your user ID (pairing message), or use `/whoami` once commands are enabled.

**Privacy note:** `@userinfobot` is a third-party bot. If you prefer, add the bot to the group, send a message, and use `moltbot logs --follow` to read `chat.id`, or use the Bot API `getUpdates`.

## Config writes
By default, Telegram is allowed to write config updates triggered by channel events or `/config set|unset`.

This happens when:
- A group is upgraded to a supergroup and Telegram emits `migrate_to_chat_id` (chat ID changes). Moltbot can migrate `channels.telegram.groups` automatically.
- You run `/config set` or `/config unset` in a Telegram chat (requires `commands.config: true`).

Disable with:
```json5
{
  channels: { telegram: { configWrites: false } }
}
```

## Topics (forum supergroups)
Telegram forum topics include a `message_thread_id` per message. Moltbot:
- Appends `:topic:<threadId>` to the Telegram group session key so each topic is isolated.
- Sends typing indicators and replies with `message_thread_id` so responses stay in the topic.
- General topic (thread id `1`) is special: message sends omit `message_thread_id` (Telegram rejects it), but typing indicators still include it.
- Exposes `MessageThreadId` + `IsForum` in template context for routing/templating.
- Topic-specific configuration is available under `channels.telegram.groups.<chatId>.topics.<threadId>` (skills, allowlists, auto-reply, system prompts, disable).
- Topic configs inherit group settings (requireMention, allowlists, skills, prompts, enabled) unless overridden per topic.

Private chats can include `message_thread_id` in some edge cases. Moltbot keeps the DM session key unchanged, but still uses the thread id for replies/draft streaming when it is present.

## Inline Buttons

Telegram supports inline keyboards with callback buttons.
=======
  <Accordion title="Inline buttons">
    Configure inline keyboard scope:
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

```json5
{
  "channels": {
    "telegram": {
      "capabilities": {
        "inlineButtons": "allowlist"
      }
    }
  }
}
```

<<<<<<< HEAD
For per-account configuration:
=======
    Per-account override:

>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))
```json5
{
  "channels": {
    "telegram": {
      "accounts": {
        "main": {
          "capabilities": {
            "inlineButtons": "allowlist"
          }
        }
      }
    }
  }
}
```

<<<<<<< HEAD
Scopes:
- `off` — inline buttons disabled
- `dm` — only DMs (group targets blocked)
- `group` — only groups (DM targets blocked)
- `all` — DMs + groups
- `allowlist` — DMs + groups, but only senders allowed by `allowFrom`/`groupAllowFrom` (same rules as control commands)
=======
    Scopes:

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist` (default)
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

    Legacy `capabilities: ["inlineButtons"]` maps to `inlineButtons: "all"`.

    Message action example:

```json5
{
  "action": "send",
  "channel": "telegram",
  "to": "123456789",
  "message": "Choose an option:",
  "buttons": [
    [
      {"text": "Yes", "callback_data": "yes"},
      {"text": "No", "callback_data": "no"}
    ],
    [
      {"text": "Cancel", "callback_data": "cancel"}
    ]
  ]
}
```

    Callback clicks are passed to the agent as text:
    `callback_data: <value>`

  </Accordion>

  <Accordion title="Telegram message actions for agents and automation">
    Telegram tool actions include:

    - `sendMessage` (`to`, `content`, optional `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)

<<<<<<< HEAD
Use the global setting when all Telegram bots/accounts should behave the same. Use per-account configuration when different bots need different behaviors (for example, one account only handles DMs while another is allowed in groups).
## Access control (DMs + groups)

### DM access
- Default: `channels.telegram.dmPolicy = "pairing"`. Unknown senders receive a pairing code; messages are ignored until approved (codes expire after 1 hour).
- Approve via:
  - `moltbot pairing list telegram`
  - `moltbot pairing approve telegram <CODE>`
- Pairing is the default token exchange used for Telegram DMs. Details: [Pairing](/start/pairing)
- `channels.telegram.allowFrom` accepts numeric user IDs (recommended) or `@username` entries. It is **not** the bot username; use the human sender’s ID. The wizard accepts `@username` and resolves it to the numeric ID when possible.

#### Finding your Telegram user ID
Safer (no third-party bot):
1) Start the gateway and DM your bot.
2) Run `moltbot logs --follow` and look for `from.id`.

Alternate (official Bot API):
<<<<<<< HEAD
1) DM your bot.
2) Fetch updates with your bot token and read `message.from.id`:
=======

1. DM your bot.
2. Fetch updates with your bot token and read `message.from.id`:
<<<<<<< HEAD
<<<<<<< HEAD

>>>>>>> c7aec0660 (docs(markdownlint): enable autofixable rules and normalize links)
=======
>>>>>>> 0a1f4f666 (revert(docs): undo markdownlint autofix churn)
=======

>>>>>>> 578a6e27a (Docs: enable markdownlint autofixables except list numbering (#10476))
   ```bash
   curl "https://api.telegram.org/bot<bot_token>/getUpdates"
   ```

Third-party (less private):
- DM `@userinfobot` or `@getidsbot` and use the returned user id.
=======
    Channel message actions expose ergonomic aliases (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`).

    Gating controls:

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.editMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (default: disabled)

    Reaction removal semantics: [/tools/reactions](/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram supports explicit reply threading tags in generated output:

    - `[[reply_to_current]]` replies to the triggering message
    - `[[reply_to:<id>]]` replies to a specific Telegram message ID

    `channels.telegram.replyToMode` controls handling:

    - `first` (default)
    - `all`
    - `off`

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    Forum supergroups:

    - topic session keys append `:topic:<threadId>`
    - replies and typing target the topic thread
    - topic config path:
      `channels.telegram.groups.<chatId>.topics.<threadId>`
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

    General topic (`threadId=1`) special-case:

    - message sends omit `message_thread_id` (Telegram rejects `sendMessage(...thread_id=1)`)
    - typing actions still include `message_thread_id`

<<<<<<< HEAD
**1. Which groups are allowed** (group allowlist via `channels.telegram.groups`):
- No `groups` config = all groups allowed
- With `groups` config = only listed groups or `"*"` are allowed
- Example: `"groups": { "-1001234567890": {}, "*": {} }` allows all groups

**2. Which senders are allowed** (sender filtering via `channels.telegram.groupPolicy`):
- `"open"` = all senders in allowed groups can message
- `"allowlist"` = only senders in `channels.telegram.groupAllowFrom` can message
- `"disabled"` = no group messages accepted at all
Default is `groupPolicy: "allowlist"` (blocked unless you add `groupAllowFrom`).
=======
    Topic inheritance: topic entries inherit group settings unless overridden (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).

    Template context includes:

    - `MessageThreadId`
    - `IsForum`

    DM thread behavior:
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

    - private chats with `message_thread_id` keep DM routing but use thread-aware session keys/reply targets.

<<<<<<< HEAD
## Long-polling vs webhook
- Default: long-polling (no public URL required).
- Webhook mode: set `channels.telegram.webhookUrl` (optionally `channels.telegram.webhookSecret` + `channels.telegram.webhookPath`).
  - The local listener binds to `0.0.0.0:8787` and serves `POST /telegram-webhook` by default.
  - If your public URL is different, use a reverse proxy and point `channels.telegram.webhookUrl` at the public endpoint.

## Reply threading
Telegram supports optional threaded replies via tags:
- `[[reply_to_current]]` -- reply to the triggering message.
- `[[reply_to:<id>]]` -- reply to a specific message id.

Controlled by `channels.telegram.replyToMode`:
- `first` (default), `all`, `off`.

## Audio messages (voice vs file)
Telegram distinguishes **voice notes** (round bubble) from **audio files** (metadata card).
Moltbot defaults to audio files for backward compatibility.

To force a voice note bubble in agent replies, include this tag anywhere in the reply:
- `[[audio_as_voice]]` — send audio as a voice note instead of a file.

The tag is stripped from the delivered text. Other channels ignore this tag.

For message tool sends, set `asVoice: true` with a voice-compatible audio `media` URL
(`message` is optional when media is present):
=======
  </Accordion>

  <Accordion title="Audio, video, and stickers">
    ### Audio messages

    Telegram distinguishes voice notes vs audio files.

    - default: audio file behavior
    - tag `[[audio_as_voice]]` in agent reply to force voice-note send

    Message action example:
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

```json5
{
  "action": "send",
  "channel": "telegram",
  "to": "123456789",
  "media": "https://example.com/voice.ogg",
  "asVoice": true
}
```

<<<<<<< HEAD
## Stickers

Moltbot supports receiving and sending Telegram stickers with intelligent caching.
=======
    ### Video messages

    Telegram distinguishes video files vs video notes.

    Message action example:

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    Video notes do not support captions; provided message text is sent separately.

    ### Stickers

    Inbound sticker handling:
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

    - static WEBP: downloaded and processed (placeholder `<media:sticker>`)
    - animated TGS: skipped
    - video WEBM: skipped

<<<<<<< HEAD
When a user sends a sticker, Moltbot handles it based on the sticker type:
=======
    Sticker context fields:
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

<<<<<<< HEAD
Template context field available when receiving stickers:
- `Sticker` — object with:
  - `emoji` — emoji associated with the sticker
  - `setName` — name of the sticker set
  - `fileId` — Telegram file ID (send the same sticker back)
  - `fileUniqueId` — stable ID for cache lookup
  - `cachedDescription` — cached vision description when available
=======
    Sticker cache file:

    - `~/.openclaw/telegram/sticker-cache.json`
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

    Stickers are described once (when possible) and cached to reduce repeated vision calls.

<<<<<<< HEAD
Stickers are processed through the AI's vision capabilities to generate descriptions. Since the same stickers are often sent repeatedly, Moltbot caches these descriptions to avoid redundant API calls.

**How it works:**

1. **First encounter:** The sticker image is sent to the AI for vision analysis. The AI generates a description (e.g., "A cartoon cat waving enthusiastically").
2. **Cache storage:** The description is saved along with the sticker's file ID, emoji, and set name.
3. **Subsequent encounters:** When the same sticker is seen again, the cached description is used directly. The image is not sent to the AI.

**Cache location:** `~/.clawdbot/telegram/sticker-cache.json`

**Cache entry format:**
```json
{
  "fileId": "CAACAgIAAxkBAAI...",
  "fileUniqueId": "AgADBAADb6cxG2Y",
  "emoji": "👋",
  "setName": "CoolCats",
  "description": "A cartoon cat waving enthusiastically",
  "cachedAt": "2026-01-15T10:30:00.000Z"
}
```

**Benefits:**
- Reduces API costs by avoiding repeated vision calls for the same sticker
- Faster response times for cached stickers (no vision processing delay)
- Enables sticker search functionality based on cached descriptions

The cache is populated automatically as stickers are received. There is no manual cache management required.

### Sending stickers

The agent can send and search stickers using the `sticker` and `sticker-search` actions. These are disabled by default and must be enabled in config:
=======
    Enable sticker actions:
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

```json5
{
  channels: {
    telegram: {
      actions: {
        sticker: true
      }
    }
  }
}
```

    Send sticker action:

```json5
{
  "action": "sticker",
  "channel": "telegram",
  "to": "123456789",
  "fileId": "CAACAgIAAxkBAAI..."
}
```

<<<<<<< HEAD
Parameters:
- `fileId` (required) — the Telegram file ID of the sticker. Obtain this from `Sticker.fileId` when receiving a sticker, or from a `sticker-search` result.
- `replyTo` (optional) — message ID to reply to.
- `threadId` (optional) — message thread ID for forum topics.

**Search for stickers:**

The agent can search cached stickers by description, emoji, or set name:
=======
    Search cached stickers:
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

```json5
{
  "action": "sticker-search",
  "channel": "telegram",
  "query": "cat waving",
  "limit": 5
}
```

<<<<<<< HEAD
Returns matching stickers from the cache:
```json5
{
  "ok": true,
  "count": 2,
  "stickers": [
    {
      "fileId": "CAACAgIAAxkBAAI...",
      "emoji": "👋",
      "description": "A cartoon cat waving enthusiastically",
      "setName": "CoolCats"
    }
  ]
}
```
=======
  </Accordion>

  <Accordion title="Reaction notifications">
    Telegram reactions arrive as `message_reaction` updates (separate from message payloads).
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

    When enabled, OpenClaw enqueues system events like:

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

<<<<<<< HEAD
```json5
{
  "action": "sticker",
  "channel": "telegram",
  "to": "-1001234567890",
  "fileId": "CAACAgIAAxkBAAI...",
  "replyTo": 42,
  "threadId": 123
}
```

## Streaming (drafts)
Telegram can stream **draft bubbles** while the agent is generating a response.
Moltbot uses Bot API `sendMessageDraft` (not real messages) and then sends the
final reply as a normal message.

Requirements (Telegram Bot API 9.3+):
- **Private chats with topics enabled** (forum topic mode for the bot).
- Incoming messages must include `message_thread_id` (private topic thread).
- Streaming is ignored for groups/supergroups/channels.

Config:
- `channels.telegram.streamMode: "off" | "partial" | "block"` (default: `partial`)
  - `partial`: update the draft bubble with the latest streaming text.
  - `block`: update the draft bubble in larger blocks (chunked).
  - `off`: disable draft streaming.
- Optional (only for `streamMode: "block"`):
  - `channels.telegram.draftChunk: { minChars?, maxChars?, breakPreference? }`
    - defaults: `minChars: 200`, `maxChars: 800`, `breakPreference: "paragraph"` (clamped to `channels.telegram.textChunkLimit`).
=======
    Config:

    - `channels.telegram.reactionNotifications`: `off | own | all` (default: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (default: `minimal`)

    Notes:

    - `own` means user reactions to bot-sent messages only (best-effort via sent-message cache).
    - Telegram does not provide thread IDs in reaction updates.
      - non-forum groups route to group chat session
      - forum groups route to the group general-topic session (`:topic:1`), not the exact originating topic

    `allowed_updates` for polling/webhook include `message_reaction` automatically.

  </Accordion>

  <Accordion title="Config writes from Telegram events and commands">
    Channel config writes are enabled by default (`configWrites !== false`).
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))

    Telegram-triggered writes include:

<<<<<<< HEAD
Reasoning stream (Telegram only):
- `/reasoning stream` streams reasoning into the draft bubble while the reply is
  generating, then sends the final answer without reasoning.
- If `channels.telegram.streamMode` is `off`, reasoning stream is disabled.
More context: [Streaming + chunking](/concepts/streaming).

## Retry policy
Outbound Telegram API calls retry on transient network/429 errors with exponential backoff and jitter. Configure via `channels.telegram.retry`. See [Retry policy](/concepts/retry).

## Agent tool (messages + reactions)
- Tool: `telegram` with `sendMessage` action (`to`, `content`, optional `mediaUrl`, `replyToMessageId`, `messageThreadId`).
- Tool: `telegram` with `react` action (`chatId`, `messageId`, `emoji`).
- Tool: `telegram` with `deleteMessage` action (`chatId`, `messageId`).
- Reaction removal semantics: see [/tools/reactions](/tools/reactions).
- Tool gating: `channels.telegram.actions.reactions`, `channels.telegram.actions.sendMessage`, `channels.telegram.actions.deleteMessage` (default: enabled), and `channels.telegram.actions.sticker` (default: disabled).

## Reaction notifications

**How reactions work:**
Telegram reactions arrive as **separate `message_reaction` events**, not as properties in message payloads. When a user adds a reaction, Moltbot:

1. Receives the `message_reaction` update from Telegram API
2. Converts it to a **system event** with format: `"Telegram reaction added: {emoji} by {user} on msg {id}"`
3. Enqueues the system event using the **same session key** as regular messages
4. When the next message arrives in that conversation, system events are drained and prepended to the agent's context

The agent sees reactions as **system notifications** in the conversation history, not as message metadata.

**Configuration:**
- `channels.telegram.reactionNotifications`: Controls which reactions trigger notifications
  - `"off"` — ignore all reactions
  - `"own"` — notify when users react to bot messages (best-effort; in-memory) (default)
  - `"all"` — notify for all reactions

- `channels.telegram.reactionLevel`: Controls agent's reaction capability
  - `"off"` — agent cannot react to messages
  - `"ack"` — bot sends acknowledgment reactions (👀 while processing) (default)
  - `"minimal"` — agent can react sparingly (guideline: 1 per 5-10 exchanges)
  - `"extensive"` — agent can react liberally when appropriate

**Forum groups:** Reactions in forum groups include `message_thread_id` and use session keys like `agent:main:telegram:group:{chatId}:topic:{threadId}`. This ensures reactions and messages in the same topic stay together.

**Example config:**
=======
    - group migration events (`migrate_to_chat_id`) to update `channels.telegram.groups`
    - `/config set` and `/config unset` (requires command enablement)

    Disable:

>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))
```json5
{
  channels: {
    telegram: {
<<<<<<< HEAD
      reactionNotifications: "all",  // See all reactions
      reactionLevel: "minimal"        // Agent can react sparingly
    }
  }
}
```

**Requirements:**
- Telegram bots must explicitly request `message_reaction` in `allowed_updates` (configured automatically by Moltbot)
- For webhook mode, reactions are included in the webhook `allowed_updates`
- For polling mode, reactions are included in the `getUpdates` `allowed_updates`

## Delivery targets (CLI/cron)
- Use a chat id (`123456789`) or a username (`@name`) as the target.
- Example: `moltbot message send --channel telegram --target 123456789 --message "hi"`.

## Troubleshooting

**Bot doesn’t respond to non-mention messages in a group:**
- If you set `channels.telegram.groups.*.requireMention=false`, Telegram’s Bot API **privacy mode** must be disabled.
  - BotFather: `/setprivacy` → **Disable** (then remove + re-add the bot to the group)
- `moltbot channels status` shows a warning when config expects unmentioned group messages.
- `moltbot channels status --probe` can additionally check membership for explicit numeric group IDs (it can’t audit wildcard `"*"` rules).
- Quick test: `/activation always` (session-only; use config for persistence)

**Bot not seeing group messages at all:**
- If `channels.telegram.groups` is set, the group must be listed or use `"*"`
- Check Privacy Settings in @BotFather → "Group Privacy" should be **OFF**
- Verify bot is actually a member (not just an admin with no read access)
- Check gateway logs: `moltbot logs --follow` (look for "skipping group message")

**Bot responds to mentions but not `/activation always`:**
- The `/activation` command updates session state but doesn't persist to config
- For persistent behavior, add group to `channels.telegram.groups` with `requireMention: false`

**Commands like `/status` don't work:**
- Make sure your Telegram user ID is authorized (via pairing or `channels.telegram.allowFrom`)
- Commands require authorization even in groups with `groupPolicy: "open"`

**Long-polling aborts immediately on Node 22+ (often with proxies/custom fetch):**
- Node 22+ is stricter about `AbortSignal` instances; foreign signals can abort `fetch` calls right away.
- Upgrade to a Moltbot build that normalizes abort signals, or run the gateway on Node 20 until you can upgrade.

**Bot starts, then silently stops responding (or logs `HttpError: Network request ... failed`):**
- Some hosts resolve `api.telegram.org` to IPv6 first. If your server does not have working IPv6 egress, grammY can get stuck on IPv6-only requests.
- Fix by enabling IPv6 egress **or** forcing IPv4 resolution for `api.telegram.org` (for example, add an `/etc/hosts` entry using the IPv4 A record, or prefer IPv4 in your OS DNS stack), then restart the gateway.
- Quick check: `dig +short api.telegram.org A` and `dig +short api.telegram.org AAAA` to confirm what DNS returns.

## Configuration reference (Telegram)
Full configuration: [Configuration](/gateway/configuration)

Provider options:
- `channels.telegram.enabled`: enable/disable channel startup.
- `channels.telegram.botToken`: bot token (BotFather).
- `channels.telegram.tokenFile`: read token from file path.
- `channels.telegram.dmPolicy`: `pairing | allowlist | open | disabled` (default: pairing).
- `channels.telegram.allowFrom`: DM allowlist (ids/usernames). `open` requires `"*"`.
- `channels.telegram.groupPolicy`: `open | allowlist | disabled` (default: allowlist).
- `channels.telegram.groupAllowFrom`: group sender allowlist (ids/usernames).
- `channels.telegram.groups`: per-group defaults + allowlist (use `"*"` for global defaults).
  - `channels.telegram.groups.<id>.requireMention`: mention gating default.
  - `channels.telegram.groups.<id>.skills`: skill filter (omit = all skills, empty = none).
  - `channels.telegram.groups.<id>.allowFrom`: per-group sender allowlist override.
  - `channels.telegram.groups.<id>.systemPrompt`: extra system prompt for the group.
  - `channels.telegram.groups.<id>.enabled`: disable the group when `false`.
  - `channels.telegram.groups.<id>.topics.<threadId>.*`: per-topic overrides (same fields as group).
  - `channels.telegram.groups.<id>.topics.<threadId>.requireMention`: per-topic mention gating override.
- `channels.telegram.capabilities.inlineButtons`: `off | dm | group | all | allowlist` (default: allowlist).
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`: per-account override.
- `channels.telegram.replyToMode`: `off | first | all` (default: `first`).
- `channels.telegram.textChunkLimit`: outbound chunk size (chars).
- `channels.telegram.chunkMode`: `length` (default) or `newline` to split on blank lines (paragraph boundaries) before length chunking.
- `channels.telegram.linkPreview`: toggle link previews for outbound messages (default: true).
- `channels.telegram.streamMode`: `off | partial | block` (draft streaming).
- `channels.telegram.mediaMaxMb`: inbound/outbound media cap (MB).
- `channels.telegram.retry`: retry policy for outbound Telegram API calls (attempts, minDelayMs, maxDelayMs, jitter).
- `channels.telegram.network.autoSelectFamily`: override Node autoSelectFamily (true=enable, false=disable). Defaults to disabled on Node 22 to avoid Happy Eyeballs timeouts.
- `channels.telegram.proxy`: proxy URL for Bot API calls (SOCKS/HTTP).
- `channels.telegram.webhookUrl`: enable webhook mode.
- `channels.telegram.webhookSecret`: webhook secret (optional).
- `channels.telegram.webhookPath`: local webhook path (default `/telegram-webhook`).
- `channels.telegram.actions.reactions`: gate Telegram tool reactions.
- `channels.telegram.actions.sendMessage`: gate Telegram tool message sends.
- `channels.telegram.actions.deleteMessage`: gate Telegram tool message deletes.
- `channels.telegram.actions.sticker`: gate Telegram sticker actions — send and search (default: false).
- `channels.telegram.reactionNotifications`: `off | own | all` — control which reactions trigger system events (default: `own` when not set).
- `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` — control agent's reaction capability (default: `minimal` when not set).

Related global options:
- `agents.list[].groupChat.mentionPatterns` (mention gating patterns).
- `messages.groupChat.mentionPatterns` (global fallback).
- `commands.native` (defaults to `"auto"` → on for Telegram/Discord, off for Slack), `commands.text`, `commands.useAccessGroups` (command behavior). Override with `channels.telegram.commands.native`.
- `messages.responsePrefix`, `messages.ackReaction`, `messages.ackReactionScope`, `messages.removeAckAfterReply`.
=======
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="Long polling vs webhook">
    Default: long polling.

    Webhook mode:

    - set `channels.telegram.webhookUrl`
    - set `channels.telegram.webhookSecret` (required when webhook URL is set)
    - optional `channels.telegram.webhookPath` (default `/telegram-webhook`)

    Default local listener for webhook mode binds to `0.0.0.0:8787`.

    If your public endpoint differs, place a reverse proxy in front and point `webhookUrl` at the public URL.

  </Accordion>

  <Accordion title="Limits, retry, and CLI targets">
    - `channels.telegram.textChunkLimit` default is 4000.
    - `channels.telegram.chunkMode="newline"` prefers paragraph boundaries (blank lines) before length splitting.
    - `channels.telegram.mediaMaxMb` (default 5) caps inbound Telegram media download/processing size.
    - `channels.telegram.timeoutSeconds` overrides Telegram API client timeout (if unset, grammY default applies).
    - group context history uses `channels.telegram.historyLimit` or `messages.groupChat.historyLimit` (default 50); `0` disables.
    - DM history controls:
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - outbound Telegram API retries are configurable via `channels.telegram.retry`.

    CLI send target can be numeric chat ID or username:

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
```

  </Accordion>
</AccordionGroup>

## Troubleshooting

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - If `requireMention=false`, Telegram privacy mode must allow full visibility.
      - BotFather: `/setprivacy` -> Disable
      - then remove + re-add bot to group
    - `openclaw channels status` warns when config expects unmentioned group messages.
    - `openclaw channels status --probe` can check explicit numeric group IDs; wildcard `"*"` cannot be membership-probed.
    - quick session test: `/activation always`.

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - when `channels.telegram.groups` exists, group must be listed (or include `"*"`)
    - verify bot membership in group
    - review logs: `openclaw logs --follow` for skip reasons

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - authorize your sender identity (pairing and/or numeric `allowFrom`)
    - command authorization still applies even when group policy is `open`
    - `setMyCommands failed` usually indicates DNS/HTTPS reachability issues to `api.telegram.org`

  </Accordion>

  <Accordion title="Polling or network instability">

    - Node 22+ + custom fetch/proxy can trigger immediate abort behavior if AbortSignal types mismatch.
    - Some hosts resolve `api.telegram.org` to IPv6 first; broken IPv6 egress can cause intermittent Telegram API failures.
    - Validate DNS answers:

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

More help: [Channel troubleshooting](/channels/troubleshooting).

## Telegram config reference pointers

Primary reference:

<<<<<<< HEAD
=======
- `channels.telegram.enabled`: enable/disable channel startup.
- `channels.telegram.botToken`: bot token (BotFather).
- `channels.telegram.tokenFile`: read token from file path.
- `channels.telegram.dmPolicy`: `pairing | allowlist | open | disabled` (default: pairing).
- `channels.telegram.allowFrom`: DM allowlist (numeric Telegram user IDs). `open` requires `"*"`. `openclaw doctor --fix` can resolve legacy `@username` entries to IDs.
- `channels.telegram.groupPolicy`: `open | allowlist | disabled` (default: allowlist).
- `channels.telegram.groupAllowFrom`: group sender allowlist (numeric Telegram user IDs). `openclaw doctor --fix` can resolve legacy `@username` entries to IDs.
- `channels.telegram.groups`: per-group defaults + allowlist (use `"*"` for global defaults).
  - `channels.telegram.groups.<id>.groupPolicy`: per-group override for groupPolicy (`open | allowlist | disabled`).
  - `channels.telegram.groups.<id>.requireMention`: mention gating default.
  - `channels.telegram.groups.<id>.skills`: skill filter (omit = all skills, empty = none).
  - `channels.telegram.groups.<id>.allowFrom`: per-group sender allowlist override.
  - `channels.telegram.groups.<id>.systemPrompt`: extra system prompt for the group.
  - `channels.telegram.groups.<id>.enabled`: disable the group when `false`.
  - `channels.telegram.groups.<id>.topics.<threadId>.*`: per-topic overrides (same fields as group).
  - `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`: per-topic override for groupPolicy (`open | allowlist | disabled`).
  - `channels.telegram.groups.<id>.topics.<threadId>.requireMention`: per-topic mention gating override.
- `channels.telegram.capabilities.inlineButtons`: `off | dm | group | all | allowlist` (default: allowlist).
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`: per-account override.
- `channels.telegram.replyToMode`: `off | first | all` (default: `off`).
- `channels.telegram.textChunkLimit`: outbound chunk size (chars).
- `channels.telegram.chunkMode`: `length` (default) or `newline` to split on blank lines (paragraph boundaries) before length chunking.
- `channels.telegram.linkPreview`: toggle link previews for outbound messages (default: true).
- `channels.telegram.streamMode`: `off | partial | block` (draft streaming).
- `channels.telegram.mediaMaxMb`: inbound/outbound media cap (MB).
- `channels.telegram.retry`: retry policy for outbound Telegram API calls (attempts, minDelayMs, maxDelayMs, jitter).
- `channels.telegram.network.autoSelectFamily`: override Node autoSelectFamily (true=enable, false=disable). Defaults to disabled on Node 22 to avoid Happy Eyeballs timeouts.
- `channels.telegram.proxy`: proxy URL for Bot API calls (SOCKS/HTTP).
- `channels.telegram.webhookUrl`: enable webhook mode (requires `channels.telegram.webhookSecret`).
- `channels.telegram.webhookSecret`: webhook secret (required when webhookUrl is set).
- `channels.telegram.webhookPath`: local webhook path (default `/telegram-webhook`).
- `channels.telegram.webhookHost`: local webhook bind host (default `127.0.0.1`).
- `channels.telegram.actions.reactions`: gate Telegram tool reactions.
- `channels.telegram.actions.sendMessage`: gate Telegram tool message sends.
- `channels.telegram.actions.deleteMessage`: gate Telegram tool message deletes.
- `channels.telegram.actions.sticker`: gate Telegram sticker actions — send and search (default: false).
- `channels.telegram.reactionNotifications`: `off | own | all` — control which reactions trigger system events (default: `own` when not set).
- `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` — control agent's reaction capability (default: `minimal` when not set).

>>>>>>> 226bf7463 (docs(telegram): document allowlist id requirement)
- [Configuration reference - Telegram](/gateway/configuration-reference#telegram)

Telegram-specific high-signal fields:

- startup/auth: `enabled`, `botToken`, `tokenFile`, `accounts.*`
- access control: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`
- command/menu: `commands.native`, `customCommands`
- threading/replies: `replyToMode`
- streaming: `streamMode`, `draftChunk`, `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `timeoutSeconds`, `retry`, `network.autoSelectFamily`, `proxy`
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions: `reactionNotifications`, `reactionLevel`
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## Related

- [Pairing](/channels/pairing)
- [Channel routing](/channels/channel-routing)
- [Troubleshooting](/channels/troubleshooting)
>>>>>>> 880f92c9e (docs(channels): modernize telegram docs page (#14168))
