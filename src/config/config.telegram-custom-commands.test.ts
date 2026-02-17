import { describe, expect, it } from "vitest";

import { MoltbotSchema } from "./zod-schema.js";

describe("telegram custom commands schema", () => {
  it("normalizes custom commands", () => {
    const res = MoltbotSchema.safeParse({
      channels: {
        telegram: {
          customCommands: [{ command: "/Backup", description: "  Git backup  " }],
        },
      },
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.channels?.telegram?.customCommands).toEqual([
      { command: "backup", description: "Git backup" },
    ]);
  });

<<<<<<< HEAD
  it("rejects custom commands with invalid names", () => {
    const res = MoltbotSchema.safeParse({
=======
  it("normalizes hyphens in custom command names", () => {
    const res = OpenClawSchema.safeParse({
>>>>>>> c4e9bb3b9 (fix: sanitize native command names for Telegram API (#19257))
      channels: {
        telegram: {
          customCommands: [{ command: "Bad-Name", description: "Override status" }],
        },
      },
    });

<<<<<<< HEAD
    expect(res.success).toBe(false);
    if (res.success) return;
=======
    expect(res.success).toBe(true);
    if (!res.success) {
      return;
    }
>>>>>>> c4e9bb3b9 (fix: sanitize native command names for Telegram API (#19257))

    expect(res.data.channels?.telegram?.customCommands).toEqual([
      { command: "bad_name", description: "Override status" },
    ]);
  });
});
