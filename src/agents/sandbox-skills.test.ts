import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { captureFullEnv } from "../test-utils/env.js";
import { resolveSandboxContext } from "./sandbox/context.js";
import { writeSkill } from "./skills.e2e-test-helpers.js";

vi.mock("./sandbox/docker.js", () => ({
  ensureSandboxContainer: vi.fn(async () => "openclaw-sbx-test"),
}));

vi.mock("./sandbox/browser.js", () => ({
  ensureSandboxBrowser: vi.fn(async () => null),
}));

vi.mock("./sandbox/prune.js", () => ({
  maybePruneSandboxes: vi.fn(async () => undefined),
}));

describe("sandbox skill mirroring", () => {
  let envSnapshot: ReturnType<typeof captureFullEnv>;
  const cleanupDirs = new Set<string>();

  beforeEach(() => {
    envSnapshot = captureFullEnv();
  });

  afterEach(async () => {
    envSnapshot.restore();
    await Promise.all(
      Array.from(cleanupDirs, async (dir) => {
        await fs.rm(dir, { recursive: true, force: true });
      }),
    );
    cleanupDirs.clear();
  });

  const runContext = async (
    workspaceAccess: "none" | "ro",
    options: { bundledDir?: string } = {},
  ) => {
    const bundledDir = options.bundledDir;
    const effectiveBundledDir =
      bundledDir ?? (await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-bundled-skills-")));
    if (!bundledDir) {
      cleanupDirs.add(effectiveBundledDir);
    }
    await fs.mkdir(effectiveBundledDir, { recursive: true });

    const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sandbox-root-"));
    cleanupDirs.add(sandboxRoot);
    process.env.OPENCLAW_BUNDLED_SKILLS_DIR = effectiveBundledDir;

    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-workspace-"));
    cleanupDirs.add(workspaceDir);
    await writeSkill({
      dir: path.join(workspaceDir, "skills", "demo-skill"),
      name: "demo-skill",
      description: "Demo skill",
    });

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
            scope: "session",
            workspaceAccess,
            workspaceRoot: sandboxRoot,
          },
        },
      },
    };

    const context = await resolveSandboxContext({
      config: cfg,
      sessionKey: "agent:main:main",
      workspaceDir,
    });

    return { context, workspaceDir };
  };

  it.each(["ro", "none"] as const)(
    "copies skills into the sandbox when workspaceAccess is %s",
    async (workspaceAccess) => {
      const { context } = await runContext(workspaceAccess);

      expect(context?.enabled).toBe(true);
      const skillPath = path.join(context?.workspaceDir ?? "", "skills", "demo-skill", "SKILL.md");
      await expect(fs.readFile(skillPath, "utf-8")).resolves.toContain("demo-skill");
    },
    20_000,
  );

  it("copies the bundled openclaw-readonly launcher into ro sandboxes", async () => {
    const bundledDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "skills",
    );
    process.env.OPENCLAW_BUNDLED_SKILLS_DIR = bundledDir;
    const { context } = await runContext("ro", { bundledDir });

    expect(context?.enabled).toBe(true);
    const launcherPath = path.join(
      context?.workspaceDir ?? "",
      "skills",
      "openclaw-readonly",
      "scripts",
      "openclaw-readonly.mjs",
    );
    await expect(fs.readFile(launcherPath, "utf-8")).resolves.toContain(
      "runOpenClawReadonlyLauncher",
    );
  });

  it("copies the bundled openclaw-doctor launcher into ro sandboxes", async () => {
    const bundledDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "skills",
    );
    process.env.OPENCLAW_BUNDLED_SKILLS_DIR = bundledDir;
    const { context } = await runContext("ro", { bundledDir });

    expect(context?.enabled).toBe(true);
    const launcherPath = path.join(
      context?.workspaceDir ?? "",
      "skills",
      "openclaw-doctor",
      "scripts",
      "openclaw-doctor-readonly.mjs",
    );
    await expect(fs.readFile(launcherPath, "utf-8")).resolves.toContain(
      "runOpenClawDoctorReadonlyLauncher",
    );
  });
});
