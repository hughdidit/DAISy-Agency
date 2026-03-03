<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { resolveUserTimezone } from "../../agents/date-time.js";
<<<<<<< HEAD
import { formatZonedTimestamp } from "../../auto-reply/envelope.js";
import type { OpenClawConfig } from "../../config/types.js";
=======
import type { OpenClawConfig } from "../../config/types.js";
import { resolveUserTimezone } from "../../agents/date-time.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { resolveUserTimezone } from "../../agents/date-time.js";
import type { OpenClawConfig } from "../../config/types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { OpenClawConfig } from "../../config/types.js";
import { resolveUserTimezone } from "../../agents/date-time.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { resolveUserTimezone } from "../../agents/date-time.js";
import type { OpenClawConfig } from "../../config/types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { formatZonedTimestamp } from "../../infra/format-time/format-datetime.ts";
>>>>>>> a1123dd9b (Centralize date/time formatting utilities (#11831))

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
=======
import { resolveUserTimezone } from "../../agents/date-time.js";
import { formatZonedTimestamp } from "../../auto-reply/envelope.js";
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
import type { OpenClawConfig } from "../../config/types.js";

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
 *
 * Used by the gateway `agent` and `chat.send` handlers to give TUI, web,
 * spawned subagents, `sessions_send`, and heartbeat wake events date/time
 * awareness — without modifying the system prompt (which is cached).
 *
 * Channel messages (Discord, Telegram, etc.) already have timestamps via
 * envelope formatting and take a separate code path — they never reach
 * the agent handler, so there's no double-stamping risk.
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
 *
 * @see https://github.com/moltai/openclawbot/issues/3658
 */
export function injectTimestamp(message: string, opts?: TimestampInjectionOptions): string {
  if (!message.trim()) {
    return message;
  }

<<<<<<< HEAD
  // Already has an envelope or injected timestamp
<<<<<<< HEAD
  if (TIMESTAMP_ENVELOPE_PATTERN.test(message)) return message;
=======
  // Already has an envelope or injected timestamp
  if (TIMESTAMP_ENVELOPE_PATTERN.test(message)) return message;
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
=======
  if (TIMESTAMP_ENVELOPE_PATTERN.test(message)) {
    return message;
  }
>>>>>>> 9c2985301 (Gateway: inject timestamps into agent/chat.send (#3705) (thanks @conroywhitney, @CashWilliams))

  // Already has a cron-injected timestamp
  if (CRON_TIME_PATTERN.test(message)) {
    return message;
  }

  const now = opts?.now ?? new Date();
  const timezone = opts?.timezone ?? "UTC";
<<<<<<< HEAD

  const formatted = formatZonedTimestamp(now, { timeZone: timezone });
  if (!formatted) {
    return message;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  // 3-letter DOW: small models (8B) can't reliably derive day-of-week from
  // a date, and may treat a bare "Wed" as a typo. Costs ~1 token.
  const dow = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
    now,
  );

  return `[${dow} ${formatted}] ${message}`;
  const timeFormat = opts?.timeFormat ?? "12";
=======

  const formatted = formatZonedTimestamp(now, timezone);
  if (!formatted) return message;

  return `[${formatted}] ${message}`;
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
  const dow = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
    now,
  );

  return `[${dow} ${formatted}] ${message}`;
>>>>>>> a6c68e869 (feat: add 3-letter DOW prefix to injected timestamps)
=======
>>>>>>> 8a5b139a9 (revert: drop "Current Date:" label, keep [Wed YYYY-MM-DD HH:MM TZ])
}

/**
 * Build TimestampInjectionOptions from an OpenClawConfig.
 */
export function timestampOptsFromConfig(cfg: OpenClawConfig): TimestampInjectionOptions {
  return {
    timezone: resolveUserTimezone(cfg.agents?.defaults?.userTimezone),
<<<<<<< HEAD
=======
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
  };
}
