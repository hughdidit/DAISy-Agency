import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { MoltbotPluginApi, MoltbotPluginToolContext } from "../../../src/plugins/types.js";
import { createLobsterTool } from "./lobster-tool.js";

async function writeFakeLobsterScript(scriptBody: string, prefix = "moltbot-lobster-plugin-") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const isWindows = process.platform === "win32";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn: (...args: unknown[]) => spawnState.spawn(...args),
  };
});

let createLobsterTool: typeof import("./lobster-tool.js").createLobsterTool;

function fakeApi(): MoltbotPluginApi {
  return {
    id: "lobster",
    name: "lobster",
    source: "test",
    config: {} as any,
    runtime: { version: "test" } as any,
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    registerTool() {},
    registerHttpHandler() {},
    registerChannel() {},
    registerGatewayMethod() {},
    registerCli() {},
    registerService() {},
    registerProvider() {},
    resolvePath: (p) => p,
  };
}

function fakeCtx(overrides: Partial<MoltbotPluginToolContext> = {}): MoltbotPluginToolContext {
  return {
    config: {},
    workspaceDir: "/tmp",
    agentDir: "/tmp",
    agentId: "main",
    sessionKey: "main",
    messageChannel: undefined,
    agentAccountId: undefined,
    sandboxed: false,
    ...overrides,
  };
}

describe("lobster plugin tool", () => {
  let tempDir = "";
  let lobsterBinPath = "";

    const tool = createLobsterTool(fakeApi());
    const res = await tool.execute("call1", {
      action: "run",
      pipeline: "noop",
      lobsterPath: fake.binPath,
      timeoutMs: 1000,
    });

  });

  afterAll(async () => {
    if (!tempDir) {
      return;
    }
    if (process.platform === "win32") {
      await fs.rm(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    } else {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    spawnState.queue.length = 0;
    spawnState.spawn.mockReset();
    spawnState.spawn.mockImplementation(() => {
      const next = spawnState.queue.shift() ?? { stdout: "" };
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      const child = new EventEmitter() as EventEmitter & {
        stdout: PassThrough;
        stderr: PassThrough;
        kill: (signal?: string) => boolean;
      };
      child.stdout = stdout;
      child.stderr = stderr;
      child.kill = () => true;

      setImmediate(() => {
        if (next.stderr) {
          stderr.end(next.stderr);
        } else {
          stderr.end();
        }
        stdout.end(next.stdout);
        child.emit("exit", next.exitCode ?? 0);
      });

      return child;
    });
  });

  const queueSuccessfulEnvelope = (hello = "world") => {
    spawnState.queue.push({
      stdout: JSON.stringify({
        ok: true,
        status: "ok",
        output: [{ hello }],
        requiresApproval: null,
      }),
    });
  };

  it("runs lobster and returns parsed envelope in details", async () => {
    spawnState.queue.push({
      stdout: JSON.stringify({
        ok: true,
        status: "ok",
        output: [{ hello: "world" }],
        requiresApproval: null,
      }),
    });

    const tool = createLobsterTool(fakeApi());
    const res = await tool.execute("call1", {
      action: "run",
      pipeline: "noop",
      timeoutMs: 1000,
    });

    expect(spawnState.spawn).toHaveBeenCalled();
>>>>>>> 5e496a151 (perf(test): mock lobster subprocess)
    expect(res.details).toMatchObject({ ok: true, status: "ok" });
  });

  it("tolerates noisy stdout before the JSON envelope", async () => {
    const payload = { ok: true, status: "ok", output: [], requiresApproval: null };
    const { binPath } = await writeFakeLobsterScript(
      `const payload = ${JSON.stringify(payload)};\n` +
        `console.log("noise before json");\n` +
        `process.stdout.write(JSON.stringify(payload));\n`,
      "moltbot-lobster-plugin-noisy-",
    );

    const tool = createLobsterTool(fakeApi());
    const res = await tool.execute("call-noisy", {
      action: "run",
      pipeline: "noop",
      lobsterPath: binPath,
      timeoutMs: 1000,
    });

    expect(res.details).toMatchObject({ ok: true, status: "ok" });
  });

  it("requires absolute lobsterPath when provided", async () => {
    const tool = createLobsterTool(fakeApi());
    await expect(
      tool.execute("call2", {
        action: "run",
        pipeline: "noop",
        lobsterPath: "./lobster",
      }),
    ).rejects.toThrow(/absolute path/);
  });

  it("rejects invalid JSON from lobster", async () => {
    const { binPath } = await writeFakeLobsterScript(
      `process.stdout.write("nope");\n`,
      "moltbot-lobster-plugin-bad-",
    );

    const tool = createLobsterTool(fakeApi());
    await expect(
      tool.execute("call3", {
        action: "run",
        pipeline: "noop",
        lobsterPath: binPath,
      }),
    ).rejects.toThrow(/invalid JSON/);
  });

  it("runs Windows cmd shims through Node without enabling shell", async () => {
    setProcessPlatform("win32");
    const shimScriptPath = path.join(tempDir, "shim-dist", "lobster-cli.cjs");
<<<<<<< HEAD
    const shimPath = path.join(tempDir, "shim", "lobster.cmd");
    await fs.mkdir(path.dirname(shimScriptPath), { recursive: true });
    await fs.mkdir(path.dirname(shimPath), { recursive: true });
    await fs.writeFile(shimScriptPath, "module.exports = {};\n", "utf8");
    await fs.writeFile(
      shimPath,
      `@echo off\r\n"%dp0%\\..\\shim-dist\\lobster-cli.cjs" %*\r\n`,
      "utf8",
    );
    spawnState.queue.push({
      stdout: JSON.stringify({
        ok: true,
        status: "ok",
        output: [{ hello: "world" }],
        requiresApproval: null,
      }),
=======
    const shimPath = path.join(tempDir, "shim-bin", "lobster.cmd");
    await createWindowsCmdShimFixture({
      shimPath,
      scriptPath: shimScriptPath,
      shimLine: `"%dp0%\\..\\shim-dist\\lobster-cli.cjs" %*`,
    });

    const tool = createLobsterTool(fakeApi({ pluginConfig: { lobsterPath: shimPath } }));
    await tool.execute("call-win-shim", {
      action: "run",
      pipeline: "noop",
    });

    const [command, argv, options] = spawnState.spawn.mock.calls[0] ?? [];
    expect(command).toBe(process.execPath);
    expect(argv).toEqual([shimScriptPath, "run", "--mode", "tool", "noop"]);
    expect(options).toMatchObject({ windowsHide: true });
    expect(options).not.toHaveProperty("shell");
  });

  it("runs Windows cmd shims with rooted dp0 tokens through Node", async () => {
    setProcessPlatform("win32");
    const shimScriptPath = path.join(tempDir, "shim-dist", "lobster-cli.cjs");
    const shimPath = path.join(tempDir, "shim", "lobster.cmd");
    await fs.mkdir(path.dirname(shimScriptPath), { recursive: true });
    await fs.mkdir(path.dirname(shimPath), { recursive: true });
    await fs.writeFile(shimScriptPath, "module.exports = {};\n", "utf8");
    await fs.writeFile(
      shimPath,
      `@echo off\r\n"%dp0%\\..\\shim-dist\\lobster-cli.cjs" %*\r\n`,
      "utf8",
    );
    spawnState.queue.push({
      stdout: JSON.stringify({
        ok: true,
        status: "ok",
        output: [{ hello: "rooted" }],
        requiresApproval: null,
      }),
    });

    const tool = createLobsterTool(fakeApi({ pluginConfig: { lobsterPath: shimPath } }));
    await tool.execute("call-win-rooted-shim", {
      action: "run",
      pipeline: "noop",
    });

    const [command, argv] = spawnState.spawn.mock.calls[0] ?? [];
    expect(command).toBe(process.execPath);
    expect(argv).toEqual([shimScriptPath, "run", "--mode", "tool", "noop"]);
  });

  it("ignores node.exe shim entries and resolves the actual lobster script", async () => {
    setProcessPlatform("win32");
    const shimDir = path.join(tempDir, "shim-with-node");
    const nodeExePath = path.join(shimDir, "node.exe");
    const scriptPath = path.join(tempDir, "shim-dist-node", "lobster-cli.cjs");
    const shimPath = path.join(shimDir, "lobster.cmd");
    await fs.mkdir(path.dirname(scriptPath), { recursive: true });
    await fs.mkdir(shimDir, { recursive: true });
    await fs.writeFile(nodeExePath, "", "utf8");
    await fs.writeFile(scriptPath, "module.exports = {};\n", "utf8");
    await fs.writeFile(
      shimPath,
      `@echo off\r\n"%~dp0%\\node.exe" "%~dp0%\\..\\shim-dist-node\\lobster-cli.cjs" %*\r\n`,
      "utf8",
    );
    spawnState.queue.push({
      stdout: JSON.stringify({
        ok: true,
        status: "ok",
        output: [{ hello: "node-first" }],
        requiresApproval: null,
      }),
    });

    const tool = createLobsterTool(fakeApi({ pluginConfig: { lobsterPath: shimPath } }));
    await tool.execute("call-win-node-first", {
      action: "run",
      pipeline: "noop",
    });

    const [command, argv] = spawnState.spawn.mock.calls[0] ?? [];
    expect(command).toBe(process.execPath);
    expect(argv).toEqual([scriptPath, "run", "--mode", "tool", "noop"]);
  });

  it("resolves lobster.cmd from PATH and unwraps npm layout shim", async () => {
    setProcessPlatform("win32");
    const binDir = path.join(tempDir, "node_modules", ".bin");
    const packageDir = path.join(tempDir, "node_modules", "lobster");
    const scriptPath = path.join(packageDir, "dist", "cli.js");
    const shimPath = path.join(binDir, "lobster.cmd");
    await fs.mkdir(path.dirname(scriptPath), { recursive: true });
    await fs.mkdir(binDir, { recursive: true });
    await fs.writeFile(shimPath, "@echo off\r\n", "utf8");
    await fs.writeFile(
      path.join(packageDir, "package.json"),
      JSON.stringify({ name: "lobster", version: "0.0.0", bin: { lobster: "dist/cli.js" } }),
      "utf8",
    );
    await fs.writeFile(scriptPath, "module.exports = {};\n", "utf8");
    process.env.PATHEXT = ".CMD;.EXE";
    process.env.PATH = `${binDir};${process.env.PATH ?? ""}`;

    spawnState.queue.push({
      stdout: JSON.stringify({
        ok: true,
        status: "ok",
        output: [{ hello: "path" }],
        requiresApproval: null,
      }),
    });

    const tool = createLobsterTool(fakeApi());
    await tool.execute("call-win-path", {
      action: "run",
      pipeline: "noop",
    });

    const [command, argv] = spawnState.spawn.mock.calls[0] ?? [];
    expect(command).toBe(process.execPath);
    expect(argv).toEqual([scriptPath, "run", "--mode", "tool", "noop"]);
  });

  it("fails fast when cmd wrapper cannot be resolved without shell execution", async () => {
    setProcessPlatform("win32");
    const badShimPath = path.join(tempDir, "bad-shim", "lobster.cmd");
    await fs.mkdir(path.dirname(badShimPath), { recursive: true });
    await fs.writeFile(badShimPath, "@echo off\r\nREM no entrypoint\r\n", "utf8");

    const tool = createLobsterTool(fakeApi({ pluginConfig: { lobsterPath: badShimPath } }));
    await expect(
      tool.execute("call-win-bad", {
        action: "run",
        pipeline: "noop",
      }),
    ).rejects.toThrow(/without shell execution/);
    expect(spawnState.spawn).not.toHaveBeenCalled();
  });

  it("does not retry a failed Windows spawn with shell fallback", async () => {
    setProcessPlatform("win32");
    spawnState.spawn.mockReset();
    spawnState.spawn.mockImplementationOnce(() => {
      const child = new EventEmitter() as EventEmitter & {
        stdout: PassThrough;
        stderr: PassThrough;
        kill: (signal?: string) => boolean;
      };
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = () => true;
      const err = Object.assign(new Error("spawn failed"), { code: "ENOENT" });
      setImmediate(() => child.emit("error", err));
      return child;
    });

    const tool = createLobsterTool(fakeApi({ pluginConfig: { lobsterPath: lobsterExePath } }));
    await expect(
      tool.execute("call-win-no-retry", {
        action: "run",
        pipeline: "noop",
      }),
    ).rejects.toThrow(/spawn failed/);
    expect(spawnState.spawn).toHaveBeenCalledTimes(1);
  });

>>>>>>> 1faa7a87a (lobster: parse windows cmd shim paths with rooted tokens (#20833))
  it("can be gated off in sandboxed contexts", async () => {
    const api = fakeApi();
    const factoryTool = (ctx: MoltbotPluginToolContext) => {
      if (ctx.sandboxed) return null;
      return createLobsterTool(api);
    };

    expect(factoryTool(fakeCtx({ sandboxed: true }))).toBeNull();
    expect(factoryTool(fakeCtx({ sandboxed: false }))?.name).toBe("lobster");
  });
});
