import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { captureFullEnv } from "../test-utils/env.js";
import { resolveSandboxWorkspaceDir } from "./sandbox/shared.js";

const dockerMocks = vi.hoisted(() => ({
  ensureSandboxContainer: vi.fn(async () => "openclaw-sbx-test"),
  resolveDockerHostPathInfo: vi.fn(async () => ({
    path: "/host/openclaw-readonly-projection",
    remapSucceeded: true,
  })),
}));

vi.mock("./sandbox/docker.js", () => ({
  ensureSandboxContainer: dockerMocks.ensureSandboxContainer,
  resolveDockerHostPathInfo: dockerMocks.resolveDockerHostPathInfo,
}));

vi.mock("./sandbox/browser.js", () => ({
  ensureSandboxBrowser: vi.fn(async () => null),
}));

vi.mock("./sandbox/prune.js", () => ({
  maybePruneSandboxes: vi.fn(async () => undefined),
}));

vi.mock("./sandbox/capability-mounts.js", () => ({
  resolveSandboxCapabilityMounts: vi.fn(() => []),
}));

import { resolveSandboxContext } from "./sandbox/context.js";

function createConfig(sandboxRoot: string, workspaceAccess: "rw" | "ro" | "none"): OpenClawConfig {
  return {
    agents: {
      defaults: {
        sandbox: {
          mode: "all",
          scope: "session",
          workspaceAccess,
          workspaceRoot: sandboxRoot,
          docker: {
            workdir: "/workspace",
          },
        },
      },
      list: [{ id: "main", skills: ["openclaw-readonly"] }],
    },
  };
}

describe("resolveSandboxContext openclaw-readonly wiring", () => {
  let envSnapshot: ReturnType<typeof captureFullEnv>;
  const cleanupDirs = new Set<string>();

  beforeEach(() => {
    envSnapshot = captureFullEnv();
    dockerMocks.ensureSandboxContainer.mockClear();
    dockerMocks.resolveDockerHostPathInfo.mockClear();
    dockerMocks.resolveDockerHostPathInfo.mockResolvedValue({
      path: "/host/openclaw-readonly-projection",
      remapSucceeded: true,
    });
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

  it("adds a synthetic readonly bind for rw sandboxes without writing into the real workspace", async () => {
    const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sandbox-root-"));
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-workspace-"));
    cleanupDirs.add(sandboxRoot);
    cleanupDirs.add(workspaceDir);

    const context = await resolveSandboxContext({
      config: createConfig(sandboxRoot, "rw"),
      sessionKey: "agent:main:main",
      workspaceDir,
    });

    expect(context?.workspaceAccess).toBe("rw");
    expect(context?.workspaceDir).toBe(workspaceDir);
    expect(context?.docker.env?.OPENCLAW_READONLY_PROJECTION_ROOT).toBe(
      "/workspace/.openclaw-readonly/agents/main",
    );
    expect(dockerMocks.resolveDockerHostPathInfo).toHaveBeenCalledWith(
      path.join(
        resolveSandboxWorkspaceDir(sandboxRoot, "agent:main:main"),
        ".openclaw-readonly",
        "agents",
        "main",
      ),
    );
    expect(dockerMocks.ensureSandboxContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceDir,
        agentWorkspaceDir: workspaceDir,
        extraBinds: [
          "/host/openclaw-readonly-projection:/workspace/.openclaw-readonly/agents/main:ro",
        ],
        additionalBindSourceRoots: ["/host/openclaw-readonly-projection"],
      }),
    );
    await expect(fs.access(path.join(workspaceDir, ".openclaw-readonly"))).rejects.toThrow();
    await expect(
      fs.readFile(
        path.join(
          resolveSandboxWorkspaceDir(sandboxRoot, "agent:main:main"),
          ".openclaw-readonly",
          "agents",
          "main",
          "openclaw.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"agents"');
  });

  it.each(["ro", "none"] as const)(
    "projects directly into the mounted sandbox workspace when workspaceAccess=%s",
    async (workspaceAccess) => {
      const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sandbox-root-"));
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-workspace-"));
      cleanupDirs.add(sandboxRoot);
      cleanupDirs.add(workspaceDir);

      const context = await resolveSandboxContext({
        config: createConfig(sandboxRoot, workspaceAccess),
        sessionKey: "agent:main:main",
        workspaceDir,
      });

      expect(context?.workspaceAccess).toBe(workspaceAccess);
      expect(context?.docker.env?.OPENCLAW_READONLY_PROJECTION_ROOT).toBe(
        "/workspace/.openclaw-readonly/agents/main",
      );
      expect(dockerMocks.resolveDockerHostPathInfo).not.toHaveBeenCalled();
      expect(dockerMocks.ensureSandboxContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          extraBinds: [],
          additionalBindSourceRoots: [],
        }),
      );
      await expect(
        fs.readFile(
          path.join(
            context?.workspaceDir ?? "",
            ".openclaw-readonly",
            "agents",
            "main",
            "openclaw.json",
          ),
          "utf8",
        ),
      ).resolves.toContain('"agents"');
    },
  );
});
