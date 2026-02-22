import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

=======
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
>>>>>>> 096a7a571 (perf(test): speed up update-startup and docker-setup suites)
=======
import { captureEnv } from "../test-utils/env.js";
>>>>>>> 992b7e557 (refactor(test): use env snapshots in setup hooks)
import type { UpdateCheckResult } from "./update-check.js";

vi.mock("./moltbot-root.js", () => ({
  resolveMoltbotPackageRoot: vi.fn(),
}));

vi.mock("./update-check.js", async () => {
  const parse = (value: string) => value.split(".").map((part) => Number.parseInt(part, 10));
  const compareSemverStrings = (a: string, b: string) => {
    const left = parse(a);
    const right = parse(b);
    for (let idx = 0; idx < 3; idx += 1) {
      const l = left[idx] ?? 0;
      const r = right[idx] ?? 0;
      if (l !== r) {
        return l < r ? -1 : 1;
      }
    }
    return 0;
  };

  return {
    checkUpdateStatus: vi.fn(),
    compareSemverStrings,
    resolveNpmChannelTag: vi.fn(),
  };
});

vi.mock("../version.js", () => ({
  VERSION: "1.0.0",
}));

vi.mock("../process/exec.js", () => ({
  runCommandWithTimeout: vi.fn(),
}));

describe("update-startup", () => {
  let suiteRoot = "";
  let suiteCase = 0;
  let tempDir: string;
  let envSnapshot: ReturnType<typeof captureEnv>;

  let resolveOpenClawPackageRoot: (typeof import("./openclaw-root.js"))["resolveOpenClawPackageRoot"];
  let checkUpdateStatus: (typeof import("./update-check.js"))["checkUpdateStatus"];
  let resolveNpmChannelTag: (typeof import("./update-check.js"))["resolveNpmChannelTag"];
  let runCommandWithTimeout: (typeof import("../process/exec.js"))["runCommandWithTimeout"];
  let runGatewayUpdateCheck: (typeof import("./update-startup.js"))["runGatewayUpdateCheck"];
  let scheduleGatewayUpdateCheck: (typeof import("./update-startup.js"))["scheduleGatewayUpdateCheck"];
  let getUpdateAvailable: (typeof import("./update-startup.js"))["getUpdateAvailable"];
  let resetUpdateAvailableStateForTest: (typeof import("./update-startup.js"))["resetUpdateAvailableStateForTest"];
  let loaded = false;

  beforeAll(async () => {
    suiteRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-update-check-suite-"));
  });

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-17T10:00:00Z"));
<<<<<<< HEAD
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-update-check-"));
    process.env.CLAWDBOT_STATE_DIR = tempDir;
=======
    tempDir = path.join(suiteRoot, `case-${++suiteCase}`);
    await fs.mkdir(tempDir);
    envSnapshot = captureEnv(["OPENCLAW_STATE_DIR", "NODE_ENV", "VITEST"]);
    process.env.OPENCLAW_STATE_DIR = tempDir;
<<<<<<< HEAD
>>>>>>> 096a7a571 (perf(test): speed up update-startup and docker-setup suites)
    delete process.env.VITEST;
=======

<<<<<<< HEAD
    hadNodeEnv = Object.prototype.hasOwnProperty.call(process.env, "NODE_ENV");
    prevNodeEnv = process.env.NODE_ENV;
>>>>>>> ed2ae5886 (perf(test): avoid process.env cloning in update-startup suite)
=======
>>>>>>> 992b7e557 (refactor(test): use env snapshots in setup hooks)
    process.env.NODE_ENV = "test";

    // Ensure update checks don't short-circuit in test mode.
    delete process.env.VITEST;

    // Perf: load mocked modules once (after timers/env are set up).
    if (!loaded) {
      ({ resolveOpenClawPackageRoot } = await import("./openclaw-root.js"));
      ({ checkUpdateStatus, resolveNpmChannelTag } = await import("./update-check.js"));
      ({ runCommandWithTimeout } = await import("../process/exec.js"));
      ({
        runGatewayUpdateCheck,
        scheduleGatewayUpdateCheck,
        getUpdateAvailable,
        resetUpdateAvailableStateForTest,
      } = await import("./update-startup.js"));
      loaded = true;
    }
    vi.mocked(resolveOpenClawPackageRoot).mockClear();
    vi.mocked(checkUpdateStatus).mockClear();
    vi.mocked(resolveNpmChannelTag).mockClear();
    vi.mocked(runCommandWithTimeout).mockClear();
    resetUpdateAvailableStateForTest();
  });

  afterEach(async () => {
    vi.useRealTimers();
    envSnapshot.restore();
    resetUpdateAvailableStateForTest();
  });

<<<<<<< HEAD
  it("logs update hint for npm installs when newer tag exists", async () => {
    const { resolveMoltbotPackageRoot } = await import("./moltbot-root.js");
    const { checkUpdateStatus, resolveNpmChannelTag } = await import("./update-check.js");
    const { runGatewayUpdateCheck } = await import("./update-startup.js");

    vi.mocked(resolveMoltbotPackageRoot).mockResolvedValue("/opt/moltbot");
=======
  afterAll(async () => {
    if (suiteRoot) {
      await fs.rm(suiteRoot, { recursive: true, force: true });
    }
    suiteRoot = "";
    suiteCase = 0;
  });

  async function runUpdateCheckAndReadState(channel: "stable" | "beta") {
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue("/opt/openclaw");
>>>>>>> 096a7a571 (perf(test): speed up update-startup and docker-setup suites)
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/moltbot",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "2.0.0",
    });

    const log = { info: vi.fn() };
    await runGatewayUpdateCheck({
      cfg: { update: { channel } },
      log,
      isNixMode: false,
      allowInTests: true,
    });

    const statePath = path.join(tempDir, "update-check.json");
    const parsed = JSON.parse(await fs.readFile(statePath, "utf-8")) as {
      lastNotifiedVersion?: string;
      lastNotifiedTag?: string;
      lastAvailableVersion?: string;
      lastAvailableTag?: string;
    };
    return { log, parsed };
  }

  it.each([
    {
      name: "stable channel",
      channel: "stable" as const,
    },
    {
      name: "beta channel with older beta tag",
      channel: "beta" as const,
    },
  ])("logs latest update hint for $name", async ({ channel }) => {
    const { log, parsed } = await runUpdateCheckAndReadState(channel);

    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining("update available (latest): v2.0.0"),
    );
    expect(parsed.lastNotifiedVersion).toBe("2.0.0");
    expect(parsed.lastAvailableVersion).toBe("2.0.0");
<<<<<<< HEAD
  });

  it("uses latest when beta tag is older than release", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
    const { resolveMoltbotPackageRoot } = await import("./moltbot-root.js");
    const { checkUpdateStatus, resolveNpmChannelTag } = await import("./update-check.js");
    const { runGatewayUpdateCheck } = await import("./update-startup.js");

    vi.mocked(resolveMoltbotPackageRoot).mockResolvedValue("/opt/moltbot");
=======
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue("/opt/openclaw");
>>>>>>> 096a7a571 (perf(test): speed up update-startup and docker-setup suites)
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/moltbot",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "2.0.0",
    });

    const log = { info: vi.fn() };
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "beta" } },
      log,
      isNixMode: false,
      allowInTests: true,
    });
=======
    const { log, parsed } = await runUpdateCheckAndReadState("beta");
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)

    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining("update available (latest): v2.0.0"),
    );
=======
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)
    expect(parsed.lastNotifiedTag).toBe("latest");
  });

  it("hydrates cached update from persisted state during throttle window", async () => {
    const statePath = path.join(tempDir, "update-check.json");
    await fs.writeFile(
      statePath,
      JSON.stringify(
        {
          lastCheckedAt: new Date(Date.now()).toISOString(),
          lastAvailableVersion: "2.0.0",
          lastAvailableTag: "latest",
        },
        null,
        2,
      ),
      "utf-8",
    );

    const onUpdateAvailableChange = vi.fn();
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      onUpdateAvailableChange,
    });

    expect(vi.mocked(checkUpdateStatus)).not.toHaveBeenCalled();
    expect(onUpdateAvailableChange).toHaveBeenCalledWith({
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      channel: "latest",
    });
    expect(getUpdateAvailable()).toEqual({
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      channel: "latest",
    });
  });

  it("emits update change callback when update state clears", async () => {
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue("/opt/openclaw");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/openclaw",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag)
      .mockResolvedValueOnce({
        tag: "latest",
        version: "2.0.0",
      })
      .mockResolvedValueOnce({
        tag: "latest",
        version: "1.0.0",
      });

    const onUpdateAvailableChange = vi.fn();
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      onUpdateAvailableChange,
    });
    vi.setSystemTime(new Date("2026-01-18T11:00:00Z"));
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      onUpdateAvailableChange,
    });

    expect(onUpdateAvailableChange).toHaveBeenNthCalledWith(1, {
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      channel: "latest",
    });
    expect(onUpdateAvailableChange).toHaveBeenNthCalledWith(2, null);
    expect(getUpdateAvailable()).toBeNull();
  });

  it("skips update check when disabled in config", async () => {
    const log = { info: vi.fn() };

    await runGatewayUpdateCheck({
      cfg: { update: { checkOnStart: false } },
      log,
      isNixMode: false,
      allowInTests: true,
    });

    expect(log.info).not.toHaveBeenCalled();
    await expect(fs.stat(path.join(tempDir, "update-check.json"))).rejects.toThrow();
  });

  it("defers stable auto-update until rollout window is due", async () => {
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue("/opt/openclaw");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/openclaw",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "2.0.0",
    });

    const runAutoUpdate = vi.fn().mockResolvedValue({
      ok: true,
      code: 0,
    });

    await runGatewayUpdateCheck({
      cfg: {
        update: {
          channel: "stable",
          auto: {
            enabled: true,
            stableDelayHours: 6,
            stableJitterHours: 12,
          },
        },
      },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      runAutoUpdate,
    });
    expect(runAutoUpdate).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-01-18T07:00:00Z"));
    await runGatewayUpdateCheck({
      cfg: {
        update: {
          channel: "stable",
          auto: {
            enabled: true,
            stableDelayHours: 6,
            stableJitterHours: 12,
          },
        },
      },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      runAutoUpdate,
    });

    expect(runAutoUpdate).toHaveBeenCalledTimes(1);
    expect(runAutoUpdate).toHaveBeenCalledWith({
      channel: "stable",
      timeoutMs: 45 * 60 * 1000,
      root: "/opt/openclaw",
    });
  });

  it("runs beta auto-update checks hourly when enabled", async () => {
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue("/opt/openclaw");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/openclaw",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "beta",
      version: "2.0.0-beta.1",
    });

    const runAutoUpdate = vi.fn().mockResolvedValue({
      ok: true,
      code: 0,
    });

    await runGatewayUpdateCheck({
      cfg: {
        update: {
          channel: "beta",
          auto: {
            enabled: true,
            betaCheckIntervalHours: 1,
          },
        },
      },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      runAutoUpdate,
    });

    expect(runAutoUpdate).toHaveBeenCalledTimes(1);
    expect(runAutoUpdate).toHaveBeenCalledWith({
      channel: "beta",
      timeoutMs: 45 * 60 * 1000,
      root: "/opt/openclaw",
    });
  });

  it("runs auto-update when checkOnStart is false but auto-update is enabled", async () => {
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue("/opt/openclaw");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/openclaw",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "beta",
      version: "2.0.0-beta.1",
    });
    const runAutoUpdate = vi.fn().mockResolvedValue({
      ok: true,
      code: 0,
    });

    await runGatewayUpdateCheck({
      cfg: {
        update: {
          checkOnStart: false,
          channel: "beta",
          auto: {
            enabled: true,
            betaCheckIntervalHours: 1,
          },
        },
      },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      runAutoUpdate,
    });

    expect(runAutoUpdate).toHaveBeenCalledTimes(1);
  });

  it("uses current runtime + entrypoint for default auto-update command execution", async () => {
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue("/opt/openclaw");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/openclaw",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "beta",
      version: "2.0.0-beta.1",
    });
    vi.mocked(runCommandWithTimeout).mockResolvedValue({
      stdout: "{}",
      stderr: "",
      code: 0,
      signal: null,
      killed: false,
      termination: "exit",
    });

    const originalArgv = process.argv.slice();
    process.argv = [process.execPath, "/opt/openclaw/dist/entry.js"];
    try {
      await runGatewayUpdateCheck({
        cfg: {
          update: {
            channel: "beta",
            auto: {
              enabled: true,
              betaCheckIntervalHours: 1,
            },
          },
        },
        log: { info: vi.fn() },
        isNixMode: false,
        allowInTests: true,
      });
    } finally {
      process.argv = originalArgv;
    }

    expect(runCommandWithTimeout).toHaveBeenCalledWith(
      [
        process.execPath,
        "/opt/openclaw/dist/entry.js",
        "update",
        "--yes",
        "--channel",
        "beta",
        "--json",
      ],
      expect.objectContaining({
        timeoutMs: 45 * 60 * 1000,
        env: expect.objectContaining({
          OPENCLAW_AUTO_UPDATE: "1",
        }),
      }),
    );
  });

  it("scheduleGatewayUpdateCheck returns a cleanup function", async () => {
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue("/opt/openclaw");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/openclaw",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "2.0.0",
    });

    const stop = scheduleGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log: { info: vi.fn() },
      isNixMode: false,
    });
    expect(typeof stop).toBe("function");
    stop();
  });
});
