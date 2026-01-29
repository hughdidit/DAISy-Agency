<<<<<<< HEAD
import { resolveUserTimezone } from "../../agents/date-time.js";
import { formatZonedTimestamp } from "../../auto-reply/envelope.js";
import type { MoltbotConfig } from "../../config/types.js";

/**
 * Cron jobs inject "Current time: ..." into their messages.
 * Skip injection for those.
 */
const CRON_TIME_PATTERN = /Current time: /;

/**
 * Matches a leading `[... YYYY-MM-DD HH:MM ...]` envelope — either from
 * channel plugins or from a previous injection. Uses the same YYYY-MM-DD
 * HH:MM format as {@link formatZonedTimestamp}, so detection stays in sync
 * with the formatting.
 */
const TIMESTAMP_ENVELOPE_PATTERN = /^\[.*\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;

export interface TimestampInjectionOptions {
  timezone?: string;
=======
import {
  formatUserTime,
  resolveUserTimeFormat,
  resolveUserTimezone,
} from "../../agents/date-time.js";
import type { MoltbotConfig } from "../../config/types.js";

/**
 * Envelope pattern used by channel plugins (Discord, Telegram, etc.):
 *   [Channel sender 2026-01-28 20:31 EST] message text
 *
 * Messages arriving through channels already have timestamps.
 * We skip injection for those to avoid double-stamping.
 */
const ENVELOPE_PATTERN = /^\[[\w]+ .+ \d{4}-\d{2}-\d{2}/;

/**
 * Cron jobs inject "Current time: ..." into their messages.
 * Skip injection for those too.
 */
const CRON_TIME_PATTERN = /Current time: /;

export interface TimestampInjectionOptions {
  timezone?: string;
  timeFormat?: "12" | "24";
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
  now?: Date;
}

/**
<<<<<<< HEAD
 * Injects a compact timestamp prefix into a message if one isn't already
 * present. Uses the same `YYYY-MM-DD HH:MM TZ` format as channel envelope
 * timestamps ({@link formatZonedTimestamp}), keeping token cost low (~7
 * tokens) and format consistent across all agent contexts.
 *
 * Used by the gateway `agent` and `chat.send` handlers to give TUI, web,
 * spawned subagents, `sessions_send`, and heartbeat wake events date/time
 * awareness — without modifying the system prompt (which is cached).
 *
 * Channel messages (Discord, Telegram, etc.) already have timestamps via
 * envelope formatting and take a separate code path — they never reach
 * these handlers, so there is no double-stamping risk. The detection
 * pattern is a safety net for edge cases.
=======
 * Injects a timestamp prefix into a message if one isn't already present.
 *
 * Used by the gateway agent handler to give all agent contexts (TUI, web,
 * spawned subagents, sessions_send, heartbeats) date/time awareness without
 * modifying the system prompt (which is cached for stability).
 *
 * Channel messages (Discord, Telegram, etc.) already have timestamps via
 * envelope formatting and take a separate code path — they never reach
 * the agent handler, so there's no double-stamping risk.
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
 *
 * @see https://github.com/moltbot/moltbot/issues/3658
 */
export function injectTimestamp(message: string, opts?: TimestampInjectionOptions): string {
  if (!message.trim()) return message;

<<<<<<< HEAD
  // Already has an envelope or injected timestamp
  if (TIMESTAMP_ENVELOPE_PATTERN.test(message)) return message;
=======
  // Already has a channel envelope timestamp
  if (ENVELOPE_PATTERN.test(message)) return message;
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)

  // Already has a cron-injected timestamp
  if (CRON_TIME_PATTERN.test(message)) return message;

  const now = opts?.now ?? new Date();
  const timezone = opts?.timezone ?? "UTC";
<<<<<<< HEAD

  const formatted = formatZonedTimestamp(now, timezone);
  if (!formatted) return message;

  // 3-letter DOW: small models (8B) can't reliably derive day-of-week from
  // a date, and may treat a bare "Wed" as a typo. Costs ~1 token.
  const dow = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
    now,
  );

  return `[${dow} ${formatted}] ${message}`;
=======
  const timeFormat = opts?.timeFormat ?? "12";

  const formatted = formatUserTime(now, timezone, resolveUserTimeFormat(timeFormat));
  if (!formatted) return message;

  return `[${formatted}] ${message}`;
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
}

/**
 * Build TimestampInjectionOptions from a MoltbotConfig.
 */
export function timestampOptsFromConfig(cfg: MoltbotConfig): TimestampInjectionOptions {
  return {
    timezone: resolveUserTimezone(cfg.agents?.defaults?.userTimezone),
<<<<<<< HEAD
=======
    timeFormat: cfg.agents?.defaults?.timeFormat as "12" | "24" | undefined,
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
  };
}
