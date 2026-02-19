import { PassThrough } from "node:stream";
<<<<<<< HEAD

import { describe, expect, it } from "vitest";

=======
import { beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
import {
  installLaunchAgent,
  isLaunchAgentListed,
  parseLaunchctlPrint,
  repairLaunchAgentBootstrap,
  resolveLaunchAgentPlistPath,
} from "./launchd.js";

const state = vi.hoisted(() => ({
  launchctlCalls: [] as string[][],
  listOutput: "",
  dirs: new Set<string>(),
  files: new Map<string, string>(),
}));

function normalizeLaunchctlArgs(file: string, args: string[]): string[] {
  if (file === "launchctl") {
    return args;
  }
<<<<<<< HEAD

  const shPath = path.join(binDir, "launchctl");
  await fs.writeFile(
    shPath,
    [
      "#!/bin/sh",
      'log_path="${OPENCLAW_TEST_LAUNCHCTL_LOG:-}"',
      'if [ -n "$log_path" ]; then',
      '  line=""',
      '  for arg in "$@"; do',
      '    if [ -n "$line" ]; then',
      '      line="$line $arg"',
      "    else",
      '      line="$arg"',
      "    fi",
      "  done",
      '  printf \'%s\\n\' "$line" >> "$log_path"',
      "fi",
      'if [ "$1" = "list" ]; then',
      "  printf '%s' \"${OPENCLAW_TEST_LAUNCHCTL_LIST_OUTPUT:-}\"",
      "fi",
      "exit 0",
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.chmod(shPath, 0o755);
}

async function withLaunchctlStub(
  options: { listOutput?: string },
  run: (context: { env: Record<string, string | undefined>; logPath: string }) => Promise<void>,
) {
  const originalPath = process.env.PATH;
  const originalLogPath = process.env.CLAWDBOT_TEST_LAUNCHCTL_LOG;
  const originalListOutput = process.env.CLAWDBOT_TEST_LAUNCHCTL_LIST_OUTPUT;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-launchctl-test-"));
  try {
    const binDir = path.join(tmpDir, "bin");
    const homeDir = path.join(tmpDir, "home");
    const logPath = path.join(tmpDir, "launchctl.log");
    await fs.mkdir(binDir, { recursive: true });
    await fs.mkdir(homeDir, { recursive: true });

<<<<<<< HEAD
    const stubJsPath = path.join(binDir, "launchctl.js");
    await fs.writeFile(
      stubJsPath,
      [
        'import fs from "node:fs";',
        "const args = process.argv.slice(2);",
        "const logPath = process.env.CLAWDBOT_TEST_LAUNCHCTL_LOG;",
        "if (logPath) {",
        '  fs.appendFileSync(logPath, JSON.stringify(args) + "\\n", "utf8");',
        "}",
        'if (args[0] === "list") {',
        '  const output = process.env.CLAWDBOT_TEST_LAUNCHCTL_LIST_OUTPUT || "";',
        "  process.stdout.write(output);",
        "}",
        "process.exit(0);",
        "",
      ].join("\n"),
      "utf8",
    );

    if (process.platform === "win32") {
      await fs.writeFile(
        path.join(binDir, "launchctl.cmd"),
        `@echo off\r\nnode "%~dp0\\launchctl.js" %*\r\n`,
        "utf8",
      );
    } else {
      const shPath = path.join(binDir, "launchctl");
      await fs.writeFile(shPath, `#!/bin/sh\nnode "$(dirname "$0")/launchctl.js" "$@"\n`, "utf8");
      await fs.chmod(shPath, 0o755);
    }
=======
    await writeLaunchctlStub(binDir);
>>>>>>> 8899f9e94 (perf(test): optimize heavy suites and stabilize lock timing)

    process.env.CLAWDBOT_TEST_LAUNCHCTL_LOG = logPath;
    process.env.CLAWDBOT_TEST_LAUNCHCTL_LIST_OUTPUT = options.listOutput ?? "";
    process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ""}`;

    await run({
      env: {
        HOME: homeDir,
        CLAWDBOT_PROFILE: "default",
      },
      logPath,
    });
  } finally {
    process.env.PATH = originalPath;
    if (originalLogPath === undefined) {
      delete process.env.CLAWDBOT_TEST_LAUNCHCTL_LOG;
    } else {
      process.env.CLAWDBOT_TEST_LAUNCHCTL_LOG = originalLogPath;
    }
    if (originalListOutput === undefined) {
      delete process.env.CLAWDBOT_TEST_LAUNCHCTL_LIST_OUTPUT;
    } else {
      process.env.CLAWDBOT_TEST_LAUNCHCTL_LIST_OUTPUT = originalListOutput;
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
=======
  const idx = args.indexOf("launchctl");
  if (idx >= 0) {
    return args.slice(idx + 1);
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
  }
  return args;
}

vi.mock("./exec-file.js", () => ({
  execFileUtf8: vi.fn(async (file: string, args: string[]) => {
    const call = normalizeLaunchctlArgs(file, args);
    state.launchctlCalls.push(call);
    if (call[0] === "list") {
      return { stdout: state.listOutput, stderr: "", code: 0 };
    }
    return { stdout: "", stderr: "", code: 0 };
  }),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const wrapped = {
    ...actual,
    access: vi.fn(async (p: string) => {
      const key = String(p);
      if (state.files.has(key) || state.dirs.has(key)) {
        return;
      }
      throw new Error(`ENOENT: no such file or directory, access '${key}'`);
    }),
    mkdir: vi.fn(async (p: string) => {
      state.dirs.add(String(p));
    }),
    unlink: vi.fn(async (p: string) => {
      state.files.delete(String(p));
    }),
    writeFile: vi.fn(async (p: string, data: string) => {
      const key = String(p);
      state.files.set(key, data);
      state.dirs.add(String(key.split("/").slice(0, -1).join("/")));
    }),
  };
  return { ...wrapped, default: wrapped };
});

beforeEach(() => {
  state.launchctlCalls.length = 0;
  state.listOutput = "";
  state.dirs.clear();
  state.files.clear();
  vi.clearAllMocks();
});

describe("launchd runtime parsing", () => {
  it("parses state, pid, and exit status", () => {
    const output = [
      "state = running",
      "pid = 4242",
      "last exit status = 1",
      "last exit reason = exited",
    ].join("\n");
    expect(parseLaunchctlPrint(output)).toEqual({
      state: "running",
      pid: 4242,
      lastExitStatus: 1,
      lastExitReason: "exited",
    });
  });
});

describe("launchctl list detection", () => {
  it("detects the resolved label in launchctl list", async () => {
<<<<<<< HEAD
    await withLaunchctlStub({ listOutput: "123 0 bot.molt.gateway\n" }, async ({ env }) => {
      const listed = await isLaunchAgentListed({ env });
      expect(listed).toBe(true);
=======
    state.listOutput = "123 0 ai.openclaw.gateway\n";
    const listed = await isLaunchAgentListed({
      env: { HOME: "/Users/test", OPENCLAW_PROFILE: "default" },
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
    });
    expect(listed).toBe(true);
  });

  it("returns false when the label is missing", async () => {
    state.listOutput = "123 0 com.other.service\n";
    const listed = await isLaunchAgentListed({
      env: { HOME: "/Users/test", OPENCLAW_PROFILE: "default" },
    });
    expect(listed).toBe(false);
  });
});

describe("launchd bootstrap repair", () => {
  it("bootstraps and kickstarts the resolved label", async () => {
    const env: Record<string, string | undefined> = {
      HOME: "/Users/test",
      OPENCLAW_PROFILE: "default",
    };
    const repair = await repairLaunchAgentBootstrap({ env });
    expect(repair.ok).toBe(true);

    const domain = typeof process.getuid === "function" ? `gui/${process.getuid()}` : "gui/501";
    const label = "ai.openclaw.gateway";
    const plistPath = resolveLaunchAgentPlistPath(env);

<<<<<<< HEAD
      const domain = typeof process.getuid === "function" ? `gui/${process.getuid()}` : "gui/501";
      const label = "bot.molt.gateway";
      const plistPath = resolveLaunchAgentPlistPath(env);

      expect(calls).toContainEqual(["bootstrap", domain, plistPath]);
      expect(calls).toContainEqual(["kickstart", "-k", `${domain}/${label}`]);
    });
=======
    expect(state.launchctlCalls).toContainEqual(["bootstrap", domain, plistPath]);
    expect(state.launchctlCalls).toContainEqual(["kickstart", "-k", `${domain}/${label}`]);
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
  });
});

describe("launchd install", () => {
  it("enables service before bootstrap (clears persisted disabled state)", async () => {
<<<<<<< HEAD
    const originalPath = process.env.PATH;
    const originalLogPath = process.env.CLAWDBOT_TEST_LAUNCHCTL_LOG;

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-launchctl-test-"));
    try {
      const binDir = path.join(tmpDir, "bin");
      const homeDir = path.join(tmpDir, "home");
      const logPath = path.join(tmpDir, "launchctl.log");
      await fs.mkdir(binDir, { recursive: true });
      await fs.mkdir(homeDir, { recursive: true });

<<<<<<< HEAD
      const stubJsPath = path.join(binDir, "launchctl.js");
      await fs.writeFile(
        stubJsPath,
        [
          'import fs from "node:fs";',
          "const logPath = process.env.CLAWDBOT_TEST_LAUNCHCTL_LOG;",
          "if (logPath) {",
          '  fs.appendFileSync(logPath, JSON.stringify(process.argv.slice(2)) + "\\n", "utf8");',
          "}",
          "process.exit(0);",
          "",
        ].join("\n"),
        "utf8",
      );

      if (process.platform === "win32") {
        await fs.writeFile(
          path.join(binDir, "launchctl.cmd"),
          `@echo off\r\nnode "%~dp0\\launchctl.js" %*\r\n`,
          "utf8",
        );
      } else {
        const shPath = path.join(binDir, "launchctl");
        await fs.writeFile(shPath, `#!/bin/sh\nnode "$(dirname "$0")/launchctl.js" "$@"\n`, "utf8");
        await fs.chmod(shPath, 0o755);
      }
=======
      await writeLaunchctlStub(binDir);
>>>>>>> 8899f9e94 (perf(test): optimize heavy suites and stabilize lock timing)

      process.env.CLAWDBOT_TEST_LAUNCHCTL_LOG = logPath;
      process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ""}`;

      const env: Record<string, string | undefined> = {
        HOME: homeDir,
        CLAWDBOT_PROFILE: "default",
      };
      await installLaunchAgent({
        env,
        stdout: new PassThrough(),
        programArguments: ["node", "-e", "process.exit(0)"],
      });

      const calls = parseLaunchctlCalls(await fs.readFile(logPath, "utf8"));

      const domain = typeof process.getuid === "function" ? `gui/${process.getuid()}` : "gui/501";
      const label = "bot.molt.gateway";
      const plistPath = resolveLaunchAgentPlistPath(env);
      const serviceId = `${domain}/${label}`;

      const enableCalls = calls.filter((c) => c[0] === "enable" && c[1] === serviceId);
      expect(enableCalls).toHaveLength(1);

      const enableIndex = calls.findIndex((c) => c[0] === "enable" && c[1] === serviceId);
      const bootstrapIndex = calls.findIndex(
        (c) => c[0] === "bootstrap" && c[1] === domain && c[2] === plistPath,
      );
      expect(enableIndex).toBeGreaterThanOrEqual(0);
      expect(bootstrapIndex).toBeGreaterThanOrEqual(0);
      expect(enableIndex).toBeLessThan(bootstrapIndex);
    } finally {
      process.env.PATH = originalPath;
      if (originalLogPath === undefined) {
        delete process.env.CLAWDBOT_TEST_LAUNCHCTL_LOG;
      } else {
        process.env.CLAWDBOT_TEST_LAUNCHCTL_LOG = originalLogPath;
      }
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
=======
    const env: Record<string, string | undefined> = {
      HOME: "/Users/test",
      OPENCLAW_PROFILE: "default",
    };
    await installLaunchAgent({
      env,
      stdout: new PassThrough(),
      programArguments: ["node", "-e", "process.exit(0)"],
    });

    const domain = typeof process.getuid === "function" ? `gui/${process.getuid()}` : "gui/501";
    const label = "ai.openclaw.gateway";
    const plistPath = resolveLaunchAgentPlistPath(env);
    const serviceId = `${domain}/${label}`;

    const enableIndex = state.launchctlCalls.findIndex(
      (c) => c[0] === "enable" && c[1] === serviceId,
    );
    const bootstrapIndex = state.launchctlCalls.findIndex(
      (c) => c[0] === "bootstrap" && c[1] === domain && c[2] === plistPath,
    );
    expect(enableIndex).toBeGreaterThanOrEqual(0);
    expect(bootstrapIndex).toBeGreaterThanOrEqual(0);
    expect(enableIndex).toBeLessThan(bootstrapIndex);
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
  });

  it("writes TMPDIR to LaunchAgent environment when provided", async () => {
    const env: Record<string, string | undefined> = {
      HOME: "/Users/test",
      OPENCLAW_PROFILE: "default",
    };
    const tmpDir = "/var/folders/xy/abc123/T/";
    await installLaunchAgent({
      env,
      stdout: new PassThrough(),
      programArguments: ["node", "-e", "process.exit(0)"],
      environment: { TMPDIR: tmpDir },
    });

    const plistPath = resolveLaunchAgentPlistPath(env);
    const plist = state.files.get(plistPath) ?? "";
    expect(plist).toContain("<key>EnvironmentVariables</key>");
    expect(plist).toContain("<key>TMPDIR</key>");
    expect(plist).toContain(`<string>${tmpDir}</string>`);
  });

  it("shows actionable guidance when launchctl gui domain does not support bootstrap", async () => {
    const originalPath = process.env.PATH;
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-launchctl-test-"));
    try {
      const binDir = path.join(tmpDir, "bin");
      const homeDir = path.join(tmpDir, "home");
      await fs.mkdir(binDir, { recursive: true });
      await fs.mkdir(homeDir, { recursive: true });

      const stubJsPath = path.join(binDir, "launchctl.js");
      await fs.writeFile(
        stubJsPath,
        [
          "const args = process.argv.slice(2);",
          'if (args[0] === "bootstrap") {',
          '  process.stderr.write("Bootstrap failed: 125: Domain does not support specified action\\n");',
          "  process.exit(1);",
          "}",
          "process.exit(0);",
          "",
        ].join("\n"),
        "utf8",
      );

      if (process.platform === "win32") {
        await fs.writeFile(
          path.join(binDir, "launchctl.cmd"),
          `@echo off\r\nnode "%~dp0\\launchctl.js" %*\r\n`,
          "utf8",
        );
      } else {
        const shPath = path.join(binDir, "launchctl");
        await fs.writeFile(shPath, `#!/bin/sh\nnode "$(dirname "$0")/launchctl.js" "$@"\n`, "utf8");
        await fs.chmod(shPath, 0o755);
      }

      process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ""}`;

      const env: Record<string, string | undefined> = {
        HOME: homeDir,
        OPENCLAW_PROFILE: "default",
      };
      let message = "";
      try {
        await installLaunchAgent({
          env,
          stdout: new PassThrough(),
          programArguments: ["node", "-e", "process.exit(0)"],
        });
      } catch (error) {
        message = String(error);
      }
      expect(message).toContain("logged-in macOS GUI session");
      expect(message).toContain("wrong user (including sudo)");
      expect(message).toContain("https://docs.openclaw.ai/gateway");
    } finally {
      process.env.PATH = originalPath;
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("resolveLaunchAgentPlistPath", () => {
<<<<<<< HEAD
  it("uses default label when CLAWDBOT_PROFILE is default", () => {
    const env = { HOME: "/Users/test", CLAWDBOT_PROFILE: "default" };
    expect(resolveLaunchAgentPlistPath(env)).toBe(
      "/Users/test/Library/LaunchAgents/bot.molt.gateway.plist",
    );
  });

  it("uses default label when CLAWDBOT_PROFILE is unset", () => {
=======
  it("uses default label when OPENCLAW_PROFILE is unset", () => {
>>>>>>> 6c3e7896c (test: remove duplicate lowercase default profile daemon path cases)
    const env = { HOME: "/Users/test" };
    expect(resolveLaunchAgentPlistPath(env)).toBe(
      "/Users/test/Library/LaunchAgents/bot.molt.gateway.plist",
    );
  });

  it("uses profile-specific label when CLAWDBOT_PROFILE is set to a custom value", () => {
    const env = { HOME: "/Users/test", CLAWDBOT_PROFILE: "jbphoenix" };
    expect(resolveLaunchAgentPlistPath(env)).toBe(
      "/Users/test/Library/LaunchAgents/bot.molt.jbphoenix.plist",
    );
  });

  it("prefers CLAWDBOT_LAUNCHD_LABEL over CLAWDBOT_PROFILE", () => {
    const env = {
      HOME: "/Users/test",
      CLAWDBOT_PROFILE: "jbphoenix",
      CLAWDBOT_LAUNCHD_LABEL: "com.custom.label",
    };
    expect(resolveLaunchAgentPlistPath(env)).toBe(
      "/Users/test/Library/LaunchAgents/com.custom.label.plist",
    );
  });

  it("trims whitespace from CLAWDBOT_LAUNCHD_LABEL", () => {
    const env = {
      HOME: "/Users/test",
      CLAWDBOT_LAUNCHD_LABEL: "  com.custom.label  ",
    };
    expect(resolveLaunchAgentPlistPath(env)).toBe(
      "/Users/test/Library/LaunchAgents/com.custom.label.plist",
    );
  });

  it("ignores empty CLAWDBOT_LAUNCHD_LABEL and falls back to profile", () => {
    const env = {
      HOME: "/Users/test",
      CLAWDBOT_PROFILE: "myprofile",
      CLAWDBOT_LAUNCHD_LABEL: "   ",
    };
    expect(resolveLaunchAgentPlistPath(env)).toBe(
      "/Users/test/Library/LaunchAgents/bot.molt.myprofile.plist",
    );
  });
<<<<<<< HEAD

  it("handles case-insensitive 'Default' profile", () => {
    const env = { HOME: "/Users/test", CLAWDBOT_PROFILE: "Default" };
    expect(resolveLaunchAgentPlistPath(env)).toBe(
      "/Users/test/Library/LaunchAgents/bot.molt.gateway.plist",
    );
  });

<<<<<<< HEAD
  it("handles case-insensitive 'DEFAULT' profile", () => {
    const env = { HOME: "/Users/test", CLAWDBOT_PROFILE: "DEFAULT" };
    expect(resolveLaunchAgentPlistPath(env)).toBe(
      "/Users/test/Library/LaunchAgents/bot.molt.gateway.plist",
    );
  });

  it("trims whitespace from CLAWDBOT_PROFILE", () => {
    const env = { HOME: "/Users/test", CLAWDBOT_PROFILE: "  myprofile  " };
=======
  it("trims whitespace from OPENCLAW_PROFILE", () => {
    const env = { HOME: "/Users/test", OPENCLAW_PROFILE: "  myprofile  " };
>>>>>>> 91e120870 (test: remove duplicate uppercase default profile daemon cases)
    expect(resolveLaunchAgentPlistPath(env)).toBe(
      "/Users/test/Library/LaunchAgents/bot.molt.myprofile.plist",
    );
  });
=======
>>>>>>> 1ec0f3b81 (test: drop redundant daemon profile normalization wrappers)
});
