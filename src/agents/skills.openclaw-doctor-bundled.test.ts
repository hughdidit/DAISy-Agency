import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadWorkspaceSkillEntries } from "./skills.js";

const tempDirs: string[] = [];

async function createTempWorkspaceDir() {
  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-doctor-skill-"));
  tempDirs.push(workspaceDir);
  return workspaceDir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("bundled openclaw-doctor skill", () => {
  it("loads with valid frontmatter from the bundled skills directory", async () => {
    const workspaceDir = await createTempWorkspaceDir();
    const bundledSkillsDir = path.resolve(process.cwd(), "skills");

    const entries = loadWorkspaceSkillEntries(workspaceDir, {
      bundledSkillsDir,
      managedSkillsDir: path.join(workspaceDir, ".managed"),
    });

    const doctorEntry = entries.find((entry) => entry.skill.name === "openclaw-doctor");
    expect(doctorEntry?.skill.description).toContain("doctor triage");
  });
});
