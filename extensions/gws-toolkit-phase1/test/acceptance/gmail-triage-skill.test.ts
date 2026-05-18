import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const skillPath = path.resolve("extensions/gws-toolkit-phase1/skills/gmail-triage/SKILL.md");

describe("gmail-triage skill", () => {
  it("ships required frontmatter and policy guidance", async () => {
    const skill = await fs.readFile(skillPath, "utf8");

    expect(skill).toContain("name: gmail-triage");
    expect(skill).toContain("Run `gws_status` first");
    expect(skill).toContain("Ignore messages in spam");
    expect(skill).toContain("Use `gws_gmail_write` with `draft_message`");
    expect(skill).toContain("Use `gws_gmail_write` with `send_message` only for whitelisted");
    expect(skill).toContain("above 75%");
    expect(skill).toContain("Do not store raw email bodies");
  });
});
