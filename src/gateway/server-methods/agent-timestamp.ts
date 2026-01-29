<<<<<<< HEAD
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
=======
import { resolveUserTimezone } from "../../agents/date-time.js";
import { formatZonedTimestamp } from "../../auto-reply/envelope.js";
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
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
<<<<<<< HEAD
  timeFormat?: "12" | "24";
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
  now?: Date;
}

/**
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
 * Injects a compact timestamp prefix into a message if one isn't already
 * present. Uses the same `YYYY-MM-DD HH:MM TZ` format as channel envelope
 * timestamps ({@link formatZonedTimestamp}), keeping token cost low (~7
 * tokens) and format consistent across all agent contexts.
<<<<<<< HEAD
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
=======
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
 *
 * Used by the gateway `agent` and `chat.send` handlers to give TUI, web,
 * spawned subagents, `sessions_send`, and heartbeat wake events date/time
 * awareness — without modifying the system prompt (which is cached).
 *
 * Channel messages (Discord, Telegram, etc.) already have timestamps via
 * envelope formatting and take a separate code path — they never reach
<<<<<<< HEAD
 * the agent handler, so there's no double-stamping risk.
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
 * these handlers, so there is no double-stamping risk. The detection
 * pattern is a safety net for edge cases.
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
 *
 * @see https://github.com/moltbot/moltbot/issues/3658
 */
export function injectTimestamp(message: string, opts?: TimestampInjectionOptions): string {
  if (!message.trim()) return message;

<<<<<<< HEAD
<<<<<<< HEAD
  // Already has an envelope or injected timestamp
  if (TIMESTAMP_ENVELOPE_PATTERN.test(message)) return message;
=======
  // Already has a channel envelope timestamp
  if (ENVELOPE_PATTERN.test(message)) return message;
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
  // Already has an envelope or injected timestamp
  if (TIMESTAMP_ENVELOPE_PATTERN.test(message)) return message;
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)

  // Already has a cron-injected timestamp
  if (CRON_TIME_PATTERN.test(message)) return message;

  const now = opts?.now ?? new Date();
  const timezone = opts?.timezone ?? "UTC";
<<<<<<< HEAD
<<<<<<< HEAD

  const formatted = formatZonedTimestamp(now, timezone);
  if (!formatted) return message;

<<<<<<< HEAD
  // 3-letter DOW: small models (8B) can't reliably derive day-of-week from
  // a date, and may treat a bare "Wed" as a typo. Costs ~1 token.
  const dow = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
    now,
  );

  return `[${dow} ${formatted}] ${message}`;
=======
  const timeFormat = opts?.timeFormat ?? "12";
=======
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)

  const formatted = formatZonedTimestamp(now, timezone);
  if (!formatted) return message;

<<<<<<< HEAD
  return `[${formatted}] ${message}`;
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
  // Add 3-letter day-of-week for smaller models that can't derive DOW
  // from a date. Costs ~1 token, cheap insurance.
=======
  // "Current Date:" label is unambiguous even for tiny models (1.7B+).
  // 3-letter DOW included because small models can't derive it from a date.
  // Total cost: ~18 tokens — saves thousands when it prevents hallucination.
>>>>>>> b6c8c1e89 (feat: add "Current Date:" label to timestamp prefix)
  const dow = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
    now,
  );

<<<<<<< HEAD
  return `[${dow} ${formatted}] ${message}`;
>>>>>>> a6c68e869 (feat: add 3-letter DOW prefix to injected timestamps)
=======
  return `[Current Date: ${dow} ${formatted}] ${message}`;
>>>>>>> b6c8c1e89 (feat: add "Current Date:" label to timestamp prefix)
}

/**
 * Build TimestampInjectionOptions from a MoltbotConfig.
 */
export function timestampOptsFromConfig(cfg: MoltbotConfig): TimestampInjectionOptions {
  return {
    timezone: resolveUserTimezone(cfg.agents?.defaults?.userTimezone),
<<<<<<< HEAD
<<<<<<< HEAD
=======
    timeFormat: cfg.agents?.defaults?.timeFormat as "12" | "24" | undefined,
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
  };
}
