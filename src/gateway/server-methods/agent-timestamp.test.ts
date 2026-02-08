import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
=======
import { formatZonedTimestamp } from "../../infra/format-time/format-datetime.js";
>>>>>>> a1123dd9b (Centralize date/time formatting utilities (#11831))
import { injectTimestamp, timestampOptsFromConfig } from "./agent-timestamp.js";
<<<<<<< HEAD
<<<<<<< HEAD
import { formatZonedTimestamp } from "../../auto-reply/envelope.js";
=======
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
import { formatZonedTimestamp } from "../../auto-reply/envelope.js";
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)

describe("injectTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
<<<<<<< HEAD
<<<<<<< HEAD
    // Wednesday, January 28, 2026 at 8:30 PM EST (01:30 UTC Jan 29)
=======
    // Wednesday, January 28, 2026 at 8:30 PM EST
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
    // Wednesday, January 28, 2026 at 8:30 PM EST (01:30 UTC Jan 29)
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
    vi.setSystemTime(new Date("2026-01-29T01:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

<<<<<<< HEAD
<<<<<<< HEAD
  it("prepends a compact timestamp matching formatZonedTimestamp", () => {
    const result = injectTimestamp("Is it the weekend?", {
      timezone: "America/New_York",
    });

<<<<<<< HEAD
<<<<<<< HEAD
    expect(result).toMatch(/^\[Wed 2026-01-28 20:30 EST\] Is it the weekend\?$/);
<<<<<<< HEAD
=======
    expect(result).toMatch(/^\[Current Date: Wed 2026-01-28 20:30 EST\] Is it the weekend\?$/);
>>>>>>> b6c8c1e89 (feat: add "Current Date:" label to timestamp prefix)
=======
    expect(result).toMatch(/^\[Wed 2026-01-28 20:30 EST\] Is it the weekend\?$/);
>>>>>>> 8a5b139a9 (revert: drop "Current Date:" label, keep [Wed YYYY-MM-DD HH:MM TZ])
  });

  it("uses channel envelope format with DOW prefix", () => {
    const now = new Date();
    const expected = formatZonedTimestamp(now, { timeZone: "America/New_York" });

    const result = injectTimestamp("hello", { timezone: "America/New_York" });

    // DOW prefix + formatZonedTimestamp format
    expect(result).toBe(`[Wed ${expected}] hello`);
  });

  it("always uses 24-hour format", () => {
    const result = injectTimestamp("hello", { timezone: "America/New_York" });

    expect(result).toContain("20:30");
    expect(result).not.toContain("PM");
    expect(result).not.toContain("AM");
  });

  it("uses the configured timezone", () => {
    const result = injectTimestamp("hello", { timezone: "America/Chicago" });

    // 8:30 PM EST = 7:30 PM CST = 19:30
<<<<<<< HEAD
<<<<<<< HEAD
    expect(result).toMatch(/^\[Wed 2026-01-28 19:30 CST\]/);
=======
  it("prepends a formatted timestamp to a plain message", () => {
=======
  it("prepends a compact timestamp matching formatZonedTimestamp", () => {
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
    const result = injectTimestamp("Is it the weekend?", {
      timezone: "America/New_York",
    });

    expect(result).toMatch(/^\[2026-01-28 20:30 EST\] Is it the weekend\?$/);
=======
>>>>>>> a6c68e869 (feat: add 3-letter DOW prefix to injected timestamps)
  });

  it("uses channel envelope format with DOW prefix", () => {
    const now = new Date();
    const expected = formatZonedTimestamp(now, "America/New_York");

    const result = injectTimestamp("hello", { timezone: "America/New_York" });

    // DOW prefix + formatZonedTimestamp format
    expect(result).toBe(`[Wed ${expected}] hello`);
  });

  it("always uses 24-hour format", () => {
    const result = injectTimestamp("hello", { timezone: "America/New_York" });

    expect(result).toContain("20:30");
    expect(result).not.toContain("PM");
    expect(result).not.toContain("AM");
  });

  it("uses the configured timezone", () => {
    const result = injectTimestamp("hello", { timezone: "America/Chicago" });

<<<<<<< HEAD
    // 8:30 PM EST = 7:30 PM CST
    expect(result).toContain("7:30 PM");
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
    // 8:30 PM EST = 7:30 PM CST = 19:30
<<<<<<< HEAD
    expect(result).toMatch(/^\[2026-01-28 19:30 CST\]/);
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
=======
    expect(result).toMatch(/^\[Wed 2026-01-28 19:30 CST\]/);
>>>>>>> a6c68e869 (feat: add 3-letter DOW prefix to injected timestamps)
=======
    expect(result).toMatch(/^\[Current Date: Wed 2026-01-28 19:30 CST\]/);
>>>>>>> b6c8c1e89 (feat: add "Current Date:" label to timestamp prefix)
=======
    expect(result).toMatch(/^\[Wed 2026-01-28 19:30 CST\]/);
>>>>>>> 8a5b139a9 (revert: drop "Current Date:" label, keep [Wed YYYY-MM-DD HH:MM TZ])
  });

  it("defaults to UTC when no timezone specified", () => {
    const result = injectTimestamp("hello", {});

    // 2026-01-29T01:30:00Z
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    expect(result).toMatch(/^\[Thu 2026-01-29 01:30/);
=======
    expect(result).toContain("January 29"); // UTC date, not EST
    expect(result).toContain("1:30 AM");
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
    expect(result).toMatch(/^\[2026-01-29 01:30/);
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
=======
    expect(result).toMatch(/^\[Thu 2026-01-29 01:30/);
>>>>>>> a6c68e869 (feat: add 3-letter DOW prefix to injected timestamps)
=======
    expect(result).toMatch(/^\[Current Date: Thu 2026-01-29 01:30/);
>>>>>>> b6c8c1e89 (feat: add "Current Date:" label to timestamp prefix)
=======
    expect(result).toMatch(/^\[Thu 2026-01-29 01:30/);
>>>>>>> 8a5b139a9 (revert: drop "Current Date:" label, keep [Wed YYYY-MM-DD HH:MM TZ])
  });

  it("returns empty/whitespace messages unchanged", () => {
    expect(injectTimestamp("", { timezone: "UTC" })).toBe("");
    expect(injectTimestamp("   ", { timezone: "UTC" })).toBe("   ");
  });

  it("does NOT double-stamp messages with channel envelope timestamps", () => {
    const enveloped = "[Discord user1 2026-01-28 20:30 EST] hello there";
    const result = injectTimestamp(enveloped, { timezone: "America/New_York" });

    expect(result).toBe(enveloped);
  });

<<<<<<< HEAD
<<<<<<< HEAD
  it("does NOT double-stamp messages already injected by us", () => {
<<<<<<< HEAD
<<<<<<< HEAD
    const alreadyStamped = "[Wed 2026-01-28 20:30 EST] hello there";
=======
  it("does NOT double-stamp messages already injected by us", () => {
<<<<<<< HEAD
    const alreadyStamped = "[2026-01-28 20:30 EST] hello there";
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
=======
    const alreadyStamped = "[Wed 2026-01-28 20:30 EST] hello there";
>>>>>>> a6c68e869 (feat: add 3-letter DOW prefix to injected timestamps)
=======
    const alreadyStamped = "[Current Date: Wed 2026-01-28 20:30 EST] hello there";
>>>>>>> b6c8c1e89 (feat: add "Current Date:" label to timestamp prefix)
=======
    const alreadyStamped = "[Wed 2026-01-28 20:30 EST] hello there";
>>>>>>> 8a5b139a9 (revert: drop "Current Date:" label, keep [Wed YYYY-MM-DD HH:MM TZ])
    const result = injectTimestamp(alreadyStamped, { timezone: "America/New_York" });

    expect(result).toBe(alreadyStamped);
  });

<<<<<<< HEAD
=======
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
  it("does NOT double-stamp messages with cron-injected timestamps", () => {
    const cronMessage =
      "[cron:abc123 my-job] do the thing\nCurrent time: Wednesday, January 28th, 2026 — 8:30 PM (America/New_York)";
    const result = injectTimestamp(cronMessage, { timezone: "America/New_York" });

    expect(result).toBe(cronMessage);
  });

  it("handles midnight correctly", () => {
    vi.setSystemTime(new Date("2026-02-01T05:00:00.000Z")); // midnight EST

<<<<<<< HEAD
<<<<<<< HEAD
    const result = injectTimestamp("hello", { timezone: "America/New_York" });

<<<<<<< HEAD
<<<<<<< HEAD
    expect(result).toMatch(/^\[Sun 2026-02-01 00:00 EST\]/);
<<<<<<< HEAD
=======
    expect(result).toMatch(/^\[Current Date: Sun 2026-02-01 00:00 EST\]/);
>>>>>>> b6c8c1e89 (feat: add "Current Date:" label to timestamp prefix)
=======
    expect(result).toMatch(/^\[Sun 2026-02-01 00:00 EST\]/);
>>>>>>> 8a5b139a9 (revert: drop "Current Date:" label, keep [Wed YYYY-MM-DD HH:MM TZ])
  });

  it("handles date boundaries (just before midnight)", () => {
    vi.setSystemTime(new Date("2026-02-01T04:59:00.000Z")); // 23:59 Jan 31 EST

    const result = injectTimestamp("hello", { timezone: "America/New_York" });

    expect(result).toMatch(/^\[Sat 2026-01-31 23:59 EST\]/);
  });

  it("handles DST correctly (same UTC hour, different local time)", () => {
    // EST (winter): UTC-5 → 2026-01-15T05:00Z = midnight Jan 15
    vi.setSystemTime(new Date("2026-01-15T05:00:00.000Z"));
    const winter = injectTimestamp("winter", { timezone: "America/New_York" });
    expect(winter).toMatch(/^\[Thu 2026-01-15 00:00 EST\]/);

    // EDT (summer): UTC-4 → 2026-07-15T04:00Z = midnight Jul 15
    vi.setSystemTime(new Date("2026-07-15T04:00:00.000Z"));
    const summer = injectTimestamp("summer", { timezone: "America/New_York" });
    expect(summer).toMatch(/^\[Wed 2026-07-15 00:00 EDT\]/);
  });

  it("accepts a custom now date", () => {
    const customDate = new Date("2025-07-04T16:00:00.000Z"); // July 4, noon ET

    const result = injectTimestamp("fireworks?", {
      timezone: "America/New_York",
      now: customDate,
    });

<<<<<<< HEAD
<<<<<<< HEAD
    expect(result).toMatch(/^\[Fri 2025-07-04 12:00 EDT\]/);
=======
    const result = injectTimestamp("hello", {
      timezone: "America/New_York",
      timeFormat: "12",
    });
=======
    const result = injectTimestamp("hello", { timezone: "America/New_York" });
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)

    expect(result).toMatch(/^\[2026-02-01 00:00 EST\]/);
=======
>>>>>>> a6c68e869 (feat: add 3-letter DOW prefix to injected timestamps)
  });

  it("handles date boundaries (just before midnight)", () => {
    vi.setSystemTime(new Date("2026-02-01T04:59:00.000Z")); // 23:59 Jan 31 EST

    const result = injectTimestamp("hello", { timezone: "America/New_York" });

    expect(result).toMatch(/^\[Sat 2026-01-31 23:59 EST\]/);
  });

  it("handles DST correctly (same UTC hour, different local time)", () => {
    // EST (winter): UTC-5 → 2026-01-15T05:00Z = midnight Jan 15
    vi.setSystemTime(new Date("2026-01-15T05:00:00.000Z"));
    const winter = injectTimestamp("winter", { timezone: "America/New_York" });
    expect(winter).toMatch(/^\[Thu 2026-01-15 00:00 EST\]/);

    // EDT (summer): UTC-4 → 2026-07-15T04:00Z = midnight Jul 15
    vi.setSystemTime(new Date("2026-07-15T04:00:00.000Z"));
    const summer = injectTimestamp("summer", { timezone: "America/New_York" });
    expect(summer).toMatch(/^\[Wed 2026-07-15 00:00 EDT\]/);
  });

  it("accepts a custom now date", () => {
    const customDate = new Date("2025-07-04T16:00:00.000Z"); // July 4, noon ET

    const result = injectTimestamp("fireworks?", {
      timezone: "America/New_York",
      now: customDate,
    });

<<<<<<< HEAD
<<<<<<< HEAD
    expect(result).toContain("July 4");
    expect(result).toContain("2025");
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
    expect(result).toMatch(/^\[2025-07-04 12:00 EDT\]/);
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
=======
    expect(result).toMatch(/^\[Fri 2025-07-04 12:00 EDT\]/);
>>>>>>> a6c68e869 (feat: add 3-letter DOW prefix to injected timestamps)
=======
    expect(result).toMatch(/^\[Current Date: Fri 2025-07-04 12:00 EDT\]/);
>>>>>>> b6c8c1e89 (feat: add "Current Date:" label to timestamp prefix)
=======
    expect(result).toMatch(/^\[Fri 2025-07-04 12:00 EDT\]/);
>>>>>>> 8a5b139a9 (revert: drop "Current Date:" label, keep [Wed YYYY-MM-DD HH:MM TZ])
  });
});

describe("timestampOptsFromConfig", () => {
<<<<<<< HEAD
<<<<<<< HEAD
  it("extracts timezone from config", () => {
=======
  it("extracts timezone and timeFormat from config", () => {
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
  it("extracts timezone from config", () => {
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
    const opts = timestampOptsFromConfig({
      agents: {
        defaults: {
          userTimezone: "America/Chicago",
<<<<<<< HEAD
<<<<<<< HEAD
=======
          timeFormat: "24",
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
        },
      },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any);

    expect(opts.timezone).toBe("America/Chicago");
<<<<<<< HEAD
<<<<<<< HEAD
=======
    expect(opts.timeFormat).toBe("24");
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
  });

  it("falls back gracefully with empty config", () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const opts = timestampOptsFromConfig({} as any);

    expect(opts.timezone).toBeDefined(); // resolveUserTimezone provides a default
<<<<<<< HEAD
<<<<<<< HEAD
=======
    expect(opts.timeFormat).toBeUndefined();
>>>>>>> 582a4e261 (feat(gateway): inject timestamps into agent handler messages)
=======
>>>>>>> 76391bba3 (refactor: use compact formatZonedTimestamp for injection)
  });
});
