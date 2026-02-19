import { describe, expect, it } from "vitest";

import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
<<<<<<< HEAD
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "moltbot", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "moltbot", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "moltbot", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "moltbot", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "moltbot", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "moltbot", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "moltbot", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "moltbot"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "moltbot", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "moltbot", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "moltbot", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "moltbot", "status", "--timeout=2500"], "--timeout")).toBe("2500");
    expect(getFlagValue(["node", "moltbot", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "moltbot", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "moltbot", "--", "--timeout=99"], "--timeout")).toBeUndefined();
=======
  it.each([
    {
      name: "help flag",
      argv: ["node", "openclaw", "--help"],
      expected: true,
    },
    {
      name: "version flag",
      argv: ["node", "openclaw", "-V"],
      expected: true,
    },
    {
      name: "normal command",
      argv: ["node", "openclaw", "status"],
      expected: false,
    },
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
  });

  it.each([
    {
      name: "single command with trailing flag",
      argv: ["node", "openclaw", "status", "--json"],
      expected: ["status"],
    },
    {
      name: "two-part command",
      argv: ["node", "openclaw", "agents", "list"],
      expected: ["agents", "list"],
    },
    {
      name: "terminator cuts parsing",
      argv: ["node", "openclaw", "status", "--", "ignored"],
      expected: ["status"],
    },
  ])("extracts command path: $name", ({ argv, expected }) => {
    expect(getCommandPath(argv, 2)).toEqual(expected);
  });

  it.each([
    {
      name: "returns first command token",
      argv: ["node", "openclaw", "agents", "list"],
      expected: "agents",
    },
    {
      name: "returns null when no command exists",
      argv: ["node", "openclaw"],
      expected: null,
    },
  ])("returns primary command: $name", ({ argv, expected }) => {
    expect(getPrimaryCommand(argv)).toBe(expected);
  });

  it.each([
    {
      name: "detects flag before terminator",
      argv: ["node", "openclaw", "status", "--json"],
      flag: "--json",
      expected: true,
    },
    {
      name: "ignores flag after terminator",
      argv: ["node", "openclaw", "--", "--json"],
      flag: "--json",
      expected: false,
    },
  ])("parses boolean flags: $name", ({ argv, flag, expected }) => {
    expect(hasFlag(argv, flag)).toBe(expected);
  });

  it.each([
    {
      name: "value in next token",
      argv: ["node", "openclaw", "status", "--timeout", "5000"],
      expected: "5000",
    },
    {
      name: "value in equals form",
      argv: ["node", "openclaw", "status", "--timeout=2500"],
      expected: "2500",
    },
    {
      name: "missing value",
      argv: ["node", "openclaw", "status", "--timeout"],
      expected: null,
    },
    {
      name: "next token is another flag",
      argv: ["node", "openclaw", "status", "--timeout", "--json"],
      expected: null,
    },
    {
      name: "flag appears after terminator",
      argv: ["node", "openclaw", "--", "--timeout=99"],
      expected: undefined,
    },
  ])("extracts flag values: $name", ({ argv, expected }) => {
    expect(getFlagValue(argv, "--timeout")).toBe(expected);
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "moltbot", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "moltbot", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "moltbot", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

<<<<<<< HEAD
  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "moltbot", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "moltbot", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "moltbot", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "moltbot", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "moltbot",
      rawArgs: ["node", "moltbot", "status"],
    });
    expect(nodeArgv).toEqual(["node", "moltbot", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "moltbot",
      rawArgs: ["node-22", "moltbot", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "moltbot", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "moltbot",
      rawArgs: ["node-22.2.0.exe", "moltbot", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "moltbot", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "moltbot",
      rawArgs: ["node-22.2", "moltbot", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "moltbot", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "moltbot",
      rawArgs: ["node-22.2.exe", "moltbot", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "moltbot", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "moltbot",
      rawArgs: ["/usr/bin/node-22.2.0", "moltbot", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "moltbot", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "moltbot",
      rawArgs: ["nodejs", "moltbot", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "moltbot", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "moltbot",
      rawArgs: ["node-dev", "moltbot", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "moltbot", "node-dev", "moltbot", "status"]);

    const directArgv = buildParseArgv({
      programName: "moltbot",
      rawArgs: ["moltbot", "status"],
    });
    expect(directArgv).toEqual(["node", "moltbot", "status"]);

    const bunArgv = buildParseArgv({
      programName: "moltbot",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
=======
  it.each([
    {
      name: "missing flag",
      argv: ["node", "openclaw", "status"],
      expected: undefined,
    },
    {
      name: "missing value",
      argv: ["node", "openclaw", "status", "--timeout"],
      expected: null,
    },
    {
      name: "valid positive integer",
      argv: ["node", "openclaw", "status", "--timeout", "5000"],
      expected: 5000,
    },
    {
      name: "invalid integer",
      argv: ["node", "openclaw", "status", "--timeout", "nope"],
      expected: undefined,
    },
  ])("parses positive integer flag values: $name", ({ argv, expected }) => {
    expect(getPositiveIntFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("builds parse argv from raw args", () => {
    const cases = [
      {
        rawArgs: ["node", "openclaw", "status"],
        expected: ["node", "openclaw", "status"],
      },
      {
        rawArgs: ["node-22", "openclaw", "status"],
        expected: ["node-22", "openclaw", "status"],
      },
      {
        rawArgs: ["node-22.2.0.exe", "openclaw", "status"],
        expected: ["node-22.2.0.exe", "openclaw", "status"],
      },
      {
        rawArgs: ["node-22.2", "openclaw", "status"],
        expected: ["node-22.2", "openclaw", "status"],
      },
      {
        rawArgs: ["node-22.2.exe", "openclaw", "status"],
        expected: ["node-22.2.exe", "openclaw", "status"],
      },
      {
        rawArgs: ["/usr/bin/node-22.2.0", "openclaw", "status"],
        expected: ["/usr/bin/node-22.2.0", "openclaw", "status"],
      },
      {
        rawArgs: ["nodejs", "openclaw", "status"],
        expected: ["nodejs", "openclaw", "status"],
      },
      {
        rawArgs: ["node-dev", "openclaw", "status"],
        expected: ["node", "openclaw", "node-dev", "openclaw", "status"],
      },
      {
        rawArgs: ["openclaw", "status"],
        expected: ["node", "openclaw", "status"],
      },
      {
        rawArgs: ["bun", "src/entry.ts", "status"],
        expected: ["bun", "src/entry.ts", "status"],
      },
    ] as const;

    for (const testCase of cases) {
      const parsed = buildParseArgv({
        programName: "openclaw",
        rawArgs: [...testCase.rawArgs],
      });
      expect(parsed).toEqual([...testCase.expected]);
    }
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "moltbot",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "moltbot", "status"]);
  });

  it("decides when to migrate state", () => {
<<<<<<< HEAD
<<<<<<< HEAD
    expect(shouldMigrateState(["node", "moltbot", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "moltbot", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "moltbot", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "moltbot", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "moltbot", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "moltbot", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "moltbot", "message", "send"])).toBe(true);
=======
    expect(shouldMigrateState(["node", "openclaw", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "openclaw", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "openclaw", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "openclaw", "config", "get", "update"])).toBe(false);
    expect(shouldMigrateState(["node", "openclaw", "config", "unset", "update"])).toBe(false);
    expect(shouldMigrateState(["node", "openclaw", "models", "list"])).toBe(false);
    expect(shouldMigrateState(["node", "openclaw", "models", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "openclaw", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "openclaw", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "openclaw", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "openclaw", "message", "send"])).toBe(true);
>>>>>>> f86840f4d (perf(cli): reduce read-only startup overhead)
=======
    const nonMutatingArgv = [
      ["node", "openclaw", "status"],
      ["node", "openclaw", "health"],
      ["node", "openclaw", "sessions"],
      ["node", "openclaw", "config", "get", "update"],
      ["node", "openclaw", "config", "unset", "update"],
      ["node", "openclaw", "models", "list"],
      ["node", "openclaw", "models", "status"],
      ["node", "openclaw", "memory", "status"],
      ["node", "openclaw", "agent", "--message", "hi"],
    ] as const;
    const mutatingArgv = [
      ["node", "openclaw", "agents", "list"],
      ["node", "openclaw", "message", "send"],
    ] as const;

    for (const argv of nonMutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(false);
    }
    for (const argv of mutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(true);
    }
>>>>>>> a1cb700a0 (test: dedupe and optimize test suites)
  });

  it.each([
    { path: ["status"], expected: false },
    { path: ["config", "get"], expected: false },
    { path: ["models", "status"], expected: false },
    { path: ["agents", "list"], expected: true },
  ])("reuses command path for migrate state decisions: $path", ({ path, expected }) => {
    expect(shouldMigrateStateFromPath(path)).toBe(expected);
  });
});
