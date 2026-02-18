import { describe, expect, it } from "vitest";
import type { SkillEntry } from "./skills/types.js";
import { resolveSkillsPromptForRun } from "./skills.js";

describe("resolveSkillsPromptForRun", () => {
  it("prefers snapshot prompt when available", () => {
    const prompt = resolveSkillsPromptForRun({
      skillsSnapshot: { prompt: "SNAPSHOT", skills: [] },
      workspaceDir: "/tmp/clawd",
    });
    expect(prompt).toBe("SNAPSHOT");
  });
  it("builds prompt from entries when snapshot is missing", () => {
    const entry: SkillEntry = {
      skill: {
        name: "demo-skill",
        description: "Demo",
        filePath: "/app/skills/demo-skill/SKILL.md",
        baseDir: "/app/skills/demo-skill",
<<<<<<< HEAD
        source: "moltbot-bundled",
=======
        source: "openclaw-bundled",
        disableModelInvocation: false,
>>>>>>> 52ad28e09 (chore: Fix types in tests 44/N.)
      },
      frontmatter: {},
    };
    const prompt = resolveSkillsPromptForRun({
      entries: [entry],
      workspaceDir: "/tmp/clawd",
    });
    expect(prompt).toContain("<available_skills>");
    expect(prompt).toContain("/app/skills/demo-skill/SKILL.md");
  });
});
