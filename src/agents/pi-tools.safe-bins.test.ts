import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import type { ExecApprovalsResolved } from "../infra/exec-approvals.js";

const previousBundledPluginsDir = process.env.OPENCLAW_BUNDLED_PLUGINS_DIR;

beforeAll(() => {
  process.env.OPENCLAW_BUNDLED_PLUGINS_DIR = path.join(
    os.tmpdir(),
    "openclaw-test-no-bundled-extensions",
  );
});

afterAll(() => {
  if (previousBundledPluginsDir === undefined) {
    delete process.env.OPENCLAW_BUNDLED_PLUGINS_DIR;
  } else {
    process.env.OPENCLAW_BUNDLED_PLUGINS_DIR = previousBundledPluginsDir;
  }
});

vi.mock("../infra/shell-env.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../infra/shell-env.js")>();
  return {
    ...mod,
    getShellPathFromLoginShell: vi.fn(() => "/usr/bin:/bin"),
    resolveShellEnvFallbackTimeoutMs: vi.fn(() => 500),
  };
});

vi.mock("../infra/exec-approvals.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../infra/exec-approvals.js")>();
  const approvals: ExecApprovalsResolved = {
    path: "/tmp/exec-approvals.json",
    socketPath: "/tmp/exec-approvals.sock",
    token: "token",
    defaults: {
      security: "allowlist",
      ask: "off",
      askFallback: "deny",
      autoAllowSkills: false,
    },
    agent: {
      security: "allowlist",
      ask: "off",
      askFallback: "deny",
      autoAllowSkills: false,
    },
    allowlist: [],
    file: {
      version: 1,
      socket: { path: "/tmp/exec-approvals.sock", token: "token" },
      defaults: {
        security: "allowlist",
        ask: "off",
        askFallback: "deny",
        autoAllowSkills: false,
      },
      agents: {},
    },
  };
  return { ...mod, resolveExecApprovals: () => approvals };
});

type ExecToolResult = {
  content: Array<{ type: string; text?: string }>;
  details?: { status?: string };
};

type ExecTool = {
  execute(
    callId: string,
    params: {
      command: string;
      workdir: string;
      env?: Record<string, string>;
    },
  ): Promise<ExecToolResult>;
};

async function createSafeBinsExecTool(params: {
  tmpPrefix: string;
  safeBins: string[];
  files?: Array<{ name: string; contents: string }>;
}): Promise<{ tmpDir: string; execTool: ExecTool }> {
  const { createOpenClawCodingTools } = await import("./pi-tools.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), params.tmpPrefix));
  for (const file of params.files ?? []) {
    fs.writeFileSync(path.join(tmpDir, file.name), file.contents, "utf8");
  }

  const cfg: OpenClawConfig = {
    tools: {
      exec: {
        host: "gateway",
        security: "allowlist",
        ask: "off",
        safeBins: params.safeBins,
      },
    },
  };

  const tools = createOpenClawCodingTools({
    config: cfg,
    sessionKey: "agent:main:main",
    workspaceDir: tmpDir,
    agentDir: path.join(tmpDir, "agent"),
  });
  const execTool = tools.find((tool) => tool.name === "exec");
  if (!execTool) {
    throw new Error("exec tool missing from coding tools");
  }
  return { tmpDir, execTool: execTool as ExecTool };
}

describe("createOpenClawCodingTools safeBins", () => {
  it("threads tools.exec.safeBins into exec allowlist checks", async () => {
    if (process.platform === "win32") return;

    const { tmpDir, execTool } = await createSafeBinsExecTool({
      tmpPrefix: "openclaw-safe-bins-",
      safeBins: ["echo"],
    });

    const marker = `safe-bins-${Date.now()}`;
<<<<<<< HEAD:src/agents/pi-tools.safe-bins.test.ts
    const result = await execTool!.execute("call1", {
      command: `echo ${marker}`,
      workdir: tmpDir,
    });
=======
    const envSnapshot = captureEnv(["OPENCLAW_SHELL_ENV_TIMEOUT_MS"]);
    const result = await (async () => {
      try {
        process.env.OPENCLAW_SHELL_ENV_TIMEOUT_MS = "1000";
        return await execTool.execute("call1", {
          command: `echo ${marker}`,
          workdir: tmpDir,
        });
      } finally {
        envSnapshot.restore();
      }
    })();
>>>>>>> 2d485cd47 (refactor(security): extract safe-bin policy and dedupe tests):src/agents/pi-tools.safe-bins.e2e.test.ts
    const text = result.content.find((content) => content.type === "text")?.text ?? "";

    expect(result.details.status).toBe("completed");
    expect(text).toContain(marker);
  });

  it("does not allow env var expansion to smuggle file args via safeBins", async () => {
    if (process.platform === "win32") {
      return;
    }

    const { tmpDir, execTool } = await createSafeBinsExecTool({
      tmpPrefix: "openclaw-safe-bins-expand-",
      safeBins: ["head", "wc"],
      files: [{ name: "secret.txt", contents: "TOP_SECRET\n" }],
    });

    await expect(
      execTool.execute("call1", {
        command: "head $FOO ; wc -l",
        workdir: tmpDir,
        env: { FOO: "secret.txt" },
      }),
    ).rejects.toThrow("exec denied: allowlist miss");
  });

<<<<<<< HEAD:src/agents/pi-tools.safe-bins.test.ts
    expect(result.details.status).toBe("completed");
    expect(text).not.toContain(secret);
=======
  it("does not leak file existence from sort output flags", async () => {
    if (process.platform === "win32") {
      return;
    }

    const { tmpDir, execTool } = await createSafeBinsExecTool({
      tmpPrefix: "openclaw-safe-bins-oracle-",
      safeBins: ["sort"],
      files: [{ name: "existing.txt", contents: "x\n" }],
    });

    const run = async (command: string) => {
      try {
        const result = await execTool.execute("call-oracle", { command, workdir: tmpDir });
        const text = result.content.find((content) => content.type === "text")?.text ?? "";
        return { kind: "result" as const, status: result.details.status, text };
      } catch (err) {
        return { kind: "error" as const, message: String(err) };
      }
    };

    const existing = await run("sort -o existing.txt");
    const missing = await run("sort -o missing.txt");
    expect(existing).toEqual(missing);
>>>>>>> bafdbb6f1 (fix(security): eliminate safeBins file-existence oracle):src/agents/pi-tools.safe-bins.e2e.test.ts
  });

  it("blocks sort output flags from writing files via safeBins", async () => {
    if (process.platform === "win32") {
      return;
    }

    const { tmpDir, execTool } = await createSafeBinsExecTool({
      tmpPrefix: "openclaw-safe-bins-sort-",
      safeBins: ["sort"],
    });

    const cases = [
      { command: "sort -oblocked-short.txt", target: "blocked-short.txt" },
      { command: "sort --output=blocked-long.txt", target: "blocked-long.txt" },
    ] as const;

    for (const [index, testCase] of cases.entries()) {
      await expect(
        execTool.execute(`call${index + 1}`, {
          command: testCase.command,
          workdir: tmpDir,
        }),
      ).rejects.toThrow("exec denied: allowlist miss");
      expect(fs.existsSync(path.join(tmpDir, testCase.target))).toBe(false);
    }
  });

  it("blocks grep recursive flags from reading cwd via safeBins", async () => {
    if (process.platform === "win32") {
      return;
    }

    const { tmpDir, execTool } = await createSafeBinsExecTool({
      tmpPrefix: "openclaw-safe-bins-grep-",
      safeBins: ["grep"],
      files: [{ name: "secret.txt", contents: "SAFE_BINS_RECURSIVE_SHOULD_NOT_LEAK\n" }],
    });

    await expect(
      execTool.execute("call1", {
        command: "grep -R SAFE_BINS_RECURSIVE_SHOULD_NOT_LEAK",
        workdir: tmpDir,
      }),
    ).rejects.toThrow("exec denied: allowlist miss");
  });
});
