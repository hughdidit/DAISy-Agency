<<<<<<< HEAD
<<<<<<< HEAD
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let originalIsTTY: boolean | undefined;
let originalStateDir: string | undefined;
let originalUpdateInProgress: string | undefined;
let tempStateDir: string | undefined;

function setStdinTty(value: boolean | undefined) {
  try {
    Object.defineProperty(process.stdin, "isTTY", {
      value,
      configurable: true,
    });
  } catch {
    // ignore
  }
}

beforeEach(() => {
  confirm.mockReset().mockResolvedValue(true);
  select.mockReset().mockResolvedValue("node");
  note.mockClear();

  readConfigFileSnapshot.mockReset();
  writeConfigFile.mockReset().mockResolvedValue(undefined);
  resolveMoltbotPackageRoot.mockReset().mockResolvedValue(null);
  runGatewayUpdate.mockReset().mockResolvedValue({
    status: "skipped",
    mode: "unknown",
    steps: [],
    durationMs: 0,
  });
  legacyReadConfigFileSnapshot.mockReset().mockResolvedValue({
    path: "/tmp/moltbot.json",
    exists: false,
    raw: null,
    parsed: {},
    valid: true,
    config: {},
    issues: [],
    legacyIssues: [],
  });
  createConfigIO.mockReset().mockImplementation(() => ({
    readConfigFileSnapshot: legacyReadConfigFileSnapshot,
  }));
  runExec.mockReset().mockResolvedValue({ stdout: "", stderr: "" });
  runCommandWithTimeout.mockReset().mockResolvedValue({
    stdout: "",
    stderr: "",
    code: 0,
    signal: null,
    killed: false,
  });
  ensureAuthProfileStore.mockReset().mockReturnValue({ version: 1, profiles: {} });
  migrateLegacyConfig.mockReset().mockImplementation((raw: unknown) => ({
    config: raw as Record<string, unknown>,
    changes: ["Moved routing.allowFrom → channels.whatsapp.allowFrom."],
  }));
  findLegacyGatewayServices.mockReset().mockResolvedValue([]);
  uninstallLegacyGatewayServices.mockReset().mockResolvedValue([]);
  findExtraGatewayServices.mockReset().mockResolvedValue([]);
  renderGatewayServiceCleanupHints.mockReset().mockReturnValue(["cleanup"]);
  resolveGatewayProgramArguments.mockReset().mockResolvedValue({
    programArguments: ["node", "cli", "gateway", "--port", "18789"],
  });
  serviceInstall.mockReset().mockResolvedValue(undefined);
  serviceIsLoaded.mockReset().mockResolvedValue(false);
  serviceStop.mockReset().mockResolvedValue(undefined);
  serviceRestart.mockReset().mockResolvedValue(undefined);
  serviceUninstall.mockReset().mockResolvedValue(undefined);
  callGateway.mockReset().mockRejectedValue(new Error("gateway closed"));

  originalIsTTY = process.stdin.isTTY;
  setStdinTty(true);
  originalStateDir = process.env.CLAWDBOT_STATE_DIR;
  originalUpdateInProgress = process.env.CLAWDBOT_UPDATE_IN_PROGRESS;
  process.env.CLAWDBOT_UPDATE_IN_PROGRESS = "1";
  tempStateDir = fs.mkdtempSync(path.join(os.tmpdir(), "moltbot-doctor-state-"));
  process.env.CLAWDBOT_STATE_DIR = tempStateDir;
  fs.mkdirSync(path.join(tempStateDir, "agents", "main", "sessions"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(tempStateDir, "credentials"), { recursive: true });
});

afterEach(() => {
  setStdinTty(originalIsTTY);
  if (originalStateDir === undefined) {
    delete process.env.CLAWDBOT_STATE_DIR;
  } else {
    process.env.CLAWDBOT_STATE_DIR = originalStateDir;
  }
  if (originalUpdateInProgress === undefined) {
    delete process.env.CLAWDBOT_UPDATE_IN_PROGRESS;
  } else {
    process.env.CLAWDBOT_UPDATE_IN_PROGRESS = originalUpdateInProgress;
  }
  if (tempStateDir) {
    fs.rmSync(tempStateDir, { recursive: true, force: true });
    tempStateDir = undefined;
  }
});

const readConfigFileSnapshot = vi.fn();
const confirm = vi.fn().mockResolvedValue(true);
const select = vi.fn().mockResolvedValue("node");
const note = vi.fn();
const writeConfigFile = vi.fn().mockResolvedValue(undefined);
const resolveMoltbotPackageRoot = vi.fn().mockResolvedValue(null);
const runGatewayUpdate = vi.fn().mockResolvedValue({
  status: "skipped",
  mode: "unknown",
  steps: [],
  durationMs: 0,
});
const migrateLegacyConfig = vi.fn((raw: unknown) => ({
  config: raw as Record<string, unknown>,
  changes: ["Moved routing.allowFrom → channels.whatsapp.allowFrom."],
}));

const runExec = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
const runCommandWithTimeout = vi.fn().mockResolvedValue({
  stdout: "",
  stderr: "",
  code: 0,
  signal: null,
  killed: false,
});

const ensureAuthProfileStore = vi.fn().mockReturnValue({ version: 1, profiles: {} });

const legacyReadConfigFileSnapshot = vi.fn().mockResolvedValue({
  path: "/tmp/moltbot.json",
  exists: false,
  raw: null,
  parsed: {},
  valid: true,
  config: {},
  issues: [],
  legacyIssues: [],
});
const createConfigIO = vi.fn(() => ({
  readConfigFileSnapshot: legacyReadConfigFileSnapshot,
}));

const findLegacyGatewayServices = vi.fn().mockResolvedValue([]);
const uninstallLegacyGatewayServices = vi.fn().mockResolvedValue([]);
const findExtraGatewayServices = vi.fn().mockResolvedValue([]);
const renderGatewayServiceCleanupHints = vi.fn().mockReturnValue(["cleanup"]);
const resolveGatewayProgramArguments = vi.fn().mockResolvedValue({
  programArguments: ["node", "cli", "gateway", "--port", "18789"],
});
const serviceInstall = vi.fn().mockResolvedValue(undefined);
const serviceIsLoaded = vi.fn().mockResolvedValue(false);
const serviceStop = vi.fn().mockResolvedValue(undefined);
const serviceRestart = vi.fn().mockResolvedValue(undefined);
const serviceUninstall = vi.fn().mockResolvedValue(undefined);
const callGateway = vi.fn().mockRejectedValue(new Error("gateway closed"));

vi.mock("@clack/prompts", () => ({
  confirm,
  intro: vi.fn(),
  note,
  outro: vi.fn(),
  select,
}));

vi.mock("../agents/skills-status.js", () => ({
  buildWorkspaceSkillStatus: () => ({ skills: [] }),
}));

vi.mock("../plugins/loader.js", () => ({
  loadMoltbotPlugins: () => ({ plugins: [], diagnostics: [] }),
}));

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    CONFIG_PATH: "/tmp/moltbot.json",
    createConfigIO,
    readConfigFileSnapshot,
    writeConfigFile,
    migrateLegacyConfig,
  };
});

vi.mock("../daemon/legacy.js", () => ({
  findLegacyGatewayServices,
  uninstallLegacyGatewayServices,
}));

vi.mock("../daemon/inspect.js", () => ({
  findExtraGatewayServices,
  renderGatewayServiceCleanupHints,
}));

vi.mock("../daemon/program-args.js", () => ({
  resolveGatewayProgramArguments,
}));

vi.mock("../gateway/call.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../gateway/call.js")>();
  return {
    ...actual,
    callGateway,
  };
});

vi.mock("../process/exec.js", () => ({
  runExec,
  runCommandWithTimeout,
}));

vi.mock("../infra/moltbot-root.js", () => ({
  resolveMoltbotPackageRoot,
}));

vi.mock("../infra/update-runner.js", () => ({
=======
import { describe, expect, it, vi } from "vitest";
=======
import { describe, expect, it } from "vitest";
>>>>>>> 3a2fffefd (refactor(test): centralize doctor e2e runtime and snapshot scaffolding)
import {
  createDoctorRuntime,
  findLegacyGatewayServices,
  migrateLegacyConfig,
  mockDoctorConfigSnapshot,
  note,
  readConfigFileSnapshot,
  resolveOpenClawPackageRoot,
  runCommandWithTimeout,
>>>>>>> ae97f8f79 (refactor(test): share doctor e2e harness)
  runGatewayUpdate,
  serviceInstall,
  serviceIsLoaded,
  uninstallLegacyGatewayServices,
  writeConfigFile,
} from "./doctor.e2e-harness.js";

const DOCTOR_MIGRATION_TIMEOUT_MS = 20_000;

describe("doctor command", () => {
<<<<<<< HEAD
  it("migrates routing.allowFrom to channels.whatsapp.allowFrom", { timeout: 60_000 }, async () => {
<<<<<<< HEAD
    readConfigFileSnapshot.mockResolvedValue({
      path: "/tmp/moltbot.json",
      exists: true,
      raw: "{}",
=======
    mockDoctorConfigSnapshot({
>>>>>>> 3a2fffefd (refactor(test): centralize doctor e2e runtime and snapshot scaffolding)
      parsed: { routing: { allowFrom: ["+15555550123"] } },
      valid: false,
      issues: [{ path: "routing.allowFrom", message: "legacy" }],
      legacyIssues: [{ path: "routing.allowFrom", message: "legacy" }],
    });
=======
  it(
    "migrates routing.allowFrom to channels.whatsapp.allowFrom",
    { timeout: DOCTOR_MIGRATION_TIMEOUT_MS },
    async () => {
      mockDoctorConfigSnapshot({
        parsed: { routing: { allowFrom: ["+15555550123"] } },
        valid: false,
        issues: [{ path: "routing.allowFrom", message: "legacy" }],
        legacyIssues: [{ path: "routing.allowFrom", message: "legacy" }],
      });
>>>>>>> 8cc3a5e46 (test(doctor): tighten legacy migration e2e timeout budgets)

      const { doctorCommand } = await import("./doctor.js");
      const runtime = createDoctorRuntime();

      migrateLegacyConfig.mockReturnValue({
        config: { channels: { whatsapp: { allowFrom: ["+15555550123"] } } },
        changes: ["Moved routing.allowFrom → channels.whatsapp.allowFrom."],
      });

      await doctorCommand(runtime, { nonInteractive: true, repair: true });

      expect(writeConfigFile).toHaveBeenCalledTimes(1);
      const written = writeConfigFile.mock.calls[0]?.[0] as Record<string, unknown>;
      expect((written.channels as Record<string, unknown>)?.whatsapp).toEqual({
        allowFrom: ["+15555550123"],
      });
      expect(written.routing).toBeUndefined();
    },
  );

<<<<<<< HEAD
  it("migrates legacy gateway services", { timeout: 60_000 }, async () => {
    readConfigFileSnapshot.mockResolvedValue({
      path: "/tmp/moltbot.json",
      exists: true,
      raw: "{}",
      parsed: {},
      valid: true,
      config: {},
      issues: [],
      legacyIssues: [],
    });
<<<<<<< HEAD
=======
  it("skips legacy gateway services migration", { timeout: 60_000 }, async () => {
    mockDoctorConfigSnapshot();
>>>>>>> 3a2fffefd (refactor(test): centralize doctor e2e runtime and snapshot scaffolding)

    findLegacyGatewayServices.mockResolvedValueOnce([
      {
        platform: "darwin",
        label: "com.steipete.clawdbot.gateway",
        detail: "loaded",
      },
    ]);
    serviceIsLoaded.mockResolvedValueOnce(false);
    serviceInstall.mockClear();
=======

    const { doctorCommand } = await import("./doctor.js");
    const runtime = createDoctorRuntime();

    migrateLegacyConfig.mockReturnValue({
      config: {
        channels: { whatsapp: { allowFrom: ["+15555550123"] } },
        gateway: { remote: { token: "legacy-remote-token" } },
      },
      changes: ["Moved routing.allowFrom → channels.whatsapp.allowFrom."],
    });

    await doctorCommand(runtime, { repair: true });

    expect(writeConfigFile).toHaveBeenCalledTimes(1);
    const written = writeConfigFile.mock.calls[0]?.[0] as Record<string, unknown>;
    const gateway = (written.gateway as Record<string, unknown>) ?? {};
    const auth = gateway.auth as Record<string, unknown> | undefined;
    const remote = gateway.remote as Record<string, unknown>;

    expect(remote.token).toBe("legacy-remote-token");
    expect(auth).toBeUndefined();
  });

  it(
    "skips legacy gateway services migration",
    { timeout: DOCTOR_MIGRATION_TIMEOUT_MS },
    async () => {
      mockDoctorConfigSnapshot();

      findLegacyGatewayServices.mockResolvedValueOnce([
        {
          platform: "darwin",
          label: "com.steipete.openclaw.gateway",
          detail: "loaded",
        },
      ]);
      serviceIsLoaded.mockResolvedValueOnce(false);
      serviceInstall.mockClear();
>>>>>>> 8cc3a5e46 (test(doctor): tighten legacy migration e2e timeout budgets)

      const { doctorCommand } = await import("./doctor.js");
      await doctorCommand(createDoctorRuntime());

<<<<<<< HEAD
    expect(uninstallLegacyGatewayServices).toHaveBeenCalledTimes(1);
    expect(serviceInstall).toHaveBeenCalledTimes(1);
  });
=======
      expect(uninstallLegacyGatewayServices).not.toHaveBeenCalled();
      expect(serviceInstall).not.toHaveBeenCalled();
    },
  );
>>>>>>> 8cc3a5e46 (test(doctor): tighten legacy migration e2e timeout budgets)

  it("offers to update first for git checkouts", async () => {
    delete process.env.CLAWDBOT_UPDATE_IN_PROGRESS;

    const root = "/tmp/moltbot";
    resolveMoltbotPackageRoot.mockResolvedValueOnce(root);
    runCommandWithTimeout.mockResolvedValueOnce({
      stdout: `${root}\n`,
      stderr: "",
      code: 0,
      signal: null,
      killed: false,
    });
    runGatewayUpdate.mockResolvedValueOnce({
      status: "ok",
      mode: "git",
      root,
      steps: [],
      durationMs: 1,
    });

<<<<<<< HEAD
    readConfigFileSnapshot.mockResolvedValue({
      path: "/tmp/moltbot.json",
      exists: true,
      raw: "{}",
      parsed: {},
      valid: true,
      config: {},
      issues: [],
      legacyIssues: [],
    });
=======
    mockDoctorConfigSnapshot();
>>>>>>> 3a2fffefd (refactor(test): centralize doctor e2e runtime and snapshot scaffolding)

    const { doctorCommand } = await import("./doctor.js");
    await doctorCommand(createDoctorRuntime());

    expect(runGatewayUpdate).toHaveBeenCalledWith(expect.objectContaining({ cwd: root }));
    expect(readConfigFileSnapshot).not.toHaveBeenCalled();
    expect(
      note.mock.calls.some(([, title]) => typeof title === "string" && title === "Update result"),
    ).toBe(true);
  });
});
