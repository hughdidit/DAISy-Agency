import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./docker.js", () => ({
  execDockerRaw: vi.fn(),
}));

import type { SandboxContext } from "./types.js";
import { execDockerRaw } from "./docker.js";
import { createSandboxFsBridge } from "./fs-bridge.js";

const mockedExecDockerRaw = vi.mocked(execDockerRaw);

const sandbox: SandboxContext = {
  enabled: true,
  sessionKey: "sandbox:test",
  workspaceDir: "/tmp/workspace",
  agentWorkspaceDir: "/tmp/workspace",
  workspaceAccess: "rw",
  containerName: "moltbot-sbx-test",
  containerWorkdir: "/workspace",
  docker: {
    image: "moltbot-sandbox:bookworm-slim",
    containerPrefix: "moltbot-sbx-",
    network: "none",
    user: "1000:1000",
    workdir: "/workspace",
    readOnlyRoot: false,
    tmpfs: [],
    capDrop: [],
    seccompProfile: "",
    apparmorProfile: "",
    setupCommand: "",
    binds: [],
    dns: [],
    extraHosts: [],
    pidsLimit: 0,
  },
  tools: { allow: ["*"], deny: [] },
  browserAllowHostControl: false,
};

describe("sandbox fs bridge shell compatibility", () => {
  beforeEach(() => {
    mockedExecDockerRaw.mockReset();
    mockedExecDockerRaw.mockImplementation(async (args) => {
      const script = args[5] ?? "";
      if (script.includes('stat -c "%F|%s|%Y"')) {
        return {
          stdout: Buffer.from("regular file|1|2"),
          stderr: Buffer.alloc(0),
          code: 0,
        };
      }
      if (script.includes('cat -- "$1"')) {
        return {
          stdout: Buffer.from("content"),
          stderr: Buffer.alloc(0),
          code: 0,
        };
      }
      return {
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        code: 0,
      };
    });
  });

  it("uses POSIX-safe shell prologue in all bridge commands", async () => {
    const bridge = createSandboxFsBridge({ sandbox });

    await bridge.readFile({ filePath: "a.txt" });
    await bridge.writeFile({ filePath: "b.txt", data: "hello" });
    await bridge.mkdirp({ filePath: "nested" });
    await bridge.remove({ filePath: "b.txt" });
    await bridge.rename({ from: "a.txt", to: "c.txt" });
    await bridge.stat({ filePath: "c.txt" });

    expect(mockedExecDockerRaw).toHaveBeenCalled();

    const scripts = mockedExecDockerRaw.mock.calls.map(([args]) => args[5] ?? "");
    const executables = mockedExecDockerRaw.mock.calls.map(([args]) => args[3] ?? "");

    expect(executables.every((shell) => shell === "sh")).toBe(true);
    expect(scripts.every((script) => script.includes("set -eu;"))).toBe(true);
    expect(scripts.some((script) => script.includes("pipefail"))).toBe(false);
  });
<<<<<<< HEAD
=======

  it("resolveCanonicalContainerPath script is valid POSIX sh (no do; token)", async () => {
    const bridge = createSandboxFsBridge({ sandbox: createSandbox() });

    await bridge.readFile({ filePath: "a.txt" });

    const scripts = mockedExecDockerRaw.mock.calls.map(([args]) => args[5] ?? "");
    const canonicalScript = scripts.find((script) => script.includes("allow_final"));
    expect(canonicalScript).toBeDefined();
    // "; " joining can create "do; cmd", which is invalid in POSIX sh.
    expect(canonicalScript).not.toMatch(/\bdo;/);
    // Keep command on the next line after "do" for POSIX-sh safety.
    expect(canonicalScript).toMatch(/\bdo\n\s*parent=/);
  });

  it("reads inbound media-style filenames with triple-dash ids", async () => {
    const bridge = createSandboxFsBridge({ sandbox: createSandbox() });
    const inboundPath = "media/inbound/file_1095---f00a04a2-99a0-4d98-99b0-dfe61c5a4198.ogg";

    await bridge.readFile({ filePath: inboundPath });

    const readCall = mockedExecDockerRaw.mock.calls.find(([args]) =>
      String(args[5] ?? "").includes('cat -- "$1"'),
    );
    expect(readCall).toBeDefined();
    const readPath = String(readCall?.[0].at(-1) ?? "");
    expect(readPath).toContain("file_1095---");
  });

  it("resolves dash-leading basenames into absolute container paths", async () => {
    const bridge = createSandboxFsBridge({ sandbox: createSandbox() });

    await bridge.readFile({ filePath: "--leading.txt" });

    const readCall = findCallByScriptFragment('cat -- "$1"');
    expect(readCall).toBeDefined();
    const readPath = readCall ? getDockerPathArg(readCall[0]) : "";
    expect(readPath).toBe("/workspace/--leading.txt");
  });

  it("resolves bind-mounted absolute container paths for reads", async () => {
    const sandbox = createSandbox({
      docker: {
        ...createSandbox().docker,
        binds: ["/tmp/workspace-two:/workspace-two:ro"],
      },
    });
    const bridge = createSandboxFsBridge({ sandbox });

    await bridge.readFile({ filePath: "/workspace-two/README.md" });

    const args = mockedExecDockerRaw.mock.calls.at(-1)?.[0] ?? [];
    expect(args).toEqual(
      expect.arrayContaining(["moltbot-sbx-test", "sh", "-c", 'set -eu; cat -- "$1"']),
    );
    expect(args.at(-1)).toBe("/workspace-two/README.md");
  });

  it("blocks writes into read-only bind mounts", async () => {
    const sandbox = createSandbox({
      docker: {
        ...createSandbox().docker,
        binds: ["/tmp/workspace-two:/workspace-two:ro"],
      },
    });
    const bridge = createSandboxFsBridge({ sandbox });

    await expect(
      bridge.writeFile({ filePath: "/workspace-two/new.txt", data: "hello" }),
    ).rejects.toThrow(/read-only/);
    expect(mockedExecDockerRaw).not.toHaveBeenCalled();
  });

  it("rejects pre-existing host symlink escapes before docker exec", async () => {
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-fs-bridge-"));
    const workspaceDir = path.join(stateDir, "workspace");
    const outsideDir = path.join(stateDir, "outside");
    const outsideFile = path.join(outsideDir, "secret.txt");
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.mkdir(outsideDir, { recursive: true });
    await fs.writeFile(outsideFile, "classified");
    await fs.symlink(outsideFile, path.join(workspaceDir, "link.txt"));

    const bridge = createSandboxFsBridge({
      sandbox: createSandbox({
        workspaceDir,
        agentWorkspaceDir: workspaceDir,
      }),
    });

    await expect(bridge.readFile({ filePath: "link.txt" })).rejects.toThrow(/Symlink escapes/);
    expect(mockedExecDockerRaw).not.toHaveBeenCalled();
    await fs.rm(stateDir, { recursive: true, force: true });
  });

  it("rejects container-canonicalized paths outside allowed mounts", async () => {
    mockedExecDockerRaw.mockImplementation(async (args) => {
      const script = args[5] ?? "";
      if (script.includes('readlink -f -- "$cursor"')) {
        return {
          stdout: Buffer.from("/etc/passwd\n"),
          stderr: Buffer.alloc(0),
          code: 0,
        };
      }
      if (script.includes('cat -- "$1"')) {
        return {
          stdout: Buffer.from("content"),
          stderr: Buffer.alloc(0),
          code: 0,
        };
      }
      return {
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        code: 0,
      };
    });

    const bridge = createSandboxFsBridge({ sandbox: createSandbox() });
    await expect(bridge.readFile({ filePath: "a.txt" })).rejects.toThrow(/escapes allowed mounts/i);
    const scripts = mockedExecDockerRaw.mock.calls.map(([args]) => args[5] ?? "");
    expect(scripts.some((script) => script.includes('cat -- "$1"'))).toBe(false);
  });
>>>>>>> a2529c25f (test(matrix,discord,sandbox): expand breakage regression coverage)
});
