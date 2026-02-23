import { describe, expect, test } from "vitest";
import {
  extractShellCommandFromArgv,
  formatExecCommand,
  validateSystemRunCommandConsistency,
} from "./system-run-command.js";

describe("system run command helpers", () => {
  function expectRawCommandMismatch(params: { argv: string[]; rawCommand: string }) {
    const res = validateSystemRunCommandConsistency(params);
    expect(res.ok).toBe(false);
    if (res.ok) {
      throw new Error("unreachable");
    }
    expect(res.message).toContain("rawCommand does not match command");
    expect(res.details?.code).toBe("RAW_COMMAND_MISMATCH");
  }

  test("formatExecCommand quotes args with spaces", () => {
    expect(formatExecCommand(["echo", "hi there"])).toBe('echo "hi there"');
  });

  test("extractShellCommandFromArgv extracts sh -lc command", () => {
    expect(extractShellCommandFromArgv(["/bin/sh", "-lc", "echo hi"])).toBe("echo hi");
  });

  test("extractShellCommandFromArgv extracts cmd.exe /c command", () => {
    expect(extractShellCommandFromArgv(["cmd.exe", "/d", "/s", "/c", "echo hi"])).toBe("echo hi");
  });

  test("validateSystemRunCommandConsistency accepts rawCommand matching direct argv", () => {
    const res = validateSystemRunCommandConsistency({
      argv: ["echo", "hi"],
      rawCommand: "echo hi",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) {
      throw new Error("unreachable");
    }
    expect(res.shellCommand).toBe(null);
    expect(res.cmdText).toBe("echo hi");
  });

  test("validateSystemRunCommandConsistency rejects mismatched rawCommand vs direct argv", () => {
    expectRawCommandMismatch({
      argv: ["uname", "-a"],
      rawCommand: "echo hi",
    });
  });

  test("validateSystemRunCommandConsistency accepts rawCommand matching sh wrapper argv", () => {
    const res = validateSystemRunCommandConsistency({
      argv: ["/bin/sh", "-lc", "echo hi"],
      rawCommand: "echo hi",
    });
    expect(res.ok).toBe(true);
  });
<<<<<<< HEAD
=======

  test("validateSystemRunCommandConsistency rejects shell-only rawCommand for env assignment prelude", () => {
    expectRawCommandMismatch({
      argv: ["/usr/bin/env", "BASH_ENV=/tmp/payload.sh", "bash", "-lc", "echo hi"],
      rawCommand: "echo hi",
    });
  });

  test("validateSystemRunCommandConsistency accepts full rawCommand for env assignment prelude", () => {
    const raw = '/usr/bin/env BASH_ENV=/tmp/payload.sh bash -lc "echo hi"';
    const res = validateSystemRunCommandConsistency({
      argv: ["/usr/bin/env", "BASH_ENV=/tmp/payload.sh", "bash", "-lc", "echo hi"],
      rawCommand: raw,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) {
      throw new Error("unreachable");
    }
    expect(res.shellCommand).toBe("echo hi");
    expect(res.cmdText).toBe(raw);
  });

  test("validateSystemRunCommandConsistency rejects cmd.exe /c trailing-arg smuggling", () => {
    expectRawCommandMismatch({
      argv: ["cmd.exe", "/d", "/s", "/c", "echo", "SAFE&&whoami"],
      rawCommand: "echo",
    });
  });

  test("validateSystemRunCommandConsistency rejects mismatched rawCommand vs sh wrapper argv", () => {
    expectRawCommandMismatch({
      argv: ["/bin/sh", "-lc", "echo hi"],
      rawCommand: "echo bye",
    });
  });

  test("resolveSystemRunCommand requires command when rawCommand is present", () => {
    const res = resolveSystemRunCommand({ rawCommand: "echo hi" });
    expect(res.ok).toBe(false);
    if (res.ok) {
      throw new Error("unreachable");
    }
    expect(res.message).toContain("rawCommand requires params.command");
    expect(res.details?.code).toBe("MISSING_COMMAND");
  });

  test("resolveSystemRunCommand returns normalized argv and cmdText", () => {
    const res = resolveSystemRunCommand({
      command: ["cmd.exe", "/d", "/s", "/c", "echo", "SAFE&&whoami"],
      rawCommand: "echo SAFE&&whoami",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) {
      throw new Error("unreachable");
    }
    expect(res.argv).toEqual(["cmd.exe", "/d", "/s", "/c", "echo", "SAFE&&whoami"]);
    expect(res.shellCommand).toBe("echo SAFE&&whoami");
    expect(res.cmdText).toBe("echo SAFE&&whoami");
  });
<<<<<<< HEAD
>>>>>>> b109fa53e (refactor(core): dedupe gateway runtime and config tests)
=======

  test("resolveSystemRunCommand binds cmdText to full argv when env prelude modifies shell wrapper", () => {
    const res = resolveSystemRunCommand({
      command: ["/usr/bin/env", "BASH_ENV=/tmp/payload.sh", "bash", "-lc", "echo hi"],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) {
      throw new Error("unreachable");
    }
    expect(res.shellCommand).toBe("echo hi");
    expect(res.cmdText).toBe('/usr/bin/env BASH_ENV=/tmp/payload.sh bash -lc "echo hi"');
  });
>>>>>>> bd8b9af9a (fix(exec): bind env-prefixed shell wrappers to full approval text)
});
