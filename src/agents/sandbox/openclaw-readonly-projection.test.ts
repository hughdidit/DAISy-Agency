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

  it("projects discovered plugin roots and declared skill trees for readonly validation", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-readonly-plugins-"));
    cleanupDirs.add(tempRoot);

    const hostStateDir = path.join(tempRoot, "host-state");
    const hostExtensionsDir = path.join(hostStateDir, "extensions", "demo-plugin");
    const outsideSkillsDir = path.join(path.dirname(hostExtensionsDir), "outside-skills");
    await fs.mkdir(hostExtensionsDir, { recursive: true });
    await fs.writeFile(
      path.join(hostExtensionsDir, "index.js"),
      'module.exports = { id: "demo-plugin", register() {} };\n',
      "utf8",
    );
    await writeSkillFile({
      dir: path.join(hostExtensionsDir, "skills", "projected-demo-skill"),
      name: "projected-demo-skill",
      description: "Projected plugin skill",
    });
    await writeSkillFile({
      dir: outsideSkillsDir,
      name: "escaped-demo-skill",
      description: "Should never be projected",
    });
    await fs.writeFile(
      path.join(hostExtensionsDir, "openclaw.plugin.json"),
      JSON.stringify(
        {
          id: "demo-plugin",
          skills: ["./skills", "../outside-skills"],
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
          allow: ["demo-plugin"],
          slots: {
            memory: "none",
          },
        },
      };
      const workspaceDir = path.join(tempRoot, "workspace");

      const projection = resolveOpenClawReadonlyProjection({
        config,
        agentId: "main",
        workspaceDir,
        sandboxWorkspaceDir: path.join(tempRoot, "sandbox"),
        containerWorkdir: "/workspace",
      });

      await syncOpenClawReadonlyProjection({
        config,
        agentId: "main",
        projection,
        workspaceDir,
      });

      await expect(
        fs.access(
          path.join(projection.hostStateDir, "extensions", "demo-plugin", "openclaw.plugin.json"),
        ),
      ).resolves.toBeUndefined();
      await expect(
        fs.access(path.join(projection.hostStateDir, "extensions", "demo-plugin", "index.js")),
      ).resolves.toBeUndefined();
      await expect(
        fs.access(
          path.join(
            projection.hostStateDir,
            "extensions",
            "demo-plugin",
            "skills",
            "projected-demo-skill",
            "SKILL.md",
          ),
        ),
      ).resolves.toBeUndefined();
      await expect(
        fs.access(
          path.join(
            projection.hostStateDir,
            "extensions",
            "demo-plugin",
            "..",
            "outside-skills",
            "SKILL.md",
          ),
        ),
      ).rejects.toThrow();
      await expect(
        fs.access(
          path.join(projection.hostStateDir, "extensions", "demo-plugin", "outside-skills"),
        ),
      ).rejects.toThrow();

      const projectedConfig = JSON.parse(
        await fs.readFile(projection.hostConfigPath, "utf8"),
      ) as OpenClawConfig;
      process.env.OPENCLAW_STATE_DIR = projection.hostStateDir;
      clearPluginManifestRegistryCache();

      const validated = validateConfigObjectWithPlugins(projectedConfig);
      expect(validated.ok).toBe(true);
      if (validated.ok) {
        expect(validated.warnings).toEqual([]);
        const report = buildWorkspaceSkillStatus(workspaceDir, {
          config: projectedConfig,
        });
        const projectedSkill = report.skills.find((entry) => entry.name === "projected-demo-skill");
        expect(projectedSkill?.filePath).toContain(
          path.join(
            projection.hostStateDir,
            "extensions",
            "demo-plugin",
            "skills",
            "projected-demo-skill",
            "SKILL.md",
          ),
        );
      }
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
  });
});
