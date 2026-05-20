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

function addGmailPolicyConfig(config: OpenClawConfig): OpenClawConfig {
  return {
    ...config,
    plugins: {
      entries: {
        "gws-toolkit-phase1": {
          enabled: true,
          config: {
            gmailPolicy: {
              whitelistFile: "./gws/gmail-whitelist.json",
              blacklistFile: "./gws/gmail-blacklist.json",
            },
          },
        },
      },
    },
  } as OpenClawConfig;
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
    const ensureCalls = dockerMocks.ensureSandboxContainer.mock.calls as unknown as Array<
      Array<{ extraBinds?: string[] }>
    >;
    const extraBinds = ensureCalls[0]?.[0]?.extraBinds ?? [];
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

  it("stages gmail policy files into the synthetic readonly projection without nested binds", async () => {
    const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sandbox-root-"));
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-workspace-"));
    const configRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-config-"));
    cleanupDirs.add(sandboxRoot);
    cleanupDirs.add(workspaceDir);
    cleanupDirs.add(configRoot);

    await fs.mkdir(path.join(configRoot, "gws"), { recursive: true });
    await fs.writeFile(path.join(configRoot, "openclaw.json"), "{}\n", "utf8");
    await fs.writeFile(
      path.join(configRoot, "gws", "gmail-whitelist.json"),
      '{ "version": 1, "emails": ["hughdidit@gmail.com"], "domains": ["hughdidit.com"] }\n',
      "utf8",
    );
    await fs.writeFile(
      path.join(configRoot, "gws", "gmail-blacklist.json"),
      '{ "version": 1, "emails": [], "domains": [] }\n',
      "utf8",
    );
    delete process.env.OPENCLAW_CONFIG_FILE;
    process.env.OPENCLAW_CONFIG_PATH = path.join(configRoot, "openclaw.json");

    const context = await resolveSandboxContext({
      config: addGmailPolicyConfig(createConfig(sandboxRoot, "rw")),
      sessionKey: "agent:main:main",
      workspaceDir,
    });

    expect(context).toBeDefined();
    expect(context?.docker.binds).toEqual([
      `/host/openclaw-readonly-projection:${OPENCLAW_READONLY_SYNTHETIC_CONTAINER_ROOT}/agents/main:ro`,
    ]);

    const projectionRoot = path.join(
      resolveSandboxWorkspaceDir(sandboxRoot, "agent:main:main"),
      ".openclaw-readonly",
      "agents",
      "main",
    );
    await expect(
      fs.readFile(path.join(projectionRoot, "gws", "gmail-whitelist.json"), "utf8"),
    ).resolves.toContain("hughdidit@gmail.com");
    await expect(
      fs.readFile(path.join(projectionRoot, "gws", "gmail-blacklist.json"), "utf8"),
    ).resolves.toContain('"domains": []');
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
