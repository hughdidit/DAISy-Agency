import { beforeEach, describe, expect, it, vi } from "vitest";
import { repairSandboxWorkspaceMountsOnStartup } from "./startup-repair.js";
import { resolveSandboxWorkspaceDir } from "./shared.js";

const mocks = vi.hoisted(() => ({
  readRegistry: vi.fn(),
  readBrowserRegistry: vi.fn(),
  readDockerBindMounts: vi.fn(),
  resolveDockerHostPathInfo: vi.fn(),
  hasUnsafeWorkspaceMount: vi.fn(),
  removeSandboxContainer: vi.fn(),
  removeSandboxBrowserContainer: vi.fn(),
  resolveSandboxConfigForAgent: vi.fn(),
  resolveAgentWorkspaceDir: vi.fn(),
  resolveDefaultAgentId: vi.fn(() => "main"),
}));

vi.mock("./registry.js", () => ({
  readRegistry: mocks.readRegistry,
  readBrowserRegistry: mocks.readBrowserRegistry,
}));

vi.mock("./docker.js", () => ({
  readDockerBindMounts: mocks.readDockerBindMounts,
  resolveDockerHostPathInfo: mocks.resolveDockerHostPathInfo,
  hasUnsafeWorkspaceMount: mocks.hasUnsafeWorkspaceMount,
}));

vi.mock("./manage.js", () => ({
  removeSandboxContainer: mocks.removeSandboxContainer,
  removeSandboxBrowserContainer: mocks.removeSandboxBrowserContainer,
}));

vi.mock("./config.js", () => ({
  resolveSandboxConfigForAgent: mocks.resolveSandboxConfigForAgent,
}));

vi.mock("../agent-scope.js", () => ({
  resolveAgentWorkspaceDir: mocks.resolveAgentWorkspaceDir,
  resolveDefaultAgentId: mocks.resolveDefaultAgentId,
}));

describe("repairSandboxWorkspaceMountsOnStartup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readRegistry.mockResolvedValue({ entries: [] });
    mocks.readBrowserRegistry.mockResolvedValue({ entries: [] });
    mocks.readDockerBindMounts.mockResolvedValue([
      {
        source: "/home/node/.openclaw/workspace",
        destination: "/workspace",
        rw: true,
      },
    ]);
    mocks.resolveDockerHostPathInfo.mockResolvedValue({
      path: "/opt/DAISy/workspace",
      remapSucceeded: true,
    });
    mocks.hasUnsafeWorkspaceMount.mockReturnValue(false);
    mocks.removeSandboxContainer.mockResolvedValue(undefined);
    mocks.removeSandboxBrowserContainer.mockResolvedValue(undefined);
    mocks.resolveSandboxConfigForAgent.mockReturnValue({
      mode: "all",
      scope: "shared",
      workspaceAccess: "rw",
      workspaceRoot: "~/.openclaw/sandboxes",
      docker: {
        image: "openclaw-sandbox:bookworm-slim",
        containerPrefix: "openclaw-sbx-",
        workdir: "/workspace",
        readOnlyRoot: true,
        tmpfs: ["/tmp"],
        network: "none",
        capDrop: ["ALL"],
        env: { LANG: "C.UTF-8" },
      },
      browser: {
        enabled: true,
        image: "openclaw-sandbox-browser:bookworm-slim",
        containerPrefix: "openclaw-sbx-browser-",
        network: "openclaw-sandbox-browser",
        cdpPort: 9222,
        vncPort: 5900,
        noVncPort: 6080,
        headless: true,
        enableNoVnc: false,
        allowHostControl: false,
        autoStart: false,
        autoStartTimeoutMs: 5000,
      },
      tools: { allow: [], deny: [] },
      prune: { idleHours: 24, maxAgeDays: 7 },
    });
    mocks.resolveAgentWorkspaceDir.mockReturnValue("/home/node/.openclaw/workspace");
  });

  it("removes stale exec and browser containers with unsafe workspace mounts", async () => {
    mocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "openclaw-sbx-agent-main-main",
          sessionKey: "agent:main:main",
        },
      ],
    });
    mocks.readBrowserRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "openclaw-sbx-browser-agent-main-main",
          sessionKey: "agent:main:main",
        },
      ],
    });
    mocks.hasUnsafeWorkspaceMount.mockReturnValue(true);
    const log = { warn: vi.fn() };

    await repairSandboxWorkspaceMountsOnStartup({} as never, log);

    expect(mocks.removeSandboxContainer).toHaveBeenCalledWith("openclaw-sbx-agent-main-main");
    expect(mocks.removeSandboxBrowserContainer).toHaveBeenCalledWith(
      "openclaw-sbx-browser-agent-main-main",
    );
    expect(log.warn).toHaveBeenCalledWith(
      "Removed 2 stale sandbox container(s) on startup so they can be recreated with the current workspace mount mapping.",
    );
  });

  it("skips removal when host-path remap is unresolved", async () => {
    mocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "openclaw-sbx-agent-main-main",
          sessionKey: "agent:main:main",
        },
      ],
    });
    mocks.resolveDockerHostPathInfo.mockResolvedValue({
      path: "/home/node/.openclaw/workspace",
      remapSucceeded: false,
    });
    const log = { warn: vi.fn() };

    await repairSandboxWorkspaceMountsOnStartup({} as never, log);

    expect(mocks.readDockerBindMounts).not.toHaveBeenCalled();
    expect(mocks.hasUnsafeWorkspaceMount).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedSourceTrusted: false,
      }),
    );
    expect(mocks.removeSandboxContainer).not.toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("keeps agent-scoped ro entries on their stored scope key", async () => {
    mocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "openclaw-sbx-agent-other",
          sessionKey: "agent:other",
        },
      ],
    });
    mocks.resolveSandboxConfigForAgent.mockReturnValue({
      mode: "all",
      scope: "agent",
      workspaceAccess: "ro",
      workspaceRoot: "~/.openclaw/sandboxes",
      docker: {
        image: "openclaw-sandbox:bookworm-slim",
        containerPrefix: "openclaw-sbx-",
        workdir: "/workspace",
        readOnlyRoot: true,
        tmpfs: ["/tmp"],
        network: "none",
        capDrop: ["ALL"],
        env: { LANG: "C.UTF-8" },
      },
      browser: {
        enabled: true,
        image: "openclaw-sandbox-browser:bookworm-slim",
        containerPrefix: "openclaw-sbx-browser-",
        network: "openclaw-sandbox-browser",
        cdpPort: 9222,
        vncPort: 5900,
        noVncPort: 6080,
        headless: true,
        enableNoVnc: false,
        allowHostControl: false,
        autoStart: false,
        autoStartTimeoutMs: 5000,
      },
      tools: { allow: [], deny: [] },
      prune: { idleHours: 24, maxAgeDays: 7 },
    });

    await repairSandboxWorkspaceMountsOnStartup({} as never);

    expect(mocks.resolveSandboxConfigForAgent).toHaveBeenCalledWith(expect.anything(), "other");
    expect(mocks.resolveDockerHostPathInfo).toHaveBeenCalledWith(
      resolveSandboxWorkspaceDir("~/.openclaw/sandboxes", "agent:other"),
    );
    expect(mocks.removeSandboxContainer).not.toHaveBeenCalled();
  });
});
