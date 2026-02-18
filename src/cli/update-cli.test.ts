import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
import { beforeEach, describe, expect, it, vi } from "vitest";

=======
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
>>>>>>> caebe70e9 (perf(test): cut setup/import overhead in hot suites)
=======
import type { OpenClawConfig, ConfigFileSnapshot } from "../config/types.openclaw.js";
>>>>>>> 048e29ea3 (chore: Fix types in tests 45/N.)
import type { UpdateRunResult } from "../infra/update-runner.js";
import { captureEnv } from "../test-utils/env.js";

const confirm = vi.fn();
const select = vi.fn();
const spinner = vi.fn(() => ({ start: vi.fn(), stop: vi.fn() }));
const isCancel = (value: unknown) => value === "cancel";

const readPackageName = vi.fn();
const readPackageVersion = vi.fn();
const resolveGlobalManager = vi.fn();
const serviceLoaded = vi.fn();
const prepareRestartScript = vi.fn();
const runRestartScript = vi.fn();

vi.mock("@clack/prompts", () => ({
  confirm,
  select,
  isCancel,
  spinner,
}));

// Mock the update-runner module
vi.mock("../infra/update-runner.js", () => ({
  runGatewayUpdate: vi.fn(),
}));

vi.mock("../infra/moltbot-root.js", () => ({
  resolveMoltbotPackageRoot: vi.fn(),
}));

vi.mock("../config/config.js", () => ({
  readConfigFileSnapshot: vi.fn(),
  writeConfigFile: vi.fn(),
}));

vi.mock("../infra/update-check.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../infra/update-check.js")>();
  return {
    ...actual,
    checkUpdateStatus: vi.fn(),
    fetchNpmTagVersion: vi.fn(),
    resolveNpmChannelTag: vi.fn(),
  };
});

vi.mock("../process/exec.js", () => ({
  runCommandWithTimeout: vi.fn(),
}));

vi.mock("./update-cli/shared.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./update-cli/shared.js")>();
  return {
    ...actual,
    readPackageName,
    readPackageVersion,
    resolveGlobalManager,
  };
});

vi.mock("../daemon/service.js", () => ({
  resolveGatewayService: vi.fn(() => ({
    isLoaded: (...args: unknown[]) => serviceLoaded(...args),
  })),
}));

vi.mock("./update-cli/restart-helper.js", () => ({
  prepareRestartScript: (...args: unknown[]) => prepareRestartScript(...args),
  runRestartScript: (...args: unknown[]) => runRestartScript(...args),
}));

// Mock doctor (heavy module; should not run in unit tests)
vi.mock("../commands/doctor.js", () => ({
  doctorCommand: vi.fn(),
}));
// Mock the daemon-cli module
vi.mock("./daemon-cli.js", () => ({
  runDaemonRestart: vi.fn(),
}));

// Mock the runtime
vi.mock("../runtime.js", () => ({
  defaultRuntime: {
    log: vi.fn(),
    error: vi.fn(),
    exit: vi.fn(),
  },
}));

const { runGatewayUpdate } = await import("../infra/update-runner.js");
const { resolveOpenClawPackageRoot } = await import("../infra/openclaw-root.js");
const { readConfigFileSnapshot, writeConfigFile } = await import("../config/config.js");
const { checkUpdateStatus, fetchNpmTagVersion, resolveNpmChannelTag } =
  await import("../infra/update-check.js");
const { runCommandWithTimeout } = await import("../process/exec.js");
const { runDaemonRestart } = await import("./daemon-cli.js");
const { doctorCommand } = await import("../commands/doctor.js");
const { defaultRuntime } = await import("../runtime.js");
const { updateCommand, registerUpdateCli, updateStatusCommand, updateWizardCommand } =
  await import("./update-cli.js");

describe("update-cli", () => {
  let fixtureRoot = "";
  let fixtureCount = 0;

  const createCaseDir = async (prefix: string) => {
    const dir = path.join(fixtureRoot, `${prefix}-${fixtureCount++}`);
    // Tests only need a stable path; the directory does not have to exist because all I/O is mocked.
    return dir;
  };

  beforeAll(async () => {
    fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-update-tests-"));
  });

  afterAll(async () => {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  });

  const baseConfig = {} as OpenClawConfig;
  const baseSnapshot: ConfigFileSnapshot = {
    path: "/tmp/openclaw-config.json",
    exists: true,
    raw: "{}",
    parsed: {},
    resolved: baseConfig,
    valid: true,
    config: baseConfig,
    issues: [],
    warnings: [],
    legacyIssues: [],
  };

  const setTty = (value: boolean | undefined) => {
    Object.defineProperty(process.stdin, "isTTY", {
      value,
      configurable: true,
    });
  };

  const setStdoutTty = (value: boolean | undefined) => {
    Object.defineProperty(process.stdout, "isTTY", {
      value,
      configurable: true,
    });
  };

  const mockPackageInstallStatus = (root: string) => {
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(root);
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root,
      installKind: "package",
      packageManager: "npm",
      deps: {
        manager: "npm",
        status: "ok",
        lockfilePath: null,
        markerPath: null,
      },
    });
  };

  const expectUpdateCallChannel = (channel: string) => {
    const call = vi.mocked(runGatewayUpdate).mock.calls[0]?.[0];
    expect(call?.channel).toBe(channel);
    return call;
  };

  const setupNonInteractiveDowngrade = async () => {
    const tempDir = await createCaseDir("openclaw-update");
    setTty(false);
    readPackageVersion.mockResolvedValue("2.0.0");

    mockPackageInstallStatus(tempDir);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "0.0.1",
    });
    vi.mocked(runGatewayUpdate).mockResolvedValue({
      status: "ok",
      mode: "npm",
      steps: [],
      durationMs: 100,
    });
    vi.mocked(defaultRuntime.error).mockClear();
    vi.mocked(defaultRuntime.exit).mockClear();

    return tempDir;
  };

  beforeEach(() => {
<<<<<<< HEAD
    vi.clearAllMocks();
<<<<<<< HEAD
    const { resolveMoltbotPackageRoot } = await import("../infra/moltbot-root.js");
    const { readConfigFileSnapshot } = await import("../config/config.js");
    const { checkUpdateStatus, fetchNpmTagVersion, resolveNpmChannelTag } =
      await import("../infra/update-check.js");
    const { runCommandWithTimeout } = await import("../process/exec.js");
    vi.mocked(resolveMoltbotPackageRoot).mockResolvedValue(process.cwd());
=======
=======
    confirm.mockReset();
    select.mockReset();
    vi.mocked(runGatewayUpdate).mockReset();
    vi.mocked(resolveOpenClawPackageRoot).mockReset();
    vi.mocked(readConfigFileSnapshot).mockReset();
    vi.mocked(writeConfigFile).mockReset();
    vi.mocked(checkUpdateStatus).mockReset();
    vi.mocked(fetchNpmTagVersion).mockReset();
    vi.mocked(resolveNpmChannelTag).mockReset();
    vi.mocked(runCommandWithTimeout).mockReset();
    vi.mocked(runDaemonRestart).mockReset();
    vi.mocked(doctorCommand).mockReset();
    vi.mocked(defaultRuntime.log).mockReset();
    vi.mocked(defaultRuntime.error).mockReset();
    vi.mocked(defaultRuntime.exit).mockReset();
    readPackageName.mockReset();
    readPackageVersion.mockReset();
    resolveGlobalManager.mockReset();
<<<<<<< HEAD
>>>>>>> 76e4e9d17 (perf(test): reduce skills + update + memory suite overhead)
=======
    serviceLoaded.mockReset();
    prepareRestartScript.mockReset();
    runRestartScript.mockReset();
>>>>>>> 0a188ee49 (test(ci): stabilize update and discord process tests)
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(process.cwd());
>>>>>>> 2086cdfb9 (perf(test): reduce hot-suite import and setup overhead)
    vi.mocked(readConfigFileSnapshot).mockResolvedValue(baseSnapshot);
    vi.mocked(fetchNpmTagVersion).mockResolvedValue({
      tag: "latest",
      version: "9999.0.0",
    });
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "9999.0.0",
    });
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/test/path",
      installKind: "git",
      packageManager: "pnpm",
      git: {
        root: "/test/path",
        sha: "abcdef1234567890",
        tag: "v1.2.3",
        branch: "main",
        upstream: "origin/main",
        dirty: false,
        ahead: 0,
        behind: 0,
        fetchOk: true,
      },
      deps: {
        manager: "pnpm",
        status: "ok",
        lockfilePath: "/test/path/pnpm-lock.yaml",
        markerPath: "/test/path/node_modules",
      },
      registry: {
        latestVersion: "1.2.3",
      },
    });
    vi.mocked(runCommandWithTimeout).mockResolvedValue({
      stdout: "",
      stderr: "",
      code: 0,
      signal: null,
      killed: false,
      termination: "exit",
    });
    readPackageName.mockResolvedValue("openclaw");
    readPackageVersion.mockResolvedValue("1.0.0");
    resolveGlobalManager.mockResolvedValue("npm");
    serviceLoaded.mockResolvedValue(false);
    prepareRestartScript.mockResolvedValue("/tmp/openclaw-restart-test.sh");
    runRestartScript.mockResolvedValue(undefined);
    setTty(false);
    setStdoutTty(false);
  });

  it("exports updateCommand and registerUpdateCli", async () => {
    expect(typeof updateCommand).toBe("function");
    expect(typeof registerUpdateCli).toBe("function");
    expect(typeof updateWizardCommand).toBe("function");
  }, 20_000);

  it("updateCommand runs update and outputs result", async () => {
    const mockResult: UpdateRunResult = {
      status: "ok",
      mode: "git",
      root: "/test/path",
      before: { sha: "abc123", version: "1.0.0" },
      after: { sha: "def456", version: "1.0.1" },
      steps: [
        {
          name: "git fetch",
          command: "git fetch",
          cwd: "/test/path",
          durationMs: 100,
          exitCode: 0,
        },
      ],
      durationMs: 500,
    };

    vi.mocked(runGatewayUpdate).mockResolvedValue(mockResult);

    await updateCommand({ json: false });

    expect(runGatewayUpdate).toHaveBeenCalled();
    expect(defaultRuntime.log).toHaveBeenCalled();
  });

  it("updateStatusCommand prints table output", async () => {
    await updateStatusCommand({ json: false });

    const logs = vi.mocked(defaultRuntime.log).mock.calls.map((call) => call[0]);
    expect(logs.join("\n")).toContain("Moltbot update status");
  });

  it("updateStatusCommand emits JSON", async () => {
    await updateStatusCommand({ json: true });

    const last = vi.mocked(defaultRuntime.log).mock.calls.at(-1)?.[0];
    expect(typeof last).toBe("string");
    const parsed = JSON.parse(String(last));
    expect(parsed.channel.value).toBe("stable");
  });

  it("defaults to dev channel for git installs when unset", async () => {
    vi.mocked(runGatewayUpdate).mockResolvedValue({
      status: "ok",
      mode: "git",
      steps: [],
      durationMs: 100,
    });

    await updateCommand({});

    expectUpdateCallChannel("dev");
  });

  it("defaults to stable channel for package installs when unset", async () => {
<<<<<<< HEAD
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-update-"));
    try {
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "moltbot", version: "1.0.0" }),
        "utf-8",
      );

<<<<<<< HEAD
      const { resolveMoltbotPackageRoot } = await import("../infra/moltbot-root.js");
      const { runGatewayUpdate } = await import("../infra/update-runner.js");
      const { checkUpdateStatus } = await import("../infra/update-check.js");
      const { updateCommand } = await import("./update-cli.js");

      vi.mocked(resolveMoltbotPackageRoot).mockResolvedValue(tempDir);
=======
      vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
>>>>>>> 2086cdfb9 (perf(test): reduce hot-suite import and setup overhead)
      vi.mocked(checkUpdateStatus).mockResolvedValue({
        root: tempDir,
        installKind: "package",
        packageManager: "npm",
        deps: {
          manager: "npm",
          status: "ok",
          lockfilePath: null,
          markerPath: null,
        },
      });
      vi.mocked(runGatewayUpdate).mockResolvedValue({
=======
    const tempDir = await createCaseDir("openclaw-update");

<<<<<<< HEAD
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: tempDir,
      installKind: "package",
      packageManager: "npm",
      deps: {
        manager: "npm",
>>>>>>> caebe70e9 (perf(test): cut setup/import overhead in hot suites)
        status: "ok",
        lockfilePath: null,
        markerPath: null,
      },
    });
=======
    mockPackageInstallStatus(tempDir);
>>>>>>> 4750be9d5 (test(cli): extract update-cli package-install test helpers)
    vi.mocked(runGatewayUpdate).mockResolvedValue({
      status: "ok",
      mode: "npm",
      steps: [],
      durationMs: 100,
    });

    await updateCommand({ yes: true });

    const call = expectUpdateCallChannel("stable");
    expect(call?.tag).toBe("latest");
  });

  it("uses stored beta channel when configured", async () => {
    vi.mocked(readConfigFileSnapshot).mockResolvedValue({
      ...baseSnapshot,
      config: { update: { channel: "beta" } } as OpenClawConfig,
    });
    vi.mocked(runGatewayUpdate).mockResolvedValue({
      status: "ok",
      mode: "git",
      steps: [],
      durationMs: 100,
    });

    await updateCommand({});

    expectUpdateCallChannel("beta");
  });

  it("falls back to latest when beta tag is older than release", async () => {
<<<<<<< HEAD
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-update-"));
    try {
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "moltbot", version: "1.0.0" }),
        "utf-8",
      );

<<<<<<< HEAD
      const { resolveMoltbotPackageRoot } = await import("../infra/moltbot-root.js");
      const { readConfigFileSnapshot } = await import("../config/config.js");
      const { resolveNpmChannelTag } = await import("../infra/update-check.js");
      const { runGatewayUpdate } = await import("../infra/update-runner.js");
      const { updateCommand } = await import("./update-cli.js");
      const { checkUpdateStatus } = await import("../infra/update-check.js");

      vi.mocked(resolveMoltbotPackageRoot).mockResolvedValue(tempDir);
=======
      vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
>>>>>>> 2086cdfb9 (perf(test): reduce hot-suite import and setup overhead)
      vi.mocked(readConfigFileSnapshot).mockResolvedValue({
        ...baseSnapshot,
        config: { update: { channel: "beta" } },
      });
      vi.mocked(checkUpdateStatus).mockResolvedValue({
        root: tempDir,
        installKind: "package",
        packageManager: "npm",
        deps: {
          manager: "npm",
          status: "ok",
          lockfilePath: null,
          markerPath: null,
        },
      });
      vi.mocked(resolveNpmChannelTag).mockResolvedValue({
        tag: "latest",
        version: "1.2.3-1",
      });
      vi.mocked(runGatewayUpdate).mockResolvedValue({
=======
    const tempDir = await createCaseDir("openclaw-update");

    mockPackageInstallStatus(tempDir);
    vi.mocked(readConfigFileSnapshot).mockResolvedValue({
      ...baseSnapshot,
      config: { update: { channel: "beta" } } as OpenClawConfig,
    });
<<<<<<< HEAD
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: tempDir,
      installKind: "package",
      packageManager: "npm",
      deps: {
        manager: "npm",
>>>>>>> caebe70e9 (perf(test): cut setup/import overhead in hot suites)
        status: "ok",
        lockfilePath: null,
        markerPath: null,
      },
    });
=======
>>>>>>> 4750be9d5 (test(cli): extract update-cli package-install test helpers)
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "1.2.3-1",
    });
    vi.mocked(runGatewayUpdate).mockResolvedValue({
      status: "ok",
      mode: "npm",
      steps: [],
      durationMs: 100,
    });

    await updateCommand({});

    const call = expectUpdateCallChannel("beta");
    expect(call?.tag).toBe("latest");
  });

  it("honors --tag override", async () => {
<<<<<<< HEAD
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-update-"));
    try {
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "moltbot", version: "1.0.0" }),
        "utf-8",
      );

<<<<<<< HEAD
      const { resolveMoltbotPackageRoot } = await import("../infra/moltbot-root.js");
      const { runGatewayUpdate } = await import("../infra/update-runner.js");
      const { updateCommand } = await import("./update-cli.js");

      vi.mocked(resolveMoltbotPackageRoot).mockResolvedValue(tempDir);
=======
      vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
>>>>>>> 2086cdfb9 (perf(test): reduce hot-suite import and setup overhead)
      vi.mocked(runGatewayUpdate).mockResolvedValue({
        status: "ok",
        mode: "npm",
        steps: [],
        durationMs: 100,
      });
=======
    const tempDir = await createCaseDir("openclaw-update");

    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
    vi.mocked(runGatewayUpdate).mockResolvedValue({
      status: "ok",
      mode: "npm",
      steps: [],
      durationMs: 100,
    });
>>>>>>> caebe70e9 (perf(test): cut setup/import overhead in hot suites)

    await updateCommand({ tag: "next" });

    const call = vi.mocked(runGatewayUpdate).mock.calls[0]?.[0];
    expect(call?.tag).toBe("next");
  });

  it("updateCommand outputs JSON when --json is set", async () => {
    const mockResult: UpdateRunResult = {
      status: "ok",
      mode: "git",
      steps: [],
      durationMs: 100,
    };

    vi.mocked(runGatewayUpdate).mockResolvedValue(mockResult);
    vi.mocked(defaultRuntime.log).mockClear();

    await updateCommand({ json: true });

    const logCalls = vi.mocked(defaultRuntime.log).mock.calls;
    const jsonOutput = logCalls.find((call) => {
      try {
        JSON.parse(call[0] as string);
        return true;
      } catch {
        return false;
      }
    });
    expect(jsonOutput).toBeDefined();
  });

  it("updateCommand exits with error on failure", async () => {
    const mockResult: UpdateRunResult = {
      status: "error",
      mode: "git",
      reason: "rebase-failed",
      steps: [],
      durationMs: 100,
    };

    vi.mocked(runGatewayUpdate).mockResolvedValue(mockResult);
    vi.mocked(defaultRuntime.exit).mockClear();

    await updateCommand({});

    expect(defaultRuntime.exit).toHaveBeenCalledWith(1);
  });

  it("updateCommand restarts daemon by default", async () => {
    const mockResult: UpdateRunResult = {
      status: "ok",
      mode: "git",
      steps: [],
      durationMs: 100,
    };

    vi.mocked(runGatewayUpdate).mockResolvedValue(mockResult);
    vi.mocked(runDaemonRestart).mockResolvedValue(true);

    await updateCommand({});

    expect(runDaemonRestart).toHaveBeenCalled();
  });

  it("updateCommand continues after doctor sub-step and clears update flag", async () => {
    const mockResult: UpdateRunResult = {
      status: "ok",
      mode: "git",
      steps: [],
      durationMs: 100,
    };

    const envSnapshot = captureEnv(["OPENCLAW_UPDATE_IN_PROGRESS"]);
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      delete process.env.OPENCLAW_UPDATE_IN_PROGRESS;
      vi.mocked(runGatewayUpdate).mockResolvedValue(mockResult);
      vi.mocked(runDaemonRestart).mockResolvedValue(true);
      vi.mocked(doctorCommand).mockResolvedValue(undefined);
      vi.mocked(defaultRuntime.log).mockClear();

      await updateCommand({});

      expect(doctorCommand).toHaveBeenCalledWith(
        defaultRuntime,
        expect.objectContaining({ nonInteractive: true }),
      );
      expect(process.env.OPENCLAW_UPDATE_IN_PROGRESS).toBeUndefined();

      const logLines = vi.mocked(defaultRuntime.log).mock.calls.map((call) => String(call[0]));
      expect(
        logLines.some((line) => line.includes("Leveled up! New skills unlocked. You're welcome.")),
      ).toBe(true);
    } finally {
      randomSpy.mockRestore();
      envSnapshot.restore();
    }
  });

  it("updateCommand skips restart when --no-restart is set", async () => {
    const mockResult: UpdateRunResult = {
      status: "ok",
      mode: "git",
      steps: [],
      durationMs: 100,
    };

    vi.mocked(runGatewayUpdate).mockResolvedValue(mockResult);

    await updateCommand({ restart: false });

    expect(runDaemonRestart).not.toHaveBeenCalled();
  });

  it("updateCommand skips success message when restart does not run", async () => {
    const mockResult: UpdateRunResult = {
      status: "ok",
      mode: "git",
      steps: [],
      durationMs: 100,
    };

    vi.mocked(runGatewayUpdate).mockResolvedValue(mockResult);
    vi.mocked(runDaemonRestart).mockResolvedValue(false);
    vi.mocked(defaultRuntime.log).mockClear();

    await updateCommand({ restart: true });

    const logLines = vi.mocked(defaultRuntime.log).mock.calls.map((call) => String(call[0]));
    expect(logLines.some((line) => line.includes("Daemon restarted successfully."))).toBe(false);
  });

  it("updateCommand validates timeout option", async () => {
    vi.mocked(defaultRuntime.error).mockClear();
    vi.mocked(defaultRuntime.exit).mockClear();

    await updateCommand({ timeout: "invalid" });

    expect(defaultRuntime.error).toHaveBeenCalledWith(expect.stringContaining("timeout"));
    expect(defaultRuntime.exit).toHaveBeenCalledWith(1);
  });

  it("persists update channel when --channel is set", async () => {
    const mockResult: UpdateRunResult = {
      status: "ok",
      mode: "git",
      steps: [],
      durationMs: 100,
    };

    vi.mocked(runGatewayUpdate).mockResolvedValue(mockResult);

    await updateCommand({ channel: "beta" });

    expect(writeConfigFile).toHaveBeenCalled();
    const call = vi.mocked(writeConfigFile).mock.calls[0]?.[0] as {
      update?: { channel?: string };
    };
    expect(call?.update?.channel).toBe("beta");
  });

  it("requires confirmation on downgrade when non-interactive", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-update-"));
    try {
      setTty(false);
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "moltbot", version: "2.0.0" }),
        "utf-8",
      );

<<<<<<< HEAD
      const { resolveMoltbotPackageRoot } = await import("../infra/moltbot-root.js");
      const { resolveNpmChannelTag } = await import("../infra/update-check.js");
      const { runGatewayUpdate } = await import("../infra/update-runner.js");
      const { defaultRuntime } = await import("../runtime.js");
      const { updateCommand } = await import("./update-cli.js");
      const { checkUpdateStatus } = await import("../infra/update-check.js");

      vi.mocked(resolveMoltbotPackageRoot).mockResolvedValue(tempDir);
=======
      vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
>>>>>>> 2086cdfb9 (perf(test): reduce hot-suite import and setup overhead)
      vi.mocked(checkUpdateStatus).mockResolvedValue({
        root: tempDir,
        installKind: "package",
        packageManager: "npm",
        deps: {
          manager: "npm",
          status: "ok",
          lockfilePath: null,
          markerPath: null,
        },
      });
      vi.mocked(resolveNpmChannelTag).mockResolvedValue({
        tag: "latest",
        version: "0.0.1",
      });
      vi.mocked(runGatewayUpdate).mockResolvedValue({
=======
    const tempDir = await createCaseDir("openclaw-update");
    setTty(false);
    readPackageVersion.mockResolvedValue("2.0.0");

    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: tempDir,
      installKind: "package",
      packageManager: "npm",
      deps: {
        manager: "npm",
>>>>>>> caebe70e9 (perf(test): cut setup/import overhead in hot suites)
        status: "ok",
        lockfilePath: null,
        markerPath: null,
      },
    });
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "0.0.1",
    });
    vi.mocked(runGatewayUpdate).mockResolvedValue({
      status: "ok",
      mode: "npm",
      steps: [],
      durationMs: 100,
    });
    vi.mocked(defaultRuntime.error).mockClear();
    vi.mocked(defaultRuntime.exit).mockClear();
=======
    await setupNonInteractiveDowngrade();
>>>>>>> 7b3e5ce0d (refactor(test): dedupe update-cli downgrade setup)

    await updateCommand({});

    expect(defaultRuntime.error).toHaveBeenCalledWith(
      expect.stringContaining("Downgrade confirmation required."),
    );
    expect(defaultRuntime.exit).toHaveBeenCalledWith(1);
  });

  it("allows downgrade with --yes in non-interactive mode", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-update-"));
    try {
      setTty(false);
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "moltbot", version: "2.0.0" }),
        "utf-8",
      );

<<<<<<< HEAD
      const { resolveMoltbotPackageRoot } = await import("../infra/moltbot-root.js");
      const { resolveNpmChannelTag } = await import("../infra/update-check.js");
      const { runGatewayUpdate } = await import("../infra/update-runner.js");
      const { defaultRuntime } = await import("../runtime.js");
      const { updateCommand } = await import("./update-cli.js");
      const { checkUpdateStatus } = await import("../infra/update-check.js");

      vi.mocked(resolveMoltbotPackageRoot).mockResolvedValue(tempDir);
=======
      vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
>>>>>>> 2086cdfb9 (perf(test): reduce hot-suite import and setup overhead)
      vi.mocked(checkUpdateStatus).mockResolvedValue({
        root: tempDir,
        installKind: "package",
        packageManager: "npm",
        deps: {
          manager: "npm",
          status: "ok",
          lockfilePath: null,
          markerPath: null,
        },
      });
      vi.mocked(resolveNpmChannelTag).mockResolvedValue({
        tag: "latest",
        version: "0.0.1",
      });
      vi.mocked(runGatewayUpdate).mockResolvedValue({
=======
    const tempDir = await createCaseDir("openclaw-update");
    setTty(false);
    readPackageVersion.mockResolvedValue("2.0.0");

    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: tempDir,
      installKind: "package",
      packageManager: "npm",
      deps: {
        manager: "npm",
>>>>>>> caebe70e9 (perf(test): cut setup/import overhead in hot suites)
        status: "ok",
        lockfilePath: null,
        markerPath: null,
      },
    });
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "0.0.1",
    });
    vi.mocked(runGatewayUpdate).mockResolvedValue({
      status: "ok",
      mode: "npm",
      steps: [],
      durationMs: 100,
    });
    vi.mocked(defaultRuntime.error).mockClear();
    vi.mocked(defaultRuntime.exit).mockClear();
=======
    await setupNonInteractiveDowngrade();
>>>>>>> 7b3e5ce0d (refactor(test): dedupe update-cli downgrade setup)

    await updateCommand({ yes: true });

    expect(defaultRuntime.error).not.toHaveBeenCalledWith(
      expect.stringContaining("Downgrade confirmation required."),
    );
    expect(runGatewayUpdate).toHaveBeenCalled();
  });

  it("updateWizardCommand requires a TTY", async () => {
    setTty(false);
    vi.mocked(defaultRuntime.error).mockClear();
    vi.mocked(defaultRuntime.exit).mockClear();

    await updateWizardCommand({});

    expect(defaultRuntime.error).toHaveBeenCalledWith(
      expect.stringContaining("Update wizard requires a TTY"),
    );
    expect(defaultRuntime.exit).toHaveBeenCalledWith(1);
  });

  it("updateWizardCommand offers dev checkout and forwards selections", async () => {
<<<<<<< HEAD
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-update-wizard-"));
    const previousGitDir = process.env.CLAWDBOT_GIT_DIR;
=======
    const tempDir = await createCaseDir("openclaw-update-wizard");
<<<<<<< HEAD
    const previousGitDir = process.env.OPENCLAW_GIT_DIR;
>>>>>>> caebe70e9 (perf(test): cut setup/import overhead in hot suites)
=======
    const envSnapshot = captureEnv(["OPENCLAW_GIT_DIR"]);
>>>>>>> be4a490c2 (refactor(test): fix update-cli env restore)
    try {
      setTty(true);
      process.env.CLAWDBOT_GIT_DIR = tempDir;

      vi.mocked(checkUpdateStatus).mockResolvedValue({
        root: "/test/path",
        installKind: "package",
        packageManager: "npm",
        deps: {
          manager: "npm",
          status: "ok",
          lockfilePath: null,
          markerPath: null,
        },
      });
      select.mockResolvedValue("dev");
      confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      vi.mocked(runGatewayUpdate).mockResolvedValue({
        status: "ok",
        mode: "git",
        steps: [],
        durationMs: 100,
      });

      await updateWizardCommand({});

      const call = vi.mocked(runGatewayUpdate).mock.calls[0]?.[0];
      expect(call?.channel).toBe("dev");
    } finally {
<<<<<<< HEAD
<<<<<<< HEAD
      process.env.CLAWDBOT_GIT_DIR = previousGitDir;
      await fs.rm(tempDir, { recursive: true, force: true });
=======
      process.env.OPENCLAW_GIT_DIR = previousGitDir;
>>>>>>> caebe70e9 (perf(test): cut setup/import overhead in hot suites)
=======
      envSnapshot.restore();
>>>>>>> be4a490c2 (refactor(test): fix update-cli env restore)
    }
  });
});
