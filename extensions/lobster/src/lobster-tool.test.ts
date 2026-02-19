import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { MoltbotPluginApi, MoltbotPluginToolContext } from "../../../src/plugins/types.js";
import { createLobsterTool } from "./lobster-tool.js";

async function writeFakeLobsterScript(scriptBody: string, prefix = "moltbot-lobster-plugin-") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const isWindows = process.platform === "win32";

  if (isWindows) {
    const scriptPath = path.join(dir, "lobster.js");
    const cmdPath = path.join(dir, "lobster.cmd");
    await fs.writeFile(scriptPath, scriptBody, { encoding: "utf8" });
    const cmd = `@echo off\r\n"${process.execPath}" "${scriptPath}" %*\r\n`;
    await fs.writeFile(cmdPath, cmd, { encoding: "utf8" });
    return { dir, binPath: cmdPath };
  }

  const binPath = path.join(dir, "lobster");
  const file = `#!/usr/bin/env node\n${scriptBody}\n`;
  await fs.writeFile(binPath, file, { encoding: "utf8", mode: 0o755 });
  return { dir, binPath };
}

async function writeFakeLobster(params: { payload: unknown }) {
  const scriptBody =
    `const payload = ${JSON.stringify(params.payload)};\n` +
    `process.stdout.write(JSON.stringify(payload));\n`;
  return await writeFakeLobsterScript(scriptBody);
}

<<<<<<< HEAD
function fakeApi(): MoltbotPluginApi {
=======
function fakeApi(overrides: Partial<OpenClawPluginApi> = {}): OpenClawPluginApi {
>>>>>>> 1295b6705 (fix(lobster): block arbitrary exec via lobsterPath/cwd (GHSA-4mhr-g7xj-cg8j) (#5335))
  return {
    id: "lobster",
    name: "lobster",
    source: "test",
    config: {} as any,
    pluginConfig: {},
    runtime: { version: "test" } as any,
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    registerTool() {},
    registerHttpHandler() {},
    registerChannel() {},
    registerGatewayMethod() {},
    registerCli() {},
    registerService() {},
    registerProvider() {},
    registerHook() {},
    registerHttpRoute() {},
    registerCommand() {},
    on() {},
    resolvePath: (p) => p,
    ...overrides,
  };
}

function fakeCtx(overrides: Partial<MoltbotPluginToolContext> = {}): MoltbotPluginToolContext {
  return {
    config: {} as any,
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
<<<<<<< HEAD
  it("runs lobster and returns parsed envelope in details", async () => {
    const fake = await writeFakeLobster({
      payload: { ok: true, status: "ok", output: [{ hello: "world" }], requiresApproval: null },
    });
=======
  let tempDir = "";
  const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
  const originalPath = process.env.PATH;
  const originalPathAlt = process.env.Path;
  const originalPathExt = process.env.PATHEXT;
  const originalPathExtAlt = process.env.Pathext;
>>>>>>> 29118995a (refactor(lobster): remove lobsterPath overrides)

    const originalPath = process.env.PATH;
    process.env.PATH = `${fake.dir}${path.delimiter}${originalPath ?? ""}`;

<<<<<<< HEAD
    try {
      const tool = createLobsterTool(fakeApi());
      const res = await tool.execute("call1", {
        action: "run",
        pipeline: "noop",
        timeoutMs: 1000,
      });

      expect(res.details).toMatchObject({ ok: true, status: "ok" });
    } finally {
      process.env.PATH = originalPath;
    }
=======
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-lobster-plugin-"));
  });

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, "platform", originalPlatform);
    }
    if (originalPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = originalPath;
    }
    if (originalPathAlt === undefined) {
      delete process.env.Path;
    } else {
      process.env.Path = originalPathAlt;
    }
    if (originalPathExt === undefined) {
      delete process.env.PATHEXT;
    } else {
      process.env.PATHEXT = originalPathExt;
    }
    if (originalPathExtAlt === undefined) {
      delete process.env.Pathext;
    } else {
      process.env.Pathext = originalPathExtAlt;
    }
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

  const createWindowsShimFixture = async (params: {
    shimPath: string;
    scriptPath: string;
    scriptToken: string;
  }) => {
    await fs.mkdir(path.dirname(params.scriptPath), { recursive: true });
    await fs.mkdir(path.dirname(params.shimPath), { recursive: true });
    await fs.writeFile(params.scriptPath, "module.exports = {};\n", "utf8");
    await fs.writeFile(params.shimPath, `@echo off\r\n"${params.scriptToken}" %*\r\n`, "utf8");
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
    expect(res.details).toMatchObject({ ok: true, status: "ok" });
>>>>>>> 29118995a (refactor(lobster): remove lobsterPath overrides)
  });

  it("tolerates noisy stdout before the JSON envelope", async () => {
    const payload = { ok: true, status: "ok", output: [], requiresApproval: null };
    const { dir } = await writeFakeLobsterScript(
      `const payload = ${JSON.stringify(payload)};\n` +
        `console.log("noise before json");\n` +
        `process.stdout.write(JSON.stringify(payload));\n`,
      "moltbot-lobster-plugin-noisy-",
    );

    const originalPath = process.env.PATH;
    process.env.PATH = `${dir}${path.delimiter}${originalPath ?? ""}`;

    try {
      const tool = createLobsterTool(fakeApi());
      const res = await tool.execute("call-noisy", {
        action: "run",
        pipeline: "noop",
        timeoutMs: 1000,
      });

      expect(res.details).toMatchObject({ ok: true, status: "ok" });
    } finally {
      process.env.PATH = originalPath;
    }
  });

<<<<<<< HEAD
  it("requires absolute lobsterPath when provided (even though it is ignored)", async () => {
    const fake = await writeFakeLobster({
      payload: { ok: true, status: "ok", output: [{ hello: "world" }], requiresApproval: null },
    });

    const originalPath = process.env.PATH;
    process.env.PATH = `${fake.dir}${path.delimiter}${originalPath ?? ""}`;

    try {
      const tool = createLobsterTool(fakeApi());
      await expect(
        tool.execute("call2", {
          action: "run",
          pipeline: "noop",
          lobsterPath: "./lobster",
        }),
      ).rejects.toThrow(/absolute path/);
    } finally {
      process.env.PATH = originalPath;
    }
  });

  it("rejects lobsterPath (deprecated) when invalid", async () => {
    const fake = await writeFakeLobster({
      payload: { ok: true, status: "ok", output: [{ hello: "world" }], requiresApproval: null },
    });

    const originalPath = process.env.PATH;
    process.env.PATH = `${fake.dir}${path.delimiter}${originalPath ?? ""}`;

    try {
      const tool = createLobsterTool(fakeApi());
      await expect(
        tool.execute("call2b", {
          action: "run",
          pipeline: "noop",
          lobsterPath: "/bin/bash",
        }),
      ).rejects.toThrow(/lobster executable/);
    } finally {
      process.env.PATH = originalPath;
    }
=======
  it("requires action", async () => {
    const tool = createLobsterTool(fakeApi());
    await expect(tool.execute("call-action-missing", {})).rejects.toThrow(/action required/);
  });

  it("requires pipeline for run action", async () => {
    const tool = createLobsterTool(fakeApi());
    await expect(
      tool.execute("call-pipeline-missing", {
        action: "run",
      }),
    ).rejects.toThrow(/pipeline required/);
  });

  it("requires token and approve for resume action", async () => {
    const tool = createLobsterTool(fakeApi());
    await expect(
      tool.execute("call-resume-token-missing", {
        action: "resume",
        approve: true,
      }),
    ).rejects.toThrow(/token required/);
    await expect(
      tool.execute("call-resume-approve-missing", {
        action: "resume",
        token: "resume-token",
      }),
    ).rejects.toThrow(/approve required/);
  });

  it("rejects unknown action", async () => {
    const tool = createLobsterTool(fakeApi());
    await expect(
      tool.execute("call-action-unknown", {
        action: "explode",
      }),
    ).rejects.toThrow(/Unknown action/);
>>>>>>> 29118995a (refactor(lobster): remove lobsterPath overrides)
  });

  it("rejects absolute cwd", async () => {
    const tool = createLobsterTool(fakeApi());
    await expect(
      tool.execute("call2c", {
        action: "run",
        pipeline: "noop",
        cwd: "/tmp",
      }),
    ).rejects.toThrow(/cwd must be a relative path/);
  });

  it("rejects cwd that escapes the gateway working directory", async () => {
    const tool = createLobsterTool(fakeApi());
    await expect(
      tool.execute("call2d", {
        action: "run",
        pipeline: "noop",
        cwd: "../../etc",
      }),
    ).rejects.toThrow(/must stay within/);
  });

<<<<<<< HEAD
  it("uses pluginConfig.lobsterPath when provided", async () => {
    const fake = await writeFakeLobster({
      payload: { ok: true, status: "ok", output: [{ hello: "world" }], requiresApproval: null },
    });

    // Ensure `lobster` is NOT discoverable via PATH, while still allowing our
    // fake lobster (a Node script with `#!/usr/bin/env node`) to run.
    const originalPath = process.env.PATH;
    process.env.PATH = path.dirname(process.execPath);

    try {
      const tool = createLobsterTool(fakeApi({ pluginConfig: { lobsterPath: fake.binPath } }));
      const res = await tool.execute("call-plugin-config", {
        action: "run",
        pipeline: "noop",
        timeoutMs: 1000,
      });

      expect(res.details).toMatchObject({ ok: true, status: "ok" });
    } finally {
      process.env.PATH = originalPath;
    }
  });

  it("rejects invalid JSON from lobster", async () => {
    const { dir } = await writeFakeLobsterScript(
      `process.stdout.write("nope");\n`,
      "moltbot-lobster-plugin-bad-",
    );

    const originalPath = process.env.PATH;
    process.env.PATH = `${dir}${path.delimiter}${originalPath ?? ""}`;

    try {
      const tool = createLobsterTool(fakeApi());
      await expect(
        tool.execute("call3", {
          action: "run",
          pipeline: "noop",
        }),
      ).rejects.toThrow(/invalid JSON/);
    } finally {
      process.env.PATH = originalPath;
    }
=======
  it("rejects invalid JSON from lobster", async () => {
    spawnState.queue.push({ stdout: "nope" });

    const tool = createLobsterTool(fakeApi());
    await expect(
      tool.execute("call3", {
        action: "run",
        pipeline: "noop",
      }),
    ).rejects.toThrow(/invalid JSON/);
  });

  it("runs Windows cmd shims through Node without enabling shell", async () => {
    setProcessPlatform("win32");
    const shimScriptPath = path.join(tempDir, "shim-dist", "lobster-cli.cjs");
    const shimPath = path.join(tempDir, "shim-bin", "lobster.cmd");
    await createWindowsShimFixture({
      shimPath,
      scriptPath: shimScriptPath,
      scriptToken: "%dp0%\\..\\shim-dist\\lobster-cli.cjs",
    });
    process.env.PATHEXT = ".CMD;.EXE";
    process.env.PATH = `${path.dirname(shimPath)};${process.env.PATH ?? ""}`;
    queueSuccessfulEnvelope();

    const tool = createLobsterTool(fakeApi());
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

    const tool = createLobsterTool(fakeApi());
    await expect(
      tool.execute("call-win-no-retry", {
        action: "run",
        pipeline: "noop",
      }),
    ).rejects.toThrow(/spawn failed/);
    expect(spawnState.spawn).toHaveBeenCalledTimes(1);
>>>>>>> 29118995a (refactor(lobster): remove lobsterPath overrides)
  });

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
