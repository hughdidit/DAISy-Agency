import { beforeEach, describe, expect, it, vi } from "vitest";
import { BROWSER_BRIDGES } from "./browser-bridges.js";
import { ensureSandboxBrowser } from "./browser.js";
import { resetNoVncObserverTokensForTests } from "./novnc-auth.js";
import { slugifySessionKey } from "./shared.js";
import { collectDockerFlagValues, findDockerArgsCall } from "./test-args.js";
import type { SandboxConfig } from "./types.js";

const dockerMocks = vi.hoisted(() => ({
  dockerContainerState: vi.fn(),
  execDocker: vi.fn(),
  readDockerBindMounts: vi.fn(),
  readDockerContainerEnvVar: vi.fn(),
  readDockerContainerLabel: vi.fn(),
  readDockerPort: vi.fn(),
  resolveDockerHostPathInfo: vi.fn(),
}));

const registryMocks = vi.hoisted(() => ({
  readBrowserRegistry: vi.fn(),
  updateBrowserRegistry: vi.fn(),
}));

const bridgeMocks = vi.hoisted(() => ({
  startBrowserBridgeServer: vi.fn(),
  stopBrowserBridgeServer: vi.fn(),
}));

vi.mock("./docker.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./docker.js")>();
  return {
    ...actual,
    dockerContainerState: dockerMocks.dockerContainerState,
    execDocker: dockerMocks.execDocker,
    readDockerBindMounts: dockerMocks.readDockerBindMounts,
    readDockerContainerEnvVar: dockerMocks.readDockerContainerEnvVar,
    readDockerContainerLabel: dockerMocks.readDockerContainerLabel,
    readDockerPort: dockerMocks.readDockerPort,
    resolveDockerHostPathInfo: dockerMocks.resolveDockerHostPathInfo,
  };
});

vi.mock("./registry.js", () => ({
  readBrowserRegistry: registryMocks.readBrowserRegistry,
  updateBrowserRegistry: registryMocks.updateBrowserRegistry,
}));

vi.mock("../../browser/bridge-server.js", () => ({
  startBrowserBridgeServer: bridgeMocks.startBrowserBridgeServer,
  stopBrowserBridgeServer: bridgeMocks.stopBrowserBridgeServer,
}));

function buildConfig(enableNoVnc: boolean): SandboxConfig {
  return {
    mode: "all",
    scope: "session",
    profile: "browser-automation",
    workspaceAccess: "none",
    workspaceRoot: "/tmp/openclaw-sandboxes",
    docker: {
      image: "openclaw-sandbox:bookworm-slim",
      containerPrefix: "openclaw-sbx-",
      workdir: "/workspace",
      readOnlyRoot: true,
      tmpfs: ["/tmp", "/var/tmp", "/run"],
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
      headless: false,
      enableNoVnc,
      allowHostControl: false,
      autoStart: true,
      autoStartTimeoutMs: 12_000,
    },
    tools: {
      allow: ["browser"],
      deny: [],
    },
    prune: {
      idleHours: 24,
      maxAgeDays: 7,
    },
  };
}

describe("ensureSandboxBrowser create args", () => {
  beforeEach(() => {
    BROWSER_BRIDGES.clear();
    resetNoVncObserverTokensForTests();
    dockerMocks.dockerContainerState.mockClear();
    dockerMocks.execDocker.mockClear();
    dockerMocks.readDockerBindMounts.mockClear();
    dockerMocks.readDockerContainerEnvVar.mockClear();
    dockerMocks.readDockerContainerLabel.mockClear();
    dockerMocks.readDockerPort.mockClear();
    dockerMocks.resolveDockerHostPathInfo.mockClear();
    registryMocks.readBrowserRegistry.mockClear();
    registryMocks.updateBrowserRegistry.mockClear();
    bridgeMocks.startBrowserBridgeServer.mockClear();
    bridgeMocks.stopBrowserBridgeServer.mockClear();

    dockerMocks.dockerContainerState.mockResolvedValue({ exists: false, running: false });
    dockerMocks.execDocker.mockImplementation(async (args: string[]) => {
      if (args[0] === "image" && args[1] === "inspect") {
        return { stdout: "[]", stderr: "", code: 0 };
      }
      return { stdout: "", stderr: "", code: 0 };
    });
    dockerMocks.readDockerBindMounts.mockResolvedValue(null);
    dockerMocks.readDockerContainerLabel.mockResolvedValue(null);
    dockerMocks.readDockerContainerEnvVar.mockResolvedValue(null);
    dockerMocks.resolveDockerHostPathInfo.mockImplementation(async (value: string) => ({
      path: value,
      remapSucceeded: true,
    }));
    dockerMocks.readDockerPort.mockImplementation(async (_containerName: string, port: number) => {
      if (port === 9222) {
        return 49100;
      }
      if (port === 6080) {
        return 49101;
      }
      return null;
    });
    registryMocks.readBrowserRegistry.mockResolvedValue({ entries: [] });
    registryMocks.updateBrowserRegistry.mockResolvedValue(undefined);
    bridgeMocks.startBrowserBridgeServer.mockResolvedValue({
      server: {} as never,
      port: 19000,
      baseUrl: "http://127.0.0.1:19000",
      state: {
        server: null,
        port: 19000,
        resolved: { profiles: {} },
        profiles: new Map(),
      },
    });
    bridgeMocks.stopBrowserBridgeServer.mockResolvedValue(undefined);
  });

  it("publishes noVNC on loopback and injects noVNC password env", async () => {
    const result = await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/tmp/workspace",
      agentWorkspaceDir: "/tmp/workspace",
      cfg: buildConfig(true),
    });

    const createArgs = findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create");

    expect(createArgs).toBeDefined();
    expect(createArgs).toContain("127.0.0.1::6080");
    const envEntries = collectDockerFlagValues(createArgs ?? [], "-e");
    expect(envEntries).toContain("OPENCLAW_BROWSER_NO_SANDBOX=1");
    const passwordEntry = envEntries.find((entry) =>
      entry.startsWith("OPENCLAW_BROWSER_NOVNC_PASSWORD="),
    );
    expect(passwordEntry).toMatch(/^OPENCLAW_BROWSER_NOVNC_PASSWORD=[A-Za-z0-9]{8}$/);
    expect(result?.noVncUrl).toMatch(/^http:\/\/127\.0\.0\.1:19000\/sandbox\/novnc\?token=/);
    expect(result?.noVncUrl).not.toContain("password=");
  });

  it("does not inject noVNC password env when noVNC is disabled", async () => {
    const result = await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/tmp/workspace",
      agentWorkspaceDir: "/tmp/workspace",
      cfg: buildConfig(false),
    });

    const createArgs = findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create");
    const envEntries = collectDockerFlagValues(createArgs ?? [], "-e");
    expect(envEntries.some((entry) => entry.startsWith("OPENCLAW_BROWSER_NOVNC_PASSWORD="))).toBe(
      false,
    );
    expect(result?.noVncUrl).toBeUndefined();
  });

  it("mounts the main workspace read-only when workspaceAccess is none", async () => {
    const cfg = buildConfig(false);
    cfg.workspaceAccess = "none";

    await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/tmp/workspace",
      agentWorkspaceDir: "/tmp/workspace",
      cfg,
    });

    const createArgs = findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create");

    expect(createArgs).toBeDefined();
    expect(createArgs).toContain("/tmp/workspace:/workspace:ro");
  });

  it("keeps the main workspace writable when workspaceAccess is rw", async () => {
    const cfg = buildConfig(false);
    cfg.workspaceAccess = "rw";

    await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/tmp/workspace",
      agentWorkspaceDir: "/tmp/workspace",
      cfg,
    });

    const createArgs = findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create");

    expect(createArgs).toBeDefined();
    expect(createArgs).toContain("/tmp/workspace:/workspace");
    expect(createArgs).not.toContain("/tmp/workspace:/workspace:ro");
  });

  it("adds custom browser binds only once", async () => {
    const cfg = buildConfig(false);
    cfg.docker.binds = ["/tmp/browser-cache:/cache:rw"];

    await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/tmp/workspace",
      agentWorkspaceDir: "/tmp/workspace",
      cfg,
    });

    const createArgs = findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create");
    const bindArgs = collectDockerFlagValues(createArgs ?? [], "-v");
    expect(bindArgs.filter((entry) => entry === "/tmp/browser-cache:/cache:rw")).toHaveLength(1);
  });

  it("recreates a hot browser container when the workspace mount source is wrong", async () => {
    const cfg = buildConfig(false);
    cfg.workspaceAccess = "rw";
    const expectedHash = "expected-browser-hash";
    const containerName = `openclaw-sbx-browser-${slugifySessionKey("session:test")}`.slice(0, 63);

    dockerMocks.dockerContainerState.mockResolvedValue({ exists: true, running: true });
    dockerMocks.readDockerContainerLabel.mockResolvedValue(expectedHash);
    dockerMocks.readDockerBindMounts.mockResolvedValue([
      {
        source: "/home/node/.openclaw/workspace",
        destination: "/workspace",
        rw: true,
      },
    ]);
    registryMocks.readBrowserRegistry.mockResolvedValue({
      entries: [
        {
          containerName,
          sessionKey: "session:test",
          createdAtMs: 1,
          lastUsedAtMs: Date.now(),
          image: cfg.browser.image,
          configHash: expectedHash,
          cdpPort: 49100,
        },
      ],
    });
    dockerMocks.resolveDockerHostPathInfo.mockResolvedValue({
      path: "/opt/DAISy/workspace",
      remapSucceeded: true,
    });

    await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/home/node/.openclaw/workspace",
      agentWorkspaceDir: "/home/node/.openclaw/workspace",
      cfg,
    });

    expect(dockerMocks.execDocker).toHaveBeenCalledWith(["rm", "-f", containerName], {
      allowFailure: true,
    });
    const createArgs = findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create");
    expect(createArgs).toContain("/opt/DAISy/workspace:/workspace");
  });

  it("recreates a hot read-only browser container when the workspace mount source is wrong", async () => {
    const cfg = buildConfig(false);
    cfg.workspaceAccess = "ro";
    const expectedHash = "expected-browser-hash";
    const containerName = `openclaw-sbx-browser-${slugifySessionKey("session:test")}`.slice(0, 63);

    dockerMocks.dockerContainerState.mockResolvedValue({ exists: true, running: true });
    dockerMocks.readDockerContainerLabel.mockResolvedValue(expectedHash);
    dockerMocks.readDockerBindMounts.mockResolvedValue([
      {
        source: "/home/node/.openclaw/workspace",
        destination: "/workspace",
        mode: "ro",
        rw: false,
      },
    ]);
    registryMocks.readBrowserRegistry.mockResolvedValue({
      entries: [
        {
          containerName,
          sessionKey: "session:test",
          createdAtMs: 1,
          lastUsedAtMs: Date.now(),
          image: cfg.browser.image,
          configHash: expectedHash,
          cdpPort: 49100,
        },
      ],
    });
    dockerMocks.resolveDockerHostPathInfo.mockResolvedValue({
      path: "/opt/DAISy/workspace",
      remapSucceeded: true,
    });

    await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/home/node/.openclaw/workspace",
      agentWorkspaceDir: "/home/node/.openclaw/workspace",
      cfg,
    });

    expect(dockerMocks.execDocker).toHaveBeenCalledWith(["rm", "-f", containerName], {
      allowFailure: true,
    });
    const createArgs = findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create");
    expect(createArgs).toContain("/opt/DAISy/workspace:/workspace:ro");
  });

  it("keeps a hot browser container when the workspace mount already matches", async () => {
    const cfg = buildConfig(false);
    cfg.workspaceAccess = "rw";
    const expectedHash = "expected-browser-hash";
    const containerName = `openclaw-sbx-browser-${slugifySessionKey("session:test")}`.slice(0, 63);

    dockerMocks.dockerContainerState.mockResolvedValue({ exists: true, running: true });
    dockerMocks.readDockerContainerLabel.mockResolvedValue(expectedHash);
    dockerMocks.readDockerBindMounts.mockResolvedValue([
      {
        source: "/opt/DAISy/workspace",
        destination: "/workspace",
        rw: true,
      },
    ]);
    registryMocks.readBrowserRegistry.mockResolvedValue({
      entries: [
        {
          containerName,
          sessionKey: "session:test",
          createdAtMs: 1,
          lastUsedAtMs: Date.now(),
          image: cfg.browser.image,
          configHash: expectedHash,
          cdpPort: 49100,
        },
      ],
    });
    dockerMocks.resolveDockerHostPathInfo.mockResolvedValue({
      path: "/opt/DAISy/workspace",
      remapSucceeded: true,
    });

    await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/home/node/.openclaw/workspace",
      agentWorkspaceDir: "/home/node/.openclaw/workspace",
      cfg,
    });

    expect(dockerMocks.execDocker).not.toHaveBeenCalledWith(["rm", "-f", containerName], {
      allowFailure: true,
    });
    expect(findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create")).toBeUndefined();
  });

  it("keeps a hot browser container when host-path remap is unresolved", async () => {
    const cfg = buildConfig(false);
    cfg.workspaceAccess = "rw";
    const expectedHash = "expected-browser-hash";
    const containerName = `openclaw-sbx-browser-${slugifySessionKey("session:test")}`.slice(0, 63);

    dockerMocks.dockerContainerState.mockResolvedValue({ exists: true, running: true });
    dockerMocks.readDockerContainerLabel.mockResolvedValue(expectedHash);
    registryMocks.readBrowserRegistry.mockResolvedValue({
      entries: [
        {
          containerName,
          sessionKey: "session:test",
          createdAtMs: 1,
          lastUsedAtMs: Date.now(),
          image: cfg.browser.image,
          configHash: expectedHash,
          cdpPort: 49100,
        },
      ],
    });
    dockerMocks.resolveDockerHostPathInfo.mockResolvedValue({
      path: "/home/node/.openclaw/workspace",
      remapSucceeded: false,
    });

    await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/home/node/.openclaw/workspace",
      agentWorkspaceDir: "/home/node/.openclaw/workspace",
      cfg,
    });

    expect(dockerMocks.readDockerBindMounts).not.toHaveBeenCalledWith(containerName);
    expect(dockerMocks.execDocker).not.toHaveBeenCalledWith(["rm", "-f", containerName], {
      allowFailure: true,
    });
    expect(findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create")).toBeUndefined();
  });
});
