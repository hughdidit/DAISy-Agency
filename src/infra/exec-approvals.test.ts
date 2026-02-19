import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  analyzeArgvCommand,
  analyzeShellCommand,
  buildSafeBinsShellCommand,
  evaluateExecAllowlist,
  evaluateShellAllowlist,
  isSafeBinUsage,
  matchAllowlist,
  maxAsk,
  minSecurity,
<<<<<<< HEAD
=======
  normalizeExecApprovals,
  parseExecArgvToken,
>>>>>>> a688ccf24 (refactor(security): unify safe-bin argv parsing and harden regressions)
  normalizeSafeBins,
  requiresExecApproval,
  resolveCommandResolution,
  resolveExecApprovals,
  resolveExecApprovalsFromFile,
<<<<<<< HEAD
=======
  resolveExecApprovalsPath,
  resolveExecApprovalsSocketPath,
  resolveSafeBins,
>>>>>>> cfe8457a0 (fix(security): harden safeBins stdin-only enforcement)
  type ExecAllowlistEntry,
} from "./exec-approvals.js";
import { SAFE_BIN_PROFILE_FIXTURES, SAFE_BIN_PROFILES } from "./exec-safe-bin-policy.js";

function makePathEnv(binDir: string): NodeJS.ProcessEnv {
  if (process.platform !== "win32") {
    return { PATH: binDir };
  }
  return { PATH: binDir, PATHEXT: ".EXE;.CMD;.BAT;.COM" };
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-exec-approvals-"));
}

describe("exec approvals allowlist matching", () => {
  it("ignores basename-only patterns", () => {
    const resolution = {
      rawExecutable: "rg",
      resolvedPath: "/opt/homebrew/bin/rg",
      executableName: "rg",
    };
    const entries: ExecAllowlistEntry[] = [{ pattern: "RG" }];
    const match = matchAllowlist(entries, resolution);
    expect(match).toBeNull();
  });

  it("matches by resolved path with **", () => {
    const resolution = {
      rawExecutable: "rg",
      resolvedPath: "/opt/homebrew/bin/rg",
      executableName: "rg",
    };
    const entries: ExecAllowlistEntry[] = [{ pattern: "/opt/**/rg" }];
    const match = matchAllowlist(entries, resolution);
    expect(match?.pattern).toBe("/opt/**/rg");
  });

  it("does not let * cross path separators", () => {
    const resolution = {
      rawExecutable: "rg",
      resolvedPath: "/opt/homebrew/bin/rg",
      executableName: "rg",
    };
    const entries: ExecAllowlistEntry[] = [{ pattern: "/opt/*/rg" }];
    const match = matchAllowlist(entries, resolution);
    expect(match).toBeNull();
  });

  it("requires a resolved path", () => {
    const resolution = {
      rawExecutable: "bin/rg",
      resolvedPath: undefined,
      executableName: "rg",
    };
    const entries: ExecAllowlistEntry[] = [{ pattern: "bin/rg" }];
    const match = matchAllowlist(entries, resolution);
    expect(match).toBeNull();
  });
});

describe("exec approvals safe shell command builder", () => {
  it("quotes only safeBins segments (leaves other segments untouched)", () => {
    if (process.platform === "win32") {
      return;
    }

    const analysis = analyzeShellCommand({
      command: "rg foo src/*.ts | head -n 5 && echo ok",
      cwd: "/tmp",
      env: { PATH: "/usr/bin:/bin" },
      platform: process.platform,
    });
    expect(analysis.ok).toBe(true);

    const res = buildSafeBinsShellCommand({
      command: "rg foo src/*.ts | head -n 5 && echo ok",
      segments: analysis.segments,
      segmentSatisfiedBy: [null, "safeBins", null],
      platform: process.platform,
    });
    expect(res.ok).toBe(true);
    // Preserve non-safeBins segment raw (glob stays unquoted)
    expect(res.command).toContain("rg foo src/*.ts");
    // SafeBins segment is fully quoted
    expect(res.command).toContain("'head' '-n' '5'");
  });
});

describe("exec approvals command resolution", () => {
  it("resolves PATH executables", () => {
    const dir = makeTempDir();
    const binDir = path.join(dir, "bin");
    fs.mkdirSync(binDir, { recursive: true });
    const exeName = process.platform === "win32" ? "rg.exe" : "rg";
    const exe = path.join(binDir, exeName);
    fs.writeFileSync(exe, "");
    fs.chmodSync(exe, 0o755);
    const res = resolveCommandResolution("rg -n foo", undefined, makePathEnv(binDir));
    expect(res?.resolvedPath).toBe(exe);
    expect(res?.executableName).toBe(exeName);
  });

  it("resolves relative paths against cwd", () => {
    const dir = makeTempDir();
    const cwd = path.join(dir, "project");
    const script = path.join(cwd, "scripts", "run.sh");
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.writeFileSync(script, "");
    fs.chmodSync(script, 0o755);
    const res = resolveCommandResolution("./scripts/run.sh --flag", cwd, undefined);
    expect(res?.resolvedPath).toBe(script);
  });

  it("parses quoted executables", () => {
    const dir = makeTempDir();
    const cwd = path.join(dir, "project");
    const script = path.join(cwd, "bin", "tool");
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.writeFileSync(script, "");
    fs.chmodSync(script, 0o755);
    const res = resolveCommandResolution('"./bin/tool" --version', cwd, undefined);
    expect(res?.resolvedPath).toBe(script);
  });
});

describe("exec approvals shell parsing", () => {
  it("parses simple pipelines", () => {
    const res = analyzeShellCommand({ command: "echo ok | jq .foo" });
    expect(res.ok).toBe(true);
    expect(res.segments.map((seg) => seg.argv[0])).toEqual(["echo", "jq"]);
  });

  it("parses chained commands", () => {
    const res = analyzeShellCommand({ command: "ls && rm -rf /" });
    expect(res.ok).toBe(true);
    expect(res.chains?.map((chain) => chain[0]?.argv[0])).toEqual(["ls", "rm"]);
  });

  it("parses argv commands", () => {
    const res = analyzeArgvCommand({ argv: ["/bin/echo", "ok"] });
    expect(res.ok).toBe(true);
    expect(res.segments[0]?.argv).toEqual(["/bin/echo", "ok"]);
  });
<<<<<<< HEAD
=======

  it("rejects command substitution inside double quotes", () => {
    const res = analyzeShellCommand({ command: 'echo "output: $(whoami)"' });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unsupported shell token: $()");
  });

  it("rejects backticks inside double quotes", () => {
    const res = analyzeShellCommand({ command: 'echo "output: `id`"' });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unsupported shell token: `");
  });

  it("rejects command substitution outside quotes", () => {
    const res = analyzeShellCommand({ command: "echo $(whoami)" });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unsupported shell token: $()");
  });

  it("allows escaped command substitution inside double quotes", () => {
    const res = analyzeShellCommand({ command: 'echo "output: \\$(whoami)"' });
    expect(res.ok).toBe(true);
    expect(res.segments[0]?.argv[0]).toBe("echo");
  });

  it("allows command substitution syntax inside single quotes", () => {
    const res = analyzeShellCommand({ command: "echo 'output: $(whoami)'" });
    expect(res.ok).toBe(true);
    expect(res.segments[0]?.argv[0]).toBe("echo");
  });

  it("rejects input redirection (<)", () => {
    const res = analyzeShellCommand({ command: "cat < input.txt" });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unsupported shell token: <");
  });

  it("rejects output redirection (>)", () => {
    const res = analyzeShellCommand({ command: "echo ok > output.txt" });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unsupported shell token: >");
  });

  it("allows heredoc operator (<<)", () => {
    const res = analyzeShellCommand({ command: "/usr/bin/tee /tmp/file << 'EOF'" });
    expect(res.ok).toBe(true);
    expect(res.segments[0]?.argv[0]).toBe("/usr/bin/tee");
  });

  it("allows heredoc without space before delimiter", () => {
    const res = analyzeShellCommand({ command: "/usr/bin/tee /tmp/file <<EOF" });
    expect(res.ok).toBe(true);
    expect(res.segments[0]?.argv[0]).toBe("/usr/bin/tee");
  });

  it("allows heredoc with strip-tabs operator (<<-)", () => {
    const res = analyzeShellCommand({ command: "/usr/bin/cat <<-DELIM" });
    expect(res.ok).toBe(true);
    expect(res.segments[0]?.argv[0]).toBe("/usr/bin/cat");
  });

  it("allows heredoc in pipeline", () => {
    const res = analyzeShellCommand({ command: "/usr/bin/cat << 'EOF' | /usr/bin/grep pattern" });
    expect(res.ok).toBe(true);
    expect(res.segments).toHaveLength(2);
    expect(res.segments[0]?.argv[0]).toBe("/usr/bin/cat");
    expect(res.segments[1]?.argv[0]).toBe("/usr/bin/grep");
  });

  it("allows multiline heredoc body", () => {
    const res = analyzeShellCommand({
      command: "/usr/bin/tee /tmp/file << 'EOF'\nline one\nline two\nEOF",
    });
    expect(res.ok).toBe(true);
    expect(res.segments[0]?.argv[0]).toBe("/usr/bin/tee");
  });

  it("allows multiline heredoc body with strip-tabs operator (<<-)", () => {
    const res = analyzeShellCommand({
      command: "/usr/bin/cat <<-EOF\n\tline one\n\tline two\n\tEOF",
    });
    expect(res.ok).toBe(true);
    expect(res.segments[0]?.argv[0]).toBe("/usr/bin/cat");
  });

  it("rejects multiline commands without heredoc", () => {
    const res = analyzeShellCommand({
      command: "/usr/bin/echo first line\n/usr/bin/echo second line",
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unsupported shell token: \n");
  });

  it("rejects windows shell metacharacters", () => {
    const res = analyzeShellCommand({
      command: "ping 127.0.0.1 -n 1 & whoami",
      platform: "win32",
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unsupported windows shell token: &");
  });

  it("parses windows quoted executables", () => {
    const res = analyzeShellCommand({
      command: '"C:\\Program Files\\Tool\\tool.exe" --version',
      platform: "win32",
    });
    expect(res.ok).toBe(true);
    expect(res.segments[0]?.argv).toEqual(["C:\\Program Files\\Tool\\tool.exe", "--version"]);
  });
<<<<<<< HEAD
>>>>>>> e90caa66d (fix(exec): allow heredoc operator (<<) in allowlist security mode (#13811))
=======

  it("normalizes short option clusters with attached payloads", () => {
    const parsed = parseExecArgvToken("-oblocked.txt");
    expect(parsed.kind).toBe("option");
    if (parsed.kind !== "option" || parsed.style !== "short-cluster") {
      throw new Error("expected short-cluster option");
    }
    expect(parsed.flags[0]).toBe("-o");
    expect(parsed.cluster).toBe("oblocked.txt");
  });

  it("normalizes long options with inline payloads", () => {
    const parsed = parseExecArgvToken("--output=blocked.txt");
    expect(parsed.kind).toBe("option");
    if (parsed.kind !== "option" || parsed.style !== "long") {
      throw new Error("expected long option");
    }
    expect(parsed.flag).toBe("--output");
    expect(parsed.inlineValue).toBe("blocked.txt");
  });
>>>>>>> a688ccf24 (refactor(security): unify safe-bin argv parsing and harden regressions)
});

describe("exec approvals shell allowlist (chained commands)", () => {
  it("allows chained commands when all parts are allowlisted", () => {
    const allowlist: ExecAllowlistEntry[] = [
      { pattern: "/usr/bin/obsidian-cli" },
      { pattern: "/usr/bin/head" },
    ];
    const result = evaluateShellAllowlist({
      command:
        "/usr/bin/obsidian-cli print-default && /usr/bin/obsidian-cli search foo | /usr/bin/head",
      allowlist,
      safeBins: new Set(),
      cwd: "/tmp",
    });
    expect(result.analysisOk).toBe(true);
    expect(result.allowlistSatisfied).toBe(true);
  });

  it("rejects chained commands when any part is not allowlisted", () => {
    const allowlist: ExecAllowlistEntry[] = [{ pattern: "/usr/bin/obsidian-cli" }];
    const result = evaluateShellAllowlist({
      command: "/usr/bin/obsidian-cli print-default && /usr/bin/rm -rf /",
      allowlist,
      safeBins: new Set(),
      cwd: "/tmp",
    });
    expect(result.analysisOk).toBe(true);
    expect(result.allowlistSatisfied).toBe(false);
  });

  it("returns analysisOk=false for malformed chains", () => {
    const allowlist: ExecAllowlistEntry[] = [{ pattern: "/usr/bin/echo" }];
    const result = evaluateShellAllowlist({
      command: "/usr/bin/echo ok &&",
      allowlist,
      safeBins: new Set(),
      cwd: "/tmp",
    });
    expect(result.analysisOk).toBe(false);
    expect(result.allowlistSatisfied).toBe(false);
  });

  it("respects quotes when splitting chains", () => {
    const allowlist: ExecAllowlistEntry[] = [{ pattern: "/usr/bin/echo" }];
    const result = evaluateShellAllowlist({
      command: '/usr/bin/echo "foo && bar"',
      allowlist,
      safeBins: new Set(),
      cwd: "/tmp",
    });
    expect(result.analysisOk).toBe(true);
    expect(result.allowlistSatisfied).toBe(true);
  });
});

describe("exec approvals safe bins", () => {
<<<<<<< HEAD
  it("allows safe bins with non-path args", () => {
    if (process.platform === "win32") {
      return;
    }
    const dir = makeTempDir();
<<<<<<< HEAD
    const binDir = path.join(dir, "bin");
    fs.mkdirSync(binDir, { recursive: true });
    const exeName = process.platform === "win32" ? "jq.exe" : "jq";
    const exe = path.join(binDir, exeName);
    fs.writeFileSync(exe, "");
    fs.chmodSync(exe, 0o755);
    const res = analyzeShellCommand({
      command: "jq .foo",
      cwd: dir,
      env: makePathEnv(binDir),
    });
    expect(res.ok).toBe(true);
    const segment = res.segments[0];
=======
>>>>>>> 28bac46c9 (fix(security): harden safeBins path trust)
    const ok = isSafeBinUsage({
      argv: ["jq", ".foo"],
      resolution: {
        rawExecutable: "jq",
        resolvedPath: "/usr/bin/jq",
        executableName: "jq",
      },
      safeBins: normalizeSafeBins(["jq"]),
      cwd: dir,
    });
    expect(ok).toBe(true);
  });

  it("blocks safe bins with file args", () => {
    if (process.platform === "win32") {
      return;
    }
    const dir = makeTempDir();
<<<<<<< HEAD
    const binDir = path.join(dir, "bin");
    fs.mkdirSync(binDir, { recursive: true });
    const exeName = process.platform === "win32" ? "jq.exe" : "jq";
    const exe = path.join(binDir, exeName);
    fs.writeFileSync(exe, "");
    fs.chmodSync(exe, 0o755);
    const file = path.join(dir, "secret.json");
    fs.writeFileSync(file, "{}");
    const res = analyzeShellCommand({
      command: "jq .foo secret.json",
      cwd: dir,
      env: makePathEnv(binDir),
    });
    expect(res.ok).toBe(true);
    const segment = res.segments[0];
=======
    fs.writeFileSync(path.join(dir, "secret.json"), "{}");
>>>>>>> 28bac46c9 (fix(security): harden safeBins path trust)
    const ok = isSafeBinUsage({
=======
  type SafeBinCase = {
    name: string;
    argv: string[];
    resolvedPath: string;
    expected: boolean;
    safeBins?: string[];
    executableName?: string;
    rawExecutable?: string;
    cwd?: string;
    setup?: (cwd: string) => void;
  };

  const cases: SafeBinCase[] = [
    {
      name: "allows safe bins with non-path args",
      argv: ["jq", ".foo"],
      resolvedPath: "/usr/bin/jq",
      expected: true,
    },
    {
      name: "blocks safe bins with file args",
>>>>>>> ac0db6823 (refactor(security): extract safeBins trust resolver)
      argv: ["jq", ".foo", "secret.json"],
      resolvedPath: "/usr/bin/jq",
      expected: false,
      setup: (cwd) => fs.writeFileSync(path.join(cwd, "secret.json"), "{}"),
    },
    {
      name: "blocks safe bins resolved from untrusted directories",
      argv: ["jq", ".foo"],
      resolvedPath: "/tmp/evil-bin/jq",
      expected: false,
      cwd: "/tmp",
    },
    {
      name: "blocks sort output path via -o <file>",
      argv: ["sort", "-o", "malicious.sh"],
      resolvedPath: "/usr/bin/sort",
      expected: false,
      safeBins: ["sort"],
      executableName: "sort",
    },
    {
      name: "blocks sort output path via attached short option (-ofile)",
      argv: ["sort", "-omalicious.sh"],
      resolvedPath: "/usr/bin/sort",
      expected: false,
      safeBins: ["sort"],
      executableName: "sort",
    },
    {
      name: "blocks sort output path via --output=file",
      argv: ["sort", "--output=malicious.sh"],
      resolvedPath: "/usr/bin/sort",
      expected: false,
      safeBins: ["sort"],
      executableName: "sort",
    },
    {
      name: "blocks grep recursive flags that read cwd",
      argv: ["grep", "-R", "needle"],
      resolvedPath: "/usr/bin/grep",
      expected: false,
      safeBins: ["grep"],
      executableName: "grep",
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      if (process.platform === "win32") {
        return;
      }
      const cwd = testCase.cwd ?? makeTempDir();
      testCase.setup?.(cwd);
      const executableName = testCase.executableName ?? "jq";
      const rawExecutable = testCase.rawExecutable ?? executableName;
      const ok = isSafeBinUsage({
        argv: testCase.argv,
        resolution: {
          rawExecutable,
          resolvedPath: testCase.resolvedPath,
          executableName,
        },
        safeBins: normalizeSafeBins(testCase.safeBins ?? [executableName]),
      });
      expect(ok).toBe(testCase.expected);
    });
  }

  it("supports injected trusted safe-bin dirs for tests/callers", () => {
    if (process.platform === "win32") {
      return;
    }
    const ok = isSafeBinUsage({
      argv: ["jq", ".foo"],
      resolution: {
        rawExecutable: "jq",
        resolvedPath: "/custom/bin/jq",
        executableName: "jq",
      },
      safeBins: normalizeSafeBins(["jq"]),
      trustedSafeBinDirs: new Set(["/custom/bin"]),
    });
    expect(ok).toBe(true);
  });

<<<<<<< HEAD
=======
  it("supports injected platform for deterministic safe-bin checks", () => {
    const ok = isSafeBinUsage({
      argv: ["jq", ".foo"],
      resolution: {
        rawExecutable: "jq",
        resolvedPath: "/usr/bin/jq",
        executableName: "jq",
      },
      safeBins: normalizeSafeBins(["jq"]),
      platform: "win32",
    });
    expect(ok).toBe(false);
  });

  it("supports injected trusted path checker for deterministic callers", () => {
    if (process.platform === "win32") {
      return;
    }
    const baseParams = {
      argv: ["jq", ".foo"],
      resolution: {
        rawExecutable: "jq",
        resolvedPath: "/tmp/custom/jq",
        executableName: "jq",
      },
      safeBins: normalizeSafeBins(["jq"]),
    };
    expect(
      isSafeBinUsage({
        ...baseParams,
        isTrustedSafeBinPathFn: () => true,
      }),
    ).toBe(true);
    expect(
      isSafeBinUsage({
        ...baseParams,
        isTrustedSafeBinPathFn: () => false,
      }),
    ).toBe(false);
  });

  it("keeps safe-bin profile fixtures aligned with compiled profiles", () => {
    for (const [name, fixture] of Object.entries(SAFE_BIN_PROFILE_FIXTURES)) {
      const profile = SAFE_BIN_PROFILES[name];
      expect(profile).toBeDefined();
      const fixtureBlockedFlags = fixture.blockedFlags ?? [];
      const compiledBlockedFlags = profile?.blockedFlags ?? new Set<string>();
      for (const blockedFlag of fixtureBlockedFlags) {
        expect(compiledBlockedFlags.has(blockedFlag)).toBe(true);
      }
      expect(Array.from(compiledBlockedFlags).toSorted()).toEqual(
        [...fixtureBlockedFlags].toSorted(),
      );
    }
  });

>>>>>>> a688ccf24 (refactor(security): unify safe-bin argv parsing and harden regressions)
  it("does not include sort/grep in default safeBins", () => {
    const defaults = resolveSafeBins(undefined);
    expect(defaults.has("jq")).toBe(true);
    expect(defaults.has("sort")).toBe(false);
    expect(defaults.has("grep")).toBe(false);
  });

  it("blocks sort output flags independent of file existence", () => {
    if (process.platform === "win32") {
      return;
    }
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, "existing.txt"), "x");
    const resolution = {
      rawExecutable: "sort",
      resolvedPath: "/usr/bin/sort",
      executableName: "sort",
    };
    const safeBins = normalizeSafeBins(["sort"]);
    const existing = isSafeBinUsage({
      argv: ["sort", "-o", "existing.txt"],
      resolution,
      safeBins,
    });
    const missing = isSafeBinUsage({
      argv: ["sort", "-o", "missing.txt"],
      resolution,
      safeBins,
    });
    const longFlag = isSafeBinUsage({
      argv: ["sort", "--output=missing.txt"],
      resolution,
      safeBins,
    });
    expect(existing).toBe(false);
    expect(missing).toBe(false);
    expect(longFlag).toBe(false);
  });

<<<<<<< HEAD
  it("does not consult file existence callbacks for safe-bin decisions", () => {
    if (process.platform === "win32") {
      return;
    }
    let checkedExists = false;
    const ok = isSafeBinUsage({
      argv: ["sort", "-o", "target.txt"],
      resolution: {
        rawExecutable: "sort",
        resolvedPath: "/usr/bin/sort",
        executableName: "sort",
      },
      safeBins: normalizeSafeBins(["sort"]),
      cwd: "/tmp",
      fileExists: () => {
        checkedExists = true;
        return true;
      },
    });
    expect(ok).toBe(false);
    expect(checkedExists).toBe(false);
=======
  it("threads trusted safe-bin dirs through allowlist evaluation", () => {
    if (process.platform === "win32") {
      return;
    }
    const analysis = {
      ok: true as const,
      segments: [
        {
          raw: "jq .foo",
          argv: ["jq", ".foo"],
          resolution: {
            rawExecutable: "jq",
            resolvedPath: "/custom/bin/jq",
            executableName: "jq",
          },
        },
      ],
    };
    const denied = evaluateExecAllowlist({
      analysis,
      allowlist: [],
      safeBins: normalizeSafeBins(["jq"]),
      trustedSafeBinDirs: new Set(["/usr/bin"]),
      cwd: "/tmp",
    });
    expect(denied.allowlistSatisfied).toBe(false);

    const allowed = evaluateExecAllowlist({
      analysis,
      allowlist: [],
      safeBins: normalizeSafeBins(["jq"]),
      trustedSafeBinDirs: new Set(["/custom/bin"]),
      cwd: "/tmp",
    });
    expect(allowed.allowlistSatisfied).toBe(true);
>>>>>>> 165c18819 (refactor(security): simplify safe-bin validation structure)
  });
});

describe("exec approvals allowlist evaluation", () => {
  it("satisfies allowlist on exact match", () => {
    const analysis = {
      ok: true,
      segments: [
        {
          raw: "tool",
          argv: ["tool"],
          resolution: {
            rawExecutable: "tool",
            resolvedPath: "/usr/bin/tool",
            executableName: "tool",
          },
        },
      ],
    };
    const allowlist: ExecAllowlistEntry[] = [{ pattern: "/usr/bin/tool" }];
    const result = evaluateExecAllowlist({
      analysis,
      allowlist,
      safeBins: new Set(),
      cwd: "/tmp",
    });
    expect(result.allowlistSatisfied).toBe(true);
    expect(result.allowlistMatches.map((entry) => entry.pattern)).toEqual(["/usr/bin/tool"]);
  });

  it("satisfies allowlist via safe bins", () => {
    const analysis = {
      ok: true,
      segments: [
        {
          raw: "jq .foo",
          argv: ["jq", ".foo"],
          resolution: {
            rawExecutable: "jq",
            resolvedPath: "/usr/bin/jq",
            executableName: "jq",
          },
        },
      ],
    };
    const result = evaluateExecAllowlist({
      analysis,
      allowlist: [],
      safeBins: normalizeSafeBins(["jq"]),
      cwd: "/tmp",
    });
    expect(result.allowlistSatisfied).toBe(true);
    expect(result.allowlistMatches).toEqual([]);
  });

  it("satisfies allowlist via auto-allow skills", () => {
    const analysis = {
      ok: true,
      segments: [
        {
          raw: "skill-bin",
          argv: ["skill-bin", "--help"],
          resolution: {
            rawExecutable: "skill-bin",
            resolvedPath: "/opt/skills/skill-bin",
            executableName: "skill-bin",
          },
        },
      ],
    };
    const result = evaluateExecAllowlist({
      analysis,
      allowlist: [],
      safeBins: new Set(),
      skillBins: new Set(["skill-bin"]),
      autoAllowSkills: true,
      cwd: "/tmp",
    });
    expect(result.allowlistSatisfied).toBe(true);
  });
});

describe("exec approvals policy helpers", () => {
  it("minSecurity returns the more restrictive value", () => {
    expect(minSecurity("deny", "full")).toBe("deny");
    expect(minSecurity("allowlist", "full")).toBe("allowlist");
  });

  it("maxAsk returns the more aggressive ask mode", () => {
    expect(maxAsk("off", "always")).toBe("always");
    expect(maxAsk("on-miss", "off")).toBe("on-miss");
  });

  it("requiresExecApproval respects ask mode and allowlist satisfaction", () => {
    expect(
      requiresExecApproval({
        ask: "always",
        security: "allowlist",
        analysisOk: true,
        allowlistSatisfied: true,
      }),
    ).toBe(true);
    expect(
      requiresExecApproval({
        ask: "off",
        security: "allowlist",
        analysisOk: true,
        allowlistSatisfied: false,
      }),
    ).toBe(false);
    expect(
      requiresExecApproval({
        ask: "on-miss",
        security: "allowlist",
        analysisOk: true,
        allowlistSatisfied: true,
      }),
    ).toBe(false);
    expect(
      requiresExecApproval({
        ask: "on-miss",
        security: "allowlist",
        analysisOk: false,
        allowlistSatisfied: false,
      }),
    ).toBe(true);
    expect(
      requiresExecApproval({
        ask: "on-miss",
        security: "full",
        analysisOk: false,
        allowlistSatisfied: false,
      }),
    ).toBe(false);
  });
});

describe("exec approvals wildcard agent", () => {
  it("merges wildcard allowlist entries with agent entries", () => {
    const dir = makeTempDir();
    const homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(dir);

    try {
      const approvalsPath = path.join(dir, ".openclaw", "exec-approvals.json");
      fs.mkdirSync(path.dirname(approvalsPath), { recursive: true });
      fs.writeFileSync(
        approvalsPath,
        JSON.stringify(
          {
            version: 1,
            agents: {
              "*": { allowlist: [{ pattern: "/bin/hostname" }] },
              main: { allowlist: [{ pattern: "/usr/bin/uname" }] },
            },
          },
          null,
          2,
        ),
      );

      const resolved = resolveExecApprovals("main");
      expect(resolved.allowlist.map((entry) => entry.pattern)).toEqual([
        "/bin/hostname",
        "/usr/bin/uname",
      ]);
    } finally {
      homedirSpy.mockRestore();
    }
  });
});

describe("exec approvals node host allowlist check", () => {
  // These tests verify the allowlist satisfaction logic used by the node host path
  // The node host checks: matchAllowlist() || isSafeBinUsage() for each command segment
  // Using hardcoded resolution objects for cross-platform compatibility

  it("satisfies allowlist when command matches exact path pattern", () => {
    const resolution = {
      rawExecutable: "python3",
      resolvedPath: "/usr/bin/python3",
      executableName: "python3",
    };
    const entries: ExecAllowlistEntry[] = [{ pattern: "/usr/bin/python3" }];
    const match = matchAllowlist(entries, resolution);
    expect(match).not.toBeNull();
    expect(match?.pattern).toBe("/usr/bin/python3");
  });

  it("satisfies allowlist when command matches ** wildcard pattern", () => {
    // Simulates symlink resolution: /opt/homebrew/bin/python3 -> /opt/homebrew/opt/python@3.14/bin/python3.14
    const resolution = {
      rawExecutable: "python3",
      resolvedPath: "/opt/homebrew/opt/python@3.14/bin/python3.14",
      executableName: "python3.14",
    };
    // Pattern with ** matches across multiple directories
    const entries: ExecAllowlistEntry[] = [{ pattern: "/opt/**/python*" }];
    const match = matchAllowlist(entries, resolution);
    expect(match?.pattern).toBe("/opt/**/python*");
  });

  it("does not satisfy allowlist when command is not in allowlist", () => {
    const resolution = {
      rawExecutable: "unknown-tool",
      resolvedPath: "/usr/local/bin/unknown-tool",
      executableName: "unknown-tool",
    };
    // Allowlist has different commands
    const entries: ExecAllowlistEntry[] = [
      { pattern: "/usr/bin/python3" },
      { pattern: "/opt/**/node" },
    ];
    const match = matchAllowlist(entries, resolution);
    expect(match).toBeNull();

    // Also not a safe bin
    const safe = isSafeBinUsage({
      argv: ["unknown-tool", "--help"],
      resolution,
      safeBins: normalizeSafeBins(["jq", "curl"]),
    });
    expect(safe).toBe(false);
  });

  it("satisfies via safeBins even when not in allowlist", () => {
    const resolution = {
      rawExecutable: "jq",
      resolvedPath: "/usr/bin/jq",
      executableName: "jq",
    };
    // Not in allowlist
    const entries: ExecAllowlistEntry[] = [{ pattern: "/usr/bin/python3" }];
    const match = matchAllowlist(entries, resolution);
    expect(match).toBeNull();

    // But is a safe bin with non-file args
    const safe = isSafeBinUsage({
      argv: ["jq", ".foo"],
      resolution,
      safeBins: normalizeSafeBins(["jq"]),
    });
    expect(safe).toBe(true);
  });
});

describe("exec approvals default agent migration", () => {
  it("migrates legacy default agent entries to main", () => {
    const file = {
      version: 1,
      agents: {
        default: { allowlist: [{ pattern: "/bin/legacy" }] },
      },
    };
    const resolved = resolveExecApprovalsFromFile({ file });
    expect(resolved.allowlist.map((entry) => entry.pattern)).toEqual(["/bin/legacy"]);
    expect(resolved.file.agents?.default).toBeUndefined();
    expect(resolved.file.agents?.main?.allowlist?.[0]?.pattern).toBe("/bin/legacy");
  });

  it("prefers main agent settings when both main and default exist", () => {
    const file = {
      version: 1,
      agents: {
        main: { ask: "always", allowlist: [{ pattern: "/bin/main" }] },
        default: { ask: "off", allowlist: [{ pattern: "/bin/legacy" }] },
      },
    };
    const resolved = resolveExecApprovalsFromFile({ file });
    expect(resolved.agent.ask).toBe("always");
    expect(resolved.allowlist.map((entry) => entry.pattern)).toEqual(["/bin/main", "/bin/legacy"]);
    expect(resolved.file.agents?.default).toBeUndefined();
  });
});
