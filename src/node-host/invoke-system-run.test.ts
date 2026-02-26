import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { saveExecApprovals } from "../infra/exec-approvals.js";
import type { ExecHostResponse } from "../infra/exec-host.js";
import { handleSystemRunInvoke, formatSystemRunAllowlistMissMessage } from "./invoke-system-run.js";

describe("formatSystemRunAllowlistMissMessage", () => {
  it("returns legacy allowlist miss message by default", () => {
    expect(formatSystemRunAllowlistMissMessage()).toBe("SYSTEM_RUN_DENIED: allowlist miss");
  });

  it("adds Windows shell-wrapper guidance when blocked by cmd.exe policy", () => {
    expect(
      formatSystemRunAllowlistMissMessage({
        windowsShellWrapperBlocked: true,
      }),
    ).toContain("Windows shell wrappers like cmd.exe /c require approval");
  });
});

describe("handleSystemRunInvoke mac app exec host routing", () => {
  async function runSystemInvoke(params: {
    preferMacAppExecHost: boolean;
    runViaResponse?: ExecHostResponse | null;
    command?: string[];
    cwd?: string;
    security?: "full" | "allowlist";
    ask?: "off" | "on-miss" | "always";
    approved?: boolean;
  }) {
    const runCommand = vi.fn(async () => ({
      success: true,
      stdout: "local-ok",
      stderr: "",
      timedOut: false,
      truncated: false,
      exitCode: 0,
      error: null,
    }));
    const runViaMacAppExecHost = vi.fn(async () => params.runViaResponse ?? null);
    const sendInvokeResult = vi.fn(async () => {});
    const sendExecFinishedEvent = vi.fn(async () => {});

    await handleSystemRunInvoke({
      client: {} as never,
      params: {
        command: params.command ?? ["echo", "ok"],
        cwd: params.cwd,
        approved: params.approved ?? false,
        sessionKey: "agent:main:main",
      },
      skillBins: {
        current: async () => [],
      },
      execHostEnforced: false,
      execHostFallbackAllowed: true,
      resolveExecSecurity: () => params.security ?? "full",
      resolveExecAsk: () => params.ask ?? "off",
      isCmdExeInvocation: () => false,
      sanitizeEnv: () => undefined,
      runCommand,
      runViaMacAppExecHost,
      sendNodeEvent: async () => {},
      buildExecEventPayload: (payload) => payload,
      sendInvokeResult,
      sendExecFinishedEvent,
      preferMacAppExecHost: params.preferMacAppExecHost,
    });

    return { runCommand, runViaMacAppExecHost, sendInvokeResult, sendExecFinishedEvent };
  }

  it("uses local execution by default when mac app exec host preference is disabled", async () => {
    const { runCommand, runViaMacAppExecHost, sendInvokeResult } = await runSystemInvoke({
      preferMacAppExecHost: false,
    });

    expect(runViaMacAppExecHost).not.toHaveBeenCalled();
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(sendInvokeResult).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        payloadJSON: expect.stringContaining("local-ok"),
      }),
    );
  });

  it("uses mac app exec host when explicitly preferred", async () => {
    const { runCommand, runViaMacAppExecHost, sendInvokeResult } = await runSystemInvoke({
      preferMacAppExecHost: true,
      runViaResponse: {
        ok: true,
        payload: {
          success: true,
          stdout: "app-ok",
          stderr: "",
          timedOut: false,
          exitCode: 0,
          error: null,
        },
      },
    });

    expect(runViaMacAppExecHost).toHaveBeenCalledWith({
      approvals: expect.objectContaining({
        agent: expect.objectContaining({
          security: "full",
          ask: "off",
        }),
      }),
      request: expect.objectContaining({
        command: ["echo", "ok"],
      }),
    });
    expect(runCommand).not.toHaveBeenCalled();
    expect(sendInvokeResult).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        payloadJSON: expect.stringContaining("app-ok"),
      }),
    );
  });

<<<<<<< HEAD
  it("runs canonical argv in allowlist mode for transparent env wrappers", async () => {
=======
  it("forwards canonical cmdText to mac app exec host for positional-argv shell wrappers", async () => {
    const { runViaMacAppExecHost } = await runSystemInvoke({
      preferMacAppExecHost: true,
      command: ["/bin/sh", "-lc", '$0 "$1"', "/usr/bin/touch", "/tmp/marker"],
      runViaResponse: {
        ok: true,
        payload: {
          success: true,
          stdout: "app-ok",
          stderr: "",
          timedOut: false,
          exitCode: 0,
          error: null,
        },
      },
    });

    expect(runViaMacAppExecHost).toHaveBeenCalledWith({
      approvals: expect.anything(),
      request: expect.objectContaining({
        command: ["/bin/sh", "-lc", '$0 "$1"', "/usr/bin/touch", "/tmp/marker"],
        rawCommand: '/bin/sh -lc "$0 \\"$1\\"" /usr/bin/touch /tmp/marker',
      }),
    });
  });

  it("handles transparent env wrappers in allowlist mode", async () => {
>>>>>>> 55cf92578 (fix(security): harden system.run companion command binding)
    const { runCommand, sendInvokeResult } = await runSystemInvoke({
      preferMacAppExecHost: false,
      security: "allowlist",
      command: ["env", "tr", "a", "b"],
    });
    expect(runCommand).toHaveBeenCalledWith(["tr", "a", "b"], undefined, undefined, undefined);
    expect(sendInvokeResult).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
      }),
    );
  });

  it("denies semantic env wrappers in allowlist mode", async () => {
    const { runCommand, sendInvokeResult } = await runSystemInvoke({
      preferMacAppExecHost: false,
      security: "allowlist",
      command: ["env", "FOO=bar", "tr", "a", "b"],
    });
    expect(runCommand).not.toHaveBeenCalled();
    expect(sendInvokeResult).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          message: expect.stringContaining("allowlist miss"),
        }),
      }),
    );
  });

<<<<<<< HEAD
=======
  it.runIf(process.platform !== "win32")(
    "denies approval-based execution when cwd is a symlink",
    async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-approval-cwd-link-"));
      const safeDir = path.join(tmp, "safe");
      const linkDir = path.join(tmp, "cwd-link");
      const script = path.join(safeDir, "run.sh");
      fs.mkdirSync(safeDir, { recursive: true });
      fs.writeFileSync(script, "#!/bin/sh\necho SAFE\n");
      fs.chmodSync(script, 0o755);
      fs.symlinkSync(safeDir, linkDir, "dir");
      try {
        const { runCommand, sendInvokeResult } = await runSystemInvoke({
          preferMacAppExecHost: false,
          command: ["./run.sh"],
          cwd: linkDir,
          approved: true,
          security: "full",
          ask: "off",
        });
        expect(runCommand).not.toHaveBeenCalled();
        expect(sendInvokeResult).toHaveBeenCalledWith(
          expect.objectContaining({
            ok: false,
            error: expect.objectContaining({
              message: expect.stringContaining("canonical cwd"),
            }),
          }),
        );
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    },
  );

  it.runIf(process.platform !== "win32")(
    "denies approval-based execution when cwd contains a symlink parent component",
    async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-approval-cwd-parent-link-"));
      const safeRoot = path.join(tmp, "safe-root");
      const safeSub = path.join(safeRoot, "sub");
      const linkRoot = path.join(tmp, "approved-link");
      fs.mkdirSync(safeSub, { recursive: true });
      fs.symlinkSync(safeRoot, linkRoot, "dir");
      try {
        const { runCommand, sendInvokeResult } = await runSystemInvoke({
          preferMacAppExecHost: false,
          command: ["./run.sh"],
          cwd: path.join(linkRoot, "sub"),
          approved: true,
          security: "full",
          ask: "off",
        });
        expect(runCommand).not.toHaveBeenCalled();
        expect(sendInvokeResult).toHaveBeenCalledWith(
          expect.objectContaining({
            ok: false,
            error: expect.objectContaining({
              message: expect.stringContaining("no symlink path components"),
            }),
          }),
        );
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    },
  );

  it("uses canonical executable path for approval-based relative command execution", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-approval-cwd-real-"));
    const script = path.join(tmp, "run.sh");
    fs.writeFileSync(script, "#!/bin/sh\necho SAFE\n");
    fs.chmodSync(script, 0o755);
    try {
      const { runCommand, sendInvokeResult } = await runSystemInvoke({
        preferMacAppExecHost: false,
        command: ["./run.sh", "--flag"],
        cwd: tmp,
        approved: true,
        security: "full",
        ask: "off",
      });
      expect(runCommand).toHaveBeenCalledWith(
        [fs.realpathSync(script), "--flag"],
        fs.realpathSync(tmp),
        undefined,
        undefined,
      );
      expect(sendInvokeResult).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
        }),
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
>>>>>>> f789f880c (fix(security): harden approval-bound node exec cwd handling)
  it("denies ./sh wrapper spoof in allowlist on-miss mode before execution", async () => {
    const marker = path.join(os.tmpdir(), `openclaw-wrapper-spoof-${process.pid}-${Date.now()}`);
    const runCommand = vi.fn(async () => {
      fs.writeFileSync(marker, "executed");
      return {
        success: true,
        stdout: "local-ok",
        stderr: "",
        timedOut: false,
        truncated: false,
        exitCode: 0,
        error: null,
      };
    });
    const sendInvokeResult = vi.fn(async () => {});
    const sendNodeEvent = vi.fn(async () => {});

    await handleSystemRunInvoke({
      client: {} as never,
      params: {
        command: ["./sh", "-lc", "/bin/echo approved-only"],
        sessionKey: "agent:main:main",
      },
      skillBins: {
        current: async () => [],
      },
      execHostEnforced: false,
      execHostFallbackAllowed: true,
      resolveExecSecurity: () => "allowlist",
      resolveExecAsk: () => "on-miss",
      isCmdExeInvocation: () => false,
      sanitizeEnv: () => undefined,
      runCommand,
      runViaMacAppExecHost: vi.fn(async () => null),
      sendNodeEvent,
      buildExecEventPayload: (payload) => payload,
      sendInvokeResult,
      sendExecFinishedEvent: vi.fn(async () => {}),
      preferMacAppExecHost: false,
    });

    expect(runCommand).not.toHaveBeenCalled();
    expect(fs.existsSync(marker)).toBe(false);
    expect(sendNodeEvent).toHaveBeenCalledWith(
      expect.anything(),
      "exec.denied",
      expect.objectContaining({ reason: "approval-required" }),
    );
    expect(sendInvokeResult).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          message: "SYSTEM_RUN_DENIED: approval required",
        }),
      }),
    );
    try {
      fs.unlinkSync(marker);
    } catch {
      // no-op
    }
  });
<<<<<<< HEAD
=======

  it("denies ./skill-bin even when autoAllowSkills trust entry exists", async () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-skill-path-spoof-"));
    const previousOpenClawHome = process.env.OPENCLAW_HOME;
    const skillBinPath = path.join(tempHome, "skill-bin");
    fs.writeFileSync(skillBinPath, "#!/bin/sh\necho should-not-run\n", { mode: 0o755 });
    fs.chmodSync(skillBinPath, 0o755);
    process.env.OPENCLAW_HOME = tempHome;
    saveExecApprovals({
      version: 1,
      defaults: {
        security: "allowlist",
        ask: "on-miss",
        askFallback: "deny",
        autoAllowSkills: true,
      },
      agents: {},
    });
    const runCommand = vi.fn(async () => ({
      success: true,
      stdout: "local-ok",
      stderr: "",
      timedOut: false,
      truncated: false,
      exitCode: 0,
      error: null,
    }));
    const sendInvokeResult = vi.fn(async () => {});
    const sendNodeEvent = vi.fn(async () => {});

    try {
      await handleSystemRunInvoke({
        client: {} as never,
        params: {
          command: ["./skill-bin", "--help"],
          cwd: tempHome,
          sessionKey: "agent:main:main",
        },
        skillBins: {
          current: async () => [{ name: "skill-bin", resolvedPath: skillBinPath }],
        },
        execHostEnforced: false,
        execHostFallbackAllowed: true,
        resolveExecSecurity: () => "allowlist",
        resolveExecAsk: () => "on-miss",
        isCmdExeInvocation: () => false,
        sanitizeEnv: () => undefined,
        runCommand,
        runViaMacAppExecHost: vi.fn(async () => null),
        sendNodeEvent,
        buildExecEventPayload: (payload) => payload,
        sendInvokeResult,
        sendExecFinishedEvent: vi.fn(async () => {}),
        preferMacAppExecHost: false,
      });
    } finally {
      if (previousOpenClawHome === undefined) {
        delete process.env.OPENCLAW_HOME;
      } else {
        process.env.OPENCLAW_HOME = previousOpenClawHome;
      }
      fs.rmSync(tempHome, { recursive: true, force: true });
    }

    expect(runCommand).not.toHaveBeenCalled();
    expect(sendNodeEvent).toHaveBeenCalledWith(
      expect.anything(),
      "exec.denied",
      expect.objectContaining({ reason: "approval-required" }),
    );
    expect(sendInvokeResult).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          message: "SYSTEM_RUN_DENIED: approval required",
        }),
      }),
    );
  });

  it("denies env -S shell payloads in allowlist mode", async () => {
    const { runCommand, sendInvokeResult } = await runSystemInvoke({
      preferMacAppExecHost: false,
      security: "allowlist",
      command: ["env", "-S", 'sh -c "echo pwned"'],
    });
    expect(runCommand).not.toHaveBeenCalled();
    expect(sendInvokeResult).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          message: expect.stringContaining("allowlist miss"),
        }),
      }),
    );
  });
<<<<<<< HEAD
>>>>>>> ffd63b7a2 (fix(security): trust resolved skill-bin paths in allowlist auto-allow)
=======

  it("denies semicolon-chained shell payloads in allowlist mode without explicit approval", async () => {
    const payloads = ["openclaw status; id", "openclaw status; cat /etc/passwd"];
    for (const payload of payloads) {
      const command =
        process.platform === "win32"
          ? ["cmd.exe", "/d", "/s", "/c", payload]
          : ["/bin/sh", "-lc", payload];
      const { runCommand, sendInvokeResult } = await runSystemInvoke({
        preferMacAppExecHost: false,
        security: "allowlist",
        ask: "on-miss",
        command,
      });
      expect(runCommand, payload).not.toHaveBeenCalled();
      expect(sendInvokeResult, payload).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            message: "SYSTEM_RUN_DENIED: approval required",
          }),
        }),
      );
    }
  });

  it("denies nested env shell payloads when wrapper depth is exceeded", async () => {
    if (process.platform === "win32") {
      return;
    }
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-env-depth-overflow-"));
    const previousOpenClawHome = process.env.OPENCLAW_HOME;
    const marker = path.join(tempHome, "pwned.txt");
    process.env.OPENCLAW_HOME = tempHome;
    saveExecApprovals({
      version: 1,
      defaults: {
        security: "allowlist",
        ask: "on-miss",
        askFallback: "deny",
      },
      agents: {
        main: {
          allowlist: [{ pattern: "/usr/bin/env" }],
        },
      },
    });
    const runCommand = vi.fn(async () => {
      fs.writeFileSync(marker, "executed");
      return {
        success: true,
        stdout: "local-ok",
        stderr: "",
        timedOut: false,
        truncated: false,
        exitCode: 0,
        error: null,
      };
    });
    const sendInvokeResult = vi.fn(async () => {});
    const sendNodeEvent = vi.fn(async () => {});

    try {
      await handleSystemRunInvoke({
        client: {} as never,
        params: {
          command: [
            "/usr/bin/env",
            "/usr/bin/env",
            "/usr/bin/env",
            "/usr/bin/env",
            "/usr/bin/env",
            "/bin/sh",
            "-c",
            `echo PWNED > ${marker}`,
          ],
          sessionKey: "agent:main:main",
        },
        skillBins: {
          current: async () => [],
        },
        execHostEnforced: false,
        execHostFallbackAllowed: true,
        resolveExecSecurity: () => "allowlist",
        resolveExecAsk: () => "on-miss",
        isCmdExeInvocation: () => false,
        sanitizeEnv: () => undefined,
        runCommand,
        runViaMacAppExecHost: vi.fn(async () => null),
        sendNodeEvent,
        buildExecEventPayload: (payload) => payload,
        sendInvokeResult,
        sendExecFinishedEvent: vi.fn(async () => {}),
        preferMacAppExecHost: false,
      });
    } finally {
      if (previousOpenClawHome === undefined) {
        delete process.env.OPENCLAW_HOME;
      } else {
        process.env.OPENCLAW_HOME = previousOpenClawHome;
      }
      fs.rmSync(tempHome, { recursive: true, force: true });
    }

    expect(runCommand).not.toHaveBeenCalled();
    expect(fs.existsSync(marker)).toBe(false);
    expect(sendNodeEvent).toHaveBeenCalledWith(
      expect.anything(),
      "exec.denied",
      expect.objectContaining({ reason: "approval-required" }),
    );
    expect(sendInvokeResult).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          message: "SYSTEM_RUN_DENIED: approval required",
        }),
      }),
    );
  });
>>>>>>> 57c9a1818 (fix(security): block env depth-overflow approval bypass)
});
