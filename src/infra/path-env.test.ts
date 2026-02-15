import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD

import { describe, expect, it } from "vitest";

import { ensureMoltbotCliOnPath } from "./path-env.js";

describe("ensureMoltbotCliOnPath", () => {
  it("prepends the bundled app bin dir when a sibling moltbot exists", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-path-"));
    try {
      const appBinDir = path.join(tmp, "AppBin");
      await fs.mkdir(appBinDir, { recursive: true });
      const cliPath = path.join(appBinDir, "moltbot");
      await fs.writeFile(cliPath, "#!/bin/sh\necho ok\n", "utf-8");
      await fs.chmod(cliPath, 0o755);

      const originalPath = process.env.PATH;
      const originalFlag = process.env.CLAWDBOT_PATH_BOOTSTRAPPED;
      process.env.PATH = "/usr/bin";
      delete process.env.CLAWDBOT_PATH_BOOTSTRAPPED;
      try {
        ensureMoltbotCliOnPath({
          execPath: cliPath,
          cwd: tmp,
          homeDir: tmp,
          platform: "darwin",
        });
        const updated = process.env.PATH ?? "";
        expect(updated.split(path.delimiter)[0]).toBe(appBinDir);
      } finally {
        process.env.PATH = originalPath;
<<<<<<< HEAD
        if (originalFlag === undefined) delete process.env.CLAWDBOT_PATH_BOOTSTRAPPED;
        else process.env.CLAWDBOT_PATH_BOOTSTRAPPED = originalFlag;
=======
        if (originalFlag === undefined) {
          delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;
        } else {
          process.env.OPENCLAW_PATH_BOOTSTRAPPED = originalFlag;
        }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
      }
=======
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureOpenClawCliOnPath } from "./path-env.js";
=======
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  dirs: new Set<string>(),
  executables: new Set<string>(),
}));

const abs = (p: string) => path.resolve(p);
const setDir = (p: string) => state.dirs.add(abs(p));
const setExe = (p: string) => state.executables.add(abs(p));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const pathMod = await import("node:path");
  const absInMock = (p: string) => pathMod.resolve(p);

  const wrapped = {
    ...actual,
    constants: { ...actual.constants, X_OK: actual.constants.X_OK ?? 1 },
    accessSync: (p: string, mode?: number) => {
      // `mode` is ignored in tests; we only model "is executable" or "not".
      if (!state.executables.has(absInMock(p))) {
        throw new Error(`EACCES: permission denied, access '${p}' (mode=${mode ?? 0})`);
      }
    },
    statSync: (p: string) => ({
      // Avoid throws for non-existent paths; the code under test only cares about isDirectory().
      isDirectory: () => state.dirs.has(absInMock(p)),
    }),
  };

  return { ...wrapped, default: wrapped };
});

let ensureOpenClawCliOnPath: typeof import("./path-env.js").ensureOpenClawCliOnPath;
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)

describe("ensureOpenClawCliOnPath", () => {
  const envKeys = [
    "PATH",
    "OPENCLAW_PATH_BOOTSTRAPPED",
    "OPENCLAW_ALLOW_PROJECT_LOCAL_BIN",
    "MISE_DATA_DIR",
    "HOMEBREW_PREFIX",
    "HOMEBREW_BREW_FILE",
    "XDG_BIN_HOME",
  ] as const;
  let envSnapshot: Record<(typeof envKeys)[number], string | undefined>;

  beforeAll(async () => {
    ({ ensureOpenClawCliOnPath } = await import("./path-env.js"));
  });

  beforeEach(() => {
    envSnapshot = Object.fromEntries(envKeys.map((k) => [k, process.env[k]])) as typeof envSnapshot;
    state.dirs.clear();
    state.executables.clear();

    setDir("/usr/bin");
    setDir("/bin");
    vi.clearAllMocks();
  });

<<<<<<< HEAD
  it("prepends the bundled app bin dir when a sibling openclaw exists", async () => {
    const tmp = await makeTmpDir();
    const appBinDir = path.join(tmp, "AppBin");
    await fs.mkdir(appBinDir);
    const cliPath = path.join(appBinDir, "openclaw");
    await fs.writeFile(cliPath, "#!/bin/sh\necho ok\n", "utf-8");
    await fs.chmod(cliPath, 0o755);

    const originalPath = process.env.PATH;
    const originalFlag = process.env.OPENCLAW_PATH_BOOTSTRAPPED;
    process.env.PATH = "/usr/bin";
    delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;
    try {
      ensureOpenClawCliOnPath({
        execPath: cliPath,
        cwd: tmp,
        homeDir: tmp,
        platform: "darwin",
      });
      const updated = process.env.PATH ?? "";
      expect(updated.split(path.delimiter)[0]).toBe(appBinDir);
>>>>>>> 6bc5987d6 (perf(test): speed up path env suite)
    } finally {
      process.env.PATH = originalPath;
      if (originalFlag === undefined) {
        delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;
=======
  afterEach(() => {
    for (const k of envKeys) {
      const value = envSnapshot[k];
      if (value === undefined) {
        delete process.env[k];
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
      } else {
        process.env[k] = value;
      }
    }
  });

  it("prepends the bundled app bin dir when a sibling openclaw exists", () => {
    const tmp = abs("/tmp/openclaw-path/case-bundled");
    const appBinDir = path.join(tmp, "AppBin");
    const cliPath = path.join(appBinDir, "openclaw");
    setDir(tmp);
    setDir(appBinDir);
    setExe(cliPath);

    process.env.PATH = "/usr/bin";
    delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;

    ensureOpenClawCliOnPath({
      execPath: cliPath,
      cwd: tmp,
      homeDir: tmp,
      platform: "darwin",
    });

    const updated = process.env.PATH ?? "";
    expect(updated.split(path.delimiter)[0]).toBe(appBinDir);
  });

  it("is idempotent", () => {
<<<<<<< HEAD
    const originalPath = process.env.PATH;
    const originalFlag = process.env.CLAWDBOT_PATH_BOOTSTRAPPED;
    process.env.PATH = "/bin";
    process.env.CLAWDBOT_PATH_BOOTSTRAPPED = "1";
    try {
      ensureMoltbotCliOnPath({
        execPath: "/tmp/does-not-matter",
        cwd: "/tmp",
        homeDir: "/tmp",
        platform: "darwin",
      });
      expect(process.env.PATH).toBe("/bin");
    } finally {
      process.env.PATH = originalPath;
<<<<<<< HEAD
      if (originalFlag === undefined) delete process.env.CLAWDBOT_PATH_BOOTSTRAPPED;
      else process.env.CLAWDBOT_PATH_BOOTSTRAPPED = originalFlag;
=======
      if (originalFlag === undefined) {
        delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;
      } else {
        process.env.OPENCLAW_PATH_BOOTSTRAPPED = originalFlag;
      }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
    }
  });

  it("prepends mise shims when available", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-path-"));
=======
    const tmp = path.join(fixtureRoot, `case-${fixtureCount++}`);
>>>>>>> 6bc5987d6 (perf(test): speed up path env suite)
=======
    const tmp = await makeTmpDir();
>>>>>>> b229a3de0 (perf(test): reduce mkdir churn in path env suite)
    const originalPath = process.env.PATH;
    const originalFlag = process.env.CLAWDBOT_PATH_BOOTSTRAPPED;
    const originalMiseDataDir = process.env.MISE_DATA_DIR;
    try {
      const appBinDir = path.join(tmp, "AppBin");
<<<<<<< HEAD
      await fs.mkdir(appBinDir, { recursive: true });
      const appCli = path.join(appBinDir, "moltbot");
=======
      await fs.mkdir(appBinDir);
      const appCli = path.join(appBinDir, "openclaw");
>>>>>>> b229a3de0 (perf(test): reduce mkdir churn in path env suite)
      await fs.writeFile(appCli, "#!/bin/sh\necho ok\n", "utf-8");
      await fs.chmod(appCli, 0o755);

      const localBinDir = path.join(tmp, "node_modules", ".bin");
      await fs.mkdir(localBinDir, { recursive: true });
      const localCli = path.join(localBinDir, "moltbot");
      await fs.writeFile(localCli, "#!/bin/sh\necho ok\n", "utf-8");
      await fs.chmod(localCli, 0o755);

      const miseDataDir = path.join(tmp, "mise");
      const shimsDir = path.join(miseDataDir, "shims");
      await fs.mkdir(shimsDir, { recursive: true });
      process.env.MISE_DATA_DIR = miseDataDir;
      process.env.PATH = "/usr/bin";
      delete process.env.CLAWDBOT_PATH_BOOTSTRAPPED;

      ensureMoltbotCliOnPath({
        execPath: appCli,
        cwd: tmp,
        homeDir: tmp,
        platform: "darwin",
      });

      const updated = process.env.PATH ?? "";
      const parts = updated.split(path.delimiter);
      const appBinIndex = parts.indexOf(appBinDir);
      const localIndex = parts.indexOf(localBinDir);
      const shimsIndex = parts.indexOf(shimsDir);
      expect(appBinIndex).toBeGreaterThanOrEqual(0);
      expect(localIndex).toBeGreaterThan(appBinIndex);
      expect(shimsIndex).toBeGreaterThan(localIndex);
    } finally {
      process.env.PATH = originalPath;
<<<<<<< HEAD
      if (originalFlag === undefined) delete process.env.CLAWDBOT_PATH_BOOTSTRAPPED;
      else process.env.CLAWDBOT_PATH_BOOTSTRAPPED = originalFlag;
      if (originalMiseDataDir === undefined) delete process.env.MISE_DATA_DIR;
      else process.env.MISE_DATA_DIR = originalMiseDataDir;
=======
      if (originalFlag === undefined) {
        delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;
      } else {
        process.env.OPENCLAW_PATH_BOOTSTRAPPED = originalFlag;
      }
      if (originalMiseDataDir === undefined) {
        delete process.env.MISE_DATA_DIR;
      } else {
        process.env.MISE_DATA_DIR = originalMiseDataDir;
      }
<<<<<<< HEAD
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
      await fs.rm(tmp, { recursive: true, force: true });
=======
    }
=======
    process.env.PATH = "/bin";
    process.env.OPENCLAW_PATH_BOOTSTRAPPED = "1";
    ensureOpenClawCliOnPath({
      execPath: "/tmp/does-not-matter",
      cwd: "/tmp",
      homeDir: "/tmp",
      platform: "darwin",
    });
    expect(process.env.PATH).toBe("/bin");
  });

  it("prepends mise shims when available", () => {
    const tmp = abs("/tmp/openclaw-path/case-mise");
    const appBinDir = path.join(tmp, "AppBin");
    const appCli = path.join(appBinDir, "openclaw");
    setDir(tmp);
    setDir(appBinDir);
    setExe(appCli);

    const miseDataDir = path.join(tmp, "mise");
    const shimsDir = path.join(miseDataDir, "shims");
    setDir(miseDataDir);
    setDir(shimsDir);

    process.env.MISE_DATA_DIR = miseDataDir;
    process.env.PATH = "/usr/bin";
    delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;

    ensureOpenClawCliOnPath({
      execPath: appCli,
      cwd: tmp,
      homeDir: tmp,
      platform: "darwin",
    });

    const updated = process.env.PATH ?? "";
    const parts = updated.split(path.delimiter);
    const appBinIndex = parts.indexOf(appBinDir);
    const shimsIndex = parts.indexOf(shimsDir);
    expect(appBinIndex).toBeGreaterThanOrEqual(0);
    expect(shimsIndex).toBeGreaterThan(appBinIndex);
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
  });

  it("only appends project-local node_modules/.bin when explicitly enabled", () => {
    const tmp = abs("/tmp/openclaw-path/case-project-local");
    const appBinDir = path.join(tmp, "AppBin");
    const appCli = path.join(appBinDir, "openclaw");
    setDir(tmp);
    setDir(appBinDir);
    setExe(appCli);

    const localBinDir = path.join(tmp, "node_modules", ".bin");
    const localCli = path.join(localBinDir, "openclaw");
    setDir(path.join(tmp, "node_modules"));
    setDir(localBinDir);
    setExe(localCli);

    process.env.PATH = "/usr/bin";
    delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;

    ensureOpenClawCliOnPath({
      execPath: appCli,
      cwd: tmp,
      homeDir: tmp,
      platform: "darwin",
    });
    const withoutOptIn = (process.env.PATH ?? "").split(path.delimiter);
    expect(withoutOptIn.includes(localBinDir)).toBe(false);

    process.env.PATH = "/usr/bin";
    delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;

<<<<<<< HEAD
      ensureOpenClawCliOnPath({
        execPath: appCli,
        cwd: tmp,
        homeDir: tmp,
        platform: "darwin",
        allowProjectLocalBin: true,
      });
      const withOptIn = (process.env.PATH ?? "").split(path.delimiter);
      const usrBinIndex = withOptIn.indexOf("/usr/bin");
      const localIndex = withOptIn.indexOf(localBinDir);
      expect(usrBinIndex).toBeGreaterThanOrEqual(0);
      expect(localIndex).toBeGreaterThan(usrBinIndex);
    } finally {
      process.env.PATH = originalPath;
      if (originalFlag === undefined) {
        delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;
      } else {
        process.env.OPENCLAW_PATH_BOOTSTRAPPED = originalFlag;
      }
>>>>>>> 6bc5987d6 (perf(test): speed up path env suite)
    }
  });

  it("prepends Linuxbrew dirs when present", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-path-"));
=======
    const tmp = path.join(fixtureRoot, `case-${fixtureCount++}`);
>>>>>>> 6bc5987d6 (perf(test): speed up path env suite)
=======
    const tmp = await makeTmpDir();
>>>>>>> b229a3de0 (perf(test): reduce mkdir churn in path env suite)
    const originalPath = process.env.PATH;
    const originalFlag = process.env.CLAWDBOT_PATH_BOOTSTRAPPED;
    const originalHomebrewPrefix = process.env.HOMEBREW_PREFIX;
    const originalHomebrewBrewFile = process.env.HOMEBREW_BREW_FILE;
    const originalXdgBinHome = process.env.XDG_BIN_HOME;
    try {
      const execDir = path.join(tmp, "exec");
      await fs.mkdir(execDir);
=======
    ensureOpenClawCliOnPath({
      execPath: appCli,
      cwd: tmp,
      homeDir: tmp,
      platform: "darwin",
      allowProjectLocalBin: true,
    });
    const withOptIn = (process.env.PATH ?? "").split(path.delimiter);
    const usrBinIndex = withOptIn.indexOf("/usr/bin");
    const localIndex = withOptIn.indexOf(localBinDir);
    expect(usrBinIndex).toBeGreaterThanOrEqual(0);
    expect(localIndex).toBeGreaterThan(usrBinIndex);
  });

  it("prepends Linuxbrew dirs when present", () => {
    const tmp = abs("/tmp/openclaw-path/case-linuxbrew");
    const execDir = path.join(tmp, "exec");
    setDir(tmp);
    setDir(execDir);
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)

    const linuxbrewDir = path.join(tmp, ".linuxbrew");
    const linuxbrewBin = path.join(linuxbrewDir, "bin");
    const linuxbrewSbin = path.join(linuxbrewDir, "sbin");
    setDir(linuxbrewDir);
    setDir(linuxbrewBin);
    setDir(linuxbrewSbin);

<<<<<<< HEAD
      process.env.PATH = "/usr/bin";
      delete process.env.CLAWDBOT_PATH_BOOTSTRAPPED;
      delete process.env.HOMEBREW_PREFIX;
      delete process.env.HOMEBREW_BREW_FILE;
      delete process.env.XDG_BIN_HOME;

      ensureMoltbotCliOnPath({
        execPath: path.join(execDir, "node"),
        cwd: tmp,
        homeDir: tmp,
        platform: "linux",
      });

      const updated = process.env.PATH ?? "";
      const parts = updated.split(path.delimiter);
      expect(parts[0]).toBe(linuxbrewBin);
      expect(parts[1]).toBe(linuxbrewSbin);
    } finally {
      process.env.PATH = originalPath;
<<<<<<< HEAD
      if (originalFlag === undefined) delete process.env.CLAWDBOT_PATH_BOOTSTRAPPED;
      else process.env.CLAWDBOT_PATH_BOOTSTRAPPED = originalFlag;
      if (originalHomebrewPrefix === undefined) delete process.env.HOMEBREW_PREFIX;
      else process.env.HOMEBREW_PREFIX = originalHomebrewPrefix;
      if (originalHomebrewBrewFile === undefined) delete process.env.HOMEBREW_BREW_FILE;
      else process.env.HOMEBREW_BREW_FILE = originalHomebrewBrewFile;
      if (originalXdgBinHome === undefined) delete process.env.XDG_BIN_HOME;
      else process.env.XDG_BIN_HOME = originalXdgBinHome;
=======
      if (originalFlag === undefined) {
        delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;
      } else {
        process.env.OPENCLAW_PATH_BOOTSTRAPPED = originalFlag;
      }
      if (originalHomebrewPrefix === undefined) {
        delete process.env.HOMEBREW_PREFIX;
      } else {
        process.env.HOMEBREW_PREFIX = originalHomebrewPrefix;
      }
      if (originalHomebrewBrewFile === undefined) {
        delete process.env.HOMEBREW_BREW_FILE;
      } else {
        process.env.HOMEBREW_BREW_FILE = originalHomebrewBrewFile;
      }
      if (originalXdgBinHome === undefined) {
        delete process.env.XDG_BIN_HOME;
      } else {
        process.env.XDG_BIN_HOME = originalXdgBinHome;
      }
<<<<<<< HEAD
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
      await fs.rm(tmp, { recursive: true, force: true });
=======
>>>>>>> 6bc5987d6 (perf(test): speed up path env suite)
    }
=======
    process.env.PATH = "/usr/bin";
    delete process.env.OPENCLAW_PATH_BOOTSTRAPPED;
    delete process.env.HOMEBREW_PREFIX;
    delete process.env.HOMEBREW_BREW_FILE;
    delete process.env.XDG_BIN_HOME;

    ensureOpenClawCliOnPath({
      execPath: path.join(execDir, "node"),
      cwd: tmp,
      homeDir: tmp,
      platform: "linux",
    });

    const updated = process.env.PATH ?? "";
    const parts = updated.split(path.delimiter);
    expect(parts[0]).toBe(linuxbrewBin);
    expect(parts[1]).toBe(linuxbrewSbin);
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
  });
});
