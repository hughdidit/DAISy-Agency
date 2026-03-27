import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeSandboxConfigHash } from "./config-hash.js";
import { ensureSandboxContainer } from "./docker.js";
import { collectDockerFlagValues } from "./test-args.js";
import type { SandboxConfig } from "./types.js";

type SpawnCall = {
  command: string;
  args: string[];
};

const spawnState = vi.hoisted(() => ({
  calls: [] as SpawnCall[],
  inspectRunning: true,
  labelHash: "",
  inspectMountsByTarget: {} as Record<string, string>,
}));

const fsPromisesMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

const registryMocks = vi.hoisted(() => ({
  readRegistry: vi.fn(),
  updateRegistry: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  __esModule: true,
  default: {
    readFile: fsPromisesMocks.readFile,
  },
}));

vi.mock("./registry.js", () => ({
  readRegistry: registryMocks.readRegistry,
  updateRegistry: registryMocks.updateRegistry,
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn: (command: string, args: string[]) => {
      spawnState.calls.push({ command, args });
      const child = new EventEmitter() as EventEmitter & {
        stdout: Readable;
        stderr: Readable;
        stdin: { end: (input?: string | Buffer) => void };
        kill: (signal?: NodeJS.Signals) => void;
      };
      child.stdout = new Readable({ read() {} });
      child.stderr = new Readable({ read() {} });
      child.stdin = { end: () => undefined };
      child.kill = () => undefined;

      let code = 0;
      let stdout = "";
      let stderr = "";
      if (command !== "docker") {
        code = 1;
        stderr = `unexpected command: ${command}`;
      } else if (args[0] === "inspect" && args[1] === "-f" && args[2] === "{{json .Mounts}}") {
        const target = args[3] ?? "";
        if (target in spawnState.inspectMountsByTarget) {
          stdout = `${spawnState.inspectMountsByTarget[target]}\n`;
        } else {
          code = 1;
          stderr = `unexpected docker inspect target: ${target}`;
        }
      } else if (args[0] === "inspect" && args[1] === "-f" && args[2] === "{{.State.Running}}") {
        stdout = spawnState.inspectRunning ? "true\n" : "false\n";
      } else if (
        args[0] === "inspect" &&
        args[1] === "-f" &&
        args[2]?.includes('index .Config.Labels "openclaw.configHash"')
      ) {
        stdout = `${spawnState.labelHash}\n`;
      } else if (
        (args[0] === "rm" && args[1] === "-f") ||
        (args[0] === "image" && args[1] === "inspect") ||
        args[0] === "create" ||
        args[0] === "start"
      ) {
        code = 0;
      } else {
        code = 1;
        stderr = `unexpected docker args: ${args.join(" ")}`;
      }

      queueMicrotask(() => {
        if (stdout) {
          child.stdout.emit("data", Buffer.from(stdout));
        }
        if (stderr) {
          child.stderr.emit("data", Buffer.from(stderr));
        }
        child.emit("close", code);
      });
      return child;
    },
  };
});

function createSandboxConfig(
  dns: string[],
  binds?: string[],
  workspaceAccess: "rw" | "ro" | "none" = "rw",
): SandboxConfig {
  return {
    mode: "all",
    scope: "shared",
    workspaceAccess,
    workspaceRoot: "~/.openclaw/sandboxes",
    docker: {
      image: "openclaw-sandbox:test",
      containerPrefix: "oc-test-",
      workdir: "/workspace",
      readOnlyRoot: true,
      tmpfs: ["/tmp", "/var/tmp", "/run"],
      network: "none",
      capDrop: ["ALL"],
      env: { LANG: "C.UTF-8" },
      dns,
      extraHosts: ["host.docker.internal:host-gateway"],
      binds: binds ?? ["/tmp/workspace:/workspace:rw"],
      dangerouslyAllowReservedContainerTargets: true,
    },
    browser: {
      enabled: false,
      image: "openclaw-browser:test",
      containerPrefix: "oc-browser-",
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
  };
}

describe("ensureSandboxContainer config-hash recreation", () => {
  beforeEach(() => {
    spawnState.calls.length = 0;
    spawnState.inspectRunning = true;
    spawnState.labelHash = "";
    spawnState.inspectMountsByTarget = {};
    fsPromisesMocks.readFile.mockReset();
    // Default to the degraded path: mountinfo and bind-mount inspection are unavailable
    // unless a test opts in with explicit fixture data.
    fsPromisesMocks.readFile.mockRejectedValue(new Error("ENOENT"));
    registryMocks.readRegistry.mockClear();
    registryMocks.updateRegistry.mockClear();
    registryMocks.updateRegistry.mockResolvedValue(undefined);
  });

  it("recreates shared container when array-order change alters hash", async () => {
    const workspaceDir = "/tmp/workspace";
    const oldCfg = createSandboxConfig(["1.1.1.1", "8.8.8.8"]);
    const newCfg = createSandboxConfig(["8.8.8.8", "1.1.1.1"]);

    const oldHash = computeSandboxConfigHash({
      docker: oldCfg.docker,
      workspaceAccess: oldCfg.workspaceAccess,
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
    });
    const newHash = computeSandboxConfigHash({
      docker: newCfg.docker,
      workspaceAccess: newCfg.workspaceAccess,
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
    });
    expect(newHash).not.toBe(oldHash);

    spawnState.labelHash = oldHash;
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "oc-test-shared",
          sessionKey: "shared",
          createdAtMs: 1,
          lastUsedAtMs: 0,
          image: newCfg.docker.image,
          configHash: oldHash,
        },
      ],
    });

    const containerName = await ensureSandboxContainer({
      sessionKey: "agent:main:session-1",
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
      cfg: newCfg,
    });

    expect(containerName).toBe("oc-test-shared");
    const dockerCalls = spawnState.calls.filter((call) => call.command === "docker");
    expect(
      dockerCalls.some(
        (call) =>
          call.args[0] === "rm" && call.args[1] === "-f" && call.args[2] === "oc-test-shared",
      ),
    ).toBe(true);
    const createCall = dockerCalls.find((call) => call.args[0] === "create");
    expect(createCall).toBeDefined();
    expect(createCall?.args).toContain(`openclaw.configHash=${newHash}`);
    expect(registryMocks.updateRegistry).toHaveBeenCalledWith(
      expect.objectContaining({
        containerName: "oc-test-shared",
        configHash: newHash,
      }),
    );
  });

  it("resolves host workspace bind sources from gateway mountinfo", async () => {
    const workspaceDir = "/home/node/.openclaw/workspace";
    const cfg = createSandboxConfig(["1.1.1.1"]);
    const gatewayCid = "c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c";
    fsPromisesMocks.readFile.mockResolvedValue(
      `1176 1165 8:1 /var/lib/docker/containers/${gatewayCid}/hostname /etc/hostname ro,relatime - ext4 /dev/sda1 rw`,
    );
    spawnState.inspectMountsByTarget[gatewayCid] = JSON.stringify([
      {
        Type: "bind",
        Source: "/opt/DAISy/workspace",
        Destination: "/home/node/.openclaw/workspace",
        Mode: "rw",
        RW: true,
      },
    ]);
    spawnState.inspectRunning = false;
    registryMocks.readRegistry.mockResolvedValue({ entries: [] });

    await ensureSandboxContainer({
      sessionKey: "agent:main:session-1",
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
      cfg,
    });

    const createCall = spawnState.calls.find(
      (call) => call.command === "docker" && call.args[0] === "create",
    );
    expect(createCall).toBeDefined();

    const bindArgs = collectDockerFlagValues(createCall?.args ?? [], "-v");
    expect(bindArgs).toContain("/opt/DAISy/workspace:/workspace");
    expect(bindArgs).not.toContain("/home/node/.openclaw/workspace:/workspace");
  });

  it("applies custom binds after workspace mounts so overlapping binds can override", async () => {
    const workspaceDir = "/tmp/workspace";
    const cfg = createSandboxConfig(
      ["1.1.1.1"],
      ["/tmp/workspace-shared/USER.md:/workspace/USER.md:ro"],
    );
    cfg.docker.dangerouslyAllowExternalBindSources = true;
    const expectedHash = computeSandboxConfigHash({
      docker: cfg.docker,
      workspaceAccess: cfg.workspaceAccess,
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
    });

    spawnState.inspectRunning = false;
    spawnState.labelHash = "stale-hash";
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "oc-test-shared",
          sessionKey: "shared",
          createdAtMs: 1,
          lastUsedAtMs: 0,
          image: cfg.docker.image,
          configHash: "stale-hash",
        },
      ],
    });

    await ensureSandboxContainer({
      sessionKey: "agent:main:session-1",
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
      cfg,
    });

    const createCall = spawnState.calls.find(
      (call) => call.command === "docker" && call.args[0] === "create",
    );
    expect(createCall).toBeDefined();
    expect(createCall?.args).toContain(`openclaw.configHash=${expectedHash}`);

    const bindArgs = collectDockerFlagValues(createCall?.args ?? [], "-v");
    const workspaceMountIdx = bindArgs.indexOf("/tmp/workspace:/workspace");
    const customMountIdx = bindArgs.indexOf("/tmp/workspace-shared/USER.md:/workspace/USER.md:ro");
    expect(workspaceMountIdx).toBeGreaterThanOrEqual(0);
    expect(customMountIdx).toBeGreaterThan(workspaceMountIdx);
  });

  it.each([
    { workspaceAccess: "rw" as const, expectedMainMount: "/tmp/workspace:/workspace" },
    { workspaceAccess: "ro" as const, expectedMainMount: "/tmp/workspace:/workspace:ro" },
    { workspaceAccess: "none" as const, expectedMainMount: "/tmp/workspace:/workspace:ro" },
  ])(
    "uses expected main mount permissions when workspaceAccess=$workspaceAccess",
    async ({ workspaceAccess, expectedMainMount }) => {
      const workspaceDir = "/tmp/workspace";
      const cfg = createSandboxConfig([], undefined, workspaceAccess);

      spawnState.inspectRunning = false;
      spawnState.labelHash = "";
      registryMocks.readRegistry.mockResolvedValue({ entries: [] });
      registryMocks.updateRegistry.mockResolvedValue(undefined);

      await ensureSandboxContainer({
        sessionKey: "agent:main:session-1",
        workspaceDir,
        agentWorkspaceDir: workspaceDir,
        cfg,
      });

      const createCall = spawnState.calls.find(
        (call) => call.command === "docker" && call.args[0] === "create",
      );
      expect(createCall).toBeDefined();

      const bindArgs = collectDockerFlagValues(createCall?.args ?? [], "-v");
      expect(bindArgs).toContain(expectedMainMount);
    },
  );

  it("recreates a hot container when the existing workspace mount source is wrong", async () => {
    const workspaceDir = "/home/node/.openclaw/workspace";
    const cfg = createSandboxConfig([]);
    const gatewayCid = "c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c";
    const expectedHash = computeSandboxConfigHash({
      docker: cfg.docker,
      workspaceAccess: cfg.workspaceAccess,
      workspaceDir: "/opt/DAISy/workspace",
      agentWorkspaceDir: "/opt/DAISy/workspace",
    });

    fsPromisesMocks.readFile.mockResolvedValue(
      `1176 1165 8:1 /var/lib/docker/containers/${gatewayCid}/hostname /etc/hostname ro,relatime - ext4 /dev/sda1 rw`,
    );
    spawnState.inspectMountsByTarget[gatewayCid] = JSON.stringify([
      {
        Type: "bind",
        Source: "/opt/DAISy/workspace",
        Destination: "/home/node/.openclaw/workspace",
        Mode: "rw",
        RW: true,
      },
    ]);
    spawnState.inspectMountsByTarget["oc-test-shared"] = JSON.stringify([
      {
        Type: "bind",
        Source: "/home/node/.openclaw/workspace",
        Destination: "/workspace",
        Mode: "rw",
        RW: true,
      },
    ]);
    spawnState.labelHash = expectedHash;
    spawnState.inspectRunning = true;
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "oc-test-shared",
          sessionKey: "shared",
          createdAtMs: 1,
          lastUsedAtMs: Date.now(),
          image: cfg.docker.image,
          configHash: expectedHash,
        },
      ],
    });

    await ensureSandboxContainer({
      sessionKey: "agent:main:session-1",
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
      cfg,
    });

    const dockerCalls = spawnState.calls.filter((call) => call.command === "docker");
    expect(
      dockerCalls.some(
        (call) =>
          call.args[0] === "rm" && call.args[1] === "-f" && call.args[2] === "oc-test-shared",
      ),
    ).toBe(true);
    const createCall = dockerCalls.find((call) => call.args[0] === "create");
    expect(createCall).toBeDefined();
    expect(collectDockerFlagValues(createCall?.args ?? [], "-v")).toContain(
      "/opt/DAISy/workspace:/workspace",
    );
  });

  it("recreates a hot read-only container when the existing workspace mount source is wrong", async () => {
    const workspaceDir = "/home/node/.openclaw/workspace";
    const cfg = createSandboxConfig([], undefined, "ro");
    const gatewayCid = "c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c";
    const expectedHash = computeSandboxConfigHash({
      docker: cfg.docker,
      workspaceAccess: cfg.workspaceAccess,
      workspaceDir: "/opt/DAISy/workspace",
      agentWorkspaceDir: "/opt/DAISy/workspace",
    });

    fsPromisesMocks.readFile.mockResolvedValue(
      `1176 1165 8:1 /var/lib/docker/containers/${gatewayCid}/hostname /etc/hostname ro,relatime - ext4 /dev/sda1 rw`,
    );
    spawnState.inspectMountsByTarget[gatewayCid] = JSON.stringify([
      {
        Type: "bind",
        Source: "/opt/DAISy/workspace",
        Destination: "/home/node/.openclaw/workspace",
        Mode: "rw",
        RW: true,
      },
    ]);
    spawnState.inspectMountsByTarget["oc-test-shared"] = JSON.stringify([
      {
        Type: "bind",
        Source: "/home/node/.openclaw/workspace",
        Destination: "/workspace",
        Mode: "ro",
        RW: false,
      },
    ]);
    spawnState.labelHash = expectedHash;
    spawnState.inspectRunning = true;
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "oc-test-shared",
          sessionKey: "shared",
          createdAtMs: 1,
          lastUsedAtMs: Date.now(),
          image: cfg.docker.image,
          configHash: expectedHash,
        },
      ],
    });

    await ensureSandboxContainer({
      sessionKey: "agent:main:session-1",
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
      cfg,
    });

    const dockerCalls = spawnState.calls.filter((call) => call.command === "docker");
    expect(
      dockerCalls.some(
        (call) =>
          call.args[0] === "rm" && call.args[1] === "-f" && call.args[2] === "oc-test-shared",
      ),
    ).toBe(true);
    const createCall = dockerCalls.find((call) => call.args[0] === "create");
    expect(createCall).toBeDefined();
    expect(collectDockerFlagValues(createCall?.args ?? [], "-v")).toContain(
      "/opt/DAISy/workspace:/workspace:ro",
    );
  });

  it("keeps a hot container when the existing workspace mount already matches", async () => {
    const workspaceDir = "/home/node/.openclaw/workspace";
    const cfg = createSandboxConfig([]);
    const gatewayCid = "c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c";
    const expectedHash = computeSandboxConfigHash({
      docker: cfg.docker,
      workspaceAccess: cfg.workspaceAccess,
      workspaceDir: "/opt/DAISy/workspace",
      agentWorkspaceDir: "/opt/DAISy/workspace",
    });

    fsPromisesMocks.readFile.mockResolvedValue(
      `1176 1165 8:1 /var/lib/docker/containers/${gatewayCid}/hostname /etc/hostname ro,relatime - ext4 /dev/sda1 rw`,
    );
    spawnState.inspectMountsByTarget[gatewayCid] = JSON.stringify([
      {
        Type: "bind",
        Source: "/opt/DAISy/workspace",
        Destination: "/home/node/.openclaw/workspace",
        Mode: "rw",
        RW: true,
      },
    ]);
    spawnState.inspectMountsByTarget["oc-test-shared"] = JSON.stringify([
      {
        Type: "bind",
        Source: "/opt/DAISy/workspace",
        Destination: "/workspace",
        Mode: "rw",
        RW: true,
      },
    ]);
    spawnState.labelHash = expectedHash;
    spawnState.inspectRunning = true;
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "oc-test-shared",
          sessionKey: "shared",
          createdAtMs: 1,
          lastUsedAtMs: Date.now(),
          image: cfg.docker.image,
          configHash: expectedHash,
        },
      ],
    });

    await ensureSandboxContainer({
      sessionKey: "agent:main:session-1",
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
      cfg,
    });

    const dockerCalls = spawnState.calls.filter((call) => call.command === "docker");
    expect(
      dockerCalls.some(
        (call) =>
          call.args[0] === "rm" && call.args[1] === "-f" && call.args[2] === "oc-test-shared",
      ),
    ).toBe(false);
    expect(dockerCalls.some((call) => call.args[0] === "create")).toBe(false);
  });

  it("keeps a hot container when host-path remap is unresolved", async () => {
    const workspaceDir = "/home/node/.openclaw/workspace";
    const cfg = createSandboxConfig([]);
    const expectedHash = computeSandboxConfigHash({
      docker: cfg.docker,
      workspaceAccess: cfg.workspaceAccess,
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
    });

    spawnState.inspectMountsByTarget["oc-test-shared"] = JSON.stringify([
      {
        Type: "bind",
        Source: "/opt/DAISy/workspace",
        Destination: "/workspace",
        Mode: "rw",
        RW: true,
      },
    ]);
    spawnState.labelHash = expectedHash;
    spawnState.inspectRunning = true;
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "oc-test-shared",
          sessionKey: "shared",
          createdAtMs: 1,
          lastUsedAtMs: Date.now(),
          image: cfg.docker.image,
          configHash: expectedHash,
        },
      ],
    });

    await ensureSandboxContainer({
      sessionKey: "agent:main:session-1",
      workspaceDir,
      agentWorkspaceDir: workspaceDir,
      cfg,
    });

    const dockerCalls = spawnState.calls.filter((call) => call.command === "docker");
    expect(
      dockerCalls.some(
        (call) =>
          call.args[0] === "rm" && call.args[1] === "-f" && call.args[2] === "oc-test-shared",
      ),
    ).toBe(false);
    expect(dockerCalls.some((call) => call.args[0] === "create")).toBe(false);
  });
});
