import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFrontmatter, resolveOpenClawMetadata } from "../../../src/agents/skills/frontmatter.js";

describe("trello skill metadata", () => {
  it("is gated on the brokered plugin instead of sandbox env or jq", () => {
    const skillPath = path.join(process.cwd(), "skills", "trello", "SKILL.md");
    const content = fs.readFileSync(skillPath, "utf8");
    const metadata = resolveOpenClawMetadata(parseFrontmatter(content));

    expect(metadata?.requires?.config).toEqual(["plugins.entries.trello-toolkit.enabled"]);
    expect(metadata?.requires?.env).toEqual([]);
    expect(metadata?.requires?.bins).toEqual([]);
    expect(content).toContain("trello_status");
    expect(content).not.toContain("TRELLO_API_KEY&token=$TRELLO_TOKEN");
  });
});
