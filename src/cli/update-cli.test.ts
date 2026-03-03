import path from "node:path";
<<<<<<< HEAD
import { beforeEach, describe, expect, it, vi } from "vitest";

=======
=======
import { beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)
import type { OpenClawConfig, ConfigFileSnapshot } from "../config/types.openclaw.js";
>>>>>>> 048e29ea3 (chore: Fix types in tests 45/N.)
import type { UpdateRunResult } from "../infra/update-runner.js";
import { withEnvAsync } from "../test-utils/env.js";

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
const mockedRunDaemonInstall = vi.fn();

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

vi.mock("../infra/openclaw-root.js", () => ({
  resolveOpenClawPackageRoot: vi.fn(),
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
  runDaemonInstall: mockedRunDaemonInstall,
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
const { runDaemonRestart, runDaemonInstall } = await import("./daemon-cli.js");
const { doctorCommand } = await import("../commands/doctor.js");
const { defaultRuntime } = await import("../runtime.js");
const { updateCommand, registerUpdateCli, updateStatusCommand, updateWizardCommand } =
  await import("./update-cli.js");

describe("update-cli", () => {
  const fixtureRoot = "/tmp/openclaw-update-tests";
  let fixtureCount = 0;

  const createCaseDir = (prefix: string) => {
    const dir = path.join(fixtureRoot, `${prefix}-${fixtureCount++}`);
    // Tests only need a stable path; the directory does not have to exist because all I/O is mocked.
    return dir;
  };

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

  const makeOkUpdateResult = (overrides: Partial<UpdateRunResult> = {}): UpdateRunResult =>
    ({
      status: "ok",
      mode: "git",
      steps: [],
      durationMs: 100,
      ...overrides,
    }) as UpdateRunResult;

  const runRestartFallbackScenario = async (params: { daemonInstall: "ok" | "fail" }) => {
    vi.mocked(runGatewayUpdate).mockResolvedValue(makeOkUpdateResult());
    if (params.daemonInstall === "fail") {
      vi.mocked(runDaemonInstall).mockRejectedValueOnce(new Error("refresh failed"));
    } else {
      vi.mocked(runDaemonInstall).mockResolvedValue(undefined);
    }
    prepareRestartScript.mockResolvedValue(null);
    serviceLoaded.mockResolvedValue(true);
    vi.mocked(runDaemonRestart).mockResolvedValue(true);

    await updateCommand({});

    expect(runDaemonInstall).toHaveBeenCalledWith({
      force: true,
      json: undefined,
    });
    expect(runDaemonRestart).toHaveBeenCalled();
  };

  const setupNonInteractiveDowngrade = async () => {
    const tempDir = createCaseDir("openclaw-update");
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
    const { resolveOpenClawPackageRoot } = await import("../infra/openclaw-root.js");
    const { readConfigFileSnapshot } = await import("../config/config.js");
    const { checkUpdateStatus, fetchNpmTagVersion, resolveNpmChannelTag } =
      await import("../infra/update-check.js");
    const { runCommandWithTimeout } = await import("../process/exec.js");
    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(process.cwd());
    vi.mocked(resolveOpenClawPackageRoot).mockClear();
    vi.mocked(readConfigFileSnapshot).mockClear();
    vi.mocked(writeConfigFile).mockClear();
    vi.mocked(checkUpdateStatus).mockClear();
    vi.mocked(fetchNpmTagVersion).mockClear();
    vi.mocked(resolveNpmChannelTag).mockClear();
    vi.mocked(runCommandWithTimeout).mockClear();
    vi.mocked(runDaemonRestart).mockClear();
    vi.mocked(mockedRunDaemonInstall).mockClear();
    vi.mocked(doctorCommand).mockReset();
<<<<<<< HEAD
    vi.mocked(defaultRuntime.log).mockReset();
    vi.mocked(defaultRuntime.error).mockReset();
    vi.mocked(defaultRuntime.exit).mockReset();
    readPackageName.mockReset();
    readPackageVersion.mockReset();
    resolveGlobalManager.mockReset();
<<<<<<< HEAD
>>>>>>> 76e4e9d17 (perf(test): reduce skills + update + memory suite overhead)
=======
=======
    vi.mocked(doctorCommand).mockClear();
>>>>>>> e36f857e4 (test(cli): seed restart and doctor defaults with lightweight clears)
    vi.mocked(defaultRuntime.log).mockClear();
    vi.mocked(defaultRuntime.error).mockClear();
    vi.mocked(defaultRuntime.exit).mockClear();
    readPackageName.mockClear();
    readPackageVersion.mockClear();
    resolveGlobalManager.mockClear();
    serviceLoaded.mockClear();
    serviceReadRuntime.mockClear();
    prepareRestartScript.mockClear();
    runRestartScript.mockClear();
    inspectPortUsage.mockClear();
    classifyPortListener.mockClear();
    formatPortDiagnostics.mockClear();
>>>>>>> 67aef3118 (test(cli): replace setup mock resets with clears in update suite)
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
    vi.mocked(runDaemonInstall).mockResolvedValue(undefined);
    vi.mocked(runDaemonRestart).mockResolvedValue(true);
    vi.mocked(doctorCommand).mockResolvedValue(undefined);
    confirm.mockResolvedValue(false);
    select.mockResolvedValue("stable");
    vi.mocked(runGatewayUpdate).mockResolvedValue(makeOkUpdateResult());
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

  it("updateCommand --dry-run previews without mutating", async () => {
    vi.mocked(defaultRuntime.log).mockClear();
    serviceLoaded.mockResolvedValue(true);

    await updateCommand({ dryRun: true, channel: "beta" });

    expect(writeConfigFile).not.toHaveBeenCalled();
    expect(runGatewayUpdate).not.toHaveBeenCalled();
    expect(runDaemonInstall).not.toHaveBeenCalled();
    expect(runRestartScript).not.toHaveBeenCalled();
    expect(runDaemonRestart).not.toHaveBeenCalled();

    const logs = vi.mocked(defaultRuntime.log).mock.calls.map((call) => String(call[0]));
    expect(logs.join("\n")).toContain("Update dry-run");
    expect(logs.join("\n")).toContain("No changes were applied.");
  });

  it("updateStatusCommand prints table output", async () => {
    await updateStatusCommand({ json: false });

    const logs = vi.mocked(defaultRuntime.log).mock.calls.map((call) => call[0]);
    expect(logs.join("\n")).toContain("OpenClaw update status");
  });

  it("updateStatusCommand emits JSON", async () => {
    await updateStatusCommand({ json: true });

    const last = vi.mocked(defaultRuntime.log).mock.calls.at(-1)?.[0];
    expect(typeof last).toBe("string");
    const parsed = JSON.parse(String(last));
    expect(parsed.channel.value).toBe("stable");
  });

  it.each([
    {
      name: "defaults to dev channel for git installs when unset",
      mode: "git" as const,
      options: {},
      prepare: async () => {},
      expectedChannel: "dev" as const,
      expectedTag: undefined as string | undefined,
    },
    {
      name: "defaults to stable channel for package installs when unset",
      mode: "npm" as const,
      options: { yes: true },
      prepare: async () => {
        const tempDir = createCaseDir("openclaw-update");
        mockPackageInstallStatus(tempDir);
      },
      expectedChannel: "stable" as const,
      expectedTag: "latest",
    },
    {
      name: "uses stored beta channel when configured",
      mode: "git" as const,
      options: {},
      prepare: async () => {
        vi.mocked(readConfigFileSnapshot).mockResolvedValue({
          ...baseSnapshot,
          config: { update: { channel: "beta" } } as OpenClawConfig,
        });
      },
      expectedChannel: "beta" as const,
      expectedTag: undefined as string | undefined,
    },
  ])("$name", async ({ mode, options, prepare, expectedChannel, expectedTag }) => {
    await prepare();
    vi.mocked(runGatewayUpdate).mockResolvedValue(makeOkUpdateResult({ mode }));

    await updateCommand(options);

    expectUpdateCallChannel("dev");
  });

  it("defaults to stable channel for package installs when unset", async () => {
<<<<<<< HEAD
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-update-"));
    try {
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "openclaw", version: "1.0.0" }),
        "utf-8",
      );

<<<<<<< HEAD
      const { resolveOpenClawPackageRoot } = await import("../infra/openclaw-root.js");
      const { runGatewayUpdate } = await import("../infra/update-runner.js");
      const { checkUpdateStatus } = await import("../infra/update-check.js");
      const { updateCommand } = await import("./update-cli.js");

      vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
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
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-update-"));
    try {
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "openclaw", version: "1.0.0" }),
        "utf-8",
      );

<<<<<<< HEAD
      const { resolveOpenClawPackageRoot } = await import("../infra/openclaw-root.js");
      const { readConfigFileSnapshot } = await import("../config/config.js");
      const { resolveNpmChannelTag } = await import("../infra/update-check.js");
      const { runGatewayUpdate } = await import("../infra/update-runner.js");
      const { updateCommand } = await import("./update-cli.js");
      const { checkUpdateStatus } = await import("../infra/update-check.js");

      vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
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
=======
    const call = expectUpdateCallChannel(expectedChannel);
    if (expectedTag !== undefined) {
      expect(call?.tag).toBe(expectedTag);
    }
  });

  it("falls back to latest when beta tag is older than release", async () => {
    const tempDir = createCaseDir("openclaw-update");
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)

    mockPackageInstallStatus(tempDir);
    vi.mocked(readConfigFileSnapshot).mockResolvedValue({
      ...baseSnapshot,
      config: { update: { channel: "beta" } } as OpenClawConfig,
    });
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
      version: "1.2.3-1",
    });
    vi.mocked(runGatewayUpdate).mockResolvedValue(
      makeOkUpdateResult({
        mode: "npm",
      }),
    );

    await updateCommand({});

    const call = expectUpdateCallChannel("beta");
    expect(call?.tag).toBe("latest");
  });

  it("honors --tag override", async () => {
<<<<<<< HEAD
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-update-"));
    try {
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "openclaw", version: "1.0.0" }),
        "utf-8",
      );

<<<<<<< HEAD
      const { resolveOpenClawPackageRoot } = await import("../infra/openclaw-root.js");
      const { runGatewayUpdate } = await import("../infra/update-runner.js");
      const { updateCommand } = await import("./update-cli.js");

      vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
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
=======
    const tempDir = createCaseDir("openclaw-update");

    vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
    vi.mocked(runGatewayUpdate).mockResolvedValue(
      makeOkUpdateResult({
        mode: "npm",
      }),
    );
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)

    await updateCommand({ tag: "next" });

    const call = vi.mocked(runGatewayUpdate).mock.calls[0]?.[0];
    expect(call?.tag).toBe("next");
  });

  it("updateCommand outputs JSON when --json is set", async () => {
    vi.mocked(runGatewayUpdate).mockResolvedValue(makeOkUpdateResult());
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
    vi.mocked(runGatewayUpdate).mockResolvedValue(makeOkUpdateResult());
    vi.mocked(runDaemonRestart).mockResolvedValue(true);

    await updateCommand({});

    expect(runDaemonRestart).toHaveBeenCalled();
  });

  it("updateCommand refreshes gateway service env when service is already installed", async () => {
    const mockResult: UpdateRunResult = {
      status: "ok",
      mode: "git",
      steps: [],
      durationMs: 100,
    };

    vi.mocked(runGatewayUpdate).mockResolvedValue(mockResult);
    vi.mocked(runDaemonInstall).mockResolvedValue(undefined);
    serviceLoaded.mockResolvedValue(true);

    await updateCommand({});

    expect(runDaemonInstall).toHaveBeenCalledWith({
      force: true,
      json: undefined,
    });
    expect(runRestartScript).toHaveBeenCalled();
    expect(runDaemonRestart).not.toHaveBeenCalled();
  });

  it("updateCommand falls back to restart when env refresh install fails", async () => {
    await runRestartFallbackScenario({ daemonInstall: "fail" });
  });

  it("updateCommand falls back to restart when no detached restart script is available", async () => {
    await runRestartFallbackScenario({ daemonInstall: "ok" });
  });

  it("updateCommand does not refresh service env when --no-restart is set", async () => {
    vi.mocked(runGatewayUpdate).mockResolvedValue(makeOkUpdateResult());
    serviceLoaded.mockResolvedValue(true);

    await updateCommand({ restart: false });

    expect(runDaemonInstall).not.toHaveBeenCalled();
    expect(runRestartScript).not.toHaveBeenCalled();
    expect(runDaemonRestart).not.toHaveBeenCalled();
  });

  it("updateCommand continues after doctor sub-step and clears update flag", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      await withEnvAsync({ OPENCLAW_UPDATE_IN_PROGRESS: undefined }, async () => {
        vi.mocked(runGatewayUpdate).mockResolvedValue(makeOkUpdateResult());
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
          logLines.some((line) =>
            line.includes("Leveled up! New skills unlocked. You're welcome."),
          ),
        ).toBe(true);
      });
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("updateCommand skips restart when --no-restart is set", async () => {
    vi.mocked(runGatewayUpdate).mockResolvedValue(makeOkUpdateResult());

    await updateCommand({ restart: false });

    expect(runDaemonRestart).not.toHaveBeenCalled();
  });

  it("updateCommand skips success message when restart does not run", async () => {
    vi.mocked(runGatewayUpdate).mockResolvedValue(makeOkUpdateResult());
    vi.mocked(runDaemonRestart).mockResolvedValue(false);
    vi.mocked(defaultRuntime.log).mockClear();

    await updateCommand({ restart: true });

    const logLines = vi.mocked(defaultRuntime.log).mock.calls.map((call) => String(call[0]));
    expect(logLines.some((line) => line.includes("Daemon restarted successfully."))).toBe(false);
  });

  it.each([
    {
      name: "update command",
      run: async () => await updateCommand({ timeout: "invalid" }),
      requireTty: false,
    },
    {
      name: "update status command",
      run: async () => await updateStatusCommand({ timeout: "invalid" }),
      requireTty: false,
    },
    {
      name: "update wizard command",
      run: async () => await updateWizardCommand({ timeout: "invalid" }),
      requireTty: true,
    },
  ])("validates timeout option for $name", async ({ run, requireTty }) => {
    setTty(requireTty);
    vi.mocked(defaultRuntime.error).mockClear();
    vi.mocked(defaultRuntime.exit).mockClear();

    await run();

    expect(defaultRuntime.error).toHaveBeenCalledWith(expect.stringContaining("timeout"));
    expect(defaultRuntime.exit).toHaveBeenCalledWith(1);
  });

  it("persists update channel when --channel is set", async () => {
    vi.mocked(runGatewayUpdate).mockResolvedValue(makeOkUpdateResult());

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
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-update-"));
    try {
      setTty(false);
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "openclaw", version: "2.0.0" }),
        "utf-8",
      );

<<<<<<< HEAD
      const { resolveOpenClawPackageRoot } = await import("../infra/openclaw-root.js");
      const { resolveNpmChannelTag } = await import("../infra/update-check.js");
      const { runGatewayUpdate } = await import("../infra/update-runner.js");
      const { defaultRuntime } = await import("../runtime.js");
      const { updateCommand } = await import("./update-cli.js");
      const { checkUpdateStatus } = await import("../infra/update-check.js");

      vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
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
=======
  it.each([
    {
      name: "requires confirmation without --yes",
      options: {},
      shouldExit: true,
      shouldRunUpdate: false,
    },
    {
      name: "allows downgrade with --yes",
      options: { yes: true },
      shouldExit: false,
      shouldRunUpdate: true,
    },
  ])("$name in non-interactive mode", async ({ options, shouldExit, shouldRunUpdate }) => {
    await setupNonInteractiveDowngrade();
    await updateCommand(options);
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)

    const downgradeMessageSeen = vi
      .mocked(defaultRuntime.error)
      .mock.calls.some((call) => String(call[0]).includes("Downgrade confirmation required."));
    expect(downgradeMessageSeen).toBe(shouldExit);
    expect(vi.mocked(defaultRuntime.exit).mock.calls.some((call) => call[0] === 1)).toBe(
      shouldExit,
    );
    expect(defaultRuntime.exit).toHaveBeenCalledWith(1);
  });

  it("allows downgrade with --yes in non-interactive mode", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-update-"));
    try {
      setTty(false);
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "openclaw", version: "2.0.0" }),
        "utf-8",
      );

<<<<<<< HEAD
      const { resolveOpenClawPackageRoot } = await import("../infra/openclaw-root.js");
      const { resolveNpmChannelTag } = await import("../infra/update-check.js");
      const { runGatewayUpdate } = await import("../infra/update-runner.js");
      const { defaultRuntime } = await import("../runtime.js");
      const { updateCommand } = await import("./update-cli.js");
      const { checkUpdateStatus } = await import("../infra/update-check.js");

      vi.mocked(resolveOpenClawPackageRoot).mockResolvedValue(tempDir);
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
=======
    expect(vi.mocked(runGatewayUpdate).mock.calls.length > 0).toBe(shouldRunUpdate);
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)
  });

  it("dry-run bypasses downgrade confirmation checks in non-interactive mode", async () => {
    await setupNonInteractiveDowngrade();
    vi.mocked(defaultRuntime.exit).mockClear();

    await updateCommand({ dryRun: true });

    expect(vi.mocked(defaultRuntime.exit).mock.calls.some((call) => call[0] === 1)).toBe(false);
    expect(runGatewayUpdate).not.toHaveBeenCalled();
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
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-update-wizard-"));
    const previousGitDir = process.env.OPENCLAW_GIT_DIR;
=======
=======
    const tempDir = createCaseDir("openclaw-update-wizard");
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)
    const envSnapshot = captureEnv(["OPENCLAW_GIT_DIR"]);
>>>>>>> be4a490c2 (refactor(test): fix update-cli env restore)
    try {
      setTty(true);
      process.env.OPENCLAW_GIT_DIR = tempDir;

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
      process.env.OPENCLAW_GIT_DIR = previousGitDir;
      await fs.rm(tempDir, { recursive: true, force: true });
=======
      envSnapshot.restore();
>>>>>>> be4a490c2 (refactor(test): fix update-cli env restore)
    }
=======
    });
>>>>>>> bd9d3e2f8 (refactor(test): reuse env helper in update cli tests)
  });
});
