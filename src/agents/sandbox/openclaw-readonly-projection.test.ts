import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateConfigObjectWithPlugins, type OpenClawConfig } from "../../config/config.js";
import { clearPluginManifestRegistryCache } from "../../plugins/manifest-registry.js";
import { buildWorkspaceSkillStatus } from "../skills-status.js";
import {
  OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT,
  resolveOpenClawReadonlyProjection,
  syncOpenClawReadonlyProjection,
} from "./openclaw-readonly-projection.js";

function createConfig(skills?: string[]): OpenClawConfig {
  return {
    session: {
      store: "",
    },
    agents: {
      list: [{ id: "main", skills }],
    },
  };
}

async function writeSkillFile(params: {
  dir: string;
  name: string;
  description: string;
  body?: string;
}): Promise<void> {
  await fs.mkdir(params.dir, { recursive: true });
  await fs.writeFile(
    path.join(params.dir, "SKILL.md"),
    `---
name: ${params.name}
description: ${params.description}
---

${params.body ?? `# ${params.name}\n`}
`,
    "utf8",
  );
}

type ReadonlyPluginProjectionFixture = {
  config: OpenClawConfig;
  workspaceDir: string;
  projection: ReturnType<typeof resolveOpenClawReadonlyProjection>;
  hostExtensionsDir: string;
  projectedManifestPath: string;
  projectedSourcePath: string;
  projectedEscapedSkillDirPath: string;
  projectedSkillFilePath: string;
  projectedOutsideSkillFilePath: string;
  projectedSymlinkSkillDir: string;
};

async function withReadonlyPluginProjectionFixture(
  cleanupDirs: Set<string>,
  params: {
    manifestSkills?: string[];
    createOutsideSkill?: boolean;
    createSymlinkSkill?: boolean;
  },
  run: (fixture: ReadonlyPluginProjectionFixture) => Promise<void>,
): Promise<void> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-readonly-plugins-"));
  cleanupDirs.add(tempRoot);

  const pluginId = "demo-plugin";
  const skillName = "projected-demo-skill";
  const hostStateDir = path.join(tempRoot, "host-state");
  const hostExtensionsDir = path.join(hostStateDir, "extensions", pluginId);
  const workspaceDir = path.join(tempRoot, "workspace");
  const outsideSkillsDir = path.join(tempRoot, "outside-skills");

  await fs.mkdir(hostExtensionsDir, { recursive: true });
  await fs.mkdir(workspaceDir, { recursive: true });
  await fs.writeFile(
    path.join(hostExtensionsDir, "index.js"),
    'module.exports = { id: "demo-plugin", register() {} };\n',
    "utf8",
  );
  await writeSkillFile({
    dir: path.join(hostExtensionsDir, "skills", skillName),
    name: skillName,
    description: "Projected plugin skill",
  });

  if (params.createOutsideSkill || params.createSymlinkSkill) {
    await writeSkillFile({
      dir: outsideSkillsDir,
      name: "escaped-demo-skill",
      description: "Should never be projected",
    });
  }

  if (params.createSymlinkSkill) {
    await fs.symlink(
      outsideSkillsDir,
      path.join(hostExtensionsDir, "skills-link"),
      process.platform === "win32" ? ("junction" as const) : ("dir" as const),
    );
  }

  await fs.writeFile(
    path.join(hostExtensionsDir, "openclaw.plugin.json"),
    JSON.stringify(
      {
        id: pluginId,
        skills: params.manifestSkills ?? ["./skills"],
        configSchema: { type: "object", additionalProperties: false },
      },
      null,
      2,
    ),
    "utf8",
  );

  const envSnapshot = process.env.OPENCLAW_STATE_DIR;
  const bundledDirSnapshot = process.env.OPENCLAW_BUNDLED_PLUGINS_DIR;
  process.env.OPENCLAW_STATE_DIR = hostStateDir;
  process.env.OPENCLAW_BUNDLED_PLUGINS_DIR = path.join(tempRoot, "missing-bundled-plugins");
  clearPluginManifestRegistryCache();

  try {
    const config: OpenClawConfig = {
      session: { store: "" },
      agents: { list: [{ id: "main", skills: ["openclaw-readonly"] }] },
      plugins: {
        allow: [pluginId],
        slots: {
          memory: "none",
        },
      },
    };

    const projection = resolveOpenClawReadonlyProjection({
      config,
      agentId: "main",
      workspaceDir,
      sandboxWorkspaceDir: path.join(tempRoot, "sandbox"),
      containerWorkdir: "/workspace",
    });

    await run({
      config,
      workspaceDir,
      projection,
      hostExtensionsDir,
      projectedManifestPath: path.join(
        projection.hostStateDir,
        "extensions",
        pluginId,
        "openclaw.plugin.json",
      ),
      projectedSourcePath: path.join(projection.hostStateDir, "extensions", pluginId, "index.js"),
      projectedEscapedSkillDirPath: path.join(
        projection.hostStateDir,
        "extensions",
        "outside-skills",
      ),
      projectedSkillFilePath: path.join(
        projection.hostStateDir,
        "extensions",
        pluginId,
        "skills",
        skillName,
        "SKILL.md",
      ),
      projectedOutsideSkillFilePath: path.join(
        projection.hostStateDir,
        "extensions",
        "outside-skills",
        "SKILL.md",
      ),
      projectedSymlinkSkillDir: path.join(
        projection.hostStateDir,
        "extensions",
        pluginId,
        "skills-link",
      ),
    });
  } finally {
    clearPluginManifestRegistryCache();
    if (envSnapshot === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = envSnapshot;
    }
    if (bundledDirSnapshot === undefined) {
      delete process.env.OPENCLAW_BUNDLED_PLUGINS_DIR;
    } else {
      process.env.OPENCLAW_BUNDLED_PLUGINS_DIR = bundledDirSnapshot;
    }
  }
}

describe("openclaw-readonly projection", () => {
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(
      Array.from(cleanupDirs, async (dir) => {
        await fs.rm(dir, { recursive: true, force: true });
      }),
    );
    cleanupDirs.clear();
  });

  it("resolves direct projection paths for snapshot-backed sandboxes", () => {
    const projection = resolveOpenClawReadonlyProjection({
      config: createConfig(["openclaw-readonly"]),
      agentId: "main",
      workspaceDir: "/tmp/sandbox-workspace",
      sandboxWorkspaceDir: "/tmp/sandbox-workspace",
      containerWorkdir: "/workspace",
    });

    expect(projection.enabled).toBe(true);
    expect(projection.needsSyntheticBind).toBe(false);
    expect(projection.hostProjectionRoot).toBe(
      path.join("/tmp/sandbox-workspace", ".openclaw-readonly", "agents", "main"),
    );
    expect(projection.containerProjectionRoot).toBe("/workspace/.openclaw-readonly/agents/main");
  });

  it("marks rw sandboxes for a synthetic readonly bind", () => {
    const projection = resolveOpenClawReadonlyProjection({
      config: createConfig(["openclaw-readonly"]),
      agentId: "main",
      workspaceDir: "/tmp/agent-workspace",
      sandboxWorkspaceDir: "/tmp/sandbox-workspace",
      containerWorkdir: "/workspace",
    });

    expect(projection.enabled).toBe(true);
    expect(projection.needsSyntheticBind).toBe(true);
    expect(projection.hostProjectionRoot).toBe(
      path.join("/tmp/sandbox-workspace", ".openclaw-readonly", "agents", "main"),
    );
    expect(projection.containerProjectionRoot).toBe(
      `${OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT}/agents/main`,
    );
  });

  it("normalizes agent ids before building projection paths", () => {
    const projection = resolveOpenClawReadonlyProjection({
      config: createConfig(["openclaw-readonly"]),
      agentId: "../../../etc/passwd",
      workspaceDir: "/tmp/agent-workspace",
      sandboxWorkspaceDir: "/tmp/sandbox-workspace",
      containerWorkdir: "/workspace",
    });

    expect(projection.hostProjectionRoot).toBe(
      path.join("/tmp/sandbox-workspace", ".openclaw-readonly", "agents", "etc-passwd"),
    );
    expect(projection.containerProjectionRoot).toBe(
      `${OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT}/agents/etc-passwd`,
    );
  });

  it("disables projection when the agent does not expose the readonly skill", () => {
    const projection = resolveOpenClawReadonlyProjection({
      config: createConfig(["demo-skill"]),
      agentId: "main",
      workspaceDir: "/tmp/agent-workspace",
      sandboxWorkspaceDir: "/tmp/sandbox-workspace",
      containerWorkdir: "/workspace",
    });

    expect(projection.enabled).toBe(false);
  });

  it("writes a redacted config and only copies the active agent session store", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-readonly-projection-"));
    cleanupDirs.add(tempRoot);

    const sessionStorePattern = path.join(tempRoot, "stores", "{agentId}", "sessions.json");
    const config = createConfig(["openclaw-readonly"]);
    config.session = { store: sessionStorePattern };

    await fs.mkdir(path.dirname(sessionStorePattern.replace("{agentId}", "main")), {
      recursive: true,
    });
    await fs.mkdir(path.dirname(sessionStorePattern.replace("{agentId}", "other")), {
      recursive: true,
    });
    await fs.writeFile(
      sessionStorePattern.replace("{agentId}", "main"),
      '{"session":"main"}\n',
      "utf8",
    );
    await fs.writeFile(
      sessionStorePattern.replace("{agentId}", "other"),
      '{"session":"other"}\n',
      "utf8",
    );

    const projection = resolveOpenClawReadonlyProjection({
      config,
      agentId: "main",
      workspaceDir: path.join(tempRoot, "workspace"),
      sandboxWorkspaceDir: path.join(tempRoot, "sandbox"),
      containerWorkdir: "/workspace",
    });

    await fs.mkdir(projection.hostProjectionRoot, { recursive: true });
    await fs.writeFile(path.join(projection.hostProjectionRoot, "stale.txt"), "stale\n", "utf8");

    await syncOpenClawReadonlyProjection({
      config,
      agentId: "main",
      projection,
    });

    const projectedConfig = JSON.parse(await fs.readFile(projection.hostConfigPath, "utf8")) as {
      session?: Record<string, unknown>;
    };
    expect(projectedConfig.session ?? {}).not.toHaveProperty("store");
    await expect(
      fs.access(path.join(projection.hostProjectionRoot, "stale.txt")),
    ).rejects.toThrow();
    await expect(
      fs.readFile(
        path.join(projection.hostStateDir, "agents", "main", "sessions", "sessions.json"),
        "utf8",
      ),
    ).resolves.toContain('"session":"main"');
    await expect(
      fs.access(path.join(projection.hostStateDir, "agents", "other", "sessions", "sessions.json")),
    ).rejects.toThrow();
  });

  it("removes stale projection data when projection is disabled", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-readonly-disabled-"));
    cleanupDirs.add(tempRoot);

    const projection = resolveOpenClawReadonlyProjection({
      config: createConfig(["demo-skill"]),
      agentId: "main",
      workspaceDir: path.join(tempRoot, "workspace"),
      sandboxWorkspaceDir: path.join(tempRoot, "sandbox"),
      containerWorkdir: "/workspace",
    });

    await fs.mkdir(projection.hostProjectionRoot, { recursive: true });
    await fs.writeFile(path.join(projection.hostProjectionRoot, "stale.txt"), "stale\n", "utf8");

    await syncOpenClawReadonlyProjection({
      config: createConfig(["demo-skill"]),
      agentId: "main",
      projection,
    });

    await expect(fs.readdir(projection.hostProjectionRoot)).resolves.toEqual([]);
  });

  it("projects plugin skills into readonly state/extensions", async () => {
    await withReadonlyPluginProjectionFixture(cleanupDirs, {}, async (fixture) => {
      await syncOpenClawReadonlyProjection({
        config: fixture.config,
        agentId: "main",
        projection: fixture.projection,
        workspaceDir: fixture.workspaceDir,
      });

      await expect(fs.access(fixture.projectedManifestPath)).resolves.toBeUndefined();
      await expect(fs.access(fixture.projectedSourcePath)).resolves.toBeUndefined();
      await expect(fs.access(fixture.projectedSkillFilePath)).resolves.toBeUndefined();
    });
  });

  it("skips escaping plugin skill paths without projecting them", async () => {
    await withReadonlyPluginProjectionFixture(
      cleanupDirs,
      {
        manifestSkills: ["./skills", "../outside-skills"],
        createOutsideSkill: true,
      },
      async (fixture) => {
        await syncOpenClawReadonlyProjection({
          config: fixture.config,
          agentId: "main",
          projection: fixture.projection,
          workspaceDir: fixture.workspaceDir,
        });

        await expect(fs.access(fixture.projectedManifestPath)).resolves.toBeUndefined();
        await expect(fs.access(fixture.projectedSourcePath)).resolves.toBeUndefined();
        await expect(fs.access(fixture.projectedSkillFilePath)).resolves.toBeUndefined();
        await expect(fs.access(fixture.projectedEscapedSkillDirPath)).rejects.toThrow();
        await expect(fs.access(fixture.projectedOutsideSkillFilePath)).rejects.toThrow();
      },
    );
  });

  it("projected plugin skills are discoverable by readonly diagnostics", async () => {
    await withReadonlyPluginProjectionFixture(cleanupDirs, {}, async (fixture) => {
      await syncOpenClawReadonlyProjection({
        config: fixture.config,
        agentId: "main",
        projection: fixture.projection,
        workspaceDir: fixture.workspaceDir,
      });

      const projectedConfig = JSON.parse(
        await fs.readFile(fixture.projection.hostConfigPath, "utf8"),
      ) as OpenClawConfig;
      process.env.OPENCLAW_STATE_DIR = fixture.projection.hostStateDir;
      clearPluginManifestRegistryCache();

      const validated = validateConfigObjectWithPlugins(projectedConfig);
      expect(validated.ok).toBe(true);
      if (validated.ok) {
        expect(validated.warnings).toEqual([]);
        const report = buildWorkspaceSkillStatus(fixture.workspaceDir, {
          config: projectedConfig,
        });
        const projectedSkill = report.skills.find((entry) => entry.name === "projected-demo-skill");
        expect(projectedSkill).toBeDefined();
        expect(projectedSkill!.filePath).toContain(fixture.projectedSkillFilePath);
        expect(projectedSkill!.filePath).not.toContain(fixture.hostExtensionsDir);
      }
    });
  });

  it("skips symlinked plugin skill paths that resolve outside the plugin root", async () => {
    await withReadonlyPluginProjectionFixture(
      cleanupDirs,
      {
        manifestSkills: ["./skills", "./skills-link"],
        createSymlinkSkill: true,
      },
      async (fixture) => {
        await syncOpenClawReadonlyProjection({
          config: fixture.config,
          agentId: "main",
          projection: fixture.projection,
          workspaceDir: fixture.workspaceDir,
        });

        await expect(fs.access(fixture.projectedManifestPath)).resolves.toBeUndefined();
        await expect(fs.access(fixture.projectedSkillFilePath)).resolves.toBeUndefined();
        await expect(fs.access(fixture.projectedSymlinkSkillDir)).rejects.toThrow();
      },
    );
  });
});
