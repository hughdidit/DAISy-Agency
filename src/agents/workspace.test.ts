<<<<<<< HEAD:src/agents/workspace.test.ts
=======
import fs from "node:fs/promises";
import path from "node:path";
>>>>>>> 386bb0c61 (fix: don't auto-create HEARTBEAT.md on workspace init (openclaw#12027) thanks @shadril238):src/agents/workspace.e2e.test.ts
import { describe, expect, it } from "vitest";

import {
  DEFAULT_AGENTS_FILENAME,
  DEFAULT_BOOTSTRAP_FILENAME,
  DEFAULT_HEARTBEAT_FILENAME,
  DEFAULT_MEMORY_ALT_FILENAME,
  DEFAULT_MEMORY_FILENAME,
  ensureAgentWorkspace,
  loadWorkspaceBootstrapFiles,
} from "./workspace.js";
<<<<<<< HEAD
import { makeTempWorkspace, writeWorkspaceFile } from "../test-helpers/workspace.js";
=======

describe("resolveDefaultAgentWorkspaceDir", () => {
  it("uses OPENCLAW_HOME for default workspace resolution", () => {
    const dir = resolveDefaultAgentWorkspaceDir({
      OPENCLAW_HOME: "/srv/openclaw-home",
      HOME: "/home/other",
    } as NodeJS.ProcessEnv);

    expect(dir).toBe(path.join(path.resolve("/srv/openclaw-home"), ".openclaw", "workspace"));
  });
});
>>>>>>> 456bd5874 (fix(paths): structurally resolve home dir to prevent Windows path bugs (#12125))

describe("ensureAgentWorkspace", () => {
  it("does not create HEARTBEAT.md during bootstrap file initialization", async () => {
    const tempDir = await makeTempWorkspace("openclaw-workspace-init-");

    const result = await ensureAgentWorkspace({ dir: tempDir, ensureBootstrapFiles: true });

    await expect(fs.access(path.join(tempDir, DEFAULT_AGENTS_FILENAME))).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(tempDir, DEFAULT_BOOTSTRAP_FILENAME)),
    ).resolves.toBeUndefined();
    await expect(fs.access(path.join(tempDir, DEFAULT_HEARTBEAT_FILENAME))).rejects.toThrow();
    expect("heartbeatPath" in result).toBe(false);
  });

  it("treats git-backed workspaces as existing even when template files are missing", async () => {
    const tempDir = await makeTempWorkspace("openclaw-workspace-");
    await fs.mkdir(path.join(tempDir, ".git"), { recursive: true });
    await fs.writeFile(path.join(tempDir, ".git", "HEAD"), "ref: refs/heads/main\n");

    await ensureAgentWorkspace({ dir: tempDir, ensureBootstrapFiles: true });

    await expect(fs.access(path.join(tempDir, DEFAULT_IDENTITY_FILENAME))).resolves.toBeUndefined();
    await expect(fs.access(path.join(tempDir, DEFAULT_BOOTSTRAP_FILENAME))).rejects.toMatchObject({
      code: "ENOENT",
    });
    const state = await readOnboardingState(tempDir);
    expect(state.onboardingCompletedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe("loadWorkspaceBootstrapFiles", () => {
  it("includes MEMORY.md when present", async () => {
    const tempDir = await makeTempWorkspace("moltbot-workspace-");
    await writeWorkspaceFile({ dir: tempDir, name: "MEMORY.md", content: "memory" });

    const files = await loadWorkspaceBootstrapFiles(tempDir);
    const memoryEntries = files.filter((file) =>
      [DEFAULT_MEMORY_FILENAME, DEFAULT_MEMORY_ALT_FILENAME].includes(file.name),
    );

    expect(memoryEntries).toHaveLength(1);
    expect(memoryEntries[0]?.missing).toBe(false);
    expect(memoryEntries[0]?.content).toBe("memory");
  });

  it("includes memory.md when MEMORY.md is absent", async () => {
    const tempDir = await makeTempWorkspace("moltbot-workspace-");
    await writeWorkspaceFile({ dir: tempDir, name: "memory.md", content: "alt" });

    const files = await loadWorkspaceBootstrapFiles(tempDir);
    const memoryEntries = files.filter((file) =>
      [DEFAULT_MEMORY_FILENAME, DEFAULT_MEMORY_ALT_FILENAME].includes(file.name),
    );

    expect(memoryEntries).toHaveLength(1);
    expect(memoryEntries[0]?.missing).toBe(false);
    expect(memoryEntries[0]?.content).toBe("alt");
  });

  it("omits memory entries when no memory files exist", async () => {
    const tempDir = await makeTempWorkspace("moltbot-workspace-");

    const files = await loadWorkspaceBootstrapFiles(tempDir);
    const memoryEntries = files.filter((file) =>
      [DEFAULT_MEMORY_FILENAME, DEFAULT_MEMORY_ALT_FILENAME].includes(file.name),
    );

    expect(memoryEntries).toHaveLength(0);
  });
});
