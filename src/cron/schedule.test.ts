import { describe, expect, it } from "vitest";

import { computeNextRunAtMs } from "./schedule.js";

describe("cron schedule", () => {
  it("computes next run for cron expression with timezone", () => {
    // Saturday, Dec 13 2025 00:00:00Z
    const nowMs = Date.parse("2025-12-13T00:00:00.000Z");
    const next = computeNextRunAtMs(
      { kind: "cron", expr: "0 9 * * 3", tz: "America/Los_Angeles" },
      nowMs,
    );
    // Next Wednesday at 09:00 PST -> 17:00Z
    expect(next).toBe(Date.parse("2025-12-17T17:00:00.000Z"));
  });

<<<<<<< HEAD
=======
  it("does not roll back year for Asia/Shanghai daily cron schedules (#30351)", () => {
    // 2026-03-01 08:00:00 in Asia/Shanghai
    const nowMs = Date.parse("2026-03-01T00:00:00.000Z");
    const next = computeNextRunAtMs(
      { kind: "cron", expr: "0 8 * * *", tz: "Asia/Shanghai" },
      nowMs,
    );

    // Next 08:00 local should be the following day, not a past year.
    expect(next).toBe(Date.parse("2026-03-02T00:00:00.000Z"));
    expect(next).toBeGreaterThan(nowMs);
    expect(new Date(next ?? 0).getUTCFullYear()).toBe(2026);
  });

  it("throws a clear error when cron expr is missing at runtime", () => {
    const nowMs = Date.parse("2025-12-13T00:00:00.000Z");
    expect(() =>
      computeNextRunAtMs(
        {
          kind: "cron",
        } as unknown as { kind: "cron"; expr: string; tz?: string },
        nowMs,
      ),
    ).toThrow("invalid cron schedule: expr is required");
  });

  it("supports legacy cron field when expr is missing", () => {
    const nowMs = Date.parse("2025-12-13T00:00:00.000Z");
    const next = computeNextRunAtMs(
      {
        kind: "cron",
        cron: "0 9 * * 3",
        tz: "America/Los_Angeles",
      } as unknown as { kind: "cron"; expr: string; tz?: string },
      nowMs,
    );
    expect(next).toBe(Date.parse("2025-12-17T17:00:00.000Z"));
  });

>>>>>>> e076665e5 (test(cron): add Asia/Shanghai year-regression coverage [AI-assisted] (openclaw#30565) thanks @liuxiaopai-ai)
  it("computes next run for every schedule", () => {
    const anchor = Date.parse("2025-12-13T00:00:00.000Z");
    const now = anchor + 10_000;
    const next = computeNextRunAtMs({ kind: "every", everyMs: 30_000, anchorMs: anchor }, now);
    expect(next).toBe(anchor + 30_000);
  });

  it("computes next run for every schedule when anchorMs is not provided", () => {
    const now = Date.parse("2025-12-13T00:00:00.000Z");
    const next = computeNextRunAtMs({ kind: "every", everyMs: 30_000 }, now);

    // Should return nowMs + everyMs, not nowMs (which would cause infinite loop)
    expect(next).toBe(now + 30_000);
  });

  it("advances when now matches anchor for every schedule", () => {
    const anchor = Date.parse("2025-12-13T00:00:00.000Z");
    const next = computeNextRunAtMs({ kind: "every", everyMs: 30_000, anchorMs: anchor }, anchor);
    expect(next).toBe(anchor + 30_000);
  });
});
