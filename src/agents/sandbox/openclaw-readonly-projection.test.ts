import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import {
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
    expect(projection.containerProjectionRoot).toBe("/workspace/.openclaw-readonly/agents/main");
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
});
