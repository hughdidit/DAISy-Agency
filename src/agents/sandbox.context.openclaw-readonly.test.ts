import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { captureFullEnv } from "../test-utils/env.js";
import { OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT } from "./sandbox/openclaw-readonly-projection.js";
import { resolveSandboxWorkspaceDir } from "./sandbox/shared.js";

const dockerMocks = vi.hoisted(() => ({
  ensureSandboxContainer: vi.fn(async () => "openclaw-sbx-test"),
  resolveDockerHostPathInfo: vi.fn(async () => ({
    path: "/host/openclaw-readonly-projection",
    remapSucceeded: true,
  })),
}));

vi.mock("./sandbox/docker.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sandbox/docker.js")>();
  return {
    ...actual,
    ensureSandboxContainer: dockerMocks.ensureSandboxContainer,
    resolveDockerHostPathInfo: dockerMocks.resolveDockerHostPathInfo,
  };
});

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

    expect(context).toBeDefined();
    expect(context?.workspaceAccess).toBe("rw");
    expect(context?.workspaceDir).toBe(workspaceDir);
    expect(context?.docker.env?.OPENCLAW_READONLY_PROJECTION_ROOT).toBe(
      `${OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT}/agents/main`,
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
          `/host/openclaw-readonly-projection:${OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT}/agents/main:ro`,
        ],
        additionalBindSourceRoots: ["/host/openclaw-readonly-projection"],
      }),
    );
    const firstEnsureCall = dockerMocks.ensureSandboxContainer.mock.calls[0] as
      | [{ extraBinds?: string[] }]
      | undefined;
    const extraBinds = firstEnsureCall?.[0]?.extraBinds ?? [];
    expect(extraBinds).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/:(\/workspace|\/agent)(\/|:|$)/)]),
    );
    await expect(fs.access(path.join(workspaceDir, ".openclaw-readonly"))).rejects.toThrow();
    expect(context?.workspaceDir).toBeTruthy();
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

  it("uses the resolved host path directly when rw projection remap is unavailable", async () => {
    const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sandbox-root-"));
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-workspace-"));
    cleanupDirs.add(sandboxRoot);
    cleanupDirs.add(workspaceDir);

    const directProjectionPath = path.join(
      resolveSandboxWorkspaceDir(sandboxRoot, "agent:main:main"),
      ".openclaw-readonly",
      "agents",
      "main",
    );
    dockerMocks.resolveDockerHostPathInfo.mockResolvedValue({
      path: directProjectionPath,
      remapSucceeded: false,
    });

    const context = await resolveSandboxContext({
      config: createConfig(sandboxRoot, "rw"),
      sessionKey: "agent:main:main",
      workspaceDir,
    });

    expect(context).toBeDefined();
    expect(context?.docker.env?.OPENCLAW_READONLY_PROJECTION_ROOT).toBe(
      `${OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT}/agents/main`,
    );
    expect(dockerMocks.ensureSandboxContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        extraBinds: [
          `${directProjectionPath}:${OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT}/agents/main:ro`,
        ],
        additionalBindSourceRoots: [directProjectionPath],
      }),
    );
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

      expect(context).toBeDefined();
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
      expect(context?.workspaceDir).toBeTruthy();
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
