---
summary: "Streaming + chunking behavior (block replies, channel preview streaming, mode mapping)"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
<<<<<<< HEAD
<<<<<<< HEAD
  - Debugging duplicate/early block replies or draft streaming
=======
  - Debugging duplicate/early block replies or Telegram preview streaming
=======
  - Debugging duplicate/early block replies or channel preview streaming
>>>>>>> 2c14b0cf4 (refactor(config): unify streaming config across channels)
title: "Streaming and Chunking"
>>>>>>> a69e82765 (fix(telegram): stream replies in-place without duplicate final sends)
---

# Streaming + chunking

<<<<<<< HEAD
<<<<<<< HEAD
Moltbot has two separate “streaming” layers:
=======
OpenClaw has two separate “streaming” layers:
=======
OpenClaw has two separate streaming layers:
>>>>>>> 2c14b0cf4 (refactor(config): unify streaming config across channels)

>>>>>>> 8cab78abb (chore: Run `pnpm format:fix`.)
- **Block streaming (channels):** emit completed **blocks** as the assistant writes. These are normal channel messages (not token deltas).
- **Preview streaming (Telegram/Discord/Slack):** update a temporary **preview message** while generating.

There is **no true token-delta streaming** to channel messages today. Preview streaming is message-based (send + edits/appends).

## Block streaming (channel messages)

Block streaming sends assistant output in coarse chunks as it becomes available.

```
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```

Legend:

- `text_delta/events`: model stream events (may be sparse for non-streaming models).
- `chunker`: `EmbeddedBlockChunker` applying min/max bounds + break preference.
- `channel send`: actual outbound messages (block replies).

**Controls:**

- `agents.defaults.blockStreamingDefault`: `"on"`/`"off"` (default off).
- Channel overrides: `*.blockStreaming` (and per-account variants) to force `"on"`/`"off"` per channel.
- `agents.defaults.blockStreamingBreak`: `"text_end"` or `"message_end"`.
- `agents.defaults.blockStreamingChunk`: `{ minChars, maxChars, breakPreference? }`.
- `agents.defaults.blockStreamingCoalesce`: `{ minChars?, maxChars?, idleMs? }` (merge streamed blocks before send).
- Channel hard cap: `*.textChunkLimit` (e.g., `channels.whatsapp.textChunkLimit`).
- Channel chunk mode: `*.chunkMode` (`length` default, `newline` splits on blank lines (paragraph boundaries) before length chunking).
- Discord soft cap: `channels.discord.maxLinesPerMessage` (default 17) splits tall replies to avoid UI clipping.

**Boundary semantics:**

- `text_end`: stream blocks as soon as chunker emits; flush on each `text_end`.
- `message_end`: wait until assistant message finishes, then flush buffered output.

`message_end` still uses the chunker if the buffered text exceeds `maxChars`, so it can emit multiple chunks at the end.

## Chunking algorithm (low/high bounds)

Block chunking is implemented by `EmbeddedBlockChunker`:

- **Low bound:** don’t emit until buffer >= `minChars` (unless forced).
- **High bound:** prefer splits before `maxChars`; if forced, split at `maxChars`.
- **Break preference:** `paragraph` → `newline` → `sentence` → `whitespace` → hard break.
- **Code fences:** never split inside fences; when forced at `maxChars`, close + reopen the fence to keep Markdown valid.

`maxChars` is clamped to the channel `textChunkLimit`, so you can’t exceed per-channel caps.

## Coalescing (merge streamed blocks)

When block streaming is enabled, Moltbot can **merge consecutive block chunks**
before sending them out. This reduces “single-line spam” while still providing
progressive output.

- Coalescing waits for **idle gaps** (`idleMs`) before flushing.
- Buffers are capped by `maxChars` and will flush if they exceed it.
- `minChars` prevents tiny fragments from sending until enough text accumulates
  (final flush always sends remaining text).
- Joiner is derived from `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → space).
- Channel overrides are available via `*.blockStreamingCoalesce` (including per-account configs).
- Default coalesce `minChars` is bumped to 1500 for Signal/Slack/Discord unless overridden.

## Human-like pacing between blocks

When block streaming is enabled, you can add a **randomized pause** between
block replies (after the first block). This makes multi-bubble responses feel
more natural.

- Config: `agents.defaults.humanDelay` (override per agent via `agents.list[].humanDelay`).
- Modes: `off` (default), `natural` (800–2500ms), `custom` (`minMs`/`maxMs`).
- Applies only to **block replies**, not final replies or tool summaries.

## “Stream chunks or everything”

This maps to:

- **Stream chunks:** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (emit as you go). Non-Telegram channels also need `*.blockStreaming: true`.
- **Stream everything at end:** `blockStreamingBreak: "message_end"` (flush once, possibly multiple chunks if very long).
- **No block streaming:** `blockStreamingDefault: "off"` (only final reply).

**Channel note:** Block streaming is **off unless**
`*.blockStreaming` is explicitly set to `true`. Channels can stream a live preview
(`channels.<channel>.streaming`) without block replies.

Config location reminder: the `blockStreaming*` defaults live under
`agents.defaults`, not the root config.

## Preview streaming modes

Canonical key: `channels.<channel>.streaming`

<<<<<<< HEAD
- Uses Bot API `sendMessage` (first update) + `editMessageText` (subsequent updates).
<<<<<<< HEAD
- `channels.telegram.streamMode: "partial" | "block" | "off"`.
<<<<<<< HEAD
  - `partial`: draft updates with the latest stream text.
  - `block`: draft updates in chunked blocks (same chunker rules).
  - `off`: no draft streaming.
- Draft chunk config (only for `streamMode: "block"`): `channels.telegram.draftChunk` (defaults: `minChars: 200`, `maxChars: 800`).
- Draft streaming is separate from block streaming; block replies are off by default and only enabled by `*.blockStreaming: true` on non-Telegram channels.
- Final reply is still a normal message.
- `/reasoning stream` writes reasoning into the draft bubble (Telegram only).

When draft streaming is active, Moltbot disables block streaming for that reply to avoid double-streaming.
=======
  - `partial`: preview updates with latest stream text.
  - `block`: preview updates in chunked blocks (same chunker rules).
  - `off`: no preview streaming.
- Preview chunk config (only for `streamMode: "block"`): `channels.telegram.draftChunk` (defaults: `minChars: 200`, `maxChars: 800`).
=======
- `channels.telegram.streaming: true | false` (default: `true`).
>>>>>>> 677384c51 (refactor: simplify Telegram preview streaming to single boolean (#22012))
- Preview streaming is separate from block streaming.
- When Telegram block streaming is explicitly enabled, preview streaming is skipped to avoid double-streaming.
- Text-only finals are applied by editing the preview message in place.
- Non-text/complex finals fall back to normal final message delivery.
- `/reasoning stream` writes reasoning into the live preview (Telegram only).
>>>>>>> a69e82765 (fix(telegram): stream replies in-place without duplicate final sends)
=======
Modes:
>>>>>>> 2c14b0cf4 (refactor(config): unify streaming config across channels)

- `off`: disable preview streaming.
- `partial`: single preview that is replaced with latest text.
- `block`: preview updates in chunked/appended steps.
- `progress`: progress/status preview during generation, final answer at completion.

### Channel mapping

| Channel  | `off` | `partial` | `block` | `progress`        |
| -------- | ----- | --------- | ------- | ----------------- |
| Telegram | ✅    | ✅        | ✅      | maps to `partial` |
| Discord  | ✅    | ✅        | ✅      | maps to `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅                |

Slack-only:

- `channels.slack.nativeStreaming` toggles Slack native streaming API calls when `streaming=partial` (default: `true`).

Legacy key migration:

- Telegram: `streamMode` + boolean `streaming` auto-migrate to `streaming` enum.
- Discord: `streamMode` + boolean `streaming` auto-migrate to `streaming` enum.
- Slack: `streamMode` auto-migrates to `streaming` enum; boolean `streaming` auto-migrates to `nativeStreaming`.

### Runtime behavior

Telegram:

- Uses Bot API `sendMessage` + `editMessageText`.
- Preview streaming is skipped when Telegram block streaming is explicitly enabled (to avoid double-streaming).
- `/reasoning stream` can write reasoning to preview.

Discord:

- Uses send + edit preview messages.
- `block` mode uses draft chunking (`draftChunk`).
- Preview streaming is skipped when Discord block streaming is explicitly enabled.

Slack:

- `partial` can use Slack native streaming (`chat.startStream`/`append`/`stop`) when available.
- `block` uses append-style draft previews.
- `progress` uses status preview text, then final answer.
